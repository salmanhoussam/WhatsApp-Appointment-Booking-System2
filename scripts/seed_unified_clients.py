"""
Create Client records for caracas (restaurant) and footlab (store).
Also seeds their client_services rows.
Run once: python scripts/seed_unified_clients.py

Idempotent — safe to run multiple times (upsert by slug).
"""

import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

from prisma import Prisma

CLIENTS = [
    {
        "slug":           "caracas",
        "name":           "Caracas",
        "name_ar":        "كاراكاس",
        "name_en":        "Caracas",
        "service_type":   "restaurant",
        "primary_color":  "#c0392b",
        "currency":       "LBP",
        "status":         "active",
        "whatsapp_number": "",
        "services":       ["restaurant", "whatsapp_ordering", "restaurant.menu"],
    },
    {
        "slug":           "footlab",
        "name":           "Footlab",
        "name_ar":        "فوتلاب",
        "name_en":        "Footlab",
        "service_type":   "ecommerce",
        "primary_color":  "#1a1a2e",
        "currency":       "USD",
        "status":         "active",
        "whatsapp_number": "",
        "services":       ["store", "store.products", "store.cart"],
    },
    {
        "slug":           "olivello",
        "name":           "Olivello",
        "name_ar":        "أوليفيلو",
        "name_en":        "Olivello",
        "service_type":   "ecommerce",
        "primary_color":  "#7A6E4A",
        "currency":       "USD",
        "status":         "active",
        "whatsapp_number": "",
        "services":       ["store", "store.products", "store.cart"],
    },
]


async def main():
    db = Prisma(datasource={"url": os.environ["DIRECT_URL"]})
    await db.connect()

    for cfg in CLIENTS:
        slug = cfg["slug"]

        existing = await db.client.find_unique(where={"slug": slug})
        if existing:
            print(f"[{slug}] already exists — skipping Client creation")
            client_id = existing.id
        else:
            client = await db.client.create(data={
                "slug":           cfg["slug"],
                "name":           cfg["name"],
                "name_ar":        cfg["name_ar"],
                "name_en":        cfg["name_en"],
                "service_type":   cfg["service_type"],
                "primary_color":  cfg["primary_color"],
                "currency":       cfg["currency"],
                "status":         cfg["status"],
                "whatsapp_number": cfg["whatsapp_number"],
                "phone":          f"placeholder_{slug}",
                "isActive":       True,
                "unit_types":     [],
                "payment_methods": [],
            })
            client_id = client.id
            print(f"[{slug}] Client created — id: {client_id}")

        # Seed client_services
        for key in cfg["services"]:
            await db.clientservice.upsert(
                where={"clientId_serviceKey": {"clientId": client_id, "serviceKey": key}},
                data={
                    "create": {"clientId": client_id, "serviceKey": key, "isActive": True},
                    "update": {"isActive": True},
                },
            )
            print(f"  [{slug}] service seeded: {key}")

    await db.disconnect()
    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
