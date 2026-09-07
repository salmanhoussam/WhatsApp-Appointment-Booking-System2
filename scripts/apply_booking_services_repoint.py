"""Apply prisma/migrations/repoint_booking_services_to_catalog.sql (Phase 2c).

Refuses to run if booking_services is non-empty: the repoint assumes every existing service_id is
already a valid catalog_services id, which is only guaranteed while the table is empty.
"""
import os
import sys

import psycopg2

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _db_target  # noqa: E402

STATEMENTS = [
    'ALTER TABLE "booking_services" DROP CONSTRAINT IF EXISTS "booking_services_service_id_fkey";',
    '''ALTER TABLE "booking_services"
         ADD CONSTRAINT "booking_services_service_id_fkey"
         FOREIGN KEY ("service_id") REFERENCES "catalog_services"("id")
         ON DELETE RESTRICT ON UPDATE CASCADE;''',
]


def target(cur):
    cur.execute("""
        select ccu.table_name, rc.delete_rule
        from information_schema.table_constraints tc
        join information_schema.referential_constraints rc on tc.constraint_name=rc.constraint_name
        join information_schema.constraint_column_usage ccu on tc.constraint_name=ccu.constraint_name
        where tc.table_name='booking_services' and tc.constraint_type='FOREIGN KEY'
          and tc.constraint_name='booking_services_service_id_fkey'""")
    return cur.fetchall()


def main() -> None:
    execute = "--execute" in sys.argv
    if not execute and "--dry-run" not in sys.argv:
        sys.exit("Pass --dry-run or --execute.")

    conn = psycopg2.connect(_db_target.resolve(direct=True))
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("select count(*) from booking_services")
    n = cur.fetchone()[0]
    print(f"booking_services rows: {n}")
    if n:
        sys.exit("ABORT: table is not empty. Existing service_id values would need migrating "
                 "to catalog_services ids first. Nothing was changed.")

    print("FK before:", target(cur))
    if not execute:
        print("\nDRY RUN — nothing applied.")
        conn.close()
        return
    for i, stmt in enumerate(STATEMENTS, 1):
        print(f"[{i}/{len(STATEMENTS)}] {' '.join(stmt.split())[:70]}...")
        cur.execute(stmt)
        print("   [OK]")
    print("FK after: ", target(cur))
    conn.close()


if __name__ == "__main__":
    main()
