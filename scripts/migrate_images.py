#!/usr/bin/env python3
"""
migrate_images.py
=================
Transfers restaurant/store images from the OLD Supabase project (gdzthjcvzvhfpsvoxhbm)
to the NEW SalmanSaaS project storage (wefjghagwpkotrrdiqyi).

What it does:
  1. Finds all catalog_items in new DB that still have old image URLs
     (containing gdzthjcvzvhfpsvoxhbm.supabase.co)
  2. Downloads each image from old bucket
  3. Uploads to new bucket: properties/{slug}/catalog/{category_id}/{item_id}/main.jpg
  4. Updates catalog_items.image_url in new DB

Requirements:
  pip install supabase requests psycopg2-binary

Usage:
  export OLD_SUPABASE_URL="https://gdzthjcvzvhfpsvoxhbm.supabase.co"
  export OLD_SUPABASE_KEY="<service_role_key_from_old_project>"
  python scripts/migrate_images.py

  # Dry run (no writes):
  python scripts/migrate_images.py --dry-run

  # Only a specific tenant:
  python scripts/migrate_images.py --slug caracas
  python scripts/migrate_images.py --slug arizona
"""

import os
import sys
import argparse
import time
from pathlib import Path

import requests
import psycopg2
import psycopg2.extras

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

OLD_SUPABASE_URL = os.getenv("OLD_SUPABASE_URL", "https://gdzthjcvzvhfpsvoxhbm.supabase.co")
OLD_SUPABASE_KEY = os.getenv("OLD_SUPABASE_KEY", "")   # service_role key from old project

NEW_SUPABASE_URL = os.getenv("SUPABASE_URL", "https://wefjghagwpkotrrdiqyi.supabase.co")
NEW_SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")       # already in .env

# Direct DB URL for updates (avoids pgbouncer on port 5432)
NEW_DB_URL = os.getenv(
    "DIRECT_URL",
    "postgresql://postgres.wefjghagwpkotrrdiqyi:Houssam035715902@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
)

NEW_BUCKET = "properties"
OLD_HOST_FRAGMENT = "gdzthjcvzvhfpsvoxhbm.supabase.co"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def check_config():
    if not OLD_SUPABASE_KEY:
        print("\n❌  OLD_SUPABASE_KEY is not set.")
        print("    Get it from: https://supabase.com/dashboard/project/gdzthjcvzvhfpsvoxhbm")
        print("    Settings → API → service_role (secret)\n")
        print("    Then:  export OLD_SUPABASE_KEY='eyJ...'")
        sys.exit(1)
    if not NEW_SUPABASE_KEY:
        print("\n❌  SUPABASE_KEY is not set in environment or .env")
        sys.exit(1)


def storage_headers(key: str) -> dict:
    return {"Authorization": f"Bearer {key}", "apikey": key}


def download_image(url: str) -> bytes | None:
    """Download from old Supabase storage (or any public URL)."""
    try:
        r = requests.get(url, timeout=30)
        if r.status_code == 200:
            return r.content
        print(f"      ⚠️  HTTP {r.status_code} for {url}")
        return None
    except Exception as e:
        print(f"      ⚠️  Download error: {e}")
        return None


def upload_image(new_url: str, key: str, path: str, data: bytes, content_type: str = "image/jpeg") -> bool:
    """Upload to new Supabase storage bucket."""
    upload_url = f"{new_url}/storage/v1/object/{NEW_BUCKET}/{path}"
    headers = {
        **storage_headers(key),
        "Content-Type": content_type,
        "x-upsert": "true",   # overwrite if already exists
    }
    try:
        r = requests.post(upload_url, headers=headers, data=data, timeout=30)
        if r.status_code in (200, 201):
            return True
        print(f"      ⚠️  Upload HTTP {r.status_code}: {r.text[:200]}")
        return False
    except Exception as e:
        print(f"      ⚠️  Upload error: {e}")
        return False


