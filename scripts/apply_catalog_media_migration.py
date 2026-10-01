#!/usr/bin/env python3
"""EXECUTE the catalog media naming migration. Requires --execute. Production write.

    venv/bin/python scripts/apply_catalog_media_migration.py caracas --execute

Step 4 of `.claudedocs/plans/catalog-media-naming.md`, authorised by Salman 2026-10-01 after the
dry run's gate came back green (`.claudedocs/work/catalog-media-migration/2026-10-01/`).

ONE SOURCE OF TRUTH FOR THE DESTINATION
---------------------------------------
`destination()`, `classify_destination()`, `head()`, `EXT_BY_CONTENT_TYPE` and `ABSENT` are
IMPORTED from `plan_catalog_media_migration`, not re-implemented. A planner and an executor that
each compute the destination their own way are two matchers that agree until the day they do not —
the trap the menu update avoided by extracting `build_plan` once and sharing it.

THE ORDER IS THE SAFETY
-----------------------
    copy everything  →  verify EVERY new URL at 200  →  THEN one transaction
Nothing is written to the database until all 72 new URLs have been proven alive. A failure before
that point leaves the database completely untouched, and the only residue is copied files that
nothing references.

WHAT IT WILL NOT DO
-------------------
  * never MOVE, never DELETE, never overwrite: uploads with upsert="false", and a destination that
    turned up occupied since the dry run aborts the run.
  * never write on a non-200. Only 200 is success; 400 means absent; a 429 / 5xx / timeout means
    the probe did not resolve and is NEVER read as a result.
  * never touch another tenant, an archived row, a row without an image, or a row without a SKU.
  * never leave a partial database state: one transaction, rowcount checked per statement.
"""
import collections
import io
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import os                                                      # noqa: E402
import psycopg2                                                # noqa: E402
from dotenv import load_dotenv                                 # noqa: E402
from supabase import create_client                             # noqa: E402

from scripts import _db_target                                 # noqa: E402
from scripts.plan_catalog_media_migration import (             # noqa: E402
    ABSENT, BUCKET, EXT_BY_CONTENT_TYPE, PUBLIC_PREFIX,
    classify_destination, destination, head,
)

load_dotenv()
PUBLIC_BASE = os.getenv("SUPABASE_URL").rstrip("/") + PUBLIC_PREFIX


def fetch(url: str, tries: int = 3) -> bytes:
    last = None
    for i in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=40 + 20 * i) as r:
                if r.status != 200:
                    raise RuntimeError(f"status {r.status}")
                return r.read()
        except Exception as e:
            last = e
    raise RuntimeError(f"could not download after {tries} attempts: {last}")


