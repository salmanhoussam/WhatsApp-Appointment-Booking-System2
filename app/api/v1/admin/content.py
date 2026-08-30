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

`GET /sections/schema` and `update_section_fields`'s server-side validation are TOS-005 Phase B,
2026-08-19 -- `app/schemas/section_schemas.py` is now the single real source of truth for which
fields exist on which section and what kind they are; this route imports it directly rather than
re-declaring anything, and the Dashboard fetches the same file's content via this new route rather
than hand-keeping a parallel copy (per TOS-005 §4.1's binding single-source-of-truth mechanics).
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.tenant import get_current_tenant, invalidate_tenant_cache, require_roles
from app.schemas.section_schemas import (
    SECTION_SCHEMAS,
    get_repeatable_field_schema,
    validate_fields,
    validate_repeatable_item,
)
from app.services import content_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/content", tags=["Admin Content"])


class SectionEnabledUpdate(BaseModel):
    enabled: bool


class SectionsReorderBody(BaseModel):
    ordered_types: list[str]


class SectionFieldsUpdate(BaseModel):
    fields: dict[str, Any]


class AddSectionBody(BaseModel):
    section_type: str
    enabled: bool = True


class RepeatableItemBody(BaseModel):
    item: Any  # dict for object-shaped repeatables (why_choose_us.items), or a bare scalar
               # (e.g. str) for item_kind ones (location.tags)


class RepeatableReorderBody(BaseModel):
    ordered_indices: list[int]


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
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """Phase 2.6 -- every real section for this tenant, what the Dashboard's Section Settings
    view renders as a list (type/order/enabled/data).

    Tenant Isolation Audit (2026-08-30) -- previously had no auth dependency at all (only
    `get_current_tenant`, which falls back to the client-supplied `X-Tenant-Slug` header/
    `?client_slug=` query param when no Bearer token is present -- by design, for PUBLIC routes).
    Every sibling PATCH/POST/DELETE route in this exact file already requires
    `require_roles("SUPER_ADMIN", "TENANT_ADMIN")` -- this GET route was the outlier, letting
    anyone read a tenant's section list with zero authentication just by naming a slug.
    """
    sections = await content_service.list_sections(tenant["id"])
    return {"success": True, "data": sections}


@router.post("/sections")
async def add_section(
    body: AddSectionBody,
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """
    Tenant OS Section Editor Phase 5's "materialize on first touch" gap, closed for real use
    (2026-08-20, Track B) -- every other route in this router requires the section to already
    exist in storage. Idempotent: adding an already-present type is a no-op, not an error. No
    general "Add Section" UI exists in the Dashboard yet (deliberately deferred, same shape as
    Footer in Phase 5) -- today's only real caller is scripts/add_products_section_rk.py.
    """
    if body.section_type not in SECTION_SCHEMAS:
        raise HTTPException(status_code=404, detail=f"Unknown section type: {body.section_type}")
    try:
        sections = await content_service.add_section(tenant["id"], body.section_type, body.enabled)
        invalidate_tenant_cache(tenant["slug"])
        logger.info("Content: section '%s' added for tenant '%s'", body.section_type, tenant["slug"])
        return {"success": True, "data": sections}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"🔥 DB error adding section for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


@router.get("/sections/schema")
async def get_sections_schema(
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """
    TOS-005 Phase B -- the Dashboard's only path to learn which fields exist on which section and
    what kind they are. No auth-scoped filtering: the schema is the same for every tenant (it
    describes what the *system* supports, not tenant-owned data); tenant resolution is required
    here only for consistency with every other route in this router, not because the response
    varies per tenant.
    """
    return {"success": True, "data": SECTION_SCHEMAS}


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
    validation_error = validate_fields(section_type, body.fields)
    if validation_error:
        raise HTTPException(status_code=422, detail=validation_error)
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


# ── Repeatable groups (TOS-005 Phase C, 2026-08-19) ─────────────────────────────────────────────
# One generic route family for every repeatable field on every section (story.stats,
# location.tags, why_choose_us.items, ...) -- never a section-specific add/edit/delete/reorder
# route. `{field}` and every item's shape are validated against section_schemas.py before any
# write, independent of the Dashboard (Salman's condition 4) -- a raw API call is rejected exactly
# the same way a Dashboard-originated one would be. The literal `/reorder` route is registered
# before the `/{index}` (int) route below it so it is never shadowed by that route's own path
# matching.

@router.get("/sections/{section_type}/repeatable/{field}")
async def list_repeatable_items(
    section_type: str,
    field: str,
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    if get_repeatable_field_schema(section_type, field) is None:
        raise HTTPException(
            status_code=404,
            detail=f"'{field}' is not a declared repeatable field on section '{section_type}'",
        )
    try:
        items = await content_service.list_repeatable_items(tenant["id"], section_type, field)
        return {"success": True, "data": items}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/sections/{section_type}/repeatable/{field}")
async def add_repeatable_item(
    section_type: str,
    field: str,
    body: RepeatableItemBody,
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    error = validate_repeatable_item(section_type, field, body.item)
    if error:
        raise HTTPException(status_code=422, detail=error)
    try:
        items = await content_service.add_repeatable_item(tenant["id"], section_type, field, body.item)
        invalidate_tenant_cache(tenant["slug"])
        logger.info("Content: item added to '%s.%s' for tenant '%s'", section_type, field, tenant["slug"])
        return {"success": True, "data": items}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"🔥 DB error adding repeatable item for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


@router.patch("/sections/{section_type}/repeatable/{field}/reorder")
async def reorder_repeatable_items(
    section_type: str,
    field: str,
    body: RepeatableReorderBody,
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    if get_repeatable_field_schema(section_type, field) is None:
        raise HTTPException(
            status_code=404,
            detail=f"'{field}' is not a declared repeatable field on section '{section_type}'",
        )
    try:
        items = await content_service.reorder_repeatable_items(
            tenant["id"], section_type, field, body.ordered_indices
        )
        invalidate_tenant_cache(tenant["slug"])
        logger.info("Content: '%s.%s' reordered for tenant '%s'", section_type, field, tenant["slug"])
        return {"success": True, "data": items}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"🔥 DB error reordering repeatable items for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


@router.patch("/sections/{section_type}/repeatable/{field}/{index}")
async def update_repeatable_item(
    section_type: str,
    field: str,
    index: int,
    body: RepeatableItemBody,
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    error = validate_repeatable_item(section_type, field, body.item)
    if error:
        raise HTTPException(status_code=422, detail=error)
    try:
        items = await content_service.update_repeatable_item(
            tenant["id"], section_type, field, index, body.item
        )
        invalidate_tenant_cache(tenant["slug"])
        logger.info("Content: '%s.%s[%d]' updated for tenant '%s'", section_type, field, index, tenant["slug"])
        return {"success": True, "data": items}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"🔥 DB error updating repeatable item for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


@router.delete("/sections/{section_type}/repeatable/{field}/{index}")
async def delete_repeatable_item(
    section_type: str,
    field: str,
    index: int,
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    if get_repeatable_field_schema(section_type, field) is None:
        raise HTTPException(
            status_code=404,
            detail=f"'{field}' is not a declared repeatable field on section '{section_type}'",
        )
    try:
        items = await content_service.delete_repeatable_item(tenant["id"], section_type, field, index)
        invalidate_tenant_cache(tenant["slug"])
        logger.info("Content: '%s.%s[%d]' deleted for tenant '%s'", section_type, field, index, tenant["slug"])
        return {"success": True, "data": items}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"🔥 DB error deleting repeatable item for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")
