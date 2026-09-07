"""Drop the retired restaurant order engine's three tables (Order Engine Unification, 2026-09-07).

  restaurant_order_items
  restaurant_orders
  restaurant_configs

WHY THEY ARE GOING. There were two complete order engines. The store one is real and already
vertical-neutral -- 9 of its 15 orders belong to `rk`, a barber shop. The restaurant one was not
merely unused: `restaurant_configs` has 0 rows platform-wide, every route gated on it answered 404,
and `CartPage.jsx` posted to exactly that path -- so no tenant could ever have placed a restaurant
order. Measured live, not inferred. It also carried a real multi-tenancy defect: RestaurantOrder has
no `client_id` at all, hanging off `restaurant_id` -> RestaurantConfig instead.

Proven before this runs: a caracas customer placed a real order through the unified engine, landing
in store_orders with metadata={'table_number': ...}, a linked Customer and correct line items.

Preconditions, all checked at run time, any of them fatal:
  1. All three tables are empty.
  2. No foreign key from OUTSIDE this set references any of them.
  3. The application no longer references them (verified by grep before writing this; the routes,
     repositories and Prisma models were removed and deployed first -- the Phase 2d lesson).

Dropped children-first so no CASCADE is needed and nothing unexpected can ride along.

Usage:
    venv/bin/python scripts/cleanup/drop_restaurant_order_tables.py --dry-run
    venv/bin/python scripts/cleanup/drop_restaurant_order_tables.py --execute
"""
import os
import sys

import psycopg2

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _db_target  # noqa: E402

TABLES = ["restaurant_order_items", "restaurant_orders", "restaurant_configs"]


def main() -> None:
    execute = "--execute" in sys.argv
    if not execute and "--dry-run" not in sys.argv:
        sys.exit("Pass --dry-run or --execute.")

    conn = psycopg2.connect(_db_target.resolve(direct=True))
    conn.autocommit = True
    cur = conn.cursor()

    present = []
    for t in TABLES:
        cur.execute("select to_regclass(%s)", (f"public.{t}",))
        if cur.fetchone()[0] is None:
            print(f"  {t}: already gone")
            continue
        cur.execute(f'select count(*) from "{t}"')
        n = cur.fetchone()[0]
        print(f"  {t}: {n} rows")
        if n:
            sys.exit(f"ABORT: {t} is NOT empty. It was believed dead; it is not. Nothing dropped.")
        present.append(t)

    if not present:
        print("nothing to do.")
        conn.close()
        return

    cur.execute("""
        select tc.table_name as child, ccu.table_name as parent
        from information_schema.table_constraints tc
        join information_schema.constraint_column_usage ccu on tc.constraint_name=ccu.constraint_name
        where tc.constraint_type='FOREIGN KEY' and ccu.table_name = any(%s)
    """, (TABLES,))
    refs = [(c, p) for c, p in cur.fetchall() if c not in TABLES]
    print(f"  external foreign keys pointing in: {refs or 'none'}")
    if refs:
        sys.exit(f"ABORT: {len(refs)} table(s) outside this set still reference them. Nothing dropped.")

    if not execute:
        print("\nDRY RUN — nothing dropped.")
        conn.close()
        return

    for t in present:
        cur.execute(f'DROP TABLE "{t}"')
        print(f"dropped {t}")

    cur.execute("""select count(*) from information_schema.tables
                   where table_schema='public' and table_type='BASE TABLE'""")
    print(f"\ntables remaining in public schema: {cur.fetchone()[0]}")
    conn.close()


if __name__ == "__main__":
    main()
