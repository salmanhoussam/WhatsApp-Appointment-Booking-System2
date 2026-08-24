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


async def soft_delete_category(category_id: str, client_id: str):
    """Deactivate a category and all its items, scoped to tenant."""
    await prisma_client.catalogitem.update_many(
        where={"categoryId": category_id, "clientId": client_id},
        data={"isActive": False},
    )
    # Multi-tenant DB Integrity Audit (Study 7, 2026-08-24) -- this second call was the one
    # unscoped query in a function whose first call already scoped correctly; now consistent.
    await prisma_client.catalogcategory.update_many(
        where={"id": category_id, "clientId": client_id},
        data={"isActive": False},
    )
    return await find_category(client_id, category_id)


async def delete_categories_by_client(client_id: str):
    """Hard-delete ALL categories for a tenant (used in seed-from-template clear)."""
    return await prisma_client.catalogcategory.delete_many(
        where={"clientId": client_id}
    )


async def delete_category_by_filter(client_id: str, category_id: str, module_key: Optional[str] = None):
    """Hard-delete a single category scoped to tenant."""
    where: dict = {"id": category_id, "clientId": client_id}
    if module_key:
        where["moduleKey"] = module_key
    return await prisma_client.catalogcategory.delete_many(where=where)


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


async def soft_delete_item(client_id: str, item_id: str):
    """Set isActive=False for a single item by primary key, scoped to tenant.

    Multi-tenant DB Integrity Audit (Study 7, 2026-08-24) -- same unscoped-query fix as
    `update_item()` above.
    """
    await prisma_client.catalogitem.update_many(
        where={"id": item_id, "clientId": client_id},
        data={"isActive": False},
    )
    return await find_item(client_id, item_id)


async def delete_item_by_filter(client_id: str, item_id: str, module_key: Optional[str] = None):
    """Hard-delete a single item scoped to tenant, optionally filtered by module_key."""
    where: dict = {"id": item_id, "clientId": client_id}
    if module_key:
        where["category"] = {"moduleKey": module_key}
    return await prisma_client.catalogitem.delete_many(where=where)
