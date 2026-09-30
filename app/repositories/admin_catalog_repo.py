"""
Admin Catalog Repository — Prisma write queries for CatalogCategory + CatalogItem.
All queries MUST filter by clientId. No business logic here.

Read-only (public) queries live in catalog_repository.py.
This file covers the admin CRUD operations.
"""

from typing import Optional
from app.db.client import prisma_client


# ── Categories ────────────────────────────────────────────────────────────────

async def list_categories(
    client_id: str,
    module_key: Optional[str] = None,
    parent_id: Optional[str] = None,
    include_inactive: bool = False,
) -> list:
    where: dict = {"clientId": client_id}
    if not include_inactive:
        where["isActive"] = True
    if module_key is not None:
        where["moduleKey"] = module_key
    if parent_id is not None:
        where["parentId"] = parent_id if parent_id else None
    return await prisma_client.catalogcategory.find_many(
        where=where,
        order=[{"sortOrder": "asc"}, {"createdAt": "asc"}],
        include={"children": {"order_by": {"sortOrder": "asc"}}},
    )


async def find_category(client_id: str, category_id: str):
    """Single category scoped to tenant (any active state)."""
    return await prisma_client.catalogcategory.find_first(
        where={"id": category_id, "clientId": client_id}
    )


async def find_active_category(client_id: str, category_id: str, module_key: Optional[str] = None):
    """Single active category, optionally filtered by module_key."""
    where: dict = {"id": category_id, "clientId": client_id, "isActive": True}
    if module_key:
        where["moduleKey"] = module_key
    return await prisma_client.catalogcategory.find_first(where=where)


async def create_category(data: dict):
    """Create a CatalogCategory row."""
    return await prisma_client.catalogcategory.create(data=data)


async def update_category(client_id: str, category_id: str, data: dict):
    """Update a CatalogCategory by primary key, scoped to tenant.

    Multi-tenant DB Integrity Audit (Study 7, Customer Identity + WhatsApp Booking Study,
    2026-08-24) -- previously unscoped (`where={"id": category_id}` only); the caller already
    pre-checks ownership via `find_category()`, but this query itself didn't enforce it. Same
    `update_many()` + re-fetch fix as `barber_repo.update_barber()`.
    """
    await prisma_client.catalogcategory.update_many(
        where={"id": category_id, "clientId": client_id},
        data=data,
    )
    return await find_category(client_id, category_id)


async def soft_delete_category(category_id: str, client_id: str, module_key: Optional[str] = None):
    """Deactivate a category and all its items, scoped to tenant and optionally to a module.

    `module_key` added 2026-09-30 (plan Track A3) so this can replace the hard category delete
    that used to sit below. It filters on `CatalogCategory.moduleKey` exactly as
    `find_category()` and the old hard delete already did -- the same mechanism, applied to the
    safe function so nothing is lost by switching to it.
    """
    await prisma_client.catalogitem.update_many(
        where={"categoryId": category_id, "clientId": client_id},
        data={"isActive": False},
    )
    # Multi-tenant DB Integrity Audit (Study 7, 2026-08-24) -- this second call was the one
    # unscoped query in a function whose first call already scoped correctly; now consistent.
    cat_where: dict = {"id": category_id, "clientId": client_id}
    if module_key:
        cat_where["moduleKey"] = module_key
    await prisma_client.catalogcategory.update_many(where=cat_where, data={"isActive": False})
    return await find_category(client_id, category_id)


async def delete_categories_by_client(client_id: str):
    """Hard-delete ALL categories for a tenant (used in seed-from-template clear)."""
    return await prisma_client.catalogcategory.delete_many(
        where={"clientId": client_id}
    )


# 🔴 REMOVED 2026-09-30 -- `delete_category_by_filter()`, a HARD delete. Do not reintroduce it.
#
# WIDER than the item-level hazard it sat beside: `CatalogItem.category` cascades
# (prisma/schema.prisma:528), so removing ONE category removed every dish in it -- and each of
# those cascaded to its own StoreOrderItem rows (:755). Deleting a menu section therefore erased
# the order history of every dish in that section.
#
# Reachable from admin/restaurant.py:165 and admin/store.py:352, both of which then read
# `result.count` on the plain int that delete_many() returns in prisma-client-py 0.15.0 -- so the
# response raised AttributeError -> 500 AFTER the rows were gone. The owner saw a failure and the
# data was destroyed anyway.
#
# Both routes now go through `catalog_service.admin_delete_category()`, which deactivates the
# category and its items. `soft_delete_category()` above gained `module_key` so scoping survived
# the move. Guarded by scripts/test_catalog_soft_delete.py.


