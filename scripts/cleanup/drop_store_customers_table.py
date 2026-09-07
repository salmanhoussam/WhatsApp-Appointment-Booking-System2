"""Drop the dead `store_customers` table (Data Model Consolidation, Phase 3a).

WHY THIS IS SAFE, and why it does NOT repeat the Phase 2d ordering mistake:

Phase 2d dropped `services` while deployed code still queried it, taking smar's listings down until
the deploy landed. That cannot happen here, and the difference is measurable rather than hopeful:
`store_customers` has **0 rows and 0 code references anywhere in the repository** -- verified by
grep across app/, scripts/ and frontend/src/, where the only occurrences were Prisma schema
declarations. No deployed build queries this table, at any version. The one real reference,
`store_orders.customer_id`'s foreign key, was repointed to `customers` in Phase 3a and is verified
again below before anything is dropped.

Preconditions, checked at run time, any of them fatal:
  1. The table is still empty.
  2. store_orders.customer_id references `customers`, not this table.
  3. No other foreign key anywhere points at it.

Usage:
    venv/bin/python scripts/cleanup/drop_store_customers_table.py --dry-run
    venv/bin/python scripts/cleanup/drop_store_customers_table.py --execute
"""
import os
import sys

import psycopg2

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _db_target  # noqa: E402


def main() -> None:
    execute = "--execute" in sys.argv
    if not execute and "--dry-run" not in sys.argv:
        sys.exit("Pass --dry-run or --execute.")

    conn = psycopg2.connect(_db_target.resolve(direct=True))
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("select to_regclass('public.store_customers')")
    if cur.fetchone()[0] is None:
        print("table is already gone — nothing to do.")
        conn.close()
        return

    cur.execute("select count(*) from store_customers")
    n = cur.fetchone()[0]
    print(f"store_customers rows: {n}")
    if n:
        sys.exit("ABORT: table is NOT empty. It was believed dead; it is not. Nothing dropped.")

    cur.execute("""
        select ccu.table_name from information_schema.table_constraints tc
        join information_schema.constraint_column_usage ccu on tc.constraint_name=ccu.constraint_name
        where tc.constraint_name='store_orders_customer_id_fkey'""")
    target = cur.fetchone()
    print(f"store_orders.customer_id -> {target[0] if target else 'no FK'}")
    if not target or target[0] != "customers":
        sys.exit("ABORT: store_orders.customer_id does not point at `customers` yet. "
                 "Run Phase 3a's repoint first. Nothing dropped.")

    cur.execute("""
        select tc.table_name, kcu.column_name
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu on tc.constraint_name=kcu.constraint_name
        join information_schema.constraint_column_usage ccu on tc.constraint_name=ccu.constraint_name
        where tc.constraint_type='FOREIGN KEY' and ccu.table_name='store_customers'""")
    refs = cur.fetchall()
    print(f"foreign keys still pointing at store_customers: {refs or 'none'}")
    if refs:
        sys.exit(f"ABORT: {len(refs)} foreign key(s) still reference it. Nothing dropped.")

    if not execute:
        print("\nDRY RUN — nothing dropped.")
        conn.close()
        return

    cur.execute('DROP TABLE "store_customers"')
    print("dropped table `store_customers`")
    cur.execute("select to_regclass('public.store_customers')")
    print("to_regclass ->", cur.fetchone()[0], "(None = gone)")
    cur.execute("""select count(*) from information_schema.tables
                   where table_schema='public' and table_type='BASE TABLE'""")
    print(f"tables remaining in public schema: {cur.fetchone()[0]}")
    conn.close()


if __name__ == "__main__":
    main()
