#!/usr/bin/env python3
"""Plan a menu update. READ-ONLY, and deliberately has no --execute.

    venv/bin/python scripts/plan_menu_update.py caracas scripts/data/caracas/menu-2026-10.json

WHAT THIS IS
------------
Track A step A2. The plan said: "a dry-run mode that reports adds / updates / removes BEFORE
writing anything". Track A was logged CLOSED on 2026-10-01 having shipped the SAFETY — soft delete,
the `sku` key, the backfill — and this step was never built, so the catalog could survive a menu
update and nothing could actually perform one. This is that missing half.

WHY IT CANNOT WRITE
-------------------
Matching is on ARABIC NAMES, because the incoming menu is Arabic-only and our SKUs are derived from
English names. Arabic matching is fuzzy by nature: «تشكن برغر» and «تشيكن برغر» are the same dish
and two different strings. A tool that resolves that silently would retire real dishes and create
duplicates of others, which is exactly the class of damage the soft-delete work closed. So every
uncertain pair lands in a list a human reads, and the writing step is a separate, later decision.

THE FOUR LISTS
--------------
🟢 UPDATE   an existing item matched exactly. Its id, its SKU and every StoreOrderItem pointing at
            it survive; only the price and/or the category move.
🔵 NEW      nothing matched — needs a row and a fresh SKU.
🟡 MISSING  a live item the new menu does not mention. **The dangerous list.** Items in the
            categories Salman ratified as untouched are excluded by name, not by guesswork.
🔴 UNSURE   matched more than one row, or matched only approximately. Never written. Needs eyes.
"""
import json
import os
import re
import sys
import unicodedata
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv  # noqa: E402

load_dotenv(str(Path(__file__).resolve().parent.parent / ".env"))

import psycopg2  # noqa: E402

# Arabic the way people actually type it. Each rule is here because the two sides of a real pair
# differ by exactly this and mean the same dish.
_DIACRITICS = re.compile(r"[ً-ْـ]")          # harakat + tatweel
_NONWORD    = re.compile(r"[^\w؀-ۿ]+", re.UNICODE)


def norm_ar(s):
    """Normalise an Arabic dish name for comparison. Never used for storage, only for matching."""
    if not s:
        return ""
    s = unicodedata.normalize("NFKC", str(s))
    s = _DIACRITICS.sub("", s)
    s = (s.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
           .replace("ة", "ه").replace("ى", "ي").replace("ئ", "ي").replace("ؤ", "و"))
    s = _NONWORD.sub(" ", s)
    return " ".join(s.split()).strip().lower()


_DIGITS = re.compile(r"\d+")


def similar(a, b):
    """String similarity, EXCEPT that numbers inside a dish name are part of its identity.

    🔴 Found by running this planner against the real menu: «وجبة كرسبي (3 قطع)» scored 94% against
    «وجبة كرسبي (5 قطع)», because the only difference is one digit. Every new size therefore landed
    in UNSURE pointing at its own siblings — noise that buries the matches a human actually needs to
    judge. Same for «جوانح كرسبي 9 قطع» against «جوانح كريسبي 6 قطع»: a different count is a
    different dish at a different price, never a near-match.

    Names with no digits on either side are compared normally, which is what catches the real pairs
    — تويستر/توستير, فيلادلفيا/فلادلفيا, علبة باربيكيو/علبة بربكيو.
    """
    na, nb = _DIGITS.findall(a), _DIGITS.findall(b)
    if (na or nb) and na != nb:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


