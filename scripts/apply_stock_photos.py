#!/usr/bin/env python3
"""Give 35 caracas items a stock photo. DRY RUN by default; requires --execute to write.

    venv/bin/python scripts/apply_stock_photos.py            # plan only
    venv/bin/python scripts/apply_stock_photos.py --execute  # production write

WHAT THIS IS
------------
35 live caracas items carry no image at all — precisely the rows the 2026-10-01 menu update
created from Mahmoud's paper menu. Salman reviewed three candidates per item across two rounds
and chose one for each; `scripts/data/caracas/stock-photos.json` holds that decision, keyed by
SKU so renaming a dish can never re-point its photo at another one.

THE FILE BECOMES OURS, AND THAT IS THE POINT
--------------------------------------------
The photo is downloaded from Unsplash ONCE and re-uploaded to our own bucket at
`{slug}/catalog/{SKU}.jpg`, exactly where the 2026-10-01 migration put the other 144. The row
stores OUR url, never Unsplash's -- so nothing on the menu depends on a third party staying up.
`.jpg` and not `.png` deliberately: these are photographs, where PNG is several times larger for
no visible gain, and `storage_service` derives the extension from the content type anyway.

EVERY ROW IS MARKED TEMPORARY
-----------------------------
`metadata.photo_source = "stock"` goes on every row this touches. Salman's own framing: these
stand in until Mahmoud photographs his real dishes, and without a mark there would be no way
later to tell a borrowed photo from his own.

LICENCE, AS DECIDED
-------------------
Free-licence Unsplash only. Candidates were rejected during review for a visible brand logo
(a KFC bucket), for a hand or a person in frame, and one chosen photo was swapped after it turned
out to be Unsplash+ (plus.unsplash.com), whose licence is NOT the free one. That check is
mechanical here too: a non-free id aborts the run rather than being quietly uploaded.

THE ORDER IS THE SAFETY
-----------------------
    download all -> upload all -> verify EVERY new url at 200 -> THEN one transaction
No row reaches the database until all 35 files are proven alive. The rows start at
`image_url IS NULL`, so rollback is setting them back to NULL -- no file operation at all.
"""
import collections
import io
import json
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import os                                      # noqa: E402
import psycopg2                                # noqa: E402
from dotenv import load_dotenv                 # noqa: E402
from supabase import create_client             # noqa: E402

from scripts import _db_target                 # noqa: E402

load_dotenv()
SLUG   = "caracas"
BUCKET = "properties"
PREFIX = f"/storage/v1/object/public/{BUCKET}/"
BASE   = os.getenv("SUPABASE_URL").rstrip("/") + PREFIX
UA     = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/131.0"}
SRC    = "https://images.unsplash.com/photo-{id}?auto=format&fit=crop&q=80&w=1400"
EXPECTED = 35


def fetch(url, tries=3):
    last = None
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA),
                                        timeout=40 + 20 * i) as r:
                if r.status != 200:
                    raise RuntimeError(f"status {r.status}")
                return r.read()
        except Exception as e:
            last = e
    raise RuntimeError(f"after {tries} attempts: {last}")


def head(url, tries=3):
    last = None
    for i in range(tries):
        try:
            with urllib.request.urlopen(
                    urllib.request.Request(url, method="HEAD", headers=UA), timeout=30) as r:
                return r.status, (r.headers.get("content-type") or "").split(";")[0]
        except Exception as e:
            last = getattr(e, "code", type(e).__name__)
    return last, None


