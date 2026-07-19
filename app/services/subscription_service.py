"""
app/services/subscription_service.py
ADR-0002 §11 (Subscription & Plan Domain) / Implementation Contract 02.

This module is the ONLY code path allowed to write Client.lifecycle_state
(Decision 9.1, Implementation Contract 02 §6) - both the manual override
entry point (set_lifecycle_state, wired to the re-routed
PATCH /clients/{id}/lifecycle in Phase 3) and the Plan-assignment flow
(assign_plan) funnel through _sync_client_lifecycle_state below, so there
is exactly one writer regardless of caller, eliminating the dual-write
drift risk named in the design.

Subscription is the new source of truth for subscription lifecycle;
Client.lifecycle_state stays exactly as built in the first ADR-0002 slice
- a cached mirror kept in sync here (Option A, ADR-0002 §11.2). This
module makes zero change to app/core/tenant.py's enforcement, which keeps
reading Client.lifecycle_state exactly as before.
"""
from datetime import datetime, timezone
from typing import Optional

from prisma import Prisma

from app.repositories.plan_repo import PlanRepository
from app.repositories.subscription_repo import SubscriptionRepository
from app.core.tenant import invalidate_tenant_cache


async def _sync_client_lifecycle_state(db: Prisma, client_id: str, lifecycle_state: str) -> str:
    """
    Internal. The single write path to Client.lifecycle_state - every
    public function in this module that changes lifecycle state must
    route through here, never write the column directly elsewhere.
    """
    client = await db.client.update(
        where={"id": client_id},
        data={"lifecycle_state": lifecycle_state},
    )
    invalidate_tenant_cache(client.slug)
    return client.slug


async def set_lifecycle_state(db: Prisma, client_id: str, lifecycle_state: str) -> dict:
    """
    Public entry point for manual lifecycle changes (Decision 9.1) - the
    re-routed PATCH /clients/{id}/lifecycle (Phase 3) calls this instead
    of writing Client.lifecycle_state directly.

    Updates Client.lifecycle_state AND, if the Client has an active
    Subscription, keeps that Subscription's status in sync too - so the
    two never silently drift apart. If no active Subscription exists yet
    (e.g. before Phase 4's migration backfill runs), this still updates
    Client.lifecycle_state alone - a graceful degradation for the
    transition window, not an error.
    """
    sub_repo = SubscriptionRepository(db)
    active = await sub_repo.find_active_for_client(client_id)
    if active:
        await sub_repo.update_status(active.id, lifecycle_state)

    await _sync_client_lifecycle_state(db, client_id, lifecycle_state)

    return {
        "client_id": client_id,
        "lifecycle_state": lifecycle_state,
        "subscription_id": active.id if active else None,
    }


async def assign_plan(
    db: Prisma,
    client_id: str,
    plan_key: str,
    status: Optional[str] = None,
) -> dict:
    """
    Assign a Plan to a Client (ADR-0002 §11). Ends any existing active
    Subscription for this Client first (at most one active Subscription
    per Client, §11.0b - a business rule, not a DB constraint) and starts
    a new one on the given Plan.

    `status` is the new Subscription's starting status. If not given, it
    defaults to the Client's current lifecycle_state (continuity default -
    e.g. a trial tenant assigned a real Plan stays "trial" until something
    explicit changes that). This function does not invent a business rule
    for what a newly-assigned subscription's status "should" be beyond
    that default - Contract 02 did not resolve that question, so the
    caller (a future endpoint, or the Phase 4 migration script) decides.

    Syncs Client.lifecycle_state to match, through the same single write
    path as set_lifecycle_state (_sync_client_lifecycle_state) - never a
    second, parallel writer.
    """
    plan_repo = PlanRepository(db)
    sub_repo = SubscriptionRepository(db)

    plan = await plan_repo.find_by_key(plan_key)
    if not plan:
        raise ValueError(f"Plan '{plan_key}' not found")

    now = datetime.now(timezone.utc)

    if status is None:
        client = await db.client.find_unique(where={"id": client_id})
        if not client:
            raise ValueError(f"Client '{client_id}' not found")
        status = client.lifecycle_state

    existing = await sub_repo.find_active_for_client(client_id)
    if existing:
        await sub_repo.end_subscription(existing.id, now)

    subscription = await sub_repo.create({
        "clientId": client_id,
        "planId": plan.id,
        "startedAt": now,
        "status": status,
    })

    await _sync_client_lifecycle_state(db, client_id, status)

    return {
        "client_id": client_id,
        "subscription_id": subscription.id,
        "plan_key": plan.key,
        "status": status,
        "previous_subscription_id": existing.id if existing else None,
    }


async def list_plans(db: Prisma) -> list:
    """Convenience read - all Plan rows, cheapest first."""
    plan_repo = PlanRepository(db)
    return await plan_repo.list_all()