# Categories the ratified structure change dissolves: their items move into the new ones, so an
# unmatched row here is a dish Mahmoud dropped, not a category we failed to read.
_REPLACED_CATS = {"ساندويش غربي", "ساندويش شرقي", "وجبات مميزة"}


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 2:
        print("usage: plan_menu_update.py <slug> <menu.json>")
        return 2
    slug, menu_path = args
    menu = json.loads(Path(menu_path).read_text(encoding="utf-8"))

    conn = psycopg2.connect(os.getenv("DIRECT_URL").split("?")[0], connect_timeout=30)
    conn.set_session(readonly=True)
    cur = conn.cursor()
    # The seal is proven with a REAL write against a column that exists, before any read. A probe
    # that fails for the wrong reason proves nothing.
    try:
        cur.execute("UPDATE catalog_items SET sku = sku WHERE false")
        print("🔴 SEAL FAILED — a write was accepted. ABORT.")
        return 1
    except Exception as e:
        print(f"🔒 ختمُ القراءة: {str(e).strip().splitlines()[0][:58]}")
        conn.rollback()

    cur.execute("SELECT id FROM clients WHERE slug = %s", (slug,))
    got = cur.fetchone()
    if not got:
        print(f"🔴 لا تينانت بالاسم {slug}")
        return 1
    client_id = got[0]

    cur.execute("""SELECT ci.id, ci.name_ar, ci.name_en, ci.price, ci.sku, cc.name_ar
                     FROM catalog_items ci JOIN catalog_categories cc ON cc.id = ci.category_id
                    WHERE ci.client_id = %s AND ci.is_active""", (client_id,))
    live = [{"id": r[0], "name_ar": r[1], "name_en": r[2], "price": float(r[3] or 0),
             "sku": r[4], "cat": r[5], "key": norm_ar(r[1])} for r in cur.fetchall()]
    by_key = defaultdict(list)
    for it in live:
        by_key[it["key"]].append(it)

    untouched = set(menu.get("keep_untouched") or [])
    # Decisions recorded in the menu file, not thresholds. Salman, 2026-10-01: the nine UNSURE pairs
    # were never contradictions — they were one dish spelled two ways, his message against our
    # database. A spelling pair is a judgement, so it is written down by SKU and survives any later
    # change to the similarity score.
    by_sku    = {i["sku"]: i for i in live if i["sku"]}
    alias_of  = {norm_ar(a["new"]): a["sku"] for a in (menu.get("aliases") or [])}
    never     = {(norm_ar(n["a"]), norm_ar(n["b"])) for n in (menu.get("never_match") or [])}
    never    |= {(b, a) for a, b in never}
    retire_unlisted = bool(menu.get("retire_unlisted_in_sent_categories"))
    sent_cats = {c["name_ar"] for c in menu["categories"]}
    updates, news, unsure = [], [], []
    matched_ids = set()

    for cat in menu["categories"]:
        for row in cat["items"]:
            key = norm_ar(row["name_ar"])
            if key in alias_of:
                it = by_sku.get(alias_of[key])
                if it is None:
                    unsure.append((cat["name_ar"], row, [], f"alias يشير إلى SKU غير موجود: {alias_of[key]}"))
                    continue
                matched_ids.add(it["id"])
                updates.append((cat["name_ar"], row, it))
                continue
            hits = by_key.get(key, [])
            if len(hits) == 1:
                it = hits[0]
                matched_ids.add(it["id"])
                updates.append((cat["name_ar"], row, it))
            elif len(hits) > 1:
                unsure.append((cat["name_ar"], row, hits, "الاسم نفسُه على أكثر من صفّ"))
                for h in hits:
                    matched_ids.add(h["id"])
            else:
                near = sorted(((0.0 if (key, it["key"]) in never else similar(key, it["key"]), it)
                               for it in live), key=lambda x: -x[0])[:3]
                if near and near[0][0] >= 0.78:
                    unsure.append((cat["name_ar"], row, [n[1] for n in near if n[0] >= 0.74],
                                   f"مطابقةٌ تقريبيّة {near[0][0]:.0%}"))
                    matched_ids.add(near[0][1]["id"])
                else:
                    news.append((cat["name_ar"], row,
                                 [(f"{n[0]:.0%}", n[1]["name_ar"]) for n in near[:2]]))

    missing = [it for it in live if it["id"] not in matched_ids and it["cat"] not in untouched]
    # A category Mahmoud SENT is fully described by what he sent. One he did not send is not
    # governed by his list at all, so anything unmatched there stays a question rather than a
    # deletion — the distinction that keeps «المنيو مثل لي رسلتهم» from reaching «وجبات مميزة»'s
    # neighbours by accident.
    auto_retire = [it for it in missing if retire_unlisted and (it["cat"] in sent_cats or it["cat"] in _REPLACED_CATS)]
    still_open  = [it for it in missing if it not in auto_retire]
    retire  = menu.get("retire") or []

    # ── report ────────────────────────────────────────────────────────────────────────────────
    print(f"\n{'='*78}\n  مسوّدةُ تحديثِ المنيو — {slug}   (قراءةٌ فقط · لا كتابة)\n{'='*78}")
    print(f"  الحيُّ اليوم: {len(live)} صنفاً   ·   المنيو الجديد: "
          f"{sum(len(c['items']) for c in menu['categories'])} صنفاً في {len(menu['categories'])} أقسام")
    print(f"  أقسامٌ لا تُمَسّ: {' · '.join(sorted(untouched)) or '—'}")

    price_changed = [(c, r, i) for c, r, i in updates if abs(r["price"] - i["price"]) > 0.001]
    same_price    = len(updates) - len(price_changed)
    moved         = [(c, r, i) for c, r, i in updates if c != i["cat"]]

    print(f"\n🟢 تحديث — {len(updates)} صنفاً طابق تماماً "
          f"(سعرٌ تغيّر {len(price_changed)} · سعرٌ كما هو {same_price} · انتقل قسماً {len(moved)})")
    for c, r, i in price_changed[:40]:
        arrow = f"  ⟶ {c}" if c != i["cat"] else ""
        print(f"   {i['sku']:26s} {i['name_ar'][:22]:22s} {i['price']:>6.2f} → {r['price']:>6.2f}{arrow}")
    if len(price_changed) > 40:
        print(f"   … و{len(price_changed)-40} أخرى")

    print(f"\n🔵 جديد — {len(news)} صنفاً بلا مطابق (يأخذ صفّاً وSKU جديداً)")
    for c, r, near in news:
        tag = "" if r.get("row_source") == "verbatim" else "  ⚠️ مشتقّ"
        hint = f"   (أقربُ موجود: {near[0][1]} {near[0][0]})" if near else ""
        print(f"   [{c}] {r['name_ar'][:30]:30s} {r['price']:>6.2f}{tag}{hint}")

    print(f"\n🟡 يُتقاعَد — {len(auto_retire)} صنفاً في قسمٍ أرسله محمود ولم يذكره فيه")
    print("   (القاعدة: «المنيو مثل لي رسلتهم» — قائمتُه هي القسمُ كلُّه)")
    bycat = defaultdict(list)
    for it in auto_retire:
        bycat[it["cat"]].append(it)
    for c in sorted(bycat):
        print(f"   [{c}] {len(bycat[c])}")
        for it in bycat[c]:
            print(f"       {it['sku']:26s} {it['name_ar'][:26]:26s} {it['price']:>6.2f}")

    if still_open:
        print(f"\n🟠 ما زال مفتوحاً — {len(still_open)} صنفاً في قسمٍ لم يرسله ولم يُستثنَ")
        for it in still_open:
            print(f"   [{it['cat']}] {it['sku']:26s} {it['name_ar'][:26]:26s} {it['price']:>6.2f}")

    print(f"\n🔴 غيرُ مؤكَّد — {len(unsure)}  (لا يُكتَب أبداً بلا قرارِك)")
    for c, r, hits, why in unsure:
        print(f"   [{c}] «{r['name_ar']}» {r['price']:.2f} — {why}")
        for h in hits:
            print(f"       ↔ {h['sku']:26s} {h['name_ar'][:26]:26s} {h['price']:>6.2f}  [{h['cat']}]")

    if retire:
        print(f"\n⚫ تقاعدٌ صريحٌ بقرارِك — {len(retire)}")
        for r in retire:
            hit = [i for i in live if norm_ar(i["name_ar"]) == norm_ar(r["name_ar"])
                   and i["cat"] == r["category"]]
            found = f"{hit[0]['sku']} ({hit[0]['name_ar']})" if hit else "🔴 لم يُعثَر عليه"
            print(f"   [{r['category']}] {r['name_ar']} → {found}")

    print(f"\n{'='*78}")
    # `missing` is the parent of auto_retire + still_open; printing both would count the same rows
    # twice, which is how a summary line stops matching the lists above it.
    print(f"  الصافي: {len(live)} حيّاً  +{len(news)} جديد  −{len(auto_retire)} يُتقاعَد  "
          f"−{len(retire)} متقاعدٌ صراحةً  "
          f"= {len(live)+len(news)-len(auto_retire)-len(retire)} بعد التنفيذ"
          + (f"   🟠 و{len(still_open)} ما زال مفتوحاً" if still_open else ""))
    print("  🔴 لم يُكتَب شيء. راجع الأصفرَ والأحمرَ أوّلاً — فيهما يسكن الضرر.")
    print(f"{'='*78}\n")
    cur.close()
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
