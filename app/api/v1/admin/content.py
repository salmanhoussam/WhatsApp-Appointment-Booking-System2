"""
app/api/v1/admin/content.py — Content Capability, Sprint 1 scope only (Hero Title).

Tenant OS: this route is the one real call site for the "UpdateField" Operation on
content.hero.title -- a direct call into content_service.py, not a generic Dispatcher
(TENANT_OS_IMPLEMENTATION_REVIEW.md S1a/Q7: a Dispatcher abstraction is deferred until a second
real Capability/Operation proves the routing shape actually repeats).
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.tenant import get_current_tenant, invalidate_tenant_cache, require_roles
from app.services import content_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/content", tags=["Admin Content"])


class HeroTitleUpdate(BaseModel):
    title_ar: Optional[str] = None
    title_en: Optional[str] = None


@router.get("/hero-title")
async def get_hero_title(
    tenant: dict = Depends(get_current_tenant),
):
    """Read-side — also what Discovery uses to show the field's current value."""
    try:
        title_ar = await content_service.get_hero_title(tenant["id"])
        return {"success": True, "data": {"title_ar": title_ar}}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/hero-title")
async def update_hero_title(
    body: HeroTitleUpdate,
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """The one real Operation Sprint 1 supports: UpdateField on content.hero.title."""
    if body.title_ar is None and body.title_en is None:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")
    try:
        await content_service.update_hero_title(
            tenant["id"], title_ar=body.title_ar, title_en=body.title_en
        )
        invalidate_tenant_cache(tenant["slug"])
        logger.info("Content: hero title updated for tenant '%s'", tenant["slug"])
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"🔥 DB error updating hero title for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")
