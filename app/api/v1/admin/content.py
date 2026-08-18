"""
app/api/v1/admin/content.py — Content Capability routes (hero.title, story.heading).

Tenant OS: each route is a direct call site for one "UpdateField" Operation -- not a generic
Dispatcher endpoint (.claudedocs/reviews/editing-engine-review.md S1a/Q7: a Dispatcher abstraction
is deferred until a second real Capability/Operation proves the routing shape actually repeats).
Deliberately not merged into one generic route either, per
.claudedocs/reviews/content-capability-review.md -- that's the same Dispatcher question, not a
separate one, and stays deferred with it.
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


class StoryHeadingUpdate(BaseModel):
    heading_ar: Optional[str] = None
    heading_en: Optional[str] = None


class SectionEnabledUpdate(BaseModel):
    enabled: bool


class SectionsReorderBody(BaseModel):
    ordered_types: list[str]


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


@router.get("/story-heading")
async def get_story_heading(
    tenant: dict = Depends(get_current_tenant),
):
    try:
        heading_ar = await content_service.get_story_heading(tenant["id"])
        return {"success": True, "data": {"heading_ar": heading_ar}}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/story-heading")
async def update_story_heading(
    body: StoryHeadingUpdate,
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """Second real Operation -- proves the same UpdateField shape repeats for a second field."""
    if body.heading_ar is None and body.heading_en is None:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")
    try:
        await content_service.update_story_heading(
            tenant["id"], heading_ar=body.heading_ar, heading_en=body.heading_en
        )
        invalidate_tenant_cache(tenant["slug"])
        logger.info("Content: story heading updated for tenant '%s'", tenant["slug"])
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"🔥 DB error updating story heading for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


@router.patch("/sections/{section_type}/enabled")
async def update_section_enabled(
    section_type: str,
    body: SectionEnabledUpdate,
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """Phase 2.1 (Homepage Section System) -- toggle one section's public-page visibility."""
    try:
        await content_service.set_section_enabled(tenant["id"], section_type, body.enabled)
        invalidate_tenant_cache(tenant["slug"])
        logger.info(
            "Content: section '%s' enabled=%s for tenant '%s'",
            section_type, body.enabled, tenant["slug"],
        )
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"🔥 DB error updating section enabled for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


@router.patch("/sections/reorder")
async def reorder_sections(
    body: SectionsReorderBody,
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """Phase 2.1 -- re-assign `order` for the given section types, in the given sequence."""
    try:
        await content_service.reorder_sections(tenant["id"], body.ordered_types)
        invalidate_tenant_cache(tenant["slug"])
        logger.info("Content: sections reordered for tenant '%s'", tenant["slug"])
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"🔥 DB error reordering sections for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")
