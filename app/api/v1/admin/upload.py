"""
app/api/v1/admin/upload.py
Generic image upload endpoint — Phase 53.
Mounted at: POST /api/v1/admin/upload
Auth:       USER JWT via get_current_tenant (resolves slug + client_id)

Context-based path routing (matches storage-tenant.md FOLDER_MAP):
  catalog_item  → catalog/{category_id}/{item_id}/
  page_hero     → pages/home/hero/
  page_logo     → pages/home/logo/
  page_story    → pages/home/story/
  page_demo     → pages/demo/
  page_gallery  → pages/home/gallery/ (Homepage Phase 2.4, 2026-08-18) -- falls through the
                   if/elif below unchanged, same as page_hero/page_logo/page_story/page_demo
                   (storage only; the real GalleryImage row is created by the second step,
                   POST /api/v1/admin/media/gallery-images, same 2-step pattern page_hero uses)
  unit_cover    → units/{unit_id}/cover/
  unit_gallery  → units/{unit_id}/gallery/
  barber        → staff/{barber_id}/ (Phase 3.7A, 2026-08-07) -- Barber.imageUrl is a plain field,
                   not a GalleryImage relation (one photo per barber, not a gallery), so this
                   context falls through the if/elif below unchanged, same as page_hero/page_logo.
  catalog_service → catalog-services/{service_id}/ (Staff/Store IA Separation, 2026-08-09) --
                   CatalogService.imageUrl is likewise a plain field, not a GalleryImage relation
                   (one photo per service) -- same fall-through pattern as barber above.

Authorization (Authorization Hardening, 2026-07-31): SUPER_ADMIN, TENANT_ADMIN only.

Ownership reasoning: this single endpoint spans unit photos AND catalog/page content — no
MANAGER_CATALOG/MANAGER_CONTENT role exists today, and MANAGER_UNITS already has an equivalent
path for unit_cover/unit_gallery via units.py's own /images sub-routes, so denying it here doesn't
remove real capability for that role. Conservative default per Salman's explicit call: keep
Admin-only until either a dedicated content role exists, or this gets split into
/upload/unit, /upload/catalog, /upload/page with per-context roles.
"""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from typing import Optional

from app.db.client import prisma_client
from app.db.dependencies import get_current_tenant
from app.core.tenant import require_roles
from app.services.storage_service import upload_to_gallery_path
from app.repositories import admin_catalog_repo as _cat_repo
from app.repositories import gallery_repo as _gallery
from app.repositories import UnitRepository
from app.repositories import barber_repo as _barber_repo
from app.repositories import catalog_service_repo as _catalog_service_repo

_unit_repo = UnitRepository(prisma_client)

router = APIRouter(prefix="/upload", tags=["Admin Upload"])

FOLDER_MAP = {
    "catalog_item":   "catalog/{category_id}/{item_id}",
    "page_hero":      "pages/home/hero",
    "page_logo":      "pages/home/logo",
    "page_story":     "pages/home/story",
    "page_gallery":   "pages/home/gallery",
    "page_demo":      "pages/demo",
    "unit_cover":     "units/{unit_id}/cover",
    "unit_gallery":   "units/{unit_id}/gallery",
    "barber":         "staff/{barber_id}",
    "catalog_service": "catalog-services/{service_id}",
}

IMAGE_TYPE_MAP = {
    "catalog_item":   "catalog",
    "page_hero":      "page_hero",
    "page_logo":      "page_logo",
    "page_story":     "gallery",
    "page_gallery":   "page_gallery",
    "page_demo":      "gallery",
    "unit_cover":     "cover",
    "unit_gallery":   "gallery",
    "barber":         "barber",
    "catalog_service": "catalog_service",
}


def _build_folder(context: str, category_id: str | None, item_id: str | None, unit_id: str | None, barber_id: str | None = None, service_id: str | None = None) -> str:
    template = FOLDER_MAP[context]
    return template.format(
        category_id=category_id or "",
        item_id=item_id or "",
        unit_id=unit_id or "",
        barber_id=barber_id or "",
        service_id=service_id or "",
    )


@router.post("/")
async def upload_image(
    file:        UploadFile      = File(...),
    context:     str             = Form(...),
    category_id: Optional[str]  = Form(None),
    item_id:     Optional[str]  = Form(None),
    unit_id:     Optional[str]  = Form(None),
    barber_id:   Optional[str]  = Form(None),
    service_id:  Optional[str]  = Form(None),
    caption_ar:  Optional[str]  = Form(None),
    caption_en:  Optional[str]  = Form(None),
    tenant:      dict            = Depends(get_current_tenant),
    _user:       dict            = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    if context not in FOLDER_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid context '{context}'. Valid: {list(FOLDER_MAP.keys())}",
        )

    # Validate required IDs per context
    if context == "catalog_item" and (not category_id or not item_id):
        raise HTTPException(status_code=400, detail="catalog_item context requires category_id and item_id")
    if context in ("unit_cover", "unit_gallery") and not unit_id:
        raise HTTPException(status_code=400, detail=f"{context} context requires unit_id")
    if context == "barber" and not barber_id:
        raise HTTPException(status_code=400, detail="barber context requires barber_id")
    if context == "catalog_service" and not service_id:
        raise HTTPException(status_code=400, detail="catalog_service context requires service_id")

    # Tenant Isolation (2026-08-30): catalog_item/unit_cover/unit_gallery below already verify
    # ownership before using an id in the storage path -- barber/catalog_service were the two
    # contexts missing that same check, letting a caller name another tenant's real barber_id/
    # service_id as a path segment. Path traversal itself is already closed at the storage-service
    # layer (segment sanitization), but the id should still belong to the calling tenant, same
    # as every other context here.
    if context == "barber":
        barber = await _barber_repo.find_barber(tenant["id"], barber_id)
        if not barber:
            raise HTTPException(status_code=404, detail="Barber not found")
    if context == "catalog_service":
        service = await _catalog_service_repo.find_catalog_service(tenant["id"], service_id)
        if not service:
            raise HTTPException(status_code=404, detail="Catalog service not found")

    folder = _build_folder(context, category_id, item_id, unit_id, barber_id, service_id)

    # File Upload Security Audit (2026-08-30): a missing/empty Content-Type header must NOT
    # silently default to an allowed value (that would let an attacker bypass the allowlist just
    # by omitting the header) -- pass it through as-is; storage_service's own allowlist check
    # rejects None/empty the same as any other disallowed value.
    public_url = await upload_to_gallery_path(
        client_slug=tenant["slug"],
        folder_context=folder,
        file=file,
        content_type=file.content_type,
        original_filename=file.filename or "",
    )

    image_type = IMAGE_TYPE_MAP[context]
    image_id   = None

    if context == "catalog_item":
        item = await _cat_repo.find_item(tenant["id"], item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Catalog item not found")

        img = await _gallery.create_gallery_image({
            "clientId":      tenant["id"],
            "catalogItemId": item_id,
            "imageType":     image_type,
            "url":           public_url,
            "caption_ar":    caption_ar,
            "caption_en":    caption_en,
        })
        image_id = img.id

    elif context in ("unit_cover", "unit_gallery"):
        unit = await _unit_repo.get_by_id(unit_id, tenant["id"])
        if not unit:
            raise HTTPException(status_code=404, detail="Unit not found")

        img = await _gallery.create_gallery_image({
            "clientId":   tenant["id"],
            "unitId":     unit_id,
            "imageType":  image_type,
            "url":        public_url,
            "caption_ar": caption_ar,
            "caption_en": caption_en,
        })
        image_id = img.id

    return {"url": public_url, "image_id": image_id}
