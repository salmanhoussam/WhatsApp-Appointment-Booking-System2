"""Move the legacy `services` rows into `catalog_services`, and delete rk's alien row.

Data Model Consolidation Phase 2b (2026-09-07). Salman's decision: "نرحّله لـcatalog_services"
and "إعدام صف تنظيف الأسنان".

WHAT IS BEING RETIRED. `services` is the pre-Catalog booking add-on model (propertyId + basePrice +
pricing_unit). It has exactly one real consumer left -- smar's own real-estate dashboard
(`frontend/src/pages/smar/admin/components/ServicesTab.jsx`) -- and 10 rows across 3 tenants. Keeping
a second parallel services table alive for one tenant is the "one Capability, many write paths"
shape `rules/backend/architecture.md` §9 exists to prevent.

THE THREE TENANTS, and why each is handled differently:
  smar            7 real hotel/stay add-ons (إفطار / مساج / دخول المسبح / سرير أطفال ...). Real
                  tenant data, migrated. Lands in smar's ALREADY-EXISTING, currently empty
                  `الخدمات` category -- not a category invented for the occasion.
  barberlab-test  2 rows, and NO catalog_categories at all, so one is created for it. A test
                  tenant, migrated anyway because leaving rows behind would block dropping the
                  table in Phase 2d.
  rk              1 row: `تنظيف أسنان` -- teeth cleaning, in a barber shop, already is_active=false.
                  DELETED, never migrated. Migrating contamination just moves it.

FIELD MAPPING -- every legacy column has a destination now that Phase 2a added the missing three:
    name_ar/name_en/description/image_url -> same
    base_price   -> price          currency -> currency        is_active -> is_active
    pricing_unit -> pricing_unit   is_included -> is_included   property_id -> property_id
    sort_order   -> sort_order
    duration     -> duration_min, DEFAULTED TO 30 when NULL (all 7 smar rows are NULL: a stay
                    add-on has no slot length -- see the model's own note on why the column stays
                    NOT NULL rather than being loosened for this case).

IDs are NOT preserved: `booking_services` is the only table referencing `services.id` and it holds
**0 rows platform-wide**, so nothing points at the old ids. Verified at run time below, and the
script refuses if that is ever untrue.

The legacy rows are deliberately LEFT IN PLACE by this script (except rk's). Phase 2d drops the
table once the readers are repointed; until then they are the rollback.

Usage:
    venv/bin/python scripts/cleanup/migrate_legacy_services_to_catalog.py --dry-run
    venv/bin/python scripts/cleanup/migrate_legacy_services_to_catalog.py --execute
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
DELETE_NOT_MIGRATE = {("rk", "تنظيف أسنان")}
DEFAULT_DURATION_MIN = 30


def landing_category(cur, client_id: str, slug: str, execute: bool):
    """Return the category these services land in: the tenant's existing 'الخدمات' if it has one,
    otherwise a newly created one. Never reuses a Units/Views category."""
    cur.execute(
        """select id::text, name_ar from catalog_categories
           where client_id = %s and module_key = 'catalog' and name_ar = 'الخدمات'""",
        (client_id,),
    )
    row = cur.fetchone()
    if row:
        print(f"    category: reusing existing 'الخدمات' ({row[0]})")
        return row[0]
    if not execute:
        print(f"    category: would CREATE 'الخدمات' for {slug} (it has none)")
        return None
    cur.execute(
        """insert into catalog_categories (client_id, module_key, name_ar, name_en, sort_order)
           values (%s, 'catalog', 'الخدمات', 'Services', 0) returning id::text""",
        (client_id,),
    )
    new_id = cur.fetchone()[0]
    print(f"    category: CREATED 'الخدمات' ({new_id}) for {slug}")
    return new_id


def main() -> None:
    execute = "--execute" in sys.argv
    if not execute and "--dry-run" not in sys.argv:
        sys.exit("Pass --dry-run or --execute.")

    conn = psycopg2.connect(_db_target.resolve(direct=True))
    cur = conn.cursor()

    cur.execute("select count(*) from booking_services")
    bs = cur.fetchone()[0]
    if bs:
        sys.exit(
            f"ABORT: booking_services holds {bs} row(s) referencing services.id. This script does "
            f"not preserve ids, so those links would break. Nothing was done."
        )
    print("booking_services is empty — no row references a legacy service id ✓\n")

    cur.execute(
        """select s.id::text, c.id::text, c.slug, s.name_ar, s.name_en, s.description,
                  s.image_url, s.duration, s.base_price, s.currency, s.is_active,
                  s.is_included, s.pricing_unit, s.property_id::text, s.sort_order
           from services s join clients c on c.id = s.client_id
           order by c.slug, s.sort_order"""
    )
    cols = ("id", "client_id", "slug", "name_ar", "name_en", "description", "image_url",
            "duration", "base_price", "currency", "is_active", "is_included",
            "pricing_unit", "property_id", "sort_order")
    rows = [dict(zip(cols, r)) for r in cur.fetchall()]

    to_delete = [r for r in rows if (r["slug"], r["name_ar"]) in DELETE_NOT_MIGRATE]
    to_move   = [r for r in rows if r not in to_delete]
    print(f"{len(rows)} legacy rows: {len(to_move)} to migrate, {len(to_delete)} to delete\n")

    migrated, skipped = [], []
    for slug in sorted({r["slug"] for r in to_move}):
        group = [r for r in to_move if r["slug"] == slug]
        print(f"  {slug} — {len(group)} row(s)")
        cat_id = landing_category(cur, group[0]["client_id"], slug, execute)

        for r in group:
            cur.execute(
                "select count(*) from catalog_services where client_id = %s and name_ar = %s",
                (r["client_id"], r["name_ar"]),
            )
            if cur.fetchone()[0]:
                print(f"      SKIP {r['name_ar']} — a CatalogService with this name already exists")
                skipped.append(r)
                continue

            dur = r["duration"] if r["duration"] is not None else DEFAULT_DURATION_MIN
            print(f"      {r['name_ar']:<22} {r['base_price']} {r['currency']:<4} "
                  f"dur={dur}{' (defaulted)' if r['duration'] is None else ''} "
                  f"unit={r['pricing_unit']} prop={'yes' if r['property_id'] else 'no'}")
            if execute:
                cur.execute(
                    # updated_at is explicit on purpose: it is Prisma's @updatedAt, managed in
                    # the application layer, so the column has NO database default and a raw INSERT
                    # that omits it fails the NOT NULL constraint. created_at does default.
                    """insert into catalog_services
                       (client_id, category_id, name_ar, name_en, description_ar, image_url,
                        price, currency, duration_min, is_active, is_featured, sort_order,
                        property_id, pricing_unit, is_included, updated_at)
                       values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,false,%s,%s,%s,%s,now())""",
                    (r["client_id"], cat_id, r["name_ar"], r["name_en"], r["description"],
                     r["image_url"], r["base_price"], r["currency"], dur, r["is_active"],
                     r["sort_order"], r["property_id"], r["pricing_unit"], r["is_included"]),
                )
                migrated.append(r)

    print()
    for r in to_delete:
        print(f"  DELETE {r['slug']} / {r['name_ar']} — contamination, not migrated")

    if not execute:
        print("\nDRY RUN — nothing written.")
        conn.close()
        return

    for r in to_delete:
        cur.execute("delete from services where id = %s", (r["id"],))

    os.makedirs(EVIDENCE_DIR, exist_ok=True)
    path = os.path.join(EVIDENCE_DIR, "phase2b-legacy-services-migration.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(
            {"taken_at": date.today().isoformat(),
             "source_rows": [{k: str(v) for k, v in r.items()} for r in rows],
             "migrated": [r["name_ar"] for r in migrated],
             "skipped_existing": [r["name_ar"] for r in skipped],
             "deleted": [f"{r['slug']}/{r['name_ar']}" for r in to_delete]},
            fh, ensure_ascii=False, indent=2,
        )
    conn.commit()
    print(f"\nsnapshot written: {path}")

    cur.execute("""select c.slug, count(*) from catalog_services s
                   join clients c on c.id = s.client_id group by 1 order by 1""")
    print("catalog_services now:", cur.fetchall())
    cur.execute("select count(*) from services")
    print(f"legacy services rows remaining (dropped in Phase 2d): {cur.fetchone()[0]}")
    conn.close()


if __name__ == "__main__":
    main()
