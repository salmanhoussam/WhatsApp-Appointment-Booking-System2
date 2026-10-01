"""
Admin Catalog Repository — Prisma write queries for CatalogCategory + CatalogItem.
All queries MUST filter by clientId. No business logic here.

Read-only (public) queries live in catalog_repository.py.
This file covers the admin CRUD operations.
"""

from typing import Optional
from app.db.client import prisma_client
from app.core import sku as sku_tool


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


async def hard_delete_categories_for_provisioning(client_id: str):
    """Hard-delete a tenant's categories. PROVISIONING ONLY, and guarded.

    Kept as a hard delete on purpose, unlike every other path in this file. `provisioning_service`
    re-provisions a tenant from scratch and RELIES on the cascade: removing the Category takes its
    CatalogServices with it, and those take their BarberService rows. Softening it would leave
    those rows behind and re-provisioning would silently double them -- a different bug, not a fix.

    🔴 SO THE HAZARD IS CLOSED BY A GUARD INSTEAD OF BY SOFTENING. If this tenant has even one
    order line, the cascade would destroy real history, and this refuses rather than proceeding.
    Re-provisioning a tenant that has already taken orders is not a routine operation and should
    not happen silently.
    """
    existing = await prisma_client.storeorderitem.count(
        where={"catalogItem": {"clientId": client_id}},
    )
    if existing:
        raise ValueError(
            f"Refusing to hard-delete the catalog of tenant {client_id}: {existing} order line(s) "
            f"reference it and would be destroyed by the cascade. Use archive_catalog_by_client(), "
            f"or decide explicitly that this history may be lost."
        )
    return await prisma_client.catalogcategory.delete_many(where={"clientId": client_id})


async def archive_catalog_by_client(client_id: str) -> int:
    """Retire a tenant's whole catalog: deactivate every category and item, and FREE their SKUs.

    Replaces `delete_categories_by_client()`, which hard-deleted every category for a tenant --
    SD-8, the fifth and last hard-delete path, fixed 2026-09-30 on Salman's decision A-Q6.

    🔴 WHY THE OLD ONE HAD TO GO. `CatalogItem` cascades from `CatalogCategory`
    (prisma/schema.prisma:528) and `StoreOrderItem` cascades from `CatalogItem` (:755), so
    clearing a catalog before re-seeding erased the order history of every dish that had ever been
    sold. It was reachable from a live admin route (admin/catalog.py -> admin_seed_from_template)
    and from `provisioning_service.py`, and loading a new paper menu goes through exactly that
    call -- which is how this came to be fixed before the new menu was loaded rather than after.

    🔴 WHY SKUs ARE ARCHIVED RATHER THAN LEFT ALONE. A-Q5 says a SKU is never re-used. Without
    this step, retiring "CHICKEN-SHAWARMA-01" would permanently block the NEW menu from using that
    obvious key, and `@@unique([clientId, sku])` would reject it. Archiving suffixes the retired
    row (`...-ARCHIVED-<epoch>`), which frees the clean base immediately.

    That is safe because an order line references `catalogItemId`, a UUID, and stores NO sku
    (verified against the schema) -- so every historical figure keeps pointing at the same row
    whatever its SKU now reads. See `app/core/sku.py` for the full reasoning.

    Returns the number of ITEMS retired, so the caller can report a real figure rather than
    "done". Note `update_many()` returns a plain int in prisma-client-py 0.15.0 (documented at
    reservation_repo.py:206-208), which is what is summed here.
    """
    # SKUs first, one row at a time: each archived value must be distinct, and `update_many` can
    # only write ONE value to every matched row. Only rows that actually HAVE a SKU are touched --
    # a row without one stays without one rather than acquiring a meaningless archived key.
    items = await prisma_client.catalogitem.find_many(
        where={"clientId": client_id, "sku": {"not": None}},
    )
    for item in items:
        await prisma_client.catalogitem.update_many(
            where={"id": item.id, "clientId": client_id},
            data={"sku": sku_tool.archive(item.sku)},
        )

    retired = await prisma_client.catalogitem.update_many(
        where={"clientId": client_id},
        data={"isActive": False},
    )
    await prisma_client.catalogcategory.update_many(
        where={"clientId": client_id},
        data={"isActive": False},
    )
    return retired


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


async def list_taken_skus(client_id: str) -> set:
    """Every SKU this tenant already occupies, archived ones included.

    Archived keys still sit in `@@unique([clientId, sku])`, so leaving them out would generate a
    value the database then rejects. Scoped to the tenant because that is the uniqueness scope —
    two restaurants may both hold SHAWARMA-01.
    """
    rows = await prisma_client.catalogitem.find_many(
        where={"clientId": client_id, "sku": {"not": None}},
    )
    return {r.sku for r in rows if r.sku}


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
