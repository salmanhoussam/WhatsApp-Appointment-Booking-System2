"""Delete ONLY the throwaway tenants created to verify the RK template seeder.

Deliberately NOT added to delete_demo_test_tenants.py: that script carries an asserted list of 17
audited slugs, and widening it for a temporary fixture would weaken a guard that exists to stop
exactly this kind of ad-hoc addition.

The allowed set is hardcoded and the script REFUSES anything else, so it can never be pointed at a
real tenant -- there is no argument that selects a slug.

Created and used 2026-09-07: the seeder was verified end-to-end on production, per Salman's rule
"لا نختبر كوداً جديداً على عملاء حقيقيين أبداً", and its fixtures are removed immediately after.

Usage:
    venv/bin/python scripts/cleanup/drop_selftest_tenants.py --dry-run
    venv/bin/python scripts/cleanup/drop_selftest_tenants.py --execute
"""
import os
import sys

import psycopg2

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _db_target  # noqa: E402

ALLOWED = ("rk-template-selftest", "rk-selftest-sar")

CHILD_COUNTS = [
    ("users", "client_id"), ("client_services", "client_id"), ("barbers", "client_id"),
    ("barber_services", "client_id"), ("catalog_services", "client_id"),
    ("catalog_items", "client_id"), ("catalog_categories", "client_id"),
    ("reservations", "client_id"), ("customers", "client_id"), ("store_orders", "client_id"),
]


def main() -> None:
    execute = "--execute" in sys.argv
    if not execute and "--dry-run" not in sys.argv:
        sys.exit("Pass --dry-run or --execute.")

    conn = psycopg2.connect(_db_target.resolve(direct=True))
    cur = conn.cursor()

    cur.execute("select slug, id::text from clients where slug = any(%s)", (list(ALLOWED),))
    found = cur.fetchall()
    if not found:
        print("nothing to do — neither selftest tenant exists.")
        conn.close()
        return

    # Refuse if anything real ever got attached to a fixture.
    for slug, cid in found:
        print(f"\n{slug}  ({cid})")
        for table, col in CHILD_COUNTS:
            cur.execute(f"select count(*) from {table} where {col} = %s", (cid,))
            n = cur.fetchone()[0]
            if n:
                print(f"    {table:<20} {n}")
        for table in ("reservations", "customers", "store_orders"):
            cur.execute(f"select count(*) from {table} where client_id = %s", (cid,))
            if cur.fetchone()[0]:
                sys.exit(f"ABORT: {slug} has real transactional rows in {table}. "
                         f"A fixture should have none. Nothing deleted.")
    print("\n  ✅ no transactional rows on either fixture")

    if not execute:
        print("\nDRY RUN — nothing deleted.")
        conn.close()
        return

    cur.execute("delete from clients where slug = any(%s)", (list(ALLOWED),))
    print(f"\ndeleted {cur.rowcount} client row(s) (children cascade)")
    conn.commit()

    cur.execute("select count(*) from clients where slug = any(%s)", (list(ALLOWED),))
    print("remaining selftest tenants:", cur.fetchone()[0], "(expect 0)")
    cur.execute("select count(*) from clients")
    print("total tenants:", cur.fetchone()[0])
    conn.close()


if __name__ == "__main__":
    main()