# ── Items ─────────────────────────────────────────────────────────────────────

async def list_items(
    client_id: str,
    category_id: Optional[str] = None,
    featured_only: bool = False,
    include_inactive: bool = False,
    module_key: Optional[str] = None,
    limit: int = 200,
) -> list:
    where: dict = {"clientId": client_id}
    if not include_inactive:
        where["isActive"] = True
    if category_id:
        where["categoryId"] = category_id
    if featured_only:
        where["isFeatured"] = True
    if module_key:
        where["category"] = {"moduleKey": module_key}
    return await prisma_client.catalogitem.find_many(
        where=where,
        order=[{"sortOrder": "asc"}, {"createdAt": "asc"}],
        include={"category": True},
        take=limit,
    )


async def find_item(client_id: str, item_id: str, module_key: Optional[str] = None):
    """Single item scoped to tenant, optionally filtered by module_key via category."""
    where: dict = {"id": item_id, "clientId": client_id}
    if module_key:
        where["category"] = {"moduleKey": module_key}
    return await prisma_client.catalogitem.find_first(where=where)


async def create_item(data: dict):
    """Create a CatalogItem row."""
    return await prisma_client.catalogitem.create(data=data)


async def update_item(client_id: str, item_id: str, data: dict):
    """Update a CatalogItem by primary key, scoped to tenant.

    Multi-tenant DB Integrity Audit (Study 7, Customer Identity + WhatsApp Booking Study,
    2026-08-24) -- previously unscoped (`where={"id": item_id}` only); the caller already
    pre-checks ownership via `find_item()`, but this query itself didn't enforce it. Same
    `update_many()` + re-fetch fix as `barber_repo.update_barber()`.
    """
    await prisma_client.catalogitem.update_many(
        where={"id": item_id, "clientId": client_id},
        data=data,
    )
    return await find_item(client_id, item_id)


async def soft_delete_item(client_id: str, item_id: str, module_key: Optional[str] = None):
    """Set isActive=False for a single item, scoped to tenant and optionally to a module.

    Multi-tenant DB Integrity Audit (Study 7, 2026-08-24) -- same unscoped-query fix as
    `update_item()` above.

    `module_key` was added 2026-09-30 (plan Track A3) so this can replace the hard delete that
    used to sit below. It filters through `category.moduleKey` exactly as `find_item()` and
    `list_items()` already do -- it is not a new mechanism, it is the one this file already uses,
    applied to the one function that lacked it. It matters because a store route must not be able
    to deactivate a restaurant item belonging to the same tenant.

    Returns the item row (via `find_item`, which deliberately does NOT filter on isActive, so the
    caller can still see what it just deactivated).
    """
    where: dict = {"id": item_id, "clientId": client_id}
    if module_key:
        where["category"] = {"moduleKey": module_key}
    await prisma_client.catalogitem.update_many(where=where, data={"isActive": False})
    return await find_item(client_id, item_id, module_key)


# ─────────────────────────────────────────────────────────────────────────────────────────────
# 🔴 REMOVED 2026-09-30 — `delete_item_by_filter()`, a HARD delete. Do not reintroduce it.
#
# It ran `catalogitem.delete_many(...)`, and `StoreOrderItem` CASCADES from `CatalogItem`
# (prisma/schema.prisma:755), as do `StoreCartItem` (:695) and `GalleryImage` (:438). So deleting
# one dish erased every order line that had ever referenced it. `StoreOrder` keeps its own
# `totalPrice`, so revenue still looked correct while the item breakdown silently emptied.
#
# It was reachable from two LIVE routes, one of them the owner's own delete button in the menu
# tab (admin/restaurant.py) and one the product delete in the store tab (admin/store.py). Neither
# was a script; both were ordinary daily use.
#
# Measured before removal (sealed read-only reader against production, 2026-09-30):
#     caracas  97 items · 0 orders · 0 order lines      arizona  28 · 0 · 0
#     positive control -- platform-wide: 14 orders, 18 order lines, 181 items
# So the counters could see rows, the zeros were real, and NO history had been lost yet. The
# hazard was live and unfired; it would have fired on the first real order.
#
# Both routes now go through `catalog_service.admin_delete_item()`, which is where a catalog write
# belongs (rules/backend/architecture.md §9 -- one capability, one service, one write path; that
# rule already NAMES admin/restaurant.py and admin/store.py bypassing catalog_service as one of
# its three real instances). `soft_delete_item()` above gained `module_key` so nothing was lost in
# the move.
#
# Guarded by scripts/test_catalog_soft_delete.py.
# ─────────────────────────────────────────────────────────────────────────────────────────────