def main() -> int:
    args = sys.argv[1:]
    slug = next((a for a in args if not a.startswith("-")), None)
    if slug != "caracas" or "--execute" not in args:
        print(__doc__)
        print("🔴 refused. This run is authorised for `caracas --execute` only.")
        return 2

    print(f"\n{'='*94}\nCATALOG MEDIA MIGRATION — EXECUTE · tenant = {slug}\n{'='*94}")

    write_url = _db_target.resolve(direct=True)
    sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

    # ── 1 · READ the plan, and the BEFORE counts ──────────────────────────────────────────────
    ro = psycopg2.connect(write_url)
    ro.set_session(readonly=True)
    cur = ro.cursor()

    cur.execute("SELECT id FROM clients WHERE slug = %s", (slug,))
    row = cur.fetchone()
    if not row:
        print("🔴 tenant not found."); return 1
    client_id = row[0]

    cur.execute("SELECT count(*) FROM store_order_items")
    before_order_lines = cur.fetchone()[0]
    cur.execute("""SELECT count(*) FROM catalog_items WHERE client_id = %s""", (client_id,))
    before_items = cur.fetchone()[0]

    cur.execute("""
        SELECT i.id, i.sku, i.name_ar, i.image_url, cat.name_ar
          FROM catalog_items i JOIN catalog_categories cat ON cat.id = i.category_id
         WHERE i.client_id = %s AND i.is_active
           AND i.image_url IS NOT NULL AND i.image_url <> '' AND i.sku IS NOT NULL
         ORDER BY cat.sort_order, i.sort_order
    """, (client_id,))
    rows = []
    for iid, sku, nar, url, cat in cur.fetchall():
        if PUBLIC_PREFIX not in url:
            continue
        key = url.split(PUBLIC_PREFIX, 1)[1]
        if not key.startswith(f"{slug}/"):
            continue
        rows.append(dict(id=iid, sku=sku, name_ar=nar, cat=cat, old_url=url, old_key=key))
    ro.close()

    print(f"\n[1] BEFORE")
    print(f"    client_id                      : {client_id}")
    print(f"    catalog_items for {slug:<12}  : {before_items}")
    print(f"    store_order_items PLATFORM-WIDE: {before_order_lines}"
          f"   ← the invariant. Tenant-scoped it would read 0→0 and could never fail.")
    print(f"    rows selected                  : {len(rows)}")
    if len(rows) != 72:
        print(f"    🔴 the dry run measured 72. This run sees {len(rows)}. Something changed "
              f"between the two — STOP and re-plan.")
        return 1

    # ── 2 · resolve the extension from the SERVED content-type, and re-check every source ─────
    print(f"\n[2] SOURCES — HEAD every one; only 200 passes")
    bad = []
    for r in rows:
        st, ct = head(r["old_url"])
        r["old_status"], r["old_ct"] = st, ct
        r["ext"] = EXT_BY_CONTENT_TYPE.get(ct or "")
        if st != 200 or not r["ext"]:
            bad.append(r)
    print(f"    statuses: {dict(collections.Counter(r['old_status'] for r in rows))}")
    print(f"    content-types: {dict(collections.Counter(r['old_ct'] for r in rows))}")
    if bad:
        print(f"    🔴 {len(bad)} source(s) are not a settled 200 with a mapped content-type. "
              f"STOP — nothing has been copied and nothing written.")
        for r in bad:
            print(f"        {r['old_status']} {r['old_ct']} {r['sku']}")
        return 1
    offcontract = [r for r in rows if r["ext"] != "jpg"]
    if offcontract:
        print(f"    🔴 {len(offcontract)} row(s) derive an extension other than jpg. Decision ② "
              f"named jpg for THIS set — these need their own word. STOP.")
        return 1

    for r in rows:
        r["dest"] = destination(slug, r["sku"], r["ext"])
        r["new_url"] = PUBLIC_BASE + r["dest"]

    coll = {k: v for k, v in collections.Counter(r["dest"] for r in rows).items() if v > 1}
    if coll:
        print(f"    🔴 {len(coll)} destination collision(s). STOP."); return 1

    # ── 3 · destinations must still be free — enumeration AND a settled 400 ───────────────────
    print(f"\n[3] DESTINATIONS — still free? (enumeration + a settled {ABSENT}, both required)")
    listing, offset = set(), 0
    while True:
        batch = sb.storage.from_(BUCKET).list(f"{slug}/catalog", {"limit": 1000, "offset": offset})
        if not batch:
            break
        listing |= {e["name"] for e in batch if e.get("id")}
        if len(batch) < 1000:
            break
        offset += 1000
    verdicts = collections.Counter()
    blocked = []
    for r in rows:
        st, _ = head(r["new_url"])
        v = classify_destination(r["dest"].rsplit("/", 1)[-1] in listing, st)
        r["pre_verdict"], r["pre_status"] = v, st
        verdicts[v] += 1
        if v != "FREE":
            blocked.append(r)
    print(f"    {dict(verdicts)}")
    if blocked:
        print(f"    🔴 {len(blocked)} destination(s) are not FREE. An occupied destination is never "
              f"overwritten and an unresolved probe is never read as free. STOP.")
        for r in blocked[:10]:
            print(f"        {r['pre_verdict']:<13} status={r['pre_status']} {r['dest']}")
        return 1

    # ── 4 · COPY. Never move, never delete, never overwrite. ──────────────────────────────────
    print(f"\n[4] COPY — {len(rows)} files · upsert=false · content-type image/jpeg")
    copied, failed = [], []
    for n, r in enumerate(rows, 1):
        try:
            blob = fetch(r["old_url"])
            sb.storage.from_(BUCKET).upload(
                r["dest"], blob,
                {"content-type": "image/jpeg", "cache-control": "31536000", "upsert": "false"},
            )
            r["bytes"] = len(blob)
            copied.append(r)
            print(f"    {n:>3}/{len(rows)}  {len(blob):>8,}B  {r['sku']}")
        except Exception as e:
            r["error"] = str(e).strip().splitlines()[0][:160]
            failed.append(r)
            print(f"    {n:>3}/{len(rows)}  🔴 {r['sku']} — {r['error']}")
    print(f"    copied {len(copied)} · failed {len(failed)}")
    if failed:
        print(f"    🔴 a copy failed. NOTHING is written to the database. The sources are "
              f"untouched; the {len(copied)} copies made are unreferenced files that cost nothing "
              f"and that a re-run will find already present. STOP.")
        return 1

    # ── 5 · THE GATE. Every new URL must be a settled 200 before any DB write. ────────────────
    print(f"\n[5] GATE — HEAD every NEW url. Only 200 passes. This runs BEFORE any DB write.")
    notok = []
    for r in rows:
        st, ct = head(r["new_url"])
        r["new_status"], r["new_ct"] = st, ct
        if st != 200:
            notok.append(r)
    print(f"    statuses: {dict(collections.Counter(r['new_status'] for r in rows))}")
    print(f"    content-types: {dict(collections.Counter(r['new_ct'] for r in rows))}")
    # the gate must be able to fail — a key that was never copied has to come back non-200
    ctl, _ = head(PUBLIC_BASE + f"{slug}/catalog/__GATE_CONTROL_NOT_COPIED__.jpg")
    print(f"    ✅ NEGATIVE CONTROL — a key deliberately never copied: {ctl} (must not be 200)")
    if ctl == 200:
        print("    🔴 the gate cannot fail. STOP."); return 1
    if notok:
        print(f"    🔴 {len(notok)} new url(s) are not a settled 200. NO DB WRITE. STOP.")
        for r in notok[:10]:
            print(f"        {r['new_status']} {r['dest']}")
        return 1
    print(f"    🟢 {len(rows)}/{len(rows)} new URLs alive at 200")

    # ── 6 · ONE TRANSACTION ───────────────────────────────────────────────────────────────────
    print(f"\n[6] TRANSACTION — {slug} only · guard `image_url = $old` · rowcount must be 1")
    w = psycopg2.connect(write_url)
    w.autocommit = False
    wc = w.cursor()
    try:
        bad_rc = []
        for r in rows:
            wc.execute("""
                UPDATE catalog_items
                   SET image_url = %s, updated_at = now()
                 WHERE id = %s AND client_id = %s AND image_url = %s
            """, (r["new_url"], r["id"], client_id, r["old_url"]))
            if wc.rowcount != 1:
                bad_rc.append((r["sku"], wc.rowcount))
        if bad_rc:
            w.rollback()
            print(f"    🔴 {len(bad_rc)} statement(s) did not affect exactly one row — ROLLED BACK, "
                  f"zero rows changed. A rowcount of 0 means the row's image_url moved under us "
                  f"(a dashboard edit mid-run), which the guard is there to catch:")
            for sku, rc in bad_rc[:10]:
                print(f"        rowcount={rc}  {sku}")
            return 1
        wc.execute("SELECT count(*) FROM store_order_items")
        inside_order_lines = wc.fetchone()[0]
        if inside_order_lines != before_order_lines:
            w.rollback()
            print(f"    🔴 store_order_items moved {before_order_lines} → {inside_order_lines} "
                  f"inside the transaction. ROLLED BACK."); return 1
        w.commit()
        print(f"    🟢 COMMITTED · {len(rows)} rows updated · rowcount 1 on every statement")
    except Exception as e:
        w.rollback()
        print(f"    🔴 {e} — ROLLED BACK, zero rows changed."); return 1
    finally:
        w.close()

    # ── 7 · AFTER — re-read from the database, do not trust the write ─────────────────────────
    print(f"\n[7] AFTER — re-read from the database")
    ro2 = psycopg2.connect(write_url)
    ro2.set_session(readonly=True)
    c2 = ro2.cursor()
    c2.execute("SELECT count(*) FROM store_order_items")
    after_order_lines = c2.fetchone()[0]
    c2.execute("SELECT count(*) FROM catalog_items WHERE client_id = %s", (client_id,))
    after_items = c2.fetchone()[0]
    c2.execute("""
        SELECT i.sku, i.image_url FROM catalog_items i
         WHERE i.client_id = %s AND i.is_active AND i.image_url IS NOT NULL AND i.image_url <> ''
    """, (client_id,))
    live = c2.fetchall()
    expected = {r["sku"]: r["new_url"] for r in rows}
    migrated = sum(1 for sku, url in live if expected.get(sku) == url)
    stale = [(sku, url) for sku, url in live
             if sku in expected and expected[sku] != url]
    import re
    shaped = sum(1 for sku, url in live
                 if re.search(rf"/{slug}/catalog/[A-Z0-9_-]+\.jpg$", url))
    c2.execute("""
        SELECT count(*) FROM catalog_items
         WHERE client_id = %s AND is_active AND image_url LIKE %s
    """, (client_id, "%/catalog/%-%/%/main.%"))
    old_shape_left = c2.fetchone()[0]
    ro2.close()

    print(f"\n    {'metric':<42}{'before':>10}{'after':>10}")
    print(f"    {'-'*62}")
    print(f"    {'store_order_items (PLATFORM-WIDE)':<42}{before_order_lines:>10}{after_order_lines:>10}"
          f"   {'✅' if before_order_lines == after_order_lines else '🔴'}")
    print(f"    {'catalog_items for ' + slug:<42}{before_items:>10}{after_items:>10}"
          f"   {'✅' if before_items == after_items else '🔴'}")
    print(f"    {'rows at their new SKU url':<42}{0:>10}{migrated:>10}"
          f"   {'✅' if migrated == len(rows) else '🔴'}")
    print(f"    {'live urls matching {sku}.jpg':<42}{'-':>10}{shaped:>10}")
    print(f"    {'live urls still in the OLD id/id/main shape':<42}{'-':>10}{old_shape_left:>10}"
          f"   {'✅' if old_shape_left == 0 else '🔴'}")
    if stale:
        print(f"    🔴 {len(stale)} row(s) did not take the new url:")
        for sku, url in stale[:10]:
            print(f"        {sku}  {url}")

    # the OLD files must still be there — they are the rollback (decision ④)
    old_alive = sum(1 for r in rows if head(r["old_url"])[0] == 200)
    print(f"\n    OLD files still alive at 200 (the rollback) : {old_alive}/{len(rows)}"
          f"   {'✅' if old_alive == len(rows) else '🔴'}")

    ok = (before_order_lines == after_order_lines and before_items == after_items
          and migrated == len(rows) and not stale and old_shape_left == 0
          and old_alive == len(rows))
    print(f"\n{'='*94}")
    print(f"    {'🟢 MIGRATION COMPLETE AND VERIFIED' if ok else '🔴 VERIFY FAILED — read the 🔴 lines'}")
    print(f"    rollback: UPDATE catalog_items SET image_url = <old> per row. No file operation.")
    print(f"              every old file is still served. Nothing was moved or deleted.")
    print(f"{'='*94}\n")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
