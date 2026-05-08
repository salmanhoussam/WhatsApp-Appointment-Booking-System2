"""
Public Restaurant API — /api/v1/public/restaurant/
No auth required. All endpoints gated by require_service("restaurant").
Categories and items from CatalogCategory/CatalogItem (module_key='restaurant').
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.db.client import prisma_client
from app.db.dependencies import get_current_tenant
from app.core.services import require_service

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
        "id":        cat.id,
        "name_ar":   cat.nameAr,
        "name_en":   cat.nameEn,
        "image_url": cat.imageUrl,
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
    restaurant = await prisma_client.restaurantconfig.find_first(
        where={"clientId": client_id, "isActive": True}
    )
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

    categories = await prisma_client.catalogcategory.find_many(
        where={"clientId": client_id, "moduleKey": "restaurant", "isActive": True},
        include={"items": True},
        order={"sortOrder": "asc"},
    )

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
    client_id = tenant["id"]
    categories = await prisma_client.catalogcategory.find_many(
        where={"clientId": client_id, "moduleKey": "restaurant", "isActive": True},
        order={"sortOrder": "asc"},
    )
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
    client_id = tenant["id"]

    category = await prisma_client.catalogcategory.find_first(
        where={
            "id":        category_id,
            "clientId":  client_id,
            "moduleKey": "restaurant",
            "isActive":  True,
        },
        include={"items": True},
    )
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
    catalog_items = await prisma_client.catalogitem.find_many(
        where={
            "id":       {"in": item_ids},
            "clientId": client_id,
            "isActive": True,
            "category": {"moduleKey": "restaurant"},
        }
    )

    item_map = {m.id: m for m in catalog_items}
    missing = [i for i in item_ids if i not in item_map]
    if missing:
        raise HTTPException(status_code=400, detail=f"Items not found or unavailable: {missing}")

    total = sum(
        float(item_map[i.catalog_item_id].price or 0) * i.quantity
        for i in body.items
    )

    order = await prisma_client.restaurantorder.create(
        data={
            "restaurantId":  restaurant.id,
            "customerName":  body.customer_name,
            "customerPhone": body.customer_phone,
            "tableNumber":   body.table_number,
            "totalPrice":    total,
            "currency":      restaurant.currency,
            "status":        "pending",
            "notes":         body.notes,
            "items": {
                "create": [
                    {
                        "catalogItemId": i.catalog_item_id,
                        "quantity":      i.quantity,
                        "unitPrice":     float(item_map[i.catalog_item_id].price or 0),
                        "notes":         i.notes,
                    }
                    for i in body.items
                ]
            },
        },
        include={"items": True},
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

    order = await prisma_client.restaurantorder.find_first(
        where={
            "id":            order_id,
            "restaurantId":  restaurant.id,
            "customerPhone": customer_phone,
        },
        include={"items": True},
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    return {"success": True, "data": _fmt_order(order)}
