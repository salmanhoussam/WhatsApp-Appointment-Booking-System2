"""
Admin Restaurant API — /api/v1/admin/restaurant/
JWT required (TENANT_ADMIN or MANAGER_RESERVATIONS).
Categories and items are stored in CatalogCategory/CatalogItem (module_key='restaurant').

Authorization (Authorization Hardening, 2026-07-31, completing the docstring above's stated but
previously unenforced intent): all routes -> SUPER_ADMIN, TENANT_ADMIN, MANAGER_RESERVATIONS.
Found unenforced (get_current_admin_user only, no require_roles call) while finishing the
Authorization Hardening initiative -- same gap class as team.py/units.py/bookings.py, not a
separate initiative.
"""

from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db.dependencies import get_current_admin_user
from app.core.tenant import require_roles
from app.core.services import require_service
from app.repositories import admin_catalog_repo as _cat_repo

router = APIRouter()

ORDER_STATUSES = ["pending", "preparing", "ready", "delivered", "cancelled"]

RESTAURANT_TRANSITIONS: dict[str, set] = {
    "pending":   {"preparing", "cancelled"},
    "preparing": {"ready",     "cancelled"},
    "ready":     {"delivered", "cancelled"},
    "delivered": set(),
    "cancelled": set(),
}


# ── Serializers ───────────────────────────────────────────────────────────────

def _fmt_item(item) -> dict:
    meta = item.metadata or {}
    return {
        "id":             item.id,
        "category_id":    item.categoryId,
        "client_id":      item.clientId,
        "name_ar":        item.nameAr,
        "name_en":        item.nameEn,
        "description_ar": item.descriptionAr,
        "description_en": item.descriptionEn,
        "image_url":      item.imageUrl,
        "price":          str(item.price) if item.price is not None else "0",
        "currency":       item.currency,
        "is_available":   item.isActive,
        "sort_order":     item.sortOrder,
        "calories":       meta.get("calories"),
        "is_spicy":       meta.get("spicy", False),
    }


def _fmt_category(cat) -> dict:
    return {
        "id":         cat.id,
        "name_ar":    cat.nameAr,
        "name_en":    cat.nameEn,
        "image_url":  cat.imageUrl,
        "sort_order": cat.sortOrder,
        "is_active":  cat.isActive,
    }


def _fmt_order(order) -> dict:
    return {
        "id":             order.id,
        "status":         order.status,
        "total_price":    str(order.totalPrice),
        "currency":       order.currency,
        "customer_name":  order.customerName,
        "customer_phone": order.customerPhone,
        "table_number":   order.tableNumber,
        "notes":          order.notes,
        "created_at":     order.createdAt.isoformat(),
        "items": [
            {
                "catalog_item_id": oi.catalogItemId,
                "quantity":        oi.quantity,
                "unit_price":      str(oi.unitPrice),
                "notes":           oi.notes,
            }
            for oi in (order.items or [])
        ],
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

class CategoryIn(BaseModel):
    name_ar:    str
    name_en:    Optional[str] = None
    image_url:  Optional[str] = None
    sort_order: int = 0


@router.get("/menu/categories")
async def list_categories(
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("restaurant")),
    _role=Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS")),
):
    cats = await _cat_repo.list_categories(
        client_id=str(user.clientId),
        module_key="restaurant",
        include_inactive=True,
    )
    return {"success": True, "data": [_fmt_category(c) for c in cats]}


@router.post("/menu/categories")
async def create_category(
    body: CategoryIn,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("restaurant")),
    _role=Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS")),
):
    cat = await _cat_repo.create_category(data={
        "clientId":  str(user.clientId),
        "moduleKey": "restaurant",
        "nameAr":    body.name_ar,
        "nameEn":    body.name_en,
        "imageUrl":  body.image_url,
        "sortOrder": body.sort_order,
    })
    return {"success": True, "data": _fmt_category(cat)}


