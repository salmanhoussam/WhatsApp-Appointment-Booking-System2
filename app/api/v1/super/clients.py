"""
app/api/v1/super/clients.py
Super Admin — Tenant management endpoints.
Mounted at /api/v1/super (see main.py).

All routes require role SUPER_ADMIN via require_roles() dependency.
"""

import logging
from fastapi import APIRouter, Depends, Path
from pydantic import BaseModel, field_validator

from app.db.client import prisma_client
from app.core.tenant import require_roles
from app.services import super_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Super Admin"])

_VALID_STATUSES = {"active", "trial", "demo", "suspended", "expired"}


class StatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def check_status(cls, v: str) -> str:
        if v not in _VALID_STATUSES:
            raise ValueError(f"status must be one of: {sorted(_VALID_STATUSES)}")
        return v


@router.get("/clients")
async def list_clients(
    _user=Depends(require_roles("SUPER_ADMIN")),
):
    """Return all tenants with lifecycle metadata. SUPER_ADMIN only."""
    clients = await super_service.list_clients(prisma_client)
    return {"success": True, "data": clients}


@router.patch("/clients/{client_id}/status")
async def update_client_status(
    client_id: str = Path(..., description="Client UUID"),
    body: StatusUpdate = ...,
    _user=Depends(require_roles("SUPER_ADMIN")),
):
    """Change a tenant's lifecycle status. SUPER_ADMIN only."""
    result = await super_service.update_client_status(prisma_client, client_id, body.status)
    logger.info("👑 Super: %s status → %s", client_id, body.status)
    return {"success": True, "data": result}
