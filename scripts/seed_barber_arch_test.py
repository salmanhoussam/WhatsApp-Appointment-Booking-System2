"""
scripts/seed_barber_arch_test.py
One-off: seed a fresh, disposable test tenant for the Barber Reservation Strategy build
(2nd real case, 2026-07-31) — deliberately NOT the real `hr` (RK Barber Shop) tenant, per
Salman's explicit instruction: a dedicated lab tenant that can run side-by-side with Clinic's
own reference tenant and be deleted afterward without touching any real client's data.

Creates:
  - Client (slug: barberlab-test)
  - ClientService row: serviceKey="reservations", isActive=true
  - 2 Barber rows (different working hours, to exercise per-barber schedule independence)
  - 2 Service rows (Haircut, Beard Trim) — reusing the existing Service model, same as Clinic did
  - 2 Users: one TENANT_ADMIN, one MANAGER_RESERVATIONS (known passwords, for real JWT login)

Usage:
    python -m scripts.seed_barber_arch_test
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

from prisma import Prisma, Json
import bcrypt

SLUG = "barberlab-test"
ADMIN_EMAIL = "admin@barberlab-test.local"
RESERV_EMAIL = "reservations@barberlab-test.local"
PASSWORD = "TestPass123!"


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


async def main():
    db = Prisma()
    await db.connect()
    try:
        existing = await db.client.find_unique(where={"slug": SLUG})
        if existing:
            print(f"[OK] Client '{SLUG}' already exists ({existing.id}) — reusing it.")
            client = existing
        else:
            client = await db.client.create(data={
                "name":         "Barber Architecture Test Lab",
                "name_en":      "Barber Architecture Test Lab",
                "slug":         SLUG,
                "phone":        "+9613300771122",
                "currency":     "USD",
                "status":       "active",
                "service_type": "services",
            })
            print(f"[OK] Client created: {client.id}")

        # -- ClientService: reservations --------------------------------------------------------
        existing_svc = await db.clientservice.find_first(
            where={"clientId": client.id, "serviceKey": "reservations"}
        )
        if not existing_svc:
            await db.clientservice.create(data={
                "clientId": client.id, "serviceKey": "reservations", "isActive": True,
            })
            print("[OK] client_services: reservations activated")
        else:
            print("[OK] client_services: reservations already active")

        # -- Barbers ------------------------------------------------------------------------------
        existing_barbers = await db.barber.find_many(where={"clientId": client.id})
        if existing_barbers:
            barbers = existing_barbers
            print(f"[OK] {len(barbers)} barber(s) already exist — reusing them.")
        else:
            b1 = await db.barber.create(data={
                "clientId": client.id, "name": "Ali", "phone": "+96170111111",
                "workingHours": Json({
                    "closed_days": ["sunday"], "open_time": "09:00", "close_time": "17:00",
                }),
                "sortOrder": 0,
            })
            b2 = await db.barber.create(data={
                "clientId": client.id, "name": "Rami", "phone": "+96170222222",
                "workingHours": Json({
                    "closed_days": [], "open_time": "10:00", "close_time": "20:00",
                }),
                "sortOrder": 1,
            })
            barbers = [b1, b2]
            print(f"[OK] Barbers created: Ali={b1.id}, Rami={b2.id}")

        # -- Services (reused model) ----------------------------------------------------------------
        existing_services = await db.service.find_many(where={"clientId": client.id})
        if existing_services:
            services = existing_services
            print(f"[OK] {len(services)} service(s) already exist — reusing them.")
        else:
            s1 = await db.service.create(data={
                "clientId": client.id, "name_ar": "قص شعر", "name_en": "Haircut",
                "duration": 30, "basePrice": "10.00", "currency": "USD",
            })
            s2 = await db.service.create(data={
                "clientId": client.id, "name_ar": "تحديد لحية", "name_en": "Beard Trim",
                "duration": 15, "basePrice": "5.00", "currency": "USD",
            })
            services = [s1, s2]
            print(f"[OK] Services created: Haircut={s1.id}, Beard Trim={s2.id}")

        # -- Users --------------------------------------------------------------------------------
        admin_user = await db.user.find_unique(where={"email": ADMIN_EMAIL})
        if not admin_user:
            admin_user = await db.user.create(data={
                "clientId": client.id, "email": ADMIN_EMAIL, "password_hash": _hash(PASSWORD),
                "fullName": "Barberlab Admin", "role": "TENANT_ADMIN",
            })
            print(f"[OK] TENANT_ADMIN user created: {admin_user.email}")
        else:
            print(f"[OK] TENANT_ADMIN user already exists: {admin_user.email}")

        reserv_user = await db.user.find_unique(where={"email": RESERV_EMAIL})
        if not reserv_user:
            reserv_user = await db.user.create(data={
                "clientId": client.id, "email": RESERV_EMAIL, "password_hash": _hash(PASSWORD),
                "fullName": "Barberlab Reservations Manager", "role": "MANAGER_RESERVATIONS",
            })
            print(f"[OK] MANAGER_RESERVATIONS user created: {reserv_user.email}")
        else:
            print(f"[OK] MANAGER_RESERVATIONS user already exists: {reserv_user.email}")

        print("\n--- Summary ---")
        print(f"client_id: {client.id}")
        print(f"slug: {SLUG}")
        print(f"barbers: {[(b.id, b.name) for b in barbers]}")
        print(f"services: {[(s.id, s.name_en) for s in services]}")
        print(f"admin login: {ADMIN_EMAIL} / {PASSWORD}")
        print(f"reservations-manager login: {RESERV_EMAIL} / {PASSWORD}")
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
