"""
scripts/create_jaafar_staff_user.py

Staff Scoped Access, Phase A verification step
(.claudedocs/implementation/STAFF_SCOPED_ACCESS_CONTRACT.md) -- creates the real STAFF-role login
account for Jaafar (rk / RK Barber Shop), linked via User.barberId to his real Barber row
(c75b89c3-03bb-4171-8f98-d971837dd162, name 'جعفر'). Does not touch BarberService/CatalogService --
Staff<->Service assignment is a separate, already-built capability.

Usage:
    python -m scripts.create_jaafar_staff_user
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from prisma import Prisma
from app.core.security import get_password_hash

RK_CLIENT_ID = "7ef5c8c9-3d47-4aa9-b5e0-43b746ee2657"
JAAFAR_BARBER_ID = "c75b89c3-03bb-4171-8f98-d971837dd162"
JAAFAR_EMAIL = "jaafar@rk.dev.invalid"
JAAFAR_PASSWORD = "password123"


async def main():
    db = Prisma()
    await db.connect()
    try:
        barber = await db.barber.find_unique(where={"id": JAAFAR_BARBER_ID})
        if not barber or barber.clientId != RK_CLIENT_ID:
            print(f"[ERROR] Barber {JAAFAR_BARBER_ID} not found or not in rk.")
            return

        existing = await db.user.find_unique(where={"email": JAAFAR_EMAIL})
        if existing:
            print(f"[OK] User {JAAFAR_EMAIL} already exists ({existing.id}) -- updating role/link.")
            user = await db.user.update(
                where={"id": existing.id},
                data={
                    "role": "STAFF",
                    "barberId": JAAFAR_BARBER_ID,
                    "password_hash": get_password_hash(JAAFAR_PASSWORD),
                },
            )
        else:
            user = await db.user.create(data={
                "clientId": RK_CLIENT_ID,
                "email": JAAFAR_EMAIL,
                "password_hash": get_password_hash(JAAFAR_PASSWORD),
                "fullName": barber.name,
                "role": "STAFF",
                "barberId": JAAFAR_BARBER_ID,
            })
            print(f"[OK] Created STAFF user: {user.id}")

        print("\n--- Summary ---")
        print(f"user_id: {user.id}")
        print(f"barber_id: {user.barberId}")
        print(f"role: {user.role}")
        print(f"login: {JAAFAR_EMAIL} / {JAAFAR_PASSWORD}")
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
