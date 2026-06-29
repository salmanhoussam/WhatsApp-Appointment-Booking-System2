"""
scripts/cleanup_old_units.py

Removes legacy test units that predate the Phoenician-named seed.
A unit is considered "old" if it has no content_blocks AND no amenities JSON data.
The 12 seeded Phoenician units all have full amenities arrays so they are safe.

Usage:
    python scripts/cleanup_old_units.py              # preview only
    python scripts/cleanup_old_units.py --execute    # actually delete
"""

import asyncio
import sys
import os
import argparse

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from prisma import Prisma

CLIENT_SLUG = "smar"


async def main(execute: bool):
    db = Prisma()
    await db.connect()

    try:
        # Resolve tenant
        tenant = await db.client.find_first(where={"slug": CLIENT_SLUG})
        if not tenant:
            print(f"[ERROR] No tenant found with slug '{CLIENT_SLUG}'")
            return

        # Fetch all units for this tenant
        all_units = await db.unit.find_many(
            where={"clientId": tenant.id},
            order=[{"sort_order": "asc"}],
        )
        print(f"Total units found: {len(all_units)}")

        # Identify old units: no amenities AND no content_blocks
        old_units = [
            u for u in all_units
            if not u.amenities and not u.content_blocks
        ]

        keep_units = [u for u in all_units if u not in old_units]

        print(f"\nUnits to DELETE ({len(old_units)}):")
        for u in old_units:
            print(f"  - [{u.id[:8]}] {u.name_ar or u.name_en}")

        print(f"\nUnits to KEEP ({len(keep_units)}):")
        for u in keep_units:
            print(f"  + [{u.id[:8]}] {u.name_ar or u.name_en}")

        if not execute:
            print("\n[DRY RUN] No changes made. Pass --execute to delete.")
            return

        if not old_units:
            print("\nNothing to delete.")
            return

        # Delete related bookings and price records first to avoid FK violations
        old_ids = [u.id for u in old_units]

        deleted_prices = await db.price.delete_many(
            where={"unitId": {"in": old_ids}}
        )
        print(f"\nDeleted {deleted_prices} price records.")

        deleted_bookings = await db.booking.delete_many(
            where={"unitId": {"in": old_ids}}
        )
        print(f"Deleted {deleted_bookings} booking records.")

        deleted_units = await db.unit.delete_many(
            where={"id": {"in": old_ids}}
        )
        print(f"Deleted {deleted_units} units.")
        print("\nCleanup complete.")

    finally:
        await db.disconnect()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true", help="Actually delete (default is dry-run)")
    args = parser.parse_args()
    asyncio.run(main(execute=args.execute))
