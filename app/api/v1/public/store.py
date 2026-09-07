"""
Public Store API — /api/v1/public/store/
No auth required. Gated by require_service("store").
Cart is session-based (UUID in localStorage, no login needed).
Products and categories from CatalogCategory/CatalogItem (module_key='store').
"""

from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.db.dependencies import get_current_tenant
from app.core.services import require_service, require_any_service
import app.repositories.store_repo as store_repo
from app.db.client import prisma_client
from app.repositories.customer_repo import CustomerRepository

router = APIRouter()

_CART_TTL_DAYS = 7


# ── Serializers ───────────────────────────────────────────────────────────────

def _fmt_product(p, include_description: bool = False) -> dict:
    meta = p.metadata or {}
    out = {
        "id":               p.id,
        "name_ar":          p.nameAr,
        "name_en":          p.nameEn,
        # None (not 0.0) when no real price is set — the frontend needs to
        # distinguish "genuinely priced at zero" from "no price yet" (e.g. to
        # show "Price upon request" instead of a misleading "$0"). Coercing to
        # 0.0 here made that distinction impossible for every consumer.
        "price":            float(p.price) if p.price is not None else None,
        "compare_at_price": meta.get("compare_at_price"),
        "image_url":        p.imageUrl,
        "images":           meta.get("images", []),
        "discount":         meta.get("discount", 0),
        "is_featured":      p.isFeatured,
        "variants":         meta.get("variants", []),
        "category_id":      p.categoryId,
        "brand":            meta.get("brand"),
        "is_active":        p.isActive,
        # Story line — same "known sub-key of metadata" pattern as
        # compare_at_price/images/discount/variants/brand above. No tenant-
        # specific default text here — this endpoint is shared across every
        # store-module tenant (footlab included), not just beit-al-fakhar.
        # None when absent; the tenant-specific frontend decides its own
        # fallback copy.
        "story_ar": meta.get("story_ar"),
        "story_en": meta.get("story_en"),
    }
    if include_description:
        out["description_ar"] = p.descriptionAr
        out["description_en"] = p.descriptionEn
    return out


def _fmt_cart(cart, items) -> dict:
    return {
        "id":         cart.id,
        "session_id": cart.sessionId,
        "expires_at": cart.expiresAt.isoformat(),
        "items": [
            {
                "catalog_item_id": ci.catalogItemId,
                "quantity":        ci.quantity,
                "product":         _fmt_product(ci.catalogItem) if ci.catalogItem else None,
            }
            for ci in items
        ],
    }


def _fmt_order(o) -> dict:
    return {
        "id":             o.id,
        "status":         o.status,
        "total_price":    o.totalPrice,
        "currency":       o.currency,
        "customer_name":  o.customerName,
        "payment_method": o.paymentMethod,
        "created_at":     o.createdAt.isoformat(),
    }


# ── Products ──────────────────────────────────────────────────────────────────

@router.get("/products")
async def list_products(
    category_id: Optional[str] = None,
    featured:    Optional[bool] = None,
    search:      Optional[str] = None,
    limit:       int = Query(50, le=100),
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("store")),
):
    products = await store_repo.list_store_products(
        tenant["id"], category_id=category_id, featured=featured, limit=limit
    )

    if search:
        s = search.lower()
        products = [
            p for p in products
            if s in (p.nameAr or "").lower() or s in (p.nameEn or "").lower()
        ]

    return {"success": True, "data": [_fmt_product(p) for p in products]}


@router.get("/products/{product_id}")
async def get_product(
    product_id: str,
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("store")),
):
    product = await store_repo.find_store_product(tenant["id"], product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    data = _fmt_product(product, include_description=True)
    if product.category:
        data["category"] = {
            "id":      product.category.id,
            "name_ar": product.category.nameAr,
            "name_en": product.category.nameEn,
        }

    return {"success": True, "data": data}


@router.get("/categories")
async def list_categories(
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("store")),
):
    cats = await store_repo.list_store_categories(tenant["id"])
    return {
        "success": True,
        "data": [
            {"id": c.id, "name_ar": c.nameAr, "name_en": c.nameEn, "image_url": c.imageUrl}
            for c in cats
        ],
    }


# ── Cart ──────────────────────────────────────────────────────────────────────

class AddToCartIn(BaseModel):
    session_id:      str
    catalog_item_id: str
    quantity:        int = 1


