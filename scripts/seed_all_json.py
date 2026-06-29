#!/usr/bin/env python3
"""
scripts/seed_all_json.py
────────────────────────
Batch-seeds all units from scripts/data/*.json using the shared
normalization layer in seed_beit_smar_units.py.

Usage:
    venv/Scripts/python.exe scripts/seed_all_json.py
    venv/Scripts/python.exe scripts/seed_all_json.py --dry-run
    venv/Scripts/python.exe scripts/seed_all_json.py --update     # overwrite existing units
"""

import asyncio
import json
import sys
import argparse
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:
    pass

from prisma import Prisma
from scripts.seed_beit_smar_units import (
    unit_from_property_json,
    seed_services_from_json,
    _create_unit,
)

# ── Manifest ───────────────────────────────────────────────────────────────────
# Maps filename → Arabic name + nightly price (USD)
# Prices follow cottage type tiers: Detached $165 | Garden $150 | Terrace $175
# Special premium units keep their own prices.
MANIFEST = {
    "aleph.json":  {"name_ar": "كوخ ألف — Aleph",  "price": 165},
    "bet.json":    {"name_ar": "كوخ بيت — Beth",   "price": 165},
    "dalt.json":   {"name_ar": "كوخ دال — Daleth", "price": 150},
    "giml.json":   {"name_ar": "كوخ جيم — Gimel",  "price": 150},
    "he.json":     {"name_ar": "كوخ هاء — He",     "price": 150},
    "het.json":    {"name_ar": "كوخ حاء — Het",    "price": 265},
    "lamed.json":  {"name_ar": "كوخ لام — Lamed",  "price": 175},
    "tet.json":    {"name_ar": "كوخ طيت — Tet",    "price": 294},
    "waw.json":    {"name_ar": "كوخ واو — Waw",    "price": 175},
    "yod.json":    {"name_ar": "كوخ يود — Yod",    "price": 175},
    "zayin.json":  {"name_ar": "كوخ زين — Zayin",  "price": 220},
}

DATA_DIR = ROOT / "scripts" / "data"


async def run(dry_run: bool = False, update: bool = False):
    db = Prisma()
    await db.connect()

    try:
        client = await db.client.find_first(where={"slug": "smar", "isActive": True})
        if not client:
            print("❌ Client 'smar' not found.")
            return

        prop = await db.property.find_first(
            where={"clientId": client.id, "isActive": True},
            order={"createdAt": "asc"},
        )
        if not prop:
            print("❌ No active Property found for smar.")
            return

        print(f"✅ Client : {client.name}")
        print(f"✅ Property: {prop.name}")
        print(f"   Files   : {len(MANIFEST)} units\n")
        print("─" * 60)

        created = updated = skipped = errors = 0

        for filename, meta in MANIFEST.items():
            path = DATA_DIR / filename
            if not path.exists():
                print(f"⚠️  MISSING  {filename}")
                errors += 1
                continue

            with open(path, encoding="utf-8") as f:
                data = json.load(f)

            unit_dict = unit_from_property_json(
                data,
                name_ar=meta["name_ar"],
                price=meta["price"],
            )

            print(f"\n📄 {filename}  →  {meta['name_ar']}  (${meta['price']}/night)")

            try:
                acted, unit_id = await _create_unit(
                    db, client.id, prop.id, unit_dict, dry_run, update
                )

                if acted:
                    # Determine if it was a create or update from the print output
                    # (already printed inside _create_unit)
                    created += 1
                else:
                    skipped += 1

                # Always attempt to seed addons — idempotent (skips existing services)
                addons = unit_dict.get("_addons", {})
                if addons:
                    await seed_services_from_json(
                        db, client.id, prop.id, addons, dry_run=dry_run
                    )

            except Exception as e:
                print(f"   ❌ ERROR: {e}")
                errors += 1

        print("\n" + "─" * 60)
        label = "DRY RUN" if dry_run else "DONE"
        print(
            f"{'🔵' if dry_run else '🎉'} {label} — "
            f"acted: {created}  skipped: {skipped}  errors: {errors}"
        )

    finally:
        await db.disconnect()


def main():
    parser = argparse.ArgumentParser(description="Batch seed all Beit Smar JSON units")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing to DB")
    parser.add_argument("--update",  action="store_true", help="Overwrite existing units with JSON data")
    args = parser.parse_args()
    asyncio.run(run(dry_run=args.dry_run, update=args.update))


if __name__ == "__main__":
    main()
