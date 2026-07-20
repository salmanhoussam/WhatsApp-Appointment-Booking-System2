"""
onboard_anas.py
One-time onboarding for the "anas" tenant (artisanal ceramics/pottery store).

Creates:
  - Client row (slug=anas, service_type=ecommerce)
  - User row (TENANT_ADMIN, so the shop owner can log into /anas/admin and add products)
  - ClientService rows (store module)
  - CatalogCategory rows (4 real categories from the shop video: plates, bowls & vases, mugs, figurines)
  - No CatalogItem rows yet — the owner adds real products himself via the admin dashboard.

Idempotent — safe to run multiple times (upsert by slug/email).

Usage:
  python scripts/onboard_anas.py
"""

import asyncio
import os
import secrets
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

from prisma import Prisma
from app.core.security import get_password_hash

SLUG = "anas"

CATEGORIES = [
    {
        "name_ar": "أطباق",
        "name_en": "Plates",
        "image_url": "https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/anas/special/categories/plates.png",
        "sort_order": 1,
    },
    {
        "name_ar": "أواني وفازات",
        "name_en": "Bowls & Vases",
        "image_url": "https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/anas/special/categories/bowls-vases.png",
        "sort_order": 2,
    },
    {
        "name_ar": "أكواب",
        "name_en": "Mugs",
        "image_url": "https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/anas/special/categories/mugs.png",
        "sort_order": 3,
    },
    {
        "name_ar": "تحف وديكور",
        "name_en": "Decorative Figurines",
        "image_url": "https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/anas/special/categories/figurines.png",
        "sort_order": 4,
    },
]


async def main():
    db = Prisma(datasource={"url": os.environ["DIRECT_URL"]})
    await db.connect()

    existing = await db.client.find_unique(where={"slug": SLUG})
    if existing:
        print(f"[{SLUG}] Client already exists — id: {existing.id}")
        client_id = existing.id
    else:
        client = await db.client.create(data={
            "slug": SLUG,
            "name": "Anas",
            "name_ar": "أنس للفخار",
            "name_en": "Anas Ceramics",
            "service_type": "ecommerce",
            "primary_color": "#C1683A",
            "currency": "USD",
            "status": "trial",
            "phone": f"TODO_PHONE_{SLUG}",
            "whatsapp_number": None,
            "isActive": True,
            "unit_types": [],
            "payment_methods": [],
        })
        client_id = client.id
        print(f"[{SLUG}] Client created — id: {client_id}")

    # -- ClientService: store module + catalog (public catalog API requires
    # the "catalog" key specifically, separate from "store") ---------------------
    for key in ["store", "store.products", "store.cart", "catalog"]:
        await db.clientservice.upsert(
            where={"clientId_serviceKey": {"clientId": client_id, "serviceKey": key}},
            data={
                "create": {"clientId": client_id, "serviceKey": key, "isActive": True},
                "update": {"isActive": True},
            },
        )
        print(f"  [{SLUG}] service seeded: {key}")

    # -- Admin User (TENANT_ADMIN) — so the owner can log into /anas/admin -------
    admin_email = f"admin@{SLUG}.salmansaas.com"
    existing_user = await db.user.find_unique(where={"email": admin_email})
    if existing_user:
        print(f"[{SLUG}] Admin user already exists — email: {admin_email}")
    else:
        generated_password = secrets.token_urlsafe(9)
        await db.user.create(data={
            "clientId": client_id,
            "email": admin_email,
            "password_hash": get_password_hash(generated_password),
            "fullName": "Anas",
            "role": "TENANT_ADMIN",
            "isActive": True,
        })
        print(f"[{SLUG}] Admin user created — email: {admin_email}")
        print(f"[{SLUG}] TEMPORARY PASSWORD (save this, shown once): {generated_password}")

    # -- Categories (real, from shop video — no items yet, owner adds via admin) --
    for cat in CATEGORIES:
        existing_cat = await db.catalogcategory.find_first(
            where={"clientId": client_id, "nameEn": cat["name_en"]}
        )
        if existing_cat:
            print(f"  [{SLUG}] category exists: {cat['name_ar']} ({existing_cat.id})")
            continue
        new_cat = await db.catalogcategory.create(data={
            "clientId": client_id,
            "moduleKey": "store",
            "nameAr": cat["name_ar"],
            "nameEn": cat["name_en"],
            "imageUrl": cat["image_url"],
            "sortOrder": cat["sort_order"],
            "displayTemplate": "grid",
            "isActive": True,
        })
        print(f"  [{SLUG}] category created: {cat['name_ar']} -> {new_cat.id}")

    await db.disconnect()
    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
