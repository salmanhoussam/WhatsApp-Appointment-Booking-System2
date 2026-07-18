"""
scripts/migrate_lifecycle_state.py
One-time migration - ADR-0002 §9.3 / Implementation Contract §5.

Splits the pre-ADR-0002 Client.status (historically trial/demo/active/
suspended/expired, mixing Tenant Status and Account Lifecycle State) into
the two independent fields:
  - status           -> Tenant Status only (active/suspended, ADR-0001 Hard Block)
  - lifecycle_state   -> Account Lifecycle State (trial/paid/grace_period/
                          expired/cancelled/archived/evergreen, ADR-0002)

Mapping (ADR-0002 §9.3, decided by the user, not invented here):
  status="trial" -> status="active", lifecycle_state="trial", trial_ends_at
                     kept as-is UNLESS already past-due, in which case it
                     is extended by --grace-days from the migration run
                     date (default 5) and the tenant is printed for manual
                     follow-up notification - never silently expired.
  status="demo"  -> status="active", lifecycle_state="evergreen",
                     trial_ends_at=null (exempt from expiry entirely).
  status in {"active", "suspended"} already -> left untouched. Their
                     lifecycle_state default ("trial", from the schema
                     default) is very likely wrong for them - this script
                     does NOT guess; it prints them for manual review.
  anything else (e.g. a stray legacy "expired") -> also printed for manual
                     review, never guessed.

Idempotent: once a row's status flips from "trial"/"demo" to "active", it
no longer matches those branches on a re-run, so re-running never
double-extends a grace period or re-nulls trial_ends_at. Re-running does
re-print the (by-then-larger) manual-review list each time - that's
expected, not a side effect.

Usage:
    python scripts/migrate_lifecycle_state.py --dry-run
    python scripts/migrate_lifecycle_state.py --grace-days 5
"""
import argparse
import asyncio
from datetime import datetime, timedelta, timezone

from app.db.client import prisma_client

DEFAULT_GRACE_DAYS = 5


async def migrate(dry_run: bool, grace_days: int) -> None:
    await prisma_client.connect()

    all_clients = await prisma_client.client.find_many()
    now = datetime.now(timezone.utc)

    trial_migrated = 0
    trial_grace_extended = 0
    demo_migrated = 0
    needs_manual_review: list[dict] = []

    for c in all_clients:
        old_status = c.status

        if old_status == "trial":
            trial_ends_at = c.trial_ends_at
            if trial_ends_at and trial_ends_at.tzinfo is None:
                trial_ends_at = trial_ends_at.replace(tzinfo=timezone.utc)

            grace_applied = trial_ends_at is not None and trial_ends_at < now
            new_trial_ends_at = (now + timedelta(days=grace_days)) if grace_applied else trial_ends_at

            update_data = {"status": "active", "lifecycle_state": "trial"}
            if grace_applied:
                update_data["trial_ends_at"] = new_trial_ends_at

            if not dry_run:
                await prisma_client.client.update(where={"id": c.id}, data=update_data)

            trial_migrated += 1
            if grace_applied:
                trial_grace_extended += 1
                print(
                    f"  GRACE: {c.slug} (id={c.id}) trial_ends_at was "
                    f"{trial_ends_at.isoformat() if trial_ends_at else 'null'} (already past) "
                    f"-> extended to {new_trial_ends_at.isoformat()} "
                    f"- MANUAL FOLLOW-UP NOTIFICATION NEEDED (not sent automatically)"
                )

        elif old_status == "demo":
            if not dry_run:
                await prisma_client.client.update(
                    where={"id": c.id},
                    data={"status": "active", "lifecycle_state": "evergreen", "trial_ends_at": None},
                )
            demo_migrated += 1

        else:
            # "active", "suspended", or anything unexpected - never guessed.
            needs_manual_review.append({
                "id": c.id, "slug": c.slug,
                "status": old_status, "lifecycle_state": c.lifecycle_state,
            })

    print("=" * 70)
    print(f"{'[DRY RUN] ' if dry_run else ''}ADR-0002 §9.3 migration summary")
    print(f"  trial -> active/trial:        {trial_migrated}  ({trial_grace_extended} given a {grace_days}-day grace extension)")
    print(f"  demo  -> active/evergreen:    {demo_migrated}")
    print(f"  needs manual review (unchanged): {len(needs_manual_review)}")
    for row in needs_manual_review:
        print(f"    - {row['slug']} (id={row['id']}): status={row['status']}, lifecycle_state={row['lifecycle_state']}")
    print("=" * 70)

    await prisma_client.disconnect()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Print what would change without writing anything")
    parser.add_argument("--grace-days", type=int, default=DEFAULT_GRACE_DAYS, help="Grace period for already-expired trials (default: 5)")
    args = parser.parse_args()
    asyncio.run(migrate(args.dry_run, args.grace_days))
