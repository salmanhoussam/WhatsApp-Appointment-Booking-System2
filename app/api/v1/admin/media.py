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
    # Additive (2026-08-17, Media/Content Foundation) -- defaults to "image" so any existing
    # caller of this route (none confirmed real yet, per TOS-002's own maturity review, but kept
    # safe regardless) is unaffected. "video" is the real, new case this field exists for.
    media_type: str = "image"


@router.get("/hero-image")
async def get_hero_image(
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """
    Media/Content Foundation (2026-08-17): now backed by a real GalleryImage row
    (imageType="page_hero") instead of the JSON-blob field -- see media_service.get_page_media.
    Falls back to the legacy JSON-blob field for any tenant that hasn't been migrated yet, so no
    existing tenant's admin UI breaks.

    Tenant Isolation Audit (2026-08-30) -- previously had no auth dependency (only
    `get_current_tenant`'s public-route-shaped fallback); every sibling PATCH/POST/DELETE route in
    this file already requires this same role check.
    """
    media = await media_service.get_page_media(tenant["id"], "page_hero")
    if media:
        return {"success": True, "data": {"image_url": media["url"], "media_type": media["media_type"]}}
    try:
        image_url = await media_service.get_hero_image(tenant["id"])
        return {"success": True, "data": {"image_url": image_url, "media_type": "image"}}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/hero-image")
async def update_hero_image(
    body: HeroImageUpdate,
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """
    Media/Content Foundation (2026-08-17): ReplaceMedia on the tenant's hero media (image OR
    video), now writing a real GalleryImage row (imageType="page_hero") instead of the old
    JSON-blob field -- the actual fix for the Media Capability's own documented "dual write-path
    never unified" finding (.claudedocs/maturity/media.md, Review 1).
    """
    try:
        await media_service.replace_page_media(tenant["id"], "page_hero", body.image_url, body.media_type)
        invalidate_tenant_cache(tenant["slug"])
        logger.info("Media: hero %s replaced for tenant '%s'", body.media_type, tenant["slug"])
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"🔥 DB error updating hero media for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


# ── Homepage Phase 2.4 (2026-08-18) — gallery, a collection not a singleton ────────────────────
# AddMedia/RemoveMedia/ReorderMedia on imageType="page_gallery" -- distinct Operation shape from
# hero's ReplaceMedia above (delete-then-create), same reasoning as media_service.py's own split.

class GalleryImageAdd(BaseModel):
    image_url: str
    media_type: str = "image"
    alt_text: Optional[str] = None
    caption_ar: Optional[str] = None


class GalleryReorder(BaseModel):
    ordered_ids: list[str]


@router.get("/gallery-images")
async def list_gallery_images(
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """Real rows for imageType=page_gallery -- what the admin Renderer shows as current state.

    Tenant Isolation Audit (2026-08-30) -- same missing-auth fix as get_hero_image() above.
    """
    images = await media_service.list_page_media(tenant["id"], "page_gallery")
    return {"success": True, "data": images}


@router.post("/gallery-images")
async def add_gallery_image(
    body: GalleryImageAdd,
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    try:
        await media_service.add_page_media(
            tenant["id"], "page_gallery", body.image_url, body.media_type, body.alt_text, body.caption_ar
        )
        invalidate_tenant_cache(tenant["slug"])
        logger.info("Media: gallery image added for tenant '%s'", tenant["slug"])
        return {"success": True}
    except Exception as e:
        logger.error(f"🔥 DB error adding gallery image for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


@router.delete("/gallery-images/{image_id}")
async def delete_gallery_image(
    image_id: str,
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    try:
        await media_service.remove_page_media(tenant["id"], image_id)
        invalidate_tenant_cache(tenant["slug"])
        logger.info("Media: gallery image %s removed for tenant '%s'", image_id, tenant["slug"])
        return {"success": True}
    except Exception as e:
        logger.error(f"🔥 DB error removing gallery image for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


@router.patch("/gallery-images/reorder")
async def reorder_gallery_images(
    body: GalleryReorder,
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    try:
        await media_service.reorder_page_media(tenant["id"], "page_gallery", body.ordered_ids)
        invalidate_tenant_cache(tenant["slug"])
        logger.info("Media: gallery images reordered for tenant '%s'", tenant["slug"])
        return {"success": True}
    except Exception as e:
        logger.error(f"🔥 DB error reordering gallery images for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")
