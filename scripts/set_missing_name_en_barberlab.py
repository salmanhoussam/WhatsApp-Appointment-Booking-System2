#!/usr/bin/env python3
"""Give four barberlab-test products an English name, so their SKU is readable for life.

    venv/bin/python scripts/set_missing_name_en_barberlab.py            # dry run
    venv/bin/python scripts/set_missing_name_en_barberlab.py --execute  # writes

WHY THIS RUNS BEFORE THE SKU BACKFILL AND NOT AFTER
----------------------------------------------------
`app/core/sku.py` deliberately refuses to romanise Arabic — an opaque unique key is held to be
truer than a readable wrong one — so an item with no `name_en` is assigned `ITEM-01`, `ITEM-02`…
And **A-Q5 says a SKU is never re-used**: adding `name_en` afterwards does NOT change the key, it
stays `ITEM-02` for the life of the row. So the English name has to exist BEFORE generation or the
opaque key is permanent. Exactly the sequence used on caracas, where `name_en` was written for all
65 rows rather than accept `ITEM-01…ITEM-35`.

Salman chose this over accepting the opaque keys (2026-10-01, option أ). It matters more than the
tenant's "test" status suggests: `مشط خشب` is the row Lia's duplicate-detection scenarios are
written around (L-11…L-15), and `ITEM-02` would make that test data unreadable to whoever runs
them next.

WHAT IT WILL NOT DO
-------------------
  * only `barberlab-test`, only rows that are ACTIVE, have NO sku, and have NO name_en — the exact
    four the backfill would otherwise make opaque. The inactive `مشط خشب` duplicate is out of
    scope: the backfill skips inactive rows, so it gets no key and needs no name.
  * writes `name_en` and nothing else. No price, no category, no isActive, no sku.
  * refuses if the Arabic name it matched is not the one named here, so a renamed row stops the
    run instead of taking someone else's English name.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import psycopg2                   # noqa: E402
from scripts import _db_target    # noqa: E402

SLUG = "barberlab-test"
# Arabic name as it stands in production -> the English name, chosen to read correctly as a SKU.
NAMES = {
    "بلسم للشعر":    "Hair Conditioner",
    "مشط خشب":       "Wooden Comb",
    "شامبو كيراتين": "Keratin Shampoo",
    "شامبو تجريبي":  "Test Shampoo",
}
EXPECTED = 4


def main() -> int:
    execute = "--execute" in sys.argv
    print(f"\n{'='*84}\nname_en for {SLUG} — {'EXECUTE' if execute else 'DRY RUN'}\n{'='*84}")
    url = _db_target.resolve(direct=True, quiet=True)

    ro = psycopg2.connect(url); ro.set_session(readonly=True)
    c = ro.cursor()
    try:
        c.execute("UPDATE catalog_items SET sort_order = sort_order WHERE id IS NULL")
        print("🔴 the read connection is not sealed. ABORT."); return 1
    except Exception as e:
        m = str(e).splitlines()[0]
        if "read-only" not in m.lower():
            print(f"🔴 probe failed for the wrong reason: {m}. ABORT."); return 1
        print(f"\n[0] SEAL  ✅ {m}  (on sort_order — a column that exists)")
    ro.rollback(); c = ro.cursor()

    c.execute("SELECT id FROM clients WHERE slug = %s", (SLUG,))
    client_id = c.fetchone()[0]
    c.execute("""SELECT id, name_ar FROM catalog_items
                  WHERE client_id = %s AND is_active
                    AND sku IS NULL AND (name_en IS NULL OR name_en = '')
                  ORDER BY sort_order""", (client_id,))
    rows = c.fetchall()

    print(f"\n[1] SELECTION — {len(rows)} row(s) that would otherwise become ITEM-xx")
    unknown = [n for _, n in rows if n not in NAMES]
    for iid, nar in rows:
        print(f"    {nar:<20} → {NAMES.get(nar, '🔴 NOT IN THE TABLE')}")
    if len(rows) != EXPECTED or unknown:
        print(f"    🔴 expected {EXPECTED} rows, all named in the table above. "
              f"Got {len(rows)}, {len(unknown)} unknown. STOP — a renamed row must not take "
              f"someone else's English name.")
        return 1

    print(f"\n[2] CONTROLS")
    c.execute("""SELECT count(*) FROM catalog_items
                  WHERE client_id = %s AND name_en IS NOT NULL AND name_en <> ''""", (client_id,))
    print(f"    ✅ NEGATIVE  rows that already HAVE a name_en, all out of scope : {c.fetchone()[0]}")
    c.execute("""SELECT count(*) FROM catalog_items
                  WHERE client_id = %s AND NOT is_active""", (client_id,))
    print(f"    ✅ NEGATIVE  inactive rows (incl. the مشط خشب duplicate), out of scope : "
          f"{c.fetchone()[0]}")
    c.execute("""SELECT count(*) FROM catalog_items i JOIN clients cl ON cl.id = i.client_id
                  WHERE cl.slug <> %s AND i.name_en IS NULL AND i.sku IS NULL""", (SLUG,))
    print(f"    ✅ NEGATIVE  name_en-less rows on OTHER tenants, selected = 0 : {c.fetchone()[0]}")
    c.execute("SELECT count(*) FROM store_order_items")
    before_lines = c.fetchone()[0]
    print(f"    store_order_items PLATFORM-WIDE (the invariant) : {before_lines}")
    ro.close()

    if not execute:
        print(f"\n    DRY RUN — nothing written. Re-run with --execute.\n")
        return 0

    print(f"\n[3] TRANSACTION — rowcount must be 1 per statement")
    w = psycopg2.connect(url); w.autocommit = False
    wc = w.cursor()
    try:
        for iid, nar in rows:
            wc.execute("""UPDATE catalog_items SET name_en = %s, updated_at = now()
                           WHERE id = %s AND client_id = %s AND name_ar = %s
                             AND (name_en IS NULL OR name_en = '')""",
                       (NAMES[nar], iid, client_id, nar))
            if wc.rowcount != 1:
                w.rollback()
                print(f"    🔴 rowcount {wc.rowcount} on «{nar}» — ROLLED BACK."); return 1
        wc.execute("SELECT count(*) FROM store_order_items")
        if wc.fetchone()[0] != before_lines:
            w.rollback(); print("    🔴 order lines moved. ROLLED BACK."); return 1
        w.commit()
        print(f"    🟢 COMMITTED · {len(rows)} rows")
    except Exception as e:
        w.rollback(); print(f"    🔴 {e} — ROLLED BACK."); return 1
    finally:
        w.close()

    ro2 = psycopg2.connect(url); ro2.set_session(readonly=True); c2 = ro2.cursor()
    c2.execute("""SELECT name_ar, name_en, sku FROM catalog_items
                   WHERE client_id = %s AND is_active AND sku IS NULL ORDER BY sort_order""",
               (client_id,))
    print(f"\n[4] AFTER — every active row still awaiting a SKU now has a name to derive it from")
    ok = True
    for nar, nen, sku in c2.fetchall():
        good = bool(nen)
        ok &= good
        print(f"    {'✅' if good else '🔴'} {nar:<20} name_en={nen or '— still none —'}")
    ro2.close()
    print(f"\n    {'🟢 READY for the SKU backfill' if ok else '🔴 some rows still have no name_en'}")
    print(f"    next: venv/bin/python scripts/backfill_catalog_skus.py "
          f"beit-al-fakhar footlab rk smar {SLUG} --execute\n")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
