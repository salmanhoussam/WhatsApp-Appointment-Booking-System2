"""
Store Repository — Prisma queries only.
All queries MUST filter by clientId. No business logic here.
"""

from datetime import datetime
from typing import Optional

from prisma import Json
from prisma.errors import UniqueViolationError

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

# The catalog module kinds that represent something a customer BUYS. Order Engine Unification
# (2026-09-07): 'restaurant' joined 'store' here when the two order engines became one -- a menu
# item is bought exactly like a shop product, and module_key classifies a catalog, it is not a
# statement about whether something is purchasable. Deliberately an explicit list rather than
# "any module": 'catalog' items are the pre-split service fossils, and nothing should be able to
# put one in a cart by accident.
PURCHASABLE_MODULE_KEYS = ["store", "restaurant"]


async def find_product_for_cart(client_id: str, catalog_item_id: str):
    """Verify an item is active, purchasable and belongs to this tenant — for cart add."""
    return await prisma_client.catalogitem.find_first(
        where={
            "id":       catalog_item_id,
            "clientId": client_id,
            "isActive": True,
            "category": {"moduleKey": {"in": PURCHASABLE_MODULE_KEYS}},
        }
    )


async def find_cart_by_session(session_id: str, client_id: str):
    """Fetch this tenant's cart by session UUID, or None.

    Phase 4a (2026-09-07) -- client_id is REQUIRED, not optional. This used to be
    `find_unique(where={"sessionId": ...})` with no tenant column at all: `sessionId` is globally
    unique, so the function would happily hand back another tenant's cart, and the ONLY thing
    preventing that was five separate route call sites each remembering to write
    `if cart.clientId != tenant["id"]`. A sixth caller that forgot would have been an immediate
    cross-tenant cart read. The check now lives where it cannot be forgotten, and a foreign cart is
    indistinguishable from a missing one -- callers already 404 on None.
    """
    return await prisma_client.storecart.find_first(
        where={"sessionId": session_id, "clientId": client_id}
    )


async def create_cart(client_id: str, session_id: str, expires_at: datetime):
    """Create a new session cart for a tenant."""
    return await prisma_client.storecart.create(
        data={
            "clientId":  client_id,
            "sessionId": session_id,
            "expiresAt": expires_at,
        }
    )


async def get_or_create_cart(client_id: str, session_id: str, expires_at: datetime):
    """Create-or-fetch by sessionId (@unique) -- defends against two concurrent callers racing to
    create the SAME brand-new session's cart (e.g. two rapid double-clicks; the checkout flow
    itself now avoids the race structurally via a single /cart/bulk request instead of N
    concurrent ones, see app/api/v1/public/store.py's add_to_cart_bulk).

    NOT `prisma_client.storecart.upsert()` -- confirmed live, 2026-09-03, that this Prisma Python
    client's upsert() does NOT behave as a true atomic DB-level `INSERT ... ON CONFLICT`: two
    concurrent upsert() calls for the same new sessionId both raised
    prisma.errors.UniqueViolationError instead of one of them cleanly resolving to the existing
    row. Catching that error and re-fetching is the actual race-safe pattern here."""
    # Phase 4a: scoped. A session id that already belongs to ANOTHER tenant is not ours to return
    # or to write into -- None makes the caller 404, exactly as a missing cart does.
    cart = await prisma_client.storecart.find_first(
        where={"sessionId": session_id, "clientId": client_id}
    )
    if cart is not None:
        return cart
    try:
        return await prisma_client.storecart.create(
            data={"clientId": client_id, "sessionId": session_id, "expiresAt": expires_at},
        )
    except UniqueViolationError:
        # Lost the race to a concurrent caller between the find above and this create -- the
        # cart now exists, fetch it instead of failing the request.
        cart = await prisma_client.storecart.find_first(
            where={"sessionId": session_id, "clientId": client_id}
        )
        if cart is None:
            raise
        return cart