def public_url(new_base: str, path: str) -> str:
    return f"{new_base}/storage/v1/object/public/{NEW_BUCKET}/{path}"


def guess_content_type(url: str) -> str:
    url_lower = url.lower()
    if ".png" in url_lower:
        return "image/png"
    if ".webp" in url_lower:
        return "image/webp"
    if ".gif" in url_lower:
        return "image/gif"
    return "image/jpeg"


# ---------------------------------------------------------------------------
# Main migration
# ---------------------------------------------------------------------------

def run(slug_filter: str | None, dry_run: bool):
    check_config()

    conn = psycopg2.connect(NEW_DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    conn.autocommit = False
    cur = conn.cursor()

    # 1. Find items with old image URLs
    query = """
        SELECT
            ci.id        AS item_id,
            ci.image_url AS old_url,
            ci.category_id,
            c.slug
        FROM catalog_items ci
        JOIN clients c ON c.id = ci.client_id
        WHERE ci.image_url LIKE %s
    """
    params = [f"%{OLD_HOST_FRAGMENT}%"]

    if slug_filter:
        query += " AND c.slug = %s"
        params.append(slug_filter)

    query += " ORDER BY c.slug, ci.id"
    cur.execute(query, params)
    items = cur.fetchall()

    print(f"\nFound {len(items)} item(s) with old image URLs", end="")
    if slug_filter:
        print(f" (slug={slug_filter})", end="")
    print(".\n")

    if not items:
        print("✅  Nothing to migrate — all image_urls already point to new storage.")
        conn.close()
        return

    ok = fail = skip = 0

    for row in items:
        item_id   = str(row["item_id"])
        cat_id    = str(row["category_id"])
        slug      = row["slug"]
        old_url   = row["old_url"]

        # Build new path:  {slug}/catalog/{category_id}/{item_id}/main.jpg
        ext        = "." + old_url.rsplit(".", 1)[-1].split("?")[0] if "." in old_url.rsplit("/", 1)[-1] else ".jpg"
        new_path   = f"{slug}/catalog/{cat_id}/{item_id}/main{ext}"
        new_img_url = public_url(NEW_SUPABASE_URL, new_path)

        print(f"  [{slug}] item={item_id[:8]}...")
        print(f"    OLD: {old_url}")
        print(f"    NEW: {new_img_url}")

        if dry_run:
            print(f"    [dry-run] Skipping download/upload")
            skip += 1
            continue

        # Download
        data = download_image(old_url)
        if data is None:
            fail += 1
            print(f"    ❌  Download failed — keeping old URL")
            continue

        # Upload
        content_type = guess_content_type(old_url)
        uploaded = upload_image(NEW_SUPABASE_URL, NEW_SUPABASE_KEY, new_path, data, content_type)
        if not uploaded:
            fail += 1
            print(f"    ❌  Upload failed — keeping old URL")
            continue

        # Update DB
        cur.execute(
            "UPDATE catalog_items SET image_url = %s WHERE id = %s::uuid",
            (new_img_url, item_id)
        )
        ok += 1
        print(f"    ✅  Migrated ({len(data)/1024:.1f} KB)")

        # Polite rate limiting
        time.sleep(0.1)

    print(f"\n{'='*50}")
    if dry_run:
        print(f"[dry-run] Would migrate {len(items)} images.")
        conn.rollback()
    else:
        conn.commit()
        print(f"✅  Done — migrated: {ok} | failed: {fail}")
        if fail:
            print(f"    ⚠️  {fail} images failed — their old URLs are still in the DB.")
            print(f"       Re-run to retry (the script only processes old-URL items).")

    conn.close()


# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate catalog images from old Supabase to new")
    parser.add_argument("--dry-run", action="store_true", help="Print plan without writing")
    parser.add_argument("--slug",    help="Only migrate images for this tenant slug")
    args = parser.parse_args()

    run(slug_filter=args.slug, dry_run=args.dry_run)
