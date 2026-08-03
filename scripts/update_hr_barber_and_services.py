"""
scripts/update_hr_barber_and_services.py

One-off data update for the Reservation Pilot (hr / RK Barber Shop), per Salman's real request
2026-08-02: rename the barber to the real staff name and set the real 6-service list, all Arabic
only (no English mixed in, since a future ar/en toggle needs each version to be pure). Uses the
existing catalog_service/barber_repo functions directly -- no new backend logic, no schema change.

Usage:
    python scripts/update_hr_barber_and_services.py              # preview only
    python scripts/update_hr_barber_and_services.py --execute    # actually write
"""

import asyncio
import sys
import os
import argparse

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from prisma import Prisma
from prisma import Json

CLIENT_SLUG = "hr"
BARBER_ID = "f64ce71e-682c-4f3c-b17d-5fc48e0adaf5"
NEW_BARBER_NAME = "حسين"

# Existing item ids repurposed to keep exactly 6 active bookable services (not 7) -- reusing
# real rows instead of soft-deleting + creating fresh ones for the two that already existed.
RENAME_ITEMS = {
    "71502964-79f0-4840-b676-ab1882402a13": {"name_ar": "شعر",       "duration_min": 20},  # was "الشعر"
    "2586960c-b896-4e36-8b7a-a8f91fcb5f3d": {"name_ar": "شعر ودقن",  "duration_min": 30},  # was "قصة"
    "067df2d2-c3ec-4c06-bceb-0571a4fa0230": {"name_ar": "كرياتين",   "duration_min": 90},  # unchanged name
}

NEW_ITEMS = [
    {"name_ar": "دقن",             "duration_min": 15, "sort_order": 3},
    {"name_ar": "تمشيط أو تسريح",  "duration_min": 20, "sort_order": 4},
    {"name_ar": "حنة أو صبغة",     "duration_min": 45, "sort_order": 5},
]

PRICE = 5.0
CURRENCY = "USD"


async def main(execute: bool):
    db = Prisma()
    await db.connect()

    try:
        client = await db.client.find_first(where={"slug": CLIENT_SLUG})
        if not client:
            print(f"[ERROR] No tenant found with slug '{CLIENT_SLUG}'")
            return

        barber = await db.barber.find_first(where={"id": BARBER_ID, "clientId": client.id})
        if not barber:
            print(f"[ERROR] Barber {BARBER_ID} not found for {CLIENT_SLUG}")
            return

        print(f"[PLAN] Rename barber '{barber.name}' -> '{NEW_BARBER_NAME}'")
        for item_id, spec in RENAME_ITEMS.items():
            item = await db.catalogitem.find_first(where={"id": item_id, "clientId": client.id})
            if not item:
                print(f"[WARN] item {item_id} not found, skipping")
                continue
            print(f"[PLAN] Rename item '{item.nameAr}' -> '{spec['name_ar']}' ({spec['duration_min']}min)")

        category_id = None
        first_item = await db.catalogitem.find_first(where={"id": list(RENAME_ITEMS.keys())[0]})
        if first_item:
            category_id = first_item.categoryId

        for spec in NEW_ITEMS:
            print(f"[PLAN] Create new item '{spec['name_ar']}' ({spec['duration_min']}min) in category {category_id}")

        if not execute:
            print("\n[DRY RUN] Pass --execute to apply these changes.")
            return

        await db.barber.update(where={"id": BARBER_ID}, data={"name": NEW_BARBER_NAME})
        print(f"[OK] Barber renamed to '{NEW_BARBER_NAME}'")

        for item_id, spec in RENAME_ITEMS.items():
            await db.catalogitem.update(
                where={"id": item_id},
                data={
                    "nameAr": spec["name_ar"],
                    "metadata": Json({"requires_booking": True, "duration_min": spec["duration_min"]}),
                },
            )
            print(f"[OK] Item {item_id} -> '{spec['name_ar']}'")

        for spec in NEW_ITEMS:
            created = await db.catalogitem.create(data={
                "clientId":   client.id,
                "categoryId": category_id,
                "nameAr":     spec["name_ar"],
                "price":      PRICE,
                "currency":   CURRENCY,
                "isFeatured": True,
                "isActive":   True,
                "sortOrder":  spec["sort_order"],
                "metadata":   Json({"requires_booking": True, "duration_min": spec["duration_min"]}),
            })
            print(f"[OK] Created '{spec['name_ar']}' -> id {created.id}")

        print("\n[DONE] hr now has 6 bookable services and barber name 'حسين'.")

    finally:
        await db.disconnect()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true", help="Actually apply changes (default: dry run)")
    args = parser.parse_args()
    asyncio.run(main(args.execute))
