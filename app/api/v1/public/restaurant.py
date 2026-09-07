"""
Public Restaurant API — /api/v1/public/restaurant/
No auth required. All endpoints gated by require_service("restaurant").
Categories and items from CatalogCategory/CatalogItem (module_key='restaurant').
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.db.dependencies import get_current_tenant
from app.core.services import require_service
import app.repositories.restaurant_repo as restaurant_repo

router = APIRouter()


# ── Serializers ───────────────────────────────────────────────────────────────

def _fmt_item(item) -> dict:
    meta = item.metadata or {}
    return {
        "id":             item.id,
        "category_id":    item.categoryId,
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


def _fmt_category(cat, include_items: bool = True) -> dict:
    result = {
        "id":         cat.id,
        "name_ar":    cat.nameAr,
        "name_en":    cat.nameEn,
        "image_url":  cat.imageUrl,
        "sort_order": cat.sortOrder,
    }
    if include_items and cat.items is not None:
        result["items"] = [_fmt_item(i) for i in cat.items if i.isActive]
    return result


@router.get("/menu/categories")
async def get_categories(
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("restaurant")),
):
    """Categories only, without items — for tab navigation."""
    categories = await restaurant_repo.list_menu_categories(tenant["id"], include_items=False)
    return {
        "success": True,
        "data": [_fmt_category(c, include_items=False) for c in categories],
    }


@router.get("/menu/categories/{category_id}/items")
async def get_category_items(
    category_id: str,
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("restaurant")),
):
    """Items for a specific category."""
    category = await restaurant_repo.find_menu_category_with_items(tenant["id"], category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")

    return {
        "success": True,
        "data": [_fmt_item(i) for i in (category.items or []) if i.isActive],
    }


# ── Order Creation ─────────────────────────────────────────────────────────────

class OrderItemIn(BaseModel):
    catalog_item_id: str
    quantity:        int = 1
    notes:           Optional[str] = None


class CreateOrderIn(BaseModel):
    customer_name:  str
    customer_phone: str
    table_number:   Optional[str] = None
    notes:          Optional[str] = None
    items:          list[OrderItemIn]


