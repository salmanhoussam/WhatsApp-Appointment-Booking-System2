"""
scripts/seed_plans.py
One-time seed - ADR-0002 Implementation Contract 02 §5 / Decision 9.2.

Seeds the Plan catalog with the pricing already documented in
prisma/schema.prisma:39 (regular=$15 | pro=$22 | ultra=$35) - not new
pricing, just formalizing already-live values into structured data.
Does NOT resolve the still-open Product-vs-Price question (ADR-0002
§11.0b) - monthly_price stays a provisional field.

Idempotent: upserts by `key`, safe to re-run.

Usage:
    python scripts/seed_plans.py --dry-run
    python scripts/seed_plans.py
"""
import argparse
import asyncio

from app.db.client import prisma_client

PLANS = [
    {"key": "regular", "name_ar": "عادي",    "name_en": "Regular", "monthly_price": 15, "currency": "USD"},
    {"key": "pro",     "name_ar": "احترافي", "name_en": "Pro",     "monthly_price": 22, "currency": "USD"},
    {"key": "ultra",   "name_ar": "ألترا",    "name_en": "Ultra",   "monthly_price": 35, "currency": "USD"},
]


async def seed(dry_run: bool) -> None:
    await prisma_client.connect()

    created, updated = 0, 0
    for p in PLANS:
        existing = await prisma_client.plan.find_unique(where={"key": p["key"]})
        if existing:
            if not dry_run:
                await prisma_client.plan.update(where={"key": p["key"]}, data=p)
            updated += 1
            print(f"  {'[DRY RUN] would update' if dry_run else 'Updated'}: {p['key']} (${p['monthly_price']})")
        else:
            if not dry_run:
                await prisma_client.plan.create(data=p)
            created += 1
            print(f"  {'[DRY RUN] would create' if dry_run else 'Created'}: {p['key']} (${p['monthly_price']})")

    print(f"{'[DRY RUN] ' if dry_run else ''}seed_plans summary: {created} created, {updated} updated")
    await prisma_client.disconnect()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(seed(args.dry_run))
