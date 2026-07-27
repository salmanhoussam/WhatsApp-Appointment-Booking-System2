"""
scripts/set_hr_working_hours.py
One-off: set Client.config.working_hours for the `hr` (RK Barber Shop) tenant only.

Merges into the existing config JSON rather than overwriting it. Shape:
    { "closed_days": ["monday"], "open_time": "09:00", "close_time": "21:00" }

Read/enforced by app/services/reservation_service.py's create_reservation(). All times are
treated as UTC directly -- a deliberate, named simplification (no timezone-conversion utility
exists anywhere in the reservation path today).

Usage:
    python -m scripts.set_hr_working_hours
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

from prisma import Json, Prisma

WORKING_HOURS = {
    "closed_days": ["monday"],
    "open_time":  "09:00",
    "close_time": "21:00",
}


async def main():
    db = Prisma()
    await db.connect()
    try:
        client = await db.client.find_unique(where={"slug": "hr"})
        if not client:
            print("[ERROR] Client with slug 'hr' not found.")
            return

        merged_config = dict(client.config or {})
        merged_config["working_hours"] = WORKING_HOURS

        await db.client.update(
            where={"id": client.id},
            data={"config": Json(merged_config)},
        )
        print(f"[OK] working_hours set for hr ({client.id}): {WORKING_HOURS}")
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
