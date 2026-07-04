#!/usr/bin/env python3
"""
SalmanSaaS Catalog Migration
=============================
Sources:
  - Multi-Cafe-Saas DB: restaurants + categories + menu_items
    → catalog_categories / catalog_items  (module_key='restaurant')

  - Multy_store DB:     StoreCategory + StoreProduct
    → catalog_categories / catalog_items  (module_key='store')

Both source DBs live on the SAME Supabase project (gdzthjcvzvhfpsvoxhbm).
The target is the SalmanSaaS Supabase project.

Usage:
  Set the env vars below, then run:
    python scripts/migrate_catalog.py

  Or pass DB URLs directly:
    OLD_DB_URL="postgresql://..." NEW_DB_URL="postgresql://..." python scripts/migrate_catalog.py

  Optional flags:
    --dry-run          Print what would be inserted without writing to DB
    --only-restaurant  Migrate only caracas restaurant data
    --only-store       Migrate only footlab store data
"""

import os
import sys
import json
import argparse
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone

# ── Configuration ──────────────────────────────────────────────────────────────
# Old DB: the original Supabase project shared by Multi-Cafe-Saas + Multy_store
# Use the DIRECT URL (port 5432) for migrations — avoid pgbouncer

OLD_DB_URL = os.getenv(
    "OLD_DB_URL",
    "YOUR_OLD_DB_DIRECT_URL_HERE"   # ← replace or export OLD_DB_URL
)

# New DB: SalmanSaaS Supabase project — set your DIRECT_URL here
NEW_DB_URL = os.getenv(
    "NEW_DB_URL",
    "YOUR_NEW_DB_DIRECT_URL_HERE"   # ← replace or export NEW_DB_URL
)

# Old slugs (as stored in the old DBs)
OLD_RESTAURANT_SLUGS = os.getenv("OLD_RESTAURANT_SLUGS", "caracas,arizona").split(",")
OLD_STORE_SLUG       = os.getenv("OLD_STORE_SLUG",       "footlab")  # StoreCategory.clientSlug in old DB

# New slugs (as stored in the new clients table) — same as old slugs in this project
NEW_RESTAURANT_SLUGS = os.getenv("NEW_RESTAURANT_SLUGS", "caracas,arizona").split(",")
NEW_FOOTLAB_SLUG     = os.getenv("NEW_FOOTLAB_SLUG",     "footlab")


# ── DB helpers ─────────────────────────────────────────────────────────────────

def make_conn(url: str):
    conn = psycopg2.connect(url, cursor_factory=psycopg2.extras.RealDictCursor)
    conn.autocommit = False
    return conn


def lookup_client_id(new_cur, slug: str) -> str:
    new_cur.execute(
        "SELECT id FROM clients WHERE slug = %s LIMIT 1",
        (slug,)
    )
    row = new_cur.fetchone()
    if not row:
        raise SystemExit(
            f"\n❌ Client '{slug}' not found in new DB.\n"
            f"   Create it first via the super-admin endpoint:\n"
            f"   POST /api/v1/super/clients  {{ \"slug\": \"{slug}\", ... }}\n"
        )
    return str(row["id"])


def now_utc():
    return datetime.now(timezone.utc)


# ── Restaurant migration (Multi-Cafe-Saas → SalmanSaaS) ───────────────────────

