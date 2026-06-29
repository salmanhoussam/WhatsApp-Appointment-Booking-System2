#!/usr/bin/env python3
"""
SalmanSaaS — Phase 54: Database Unification
============================================
Migrates any remaining data from legacy tables in the SalmanSaaS DB into
the unified catalog tables, then drops the legacy tables.

Legacy tables targeted:
  menu_categories  →  catalog_categories (module_key='restaurant')
  menu_items       →  catalog_items
  store_categories →  catalog_categories (module_key='store')

This script is IDEMPOTENT — safe to run multiple times.
All inserts use ON CONFLICT DO NOTHING.
Legacy tables are dropped only after verifying all rows migrated.

Usage:
  python scripts/unify_database.py            # full run
  python scripts/unify_database.py --dry-run  # print plan, no writes
  python scripts/unify_database.py --skip-drop # migrate only, keep old tables

Requires: pip install psycopg2-binary python-dotenv
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone

# Load .env automatically if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import psycopg2
import psycopg2.extras

# ── Config ─────────────────────────────────────────────────────────────────────
# Use DIRECT_URL (port 5432) — pgbouncer (6543) does not support DDL
DB_URL = os.getenv("DIRECT_URL") or os.getenv("DATABASE_URL", "").replace(":6543/", ":5432/")

if not DB_URL or "YOUR" in DB_URL:
    print("❌  Set DIRECT_URL in .env or environment before running this script.")
    sys.exit(1)

OLD_TABLES = ["menu_categories", "menu_items", "store_categories"]


# ── Helpers ────────────────────────────────────────────────────────────────────

def connect() -> psycopg2.extensions.connection:
    conn = psycopg2.connect(DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    conn.autocommit = False
    return conn


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def table_exists(cur, table_name: str) -> bool:
    cur.execute(
        "SELECT 1 FROM information_schema.tables "
        "WHERE table_schema = 'public' AND table_name = %s",
        (table_name,),
    )
    return cur.fetchone() is not None


def row_count(cur, table_name: str) -> int:
    cur.execute(f'SELECT COUNT(*) AS n FROM "{table_name}"')
    return cur.fetchone()["n"]


# ── menu_categories → catalog_categories ──────────────────────────────────────

def migrate_menu_categories(cur, dry_run: bool) -> int:
    if not table_exists(cur, "menu_categories"):
        print("   ⚡ menu_categories: table does not exist — already dropped.")
        return 0

    total = row_count(cur, "menu_categories")
    print(f"   menu_categories: {total} rows found")

    if dry_run or total == 0:
        return total

    cur.execute("""
        INSERT INTO catalog_categories
          (id, client_id, module_key,
           name_ar, name_en, image_url,
           sort_order, parent_id, display_template,
           is_active, created_at)
        SELECT
          mc.id,
          COALESCE(mc.client_id, rc.client_id)  AS client_id,
          'restaurant'                           AS module_key,
          COALESCE(mc.name_ar, mc.name, '')      AS name_ar,
          COALESCE(mc.name_en, mc.name_ar, '')   AS name_en,
          mc.image_url,
          COALESCE(mc.sort_order, 0)             AS sort_order,
          NULL                                   AS parent_id,
          'list'                                 AS display_template,
          COALESCE(mc.is_active, TRUE)           AS is_active,
          COALESCE(mc.created_at, NOW())         AS created_at
        FROM menu_categories mc
        LEFT JOIN restaurant_configs rc
          ON rc.id = mc.restaurant_id OR rc.client_id = mc.client_id
        ON CONFLICT (id) DO NOTHING
    """)
    inserted = cur.rowcount
    print(f"   ✅ menu_categories → catalog_categories: {inserted} inserted, {total - inserted} already existed")
    return inserted


# ── menu_items → catalog_items ─────────────────────────────────────────────────

def migrate_menu_items(cur, dry_run: bool) -> int:
    if not table_exists(cur, "menu_items"):
        print("   ⚡ menu_items: table does not exist — already dropped.")
        return 0

    total = row_count(cur, "menu_items")
    print(f"   menu_items: {total} rows found")

    if dry_run or total == 0:
        return total

    cur.execute("""
        INSERT INTO catalog_items
          (id, client_id, category_id,
           name_ar, name_en,
           description_ar, description_en,
           image_url, price, currency,
           is_active, is_featured,
           sort_order, metadata,
           created_at, updated_at)
        SELECT
          mi.id,
          COALESCE(mi.client_id, cc.client_id)        AS client_id,
          mi.category_id,
          COALESCE(mi.name_ar, mi.name, '')            AS name_ar,
          COALESCE(mi.name_en, mi.name_ar, '')         AS name_en,
          COALESCE(mi.description_ar, mi.description, '') AS description_ar,
          COALESCE(mi.description_en, '')              AS description_en,
          mi.image_url,
          mi.price,
          COALESCE(mi.currency, 'LBP')                AS currency,
          COALESCE(mi.is_available, mi.is_active, TRUE) AS is_active,
          FALSE                                         AS is_featured,
          COALESCE(mi.sort_order, 0)                   AS sort_order,
          '{}'::jsonb                                   AS metadata,
          COALESCE(mi.created_at, NOW())               AS created_at,
          COALESCE(mi.updated_at, mi.created_at, NOW()) AS updated_at
        FROM menu_items mi
        LEFT JOIN catalog_categories cc ON cc.id = mi.category_id
        ON CONFLICT (id) DO NOTHING
    """)
    inserted = cur.rowcount
    print(f"   ✅ menu_items → catalog_items: {inserted} inserted, {total - inserted} already existed")
    return inserted


# ── store_categories → catalog_categories ────────────────────────────────────

def migrate_store_categories(cur, dry_run: bool) -> int:
    if not table_exists(cur, "store_categories"):
        print("   ⚡ store_categories: table does not exist — already dropped.")
        return 0

    total = row_count(cur, "store_categories")
    print(f"   store_categories: {total} rows found")

    if dry_run or total == 0:
        return total

    cur.execute("""
        INSERT INTO catalog_categories
          (id, client_id, module_key,
           name_ar, name_en, image_url,
           sort_order, parent_id, display_template,
           is_active, created_at)
        SELECT
          sc.id,
          sc.client_id,
          'store'                                 AS module_key,
          COALESCE(sc.name, '')                   AS name_ar,
          COALESCE(sc.name_en, sc.name, '')        AS name_en,
          sc.image_url,
          COALESCE(sc.sort_order, 0)              AS sort_order,
          sc.parent_id,
          'grid'                                  AS display_template,
          TRUE                                    AS is_active,
          COALESCE(sc.created_at, NOW())          AS created_at
        FROM store_categories sc
        ON CONFLICT (id) DO NOTHING
    """)
    inserted = cur.rowcount
    print(f"   ✅ store_categories → catalog_categories: {inserted} inserted, {total - inserted} already existed")
    return inserted


# ── Drop legacy tables ─────────────────────────────────────────────────────────

def drop_legacy_tables(cur, dry_run: bool, skip_drop: bool):
    if skip_drop:
        print("\n   --skip-drop: leaving legacy tables in place.")
        return

    for tbl in OLD_TABLES:
        if not table_exists(cur, tbl):
            print(f"   ⚡ DROP {tbl}: already gone.")
            continue
        remaining = row_count(cur, tbl)
        if remaining > 0:
            print(f"   ⚠️  {tbl} still has {remaining} rows — migration may be incomplete. Skipping DROP.")
            continue
        if dry_run:
            print(f"   [dry-run] Would DROP TABLE {tbl} CASCADE")
            continue
        cur.execute(f'DROP TABLE IF EXISTS "{tbl}" CASCADE')
        print(f"   🗑️  Dropped: {tbl}")


# ── Verification ───────────────────────────────────────────────────────────────

def verify(cur):
    print("\n── Verification ─────────────────────────────────────────────────────")
    for tbl in ["catalog_categories", "catalog_items"]:
        cur.execute(f'SELECT COUNT(*) AS n FROM "{tbl}"')
        n = cur.fetchone()["n"]
        print(f"   {tbl}: {n} rows")

    for tbl in OLD_TABLES:
        exists = table_exists(cur, tbl)
        status = "⚠️  still present" if exists else "✅ dropped"
        print(f"   {tbl}: {status}")


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="SalmanSaaS Phase 54 — DB Unification")
    parser.add_argument("--dry-run",   action="store_true", help="Plan only, no writes")
    parser.add_argument("--skip-drop", action="store_true", help="Migrate data but keep old tables")
    args = parser.parse_args()

    print("=" * 60)
    print("  SalmanSaaS — Phase 54: Database Unification")
    print(f"  Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
    print("=" * 60)

    conn = connect()
    try:
        with conn.cursor() as cur:
            print("\n── Migrating data ───────────────────────────────────────────────")
            migrate_menu_categories(cur, args.dry_run)
            migrate_menu_items(cur, args.dry_run)
            migrate_store_categories(cur, args.dry_run)

            print("\n── Dropping legacy tables ───────────────────────────────────────")
            drop_legacy_tables(cur, args.dry_run, args.skip_drop)

            verify(cur)

        if not args.dry_run:
            conn.commit()
            print("\n✅ Phase 54 complete — all committed.")
        else:
            conn.rollback()
            print("\n[dry-run] No changes committed.")

    except Exception as exc:
        conn.rollback()
        print(f"\n❌ Script failed, rolled back.\n   {exc}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
