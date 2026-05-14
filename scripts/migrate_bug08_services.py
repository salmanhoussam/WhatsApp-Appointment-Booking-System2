# -*- coding: utf-8 -*-
"""
scripts/migrate_bug08_services.py
BUG-08 Migration — Backfill missing "catalog" service for store/restaurant tenants.

Any tenant registered before the 3-layer union fix (2026-05-13) that has
service_type in {store, restaurant} but is missing "catalog" in client_services
will have the row inserted here.

Usage:
    python scripts/migrate_bug08_services.py          # dry-run (shows what would change)
    python scripts/migrate_bug08_services.py --apply  # writes to DB
"""

import asyncio
import sys
import os

# Ensure project root is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

REQUIRES_CATALOG = {"store", "restaurant"}

DRY_RUN = "--apply" not in sys.argv


async def main():
    from app.db.client import prisma_client
    await prisma_client.connect()

    # Fetch all clients with store or restaurant service_type
    clients = await prisma_client.client.find_many(
        where={"service_type": {"in": list(REQUIRES_CATALOG)}},
        include={"clientServices": True},
    )

    print(f"{'[DRY RUN] ' if DRY_RUN else ''}Scanning {len(clients)} store/restaurant tenants...\n")

    patched = 0
    skipped = 0

    for client in clients:
        active_keys = {svc.serviceKey for svc in client.clientServices}

        if "catalog" in active_keys:
            skipped += 1
            continue

        print(f"  {'WOULD PATCH' if DRY_RUN else 'PATCHING'}: {client.slug} ({client.service_type})"
              f" — existing services: {sorted(active_keys)}")

        if not DRY_RUN:
            await prisma_client.clientservice.create(data={
                "clientId":   client.id,
                "serviceKey": "catalog",
                "isActive":   True,
            })

        patched += 1

    print(f"\n{'[DRY RUN] ' if DRY_RUN else ''}Done.")
    print(f"  Patched : {patched}")
    print(f"  Already OK: {skipped}")

    if DRY_RUN and patched > 0:
        print("\nRun with --apply to write changes to DB.")

    await prisma_client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
