"""
app/api/v1/admin/media.py — Media Capability routes.

Tenant OS: a direct call site for the "ReplaceMedia" Operation on media.hero.bg_image -- not a
generic Dispatcher endpoint, same reasoning as content.py (.claudedocs/reviews/
editing-engine-review.md S1a/Q7). Takes an already-uploaded URL, not a file -- the real upload happens through the
existing `POST /api/v1/admin/upload/` endpoint first; this route only decides where the
resulting URL is written.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.tenant import get_current_tenant, invalidate_tenant_cache, require_roles
from app.services import media_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/media", tags=["Admin Media"])


class HeroImageUpdate(BaseModel):
    image_url: str


@router.get("/hero-image")
async def get_hero_image(
    tenant: dict = Depends(get_current_tenant),
):
    try:
        image_url = await media_service.get_hero_image(tenant["id"])
        return {"success": True, "data": {"image_url": image_url}}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/hero-image")
async def update_hero_image(
    body: HeroImageUpdate,
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """The one real Operation Sprint 2 supports: ReplaceMedia on media.hero.bg_image."""
    try:
        await media_service.replace_hero_image(tenant["id"], body.image_url)
        invalidate_tenant_cache(tenant["slug"])
        logger.info("Media: hero image replaced for tenant '%s'", tenant["slug"])
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"🔥 DB error updating hero image for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")
