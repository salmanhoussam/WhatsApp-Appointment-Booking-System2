"""
One-time Tenant Identity Migration: anas -> beit-al-fakhar.

Renames the "anas" tenant (Client.slug/name/name_ar/name_en) to "beit-al-fakhar"
("Beit Al-Fakhar" / "بيت الفخار"), moves its branding assets (category banners,
gallery photos, hero video) from the anas/ storage prefix to beit-al-fakhar/,
and updates the 4 CatalogCategory.imageUrl rows to match.

Run once. Idempotent guard: if slug 'anas' no longer exists, the client rename
step is skipped (already migrated); storage move steps re-verify before deleting
originals, so a partial re-run will not lose data.

Pre-migration snapshot: /tmp/baf_migration/pre_migration_snapshot.json (not
committed — outside the repo, per feedback-migration-staging-discipline).
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
OLD_SLUG = "anas"
NEW_SLUG = "beit-al-fakhar"

BRANDING_FILES = [
    "special/categories/bowls-vases.png",
    "special/categories/figurines.png",
    "special/categories/mugs.png",
    "special/categories/plates.png",
    "special/gallery/01-entrance.jpg",
    "special/gallery/02-vases-wide.jpg",
    "special/gallery/03-plates-detail.jpg",
    "special/gallery/04-plates-wall.jpg",
    "special/gallery/05-figurine-table.jpg",
    "special/gallery/06-bowls-shelves.jpg",
    "special/hero/WhatsApp Video 2026-07-13 at 16.31.24.mp4",
]

CATEGORY_BANNER_MAP = {
    "641fb6cb-ee16-43cd-9ccc-f4b750f39011": "plates.png",
    "d7639eb2-7fac-42a1-960f-9d8266d2fab1": "bowls-vases.png",
    "96bd1ece-69f7-4949-837a-fa59a4266e51": "mugs.png",
    "88616325-54cb-4ed1-bcad-6ad51b633ec5": "figurines.png",
}


async def main():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    await prisma_client.connect()

    client = await prisma_client.client.find_unique(where={"slug": OLD_SLUG})
    if client is None:
        print(f"No client with slug='{OLD_SLUG}' — rename step already applied, skipping.")
    else:
        updated = await prisma_client.client.update(
            where={"slug": OLD_SLUG},
            data={
                "slug": NEW_SLUG,
                "name": "Beit Al-Fakhar",
                "name_ar": "بيت الفخار",
                "name_en": "Beit Al-Fakhar",
            },
        )
        print(f"Renamed client {updated.id}: {OLD_SLUG} -> {updated.slug}")

    moved = []
    for rel in BRANDING_FILES:
        old_path = f"{OLD_SLUG}/{rel}"
        new_path = f"{NEW_SLUG}/{rel}"
        try:
            data = sb.storage.from_(BUCKET).download(old_path)
        except Exception:
            print(f"skip (already moved or missing): {old_path}")
            continue
        ext = rel.rsplit(".", 1)[-1].lower()
        content_type = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "mp4": "video/mp4"}.get(
            ext, "application/octet-stream"
        )
        sb.storage.from_(BUCKET).upload(new_path, data, {"content-type": content_type, "upsert": "true"})
        moved.append((old_path, new_path, len(data)))
        print(f"copied: {old_path} -> {new_path} ({len(data)} bytes)")

    verify_ok = True
    for old_path, new_path, expected_size in moved:
        dl = sb.storage.from_(BUCKET).download(new_path)
        if len(dl) != expected_size:
            print(f"MISMATCH: {new_path} expected {expected_size}, got {len(dl)}")
            verify_ok = False

    if moved and verify_ok:
        sb.storage.from_(BUCKET).remove([m[0] for m in moved])
        print(f"Deleted {len(moved)} old branding objects under {OLD_SLUG}/")

    base = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{NEW_SLUG}/special/categories"
    for category_id, filename in CATEGORY_BANNER_MAP.items():
        updated = await prisma_client.catalogcategory.update(
            where={"id": category_id}, data={"imageUrl": f"{base}/{filename}"}
        )
        print(f"category {updated.nameAr}: imageUrl -> {updated.imageUrl}")

    await prisma_client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
