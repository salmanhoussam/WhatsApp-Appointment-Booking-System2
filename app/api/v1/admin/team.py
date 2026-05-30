"""
app/api/v1/admin/team.py
Team (staff/managers) management — mounted at /api/v1/admin/team.
"""

import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from app.core.tenant import get_current_tenant
from app.core.security import get_password_hash
from app.repositories import user_repo as _repo

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Admin Team"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class TeamMemberCreate(BaseModel):
    full_name: str
    email:     EmailStr
    password:  str
    role:      Literal["MANAGER_RESERVATIONS", "MANAGER_UNITS"] = "MANAGER_RESERVATIONS"


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/team")
async def list_team(tenant: dict = Depends(get_current_tenant)):
    """Return all active users for this tenant — passwords excluded."""
    try:
        users = await _repo.find_users_by_client(tenant["id"])
        return [
            {
                "id":         u.id,
                "full_name":  u.fullName,
                "email":      u.email,
                "role":       u.role,
                "is_active":  u.isActive,
                "created_at": u.createdAt.isoformat() if u.createdAt else None,
            }
            for u in users
        ]
    except Exception as e:
        logger.error(f"🔥 DB error listing team for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


@router.post("/team", status_code=201)
async def create_team_member(
    body: TeamMemberCreate,
    tenant: dict = Depends(get_current_tenant),
):
    """
    Create a new staff member.
    clientId is forced to the requesting tenant — cross-tenant creation is impossible.
    Password is bcrypt-hashed before storage.
    """
    try:
        existing = await _repo.find_user_by_email(body.email)
        if existing:
            raise HTTPException(status_code=409, detail="البريد الإلكتروني مستخدم بالفعل")

        hashed = get_password_hash(body.password)
        user = await _repo.create_user(data={
            "clientId":      tenant["id"],   # CRITICAL: always the current tenant
            "fullName":      body.full_name,
            "email":         body.email,
            "password_hash": hashed,
            "role":          body.role,
        })

        logger.info("👤 New team member created: %s (%s) for tenant %s",
                    user.email, user.role, tenant["slug"])

        return {
            "id":         user.id,
            "full_name":  user.fullName,
            "email":      user.email,
            "role":       user.role,
            "is_active":  user.isActive,
            "created_at": user.createdAt.isoformat() if user.createdAt else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔥 DB error creating team member: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


@router.delete("/team/{user_id}", status_code=200)
async def deactivate_team_member(
    user_id: str,
    tenant: dict = Depends(get_current_tenant),
):
    """Soft-deactivate a team member. Verifies ownership before acting."""
    try:
        user = await _repo.find_user_by_id(user_id, tenant["id"])
        if not user:
            raise HTTPException(status_code=404, detail="العضو غير موجود")

        await _repo.deactivate_user(user_id, tenant["id"])
        logger.info("🗑️  Team member deactivated: %s for tenant %s", user.email, tenant["slug"])
        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔥 DB error deactivating user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")
