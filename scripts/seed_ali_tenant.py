"""
scripts/seed_ali_tenant.py

One-off: seed a second, genuinely separate real tenant (slug "ali") offering the same barber/
reservation services as `hr` (RK Barber Shop), per Salman's explicit instruction during Phase 3.2
planning (2026-08-05) -- purpose-built to prove tenant isolation for the Reservation/Barber
capability as a second independent real case, since until now that capability has only ever run
against a single tenant. Backend/data only -- deliberately NO page_content.json, no frontend route
registration, no public page (the frontend for this tenant comes later, per Salman's instruction).
This is a partial onboarding by design, not the full "Onboarding Completed" chain
(.claude/rules/tenant-onboarding.md) -- stated explicitly, not silently claimed as done.

Mirrors hr's real 6 catalog items (same name_ar/duration_min), following the real CatalogCategory/
CatalogItem model (not the older Service model scripts/seed_barber_arch_test.py used for its own,
disposable, pre-catalog-unification test tenant).

Creates:
  - Client (slug: ali), service_type="services"
  - ClientService rows: reservations, booking, whatsapp_ordering (all active) -- both "reservations"
    and "booking" per the documented pitfall in .claude/rules/backend/service-system.md (seeding
    only one leaves the Reservations admin route/UI silently unreachable)
  - One TENANT_ADMIN User (known password, for real JWT login)
  - One Barber
  - One CatalogCategory + 6 CatalogItem rows mirroring hr's real services

Usage:
    python scripts/seed_ali_tenant.py              # preview only
    python scripts/seed_ali_tenant.py --execute    # actually write
"""

import asyncio
import os
import sys
import argparse

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv()

from prisma import Prisma, Json
import bcrypt

SLUG = "ali"
CLIENT_PHONE = "+9613300778899"
ADMIN_EMAIL = "admin@ali-barber.local"
ADMIN_PASSWORD = "AliBarber123!"
BARBER_NAME = "Ali"
BARBER_HOURS = {"open_time": "09:00", "close_time": "18:00", "closed_days": []}

# Mirrors hr's real 6 services exactly (scripts/update_hr_barber_and_services.py), same names/
# durations -- the point of this tenant is testing isolation of structurally IDENTICAL data, not
# different data.
CATALOG_ITEMS = [
    {"name_ar": "شعر",            "duration_min": 20, "sort_order": 0},
    {"name_ar": "شعر ودقن",       "duration_min": 30, "sort_order": 1},
    {"name_ar": "كرياتين",        "duration_min": 90, "sort_order": 2},
    {"name_ar": "دقن",            "duration_min": 15, "sort_order": 3},
    {"name_ar": "تمشيط أو تسريح", "duration_min": 20, "sort_order": 4},
    {"name_ar": "حنة أو صبغة",    "duration_min": 45, "sort_order": 5},
]
PRICE = 5.0
CURRENCY = "USD"


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


