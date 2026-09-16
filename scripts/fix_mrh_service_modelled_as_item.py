"""Q4 — mr-h's «تمشيط أو تسريح» is a SERVICE stored as an ITEM. Move it.

    DRY RUN BY DEFAULT.   venv/bin/python scripts/fix_mrh_service_modelled_as_item.py
    APPLY (production write, Salman approved 2026-09-16):   ... --apply

WHAT IS WRONG, MEASURED (.claudedocs/work/catalog-model-investigation/2026-09-16/summary.md)

    `mr-h` offers «تمشيط أو تسريح» and NO CUSTOMER CAN BOOK IT. Not by configuration -- structurally:
    the row lives in `CatalogItem`, and `Reservation` has no foreign key to `CatalogItem`. It has
    one to `CatalogService`, and mr-h's eleven real reservations all point there.

    The same service exists in the RIGHT table on both other live tenants:

        rk              CatalogService  «تمشيط أو تسريح»  5 USD · 20 min
        barberlab-test  CatalogService  «تمشيط أو تسريح»  5 USD · 20 min
        mr-h            CatalogItem     «تمشيط أو تسريح»  5 USD   metadata{duration_min:20,
                                                                          requires_booking:true}

    `metadata.requires_booking` is the tell. That was how bookability was expressed BEFORE
    `CatalogService` existed -- the schema comment at prisma/schema.prisma:530 says the split
    happened precisely because this "was being bolted on via metadata.requires_booking only".
    So this row is not a mistake anyone made recently; it is one row that the 2026-08-08 split
    never migrated, and it has been quietly unbookable ever since.

WHY MOVE RATHER THAN DELETE

    The item is DEACTIVATED, not deleted. Deleting it would destroy the only record that this row
    ever existed and how it was shaped, and `isActive=false` already removes it from every surface
    a customer or an owner sees. Measured before choosing: the row has ZERO inbound references --
    StoreCartItem 0, StoreOrderItem 0, GalleryImage 0 -- so a delete would not cascade anywhere,
    and that is exactly why there is no pressure to delete. Reversible beats tidy.

    The service-shaped metadata keys are stripped from the deactivated row so it can never be
    mistaken for a live bookable thing again; anything else in `metadata` is preserved untouched.

THE WRITE PATH

    Creation goes through `catalog_service_service.admin_create_service` -- the same function the
    admin route and Lia both use. Not a raw insert: this row must be born exactly as every other
    service is, or the fix reintroduces a second write path while fixing a data defect.

    The deactivation has no service-layer function (no admin route deactivates a single item by
    flipping isActive), so it is a scoped repository update: one row, matched by id AND clientId.

IDEMPOTENT AND NARROW

    Refuses unless it finds exactly one matching item, refuses if a CatalogService with that name
    already exists on mr-h (which would mean the move already ran), and touches no other row.
"""
import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts import _db_target                                        # noqa: E402

os.environ["DATABASE_URL"] = _db_target.resolve(direct=True)

from app.db.client import prisma_client                              # noqa: E402
from app.services import catalog_service_service                     # noqa: E402

SLUG = "mr-h"
NAME = "تمشيط أو تسريح"
# Service-shaped keys that only ever existed because there was nowhere else to put them.
SERVICE_KEYS = ("duration_min", "requires_booking")


async def main(apply: bool) -> int:
    await prisma_client.connect()
    try:
        client = await prisma_client.client.find_first(where={"slug": SLUG})
        if client is None:
            print(f"🔴 ABORT: tenant {SLUG!r} not found.")
            return 1

        items = [i for i in await prisma_client.catalogitem.find_many(
            where={"clientId": client.id}) if i.nameAr == NAME]
        if len(items) != 1:
            print(f"🔴 ABORT: expected exactly ONE CatalogItem named {NAME!r} on {SLUG}, "
                  f"found {len(items)}. Refusing to guess.")
            return 1
        item = items[0]

        existing = [s for s in await prisma_client.catalogservice.find_many(
            where={"clientId": client.id}) if s.nameAr == NAME]
        if existing:
            print(f"✅ ALREADY MOVED — a CatalogService named {NAME!r} exists on {SLUG} "
                  f"(id={existing[0].id}). Nothing to do.")
            return 0

        md = dict(item.metadata or {})
        duration = md.get("duration_min")
        if not isinstance(duration, int) or duration <= 0:
            print(f"🔴 ABORT: metadata.duration_min is {duration!r}; refusing to invent a duration "
                  f"for a bookable service.")
            return 1

        kept_md = {k: v for k, v in md.items() if k not in SERVICE_KEYS}
        services = await prisma_client.catalogservice.find_many(where={"clientId": client.id})
        next_sort = max((s.sortOrder for s in services), default=0) + 1

        print(f"tenant            {SLUG}  ({client.id})")
        print(f"item              {item.id}")
        print(f"category          {item.categoryId}   (unchanged — it already holds "
              f"{len(services)} services)")
        print("\nWOULD CREATE  CatalogService:")
        print(f"   name_ar        {NAME!r}")
        print(f"   price          {float(item.price)}  {item.currency}")
        print(f"   duration_min   {duration}   ← taken from metadata, never invented")
        print(f"   is_featured    {item.isFeatured}")
        print(f"   sort_order     {next_sort}   (after the existing {len(services)})")
        print("\nWOULD THEN DEACTIVATE  CatalogItem:")
        print(f"   isActive       {item.isActive} -> False")
        print(f"   metadata       {md}  ->  {kept_md}")
        print("   (not deleted: 0 inbound references, so nothing forces a delete, and the row "
              "stays as the record of what happened)")

        if not apply:
            print("\n⏸  DRY RUN — nothing written. Re-run with --apply.")
            return 0

        created = await catalog_service_service.admin_create_service(
            client_id      = client.id,
            category_id    = item.categoryId,
            name_ar        = NAME,
            name_en        = item.nameEn,
            description_ar = item.descriptionAr,
            description_en = item.descriptionEn,
            image_url      = item.imageUrl,
            price          = float(item.price) if item.price is not None else None,
            currency       = item.currency,
            duration_min   = duration,
            is_featured    = item.isFeatured,
            sort_order     = next_sort,
        )
        print(f"\n✅ CatalogService created  id={created.get('id')}")

        await prisma_client.catalogitem.update_many(
            where={"id": item.id, "clientId": client.id},        # tenant-scoped, always
            data={"isActive": False, "metadata": prisma_json(kept_md)},
        )
        print(f"✅ CatalogItem {item.id} deactivated, service metadata stripped")

        # Read back rather than trust the calls.
        svc = [s for s in await prisma_client.catalogservice.find_many(
            where={"clientId": client.id}) if s.nameAr == NAME]
        it2 = await prisma_client.catalogitem.find_unique(where={"id": item.id})
        print(f"\nread-back: CatalogService named {NAME!r} = {len(svc)}  "
              f"(duration={svc[0].durationMin if svc else '?'})")
        print(f"read-back: CatalogItem isActive = {it2.isActive}  metadata = {it2.metadata}")
        print("\nmr-h's customers can now book this service. It has been unbookable since "
              "2026-08-08.")
        return 0
    finally:
        await prisma_client.disconnect()


def prisma_json(value):
    from prisma import Json
    return Json(value)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="perform the write (default: dry run)")
    sys.exit(asyncio.run(main(ap.parse_args().apply)))
