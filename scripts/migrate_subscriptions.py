"""
scripts/migrate_subscriptions.py
One-time migration - ADR-0002 Implementation Contract 02 §5.

Backfills one Subscription row per existing Client, linked to the Plan
matching their current tier, with startedAt = Client.createdAt (a
best-effort proxy, Decision 9.3 - NOT true subscription history, no
better data source exists anywhere in the system today) and status
mirrored from Client.lifecycle_state at migration time. Client itself
is never written by this script - purely additive, new Subscription
rows only.

MANDATORY PRECONDITION (Contract §5): a staging rehearsal or an
explicit pre-migration snapshot MUST exist before this runs for real.
A --dry-run alone does not satisfy this requirement on its own.

Idempotent: a Client that already has an active Subscription
(endedAt IS NULL) is skipped, not duplicated, on re-run.

Usage:
    python scripts/migrate_subscriptions.py --dry-run
    python scripts/migrate_subscriptions.py
"""
import argparse
import asyncio

from app.db.client import prisma_client


async def migrate(dry_run: bool) -> None:
    await prisma_client.connect()

    clients = await prisma_client.client.find_many()
    plans = await prisma_client.plan.find_many()
    plan_by_key = {p.key: p for p in plans}

    created = 0
    skipped_existing = 0
    skipped_no_plan = []

    for c in clients:
        existing = await prisma_client.subscription.find_first(
            where={"clientId": c.id, "endedAt": None}
        )
        if existing:
            skipped_existing += 1
            continue

        plan = plan_by_key.get(c.tier)
        if not plan:
            skipped_no_plan.append((c.slug, c.tier))
            continue

        if not dry_run:
            await prisma_client.subscription.create(data={
                "clientId": c.id,
                "planId": plan.id,
                "startedAt": c.createdAt,
                "status": c.lifecycle_state,
            })
        created += 1
        print(
            f"  {'[DRY RUN] would create' if dry_run else 'Created'}: "
            f"{c.slug} -> plan={c.tier} status={c.lifecycle_state} "
            f"startedAt={c.createdAt.isoformat()}"
        )

    print("=" * 70)
    print(f"{'[DRY RUN] ' if dry_run else ''}migrate_subscriptions summary")
    print(f"  Subscriptions created: {created}")
    print(f"  Skipped (already has an active Subscription - idempotency): {skipped_existing}")
    print(f"  Skipped (no matching Plan for tier): {len(skipped_no_plan)}")
    for slug, tier in skipped_no_plan:
        print(f"    - {slug}: tier={tier!r}")
    print("=" * 70)

    await prisma_client.disconnect()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(migrate(args.dry_run))
