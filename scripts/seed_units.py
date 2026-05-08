#!/usr/bin/env python3
"""
SalmanSaaS Booking Unit Seeder
================================
Reads scripts/data/{slug}/units.json and seeds them via Prisma directly.
After each successful create the returned UUID is written back to units.json
(id field), so the file becomes the source of truth.

Usage:
  python scripts/seed_units.py --tenant smar --dry-run
  python scripts/seed_units.py --tenant smar
  python scripts/seed_units.py --tenant smar --update
  python scripts/seed_units.py --tenant smar --clear

  --clear   Delete all existing units before seeding (resets all ids to null)
  --update  Update existing units with latest JSON data (matches by name_ar)
  --base    Custom API base URL (not used here — Prisma talks DB directly)
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:
    pass

try:
    from prisma import Prisma, Json
except ImportError:
    print("Missing 'prisma'. Run: pip install prisma")
    sys.exit(1)


# ---- Config ------------------------------------------------------------------

SCRIPT_DIR    = Path(__file__).parent
DATA_DIR      = SCRIPT_DIR / "data"
KNOWN_TENANTS = ["smar"]


# ---- JSON helpers ------------------------------------------------------------

def load_json(path: Path) -> list:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: list) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ---- Unit payload builder ----------------------------------------------------

def _unit_payload(u: dict) -> dict:
    """Build the data dict for create/update (excludes relation fields)."""
    return {
        k: v for k, v in {
            "name_en":        u.get("name_en"),
            "unit_type":      u.get("unit_type", "chalet"),
            "category":       u.get("category"),
            "capacity":       u["capacity"],
            "bedrooms":       u.get("bedrooms"),
            "bathrooms":      u.get("bathrooms"),
            "price":          u.get("price"),
            "price_label":    u.get("price_label"),
            "sort_order":     u.get("sort_order", 99),
            "description_ar": u.get("description_ar"),
            "description_en": u.get("description_en"),
            "content_blocks": Json(u["content_blocks"]) if u.get("content_blocks") else None,
            "amenities":      Json(u["amenities"])       if u.get("amenities")       else None,
            "rules_policies": Json(u["rules_policies"])  if u.get("rules_policies")  else None,
        }.items() if v is not None
    }


# ---- Core seeder -------------------------------------------------------------

async def seed_tenant(
    tenant: str,
    dry_run: bool,
    update: bool,
    clear: bool,
):
    tenant_dir    = DATA_DIR / tenant
    units_file    = tenant_dir / "units.json"
    settings_file = tenant_dir / "settings.json"

    for f in [units_file, settings_file]:
        if not f.exists():
            print(f"Missing: {f}")
            sys.exit(1)

    settings = json.loads(settings_file.read_text(encoding="utf-8")).get("_meta", {})
    units    = load_json(units_file)

    total_new = sum(1 for u in units if not u.get("id"))

    print(f"\n{'=' * 55}")
    print(f"  Tenant  : {tenant}")
    print(f"  Module  : {settings.get('module_key', 'booking')}")
    print(f"  Data    : {len(units)} units ({total_new} new)")
    print(f"  Mode    : {'DRY RUN' if dry_run else ('UPDATE' if update else 'LIVE')}")
    print(f"{'=' * 55}")

    if dry_run:
        for u in units:
            marker = "[NEW]" if not u.get("id") else f"[{u['id'][:8]}]"
            price_str = f"${u['price']:.0f}/night" if u.get("price") else "?"
            print(f"\n  {marker} [{u.get('unit_type','?').upper()}] {u['name_ar']}")
            print(f"         {u.get('name_en','')} — {price_str} — {u.get('capacity','?')} guests")
            amenity_count = len(u.get("amenities") or [])
            block_count   = len(u.get("content_blocks") or [])
            print(f"         amenities: {amenity_count}  content_blocks: {block_count}")
        print("\n  Dry run complete — no writes performed.")
        return

    db = Prisma()
    await db.connect()

    try:
        client = await db.client.find_first(where={"slug": tenant, "isActive": True})
        if not client:
            print(f"\n❌ Client '{tenant}' not found in DB.")
            print(f"   Run the onboarding/backfill script first.")
            sys.exit(1)

        prop = await db.property.find_first(
            where={"clientId": client.id, "isActive": True},
            order={"createdAt": "asc"},
        )
        if not prop:
            print(f"\n❌ No active Property found for '{tenant}'.")
            sys.exit(1)

        print(f"\n  Client  : {client.name} ({client.id[:8]}...)")
        print(f"  Property: {prop.name} ({prop.id[:8]}...)")

        # Step: Clear
        if clear:
            print(f"\n[CLEAR] Deleting all existing units for '{tenant}' ...")
            existing = await db.unit.find_many(where={"clientId": client.id})
            for ex in existing:
                await db.unit.delete(where={"id": ex.id})
            print(f"        Removed {len(existing)} unit(s)")
            for u in units:
                u["id"] = None
            save_json(units_file, units)

        # Step: Seed
        print(f"\n[SEED] Seeding {len(units)} units ...\n")
        created = updated = skipped = 0
        errors  = []

        for idx, u in enumerate(units):
            name_ar = u["name_ar"]
            existing = await db.unit.find_first(
                where={"clientId": client.id, "name_ar": name_ar}
            )

            if existing:
                if not update:
                    # Sync id back to JSON in case file was reset
                    if not u.get("id"):
                        u["id"] = existing.id
                    skipped += 1
                    print(f"  SKIP [{idx+1}] {name_ar} (id={existing.id[:8]}...)")
                    continue

                # UPDATE
                try:
                    await db.unit.update(
                        where={"id": existing.id},
                        data=_unit_payload(u),
                    )
                    u["id"] = existing.id
                    updated += 1
                    print(f"  UPDATE [{idx+1}] {name_ar}  ->  {existing.id[:8]}...")
                except Exception as e:
                    errors.append(f"Unit '{name_ar}': {e}")
                    print(f"  FAIL UPDATE [{idx+1}] {name_ar}  ->  {e}")
                continue

            # CREATE
            try:
                unit = await db.unit.create(data={
                    "clientId":    client.id,
                    "propertyId":  prop.id,
                    "name_ar":     name_ar,
                    "isActive":    True,
                    "isAvailable": True,
                    "images":      [],
                    **_unit_payload(u),
                })
                u["id"] = unit.id
                created += 1
                print(f"  OK  [{idx+1}] {name_ar}  ->  {unit.id}")
            except Exception as e:
                errors.append(f"Unit '{name_ar}': {e}")
                print(f"  FAIL [{idx+1}] {name_ar}  ->  {e}")

        # Persist IDs back
        save_json(units_file, units)

        # Summary
        print(f"\n{'=' * 55}")
        print(f"  Created : {created}")
        print(f"  Updated : {updated}")
        print(f"  Skipped : {skipped}")
        if errors:
            print(f"\n  {len(errors)} error(s):")
            for err in errors:
                print(f"    {err}")
        print(f"{'=' * 55}")
        if created or updated:
            print(f"\n  IDs saved to data/{tenant}/units.json")
        print(f"  Verify : {tenant}.salmansaas.com")

    finally:
        await db.disconnect()


# ---- CLI ---------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Seed SalmanSaaS booking units via Prisma"
    )
    parser.add_argument("--tenant",   required=True, choices=KNOWN_TENANTS, help="Tenant slug")
    parser.add_argument("--dry-run",  action="store_true", help="Print plan, no writes")
    parser.add_argument("--update",   action="store_true", help="Update existing units with JSON data")
    parser.add_argument("--clear",    action="store_true", help="Delete existing units first")
    args = parser.parse_args()

    asyncio.run(seed_tenant(
        tenant=args.tenant,
        dry_run=args.dry_run,
        update=args.update,
        clear=args.clear,
    ))


if __name__ == "__main__":
    main()
