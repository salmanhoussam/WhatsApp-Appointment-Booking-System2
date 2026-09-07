"""Apply prisma/migrations/add_catalog_service_stay_addon_fields.sql.

Data Model Consolidation Phase 2a (2026-09-07). Uses scripts/_db_target.py rather than reading
DATABASE_URL blind: a DDL statement that succeeds against the wrong database is exactly the failure
mode that guard exists for.

Statements run one at a time, not batched -- same reasoning as
scripts/apply_user_barber_link_migration.py, and it also means an already-applied statement can be
skipped individually instead of aborting the whole migration.

Usage:
    venv/bin/python scripts/apply_catalog_service_stay_addon_migration.py --dry-run
    venv/bin/python scripts/apply_catalog_service_stay_addon_migration.py --execute
"""
import os
import sys

import psycopg2

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _db_target  # noqa: E402

STATEMENTS = [
    """ALTER TABLE "catalog_services"
         ADD COLUMN IF NOT EXISTS "property_id"  UUID,
         ADD COLUMN IF NOT EXISTS "pricing_unit" TEXT,
         ADD COLUMN IF NOT EXISTS "is_included"  BOOLEAN NOT NULL DEFAULT false;""",
    """ALTER TABLE "catalog_services"
         ADD CONSTRAINT "catalog_services_property_id_fkey"
         FOREIGN KEY ("property_id") REFERENCES "properties"("id")
         ON DELETE SET NULL ON UPDATE CASCADE;""",
    """CREATE INDEX IF NOT EXISTS "catalog_services_property_id_idx"
         ON "catalog_services" ("property_id");""",
]


def columns(cur):
    cur.execute(
        """select column_name, data_type, is_nullable, column_default
           from information_schema.columns
           where table_name = 'catalog_services'
             and column_name in ('property_id','pricing_unit','is_included')
           order by column_name"""
    )
    return cur.fetchall()


def main() -> None:
    execute = "--execute" in sys.argv
    if not execute and "--dry-run" not in sys.argv:
        sys.exit("Pass --dry-run or --execute.")

    conn = psycopg2.connect(_db_target.resolve(direct=True))
    conn.autocommit = True
    cur = conn.cursor()

    print("before:", columns(cur) or "none of the three columns exist yet")

    if not execute:
        for i, stmt in enumerate(STATEMENTS, 1):
            print(f"  [{i}] would run: {' '.join(stmt.split())[:90]}...")
        print("\nDRY RUN — nothing applied.")
        conn.close()
        return

    for i, stmt in enumerate(STATEMENTS, 1):
        head = " ".join(stmt.split())[:80]
        print(f"[{i}/{len(STATEMENTS)}] {head}...")
        try:
            cur.execute(stmt)
            print("   [OK]")
        except psycopg2.Error as e:
            msg = str(e)
            if "already exists" in msg.lower() or "duplicate" in msg.lower():
                print(f"   [SKIP] already applied — {msg.strip()[:100]}")
            else:
                raise

    print("\nafter:", columns(cur))
    cur.execute("select count(*) from catalog_services where is_included = false")
    print(f"existing rows correctly defaulted (is_included=false): {cur.fetchone()[0]}")
    conn.close()


if __name__ == "__main__":
    main()
