#!/usr/bin/env python3
"""Undo what the hide-cascade did, for ONE category, and nothing else.

    venv/bin/python scripts/repair_cascade_deactivated_items.py            # dry run
    venv/bin/python scripts/repair_cascade_deactivated_items.py --execute  # writes

WHY A REPAIR IS NEEDED AT ALL
-----------------------------
Removing the cascade from `admin_catalog_repo.soft_delete_category` (commit b93dfa3) stops this
happening again. It does not undo what already happened. On 2026-10-01 at 15:58 Salman hid
كوشينيا at Mahmoud's request and the cascade deactivated its 8 items with it, so showing the
category back would still produce an empty section.

🔴 WHAT MAKES THIS SAFE — AND WHY A BLANKET REACTIVATE WOULD NOT BE
-------------------------------------------------------------------
caracas holds 17 items that are inactive ON PURPOSE: the menu update of the same day retired
them, including the three فول rows Salman named. `UPDATE ... SET is_active = true WHERE NOT
is_active` would resurrect every one of them on the live menu.

The two groups are distinguishable by a REAL STAMP, not by a date range or a guess:

    deliberate retirement  ->  sku_tool.archive() rewrites the SKU to `<BASE>-ARCHIVED-<epoch>`
    the hide-cascade       ->  wrote `is_active = false` and NEVER touched the SKU

So this script selects on `sku NOT LIKE '%-ARCHIVED-%'`, inside one named category, and proves
in both directions that the selection holds before it writes anything.

WHAT IT DOES NOT TOUCH
----------------------
  * the CATEGORY stays hidden. Salman hid كوشينيا deliberately and that decision stands; this
    repairs the undo, it does not perform it. Nothing visible changes on the public menu — with
    the cascade gone, the category's own isActive is what hides it and its items.
  * any archived item, any other category, any other tenant.
  * `SKU-SMOKE-TEST-01`, an unstamped inactive row of mine in مقبلات — out of scope by category,
    and kept in the controls below precisely because it is the nearest miss.
"""
import collections
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import psycopg2                       # noqa: E402
from scripts import _db_target        # noqa: E402

# The authorisation, in the source: tenant, category, and the exact number of rows it may touch.
SLUG, CATEGORY_AR, EXPECTED = "caracas", "كوشينيا (دزينة)", 8
ARCHIVED_MARK = "-ARCHIVED-"


