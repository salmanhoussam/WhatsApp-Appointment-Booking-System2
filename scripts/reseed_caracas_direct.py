#!/usr/bin/env python3
"""
Direct-DB re-seed for Caracas catalog.
Clears existing CatalogCategory + CatalogItem rows for caracas, then re-seeds
from scripts/data/caracas/categories.json + items.json.

Run: python scripts/reseed_caracas_direct.py
"""
import asyncio
import json
import os
import sys
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv
load_dotenv()

from prisma import Json, Prisma

DATA_DIR = Path(__file__).parent / "data" / "caracas"


async def main() -> None:
    db = Prisma(datasource={"url": os.environ["DIRECT_URL"]})
    await db.connect()

    # ── Find caracas client ───────────────────────────────────────────────────
    client = await db.client.find_unique(where={"slug": "caracas"})
    if not client:
        print("❌ Client 'caracas' not found. Run seed_unified_clients.py first.")
        await db.disconnect()
        sys.exit(1)
    print(f"✅ Found client: {client.name_en} (id={client.id})")

    # ── Clear existing data ───────────────────────────────────────────────────
    print("\n[1/4] Deleting existing CatalogItem rows for caracas...")
    deleted_items = await db.catalogitem.delete_many(where={"clientId": client.id})
    print(f"      Deleted {deleted_items} items")

    print("[2/4] Deleting existing CatalogCategory rows for caracas...")
    deleted_cats = await db.catalogcategory.delete_many(where={"clientId": client.id})
    print(f"      Deleted {deleted_cats} categories")

    # ── Seed categories ───────────────────────────────────────────────────────
    cats_raw = json.loads((DATA_DIR / "categories.json").read_text(encoding="utf-8"))
    print(f"\n[3/4] Seeding {len(cats_raw)} categories...")

    name_to_id: dict[str, str] = {}
    for cat in cats_raw:
        created = await db.catalogcategory.create(data={
            "id":              cat["id"],
            "clientId":        client.id,
            "nameAr":          cat.get("name_ar", ""),
            "nameEn":          cat.get("name_en", ""),
            "sortOrder":       cat.get("sort_order", 0),
            "displayTemplate": cat.get("display_template", "list"),
            "imageUrl":        cat.get("image_url"),
            "isActive":        True,
        })
        name_to_id[cat["name_en"]] = created.id
        print(f"      ✓ {cat['name_en']}")

    # ── Seed items ────────────────────────────────────────────────────────────
    items_raw = json.loads((DATA_DIR / "items.json").read_text(encoding="utf-8"))
    print(f"\n[4/4] Seeding {len(items_raw)} items...")

    ok = skip = 0
    for item in items_raw:
        cat_name = item.get("category", "")
        cat_id = name_to_id.get(cat_name)
        if not cat_id:
            print(f"      ⚠️  Unknown category '{cat_name}' — skipping '{item.get('name_en')}'")
            skip += 1
            continue

        raw_meta = item.get("metadata") or {}
        await db.catalogitem.create(data={
            "id":         item["id"],
            "clientId":   client.id,
            "categoryId": cat_id,
            "nameAr":     item.get("name_ar", ""),
            "nameEn":     item.get("name_en", ""),
            "price":      Decimal(str(item.get("price") or 0)),
            "currency":   item.get("currency", "$"),
            "imageUrl":   item.get("image_url"),
            "isActive":   item.get("is_available", True),
            "metadata":   Json(raw_meta),
        })
        ok += 1

    await db.disconnect()
    print(f"\n✅ Done — {ok} items seeded, {skip} skipped")
    print(f"   {len(cats_raw)} categories / {ok} items for caracas")


if __name__ == "__main__":
    asyncio.run(main())
