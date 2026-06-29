"""
app/api/v1/admin/gallery.py
Gallery image management — upload, list, reorder, caption, hide/show, delete.
Mounted at: /api/v1/admin/gallery
Auth:       JWT via get_current_tenant
Tenancy:    every query filtered by clientId from the token
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from app.db.client import prisma_client  # needed by _unit_repo instantiation
from app.db.dependencies import get_current_tenant
from app.services.storage_service import (
    upload_to_gallery_path as _svc_gallery_upload,
    delete_unit_image      as _svc_delete,
)
from app.repositories import gallery_repo as _gallery
from app.repositories import UnitRepository

_unit_repo = UnitRepository(prisma_client)

router = APIRouter(prefix="/gallery", tags=["Admin Gallery"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class CaptionUpdate(BaseModel):
    caption_ar: Optional[str]  = None
    caption_en: Optional[str]  = None
    span_size:  Optional[str]  = None
    is_active:  Optional[bool] = None


class ReorderItem(BaseModel):
    id:         str
    sort_order: int


# ── Serialiser ─────────────────────────────────────────────────────────────────

def _fmt(img) -> dict:
    return {
        "id":         img.id,
        "unit_id":    img.unitId,
        "url":        img.url,
        "sort_order": img.sort_order,
        "span_size":  getattr(img, "span_size", "small"),
        "caption_ar": img.caption_ar,
        "caption_en": img.caption_en,
        "is_active":  img.isActive,
        "created_at": img.createdAt.isoformat(),
    }


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/{unit_id}")
async def list_gallery(unit_id: str, tenant: dict = Depends(get_current_tenant)):
    unit = await _unit_repo.get_by_id(unit_id, tenant["id"])
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found.")

    images = await _gallery.list_gallery_images(unit_id, tenant["id"])
    return [_fmt(img) for img in images]


@router.post("/{unit_id}", status_code=201)
async def upload_gallery_image(
    unit_id:        str,
    file:           UploadFile = File(...),
    span_size:      str        = Form("small"),
    folder_context: str        = Form(None),
    tenant:         dict       = Depends(get_current_tenant),
):
    unit = await _unit_repo.get_by_id(unit_id, tenant["id"])
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found.")

    file_bytes = await file.read()
    ctx = folder_context or f"units/{unit_id}/gallery"
    public_url = await _svc_gallery_upload(
        client_slug=tenant["slug"],
        folder_context=ctx,
        file_bytes=file_bytes,
        content_type=file.content_type or "image/jpeg",
        original_filename=file.filename or "image.jpg",
    )

    count = await _gallery.count_gallery_images(unit_id, tenant["id"])
    img = await _gallery.create_gallery_image({
        "clientId":   tenant["id"],
        "unitId":     unit_id,
        "url":        public_url,
        "sort_order": count,
        "span_size":  span_size,
        "isActive":   True,
    })
    return _fmt(img)


@router.patch("/images/{image_id}")
async def update_gallery_image(
    image_id: str,
    body: CaptionUpdate,
    tenant: dict = Depends(get_current_tenant),
):
    existing = await _gallery.find_gallery_image(image_id, tenant["id"])
    if not existing:
        raise HTTPException(status_code=404, detail="Image not found.")

    patch: dict = {}
    if body.caption_ar is not None: patch["caption_ar"] = body.caption_ar
    if body.caption_en is not None: patch["caption_en"] = body.caption_en
    if body.span_size  is not None: patch["span_size"]  = body.span_size
    if body.is_active  is not None: patch["isActive"]   = body.is_active

    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update.")

    updated = await _gallery.update_gallery_image(image_id, patch)
    return _fmt(updated)


@router.put("/{unit_id}/reorder")
async def reorder_gallery(
    unit_id: str,
    body: List[ReorderItem],
    tenant: dict = Depends(get_current_tenant),
):
    unit = await _unit_repo.get_by_id(unit_id, tenant["id"])
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found.")

    for item in body:
        await _gallery.reorder_gallery_image(item.id, tenant["id"], item.sort_order)

    return {"success": True, "updated": len(body)}


@router.delete("/images/{image_id}", status_code=204)
async def delete_gallery_image(
    image_id: str,
    tenant: dict = Depends(get_current_tenant),
):
    existing = await _gallery.find_gallery_image(image_id, tenant["id"])
    if not existing:
        raise HTTPException(status_code=404, detail="Image not found.")

    await _svc_delete(existing.url)
    await _gallery.delete_gallery_image(image_id)
