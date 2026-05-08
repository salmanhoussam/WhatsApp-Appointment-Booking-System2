"""
Admin Restaurant API — /api/v1/admin/restaurant/
JWT required (TENANT_ADMIN or MANAGER_RESERVATIONS).
Categories and items are stored in CatalogCategory/CatalogItem (module_key='restaurant').
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.db.client import prisma_client
from app.db.dependencies import get_current_admin_user
from app.core.services import require_service

router = APIRouter()

ORDER_STATUSES = ["pending", "preparing", "ready", "delivered", "cancelled"]

# Valid forward transitions only — terminal states map to empty set
RESTAURANT_TRANSITIONS: dict[str, set] = {
    "pending":   {"preparing", "cancelled"},
    "preparing": {"ready",     "cancelled"},
    "ready":     {"delivered", "cancelled"},
    "delivered": set(),   # terminal
    "cancelled": set(),   # terminal
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
        "id":        cat.id,
        "name_ar":   cat.nameAr,
        "name_en":   cat.nameEn,
        "image_url": cat.imageUrl,
        "sort_order": cat.sortOrder,
        "is_active": cat.isActive,
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

async def _get_restaurant(client_id: str):
    restaurant = await prisma_client.restaurantconfig.find_first(
        where={"clientId": client_id, "isActive": True}
    )
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not configured.")
    return restaurant


# ── Category CRUD ─────────────────────────────────────────────────────────────

class CategoryIn(BaseModel):
    name_ar:    str
    name_en:    Optional[str] = None
    image_url:  Optional[str] = None
    sort_order: int = 0


@router.get("/menu/categories")
async def list_categories(
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("restaurant")),
):
    client_id = str(user.clientId)
    cats = await prisma_client.catalogcategory.find_many(
        where={"clientId": client_id, "moduleKey": "restaurant"},
        order={"sortOrder": "asc"},
    )
    return {"success": True, "data": [_fmt_category(c) for c in cats]}


@router.post("/menu/categories")
async def create_category(
    body: CategoryIn,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("restaurant")),
):
    client_id = str(user.clientId)
    cat = await prisma_client.catalogcategory.create(data={
        "clientId":   client_id,
        "moduleKey":  "restaurant",
        "nameAr":     body.name_ar,
        "nameEn":     body.name_en,
        "imageUrl":   body.image_url,
        "sortOrder":  body.sort_order,
    })
    return {"success": True, "data": _fmt_category(cat)}


@router.patch("/menu/categories/{category_id}")
async def update_category(
    category_id: str,
    body: CategoryIn,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("restaurant")),
):
    client_id = str(user.clientId)
    cat = await prisma_client.catalogcategory.find_first(
        where={"id": category_id, "clientId": client_id, "moduleKey": "restaurant"}
    )
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")

    updated = await prisma_client.catalogcategory.update(
        where={"id": category_id},
        data={
            "nameAr":    body.name_ar,
            "nameEn":    body.name_en,
            "imageUrl":  body.image_url,
            "sortOrder": body.sort_order,
        },
    )
    return {"success": True, "data": _fmt_category(updated)}


@router.delete("/menu/categories/{category_id}")
async def delete_category(
    category_id: str,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("restaurant")),
):
    client_id = str(user.clientId)
    result = await prisma_client.catalogcategory.delete_many(
        where={"id": category_id, "clientId": client_id, "moduleKey": "restaurant"}
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
):
    client_id = str(user.clientId)
    where: dict = {"clientId": client_id, "category": {"moduleKey": "restaurant"}}
    if category_id:
        where["categoryId"] = category_id

    items = await prisma_client.catalogitem.find_many(
        where=where,
        order={"sortOrder": "asc"},
    )
    return {"success": True, "data": [_fmt_item(i) for i in items]}


@router.post("/menu/items")
async def create_item(
    body: CatalogItemIn,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("restaurant")),
):
    client_id = str(user.clientId)
    restaurant = await _get_restaurant(client_id)

    cat = await prisma_client.catalogcategory.find_first(
        where={"id": body.category_id, "clientId": client_id, "moduleKey": "restaurant"}
    )
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")

    meta = {}
    if body.calories is not None:
        meta["calories"] = body.calories
    if body.is_spicy:
        meta["spicy"] = True

    item = await prisma_client.catalogitem.create(data={
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
):
    client_id = str(user.clientId)
    item = await prisma_client.catalogitem.find_first(
        where={"id": item_id, "clientId": client_id, "category": {"moduleKey": "restaurant"}}
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    meta = {}
    if body.calories is not None:
        meta["calories"] = body.calories
    if body.is_spicy:
        meta["spicy"] = True

    updated = await prisma_client.catalogitem.update(
        where={"id": item_id},
        data={
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
        },
    )
    return {"success": True, "data": _fmt_item(updated)}


@router.delete("/menu/items/{item_id}")
async def delete_item(
    item_id: str,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("restaurant")),
):
    client_id = str(user.clientId)
    result = await prisma_client.catalogitem.delete_many(
        where={"id": item_id, "clientId": client_id, "category": {"moduleKey": "restaurant"}}
    )
    if result.count == 0:
        raise HTTPException(status_code=404, detail="Item not found.")
    return {"success": True}


class OrderStatusIn(BaseModel):
    status: str


# ── Orders ────────────────────────────────────────────────────────────────────

@router.get("/orders")
async def list_orders(
    status: Optional[str] = None,
    limit: int = 50,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("restaurant")),
):
    restaurant = await _get_restaurant(str(user.clientId))
    where: dict = {"restaurantId": restaurant.id}
    if status:
        if status not in ORDER_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Use: {ORDER_STATUSES}")
        where["status"] = status

    orders = await prisma_client.restaurantorder.find_many(
        where=where,
        include={"items": True},
        order={"createdAt": "desc"},
        take=limit,
    )
    return {"success": True, "data": [_fmt_order(o) for o in orders]}


@router.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    body: OrderStatusIn,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("restaurant")),
):
    # ── 1. Validate status value ───────────────────────────────────────────
    if body.status not in ORDER_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{body.status}'. Allowed: {ORDER_STATUSES}",
        )

    client_id = str(user.clientId)
    restaurant = await _get_restaurant(client_id)

    # ── 2. Multi-tenant isolation ─────────────────────────────────────────
    # restaurantId is owned by this client — guarantees cross-tenant safety.
    order = await prisma_client.restaurantorder.find_first(
        where={"id": order_id, "restaurantId": restaurant.id}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    # ── 3. State machine ──────────────────────────────────────────────────
    allowed = RESTAURANT_TRANSITIONS.get(order.status, set())
    if body.status not in allowed:
        readable = sorted(allowed) if allowed else ["none — terminal state"]
        raise HTTPException(
            status_code=422,
            detail=(
                f"Cannot transition '{order.status}' → '{body.status}'. "
                f"Allowed next states: {readable}"
            ),
        )

    updated = await prisma_client.restaurantorder.update(
        where={"id": order_id},
        data={"status": body.status},
        include={"items": True},
    )
    return {"success": True, "data": _fmt_order(updated)}


@router.get("/orders/stats")
async def order_stats(
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("restaurant")),
):
    from datetime import date, datetime, timezone
    restaurant = await _get_restaurant(str(user.clientId))

    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    orders = await prisma_client.restaurantorder.find_many(
        where={
            "restaurantId": restaurant.id,
            "createdAt": {"gte": today_start},
        }
    )

    stats = {s: {"count": 0, "total": 0.0} for s in ORDER_STATUSES}
    for o in orders:
        s = o.status
        if s in stats:
            stats[s]["count"] += 1
            stats[s]["total"] += float(o.totalPrice)

    return {
        "success": True,
        "data": {
            "today_total_orders": len(orders),
            "today_revenue":      sum(float(o.totalPrice) for o in orders if o.status != "cancelled"),
            "currency":           restaurant.currency,
            "by_status":          stats,
        },
    }
