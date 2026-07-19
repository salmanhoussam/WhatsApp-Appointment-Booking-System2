from datetime import datetime, timezone

from prisma import Prisma

from app.repositories.super_repo import SuperRepository
from app.core.tenant import invalidate_tenant_cache


async def list_clients(db: Prisma) -> list[dict]:
    repo = SuperRepository(db)
    clients = await repo.list_all_clients()
    now = datetime.now(timezone.utc)
    result = []

    for c in clients:
        trial_ends = getattr(c, "trial_ends_at", None)
        if trial_ends and trial_ends.tzinfo is None:
            trial_ends = trial_ends.replace(tzinfo=timezone.utc)

        days_left = None
        if trial_ends:
            days_left = max(0, (trial_ends - now).days)

        result.append({
            "id":           c.id,
            "name":         c.name or getattr(c, "name_en", None) or c.slug,
            "name_ar":      getattr(c, "name_ar", None),
            "slug":         c.slug,
            "status":           getattr(c, "status", "active"),
            "lifecycle_state":  getattr(c, "lifecycle_state", "trial"),
            "service_type": getattr(c, "service_type", None),
            "trial_ends_at": trial_ends.isoformat() if trial_ends else None,
            "days_left":    days_left,
            "is_active":    getattr(c, "isActive", True),
            "created_at":   c.createdAt.isoformat() if getattr(c, "createdAt", None) else None,
            "page_type":    getattr(c, "pageType",    "normal"),
            "template_key": getattr(c, "templateKey", None),
        })

    return result


async def update_client_status(db: Prisma, client_id: str, status: str) -> dict:
    """Tenant Status only (ADR-0001, Hard Block) - active/suspended."""
    repo = SuperRepository(db)
    updated = await repo.update_client_status(client_id, status)
    invalidate_tenant_cache(updated.slug)
    return {
        "id":     updated.id,
        "slug":   updated.slug,
        "status": getattr(updated, "status", status),
    }


async def update_client_lifecycle_state(db: Prisma, client_id: str, lifecycle_state: str) -> dict:
    """
    SUPERSEDED, kept but unused (ADR-0002 Implementation Contract 02,
    Decision 9.1): app/api/v1/super/clients.py's PATCH /lifecycle route no
    longer calls this - it calls subscription_service.set_lifecycle_state
    instead, which is now the only write path to Client.lifecycle_state.
    This function still writes the column directly and must not gain a
    new caller; flagged rather than deleted, per the project's minimal-
    change discipline (out of this phase's explicit scope to remove).
    """
    repo = SuperRepository(db)
    updated = await repo.update_client_lifecycle_state(client_id, lifecycle_state)
    invalidate_tenant_cache(updated.slug)
    return {
        "id":              updated.id,
        "slug":            updated.slug,
        "lifecycle_state": getattr(updated, "lifecycle_state", lifecycle_state),
    }
