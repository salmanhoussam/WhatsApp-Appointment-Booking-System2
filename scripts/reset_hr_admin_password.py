"""
scripts/reset_hr_admin_password.py
One-off: reset the TENANT_ADMIN password for the `hr` (RK Barber Shop) tenant only.

Scoped deliberately narrow -- looks up the User via Client.slug == "hr", never touches any
SUPER_ADMIN row. Written for the Reservations Calendar end-to-end verification (real admin
dashboard login needed for a real headless-Chrome screenshot); `hr`'s real password was never
recorded anywhere in this repo (only its email, rkbarber@dev.invalid, was).

Usage:
    python -m scripts.reset_hr_admin_password
    python -m scripts.reset_hr_admin_password --password password123
"""

import argparse
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
from app.core.security import get_password_hash


async def main(password: str):
    db = Prisma()
    await db.connect()
    try:
        client = await db.client.find_unique(where={"slug": "hr"})
        if not client:
            print("[ERROR] Client with slug 'hr' not found.")
            return

        user = await db.user.find_first(
            where={"clientId": client.id, "role": "TENANT_ADMIN"},
        )
        if not user:
            print(f"[ERROR] No TENANT_ADMIN user found for client 'hr' ({client.id}).")
            return

        await db.user.update(
            where={"id": user.id},
            data={"password_hash": get_password_hash(password)},
        )
        print(f"[OK] Password reset for {user.email} (hr / {client.id})")
    finally:
        await db.disconnect()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reset hr tenant's admin password")
    parser.add_argument("--password", default="password123")
    args = parser.parse_args()
    asyncio.run(main(args.password))
