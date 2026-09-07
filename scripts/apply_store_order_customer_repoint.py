"""Repoint store_orders.customer_id at `customers`, then backfill it (Phase 3a).

Two steps in one script because the backfill is only meaningful once the FK points at the right
parent:

  1. FK swap. Safe in either deploy order -- all 15 existing rows are NULL and the currently
     deployed code never writes this column at all, so nothing can violate the new constraint.
  2. Backfill by phone, STRICTLY within the same client_id. A phone number is only unique per
     tenant (customers is @@unique([clientId, phone])), so matching across tenants would attach one
     shop's order to another shop's customer. Never done; unmatched rows stay NULL.

CAVEAT worth stating plainly: Salman has separately decided to empty the `customers` table
(scripts/cleanup/reset_customer_registry.py, still pending a manual run). Any link this backfill
creates to a row that purge deletes will simply revert to NULL -- the FK is ON DELETE SET NULL and
the order keeps its own customer_name/customer_phone snapshot. So this backfill is correct today
and harmless afterwards; it is not wasted, but it is also not permanent.

Usage:
    venv/bin/python scripts/apply_store_order_customer_repoint.py --dry-run
    venv/bin/python scripts/apply_store_order_customer_repoint.py --execute
"""
import os
import sys

import psycopg2

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _db_target  # noqa: E402

FK_STATEMENTS = [
    'ALTER TABLE "store_orders" DROP CONSTRAINT IF EXISTS "store_orders_customer_id_fkey";',
    '''ALTER TABLE "store_orders"
         ADD CONSTRAINT "store_orders_customer_id_fkey"
         FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
         ON DELETE SET NULL ON UPDATE CASCADE;''',
    '''CREATE INDEX IF NOT EXISTS "store_orders_client_id_customer_id_idx"
         ON "store_orders" ("client_id", "customer_id");''',
]

BACKFILL = """
    update store_orders o
       set customer_id = c.id
      from customers c
     where c.client_id = o.client_id
       and c.phone     = o.customer_phone
       and o.customer_id is null
       and o.customer_phone is not null
"""


def fk_target(cur):
    cur.execute("""
        select ccu.table_name, rc.delete_rule
        from information_schema.table_constraints tc
        join information_schema.referential_constraints rc on tc.constraint_name=rc.constraint_name
        join information_schema.constraint_column_usage ccu on tc.constraint_name=ccu.constraint_name
        where tc.constraint_name='store_orders_customer_id_fkey'""")
    return cur.fetchall()


def main() -> None:
    execute = "--execute" in sys.argv
    if not execute and "--dry-run" not in sys.argv:
        sys.exit("Pass --dry-run or --execute.")

    conn = psycopg2.connect(_db_target.resolve(direct=True))
    cur = conn.cursor()

    cur.execute("select count(*), count(customer_id) from store_orders")
    total, linked = cur.fetchone()
    print(f"store_orders: {total} rows, {linked} currently linked")
    print("FK before:", fk_target(cur))

    cur.execute("""
        select c.slug, o.customer_name, o.customer_phone,
               (select cu.id::text from customers cu
                 where cu.client_id = o.client_id and cu.phone = o.customer_phone) as match
        from store_orders o join clients c on c.id = o.client_id
        where o.customer_phone is not null order by c.slug""")
    rows = cur.fetchall()
    matched = [r for r in rows if r[3]]
    print(f"\nbackfill preview — {len(matched)}/{len(rows)} orders match a same-tenant customer:")
    for slug, name, phone, m in rows:
        print(f"  {'link' if m else ' -- '}  {slug:<22} {str(name)[:26]:<26} {phone}")

    if not execute:
        print("\nDRY RUN — nothing applied.")
        conn.close()
        return

    # The read-only preview above already opened a transaction; psycopg2 refuses to switch a
    # connection to autocommit while one is in progress.
    conn.rollback()
    conn.autocommit = True
    for i, stmt in enumerate(FK_STATEMENTS, 1):
        print(f"\n[{i}/{len(FK_STATEMENTS)}] {' '.join(stmt.split())[:72]}...")
        cur.execute(stmt)
        print("   [OK]")
    print("FK after: ", fk_target(cur))

    cur.execute(BACKFILL)
    print(f"\nbackfilled {cur.rowcount} order(s)")

    cur.execute("select count(*), count(customer_id) from store_orders")
    total, linked = cur.fetchone()
    print(f"store_orders: {total} rows, {linked} linked")
    cur.execute("""select count(*) from store_orders o join customers c on c.id=o.customer_id
                   where c.client_id <> o.client_id""")
    print(f"cross-tenant links (must be 0): {cur.fetchone()[0]}")
    conn.close()


if __name__ == "__main__":
    main()
