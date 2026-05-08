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

from app.db.client import prisma_client
from app.db.dependencies import get_current_tenant
from app.core.services import require_service

router = APIRouter()

_CART_TTL_DAYS = 7


# ── Serializers ───────────────────────────────────────────────────────────────

def _fmt_product(p, include_description: bool = False) -> dict:
    meta = p.metadata or {}
    out = {
        "id":               p.id,
        "name_ar":          p.nameAr,
        "name_en":          p.nameEn,
        "price":            float(p.price) if p.price is not None else 0.0,
        "compare_at_price": meta.get("compare_at_price"),
        "image_url":        p.imageUrl,
        "images":           meta.get("images", []),
        "discount":         meta.get("discount", 0),
        "is_featured":      p.isFeatured,
        "variants":         meta.get("variants", []),
        "category_id":      p.categoryId,
        "brand":            meta.get("brand"),
        "is_active":        p.isActive,
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
    where: dict = {
        "clientId": tenant["id"],
        "isActive": True,
        "category": {"moduleKey": "store"},
    }
    if category_id:
        where["categoryId"] = category_id
    if featured is not None:
        where["isFeatured"] = featured

    products = await prisma_client.catalogitem.find_many(
        where=where,
        take=limit,
        order={"sortOrder": "asc"},
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
    product = await prisma_client.catalogitem.find_first(
        where={
            "id":       product_id,
            "clientId": tenant["id"],
            "isActive": True,
            "category": {"moduleKey": "store"},
        },
        include={"category": True},
    )
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
    cats = await prisma_client.catalogcategory.find_many(
        where={"clientId": tenant["id"], "moduleKey": "store", "parentId": None, "isActive": True},
        order={"sortOrder": "asc"},
    )
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
    _svc=Depends(require_service("store")),
):
    if body.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1.")

    product = await prisma_client.catalogitem.find_first(
        where={
            "id":       body.catalog_item_id,
            "clientId": tenant["id"],
            "isActive": True,
            "category": {"moduleKey": "store"},
        }
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    expires = datetime.now(timezone.utc) + timedelta(days=_CART_TTL_DAYS)

    cart = await prisma_client.storecart.find_unique(where={"sessionId": body.session_id})
    if not cart:
        cart = await prisma_client.storecart.create(data={
            "clientId":  tenant["id"],
            "sessionId": body.session_id,
            "expiresAt": expires,
        })
    elif cart.clientId != tenant["id"]:
        raise HTTPException(status_code=403, detail="Cart mismatch.")

    await prisma_client.storecartitem.upsert(
        where={"cartId_catalogItemId": {"cartId": cart.id, "catalogItemId": body.catalog_item_id}},
        data={
            "create": {"cartId": cart.id, "catalogItemId": body.catalog_item_id, "quantity": body.quantity},
            "update": {"quantity": body.quantity},
        },
    )

    return {"success": True, "data": {"session_id": cart.sessionId}}


@router.get("/cart/{session_id}")
async def get_cart(
    session_id: str,
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("store")),
):
    cart = await prisma_client.storecart.find_unique(where={"sessionId": session_id})
    if not cart or cart.clientId != tenant["id"]:
        return {"success": True, "data": {"session_id": session_id, "items": []}}

    items = await prisma_client.storecartitem.find_many(
        where={"cartId": cart.id},
        include={"catalogItem": True},
    )
    return {"success": True, "data": _fmt_cart(cart, items)}


@router.delete("/cart/{session_id}/items/{catalog_item_id}")
async def remove_from_cart(
    session_id:      str,
    catalog_item_id: str,
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("store")),
):
    cart = await prisma_client.storecart.find_unique(where={"sessionId": session_id})
    if not cart or cart.clientId != tenant["id"]:
        raise HTTPException(status_code=404, detail="Cart not found.")

    await prisma_client.storecartitem.delete_many(
        where={"cartId": cart.id, "catalogItemId": catalog_item_id}
    )
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


@router.post("/orders")
async def checkout(
    body: CheckoutIn,
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("store")),
):
    cart = await prisma_client.storecart.find_unique(where={"sessionId": body.session_id})
    if not cart or cart.clientId != tenant["id"]:
        raise HTTPException(status_code=404, detail="Cart not found.")

    items = await prisma_client.storecartitem.find_many(
        where={"cartId": cart.id},
        include={"catalogItem": True},
    )
    if not items:
        raise HTTPException(status_code=400, detail="Cart is empty.")

    total = sum(float(ci.catalogItem.price or 0) * ci.quantity for ci in items)

    order = await prisma_client.storeorder.create(
        data={
            "clientId":        tenant["id"],
            "customerName":    body.customer_name,
            "customerPhone":   body.customer_phone,
            "customerEmail":   body.customer_email,
            "totalPrice":      total,
            "currency":        "USD",
            "status":          "pending",
            "paymentMethod":   body.payment_method,
            "shippingAddress": body.shipping_address,
            "notes":           body.notes,
            "items": {
                "create": [
                    {
                        "catalogItemId": ci.catalogItemId,
                        "quantity":      ci.quantity,
                        "unitPrice":     float(ci.catalogItem.price or 0),
                        "totalPrice":    float(ci.catalogItem.price or 0) * ci.quantity,
                    }
                    for ci in items
                ]
            },
        },
        include={"items": True},
    )

    await prisma_client.storecartitem.delete_many(where={"cartId": cart.id})
    await prisma_client.storecart.delete(where={"id": cart.id})

    return {"success": True, "data": _fmt_order(order)}


@router.get("/orders/{order_id}")
async def get_order(
    order_id: str,
    customer_phone: Optional[str] = Query(None),
    tenant: dict = Depends(get_current_tenant),
    _svc=Depends(require_service("store")),
):
    where: dict = {"id": order_id, "clientId": tenant["id"]}
    if customer_phone:
        where["customerPhone"] = customer_phone

    order = await prisma_client.storeorder.find_first(where=where)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    return {"success": True, "data": _fmt_order(order)}
