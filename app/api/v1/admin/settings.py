"""
app/api/v1/admin/settings.py
Platform settings — read and update the Client's branding & config fields.

GET  /api/v1/admin/settings  — returns current client config
PATCH /api/v1/admin/settings — updates allowed fields

Auth: any valid tenant JWT (client OR admin user token both carry 'slug').
"""

import base64
import io
import logging
import os

from app.core.phone import normalize_for_storage
from typing import Any, Dict, List, Optional

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.core.security import decode_token
from app.core.services import get_client_services
from app.core.tenant import get_current_tenant, invalidate_tenant_cache, require_roles, allow_during_soft_block
from app.services import site_configuration_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Admin Settings"])

# Canonical public URL base for a PRINTED code. Overridable via env for other environments.
#
# Ratified by Salman 2026-10-01: `alzabt.salmansaas.com`, "ليعتمده الكلاينت". It deliberately does
# NOT follow `lifecycle_state` (trial → demo, subscribed → alzabt, rules/frontend/routing.md),
# and the reason is the artefact itself: this URL gets PRINTED and taped to a counter. A
# lifecycle-derived host would silently change the day a tenant converts from trial to subscribed,
# and every printed sheet would stop working. A printed link must be the one thing that cannot move.
STORE_QR_BASE_URL = os.getenv("STORE_QR_BASE_URL", "https://alzabt.salmansaas.com")

# Which public page a scanned code should land on, per module.
#
# 🔴 WHY THIS EXISTS: the path used to be the literal string "store", written when this endpoint was
# built for the Store Template Pilot (2026-07-31). Measured in a real browser 2026-10-01:
# `/caracas/store` renders NOTHING — zero text after 45 seconds — while `/caracas/menu` renders the
# full 97-item menu. So the QR the dashboard offered a restaurant owner pointed at a blank page, and
# printing it would have sent every customer to a white screen.
#
# Derived from the tenant's OWN active services rather than from a new field, because
# `client_services` is already the one gate (`rules/backend/service-system.md` §3) and
# `VERTICAL_REGISTRY`'s ownership boundary forbids adding a fifth key without an explicit decision.
# Restaurant wins over store deliberately: a restaurant tenant also carries `catalog`, and the menu
# is what its customers scan for.
# Order matters. `reservations` deliberately maps to None rather than to a guessed path: a barber or
# a clinic also carries `store`, so a naive services lookup sent `rk` — a real paying tenant — to
# `/rk/store` instead of wherever its customers actually book. Nobody has asked for a code for those
# verticals yet, and inventing a path for them is how `/caracas/store` happened in the first place.
_QR_PATH_BY_SERVICE = (
    ("restaurant.menu", "menu"),
    ("restaurant",      "menu"),
    ("reservations",    None),
    ("store",           "store"),
)


def _qr_path_for(active_services: List[str]) -> Optional[str]:
    """The public path for a printed code, or None when we genuinely do not know.

    None is not a failure mode — it falls back to the bare `/{slug}`, which `DynamicTenantResolver`
    redirects to that tenant's own `defaultRedirect`. That is the honest answer for a vertical
    nobody has printed a code for yet (barber, clinic): send them to the tenant's canonical landing
    page rather than guess a path that may render blank, which is the exact bug this function fixes.
    """
    svc = set(active_services or [])
    for key, path in _QR_PATH_BY_SERVICE:
        if key in svc:
            return path
    return None