@router.patch("/menu/categories/{category_id}")
async def update_category(
    category_id: str,
    body: CategoryIn,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("restaurant")),
    _role=Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS")),
):
    cat = await _cat_repo.find_active_category(
        str(user.clientId), category_id, module_key="restaurant"
    )
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")

    updated = await _cat_repo.update_category(str(user.clientId), category_id, {
        "nameAr":    body.name_ar,
        "nameEn":    body.name_en,
        "imageUrl":  body.image_url,
        "sortOrder": body.sort_order,
    })
    return {"success": True, "data": _fmt_category(updated)}


@router.delete("/menu/categories/{category_id}")
async def delete_category(
    category_id: str,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("restaurant")),
    _role=Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS")),
):
    result = await _cat_repo.delete_category_by_filter(
        str(user.clientId), category_id, module_key="restaurant"
    )
    if result.count == 0:
        raise HTTPException(status_code=404, detail="Category not found.")
    return {"success": True}


# ── Menu Item CRUD ────────────────────────────────────────────────────────────

class CatalogItemIn(BaseModel):
    category_id:    str
    name_ar:        str
    name_en:        Optional[str] = None
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    image_url:      Optional[str] = None
    price:          float
    is_available:   bool = True
    sort_order:     int = 0
    calories:       Optional[int] = None
    is_spicy:       bool = False


@router.get("/menu/items")
async def list_items(
    category_id: Optional[str] = None,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("restaurant")),
    _role=Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS")),
):
    items = await _cat_repo.list_items(
        client_id=str(user.clientId),
        category_id=category_id,
        module_key="restaurant",
        include_inactive=True,
    )
    return {"success": True, "data": [_fmt_item(i) for i in items]}


@router.post("/menu/items")
async def create_item(
    body: CatalogItemIn,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("restaurant")),
    _role=Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS")),
):
    client_id  = str(user.clientId)
    restaurant = await _get_restaurant(client_id)

    cat = await _cat_repo.find_active_category(client_id, body.category_id, module_key="restaurant")
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")

    meta = {}
    if body.calories is not None:
        meta["calories"] = body.calories
    if body.is_spicy:
        meta["spicy"] = True

    item = await _cat_repo.create_item(data={
        "clientId":      client_id,
        "categoryId":    body.category_id,
        "nameAr":        body.name_ar,
        "nameEn":        body.name_en,
        "descriptionAr": body.description_ar,
        "descriptionEn": body.description_en,
        "imageUrl":      body.image_url,
        "price":         body.price,
        "currency":      restaurant.currency,
        "isActive":      body.is_available,
        "sortOrder":     body.sort_order,
        "metadata":      meta if meta else None,
    })
    return {"success": True, "data": _fmt_item(item)}


@router.patch("/menu/items/{item_id}")
async def update_item(
    item_id: str,
    body: CatalogItemIn,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("restaurant")),
    _role=Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS")),
):
    client_id = str(user.clientId)
    item = await _cat_repo.find_item(client_id, item_id, module_key="restaurant")
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    meta = {}
    if body.calories is not None:
        meta["calories"] = body.calories
    if body.is_spicy:
        meta["spicy"] = True

    updated = await _cat_repo.update_item(client_id, item_id, {
        "categoryId":    body.category_id,
        "nameAr":        body.name_ar,
        "nameEn":        body.name_en,
        "descriptionAr": body.description_ar,
        "descriptionEn": body.description_en,
        "imageUrl":      body.image_url,
        "price":         body.price,
        "isActive":      body.is_available,
        "sortOrder":     body.sort_order,
        "metadata":      meta if meta else None,
    })
    return {"success": True, "data": _fmt_item(updated)}


@router.delete("/menu/items/{item_id}")
async def delete_item(
    item_id: str,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("restaurant")),
    _role=Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS")),
):
    client_id = str(user.clientId)
    result = await _cat_repo.delete_item_by_filter(client_id, item_id, module_key="restaurant")
    if result.count == 0:
        raise HTTPException(status_code=404, detail="Item not found.")
    return {"success": True}


class OrderStatusIn(BaseModel):
    status: str


# ── Orders ────────────────────────────────────────────────────────────────────

