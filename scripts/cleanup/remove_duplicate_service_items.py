"""Delete the CatalogItem rows that duplicate a real CatalogService.

DECISION 2026-09-07, Salman: "نفصلن بشكل نهائي بين catalog items وcatalog services."

WHAT THESE ROWS ARE. Before the CatalogService/CatalogItem split (Phase 3.7C, 2026-08-08), a
bookable service was a CatalogItem carrying `metadata.requires_booking = true`. The split created
the real model; the old rows were never removed. So `rk` and `mr-h` each hold their six services
TWICE -- once as a real CatalogService the reservation engine uses, once as a fossil CatalogItem:

    شعر · شعر ودقن · كرياتين · دقن · تمشيط أو تسريح · حنة أو صبغة

`alzabt-demo`, provisioned after the split, has 0 items and 6 services -- the correct shape, and the
proof that current provisioning is already right and these 12 rows are residue, not design.

WHY DELETING THEM IS SAFE -- measured live before writing, never assumed:
  homepage        Both tenants hold the `reservations` key, so FeaturedItemsSection takes the
                  catalog_services branch (see phase1a-source-selection.md). These items are not
                  what their Services section renders.
  store_order_items  CASCADE  -- 0 of the 12 are referenced. No order line is touched.
  store_cart_items   CASCADE  -- 0 referenced.
  gallery_images     CASCADE  -- checked at runtime below; the script REFUSES if any is referenced,
                                rather than silently deleting a tenant's image row.
  restaurant_order_items RESTRICT -- 0 rows in the table platform-wide; cannot block.

The selector is `metadata ? 'requires_booking'` -- the fossil marker itself, not a name list. A row
without that key is never touched, so a real product that happens to share a service's name is safe.

Usage:
    venv/bin/python scripts/cleanup/remove_duplicate_service_items.py --dry-run
    venv/bin/python scripts/cleanup/remove_duplicate_service_items.py --execute
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

SELECT = """
    select i.id::text, c.slug, i.name_ar, i.price, cat.module_key,
           (select count(*) from store_order_items oi where oi.catalog_item_id = i.id),
           (select count(*) from store_cart_items ci where ci.catalog_item_id = i.id),
           (select count(*) from gallery_images g  where g.catalog_item_id  = i.id)
    from catalog_items i
    join clients c            on c.id  = i.client_id
    join catalog_categories cat on cat.id = i.category_id
    where i.metadata ? 'requires_booking'
    order by c.slug, i.name_ar
"""


def main() -> None:
    execute = "--execute" in sys.argv
    if not execute and "--dry-run" not in sys.argv:
        sys.exit("Pass --dry-run or --execute.")

    conn = psycopg2.connect(_db_target.resolve(direct=True))
    cur = conn.cursor()

    cur.execute(SELECT)
    rows = [
        dict(zip(("id", "slug", "name_ar", "price", "module_key",
                  "order_lines", "cart_lines", "gallery_rows"), r))
        for r in cur.fetchall()
    ]

    if not rows:
        print("nothing to do -- no CatalogItem carries metadata.requires_booking")
        conn.close()
        return

    blocked = [r for r in rows if r["order_lines"] or r["cart_lines"] or r["gallery_rows"]]
    for r in rows:
        mark = "  <-- REFERENCED, WOULD CASCADE" if r in blocked else ""
        print(f"  {r['slug']:<6} {r['name_ar']:<22} orders={r['order_lines']} "
              f"carts={r['cart_lines']} gallery={r['gallery_rows']}{mark}")
    print(f"\n  {len(rows)} rows selected")

    if blocked:
        sys.exit(
            f"\nABORT: {len(blocked)} row(s) are referenced by a real order, cart or gallery row.\n"
            f"       Deleting them would cascade into tenant data. Nothing was deleted."
        )

    # Every one of these must still exist as a real CatalogService, or the row is not a duplicate
    # at all and deleting it would remove a service the tenant actually offers.
    missing = []
    for r in rows:
        cur.execute(
            """select count(*) from catalog_services s join clients c on c.id = s.client_id
               where c.slug = %s and s.name_ar = %s""",
            (r["slug"], r["name_ar"]),
        )
        if cur.fetchone()[0] == 0:
            missing.append(r)
    # A row with no twin is NOT a duplicate -- it is the only record of a service that tenant
    # appears to offer. Deleting it would remove the service, not de-duplicate it. Those rows are
    # skipped and reported; they need a decision, not a cleanup script.
    deletable = [r for r in rows if r not in missing]
    if missing:
        print()
        for r in missing:
            print(f"  !! KEPT  {r['slug']} / {r['name_ar']} -- no CatalogService twin, "
                  f"not a duplicate")
    print(f"\n  {len(deletable)} deletable (twin confirmed) · {len(missing)} kept")
    if not deletable:
        print("nothing to delete.")
        conn.close()
        return

    if not execute:
        print("\nDRY RUN — nothing written, nothing deleted.")
        conn.close()
        return

    os.makedirs(EVIDENCE_DIR, exist_ok=True)
    path = os.path.join(EVIDENCE_DIR, "phase1b-deleted-duplicate-items.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(
            {"taken_at": date.today().isoformat(),
             "reason": "pre-split CatalogItem fossils duplicating a real CatalogService",
             "deleted": [{k: (str(v) if k == "price" else v) for k, v in r.items()}
                         for r in deletable],
             "kept_no_twin": [{k: (str(v) if k == "price" else v) for k, v in r.items()}
                              for r in missing]},
            fh, ensure_ascii=False, indent=2,
        )
    print(f"\nsnapshot written: {path}")

    cur.execute(
        "delete from catalog_items where id = any(%s::uuid[])",
        ([r["id"] for r in deletable],),
    )
    print(f"deleted {cur.rowcount} rows")
    conn.commit()

    cur.execute("select count(*) from catalog_items where metadata ? 'requires_booking'")
    print(f"remaining fossils: {cur.fetchone()[0]}")
    for slug in ("rk", "mr-h"):
        cur.execute("""select count(*) from catalog_services s join clients c on c.id=s.client_id
                       where c.slug=%s""", (slug,))
        svc = cur.fetchone()[0]
        cur.execute("""select count(*) from catalog_items i join clients c on c.id=i.client_id
                       where c.slug=%s""", (slug,))
        print(f"  {slug}: services={svc}  items={cur.fetchone()[0]}")
    conn.close()


if __name__ == "__main__":
    main()