def main() -> int:
    execute = "--execute" in sys.argv
    plan_path = Path(__file__).resolve().parent / "data" / SLUG / "stock-photos.json"
    assign = json.loads(plan_path.read_text(encoding="utf-8"))

    print(f"\n{'='*92}\nSTOCK PHOTOS — {SLUG} · {'EXECUTE' if execute else 'DRY RUN'}\n{'='*92}")
    print(f"    decision file: {plan_path.relative_to(Path.cwd()) if plan_path.is_relative_to(Path.cwd()) else plan_path}")

    # ── 0 · licence gate, mechanical ─────────────────────────────────────────────────────────
    nonfree = [s for s, p in assign.items() if p.startswith("premium_photo") or "plus." in p]
    print(f"\n[0] LICENCE — free-licence ids only")
    print(f"    non-free ids in the plan: {len(nonfree)}   (must be 0)")
    if nonfree:
        print(f"    🔴 {nonfree} — Unsplash+ is not the free licence. STOP.")
        return 1

    # ── 1 · the rows, read-only, sealed ──────────────────────────────────────────────────────
    url_db = _db_target.resolve(direct=True, quiet=True)
    ro = psycopg2.connect(url_db); ro.set_session(readonly=True)
    probe = ro.cursor()
    try:
        probe.execute("UPDATE catalog_items SET sort_order = sort_order WHERE id IS NULL")
        print("🔴 the read connection is not sealed. ABORT."); return 1
    except Exception as e:
        m = str(e).splitlines()[0]
        if "read-only" not in m.lower():
            print(f"🔴 the probe failed for the wrong reason: {m}. ABORT."); return 1
    ro.rollback()
    cur = ro.cursor()
    cur.execute("SELECT id FROM clients WHERE slug = %s", (SLUG,))
    client_id = cur.fetchone()[0]
    cur.execute("""
        SELECT i.id, i.sku, i.name_ar, cat.name_ar
          FROM catalog_items i JOIN catalog_categories cat ON cat.id = i.category_id
         WHERE i.client_id = %s AND i.is_active AND (i.image_url IS NULL OR i.image_url = '')
         ORDER BY cat.sort_order, i.sort_order
    """, (client_id,))
    rows = [{"id": a, "sku": b, "name": c, "cat": d} for a, b, c, d in cur.fetchall()]
    cur.execute("SELECT count(*) FROM store_order_items")
    before_lines = cur.fetchone()[0]
    cur.execute("""SELECT count(*) FROM catalog_items
                    WHERE client_id = %s AND is_active
                      AND image_url IS NOT NULL AND image_url <> ''""", (client_id,))
    before_with = cur.fetchone()[0]
    ro.close()

    got, want = {r["sku"] for r in rows}, set(assign)
    print(f"\n[1] SELECTION")
    print(f"    items with no image, in the database : {len(rows)}")
    print(f"    assignments in the decision file     : {len(assign)}")
    if got != want or len(rows) != EXPECTED:
        print(f"    🔴 not an exact match. extra={sorted(got-want)} missing={sorted(want-got)}")
        return 1
    print(f"    ✅ EXACTLY the same set, in both directions")
    print(f"    ✅ CONTROL — the same check against the set plus one invented SKU reports "
          f"{len((want | {'__NOT_A_SKU__'}) - got)} extra (must be 1)")
    print(f"    store_order_items PLATFORM-WIDE : {before_lines}")
    print(f"    caracas live items WITH an image: {before_with}")

    for r in rows:
        r["src"]  = SRC.format(id=assign[r["sku"]])
        r["key"]  = f"{SLUG}/catalog/{r['sku']}.jpg"
        r["dest"] = BASE + r["key"]

    coll = {k: v for k, v in collections.Counter(r["key"] for r in rows).items() if v > 1}
    print(f"    destination collisions among the {len(rows)} keys : {len(coll)}  (must be 0)")
    if coll:
        print(f"    🔴 {coll}"); return 1
    reuse = {k: v for k, v in collections.Counter(assign.values()).items() if v > 1}
    print(f"    source photos deliberately reused on more than one dish : {len(reuse)}")
    for pid, n in reuse.items():
        print(f"        ×{n}  {pid}  →  {[s for s,v in assign.items() if v==pid]}")

    # ── 2 · destinations must be free ────────────────────────────────────────────────────────
    sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
    listing, offset = set(), 0
    while True:
        batch = sb.storage.from_(BUCKET).list(f"{SLUG}/catalog", {"limit": 1000, "offset": offset})
        if not batch:
            break
        listing |= {e["name"] for e in batch if e.get("id")}
        if len(batch) < 1000:
            break
        offset += 1000
    taken = [r for r in rows if r["key"].rsplit("/", 1)[-1] in listing]
    print(f"\n[2] DESTINATIONS — {len(listing)} files already under {SLUG}/catalog/")
    print(f"    of our {len(rows)} keys, already occupied : {len(taken)}  (must be 0)")
    if taken:
        for r in taken[:10]:
            print(f"        {r['key']}")
        print("    🔴 a destination is occupied. Nothing is overwritten. STOP."); return 1

    if not execute:
        print(f"\n[3] PLAN — {len(rows)} uploads, grouped by category\n")
        cat = None
        for r in rows:
            if r["cat"] != cat:
                cat = r["cat"]; print(f"  [{cat}]")
            print(f"     {r['name']:<26} → {r['key']}")
        print(f"\n    DRY RUN — nothing downloaded, nothing uploaded, nothing written.")
        print(f"    Re-run with --execute to apply.\n")
        return 0

    # ── 3 · download + upload ────────────────────────────────────────────────────────────────
    print(f"\n[3] DOWNLOAD + UPLOAD — {len(rows)} files · upsert=false · content-type image/jpeg")
    cache, failed = {}, []
    for n, r in enumerate(rows, 1):
        try:
            pid = assign[r["sku"]]
            if pid not in cache:
                cache[pid] = fetch(r["src"])
            blob = cache[pid]
            sb.storage.from_(BUCKET).upload(
                r["key"], blob,
                {"content-type": "image/jpeg", "cache-control": "31536000", "upsert": "false"})
            r["bytes"] = len(blob)
            print(f"    {n:>3}/{len(rows)}  {len(blob):>8,}B  {r['sku']}")
        except Exception as e:
            r["error"] = str(e).strip().splitlines()[0][:150]
            failed.append(r)
            print(f"    {n:>3}/{len(rows)}  🔴 {r['sku']} — {r['error']}")
    print(f"    uploaded {len(rows)-len(failed)} · failed {len(failed)} · "
          f"distinct source photos fetched {len(cache)}")
    if failed:
        print(f"    🔴 an upload failed. NOTHING is written to the database. The rows keep their "
              f"NULL image_url; the files already uploaded are unreferenced and a re-run finds "
              f"them present. STOP.")
        return 1

    # ── 4 · the gate ─────────────────────────────────────────────────────────────────────────
    print(f"\n[4] GATE — HEAD every new url. Only 200 passes. BEFORE any DB write.")
    notok, mismatch = [], []
    for r in rows:
        st, ct = head(r["dest"])
        r["status"], r["ct"] = st, ct
        if st != 200:
            notok.append(r)
        elif ct != "image/jpeg":
            mismatch.append(r)
    print(f"    statuses: {dict(collections.Counter(r['status'] for r in rows))}")
    print(f"    types   : {dict(collections.Counter(r['ct'] for r in rows))}")
    ctl, _ = head(BASE + f"{SLUG}/catalog/__GATE_CONTROL_NOT_UPLOADED__.jpg")
    print(f"    ✅ NEGATIVE CONTROL — a key never uploaded: {ctl} (must not be 200)")
    if ctl == 200:
        print("    🔴 the gate cannot fail. STOP."); return 1
    if notok or mismatch:
        print(f"    🔴 {len(notok)} not 200 · {len(mismatch)} wrong content-type. NO DB WRITE.")
        return 1
    print(f"    🟢 {len(rows)}/{len(rows)} alive at 200, all image/jpeg")

    # ── 5 · one transaction ──────────────────────────────────────────────────────────────────
    print(f"\n[5] TRANSACTION — {SLUG} only · guard `image_url IS NULL` · rowcount must be 1")
    w = psycopg2.connect(url_db); w.autocommit = False
    wc = w.cursor()
    try:
        bad = []
        for r in rows:
            wc.execute("""
                UPDATE catalog_items
                   SET image_url = %s,
                       metadata  = jsonb_set(COALESCE(metadata, '{}'::jsonb),
                                             '{photo_source}', '"stock"'::jsonb, true),
                       updated_at = now()
                 WHERE id = %s AND client_id = %s
                   AND (image_url IS NULL OR image_url = '')
            """, (r["dest"], r["id"], client_id))
            if wc.rowcount != 1:
                bad.append((r["sku"], wc.rowcount))
        if bad:
            w.rollback()
            print(f"    🔴 {len(bad)} statement(s) did not affect exactly one row — ROLLED BACK, "
                  f"zero rows changed. A rowcount of 0 means the row gained an image under us:")
            for sku, rc in bad[:10]:
                print(f"        rowcount={rc}  {sku}")
            return 1
        wc.execute("SELECT count(*) FROM store_order_items")
        inside = wc.fetchone()[0]
        if inside != before_lines:
            w.rollback()
            print(f"    🔴 store_order_items moved {before_lines} → {inside}. ROLLED BACK."); return 1
        w.commit()
        print(f"    🟢 COMMITTED · {len(rows)} rows · rowcount 1 on every statement")
    except Exception as e:
        w.rollback(); print(f"    🔴 {e} — ROLLED BACK."); return 1
    finally:
        w.close()

    # ── 6 · after ────────────────────────────────────────────────────────────────────────────
    ro2 = psycopg2.connect(url_db); ro2.set_session(readonly=True); c2 = ro2.cursor()
    c2.execute("SELECT count(*) FROM store_order_items"); after_lines = c2.fetchone()[0]
    c2.execute("""SELECT count(*) FROM catalog_items WHERE client_id = %s AND is_active
                    AND image_url IS NOT NULL AND image_url <> ''""", (client_id,))
    after_with = c2.fetchone()[0]
    c2.execute("""SELECT count(*) FROM catalog_items WHERE client_id = %s AND is_active
                    AND (image_url IS NULL OR image_url = '')""", (client_id,))
    still_none = c2.fetchone()[0]
    c2.execute("""SELECT count(*) FROM catalog_items WHERE client_id = %s
                    AND metadata->>'photo_source' = 'stock'""", (client_id,))
    marked = c2.fetchone()[0]
    ro2.close()

    print(f"\n[6] AFTER — re-read from the database\n")
    print(f"    {'metric':<44}{'before':>9}{'after':>9}")
    print(f"    {'-'*62}")
    print(f"    {'store_order_items (PLATFORM-WIDE)':<44}{before_lines:>9}{after_lines:>9}"
          f"  {'✅' if before_lines == after_lines else '🔴'}")
    print(f"    {'caracas live items WITH an image':<44}{before_with:>9}{after_with:>9}"
          f"  {'✅ +' + str(after_with-before_with) if after_with-before_with == len(rows) else '🔴'}")
    print(f"    {'caracas live items with NO image':<44}{len(rows):>9}{still_none:>9}"
          f"  {'✅' if still_none == 0 else '🔴'}")
    print(f"    {'rows marked photo_source=stock':<44}{0:>9}{marked:>9}"
          f"  {'✅' if marked == len(rows) else '🔴'}")

    ok = (before_lines == after_lines and after_with - before_with == len(rows)
          and still_none == 0 and marked == len(rows))
    print(f"\n    {'🟢 COMPLETE AND VERIFIED' if ok else '🔴 VERIFY FAILED'}")
    print(f"    rollback: UPDATE catalog_items SET image_url = NULL, "
          f"metadata = metadata - 'photo_source' for these {len(rows)} ids. No file operation.\n")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
