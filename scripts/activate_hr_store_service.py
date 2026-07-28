"""
scripts/activate_hr_store_service.py
One-off: activate the `store` service for the `hr` (RK Barber Shop) tenant only.

RK Barber was seeded as a `services`-type tenant (booking/reservations/whatsapp_ordering) and
never had `store` activated. Salman wants to add real retail products (spray/wax/gel/cologne)
alongside the existing haircut services, which requires the `store` service key active so
`store_repo.py`'s `moduleKey == "store"` category filter is reachable via `require_service("store")`.

Scoped deliberately narrow -- looks up Client via slug == "hr" only, writes a single
ClientService row for that client. Does not touch any other tenant or any SUPER_ADMIN row.

Usage:
    python -m scripts.activate_hr_store_service
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

_direct = os.environ.get("DIRECT_URL")
if _direct:
    os.environ["DATABASE_URL"] = _direct

from prisma import Prisma


async def main():
    db = Prisma()
    await db.connect()
    try:
        client = await db.client.find_unique(where={"slug": "hr"})
        if not client:
            print("[ERROR] Client with slug 'hr' not found.")
            return

        existing = await db.clientservice.find_first(
            where={"clientId": client.id, "serviceKey": "store"},
        )
        if existing:
            if existing.isActive:
                print(f"[OK] 'store' already active for hr ({client.id}).")
                return
            await db.clientservice.update(
                where={"id": existing.id},
                data={"isActive": True},
            )
            print(f"[OK] 'store' re-activated for hr ({client.id}).")
            return

        row = await db.clientservice.create(
            data={
                "clientId": client.id,
                "serviceKey": "store",
                "isActive": True,
            }
        )
        print(f"[OK] 'store' service created+activated for hr ({client.id}), row id={row.id}")
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
