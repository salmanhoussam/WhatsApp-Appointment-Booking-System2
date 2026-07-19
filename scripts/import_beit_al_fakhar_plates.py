"""
One-time real-product import: the 25 real plate photos the shop owner uploaded
to properties/anas/catalog/Plates/ (flat folder, pre-Identity-Migration path)
become 25 real CatalogItem rows under the Plates category, with each photo
moved into the documented storage convention: catalog/{category_id}/{item_id}/main.jpg.

No fabricated data: nameAr/nameEn are honest, factual, non-marketing labels
("Hand-Painted Ceramic Plate #N") since no real per-item names were supplied.
price/descriptionAr/descriptionEn are left null — not invented. The shop owner
can fill these in later via the admin dashboard.

Idempotent guard: re-running only processes CatalogItem rows with imageUrl IS NULL
under this category; already-imported items are skipped.
"""

import asyncio
import os

from dotenv import load_dotenv

load_dotenv()

from supabase import create_client

from app.db.client import prisma_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
BUCKET = "properties"

CLIENT_ID = "10e5cecd-0b6f-4041-91b6-e0f22ff8c5a6"
CATEGORY_ID = "641fb6cb-ee16-43cd-9ccc-f4b750f39011"  # Plates / أطباق
OLD_PREFIX = "anas/catalog/Plates"
NEW_SLUG = "beit-al-fakhar"

FILENAMES = sorted(
    [
        "WhatsApp Image 2026-07-15 at 00.39.04 (1).jpeg",
        "WhatsApp Image 2026-07-15 at 00.39.05 (1).jpeg",
        "WhatsApp Image 2026-07-15 at 00.39.05.jpeg",
        "WhatsApp Image 2026-07-15 at 00.39.06 (1).jpeg",
        "WhatsApp Image 2026-07-15 at 00.39.06.jpeg",
        "WhatsApp Image 2026-07-15 at 00.39.10.jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.17.jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.18 (1).jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.18 (2).jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.18 (3).jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.18.jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.27.jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.29 (1).jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.29.jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.30 (1).jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.30.jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.47.jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.48 (1).jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.48 (2).jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.48.jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.49 (1).jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.49.jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.51.jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.52.jpeg",
        "WhatsApp Image 2026-07-15 at 00.40.53.jpeg",
    ]
)


async def main():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    await prisma_client.connect()

    existing = await prisma_client.catalogitem.find_many(where={"clientId": CLIENT_ID, "categoryId": CATEGORY_ID})
    existing_sort_orders = {i.sortOrder for i in existing}

    created = []
    for i, filename in enumerate(FILENAMES, start=1):
        if i in existing_sort_orders:
            print(f"[{i}/25] already exists, skipping create")
            continue
        item = await prisma_client.catalogitem.create(
            data={
                "clientId": CLIENT_ID,
                "categoryId": CATEGORY_ID,
                "nameAr": f"طبق فخار مرسوم يدوياً رقم {i}",
                "nameEn": f"Hand-Painted Ceramic Plate #{i}",
                "currency": "USD",
                "isActive": True,
                "isFeatured": False,
                "sortOrder": i,
            }
        )
        created.append((item.id, filename, i))
        print(f"[{i}/25] created CatalogItem {item.id}")

    items = await prisma_client.catalogitem.find_many(where={"clientId": CLIENT_ID, "categoryId": CATEGORY_ID})
    pending = [i for i in items if i.imageUrl is None]
    filenames_by_sort = {i: f for i, f in enumerate(FILENAMES, start=1)}

    for item in sorted(pending, key=lambda x: x.sortOrder):
        filename = filenames_by_sort[item.sortOrder]
        old_path = f"{OLD_PREFIX}/{filename}"
        new_path = f"{NEW_SLUG}/catalog/{CATEGORY_ID}/{item.id}/main.jpg"
        data = sb.storage.from_(BUCKET).download(old_path)
        sb.storage.from_(BUCKET).upload(new_path, data, {"content-type": "image/jpeg", "upsert": "true"})
        dl = sb.storage.from_(BUCKET).download(new_path)
        if len(dl) != len(data):
            raise RuntimeError(f"Size mismatch for {new_path}")
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{new_path}"
        await prisma_client.catalogitem.update(where={"id": item.id}, data={"imageUrl": public_url})
        print(f"[sort={item.sortOrder}] moved {filename} -> {new_path} ({len(data)} bytes)")

    items2 = await prisma_client.catalogitem.find_many(where={"clientId": CLIENT_ID, "categoryId": CATEGORY_ID})
    still_pending = [i for i in items2 if i.imageUrl is None]
    print(f"\n{len(items2)} total items, {len(still_pending)} still pending.")

    if not still_pending:
        old_paths = [f"{OLD_PREFIX}/{f}" for f in FILENAMES]
        try:
            res = sb.storage.from_(BUCKET).remove(old_paths)
            print("Deleted old Plates/ originals:", len(res) if res else 0)
        except Exception as e:
            print(f"Old originals already gone or error deleting (non-fatal): {e}")

    await prisma_client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
