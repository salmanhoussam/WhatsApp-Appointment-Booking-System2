"""
Admin Store API — /api/v1/admin/store/
JWT required (TENANT_ADMIN or MANAGER_RESERVATIONS).
Categories and products stored in CatalogCategory/CatalogItem (module_key='store').
"""

from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.db.dependencies import get_current_admin_user
from app.core.services import require_service
from app.repositories import admin_catalog_repo as _cat_repo
from app.repositories import store_admin_repo as _store_repo

router = APIRouter()

ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]

STORE_TRANSITIONS: dict[str, set] = {
    "pending":    {"processing", "cancelled"},
    "processing": {"shipped",    "cancelled"},
    "shipped":    {"delivered"},
    "delivered":  {"refunded"},
    "refunded":   set(),
    "cancelled":  set(),
}


# ── Serializers ───────────────────────────────────────────────────────────────

def _fmt_product(p) -> dict:
    meta = p.metadata or {}
    return {
        "id":               p.id,
        "name_ar":          p.nameAr,
        "name_en":          p.nameEn,
        "description_ar":   p.descriptionAr,
        "description_en":   p.descriptionEn,
        "price":            float(p.price) if p.price is not None else 0.0,
        "compare_at_price": meta.get("compare_at_price"),
        "image_url":        p.imageUrl,
        "images":           meta.get("images", []),
        "discount":         meta.get("discount", 0),
        "is_featured":      p.isFeatured,
        "is_active":        p.isActive,
        "variants":         meta.get("variants", []),
        "category_id":      p.categoryId,
        "brand":            meta.get("brand"),
        "created_at":       p.createdAt.isoformat(),
    }


def _fmt_category(c) -> dict:
    return {
        "id":         c.id,
        "name_ar":    c.nameAr,
        "name_en":    c.nameEn,
        "image_url":  c.imageUrl,
        "parent_id":  c.parentId,
        "sort_order": c.sortOrder,
        "is_active":  c.isActive,
    }


def _fmt_order(o) -> dict:
    return {
        "id":               o.id,
        "status":           o.status,
        "total_price":      o.totalPrice,
        "currency":         o.currency,
        "customer_name":    o.customerName,
        "customer_phone":   o.customerPhone,
        "customer_email":   o.customerEmail,
        "payment_method":   o.paymentMethod,
        "shipping_address": o.shippingAddress,
        "notes":            o.notes,
        "created_at":       o.createdAt.isoformat(),
        "items": [
            {
                "catalog_item_id": oi.catalogItemId,
                "quantity":        oi.quantity,
                "unit_price":      oi.unitPrice,
                "total_price":     oi.totalPrice,
            }
            for oi in (o.items or [])
        ],
    }


# ── Products ──────────────────────────────────────────────────────────────────

class ProductIn(BaseModel):
    name_ar:          str
    name_en:          Optional[str] = None
    description_ar:   Optional[str] = None
    description_en:   Optional[str] = None
    price:            float
    compare_at_price: Optional[float] = None
    image_url:        Optional[str] = None
    images:           list = []
    discount:         int = 0
    is_featured:      bool = False
    is_active:        bool = True
    variants:         list = []
    category_id:      Optional[str] = None
    brand:            Optional[str] = None


@router.get("/products")
async def list_products(
    category_id: Optional[str]  = None,
    is_active:   Optional[bool] = None,
    limit:       int            = Query(50, le=200),
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("store")),
):
    items = await _cat_repo.list_items(
        client_id=str(user.clientId),
        category_id=category_id,
        include_inactive=(is_active is None or not is_active),
        module_key="store",
        limit=limit,
    )
    # Apply explicit is_active filter if provided
    if is_active is not None:
        items = [i for i in items if i.isActive == is_active]
    return {"success": True, "data": [_fmt_product(p) for p in items]}


@router.post("/products")
async def create_product(
    body: ProductIn,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("store")),
):
    client_id = str(user.clientId)
    if not body.category_id:
        raise HTTPException(status_code=400, detail="category_id is required.")

    cat = await _cat_repo.find_active_category(client_id, body.category_id, module_key="store")
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")

    meta = {}
    if body.compare_at_price is not None: meta["compare_at_price"] = body.compare_at_price
    if body.images:                        meta["images"]           = body.images
    if body.discount:                      meta["discount"]         = body.discount
    if body.variants:                      meta["variants"]         = body.variants
    if body.brand:                         meta["brand"]            = body.brand

    product = await _cat_repo.create_item(data={
        "clientId":      client_id,
        "categoryId":    body.category_id,
        "nameAr":        body.name_ar,
        "nameEn":        body.name_en,
        "descriptionAr": body.description_ar,
        "descriptionEn": body.description_en,
        "price":         body.price,
        "imageUrl":      body.image_url,
        "isFeatured":    body.is_featured,
        "isActive":      body.is_active,
        "metadata":      meta if meta else None,
    })
    return {"success": True, "data": _fmt_product(product)}