async def upsert_cart_item(cart_id: str, catalog_item_id: str, quantity: int):
    """Insert or update a cart item (quantity override).

    Phase 4a note -- the ONE cart function left unscoped, deliberately. Prisma's upsert() addresses
    a single compound unique key and accepts no relation filter, so a tenant clause cannot be
    expressed here. It is safe because every `cart_id` in the system now provably came from
    find_cart_by_session() or get_or_create_cart(), both of which are tenant-scoped as of this
    change -- there is no longer any path that produces an unscoped cart id to pass in. Adding a
    per-item ownership SELECT would also cost one extra query per item on the bulk endpoint, for a
    guarantee the resolvers already give.
    """
    return await prisma_client.storecartitem.upsert(
        where={"cartId_catalogItemId": {"cartId": cart_id, "catalogItemId": catalog_item_id}},
        data={
            "create": {"cartId": cart_id, "catalogItemId": catalog_item_id, "quantity": quantity},
            "update": {"quantity": quantity},
        },
    )


async def list_cart_items(cart_id: str, client_id: str) -> list:
    """All items in this tenant's cart, with their product data.

    Phase 4a: store_cart_items has no client_id column of its own, so isolation goes through the
    parent relation -- which Prisma DOES support on find_many/delete_many. That makes the guard
    part of the query rather than something the caller has to remember.
    """
    return await prisma_client.storecartitem.find_many(
        where={"cartId": cart_id, "cart": {"is": {"clientId": client_id}}},
        include={"catalogItem": True},
    )


async def delete_cart_item(cart_id: str, catalog_item_id: str, client_id: str):
    """Remove a single item from this tenant's cart."""
    return await prisma_client.storecartitem.delete_many(
        where={
            "cartId": cart_id,
            "catalogItemId": catalog_item_id,
            "cart": {"is": {"clientId": client_id}},
        }
    )


# ── Checkout ──────────────────────────────────────────────────────────────────

async def create_store_order(client_id: str, data: dict):
    """
    Create a StoreOrder with nested StoreOrderItems.

    shippingAddress is a Json? field — Prisma's Python client rejects an explicit
    `None` value for it (MissingRequiredValueError, empirically confirmed
    2026-07-21: fails even with the `items` relation removed entirely, while the
    same call with `shippingAddress` omitted, or another Optional[str] field like
    `notes` set to None, succeeds), and a raw dict must be wrapped in `Json(...)`
    when present (matches the established pattern already used elsewhere in this
    codebase, e.g. catalog_service.py's `data["metadata"] = Json(metadata)`) — the
    key is omitted entirely when there's no real address, never set to None.
    """
    create_data = {
        "clientId":        client_id,
        # Phase 3a (2026-09-07): the real Customer FK, resolved by the caller. Omitted rather than
        # set to None when absent, so an order from a customer with no phone stays honestly
        # unlinked instead of carrying a null-shaped link.
        **({"customerId": data["customer_id"]} if data.get("customer_id") else {}),
        "customerName":    data["customer_name"],
        "customerPhone":   data.get("customer_phone"),
        "customerEmail":   data.get("customer_email"),
        "totalPrice":      data["total_price"],
        "currency":        data.get("currency", "USD"),
        "status":          "pending",
        "paymentMethod":   data["payment_method"],
        "notes":           data.get("notes"),
        "items": {
            "create": data["order_items"],
        },
    }
    if data.get("shipping_address") is not None:
        create_data["shippingAddress"] = Json(data["shipping_address"])
    # Same Json() wrapping and same omit-when-absent rule as shippingAddress above.
    if data.get("metadata") is not None:
        create_data["metadata"] = Json(data["metadata"])

    return await prisma_client.storeorder.create(
        data=create_data,
        include={"items": True},
    )


async def delete_all_cart_items(cart_id: str, client_id: str):
    """Remove all items from this tenant's cart (post-checkout cleanup)."""
    return await prisma_client.storecartitem.delete_many(
        where={"cartId": cart_id, "cart": {"is": {"clientId": client_id}}}
    )


async def delete_cart(cart_id: str, client_id: str):
    """Delete this tenant's cart record (post-checkout cleanup).

    delete_many, not delete: it takes a scoped where-clause, and deleting nothing is the correct
    outcome for a cart that is not ours.
    """
    return await prisma_client.storecart.delete_many(
        where={"id": cart_id, "clientId": client_id}
    )


async def find_store_order(client_id: str, order_id: str, customer_phone: Optional[str] = None):
    """Fetch a store order by ID, scoped to tenant, optionally verified by phone."""
    where: dict = {"id": order_id, "clientId": client_id}
    if customer_phone:
        where["customerPhone"] = customer_phone
    return await prisma_client.storeorder.find_first(where=where)
