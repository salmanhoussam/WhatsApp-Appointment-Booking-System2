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
  unit_cover    → units/{unit_id}/cover/
  unit_gallery  → units/{unit_id}/gallery/
"""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from typing import Optional

from app.db.client import prisma_client
from app.db.dependencies import get_current_tenant
from app.services.storage_service import upload_to_gallery_path
from app.repositories import admin_catalog_repo as _cat_repo
from app.repositories import gallery_repo as _gallery
from app.repositories import UnitRepository

_unit_repo = UnitRepository(prisma_client)

router = APIRouter(prefix="/upload", tags=["Admin Upload"])

FOLDER_MAP = {
    "catalog_item":   "catalog/{category_id}/{item_id}",
    "page_hero":      "pages/home/hero",
    "page_hero_video":"pages/home/hero",
    "page_logo":      "pages/home/logo",
    "page_story":     "pages/home/story",
    "page_demo":      "pages/demo",
    "unit_cover":     "units/{unit_id}/cover",
    "unit_gallery":   "units/{unit_id}/gallery",
}

IMAGE_TYPE_MAP = {
    "catalog_item":   "catalog",
    "page_hero":      "page_hero",
    "page_hero_video":"page_hero",
    "page_logo":      "page_logo",
    "page_story":     "gallery",
    "page_demo":      "gallery",
    "unit_cover":     "cover",
    "unit_gallery":   "gallery",
}


def _build_folder(context: str, category_id: str | None, item_id: str | None, unit_id: str | None) -> str:
    template = FOLDER_MAP[context]
    return template.format(
        category_id=category_id or "",
        item_id=item_id or "",
        unit_id=unit_id or "",
    )


@router.post("/")
async def upload_image(
    file:        UploadFile      = File(...),
    context:     str             = Form(...),
    category_id: Optional[str]  = Form(None),
    item_id:     Optional[str]  = Form(None),
    unit_id:     Optional[str]  = Form(None),
    caption_ar:  Optional[str]  = Form(None),
    caption_en:  Optional[str]  = Form(None),
    tenant:      dict            = Depends(get_current_tenant),
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

    folder     = _build_folder(context, category_id, item_id, unit_id)
    file_bytes = await file.read()

    public_url = await upload_to_gallery_path(
        client_slug=tenant["slug"],
        folder_context=folder,
        file_bytes=file_bytes,
        content_type=file.content_type or "image/jpeg",
        original_filename=file.filename or "image.jpg",
    )

    image_type = IMAGE_TYPE_MAP[context]
    image_id   = None

    if context == "page_hero_video":
        from app.repositories import admin_client_repo as _client_repo
        await _client_repo.update_client(tenant["id"], {"hero_video_url": public_url})
        return {"url": public_url, "image_id": None, "saved_to": "hero_video_url"}

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
