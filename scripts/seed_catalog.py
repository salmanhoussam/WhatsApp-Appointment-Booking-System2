#!/usr/bin/env python3
"""
SalmanSaaS Tenant Catalog Seeder
==================================
Reads scripts/data/{slug}/categories.json + items.json and seeds them via Admin API.
After each successful POST the returned UUID is written back to the JSON files
(id field), so the file becomes the source of truth.

Items link to categories via the `category` field (English name).

Usage:
  python scripts/seed_catalog.py --tenant caracas --dry-run
  python scripts/seed_catalog.py --tenant caracas --email admin@caracas.com --password secret
  python scripts/seed_catalog.py --tenant footlab --email admin@footlab.com --password secret \\
      --super-email salman@salmansaas.com --super-password secret456

  --clear   Delete all existing categories before seeding
  --base    Custom API base URL (default: http://localhost:8000)
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    import requests
except ImportError:
    print("Missing 'requests'. Run: pip install requests")
    sys.exit(1)


# ---- Config ------------------------------------------------------------------

SCRIPT_DIR   = Path(__file__).parent
DATA_DIR     = SCRIPT_DIR / "data"
DEFAULT_BASE = os.getenv("API_BASE", "http://localhost:8000")

KNOWN_TENANTS = ["caracas", "footlab", "roz", "olivello"]


# ---- API helpers -------------------------------------------------------------

class ApiError(Exception):
    def __init__(self, status: int, detail: str):
        self.status = status
        self.detail = detail
        super().__init__(f"HTTP {status}: {detail}")


def _check(resp: requests.Response) -> dict:
    try:
        body = resp.json()
    except Exception:
        body = {"detail": resp.text}
    if not resp.ok:
        detail = body.get("detail") or body.get("error") or str(body)
        raise ApiError(resp.status_code, detail)
    return body


def login(base: str, email: str, password: str) -> str:
    resp = requests.post(
        f"{base}/api/v1/auth/users/login",
        json={"email": email, "password": password},
        timeout=15,
    )
    body = _check(resp)
    token = body.get("token") or body.get("access_token")
    if not token:
        raise ApiError(200, f"No token in login response: {body}")
    return token


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def get_client_id(base: str, super_token: str, slug: str) -> str:
    resp = requests.get(
        f"{base}/api/v1/super/clients",
        headers=auth_headers(super_token),
        timeout=15,
    )
    body = _check(resp)
    for c in (body.get("data") or body.get("clients") or []):
        if c.get("slug") == slug:
            return c["id"]
    raise ApiError(404, f"Client '{slug}' not found via super-admin.")


def activate_catalog_service(base: str, super_token: str, client_id: str) -> bool:
    resp = requests.patch(
        f"{base}/api/v1/super/clients/{client_id}/services",
        headers=auth_headers(super_token),
        json={"service_key": "catalog", "is_active": True},
        timeout=15,
    )
    if resp.status_code == 200:
        return True
    body = resp.json() if resp.content else {}
    detail = body.get("detail", "")
    if "already" in detail.lower() or resp.status_code == 409:
        return False
    raise ApiError(resp.status_code, detail)


def probe_catalog(base: str, token: str) -> int:
    resp = requests.get(
        f"{base}/api/v1/admin/catalog/categories",
        headers=auth_headers(token),
        timeout=30,
    )
    return resp.status_code


def delete_all_categories(base: str, token: str) -> int:
    resp = requests.get(
        f"{base}/api/v1/admin/catalog/categories",
        headers=auth_headers(token),
        timeout=15,
    )
    body = _check(resp)
    count = 0
    for cat in body.get("data", []):
        requests.delete(
            f"{base}/api/v1/admin/catalog/categories/{cat['id']}",
            headers=auth_headers(token),
            timeout=15,
        )
        count += 1
    return count


def create_category(base: str, token: str, payload: dict) -> str:
    resp = requests.post(
        f"{base}/api/v1/admin/catalog/categories",
        headers=auth_headers(token),
        json=payload,
        timeout=15,
    )
    body = _check(resp)
    return body["data"]["id"]


def patch_category(base: str, token: str, cat_id: str, payload: dict) -> None:
    requests.patch(
        f"{base}/api/v1/admin/catalog/categories/{cat_id}",
        headers=auth_headers(token),
        json=payload,
        timeout=15,
    )


def create_item(base: str, token: str, payload: dict) -> str:
    resp = requests.post(
        f"{base}/api/v1/admin/catalog/items",
        headers=auth_headers(token),
        json=payload,
        timeout=15,
    )
    body = _check(resp)
    return body["data"]["id"]


def patch_item(base: str, token: str, item_id: str, payload: dict) -> None:
    requests.patch(
        f"{base}/api/v1/admin/catalog/items/{item_id}",
        headers=auth_headers(token),
        json=payload,
        timeout=15,
    )


# ---- JSON helpers (write IDs back to file) -----------------------------------

def load_json(path: Path) -> list:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: list) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ---- Core seeder -------------------------------------------------------------

def seed_tenant(
    base: str,
    tenant: str,
    email: str,
    password: str,
    super_email: str | None,
    super_password: str | None,
    clear: bool,
    dry_run: bool,
):
    tenant_dir     = DATA_DIR / tenant
    cats_file      = tenant_dir / "categories.json"
    items_file     = tenant_dir / "items.json"
    settings_file  = tenant_dir / "settings.json"

    for f in [cats_file, items_file, settings_file]:
        if not f.exists():
            print(f"Missing: {f}")
            sys.exit(1)

    settings   = json.loads(settings_file.read_text(encoding="utf-8")).get("_meta", {})
    categories = load_json(cats_file)
    items      = load_json(items_file)

    total_new_cats  = sum(1 for c in categories if not c.get("id"))
    total_new_items = sum(1 for i in items      if not i.get("id"))

    print(f"\n{'=' * 55}")
    print(f"  Tenant  : {tenant}")
    print(f"  Module  : {settings.get('module_key', '?')}")
    print(f"  Data    : {len(categories)} categories ({total_new_cats} new), {len(items)} items ({total_new_items} new)")
    print(f"  Mode    : {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"{'=' * 55}")

    if dry_run:
        for cat in categories:
            cat_items = [i for i in items if i.get("category") == cat["name_en"]]
            marker = "[NEW]" if not cat.get("id") else f"[{cat['id'][:8]}]"
            print(f"\n  {marker} {cat['name_ar']} / {cat['name_en']}  ({len(cat_items)} items)")
            for item in cat_items:
                item_marker = "[NEW]" if not item.get("id") else f"[{item['id'][:8]}]"
                price_str = f"${item.get('price')}" if item.get("price") is not None else "daily"
                print(f"       {item_marker} {item['name_ar']}  -  {price_str}")
        print("\n  Dry run complete - no writes performed.")
        return

    # Step 1: Login
    print(f"\n[1/4] Logging in as {email} ...")
    try:
        token = login(base, email, password)
        print(f"      OK: JWT acquired")
    except ApiError as e:
        print(f"      FAIL: {e}")
        sys.exit(1)

    # Step 2: Ensure catalog service is active
    print(f"\n[2/4] Checking catalog service ...")
    status = probe_catalog(base, token)
    if status == 403:
        print(f"      Service 'catalog' not active for '{tenant}'.")
        if not super_email or not super_password:
            print(
                f"\n  Need super-admin credentials to activate.\n"
                f"  Rerun with: --super-email <e> --super-password <p>"
            )
            sys.exit(1)
        print(f"      Logging in as super-admin ...")
        try:
            super_token = login(base, super_email, super_password)
        except ApiError as e:
            print(f"      FAIL super-admin login: {e}")
            sys.exit(1)
        print(f"      Resolving client_id for '{tenant}' ...")
        try:
            client_id = get_client_id(base, super_token, tenant)
        except ApiError as e:
            print(f"      FAIL client lookup: {e}")
            sys.exit(1)
        print(f"      Activating catalog service ...")
        try:
            activated = activate_catalog_service(base, super_token, client_id)
            print(f"      OK: {'activated' if activated else 'already active'}")
        except ApiError as e:
            print(f"      FAIL activation: {e}")
            sys.exit(1)
    else:
        print(f"      OK: service is active")

    # Step 3: Clear
    if clear:
        print(f"\n[3/4] Clearing existing catalog ...")
        removed = delete_all_categories(base, token)
        print(f"      Removed {removed} category/categories")
        # Clear IDs in JSON files too
        for cat in categories:
            cat["id"] = None
        for item in items:
            item["id"] = None
        save_json(cats_file, categories)
        save_json(items_file, items)
    else:
        print(f"\n[3/4] Keeping existing catalog (--clear to wipe first)")

    # Step 4: Seed categories
    print(f"\n[4/4] Seeding ...")
    module_key = settings.get("module_key", "catalog")
    cats_errors  = []
    items_errors = []
    cat_created  = 0
    item_created = 0
    cat_skipped  = 0
    item_skipped = 0

    # Build name_en -> new UUID map (needed for items)
    cat_id_map: dict[str, str] = {}

    for idx, cat in enumerate(categories):
        if cat.get("id"):
            # Already seeded — update map and skip
            cat_id_map[cat["name_en"]] = cat["id"]
            cat_skipped += 1
            print(f"\n  SKIP Category [{idx+1}] {cat['name_ar']} (id={cat['id'][:8]}...)")
            continue

        cat_payload = {
            "name_ar":          cat["name_ar"],
            "name_en":          cat.get("name_en"),
            "image_url":        cat.get("image_url"),
            "sort_order":       cat.get("sort_order", idx + 1),
            "module_key":       module_key,
            "display_template": cat.get("display_template", "grid"),
        }
        try:
            new_id = create_category(base, token, cat_payload)
            cat["id"] = new_id
            cat_id_map[cat["name_en"]] = new_id
            cat_created += 1
            print(f"\n  OK  Category [{idx+1}] {cat['name_ar']}  ->  {new_id}")
        except ApiError as e:
            cats_errors.append(f"Category '{cat['name_ar']}': {e}")
            print(f"\n  FAIL Category [{idx+1}] {cat['name_ar']}  ->  {e}")
            continue

    # Persist category IDs back to file
    save_json(cats_file, categories)

    # Seed items
    for idx, item in enumerate(items):
        cat_name = item.get("category", "")
        cat_id   = cat_id_map.get(cat_name)

        if not cat_id:
            items_errors.append(f"Item '{item['name_ar']}': category '{cat_name}' not found or failed to create")
            print(f"     SKIP {item['name_ar']}  (category '{cat_name}' not available)")
            continue

        if item.get("id"):
            item_skipped += 1
            continue

        item_payload = {
            "category_id":    cat_id,
            "name_ar":        item["name_ar"],
            "name_en":        item.get("name_en"),
            "description_ar": item.get("description_ar"),
            "description_en": item.get("description_en"),
            "image_url":      item.get("image_url"),
            "price":          item.get("price"),
            "currency":       item.get("currency", "USD"),
            "is_featured":    item.get("is_featured", False),
            "sort_order":     item.get("sort_order", idx + 1),
            "metadata":       item.get("metadata") or {},
        }
        try:
            new_id = create_item(base, token, item_payload)
            item["id"] = new_id
            item_created += 1
            print(f"     OK  {item['name_ar']}  ->  {new_id}")
            time.sleep(0.05)
        except ApiError as e:
            items_errors.append(f"Item '{item['name_ar']}': {e}")
            print(f"     FAIL {item['name_ar']}  ->  {e}")

    # Persist item IDs back to file
    save_json(items_file, items)

    # Summary
    errors = cats_errors + items_errors
    print(f"\n{'=' * 55}")
    print(f"  Categories: created {cat_created}, already existed {cat_skipped}")
    print(f"  Items     : created {item_created}, already existed {item_skipped}")
    if errors:
        print(f"\n  {len(errors)} error(s):")
        for err in errors:
            print(f"     {err}")
    print(f"{'=' * 55}")
    print(f"\n  Verify: {tenant}.salmansaas.com")
    if cat_created or item_created:
        print(f"  IDs saved to data/{tenant}/categories.json + items.json")


# ---- CLI ---------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Seed SalmanSaaS tenant catalog via Admin API"
    )
    parser.add_argument("--tenant",   required=True, choices=KNOWN_TENANTS, help="Tenant slug")
    parser.add_argument("--email",    help="Tenant admin email")
    parser.add_argument("--password", help="Tenant admin password")
    parser.add_argument("--super-email",    dest="super_email",    help="Super-admin email")
    parser.add_argument("--super-password", dest="super_password", help="Super-admin password")
    parser.add_argument("--base",   default=DEFAULT_BASE, help=f"API base (default: {DEFAULT_BASE})")
    parser.add_argument("--clear",   action="store_true", help="Delete existing catalog first")
    parser.add_argument("--dry-run", action="store_true", help="Print plan, no writes")
    args = parser.parse_args()

    if not args.dry_run and (not args.email or not args.password):
        parser.error("--email and --password required unless --dry-run")

    seed_tenant(
        base=args.base,
        tenant=args.tenant,
        email=args.email or "",
        password=args.password or "",
        super_email=args.super_email,
        super_password=args.super_password,
        clear=args.clear,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    main()