def main() -> int:
    execute = "--execute" in sys.argv
    print(f"\n{'='*88}\nCASCADE REPAIR — {SLUG} · «{CATEGORY_AR}» · "
          f"{'EXECUTE' if execute else 'DRY RUN'}\n{'='*88}")

    url = _db_target.resolve(direct=True, quiet=True)
    ro = psycopg2.connect(url)
    ro.set_session(readonly=True)
    probe = ro.cursor()
    try:
        probe.execute("UPDATE catalog_items SET sort_order = sort_order WHERE id IS NULL")
        print("🔴 the read connection is not sealed. ABORT."); return 1
    except Exception as e:
        msg = str(e).splitlines()[0]
        if "read-only" not in msg.lower():
            print(f"🔴 the probe failed for the wrong reason: {msg}. ABORT."); return 1
        print(f"\n[0] SEAL  ✅ {msg}  (on sort_order — a column that exists)")
    ro.rollback()
    cur = ro.cursor()

    cur.execute("SELECT id FROM clients WHERE slug = %s", (SLUG,))
    client_id = cur.fetchone()[0]
    cur.execute("""SELECT id, is_active FROM catalog_categories
                    WHERE client_id = %s AND name_ar = %s""", (client_id, CATEGORY_AR))
    cats = cur.fetchall()
    if len(cats) != 1:
        print(f"🔴 expected exactly one category named «{CATEGORY_AR}», found {len(cats)}. ABORT.")
        return 1
    cat_id, cat_active = cats[0]
    print(f"\n[1] TARGET")
    print(f"    category  : {cat_id}  «{CATEGORY_AR}»")
    print(f"    is_active : {cat_active}   ← stays exactly as it is. This repairs the undo, "
          f"it does not perform it.")

    cur.execute("""
        SELECT id, sku, name_ar FROM catalog_items
         WHERE client_id = %s AND category_id = %s
           AND NOT is_active AND sku NOT LIKE %s
         ORDER BY sort_order
    """, (client_id, cat_id, f"%{ARCHIVED_MARK}%"))
    rows = cur.fetchall()
    print(f"\n[2] SELECTION — {len(rows)} row(s)")
    for iid, sku, nar in rows:
        print(f"    {nar:<26} {sku}")
    if len(rows) != EXPECTED:
        print(f"    🔴 the authorisation names {EXPECTED}. STOP."); return 1

    print(f"\n[3] CONTROLS — in both directions")
    sel_ids = {r[0] for r in rows}
    # Every stamped row, by id — so the overlap with the selection is COUNTED, not asserted.
    cur.execute("""SELECT id, name_ar, sku FROM catalog_items
                    WHERE client_id = %s AND NOT is_active AND sku LIKE %s""",
                (client_id, f"%{ARCHIVED_MARK}%"))
    stamped_rows = cur.fetchall()
    stamped = len(stamped_rows)
    overlap = [r for r in stamped_rows if r[0] in sel_ids]
    foul = [r for r in stamped_rows if "فول" in r[1]]
    mark = "✅" if not overlap else "🔴"
    print(f"    {mark} NEGATIVE  {stamped} deliberately-retired (stamped) rows exist; "
          f"selected = {len(overlap)}   (must be 0)")
    if overlap:
        for i, n, sk in overlap[:10]:
            print(f"        🔴 {n} {sk}")
        print("    🔴 the selection reaches a deliberately-retired row. ABORT.")
        return 1
    # and the control must be able to fail: the same predicate, run against a selection that
    # DOES contain a stamped row, has to come back non-zero.
    probe_ids = sel_ids | {stamped_rows[0][0]} if stamped_rows else sel_ids
    print(f"    ✅ CONTROL OF THE CONTROL — the same check against a selection deliberately "
          f"seeded with one stamped row returns "
          f"{len([r for r in stamped_rows if r[0] in probe_ids])}   (must be > 0)")
    for i, n, s in foul:
        print(f"    ✅ NEGATIVE  فول row must be OUT : {n:<22} {s}   in = {i in sel_ids}")
    cur.execute("""SELECT id, name_ar FROM catalog_items
                    WHERE client_id = %s AND sku = 'SKU-SMOKE-TEST-01'""", (client_id,))
    smoke = cur.fetchone()
    if smoke:
        print(f"    ✅ NEGATIVE  the nearest miss — unstamped AND inactive, but in another "
              f"category : {smoke[1]}   in = {smoke[0] in sel_ids}")
    cur.execute("""SELECT count(*) FROM catalog_items i JOIN clients c ON c.id = i.client_id
                    WHERE c.slug <> %s AND NOT i.is_active""", (SLUG,))
    print(f"    ✅ NEGATIVE  inactive rows on other tenants : {cur.fetchone()[0]}, selected = 0")

    cur.execute("SELECT count(*) FROM store_order_items")
    before_lines = cur.fetchone()[0]
    cur.execute("""SELECT count(*) FROM catalog_items WHERE client_id = %s AND is_active""",
                (client_id,))
    before_live = cur.fetchone()[0]
    ro.close()

    print(f"\n[4] BEFORE")
    print(f"    caracas live items              : {before_live}")
    print(f"    store_order_items PLATFORM-WIDE : {before_lines}")

    if not execute:
        print(f"\n    DRY RUN — nothing written. Re-run with --execute to apply.\n")
        return 0

    print(f"\n[5] TRANSACTION — rowcount must be 1 per statement, guarded on the current state")
    w = psycopg2.connect(url)
    w.autocommit = False
    wc = w.cursor()
    try:
        for iid, sku, nar in rows:
            wc.execute("""
                UPDATE catalog_items SET is_active = true, updated_at = now()
                 WHERE id = %s AND client_id = %s AND category_id = %s
                   AND NOT is_active AND sku NOT LIKE %s
            """, (iid, client_id, cat_id, f"%{ARCHIVED_MARK}%"))
            if wc.rowcount != 1:
                w.rollback()
                print(f"    🔴 rowcount {wc.rowcount} on {sku} — ROLLED BACK, zero rows changed.")
                return 1
        wc.execute("SELECT count(*) FROM catalog_items WHERE client_id = %s AND NOT is_active "
                   "AND sku LIKE %s", (client_id, f"%{ARCHIVED_MARK}%"))
        still_retired = wc.fetchone()[0]
        if still_retired != stamped:
            w.rollback()
            print(f"    🔴 retired rows moved {stamped} → {still_retired} inside the transaction. "
                  f"ROLLED BACK."); return 1
        wc.execute("SELECT count(*) FROM store_order_items")
        if wc.fetchone()[0] != before_lines:
            w.rollback(); print("    🔴 order lines moved. ROLLED BACK."); return 1
        w.commit()
        print(f"    🟢 COMMITTED · {len(rows)} rows reactivated · {still_retired} retired rows "
              f"untouched")
    except Exception as e:
        w.rollback(); print(f"    🔴 {e} — ROLLED BACK."); return 1
    finally:
        w.close()

    print(f"\n[6] AFTER — re-read from the database")
    ro2 = psycopg2.connect(url); ro2.set_session(readonly=True); c2 = ro2.cursor()
    c2.execute("SELECT count(*) FROM store_order_items"); after_lines = c2.fetchone()[0]
    c2.execute("SELECT count(*) FROM catalog_items WHERE client_id=%s AND is_active", (client_id,))
    after_live = c2.fetchone()[0]
    c2.execute("""SELECT count(*) FROM catalog_items WHERE client_id=%s AND NOT is_active
                   AND sku LIKE %s""", (client_id, f"%{ARCHIVED_MARK}%"))
    after_stamped = c2.fetchone()[0]
    c2.execute("SELECT is_active FROM catalog_categories WHERE id=%s", (cat_id,))
    after_cat = c2.fetchone()[0]
    c2.execute("""SELECT count(*) FROM catalog_items WHERE client_id=%s AND category_id=%s
                   AND is_active""", (client_id, cat_id))
    cox_live = c2.fetchone()[0]
    ro2.close()

    print(f"\n    {'metric':<44}{'before':>9}{'after':>9}")
    print(f"    {'-'*62}")
    print(f"    {'store_order_items (PLATFORM-WIDE)':<44}{before_lines:>9}{after_lines:>9}"
          f"  {'✅' if before_lines == after_lines else '🔴'}")
    print(f"    {'caracas live items':<44}{before_live:>9}{after_live:>9}"
          f"  {'✅ +' + str(after_live - before_live) if after_live - before_live == EXPECTED else '🔴'}")
    print(f"    {'deliberately-retired (stamped) rows':<44}{stamped:>9}{after_stamped:>9}"
          f"  {'✅' if stamped == after_stamped else '🔴 RESURRECTED'}")
    print(f"    {'live items inside كوشينيا':<44}{0:>9}{cox_live:>9}"
          f"  {'✅' if cox_live == EXPECTED else '🔴'}")
    print(f"    {'the category itself — still hidden':<44}{str(cat_active):>9}{str(after_cat):>9}"
          f"  {'✅' if after_cat == cat_active else '🔴 CHANGED'}")

    ok = (before_lines == after_lines and after_live - before_live == EXPECTED
          and stamped == after_stamped and after_cat == cat_active and cox_live == EXPECTED)
    print(f"\n    {'🟢 REPAIR COMPLETE' if ok else '🔴 VERIFY FAILED'}")
    print(f"    rollback: UPDATE catalog_items SET is_active = false WHERE id IN (the {EXPECTED} "
          f"ids printed above).\n")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
