"""
scripts/set_hassan_barber_hours.py

One-off: set Barber.workingHours for حسين (hr / RK Barber Shop) to the tenant's real, agreed
working hours (09:00-21:00), replacing the placeholder 09:00-18:00 the barber row was seeded
with during the Reservation Pilot. Matches the same shape already set on Client.config.working_hours
by set_hr_working_hours.py -- these two were out of sync, which is what get_available_slots()
was actually reading from (Barber.workingHours, not the tenant-wide config), confirmed 2026-08-05
during Phase 3.3.1 Browser Verification.

Per Salman's explicit decision: this is the new canonical default for this barber going forward,
not a temporary testing change -- no revert step.

Usage:
    python -m scripts.set_hassan_barber_hours              # preview only
    python -m scripts.set_hassan_barber_hours --execute    # actually write
"""

import asyncio
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

_direct = os.environ.get("DIRECT_URL")
if _direct:
    os.environ["DATABASE_URL"] = _direct

from prisma import Json, Prisma

BARBER_ID = "f64ce71e-682c-4f3c-b17d-5fc48e0adaf5"  # حسين
NEW_HOURS = {
    "closed_days": ["monday"],
    "open_time":  "09:00",
    "close_time": "21:00",
}


async def main(execute: bool):
    db = Prisma()
    await db.connect()
    try:
        barber = await db.barber.find_unique(where={"id": BARBER_ID})
        if not barber:
            print(f"[ERROR] Barber {BARBER_ID} not found.")
            return

        print(f"[PLAN] {barber.name}.workingHours: {barber.workingHours} -> {NEW_HOURS}")

        if not execute:
            print("\n[DRY RUN] Pass --execute to apply.")
            return

        await db.barber.update(where={"id": BARBER_ID}, data={"workingHours": Json(NEW_HOURS)})
        print(f"[OK] {barber.name}.workingHours updated to {NEW_HOURS}")
    finally:
        await db.disconnect()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(args.execute))
