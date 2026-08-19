"""
app/api/v1/admin/content.py — Content Capability routes: section discovery, enabled/reorder,
generic scalar-field updates.

`PATCH /sections/{type}/fields` is the one real Contract for every scalar field, including
`hero.title`/`story.heading` -- unified here per TOS-005 (CMS Generic Engine) Phase A, 2026-08-19.
Those two fields previously had their own dedicated routes (`/hero-title`, `/story-heading`),
predating this route and never reconciled with it -- confirmed via `sectionFieldHelpers.js` that
both paths always wrote the identical `config.content.sections[type].data[field]` JSON location,
so this migration changes only which route the Inline Editing Interface
(`frontend/src/tenant-os/EditableRegion.jsx` + `schemas/content.js`) calls, not the data model or
the Inline UI itself. See `.claudedocs/adr/TOS-005-cms-generic-engine.md` §1.1/§4.3 for the full
finding and decision; `.claudedocs/implementation/TOS-005/CONTRACT.md` Phase A for this migration's
own acceptance test.

This route became the real Dispatcher `editing-engine-review.md` S1a/Q7 deferred "until a second
real Capability/Operation proves the routing shape actually repeats" -- `ALZABT_HOMEPAGE_
SECTION_SETTINGS_CONTRACT.md` named 9 real sections needing the identical shape (Homepage Phase
2.6, 2026-08-18); TOS-005 Phase A is what actually retires the last two per-field holdouts onto it.
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.tenant import get_current_tenant, invalidate_tenant_cache, require_roles
from app.services import content_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/content", tags=["Admin Content"])


class SectionEnabledUpdate(BaseModel):
    enabled: bool


class SectionsReorderBody(BaseModel):
    ordered_types: list[str]


class SectionFieldsUpdate(BaseModel):
    fields: dict[str, Any]


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


@router.get("/sections")
async def list_sections(
    tenant: dict = Depends(get_current_tenant),
):
    """Phase 2.6 -- every real section for this tenant, what the Dashboard's Section Settings
    view renders as a list (type/order/enabled/data)."""
    sections = await content_service.list_sections(tenant["id"])
    return {"success": True, "data": sections}


@router.patch("/sections/{section_type}/fields")
async def update_section_fields(
    section_type: str,
    body: SectionFieldsUpdate,
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """
    Phase 2.6 -- the generic "UpdateField" Operation, one route for every section's real text/
    settings fields named in ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md (title_ar, body_ar,
    limit, variant, maps_url, ...). Media fields with their own dedicated Renderer (hero, gallery)
    are deliberately excluded from this route's real usage by the Contract, not by a code-level
    restriction here -- the underlying mechanic doesn't distinguish field kinds, the Dashboard UI
    does, per the Contract's own "excluded from the generic editor" column.
    """
    if not body.fields:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")
    try:
        await content_service.update_section_fields(tenant["id"], section_type, body.fields)
        invalidate_tenant_cache(tenant["slug"])
        logger.info("Content: section '%s' fields updated for tenant '%s'", section_type, tenant["slug"])
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"🔥 DB error updating section fields for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")
