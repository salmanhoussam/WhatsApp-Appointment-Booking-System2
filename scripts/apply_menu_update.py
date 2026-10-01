#!/usr/bin/env python3
"""Apply the menu plan. DRY RUN by default.

    venv/bin/python scripts/apply_menu_update.py caracas scripts/data/caracas/menu-2026-10.json
    venv/bin/python scripts/apply_menu_update.py caracas scripts/data/caracas/menu-2026-10.json --execute

Track A step A5. It acts on `plan_menu_update.build_plan` — the SAME matcher the planner printed,
imported rather than reimplemented, so what Salman reviewed is what runs.

WHAT IT WILL NEVER DO
---------------------
* No DELETE, of a row or a category. Retiring is `is_active=false` plus an archived SKU, which is
  what `app/core/sku.py` and the soft-delete work of 2026-09-30 exist for. A category DELETE
  cascades to its items and from there to `store_order_items` — the live hazard closed that day.
* No write outside this tenant: every statement carries `client_id` (`rules/global.md`).
* No partial application: one transaction, committed once at the end.

TWO TRAPS MEASURED BEFORE A LINE WAS WRITTEN
--------------------------------------------
* `catalog_items.updated_at` is NOT NULL with **no database default** — Prisma fills it via
  `@updatedAt`, raw SQL must set it or every insert fails.
* `catalog_categories.module_key` defaults to `'catalog'`, while the restaurant menu reads
  `moduleKey = 'restaurant'`. A category created on the default would be invisible on the menu —
  present in the database, absent from the page.
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv  # noqa: E402

load_dotenv(str(Path(__file__).resolve().parent.parent / ".env"))

import psycopg2  # noqa: E402

from app.core import sku as sku_tool  # noqa: E402
from scripts.plan_menu_update import build_plan, norm_ar, _REPLACED_CATS  # noqa: E402

MODULE = "restaurant"

# One old category is RENAMED rather than replaced: «ساندويش غربي» already holds 14 of the 25
# sandwiches and its own id, images and order lines. Renaming keeps all of that and turns a
# create-move-deactivate into one UPDATE. «ساندويش شرقي» and «وجبات مميزة» have no such claim —
# their surviving items move out and the empty shells are deactivated.
RENAME = {"ساندويش غربي": "ساندويش"}


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    execute = "--execute" in sys.argv
    if len(args) != 2:
        print("usage: apply_menu_update.py <slug> <menu.json> [--execute]")
        return 2
    slug, menu_path = args
    menu = json.loads(Path(menu_path).read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc)

    conn = psycopg2.connect(os.getenv("DIRECT_URL").split("?")[0], connect_timeout=30)
    conn.autocommit = False
    cur = conn.cursor()
    try:
        plan = build_plan(cur, slug, menu)
        cid = plan["client_id"]

        cur.execute("""SELECT count(*) FROM catalog_items WHERE client_id=%s AND is_active""", (cid,))
        before_items = cur.fetchone()[0]
        cur.execute("""SELECT count(*) FROM catalog_categories WHERE client_id=%s AND is_active""", (cid,))
        before_cats = cur.fetchone()[0]
        # PLATFORM-WIDE, not tenant-scoped, and that is the point. caracas holds zero order lines,
        # so a tenant-scoped check reads 0 → 0 and can never fail — a control that cannot fail
        # proves nothing. Counting every line on the platform makes it a real invariant: if any
        # statement here cascaded anywhere, the number moves.
        cur.execute("SELECT count(*) FROM store_order_items")
        before_lines = cur.fetchone()[0]
        cur.execute("""SELECT count(*) FROM store_order_items soi
                        JOIN catalog_items ci ON ci.id=soi.catalog_item_id WHERE ci.client_id=%s""", (cid,))
        before_own = cur.fetchone()[0]
        print(f"قبل:  {before_items} صنفاً حيّاً · {before_cats} قسماً حيّاً")
        print(f"      سطورُ الطلبات — لكاراكاس {before_own} · وللمنصّةِ كلِّها {before_lines}"
              f"   (الضبطُ على الرقمِ الثاني: الأوّلُ صفرٌ فلا يستطيع أن يفشل)")

        ops = []   # (sql, params, human) — printed in dry run, executed otherwise
        def op(sql, params, human):
            ops.append((sql, params, human))

        # ── 1. categories ─────────────────────────────────────────────────────────────────────
        cur.execute("""SELECT id, name_ar, sort_order FROM catalog_categories
                        WHERE client_id=%s AND is_active""", (cid,))
        cats = {r[1]: {"id": r[0], "sort": r[2]} for r in cur.fetchall()}

        for old, new in RENAME.items():
            if old in cats and new not in cats:
                op("UPDATE catalog_categories SET name_ar=%s, name_en=%s WHERE id=%s AND client_id=%s",
                   (new, "Sandwiches", cats[old]["id"], cid),
                   f"إعادةُ تسمية: «{old}» → «{new}»  (يحتفظ بالقسمِ وأصنافِه وصوره)")
                cats[new] = cats.pop(old)

        wanted = [c["name_ar"] for c in menu["categories"]]
        new_cat_ids = {}
        for i, c in enumerate(menu["categories"]):
            name = c["name_ar"]
            if name in cats:
                continue
            # module_key explicit — the default 'catalog' would hide it from the restaurant menu.
            cur.execute("""INSERT INTO catalog_categories (client_id, module_key, name_ar, name_en, sort_order)
                           VALUES (%s,%s,%s,%s,%s) RETURNING id""" if execute else "SELECT NULL",
                        (cid, MODULE, name, c.get("name_en"), i) if execute else None)
            cat_id = cur.fetchone()[0] if execute else f"<new:{name}>"
            new_cat_ids[name] = cat_id
            cats[name] = {"id": cat_id, "sort": i}
            ops.append((None, None, f"قسمٌ جديد: «{name}»  (module_key={MODULE}, ترتيب {i})"))

        # The menu's own order first, then everything Salman kept untouched, in its existing
        # relative order. Numbering only the seven sent categories leaves the untouched ones on
        # their old values and they collide: «كوشينيا» landed between «ساندويش» and «وجبات» on the
        # live bar. The bar is the first thing a customer reads, so the order is part of the menu.
        keep_order = [n for n, c in sorted(cats.items(), key=lambda kv: kv[1].get("sort") or 0)
                      if n not in wanted and n not in _REPLACED_CATS]
        for i, name in enumerate(wanted + keep_order):
            if name in cats and cats[name].get("sort") != i and name not in new_cat_ids:
                op("UPDATE catalog_categories SET sort_order=%s WHERE id=%s AND client_id=%s",
                   (i, cats[name]["id"], cid), f"ترتيب: «{name}» → {i}")

        # ── 2. items: updates ─────────────────────────────────────────────────────────────────
        for cat_name, row, it in plan["updates"]:
            target = cats[cat_name]["id"]
            price_change = abs(float(row["price"]) - it["price"]) > 0.001
            move = target != [c["id"] for c in cats.values() if c["id"] == target][0] or True
            moved = it["cat"] != cat_name
            if not price_change and not moved:
                continue
            op("""UPDATE catalog_items SET price=%s, category_id=%s, updated_at=%s
                   WHERE id=%s AND client_id=%s""",
               (row["price"], target, now, it["id"], cid),
               f"تحديث {it['sku']:26s} {it['name_ar'][:20]:20s} "
               f"{it['price']:.2f}→{row['price']:.2f}" + (f"  ⟶ {cat_name}" if moved else ""))

        # ── 3. items: new ─────────────────────────────────────────────────────────────────────
        cur.execute("SELECT sku FROM catalog_items WHERE client_id=%s AND sku IS NOT NULL", (cid,))
        taken = {r[0] for r in cur.fetchall()}
        cur.execute("""SELECT name_ar, category_id FROM catalog_items WHERE client_id=%s AND is_active""", (cid,))
        existing_pairs = {(norm_ar(r[0]), r[1]) for r in cur.fetchall()}

        order_in_cat = {}
        for cat_name, row, _near in plan["news"]:
            target = cats[cat_name]["id"]
            # Idempotence: a re-run must not create a second copy of a row it already created.
            if (norm_ar(row["name_ar"]), target) in existing_pairs:
                ops.append((None, None, f"⏭️  موجودٌ سلفاً، يُتخطّى: «{row['name_ar']}»"))
                continue
            new_sku = sku_tool.generate(row.get("name_en"), row["name_ar"], taken)
            taken.add(new_sku)
            n = order_in_cat.get(cat_name, 0); order_in_cat[cat_name] = n + 1
            op("""INSERT INTO catalog_items
                    (client_id, category_id, name_ar, name_en, price, currency, sku, sort_order, updated_at)
                  VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
               (cid, target, row["name_ar"], row.get("name_en"), row["price"], "USD", new_sku, n, now),
               f"جديد   {new_sku:26s} {row['name_ar'][:24]:24s} {row['price']:.2f}  [{cat_name}]")

        # ── 4. retire — soft, always ──────────────────────────────────────────────────────────
        retire_rows = list(plan["auto_retire"])
        live_by_sku = {i["sku"]: i for i in plan["live"] if i["sku"]}
        for r in (plan["retire"] or []):
            it = live_by_sku.get(r.get("sku"))
            if it and it not in retire_rows:
                retire_rows.append(it)
        for it in retire_rows:
            archived = sku_tool.archive(it["sku"], now) if it["sku"] else None
            op("""UPDATE catalog_items SET is_active=false, sku=%s, updated_at=%s
                   WHERE id=%s AND client_id=%s""", (archived, now, it["id"], cid),
               f"تقاعد  {str(it['sku']):26s} {it['name_ar'][:24]:24s}  → {archived}")

        # ── 5. deactivate the shells, never delete ────────────────────────────────────────────
        retired_ids = {it["id"] for it in retire_rows}
        moved_out   = {it["id"] for _c, _r, it in plan["updates"]}
        for name in _REPLACED_CATS:
            if name not in cats or name in RENAME:
                continue
            remaining = [i for i in plan["live"]
                         if i["cat"] == name and i["id"] not in retired_ids and i["id"] not in moved_out]
            if remaining:
                ops.append((None, None, f"🔴 «{name}» ما زال فيه {len(remaining)} صنفاً — لا يُعطَّل"))
                continue
            op("UPDATE catalog_categories SET is_active=false WHERE id=%s AND client_id=%s",
               (cats[name]["id"], cid), f"تعطيلُ قسمٍ فارغ: «{name}»  (لا حذف — الحذفُ يُسلسِل)")

        # ── report / execute ──────────────────────────────────────────────────────────────────
        print(f"\n{'='*76}\n  {len(ops)} عمليّة\n{'='*76}")
        for _sql, _p, human in ops:
            print(f"   {human}")

        if not execute:
            conn.rollback()
            print(f"\n🟡 تجربةٌ جافّة — لم يُكتب شيء. أضف --execute للتنفيذ.\n")
            return 0

        written = 0
        for sql, params, _h in ops:
            if sql is None:
                continue
            cur.execute(sql, params)
            written += cur.rowcount

        cur.execute("SELECT count(*) FROM catalog_items WHERE client_id=%s AND is_active", (cid,))
        after_items = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM catalog_categories WHERE client_id=%s AND is_active", (cid,))
        after_cats = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM store_order_items")
        after_lines = cur.fetchone()[0]

        # 🔴 The invariant the whole soft-delete effort exists to protect. A changed count here means
        # something cascaded, and nothing in this script may cascade — so it aborts rather than commits.
        if after_lines != before_lines:
            conn.rollback()
            print(f"\n🔴 سطورُ الطلباتِ تغيّرت {before_lines} → {after_lines} — تراجعٌ كامل. لم يُكتب شيء.")
            return 1

        cur.execute("""SELECT count(*) FROM catalog_items WHERE client_id=%s AND is_active
                        AND (sku IS NULL OR sku <> upper(sku))""", (cid,))
        bad_sku = cur.fetchone()[0]

        conn.commit()
        print(f"\n{'='*76}")
        print(f"  ✅ نُفِّذ · {written} صفّاً مكتوباً")
        print(f"  بعد: {after_items} صنفاً حيّاً (كان {before_items}) · {after_cats} قسماً حيّاً (كان {before_cats})")
        print(f"  🔬 سطورُ الطلباتِ على المنصّةِ كلِّها: {before_lines} → {after_lines}   {'✅ لم تتغيّر' if after_lines==before_lines else '🔴'}")
        print(f"  🔬 أصنافٌ حيّةٌ بلا SKU أو بSKU غيرِ مُطبَّع: {bad_sku}  {'✅' if bad_sku==0 else '🔴'}")
        print(f"{'='*76}\n")
        return 0
    except Exception:
        conn.rollback()
        print("🔴 تراجعٌ كامل — لم يُكتب شيء.")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
