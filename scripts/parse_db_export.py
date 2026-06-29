#!/usr/bin/env python3
"""
SalmanSaaS DB Export Parser
============================
Converts raw Supabase DB export JSON files into organized
  scripts/data/{slug}/categories.json
  scripts/data/{slug}/items.json

Supported export files:
  --cats-file   categories_rows.json       (old Multi-Cafe-Saas)
  --items-file  menu_items_rows.json       (old Multi-Cafe-Saas)
  --store-cats  store_categories_rows.json (old Multy_store)

Filters by restaurant_id or client_slug.

Usage:
  # Parse Caracas restaurant from old Multi-Cafe-Saas export:
  python scripts/parse_db_export.py \\
      --tenant caracas \\
      --restaurant-id d00397c4-0c0c-430c-88ac-d610dd5cb4be \\
      --cats-file  ~/Downloads/categories_rows.json \\
      --items-file ~/Downloads/menu_items_rows.json

  # Parse Footlab store categories from old Multy_store export:
  python scripts/parse_db_export.py \\
      --tenant footlab \\
      --client-slug footlab \\
      --store-cats ~/Downloads/store_categories_rows.json

  # Dry run (print what would be written, no files created):
  python scripts/parse_db_export.py ... --dry-run
"""

import argparse
import json
import os
import sys
from pathlib import Path

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).parent
DATA_DIR   = SCRIPT_DIR / "data"


def fix_arabic(s: str) -> str:
    """Fix mojibake: UTF-8 bytes stored as Latin-1."""
    if not s:
        return s
    try:
        return s.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def load(path: str) -> list:
    p = Path(path).expanduser()
    if not p.exists():
        print(f"File not found: {p}")
        sys.exit(1)
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save(path: Path, data, dry_run: bool) -> None:
    if dry_run:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  Written: {path}")


# ---- Restaurant parser (Multi-Cafe-Saas schema) ------------------------------

def parse_restaurant(
    tenant: str,
    restaurant_id: str,
    cats_file: str,
    items_file: str,
    dry_run: bool,
    merge: bool,
):
    print(f"\nParsing restaurant '{tenant}' (restaurant_id={restaurant_id[:8]}...)")

    raw_cats  = load(cats_file)
    raw_items = load(items_file)

    # Filter to this restaurant
    my_cats  = [c for c in raw_cats  if c.get("restaurant_id") == restaurant_id]
    my_items = [i for i in raw_items if i.get("restaurant_id") == restaurant_id]

    print(f"  Found {len(my_cats)} categories, {len(my_items)} items")

    # Build categories.json
    categories = []
    for cat in sorted(my_cats, key=lambda c: c.get("sort_order", 0)):
        name_ar = fix_arabic(cat.get("name_ar") or "")
        name_en = cat.get("name_en") or name_ar
        categories.append({
            "id":               None,
            "old_id":           cat["id"],
            "name_ar":          name_ar,
            "name_en":          name_en,
            "sort_order":       cat.get("sort_order", 0),
            "display_template": "list",
            "image_url":        cat.get("image_url"),
        })

    # Map old category id -> name_en (for item linking)
    cat_map = {c["id"]: (fix_arabic(c.get("name_ar") or ""), c.get("name_en") or "") for c in my_cats}

    # Build items.json
    items = []
    for item in my_items:
        cat_id   = item.get("category_id", "")
        cat_info = cat_map.get(cat_id, ("", ""))
        cat_en   = cat_info[1] or cat_info[0]

        name_ar = fix_arabic(item.get("name_ar") or "")
        name_en = item.get("name_en") or name_ar

        raw_price = item.get("price", "0")
        try:
            price = float(raw_price)
        except (TypeError, ValueError):
            price = None

        # "اسعار يومية" = daily prices -> store as null
        currency = item.get("currency", "$")
        daily = currency not in ("$", "USD", "LBP", "EUR") or price == 0.0
        if daily:
            price    = None
            currency = "$"

        items.append({
            "id":           None,
            "old_id":       item["id"],
            "category":     cat_en,
            "name_ar":      name_ar,
            "name_en":      name_en,
            "description_ar": fix_arabic(item.get("description_ar") or "") or None,
            "description_en": item.get("description_en") or None,
            "price":        price,
            "currency":     currency,
            "image_url":    item.get("image_url"),
            "is_available": item.get("is_available", True),
            "metadata":     {"daily_price": True} if (raw_price and float(raw_price) == 0 and "يومي" in item.get("currency","")) else {},
        })

    _write_output(tenant, categories, items, dry_run, merge)