@router.post("/cart")
async def add_to_cart(
    body: AddToCartIn,
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_any_service("store", "restaurant")),
):
    if body.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1.")

    product = await store_repo.find_product_for_cart(tenant["id"], body.catalog_item_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    expires = datetime.now(timezone.utc) + timedelta(days=_CART_TTL_DAYS)

    # Phase 4a: the tenant check moved INTO the repository. get_or_create_cart returns None for a
    # session id belonging to another tenant, so a foreign cart is indistinguishable from a missing
    # one -- no per-call-site `cart.clientId != tenant["id"]` left to forget.
    cart = await store_repo.get_or_create_cart(tenant["id"], body.session_id, expires)
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found.")

    await store_repo.upsert_cart_item(cart.id, body.catalog_item_id, body.quantity)

    return {"success": True, "data": {"session_id": cart.sessionId}}


class BulkCartItemIn(BaseModel):
    catalog_item_id: str
    quantity:        int = 1


class AddToCartBulkIn(BaseModel):
    session_id: str
    items:      list[BulkCartItemIn]


@router.post("/cart/bulk")
async def add_to_cart_bulk(
    body: AddToCartBulkIn,
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_any_service("store", "restaurant")),
):
    """Sync every cart line in ONE request instead of one request per item (real bug, 2026-09-03:
    the checkout flow used to fire N sequential `/cart` requests, then N *parallel* ones after a
    naive fix -- parallel calls for a brand-new session all raced to create the SAME cart row and
    threw prisma.errors.UniqueViolationError, because Prisma Python's `upsert()` is not a true
    atomic DB-level upsert here (confirmed live: the race reproduced even through
    store_repo.get_or_create_cart's upsert). A single request creates/finds the cart exactly once,
    then loops item upserts in-process -- no cross-request race is possible, and it's one network
    round-trip regardless of cart size instead of N."""
    if not body.items:
        raise HTTPException(status_code=400, detail="No items to add.")
    for item in body.items:
        if item.quantity < 1:
            raise HTTPException(status_code=400, detail="Quantity must be at least 1.")

    expires = datetime.now(timezone.utc) + timedelta(days=_CART_TTL_DAYS)
    cart = await store_repo.get_or_create_cart(tenant["id"], body.session_id, expires)
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found.")

    for item in body.items:
        product = await store_repo.find_product_for_cart(tenant["id"], item.catalog_item_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product not found: {item.catalog_item_id}")
        await store_repo.upsert_cart_item(cart.id, item.catalog_item_id, item.quantity)

    return {"success": True, "data": {"session_id": cart.sessionId}}


@router.get("/cart/{session_id}")
async def get_cart(
    session_id: str,
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_any_service("store", "restaurant")),
):
    cart = await store_repo.find_cart_by_session(session_id, tenant["id"])
    if not cart:
        return {"success": True, "data": {"session_id": session_id, "items": []}}

    items = await store_repo.list_cart_items(cart.id, tenant["id"])
    return {"success": True, "data": _fmt_cart(cart, items)}


@router.delete("/cart/{session_id}/items/{catalog_item_id}")
async def remove_from_cart(
    session_id:      str,
    catalog_item_id: str,
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_any_service("store", "restaurant")),
):
    cart = await store_repo.find_cart_by_session(session_id, tenant["id"])
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found.")

    await store_repo.delete_cart_item(cart.id, catalog_item_id, tenant["id"])
    return {"success": True}


# ── Checkout ──────────────────────────────────────────────────────────────────

class CheckoutIn(BaseModel):
    session_id:      str
    customer_name:   str
    customer_phone:  Optional[str] = None
    customer_email:  Optional[str] = None
    payment_method:  str = "cash"
    shipping_address: Optional[dict] = None
    notes:           Optional[str] = None
    # Order Engine Unification (2026-09-07): a restaurant order's table number. Optional and
    # ignored by every other vertical -- it lands in StoreOrder.metadata rather than earning a
    # column that would be NULL on almost every row.
    table_number:    Optional[str] = None


@router.post("/orders")
async def checkout(
    body: CheckoutIn,
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_any_service("store", "restaurant")),
):
    cart = await store_repo.find_cart_by_session(body.session_id, tenant["id"])
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found.")

    items = await store_repo.list_cart_items(cart.id, tenant["id"])
    if not items:
        raise HTTPException(status_code=400, detail="Cart is empty.")

    total = sum(float(ci.catalogItem.price or 0) * ci.quantity for ci in items)

    order_items = [
        {
            "catalogItemId": ci.catalogItemId,
            "quantity":      ci.quantity,
            "unitPrice":     float(ci.catalogItem.price or 0),
            "totalPrice":    float(ci.catalogItem.price or 0) * ci.quantity,
        }
        for ci in items
    ]

    # -- Resolve [Customer] --------------------------------------------------------------------
    # Phase 3a (2026-09-07). Same find-or-create-by-(phone, clientId) pattern reservation_service.py
    # already runs for every reservation, so one person buying and booking at the same shop is one
    # Customer row, not two identities the registry has to reconcile by phone string afterwards.
    # Phone is the identity key here, and it is optional on a store order -- with no phone there is
    # nothing to identify, so the order stays unlinked rather than inventing a row. The order keeps
    # its own customer_name/phone snapshot either way.
    customer_id = None
    if body.customer_phone:
        _customer_repo = CustomerRepository(prisma_client)
        customer = await _customer_repo.get_by_phone(body.customer_phone, tenant["id"])
        if not customer:
            customer = await _customer_repo.create(tenant["id"], {
                "phone": body.customer_phone,
                "name":  body.customer_name,
                "email": body.customer_email,
            })
        customer_id = customer.id

    order = await store_repo.create_store_order(
        client_id=tenant["id"],
        data={
            "customer_id":      customer_id,
            "customer_name":    body.customer_name,
            "customer_phone":   body.customer_phone,
            "customer_email":   body.customer_email,
            "total_price":      total,
            "currency":         "USD",
            "payment_method":   body.payment_method,
            "shipping_address": body.shipping_address,
            "notes":            body.notes,
            "metadata":         {"table_number": body.table_number} if body.table_number else None,
            "order_items":      order_items,
        },
    )

    await store_repo.delete_all_cart_items(cart.id, tenant["id"])
    await store_repo.delete_cart(cart.id, tenant["id"])

    return {"success": True, "data": _fmt_order(order)}


@router.get("/orders/{order_id}")
async def get_order(
    order_id: str,
    customer_phone: Optional[str] = Query(None),
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_any_service("store", "restaurant")),
):
    order = await store_repo.find_store_order(tenant["id"], order_id, customer_phone)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    return {"success": True, "data": _fmt_order(order)}
