"""
app/api/v1/admin/provisioning.py
Unified Provisioning Contract, Phase 3 (2026-08-15). Mounted at /api/v1/admin/provisioning.

One route: POST /domain-objects -- Self-Registration's own Step 1.5 (see
.claudedocs/architecture/ALZABT_PHASE3_FINAL_CONTRACT.md for the full contract this implements).
Called once, right after /auth/register succeeds, using the fresh JWT that call returned. Retry-
safe by design: calling it again after a failure re-provisions from the request's own current
data, never duplicates, never silently no-ops on a genuine retry (only a true already-complete
state short-circuits).

Vertical-neutral on purpose: this route never branches on a vertical name string. All dispatch
logic lives in provisioning_service.provision_vertical_domain_objects(), keyed by
VERTICAL_REGISTRY[vertical]["staff_backing_model"].
"""

from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.tenant import require_roles
from app.core.services import require_service
from app.core.exceptions import BusinessLogicError
from app.db.dependencies import get_current_tenant
from app.repositories import admin_client_repo
from app.services import provisioning_service

router = APIRouter(prefix="/provisioning", tags=["Admin Provisioning"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ServiceInput(BaseModel):
    name_ar:      str = Field(min_length=1, max_length=200)
    price:        float = Field(gt=0)
    duration_min: int = Field(gt=0)


class DomainObjectsProvisionRequest(BaseModel):
    staff_name: str = Field(min_length=2, max_length=100)
    services:   List[ServiceInput] = Field(min_length=1)


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/domain-objects", status_code=201)
async def provision_domain_objects(
    body:   DomainObjectsProvisionRequest,
    tenant: dict = Depends(get_current_tenant),
    _svc:   dict = Depends(require_service("reservations")),
    _user:  dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    # get_current_tenant()'s own returned dict is deliberately narrow ({id, slug, currency} --
    # app/core/tenant.py's own docstring) and shared by every route in the app; extending it was
    # avoided on purpose to keep this route's own addition contained. One extra lookup here
    # instead.
    client = await admin_client_repo.find_client_by_id(tenant["id"])
    vertical = client.vertical if client else None
    if not vertical:
        raise BusinessLogicError(
            "This tenant has no vertical assigned -- domain-object provisioning is only "
            "applicable to a Reservations-vertical tenant."
        )

    services = [
        (s.name_ar, None, s.duration_min, s.price)
        for s in body.services
    ]
    result = await provisioning_service.provision_vertical_domain_objects(
        client_id=tenant["id"],
        vertical=vertical,
        staff_name=body.staff_name,
        services=services,
    )
    return {"success": True, "data": {**result, "provisioning_status": "complete"}}