# ---- Store parser (Multy_store schema) ---------------------------------------

def parse_store(
    tenant: str,
    client_slug: str,
    store_cats_file: str,
    dry_run: bool,
    merge: bool,
):
    print(f"\nParsing store '{tenant}' (client_slug={client_slug})")

    raw_cats = load(store_cats_file)
    my_cats  = [c for c in raw_cats if c.get("client_slug") == client_slug]

    print(f"  Found {len(my_cats)} store categories")
    print(f"  Note: products need a separate StoreProduct export (not included)")

    categories = []
    for cat in sorted(my_cats, key=lambda c: c.get("sort_order", 0)):
        name = cat.get("name") or ""
        categories.append({
            "id":               None,
            "old_id":           cat["id"],
            "name_ar":          name,
            "name_en":          name,
            "sort_order":       cat.get("sort_order", 0),
            "display_template": "grid",
            "image_url":        cat.get("image_url") or cat.get("imageUrl"),
        })

    _write_output(tenant, categories, [], dry_run, merge)


# ---- Output ------------------------------------------------------------------

def _write_output(
    tenant: str,
    categories: list,
    items: list,
    dry_run: bool,
    merge: bool,
):
    out_dir   = DATA_DIR / tenant
    cats_path  = out_dir / "categories.json"
    items_path = out_dir / "items.json"

    if merge and cats_path.exists() and not dry_run:
        # Merge: preserve existing IDs matched by old_id
        existing_cats = json.loads(cats_path.read_text(encoding="utf-8"))
        id_by_old = {c["old_id"]: c.get("id") for c in existing_cats if c.get("old_id")}
        for cat in categories:
            if cat["old_id"] in id_by_old:
                cat["id"] = id_by_old[cat["old_id"]]
        print(f"  Merge: preserved {sum(1 for c in categories if c.get('id'))} existing category IDs")

    if merge and items_path.exists() and not dry_run and items:
        existing_items = json.loads(items_path.read_text(encoding="utf-8"))
        id_by_old = {i["old_id"]: i.get("id") for i in existing_items if i.get("old_id")}
        for item in items:
            if item["old_id"] in id_by_old:
                item["id"] = id_by_old[item["old_id"]]

    print(f"\n  Categories: {len(categories)}")
    print(f"  Items     : {len(items)}")

    if dry_run:
        print("\n-- categories.json preview --")
        save(cats_path, categories, dry_run=True)
        if items:
            print("\n-- items.json preview (first 5) --")
            save(items_path, items[:5], dry_run=True)
        return

    save(cats_path, categories, dry_run=False)
    if items:
        save(items_path, items, dry_run=False)
    print(f"\nDone. Edit data/{tenant}/categories.json and items.json then run seed_catalog.py")


# ---- CLI ---------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Parse raw DB export into slug data folders")
    parser.add_argument("--tenant",        required=True, help="Target tenant slug (e.g. caracas)")
    parser.add_argument("--restaurant-id", dest="restaurant_id", help="Filter by restaurant_id (Multi-Cafe-Saas)")
    parser.add_argument("--client-slug",   dest="client_slug",   help="Filter by client_slug (Multy_store)")
    parser.add_argument("--cats-file",     dest="cats_file",   help="categories_rows.json path")
    parser.add_argument("--items-file",    dest="items_file",  help="menu_items_rows.json path")
    parser.add_argument("--store-cats",    dest="store_cats",  help="store_categories_rows.json path")
    parser.add_argument("--dry-run",  action="store_true", help="Print output, no file writes")
    parser.add_argument("--merge",    action="store_true", help="Merge: preserve existing IDs from current data files")
    args = parser.parse_args()

    if args.restaurant_id:
        if not args.cats_file or not args.items_file:
            parser.error("--cats-file and --items-file required with --restaurant-id")
        parse_restaurant(
            tenant=args.tenant,
            restaurant_id=args.restaurant_id,
            cats_file=args.cats_file,
            items_file=args.items_file,
            dry_run=args.dry_run,
            merge=args.merge,
        )
    elif args.client_slug:
        if not args.store_cats:
            parser.error("--store-cats required with --client-slug")
        parse_store(
            tenant=args.tenant,
            client_slug=args.client_slug,
            store_cats_file=args.store_cats,
            dry_run=args.dry_run,
            merge=args.merge,
        )
    else:
        parser.error("Provide either --restaurant-id or --client-slug")


if __name__ == "__main__":
    main()
