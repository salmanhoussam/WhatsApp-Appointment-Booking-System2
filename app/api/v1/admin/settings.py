"""
app/api/v1/admin/settings.py
Platform settings — read and update the Client's branding & config fields.

GET  /api/v1/admin/settings  — returns current client config
PATCH /api/v1/admin/settings — updates allowed fields

Auth: any valid tenant JWT (client OR admin user token both carry 'slug').
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db.client import prisma_client
from app.core.tenant import get_current_tenant, invalidate_tenant_cache, require_roles

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Admin Settings"])


# ── Pydantic schema ───────────────────────────────────────────────────────────

class SettingsUpdateRequest(BaseModel):
    name_ar:         Optional[str]       = None
    name_en:         Optional[str]       = None
    primary_color:   Optional[str]       = None
    page_type:       Optional[str]       = None
    template_key:    Optional[str]       = None
    hero_video_url:  Optional[str]       = None
    whatsapp_number: Optional[str]       = None
    instagram_url:   Optional[str]       = None
    maps_url:        Optional[str]       = None
    currency:        Optional[str]       = None
    payment_methods: Optional[List[str]] = None
    unit_types:      Optional[List[str]] = None
    features:        Optional[Dict[str, Any]] = None
    config:          Optional[Dict[str, Any]] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/settings")
async def get_settings(tenant: dict = Depends(get_current_tenant)):
    """Return all editable branding/config fields for this tenant's Client row."""
    try:
        client = await prisma_client.client.find_unique(where={"id": tenant["id"]})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        return {
            "slug":            client.slug,
            "name":            client.name,
            "name_ar":         client.name_ar,
            "name_en":         client.name_en,
            "primary_color":   client.primary_color,
            "page_type":       getattr(client, "pageType", None) or "normal",
            "hero_video_url":  client.hero_video_url,
            "whatsapp_number": client.whatsapp_number,
            "instagram_url":   getattr(client, "instagram_url", None),
            "maps_url":        getattr(client, "maps_url", None),
            "currency":        client.currency,
            "features":        client.features,
            "config":          getattr(client, "config", None) or {},
            "unit_types":      client.unit_types,
            "payment_methods": client.payment_methods,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔥 DB error fetching settings for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


@router.patch("/settings")
async def update_settings(
    body: SettingsUpdateRequest,
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """
    Partial update — only fields explicitly set in the request body are written.
    Clears the tenant cache so the next /public/config request picks up changes.
    """
    _CAMEL = {"page_type": "pageType", "template_key": "templateKey"}
    raw = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data = {_CAMEL.get(k, k): v for k, v in raw.items()}
    if not update_data:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")

    try:
        await prisma_client.client.update(
            where={"id": tenant["id"]},
            data=update_data,
        )
        # Bust the in-process TTL cache so public /config reflects immediately
        invalidate_tenant_cache(tenant["slug"])

        logger.info("⚙️  Settings updated for tenant '%s': %s", tenant["slug"], list(update_data.keys()))
        return {"success": True, "updated_fields": list(update_data.keys())}

    except Exception as e:
        logger.error(f"🔥 DB error updating settings for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")