async def _require_valid_tenant_jwt(request: Request) -> None:
    """
    Tenant Isolation Audit (2026-08-30) -- this router's own GET routes previously relied on
    `get_current_tenant` alone, which is designed for public routes too: with no Bearer token
    present (or an invalid one), it falls back to the client-supplied `X-Tenant-Slug` header or
    `?client_slug=` query param -- letting anyone read a tenant's settings with zero
    authentication, just by naming a slug. This router intentionally accepts BOTH client and admin
    tokens (this file's own module docstring), so the fix is not `require_roles` (which would
    reject a valid client token) -- it's requiring a real, valid, slug-bearing JWT to be present at
    all, so `get_current_tenant`'s own JWT branch is guaranteed to be the one that resolves it.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header. Expected: Bearer <token>",
        )
    payload = decode_token(auth[7:])
    if not payload or not payload.get("slug"):
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


# ── Pydantic schema ───────────────────────────────────────────────────────────

class SettingsUpdateRequest(BaseModel):
    name_ar:         Optional[str]       = None
    name_en:         Optional[str]       = None
    primary_color:   Optional[str]       = None
    page_type:       Optional[str]       = None
    template_key:    Optional[str]       = None
    whatsapp_number: Optional[str]       = None
    instagram_url:   Optional[str]       = None
    maps_url:        Optional[str]       = None
    # The shop's public contact address, rendered as a mailto: link in the footer. Deliberately a
    # plain str, not EmailStr: this is the only way to CLEAR the field (send "") once set, and the
    # value is displayed, never used to authenticate. Owner login identity lives on User.email
    # (Decision Gate Q3, 2026-09-10) and is validated there.
    email:           Optional[str]       = None
    currency:        Optional[str]       = None
    payment_methods: Optional[List[str]] = None
    unit_types:      Optional[List[str]] = None
    features:        Optional[Dict[str, Any]] = None
    config:          Optional[Dict[str, Any]] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/settings")
async def get_settings(
    _soft_block = Depends(allow_during_soft_block),  # ADR-0002 §9.1: first live Soft Block allowlist consumer - must be declared first
    _auth = Depends(_require_valid_tenant_jwt),
    tenant: dict = Depends(get_current_tenant),
):
    """Return all editable branding/config fields for this tenant's Client row."""
    try:
        client = await site_configuration_service.get_client(tenant["id"])
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        return {
            "slug":            client.slug,
            "name":            client.name,
            "name_ar":         client.name_ar,
            "name_en":         client.name_en,
            "primary_color":   client.primary_color,
            "page_type":       getattr(client, "pageType", None) or "normal",
            "whatsapp_number": client.whatsapp_number,
            "instagram_url":   getattr(client, "instagram_url", None),
            "maps_url":        getattr(client, "maps_url", None),
            "email":           getattr(client, "email", None),
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
    _soft_block = Depends(allow_during_soft_block),  # ADR-0002 §9.1 - must be declared before get_current_tenant/require_roles
    tenant: dict = Depends(get_current_tenant),
    _user = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """
    Partial update — only fields explicitly set in the request body are written.
    Clears the tenant cache so the next /public/config request picks up changes.
    """
    raw = {k: v for k, v in body.model_dump().items() if v is not None}
    if not raw:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")

    # Phone Numbers rule (.claude/rules/phone-numbers.md, 2026-09-08). This column is the merchant
    # alert target -- _notify_merchant_new_reservation() reads Client.whatsapp_number to tell the
    # shop a booking arrived. Stored without a country code, that alert is silently dropped by Meta.
    if raw.get("whatsapp_number"):
        raw["whatsapp_number"] = normalize_for_storage(raw["whatsapp_number"])

    try:
        updated = await site_configuration_service.update_settings(tenant["id"], raw)
        # Bust the in-process TTL cache so public /config reflects immediately
        invalidate_tenant_cache(tenant["slug"])

        updated_fields = list(raw.keys())
        logger.info("⚙️  Settings updated for tenant '%s': %s", tenant["slug"], updated_fields)
        return {"success": True, "updated_fields": updated_fields}

    except Exception as e:
        logger.error(f"🔥 DB error updating settings for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


@router.get("/settings/qr")
async def get_store_qr(
    _soft_block = Depends(allow_during_soft_block),  # ADR-0002 §9.1 — must be declared first
    _auth = Depends(_require_valid_tenant_jwt),
    tenant: dict = Depends(get_current_tenant),
):
    """
    Generate a QR code image encoding this tenant's real public store URL, for the merchant to
    display/print (Store Template Pilot, 2026-07-31 — "no complex QR system, generating a QR for
    the store's public page is enough" per Salman's explicit scope). Not stored — generated fresh
    on every call, since the URL itself never changes and there's nothing to cache.
    """
    services = await get_client_services(tenant["id"])
    path     = _qr_path_for(services)
    url      = f"{STORE_QR_BASE_URL}/{tenant['slug']}" + (f"/{path}" if path else "")

    # ERROR_CORRECT_H, not the default M: it tolerates ~30% damage, which is what makes it legal to
    # cover the centre with a logo later AND what keeps a printed sheet scannable after it has been
    # handled, splashed and taped to a counter for a year.
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=16, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    png_base64 = base64.b64encode(buf.getvalue()).decode("ascii")

    return {
        "success": True,
        "data": {
            "url":        url,
            "image_b64":  png_base64,
            # The frontend prints a card around this; it needs to know what it is pointing at and
            # how big the code really is, rather than re-deriving either.
            "path":       path,
            "size_px":    img.size[0],
        },
    }
