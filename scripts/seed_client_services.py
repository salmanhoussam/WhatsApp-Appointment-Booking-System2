"""
Seed client_services rows for existing clients.
Run once after Phase 46.1 schema push.

Usage:
    python scripts/seed_client_services.py
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

from prisma import Prisma

SERVICE_MAP = {
    "real_estate": ["booking", "gallery", "whatsapp_ordering"],
    "hotel":       ["booking", "gallery", "whatsapp_ordering"],
    "restaurant":  ["restaurant", "whatsapp_ordering", "restaurant.menu"],
    "ecommerce":   ["store", "store.products", "store.cart"],
}

DEFAULT_SERVICES = ["booking", "gallery", "whatsapp_ordering"]


async def main():
    db = Prisma(datasource={"url": os.environ["DIRECT_URL"]})
    await db.connect()

    clients = await db.client.find_many()
    print(f"Found {len(clients)} clients")

    for client in clients:
        service_type = getattr(client, "service_type", None) or "real_estate"
        keys = SERVICE_MAP.get(service_type, DEFAULT_SERVICES)

        print(f"\n[{client.slug}] service_type={service_type} -> seeding: {keys}")

        for key in keys:
            result = await db.clientservice.upsert(
                where={"clientId_serviceKey": {"clientId": client.id, "serviceKey": key}},
                data={
                    "create": {"clientId": client.id, "serviceKey": key, "isActive": True},
                    "update": {"isActive": True},
                },
            )
            print(f"  {key}: {'created' if result.activatedAt else 'updated'}")

    await db.disconnect()
    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
