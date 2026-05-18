"""
Store Repository — Prisma queries only.
All queries MUST filter by clientId. No business logic here.
"""

from datetime import datetime
from typing import Optional

from app.db.client import prisma_client


# ── Products ──────────────────────────────────────────────────────────────────

async def list_store_products(
    client_id:   str,
    category_id: Optional[str] = None,
    featured:    Optional[bool] = None,
    limit:       int = 50,
) -> list:
    """Active store products, optionally filtered by category and featured flag."""
    where: dict = {
        "clientId": client_id,
        "isActive": True,
        "category": {"moduleKey": "store"},
    }
    if category_id:
        where["categoryId"] = category_id
    if featured is not None:
        where["isFeatured"] = featured

    return await prisma_client.catalogitem.find_many(
        where=where,
        take=limit,
        order={"sortOrder": "asc"},
    )


async def find_store_product(client_id: str, product_id: str):
    """Single active store product with its category or None."""
    return await prisma_client.catalogitem.find_first(
        where={
            "id":       product_id,
            "clientId": client_id,
            "isActive": True,
            "category": {"moduleKey": "store"},
        },
        include={"category": True},
    )


async def list_store_categories(client_id: str) -> list:
    """Active top-level store categories sorted by sort_order."""
    return await prisma_client.catalogcategory.find_many(
        where={
            "clientId": client_id,
            "moduleKey": "store",
            "parentId": None,
            "isActive": True,
        },
        order={"sortOrder": "asc"},
    )


# ── Cart ──────────────────────────────────────────────────────────────────────

async def find_product_for_cart(client_id: str, catalog_item_id: str):
    """Verify a product is active and belongs to this tenant's store — for cart add."""
    return await prisma_client.catalogitem.find_first(
        where={
            "id":       catalog_item_id,
            "clientId": client_id,
            "isActive": True,
            "category": {"moduleKey": "store"},
        }
    )


async def find_cart_by_session(session_id: str):
    """Fetch cart by session UUID or None."""
    return await prisma_client.storecart.find_unique(where={"sessionId": session_id})


async def create_cart(client_id: str, session_id: str, expires_at: datetime):
    """Create a new session cart for a tenant."""
    return await prisma_client.storecart.create(
        data={
            "clientId":  client_id,
            "sessionId": session_id,
            "expiresAt": expires_at,
        }
    )


async def upsert_cart_item(cart_id: str, catalog_item_id: str, quantity: int):
    """Insert or update a cart item (quantity override)."""
    return await prisma_client.storecartitem.upsert(
        where={"cartId_catalogItemId": {"cartId": cart_id, "catalogItemId": catalog_item_id}},
        data={
            "create": {"cartId": cart_id, "catalogItemId": catalog_item_id, "quantity": quantity},
            "update": {"quantity": quantity},
        },
    )


async def list_cart_items(cart_id: str) -> list:
    """All items in a cart with their product data."""
    return await prisma_client.storecartitem.find_many(
        where={"cartId": cart_id},
        include={"catalogItem": True},
    )


async def delete_cart_item(cart_id: str, catalog_item_id: str):
    """Remove a single item from a cart."""
    return await prisma_client.storecartitem.delete_many(
        where={"cartId": cart_id, "catalogItemId": catalog_item_id}
    )


# ── Checkout ──────────────────────────────────────────────────────────────────

async def create_store_order(client_id: str, data: dict):
    """Create a StoreOrder with nested StoreOrderItems."""
    return await prisma_client.storeorder.create(
        data={
            "clientId":        client_id,
            "customerName":    data["customer_name"],
            "customerPhone":   data.get("customer_phone"),
            "customerEmail":   data.get("customer_email"),
            "totalPrice":      data["total_price"],
            "currency":        data.get("currency", "USD"),
            "status":          "pending",
            "paymentMethod":   data["payment_method"],
            "shippingAddress": data.get("shipping_address"),
            "notes":           data.get("notes"),
            "items": {
                "create": data["order_items"],
            },
        },
        include={"items": True},
    )


async def delete_all_cart_items(cart_id: str):
    """Remove all items from a cart (post-checkout cleanup)."""
    return await prisma_client.storecartitem.delete_many(where={"cartId": cart_id})


async def delete_cart(cart_id: str):
    """Delete the cart record itself (post-checkout cleanup)."""
    return await prisma_client.storecart.delete(where={"id": cart_id})


async def find_store_order(client_id: str, order_id: str, customer_phone: Optional[str] = None):
    """Fetch a store order by ID, scoped to tenant, optionally verified by phone."""
    where: dict = {"id": order_id, "clientId": client_id}
    if customer_phone:
        where["customerPhone"] = customer_phone
    return await prisma_client.storeorder.find_first(where=where)