@router.patch("/products/{product_id}")
async def update_product(
    product_id: str,
    body: ProductIn,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("store")),
):
    client_id = str(user.clientId)
    product = await _cat_repo.find_item(client_id, product_id, module_key="store")
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    meta = {}
    if body.compare_at_price is not None: meta["compare_at_price"] = body.compare_at_price
    if body.images:                        meta["images"]           = body.images
    if body.discount:                      meta["discount"]         = body.discount
    if body.variants:                      meta["variants"]         = body.variants
    if body.brand:                         meta["brand"]            = body.brand

    updated = await _cat_repo.update_item(product_id, {
        "categoryId":    body.category_id,
        "nameAr":        body.name_ar,
        "nameEn":        body.name_en,
        "descriptionAr": body.description_ar,
        "descriptionEn": body.description_en,
        "price":         body.price,
        "imageUrl":      body.image_url,
        "isFeatured":    body.is_featured,
        "isActive":      body.is_active,
        "metadata":      meta if meta else None,
    })
    return {"success": True, "data": _fmt_product(updated)}


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("store")),
):
    client_id = str(user.clientId)
    result = await _cat_repo.delete_item_by_filter(client_id, product_id, module_key="store")
    if result.count == 0:
        raise HTTPException(status_code=404, detail="Product not found.")
    return {"success": True}


# ── Categories ────────────────────────────────────────────────────────────────

class CategoryIn(BaseModel):
    name_ar:    str
    name_en:    Optional[str] = None
    image_url:  Optional[str] = None
    parent_id:  Optional[str] = None
    sort_order: int = 0
    is_active:  bool = True


@router.get("/categories")
async def list_categories(
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("store")),
):
    cats = await _cat_repo.list_categories(
        client_id=str(user.clientId),
        module_key="store",
        include_inactive=True,
    )
    return {"success": True, "data": [_fmt_category(c) for c in cats]}


@router.post("/categories")
async def create_category(
    body: CategoryIn,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("store")),
):
    cat = await _cat_repo.create_category(data={
        "clientId":  str(user.clientId),
        "moduleKey": "store",
        "nameAr":    body.name_ar,
        "nameEn":    body.name_en,
        "imageUrl":  body.image_url,
        "parentId":  body.parent_id,
        "sortOrder": body.sort_order,
        "isActive":  body.is_active,
    })
    return {"success": True, "data": _fmt_category(cat)}


@router.patch("/categories/{category_id}")
async def update_category(
    category_id: str,
    body: CategoryIn,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("store")),
):
    client_id = str(user.clientId)
    cat = await _cat_repo.find_active_category(client_id, category_id, module_key="store")
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")

    updated = await _cat_repo.update_category(category_id, {
        "nameAr":    body.name_ar,
        "nameEn":    body.name_en,
        "imageUrl":  body.image_url,
        "parentId":  body.parent_id,
        "sortOrder": body.sort_order,
        "isActive":  body.is_active,
    })
    return {"success": True, "data": _fmt_category(updated)}


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("store")),
):
    client_id = str(user.clientId)
    result = await _cat_repo.delete_category_by_filter(client_id, category_id, module_key="store")
    if result.count == 0:
        raise HTTPException(status_code=404, detail="Category not found.")
    return {"success": True}


class OrderStatusIn(BaseModel):
    status: str


# ── Orders ────────────────────────────────────────────────────────────────────

@router.get("/orders")
async def list_orders(
    status: Optional[str] = None,
    limit:  int           = Query(50, le=200),
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("store")),
):
    if status and status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Use: {ORDER_STATUSES}")
    orders = await _store_repo.list_orders(str(user.clientId), status=status, limit=limit)
    return {"success": True, "data": [_fmt_order(o) for o in orders]}


@router.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    body: OrderStatusIn,
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("store")),
):
    if body.status not in ORDER_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{body.status}'. Allowed: {ORDER_STATUSES}",
        )

    order = await _store_repo.find_order(str(user.clientId), order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    allowed = STORE_TRANSITIONS.get(order.status, set())
    if body.status not in allowed:
        readable = sorted(allowed) if allowed else ["none — terminal state"]
        raise HTTPException(
            status_code=422,
            detail=(
                f"Cannot transition '{order.status}' → '{body.status}'. "
                f"Allowed next states: {readable}"
            ),
        )

    updated = await _store_repo.update_order_status(order_id, body.status)
    return {"success": True, "data": _fmt_order(updated)}


@router.get("/orders/stats")
async def order_stats(
    user=Depends(get_current_admin_user),
    _svc=Depends(require_service("store")),
):
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    orders      = await _store_repo.list_today_orders(str(user.clientId), today_start)

    stats = {s: {"count": 0, "total": 0.0} for s in ORDER_STATUSES}
    for o in orders:
        s = o.status
        if s in stats:
            stats[s]["count"] += 1
            stats[s]["total"] += float(o.totalPrice)

    revenue = sum(float(o.totalPrice) for o in orders if o.status not in ("cancelled", "refunded"))
    return {
        "success": True,
        "data": {
            "today_total_orders": len(orders),
            "today_revenue":      revenue,
            "by_status":          stats,
        },
    }
