"""
scripts/seed_alzabt_demo_tenant.py

One-off: seed the standalone عالزبط (Alzabt) demo/reference tenant (slug: alzabt-demo), per Salman's
explicit decision on the Alzabt Master Product Plan (Section J/K step 7, 2026-08-12) -- the "جرّب
عالزبط" marketing CTA points here, never at RK's real production tenant. Deliberately isolated:

  - Fictional identity ("صالون عالزبط") -- not RK, not any real business, not implying a real
    customer per Salman's own instruction.
  - Independently seeded, NOT mirrored from RK -- same real Barber/CatalogService/working_hours
    *shape* RK already proved (Prisma models confirmed via a live read of RK's own real rows), but
    distinct fictional barbers, distinct service names/prices/durations. No dependency on RK's own
    data ever changing.
  - Uses the CURRENT CatalogService model (Phase 3.7C, 2026-08-08) -- NOT the older CatalogItem+
    metadata.requires_booking pattern scripts/seed_ali_tenant.py (dated 2026-08-05, pre-3.7C) still
    uses; that pattern is stale for the real booking flow today (useReservationBooking.js queries
    /reservations/catalog-services, which reads CatalogService directly). Confirmed by reading
    RK's own real CatalogCategory (moduleKey="catalog") and CatalogService rows directly.
  - Seeds BOTH `booking` AND `reservations` client_services keys -- the documented pitfall in
    .claude/rules/backend/service-system.md (seeding only one leaves the admin Reservations
    route/UI silently unreachable even though the booking flow works).

Creates:
  - Client (slug: alzabt-demo), service_type="barbershop" (RK's own real value -- confirms
    app/services/demo_service.py's _VENUE_TYPE_MAP["booking"]="real_estate" is wrong, a separate,
    already-documented gap this script does not touch/fix)
  - ClientService rows: reservations, booking, whatsapp_ordering, catalog (all active)
  - One TENANT_ADMIN User (known password, for real JWT login -- not exposed publicly)
  - 2 fictional Barbers with real working_hours
  - 1 CatalogCategory ("الخدمات", moduleKey="catalog") + 6 CatalogService rows, distinct
    names/prices/durations from RK's own real services
  - BarberService assignments (every barber offers every service -- simplest real case)

Usage:
    python scripts/seed_alzabt_demo_tenant.py              # preview only
    python scripts/seed_alzabt_demo_tenant.py --execute    # actually write
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

SLUG = "alzabt-demo"
CLIENT_PHONE = "+9613300779911"
CLIENT_WHATSAPP = "96170000000"  # clearly a placeholder pattern, not a real production number
PRIMARY_COLOR = "#2F4F4F"        # same professional dark-slate tone as RK's own real choice --
                                  # this is the tenant's OWN primary_color (Two Distinct Brand
                                  # Layers, Alzabt Master Product Plan Section A) -- unrelated to
                                  # the Alzabt marketing brand's own violet, which never applies
                                  # to tenant-rendered pages like this one.
ADMIN_EMAIL = "admin@alzabt-demo.local"
ADMIN_PASSWORD = "AlzabtDemo123!"

BARBERS = [
    {"name": "كريم", "hours": {"open_time": "09:00", "close_time": "20:00", "closed_days": []}},
    {"name": "طارق", "hours": {"open_time": "10:00", "close_time": "19:00", "closed_days": ["friday"]}},
]

# Distinct names/prices/durations from RK's own real services (confirmed via a live read of RK's
# real CatalogService rows) -- same realistic barbershop *shape*, independently authored data.
SERVICES = [
    {"name_ar": "شعر",           "name_en": "Haircut",           "duration_min": 20, "price": 8.0},
    {"name_ar": "لحية",          "name_en": "Beard Trim",        "duration_min": 15, "price": 6.0},
    {"name_ar": "شعر ولحية",     "name_en": "Haircut & Beard",   "duration_min": 30, "price": 12.0},
    {"name_ar": "كرياتين",       "name_en": "Keratin Treatment", "duration_min": 75, "price": 25.0},
    {"name_ar": "تصفيف",         "name_en": "Styling",           "duration_min": 15, "price": 5.0},
    {"name_ar": "صبغة",          "name_en": "Hair Color",        "duration_min": 40, "price": 15.0},
]
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
            print(f"[PLAN] Create Client slug='{SLUG}', phone='{CLIENT_PHONE}', service_type='barbershop'")
            if execute:
                client = await db.client.create(data={
                    "name":          "Alzabt Demo Salon",
                    "name_ar":       "صالون عالزبط",
                    "name_en":       "Alzabt Demo Salon",
                    "slug":          SLUG,
                    "phone":         CLIENT_PHONE,
                    "whatsapp_number": CLIENT_WHATSAPP,
                    "primary_color": PRIMARY_COLOR,
                    "currency":      CURRENCY,
                    "status":        "active",
                    "service_type":  "barbershop",
                    "config":        Json({
                        "working_hours": {"open_time": "09:00", "close_time": "20:00", "closed_days": []},
                    }),
                    "features":      Json({"booking": True, "payment": False, "spatial": False, "listings": True}),
                    "payment_methods": ["cash"],
                })
                print(f"[OK] Client created: {client.id}")
            else:
                client = None

        client_id = client.id if client else None

        # -- client_services: reservations + booking + whatsapp_ordering + catalog --------------
        for key in ("reservations", "booking", "whatsapp_ordering", "catalog"):
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

        # -- Barbers ------------------------------------------------------------------------------
        existing_barbers = []
        if client_id:
            existing_barbers = await db.barber.find_many(where={"clientId": client_id})
        created_barbers = list(existing_barbers)
        if existing_barbers:
            print(f"[OK] {len(existing_barbers)} barber(s) already exist -- reusing them.")
        else:
            for i, spec in enumerate(BARBERS):
                print(f"[PLAN] Create Barber '{spec['name']}', hours {spec['hours']}")
                if execute and client_id:
                    b = await db.barber.create(data={
                        "clientId": client_id, "name": spec["name"],
                        "workingHours": Json(spec["hours"]), "sortOrder": i,
                    })
                    created_barbers.append(b)
                    print(f"[OK] Barber created: {b.name} -> {b.id}")

        # -- CatalogCategory + 6 CatalogService rows (current model, not CatalogItem) ------------
        category = None
        if client_id:
            category = await db.catalogcategory.find_first(where={"clientId": client_id, "moduleKey": "catalog"})
        if category:
            print(f"[OK] CatalogCategory already exists: {category.id}")
        else:
            print("[PLAN] Create CatalogCategory 'الخدمات' (moduleKey='catalog')")
            if execute and client_id:
                category = await db.catalogcategory.create(data={
                    "clientId": client_id, "moduleKey": "catalog",
                    "nameAr": "الخدمات", "nameEn": "Services", "sortOrder": 0,
                })
                print(f"[OK] CatalogCategory created: {category.id}")

        category_id = category.id if category else None
        existing_services = []
        if client_id:
            existing_services = await db.catalogservice.find_many(where={"clientId": client_id})
        created_services = list(existing_services)
        if existing_services:
            print(f"[OK] {len(existing_services)} CatalogService row(s) already exist -- reusing them.")
        else:
            for i, spec in enumerate(SERVICES):
                print(f"[PLAN] Create CatalogService '{spec['name_ar']}' ({spec['duration_min']}min, {spec['price']} {CURRENCY})")
                if execute and client_id and category_id:
                    s = await db.catalogservice.create(data={
                        "clientId": client_id, "categoryId": category_id,
                        "nameAr": spec["name_ar"], "nameEn": spec["name_en"],
                        "durationMin": spec["duration_min"], "price": spec["price"], "currency": CURRENCY,
                        "isActive": True, "isFeatured": True, "sortOrder": i,
                    })
                    created_services.append(s)
                    print(f"[OK] CatalogService created: {s.nameAr} -> {s.id}")

        # -- BarberService: every barber offers every service (simplest real case) --------------
        if execute and created_barbers and created_services:
            for b in created_barbers:
                for s in created_services:
                    exists = await db.barberservice.find_first(where={"barberId": b.id, "serviceId": s.id})
                    if exists:
                        continue
                    await db.barberservice.create(data={
                        "clientId": client_id, "barberId": b.id, "serviceId": s.id,
                    })
            print(f"[OK] BarberService: {len(created_barbers)} barbers x {len(created_services)} services assigned")
        elif not execute:
            print(f"[PLAN] Assign every barber to every service ({len(BARBERS)} x {len(SERVICES)})")

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
                    "fullName": "Alzabt Demo Admin", "role": "TENANT_ADMIN",
                })
                print(f"[OK] TENANT_ADMIN user created: {admin_user.email}")

        if not execute:
            print("\n[DRY RUN] Pass --execute to apply these changes.")
            return

        print("\n--- Summary ---")
        print(f"client_id: {client_id}")
        print(f"slug: {SLUG}")
        print(f"public booking page: /{SLUG}/reserve")
        print(f"admin login: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        print("[DONE] 'alzabt-demo' tenant seeded -- isolated, fictional, independent of RK.")

    finally:
        await db.disconnect()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true", help="Actually apply changes (default: dry run)")
    args = parser.parse_args()
    asyncio.run(main(args.execute))