async def main(execute: bool):
    db = Prisma()
    await db.connect()
    try:
        existing = await db.client.find_unique(where={"slug": SLUG})
        if existing:
            print(f"[OK] Client '{SLUG}' already exists ({existing.id}) -- reusing it.")
            client = existing
        else:
            print(f"[PLAN] Create Client slug='{SLUG}', phone='{CLIENT_PHONE}', service_type='services'")
            if execute:
                client = await db.client.create(data={
                    "name":         "Ali Barber Shop",
                    "name_ar":      "صالون علي للحلاقة",
                    "name_en":      "Ali Barber Shop",
                    "slug":         SLUG,
                    "phone":        CLIENT_PHONE,
                    "currency":     "USD",
                    "status":       "active",
                    "service_type": "services",
                })
                print(f"[OK] Client created: {client.id}")
            else:
                client = None

        client_id = client.id if client else None

        # -- client_services: reservations + booking + whatsapp_ordering ----------------------
        for key in ("reservations", "booking", "whatsapp_ordering"):
            if client_id:
                existing_svc = await db.clientservice.find_first(
                    where={"clientId": client_id, "serviceKey": key}
                )
                if existing_svc:
                    print(f"[OK] client_services: {key} already active")
                    continue
            print(f"[PLAN] Activate client_services: {key}")
            if execute and client_id:
                await db.clientservice.create(data={
                    "clientId": client_id, "serviceKey": key, "isActive": True,
                })
                print(f"[OK] client_services: {key} activated")

        # -- Barber -----------------------------------------------------------------------------
        barber = None
        if client_id:
            barber = await db.barber.find_first(where={"clientId": client_id})
        if barber:
            print(f"[OK] Barber already exists: {barber.name} ({barber.id})")
        else:
            print(f"[PLAN] Create Barber '{BARBER_NAME}', hours {BARBER_HOURS}")
            if execute and client_id:
                barber = await db.barber.create(data={
                    "clientId": client_id, "name": BARBER_NAME,
                    "workingHours": Json(BARBER_HOURS), "sortOrder": 0,
                })
                print(f"[OK] Barber created: {barber.id}")

        # -- CatalogCategory + 6 CatalogItems ----------------------------------------------------
        category = None
        if client_id:
            category = await db.catalogcategory.find_first(where={"clientId": client_id})
        if category:
            print(f"[OK] CatalogCategory already exists: {category.id}")
        else:
            print(f"[PLAN] Create CatalogCategory 'الخدمات' (module_key='services')")
            if execute and client_id:
                category = await db.catalogcategory.create(data={
                    "clientId": client_id, "moduleKey": "services",
                    "nameAr": "الخدمات", "nameEn": "Services", "sortOrder": 0,
                })
                print(f"[OK] CatalogCategory created: {category.id}")

        category_id = category.id if category else None
        existing_items = []
        if client_id:
            existing_items = await db.catalogitem.find_many(where={"clientId": client_id})
        if existing_items:
            print(f"[OK] {len(existing_items)} catalog item(s) already exist -- reusing them.")
        else:
            for spec in CATALOG_ITEMS:
                print(f"[PLAN] Create CatalogItem '{spec['name_ar']}' ({spec['duration_min']}min)")
            if execute and client_id and category_id:
                created_items = []
                for spec in CATALOG_ITEMS:
                    item = await db.catalogitem.create(data={
                        "clientId":   client_id,
                        "categoryId": category_id,
                        "nameAr":     spec["name_ar"],
                        "price":      PRICE,
                        "currency":   CURRENCY,
                        "isFeatured": True,
                        "isActive":   True,
                        "sortOrder":  spec["sort_order"],
                        "metadata":   Json({"requires_booking": True, "duration_min": spec["duration_min"]}),
                    })
                    created_items.append(item)
                    print(f"[OK] Created '{spec['name_ar']}' -> id {item.id}")

        # -- TENANT_ADMIN User --------------------------------------------------------------------
        admin_user = await db.user.find_unique(where={"email": ADMIN_EMAIL})
        if admin_user:
            print(f"[OK] TENANT_ADMIN user already exists: {admin_user.email}")
        else:
            print(f"[PLAN] Create TENANT_ADMIN user {ADMIN_EMAIL}")
            if execute and client_id:
                admin_user = await db.user.create(data={
                    "clientId": client_id, "email": ADMIN_EMAIL,
                    "password_hash": _hash(ADMIN_PASSWORD),
                    "fullName": "Ali Barber Admin", "role": "TENANT_ADMIN",
                })
                print(f"[OK] TENANT_ADMIN user created: {admin_user.email}")

        if not execute:
            print("\n[DRY RUN] Pass --execute to apply these changes.")
            return

        print("\n--- Summary ---")
        print(f"client_id: {client_id}")
        print(f"slug: {SLUG}")
        print(f"admin login: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        print("[DONE] 'ali' tenant seeded -- backend/data only, no frontend yet.")

    finally:
        await db.disconnect()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true", help="Actually apply changes (default: dry run)")
    args = parser.parse_args()
    asyncio.run(main(args.execute))
