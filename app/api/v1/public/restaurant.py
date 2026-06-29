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

async def _get_restaurant(client_id: str):
    restaurant = await restaurant_repo.find_restaurant_config(client_id)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not configured for this tenant.")
    return restaurant


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/menu")
async def get_full_menu(
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("restaurant")),
):
    """Full menu: all active categories with their available items."""
    client_id = tenant["id"]
    restaurant = await _get_restaurant(client_id)

    categories = await restaurant_repo.list_menu_categories(client_id, include_items=True)

    return {
        "success": True,
        "data": {
            "restaurant": {
                "id":          restaurant.id,
                "name_ar":     restaurant.nameAr,
                "name_en":     restaurant.nameEn,
                "description": restaurant.description,
                "image_url":   restaurant.imageUrl,
                "cover_image": restaurant.coverImage,
                "phone":       restaurant.phone,
                "currency":    restaurant.currency,
            },
            "categories": [_fmt_category(c) for c in categories],
        },
    }


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
        "data": _fmt_category(category),
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


@router.post("/orders")
async def create_order(
    body: CreateOrderIn,
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("restaurant")),
):
    """Place a new order."""
    client_id = tenant["id"]
    restaurant = await _get_restaurant(client_id)

    if not body.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item.")

    item_ids = [i.catalog_item_id for i in body.items]
    catalog_items = await restaurant_repo.find_catalog_items_by_ids(client_id, item_ids)

    item_map = {m.id: m for m in catalog_items}
    missing = [i for i in item_ids if i not in item_map]
    if missing:
        raise HTTPException(status_code=400, detail=f"Items not found or unavailable: {missing}")

    total = sum(
        float(item_map[i.catalog_item_id].price or 0) * i.quantity
        for i in body.items
    )

    order_items = [
        {
            "catalogItemId": i.catalog_item_id,
            "quantity":      i.quantity,
            "unitPrice":     float(item_map[i.catalog_item_id].price or 0),
            "notes":         i.notes,
        }
        for i in body.items
    ]

    order = await restaurant_repo.create_restaurant_order(
        restaurant_id=restaurant.id,
        data={
            "customer_name":  body.customer_name,
            "customer_phone": body.customer_phone,
            "table_number":   body.table_number,
            "total_price":    total,
            "currency":       restaurant.currency,
            "notes":          body.notes,
            "order_items":    order_items,
        },
    )

    return {"success": True, "data": _fmt_order(order)}


@router.get("/orders/{order_id}")
async def get_order_status(
    order_id: str,
    customer_phone: str = Query(...),
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("restaurant")),
):
    """Track order status — requires customer_phone for verification."""
    restaurant = await _get_restaurant(tenant["id"])

    order = await restaurant_repo.find_restaurant_order(
        restaurant_id=restaurant.id,
        order_id=order_id,
        customer_phone=customer_phone,
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    return {"success": True, "data": _fmt_order(order)}
