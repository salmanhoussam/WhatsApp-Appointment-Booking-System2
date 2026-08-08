"""
CatalogService Service — business logic for the CatalogService model (something a customer books
a Reservation for, distinct from CatalogItem). Phase 3.7C (2026-08-08). Named
catalog_service_service.py, not service_service.py -- that file already exists for the unrelated
`Service` (smar property add-on) model. No Prisma imports. All DB access via
app/repositories/catalog_service_repo.py.
"""

from typing import Optional

from fastapi import HTTPException

from app.repositories import catalog_service_repo


def _fmt(s) -> dict:
    return {
        "id":            s.id,
        "category_id":   s.categoryId,
        "name_ar":       s.nameAr,
        "name_en":       s.nameEn,
        "description_ar": s.descriptionAr,
        "description_en": s.descriptionEn,
        "image_url":     s.imageUrl,
        "price":         float(s.price) if s.price is not None else None,
        "currency":      s.currency,
        "duration_min":  s.durationMin,
        "is_active":     s.isActive,
        "is_featured":   s.isFeatured,
        "sort_order":    s.sortOrder,
        "metadata":      s.metadata or {},
    }


async def admin_list_services(client_id: str, include_inactive: bool, category_id: Optional[str]) -> list:
    rows = await catalog_service_repo.list_catalog_services(client_id, include_inactive, category_id)
    return [_fmt(r) for r in rows]


async def public_list_services(client_id: str) -> list:
    rows = await catalog_service_repo.list_catalog_services(client_id, include_inactive=False)
    return [_fmt(r) for r in rows]


async def admin_create_service(
    client_id:      str,
    category_id:    str,
    name_ar:        str,
    name_en:        Optional[str],
    description_ar: Optional[str],
    description_en: Optional[str],
    image_url:      Optional[str],
    price:          Optional[float],
    currency:       str,
    duration_min:   int,
    is_featured:    bool,
    sort_order:     int,
) -> dict:
    svc = await catalog_service_repo.create_catalog_service(data={
        "clientId":      client_id,
        "categoryId":    category_id,
        "nameAr":        name_ar,
        "nameEn":        name_en,
        "descriptionAr": description_ar,
        "descriptionEn": description_en,
        "imageUrl":      image_url,
        "price":         price,
        "currency":      currency,
        "durationMin":   duration_min,
        "isFeatured":    is_featured,
        "sortOrder":     sort_order,
        "isActive":      True,
    })
    return {"id": svc.id}


async def admin_update_service(
    client_id:      str,
    service_id:     str,
    name_ar:        Optional[str],
    name_en:        Optional[str],
    description_ar: Optional[str],
    description_en: Optional[str],
    image_url:      Optional[str],
    price:          Optional[float],
    currency:       Optional[str],
    duration_min:   Optional[int],
    is_featured:    Optional[bool],
    is_active:      Optional[bool],
    sort_order:     Optional[int],
) -> dict:
    existing = await catalog_service_repo.find_catalog_service(client_id, service_id)
    if not existing:
        raise HTTPException(404, "Service not found")
    patch = {k: v for k, v in {
        "nameAr":        name_ar,
        "nameEn":        name_en,
        "descriptionAr": description_ar,
        "descriptionEn": description_en,
        "imageUrl":      image_url,
        "price":         price,
        "currency":      currency,
        "durationMin":   duration_min,
        "isFeatured":    is_featured,
        "isActive":      is_active,
        "sortOrder":     sort_order,
    }.items() if v is not None}
    if not patch:
        raise HTTPException(400, "No fields to update.")
    updated = await catalog_service_repo.update_catalog_service(service_id, patch)
    return {"id": updated.id}