def migrate_restaurant(old_cur, new_cur, old_slug: str, new_client_id: str, dry_run: bool):
    print(f"\n── Restaurant: '{old_slug}' ──────────────────────────────────────────")

    # 1. Find old restaurant by slug
    old_cur.execute(
        "SELECT id, name_ar, name_en FROM restaurants WHERE slug = %s LIMIT 1",
        (old_slug,)
    )
    rest = old_cur.fetchone()
    if not rest:
        print(f"   ⚠️  Restaurant '{old_slug}' not found in old DB — skipping.")
        return 0, 0
    restaurant_id = str(rest["id"])
    print(f"   Found: {rest['name_ar']} | restaurant_id = {restaurant_id}")

    # 2. Fetch categories
    old_cur.execute(
        "SELECT id, name_ar, name_en, image_url, sort_order, created_at "
        "FROM categories WHERE restaurant_id = %s ORDER BY sort_order",
        (restaurant_id,)
    )
    categories = old_cur.fetchall()
    print(f"   Categories to migrate: {len(categories)}")

    # 3. Fetch menu items
    old_cur.execute(
        "SELECT id, category_id, name_ar, name_en, description_ar, description_en, "
        "       image_url, price, currency, is_available, created_at "
        "FROM menu_items WHERE restaurant_id = %s",
        (restaurant_id,)
    )
    menu_items = old_cur.fetchall()
    print(f"   Menu items to migrate:  {len(menu_items)}")

    if dry_run:
        print("   [dry-run] Would insert the above — no DB writes.")
        return len(categories), len(menu_items)

    # 4. Insert catalog_categories
    cat_inserted = 0
    cat_skipped  = 0
    for cat in categories:
        new_cur.execute("""
            INSERT INTO catalog_categories
              (id, client_id, module_key, name_ar, name_en,
               image_url, sort_order, parent_id, display_template,
               is_active, created_at)
            VALUES (%s, %s, 'restaurant', %s, %s, %s, %s, NULL, 'list', TRUE, %s)
            ON CONFLICT (id) DO NOTHING
        """, (
            str(cat["id"]), new_client_id,
            cat["name_ar"] or "",
            cat["name_en"] or cat["name_ar"] or "",
            cat["image_url"],
            int(cat["sort_order"] or 0),
            cat["created_at"] or now_utc(),
        ))
        if new_cur.rowcount:
            cat_inserted += 1
        else:
            cat_skipped += 1

    # 5. Insert catalog_items
    item_inserted = 0
    item_skipped  = 0
    for item in menu_items:
        new_cur.execute("""
            INSERT INTO catalog_items
              (id, client_id, category_id, name_ar, name_en,
               description_ar, description_en, image_url,
               price, currency, is_featured, is_active,
               sort_order, metadata, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, FALSE, %s, 0, '{}', %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (
            str(item["id"]), new_client_id, str(item["category_id"]),
            item["name_ar"] or "",
            item["name_en"] or item["name_ar"] or "",
            item["description_ar"] or "",
            item["description_en"] or "",
            item["image_url"],
            float(item["price"]) if item["price"] is not None else None,
            item["currency"] or "LBP",
            bool(item["is_available"]) if item["is_available"] is not None else True,
            item["created_at"] or now_utc(),
            item["created_at"] or now_utc(),
        ))
        if new_cur.rowcount:
            item_inserted += 1
        else:
            item_skipped += 1

    print(f"   ✅ Categories — inserted: {cat_inserted}, already existed: {cat_skipped}")
    print(f"   ✅ Items      — inserted: {item_inserted}, already existed: {item_skipped}")
    return cat_inserted, item_inserted


# ── Store migration (Multy_store → SalmanSaaS) ────────────────────────────────

def migrate_store(old_cur, new_cur, old_slug: str, new_client_id: str, dry_run: bool):
    print(f"\n── Store: '{old_slug}' ───────────────────────────────────────────────")

    # 1. Fetch StoreCategory rows  (Postgres table name is quoted because Prisma kept PascalCase)
    old_cur.execute(
        'SELECT id, name, "imageUrl", "sortOrder", "parentId", "createdAt" '
        'FROM "StoreCategory" WHERE "clientSlug" = %s ORDER BY "sortOrder"',
        (old_slug,)
    )
    categories = old_cur.fetchall()
    print(f"   StoreCategories to migrate: {len(categories)}")

    valid_cat_ids = {str(cat["id"]) for cat in categories}

    # 2. Fetch StoreProduct rows
    old_cur.execute(
        'SELECT id, "categoryId", name, description, "imageUrl", images, '
        '       price, "compareAtPrice", "isFeatured", "isActive", '
        '       discount, variants, fabric, style_code, "brandId", "createdAt" '
        'FROM "StoreProduct" WHERE "clientSlug" = %s',
        (old_slug,)
    )
    products = old_cur.fetchall()
    print(f"   StoreProducts to migrate:   {len(products)}")

    if dry_run:
        no_cat = sum(1 for p in products if not p["categoryId"] or str(p["categoryId"]) not in valid_cat_ids)
        print(f"   [dry-run] Would skip {no_cat} product(s) with missing/null category.")
        print("   [dry-run] No DB writes.")
        return len(categories), len(products) - no_cat

    # 3. Insert catalog_categories
    cat_inserted = 0
    cat_skipped  = 0
    for cat in categories:
        parent_id = str(cat["parentId"]) if cat["parentId"] else None
        name = cat["name"] or ""

        new_cur.execute("""
            INSERT INTO catalog_categories
              (id, client_id, module_key, name_ar, name_en,
               image_url, sort_order, parent_id, display_template,
               is_active, created_at)
            VALUES (%s, %s, 'store', %s, %s, %s, %s, %s, 'grid', TRUE, %s)
            ON CONFLICT (id) DO NOTHING
        """, (
            str(cat["id"]), new_client_id,
            name, name,
            cat["imageUrl"],
            int(cat["sortOrder"] or 0),
            parent_id,
            cat["createdAt"] or now_utc(),
        ))
        if new_cur.rowcount:
            cat_inserted += 1
        else:
            cat_skipped += 1

    # 4. Insert catalog_items
    item_inserted = 0
    item_skipped  = 0
    item_no_cat   = 0

    for prod in products:
        cat_id = str(prod["categoryId"]) if prod["categoryId"] else None
        if not cat_id or cat_id not in valid_cat_ids:
            item_no_cat += 1
            continue

        # name: JSON {"ar": ..., "en": ...}  or plain string (fallback)
        raw_name = prod["name"]
        if isinstance(raw_name, str):
            try:
                raw_name = json.loads(raw_name)
            except Exception:
                raw_name = {"ar": raw_name, "en": raw_name}
        name_ar = (raw_name or {}).get("ar") or (raw_name or {}).get("en") or ""
        name_en = (raw_name or {}).get("en") or (raw_name or {}).get("ar") or ""

        # description: JSON {"ar": ..., "en": ...} or None
        raw_desc = prod["description"]
        if raw_desc and isinstance(raw_desc, str):
            try:
                raw_desc = json.loads(raw_desc)
            except Exception:
                raw_desc = {"ar": raw_desc, "en": raw_desc}
        desc_ar = (raw_desc or {}).get("ar") or ""
        desc_en = (raw_desc or {}).get("en") or ""

        # Pack store-specific fields into metadata
        variants = prod["variants"]
        if isinstance(variants, str):
            try:
                variants = json.loads(variants)
            except Exception:
                variants = []

        images = prod["images"]
        if isinstance(images, str):
            try:
                images = json.loads(images)
            except Exception:
                images = []

        metadata = {
            "brand_id":         str(prod["brandId"]) if prod["brandId"] else None,
            "discount":         int(prod["discount"] or 0),
            "compare_at_price": float(prod["compareAtPrice"]) if prod["compareAtPrice"] else None,
            "variants":         variants or [],
            "images":           images or [],
            "fabric":           prod["fabric"],
            "style_code":       prod["style_code"],
        }

        new_cur.execute("""
            INSERT INTO catalog_items
              (id, client_id, category_id, name_ar, name_en,
               description_ar, description_en, image_url,
               price, currency, is_featured, is_active,
               sort_order, metadata, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s,
                    %s, 'USD', %s, %s, 0, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (
            str(prod["id"]), new_client_id, cat_id,
            name_ar, name_en,
            desc_ar, desc_en,
            prod["imageUrl"],
            float(prod["price"]) if prod["price"] is not None else None,
            bool(prod["isFeatured"]),
            bool(prod["isActive"]),
            json.dumps(metadata),
            prod["createdAt"] or now_utc(),
            prod["createdAt"] or now_utc(),
        ))
        if new_cur.rowcount:
            item_inserted += 1
        else:
            item_skipped += 1

    print(f"   ✅ Categories — inserted: {cat_inserted}, already existed: {cat_skipped}")
    print(f"   ✅ Items      — inserted: {item_inserted}, already existed: {item_skipped}")
    if item_no_cat:
        print(f"   ⚠️  Skipped {item_no_cat} product(s) with missing/null category.")
    return cat_inserted, item_inserted


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Migrate old catalog data to SalmanSaaS")
    parser.add_argument("--dry-run",          action="store_true", help="Print plan without writing")
    parser.add_argument("--only-restaurant",  action="store_true", help="Only migrate restaurant data")
    parser.add_argument("--only-store",       action="store_true", help="Only migrate store data")
    args = parser.parse_args()

    do_restaurant = not args.only_store
    do_store      = not args.only_restaurant

    print("=" * 60)
    print("  SalmanSaaS Catalog Migration")
    if args.dry_run:
        print("  MODE: DRY RUN — no writes")
    print("=" * 60)

    if OLD_DB_URL == "YOUR_OLD_DB_DIRECT_URL_HERE":
        print("\n❌ OLD_DB_URL is not set.")
        print("   export OLD_DB_URL='postgresql://...'  (from old server .env files)\n")
        sys.exit(1)

    if NEW_DB_URL == "YOUR_NEW_DB_DIRECT_URL_HERE":
        print("\n❌ NEW_DB_URL is not set. Export it or edit the script.")
        print("   export NEW_DB_URL='postgresql://postgres:password@db.xxx.supabase.co:5432/postgres'\n")
        sys.exit(1)

    old_conn = make_conn(OLD_DB_URL)
    new_conn = make_conn(NEW_DB_URL)

    try:
        with old_conn.cursor() as old_cur, new_conn.cursor() as new_cur:

            # Resolve new client UUIDs
            print("\n── Resolving client IDs in new DB ───────────────────────────────")
            restaurant_client_ids = {}
            if do_restaurant:
                for slug in NEW_RESTAURANT_SLUGS:
                    cid = lookup_client_id(new_cur, slug)
                    restaurant_client_ids[slug] = cid
                    print(f"   {slug} -> {cid}")

            footlab_client_id = lookup_client_id(new_cur, NEW_FOOTLAB_SLUG) if do_store else None
            if footlab_client_id:
                print(f"   footlab -> {footlab_client_id}")

            # Run migrations
            if do_restaurant:
                for old_slug, new_slug in zip(OLD_RESTAURANT_SLUGS, NEW_RESTAURANT_SLUGS):
                    migrate_restaurant(old_cur, new_cur, old_slug, restaurant_client_ids[new_slug], args.dry_run)

            if do_store:
                migrate_store(old_cur, new_cur, OLD_STORE_SLUG, footlab_client_id, args.dry_run)

        if not args.dry_run:
            new_conn.commit()
            print("\n✅ All committed successfully.")
        else:
            new_conn.rollback()
            print("\n[dry-run] Rolled back — nothing written.")

    except Exception as exc:
        new_conn.rollback()
        print(f"\n❌ Migration failed, rolled back.\n   Error: {exc}")
        raise
    finally:
        old_conn.close()
        new_conn.close()


if __name__ == "__main__":
    main()
