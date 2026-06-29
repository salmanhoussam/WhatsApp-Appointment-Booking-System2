"""
app/api/v1/super/clients.py
Super Admin — Tenant management endpoints.
Mounted at /api/v1/super (see main.py).

All routes require role SUPER_ADMIN via require_roles() dependency.
"""

import logging
import re
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Path
from pydantic import BaseModel, EmailStr, field_validator

from app.db.client import prisma_client
from app.core.tenant import require_super_admin
from app.core.security import get_password_hash
from app.core.config import settings
from app.services import super_service, sheets_service

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


_VALID_PAGE_TYPES = {"normal", "showcase"}
_HEX_COLOR_RE     = re.compile(r"^#[0-9a-fA-F]{6}$")


class ClientSettingsUpdate(BaseModel):
    page_type:     str | None = None
    template_key:  str | None = None
    primary_color: str | None = None

    @field_validator("page_type")
    @classmethod
    def check_page_type(cls, v):
        if v is not None and v not in _VALID_PAGE_TYPES:
            raise ValueError(f"page_type must be one of: {sorted(_VALID_PAGE_TYPES)}")
        return v

    @field_validator("primary_color")
    @classmethod
    def check_primary_color(cls, v):
        if v is not None and not _HEX_COLOR_RE.match(v):
            raise ValueError("primary_color must be a valid 6-digit hex color (e.g. #d4a853)")
        return v


@router.patch("/clients/{client_id}/settings")
async def update_client_settings(
    client_id: str = Path(..., description="Client UUID"),
    body: ClientSettingsUpdate = ...,
    _user=Depends(require_super_admin),
):
    """Set page_type, template_key, and/or primary_color on a tenant. SUPER_ADMIN only."""
    data: dict = {}
    if body.page_type is not None:
        data["pageType"] = body.page_type
    if body.template_key is not None:
        data["templateKey"] = body.template_key
    if body.primary_color is not None:
        data["primary_color"] = body.primary_color
    if not data:
        raise HTTPException(400, "No fields to update")

    updated = await prisma_client.client.update(
        where={"id": client_id},
        data=data,
    )
    return {
        "success": True,
        "data": {
            "id":            updated.id,
            "page_type":     updated.pageType,
            "template_key":  updated.templateKey,
            "primary_color": updated.primary_color,
        },
    }


@router.patch("/clients/{client_id}/status")
async def update_client_status(
    background_tasks: BackgroundTasks,
    client_id: str = Path(..., description="Client UUID"),
    body: StatusUpdate = ...,
    _user=Depends(require_super_admin),
):
    """Change a tenant's lifecycle status. SUPER_ADMIN only."""
    result = await super_service.update_client_status(prisma_client, client_id, body.status)
    logger.info("👑 Super: %s status → %s", client_id, body.status)
    background_tasks.add_task(sheets_service.update_client_status, result["slug"], body.status)
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


# ── Catalog category seeding ───────────────────────────────────────────────────

_VALID_DISPLAY_TEMPLATES = {"grid", "list", "showcase"}


class CategorySeed(BaseModel):
    name_ar:          str
    name_en:          str
    display_template: str = "grid"


class SeedCategoriesRequest(BaseModel):
    template_key:   str
    categories:     list[CategorySeed]
    clear_existing: bool = False


@router.post("/clients/{client_id}/seed-categories", status_code=201)
async def seed_client_categories(
    client_id: str = Path(..., description="Client UUID"),
    body: SeedCategoriesRequest = ...,
    _user=Depends(require_super_admin),
):
    """
    Bulk-seed catalog categories for a tenant.
    Optionally wipes existing categories first (clear_existing=True).
    SUPER_ADMIN only.
    """
    # 1. Validate display_template values up-front
    invalid = [
        cat.display_template for cat in body.categories
        if cat.display_template not in _VALID_DISPLAY_TEMPLATES
    ]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid display_template value(s): {invalid}. Must be one of: {sorted(_VALID_DISPLAY_TEMPLATES)}",
        )

    # 2. Optionally wipe existing categories for this client
    if body.clear_existing:
        await prisma_client.catalogcategory.delete_many(
            where={"clientId": client_id}
        )
        logger.info("🗑️  Cleared existing catalog categories for client %s", client_id)

    # 3. Bulk-create new categories
    created = []
    for idx, cat in enumerate(body.categories):
        record = await prisma_client.catalogcategory.create(data={
            "clientId":        client_id,
            "nameAr":          cat.name_ar,
            "nameEn":          cat.name_en,
            "displayTemplate": cat.display_template,
            "moduleKey":       "catalog",
            "sortOrder":       idx,
            "isActive":        True,
        })
        created.append({
            "id":               record.id,
            "name_ar":          record.nameAr,
            "name_en":          record.nameEn,
            "display_template": record.displayTemplate,
            "sort_order":       record.sortOrder,
        })

    logger.info("🌱 Seeded %d catalog categories for client %s (template: %s)",
                len(created), client_id, body.template_key)

    return {
        "success": True,
        "data": {
            "template_key":  body.template_key,
            "created_count": len(created),
            "categories":    created,
        },
    }
