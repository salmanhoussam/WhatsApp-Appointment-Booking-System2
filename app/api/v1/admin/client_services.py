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
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db.client import prisma_client
from app.db.dependencies import get_current_admin_user
from app.core.services import sync_selected_services

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
async def list_client_services(user=Depends(get_current_admin_user)):
    """Return all ClientService rows (active + inactive) for the current tenant."""
    rows = await prisma_client.clientservice.find_many(
        where={"clientId": str(user.clientId)},
        order={"activatedAt": "desc"},
    )
    return {"success": True, "data": [_fmt(r) for r in rows]}


@router.post("/activate", status_code=201)
async def activate_services(
    body: ActivateServicesIn,
    user=Depends(get_current_admin_user),
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
        await prisma_client.clientservice.upsert(
            where={"clientId_serviceKey": {"clientId": client_id, "serviceKey": key}},
            data={
                "create": {"clientId": client_id, "serviceKey": key, "isActive": True},
                "update": {"isActive": True},
            },
        )
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
    user=Depends(get_current_admin_user),
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
        result = await prisma_client.clientservice.update_many(
            where={"clientId": client_id, "serviceKey": key},
            data={"isActive": False},
        )
        if result.count > 0:
            deactivated.append(key)

    await sync_selected_services(client_id)

    logger.info("⛔ Services deactivated for tenant %s: %s", client_id, deactivated)
    return {
        "success":     True,
        "deactivated": deactivated,
        "tenant_id":   client_id,
    }
