"""
app/api/v1/super/clients.py
Super Admin — Tenant management endpoints.
Mounted at /api/v1/super (see main.py).

All routes require role SUPER_ADMIN via require_roles() dependency.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, EmailStr, field_validator

from app.db.client import prisma_client
from app.core.tenant import require_super_admin
from app.core.security import get_password_hash
from app.core.config import settings
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
    _user=Depends(require_super_admin),
):
    """Return all tenants with lifecycle metadata. SUPER_ADMIN only."""
    clients = await super_service.list_clients(prisma_client)
    return {"success": True, "data": clients}


@router.patch("/clients/{client_id}/status")
async def update_client_status(
    client_id: str = Path(..., description="Client UUID"),
    body: StatusUpdate = ...,
    _user=Depends(require_super_admin),
):
    """Change a tenant's lifecycle status. SUPER_ADMIN only."""
    result = await super_service.update_client_status(prisma_client, client_id, body.status)
    logger.info("👑 Super: %s status → %s", client_id, body.status)
    return {"success": True, "data": result}


# ── Super Admin account management ────────────────────────────────────────────

class CreateSuperAdminRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

    @field_validator("password")
    @classmethod
    def password_min(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


@router.post("/admins")
async def create_super_admin(
    body: CreateSuperAdminRequest,
    _caller=Depends(require_super_admin),
):
    """
    Create a SUPER_ADMIN User account.
    Protected: requires existing super admin access (smar client JWT or SUPER_ADMIN User JWT).
    After creation, log in via POST /api/v1/auth/users/login.
    """
    smar = await prisma_client.client.find_unique(where={"slug": settings.SUPER_ADMIN_SLUG})
    if not smar:
        raise HTTPException(404, "Platform owner client not found.")

    existing = await prisma_client.user.find_unique(where={"email": body.email})
    if existing:
        raise HTTPException(409, "Email already registered.")

    user = await prisma_client.user.create(data={
        "clientId":      smar.id,
        "email":         body.email,
        "password_hash": get_password_hash(body.password),
        "fullName":      body.full_name,
        "role":          "SUPER_ADMIN",
        "isActive":      True,
    })

    logger.info("👑 Super Admin account created: %s", body.email)
    return {"success": True, "data": {"user_id": user.id, "email": user.email, "role": str(user.role)}}
