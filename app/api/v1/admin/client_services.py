"""
app/api/v1/admin/client_services.py
Self-service platform feature activation for tenant admins.

POST /api/v1/admin/client-services/activate
  → Activates one or more platform serviceKeys for the current tenant.
  → Called during onboarding after POST /auth/register.
  → tenantId comes from the JWT — never from the payload.

GET  /api/v1/admin/client-services/
  → Lists active platform services for the current tenant.

Why a separate file:
  admin/services.py manages the Service model (add-on booking services like
  "breakfast" or "pool access"). This file manages ClientService rows
  (platform feature flags: "restaurant", "store", "reservations", …).
  Different concerns, different models.

Authorization (Phase 2B-1, 2026-09-04):
  GET /, POST /activate, POST /deactivate -> SUPER_ADMIN or TENANT_ADMIN only.

  These three routes previously depended on get_current_admin_user alone, with NO
  require_roles() gate -- meaning ANY authenticated account of ANY role could read,
  and by the same dependency activate/deactivate, the tenant's own capabilities.
  Confirmed live 2026-09-04 with a real STAFF token (a barber account):
  GET /admin/client-services/ returned 200 with the full capability config, while
  correctly-gated routes (/admin/team, /admin/store/products) returned 403 for the
  same token. See .claudedocs/work/permission-model-investigation/2026-09-04/summary.md (F5).

  Ownership reasoning matches admin/team.py's already-approved matrix: turning a
  tenant's modules on and off is a tenant-owner decision, not an operational one.
  Managers are denied because no business case exists today for an operational role
  to change which modules the business has -- not an absolute prohibition; a real
  case later gets its own reviewed matrix.

  In the granular-permission model (PHASE_2B_DESIGN.md §6, migration step 1) this
  gate becomes require_permission("capabilities.write"); the role list here is the
  behavior it must reproduce.
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.tenant import require_roles
from app.core.services import sync_selected_services
from app.repositories import client_services_repo as _repo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/client-services", tags=["Admin Client Services"])


# ── Valid keys that a tenant admin can self-activate ─────────────────────────
# SUPER_ADMIN-only keys (whatsapp_ordering, ai_bot, analytics) are excluded.
ACTIVATABLE_KEYS: frozenset[str] = frozenset({
    "restaurant",
    "store",
    "catalog",
    "reservations",
    "gallery",
    "delivery_zones",
})


# ── Schemas ───────────────────────────────────────────────────────────────────

class ActivateServicesIn(BaseModel):
    """
    services: list of platform serviceKey strings to activate.
    tenantId is intentionally NOT in this payload — it is derived from the JWT
    to guarantee multi-tenant isolation (a tenant can only activate for itself).
    """
    services: List[str]


class DeactivateServicesIn(BaseModel):
    services: List[str]


# ── Serializer ────────────────────────────────────────────────────────────────

def _fmt(row) -> dict:
    return {
        "id":           row.id,
        "service_key":  row.serviceKey,
        "is_active":    row.isActive,
        "activated_at": row.activatedAt.isoformat() if row.activatedAt else None,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/")
async def list_client_services(user=Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN"))):
    """Return all ClientService rows (active + inactive) for the current tenant."""
    rows = await _repo.list_client_services(str(user.clientId))
    return {"success": True, "data": [_fmt(r) for r in rows]}


@router.post("/activate", status_code=201)
async def activate_services(
    body: ActivateServicesIn,
    user=Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """
    Activate platform services for the current tenant.

    Security contract:
      - Only ACTIVATABLE_KEYS are accepted (rejects SUPER_ADMIN-only keys).
      - tenantId is always taken from the JWT — never from the request body.
      - Uses upsert so calling this endpoint twice is safe (idempotent).
      - Syncs Client.selected_services after activation.

    Errors:
      400 — empty list
      400 — unknown or restricted serviceKey
    """
    if not body.services:
        raise HTTPException(status_code=400, detail="services list cannot be empty.")

    # ── Validate all keys before touching the DB ───────────────────────────
    invalid = set(body.services) - ACTIVATABLE_KEYS
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unknown or restricted service key(s): {sorted(invalid)}. "
                f"Activatable keys: {sorted(ACTIVATABLE_KEYS)}"
            ),
        )

    client_id = str(user.clientId)
    activated: list[str] = []

    for key in body.services:
        await _repo.upsert_client_service(client_id, key, is_active=True)
        activated.append(key)

    # Keep Client.selected_services in sync with the ClientService table
    await sync_selected_services(client_id)

    logger.info("✅ Services activated for tenant %s: %s", client_id, activated)
    return {
        "success":   True,
        "activated": activated,
        "tenant_id": client_id,
    }


@router.post("/deactivate", status_code=200)
async def deactivate_services(
    body: DeactivateServicesIn,
    user=Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """
    Deactivate platform services for the current tenant.
    Data is preserved — only isActive is set to False.
    SUPER_ADMIN can re-activate later via /api/v1/super/clients/{id}/services.
    """
    if not body.services:
        raise HTTPException(status_code=400, detail="services list cannot be empty.")

    invalid = set(body.services) - ACTIVATABLE_KEYS
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unknown service key(s): {sorted(invalid)}. "
                f"Activatable keys: {sorted(ACTIVATABLE_KEYS)}"
            ),
        )

    client_id = str(user.clientId)
    deactivated: list[str] = []

    for key in body.services:
        result = await _repo.deactivate_client_service(client_id, key)
        if result.count > 0:
            deactivated.append(key)

    await sync_selected_services(client_id)

    logger.info("⛔ Services deactivated for tenant %s: %s", client_id, deactivated)
    return {
        "success":     True,
        "deactivated": deactivated,
        "tenant_id":   client_id,
    }
