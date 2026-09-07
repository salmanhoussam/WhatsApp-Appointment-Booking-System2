"""Drop the retired `services` table (Data Model Consolidation, Phase 2d).

Preconditions, all checked at run time and all fatal if unmet -- this script never drops on trust:
  1. Every remaining `services` row has a same-tenant, same-name row in `catalog_services`.
     If even one has no counterpart, the migration was incomplete and dropping loses real data.
  2. `booking_services.service_id` no longer references this table (repointed in Phase 2c).
  3. No other foreign key anywhere still points at `services`.

The 9 surviving rows are snapshotted to JSON before the DROP, so the table's entire contents remain
recoverable from the evidence directory alone.

`booking_services` is deliberately NOT dropped here, though the approved plan said to. Its write
path is live (public_service.py's create_booking records smar's stay add-ons through it), so
dropping it would keep the add-on money in totalPrice while losing which add-ons were bought.
Phase 2c repointed its FK to catalog_services instead. Salman's call to make, not this script's.

Usage:
    venv/bin/python scripts/cleanup/drop_legacy_services_table.py --dry-run
    venv/bin/python scripts/cleanup/drop_legacy_services_table.py --execute
"""
import json
import os
import sys
from datetime import date

import psycopg2

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _db_target  # noqa: E402

EVIDENCE_DIR = os.path.join(
    ".claudedocs", "work", "data-model-consolidation", date.today().isoformat()
)


def main() -> None:
    execute = "--execute" in sys.argv
    if not execute and "--dry-run" not in sys.argv:
        sys.exit("Pass --dry-run or --execute.")

    conn = psycopg2.connect(_db_target.resolve(direct=True))
    cur = conn.cursor()

    # -- Precondition 1: every row has a counterpart ---------------------------------------
    cur.execute("""
        select c.slug, s.name_ar,
               exists (select 1 from catalog_services cs
                       where cs.client_id = s.client_id and cs.name_ar = s.name_ar) as migrated
        from services s join clients c on c.id = s.client_id
        order by c.slug, s.name_ar""")
    rows = cur.fetchall()
    orphans = [r for r in rows if not r[2]]
    for slug, name, migrated in rows:
        print(f"  {'✅' if migrated else '❌'} {slug:<16} {name}")
    print(f"\n  {len(rows)} rows · {len(orphans)} without a catalog_services counterpart")
    if orphans:
        sys.exit("ABORT: the migration is incomplete. Dropping now would lose real rows.")

    # -- Precondition 2 + 3: nothing references this table any more -------------------------
    cur.execute("""
        select tc.table_name, kcu.column_name
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name
        join information_schema.constraint_column_usage ccu on tc.constraint_name = ccu.constraint_name
        where tc.constraint_type = 'FOREIGN KEY' and ccu.table_name = 'services'""")
    refs = cur.fetchall()
    print(f"  foreign keys still pointing at `services`: {refs or 'none'}")
    if refs:
        sys.exit(f"ABORT: {len(refs)} foreign key(s) still reference `services`. Nothing dropped.")

    if not execute:
        print("\nDRY RUN — nothing dropped.")
        conn.close()
        return

    # -- Full snapshot before the DROP ------------------------------------------------------
    cur.execute("select * from services")
    cols = [d[0] for d in cur.description]
    payload = [dict(zip(cols, (str(v) if v is not None else None for v in r)))
               for r in cur.fetchall()]
    os.makedirs(EVIDENCE_DIR, exist_ok=True)
    path = os.path.join(EVIDENCE_DIR, "phase2d-services-table-final-snapshot.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump({"taken_at": date.today().isoformat(),
                   "table": "services", "row_count": len(payload),
                   "note": "full contents at drop time; every row has a catalog_services twin",
                   "rows": payload}, fh, ensure_ascii=False, indent=2)
    print(f"\nsnapshot written: {path}  ({len(payload)} rows)")

    cur.execute('DROP TABLE "services"')
    conn.commit()
    print("dropped table `services`")

    cur.execute("select to_regclass('public.services')")
    print("to_regclass('public.services') ->", cur.fetchone()[0], "(None = gone)")
    cur.execute("select count(*) from catalog_services")
    print("catalog_services rows:", cur.fetchone()[0])
    conn.close()


if __name__ == "__main__":
    main()
