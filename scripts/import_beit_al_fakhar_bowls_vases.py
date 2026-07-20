"""
One-time real-product import: 9 real photos supplied locally
(/home/musicmaster/Downloads/anas/"not main category"/) become 9 real CatalogItem
rows under the Bowls & Vases category for beit-al-fakhar, uploaded to the
documented storage convention: catalog/{category_id}/{item_id}/main.jpg.

Every source photo was viewed directly before writing this list — all 9 show
either small pomegranate/bottle-shaped vases or hand-painted footed bowls, none
show mugs (handled cups) or figurines. So all 9 go to Bowls & Vases; none are
split into Mugs or Decorative Figurines, since none of the supplied photos
actually depict those shapes. Mirrors import_beit_al_fakhar_plates.py's exact
pattern (honest generic naming, no fabricated price/description, idempotent).
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
CATEGORY_ID = "d7639eb2-7fac-42a1-960f-9d8266d2fab1"  # Bowls & Vases / أواني وفازات
SLUG = "beit-al-fakhar"
SOURCE_DIR = "/home/musicmaster/Downloads/anas/not main category"

# (filename, shape) — shape determined by actually viewing each photo, not guessed
ITEMS = [
    ("WhatsApp Image 2026-07-15 at 00.39.03.jpeg", "vase"),
    ("WhatsApp Image 2026-07-15 at 00.39.03 (1).jpeg", "vase"),
    ("WhatsApp Image 2026-07-15 at 00.39.04.jpeg", "vase"),
    ("WhatsApp Image 2026-07-15 at 00.40.15.jpeg", "bowl"),
    ("WhatsApp Image 2026-07-15 at 00.40.16.jpeg", "bowl"),
    ("WhatsApp Image 2026-07-15 at 00.40.17 (1).jpeg", "bowl"),
    ("WhatsApp Image 2026-07-15 at 00.40.27 (1).jpeg", "bowl"),
    ("WhatsApp Image 2026-07-15 at 00.40.27 (2).jpeg", "bowl"),
    ("WhatsApp Image 2026-07-15 at 00.40.33.jpeg", "bowl"),
]

NAME_AR = {"vase": "إناء فخاري مرسوم يدوياً رقم {n}", "bowl": "وعاء فخاري مرسوم يدوياً رقم {n}"}
NAME_EN = {"vase": "Hand-Painted Ceramic Vase #{n}", "bowl": "Hand-Painted Ceramic Bowl #{n}"}


async def main():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    await prisma_client.connect()

    existing = await prisma_client.catalogitem.find_many(
        where={"clientId": CLIENT_ID, "categoryId": CATEGORY_ID}
    )
    existing_sort_orders = {i.sortOrder for i in existing}

    for i, (filename, shape) in enumerate(ITEMS, start=1):
        if i in existing_sort_orders:
            print(f"[{i}/{len(ITEMS)}] already exists, skipping create")
            continue
        item = await prisma_client.catalogitem.create(
            data={
                "clientId": CLIENT_ID,
                "categoryId": CATEGORY_ID,
                "nameAr": NAME_AR[shape].format(n=i),
                "nameEn": NAME_EN[shape].format(n=i),
                "currency": "USD",
                "isActive": True,
                "isFeatured": False,
                "sortOrder": i,
            }
        )
        print(f"[{i}/{len(ITEMS)}] created CatalogItem {item.id} ({shape})")

    items = await prisma_client.catalogitem.find_many(
        where={"clientId": CLIENT_ID, "categoryId": CATEGORY_ID}
    )
    pending = [i for i in items if i.imageUrl is None]
    filenames_by_sort = {i: f for i, (f, _shape) in enumerate(ITEMS, start=1)}

    for item in sorted(pending, key=lambda x: x.sortOrder):
        filename = filenames_by_sort[item.sortOrder]
        local_path = os.path.join(SOURCE_DIR, filename)
        with open(local_path, "rb") as f:
            data = f.read()
        new_path = f"{SLUG}/catalog/{CATEGORY_ID}/{item.id}/main.jpg"
        sb.storage.from_(BUCKET).upload(new_path, data, {"content-type": "image/jpeg", "upsert": "true"})
        dl = sb.storage.from_(BUCKET).download(new_path)
        if len(dl) != len(data):
            raise RuntimeError(f"Size mismatch for {new_path}")
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{new_path}"
        await prisma_client.catalogitem.update(where={"id": item.id}, data={"imageUrl": public_url})
        print(f"[sort={item.sortOrder}] uploaded {filename} -> {new_path} ({len(data)} bytes)")

    items2 = await prisma_client.catalogitem.find_many(
        where={"clientId": CLIENT_ID, "categoryId": CATEGORY_ID}
    )
    still_pending = [i for i in items2 if i.imageUrl is None]
    print(f"\n{len(items2)} total items in Bowls & Vases, {len(still_pending)} still pending.")

    await prisma_client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
