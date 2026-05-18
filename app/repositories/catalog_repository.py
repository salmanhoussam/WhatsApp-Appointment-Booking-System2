"""
Catalog Repository — Prisma queries only.
All queries MUST filter by clientId. No business logic here.
"""

from typing import Optional

from app.db.client import prisma_client


async def list_categories(
    client_id:  str,
    module_key: str | None = None,
    parent_id:  str | None = None,
) -> list:
    """Active top-level (or sub-) categories, with active items pre-fetched for counting."""
    where: dict = {"clientId": client_id, "isActive": True}
    if module_key:
        where["moduleKey"] = module_key
    if parent_id:
        where["parentId"] = parent_id
    else:
        where["parentId"] = None  # top-level only by default

    return await prisma_client.catalogcategory.find_many(
        where=where,
        order={"sortOrder": "asc"},
        include={
            "items": {
                "where":    {"isActive": True},
                "order_by": {"sortOrder": "asc"},
            },
        },
    )


async def find_category(client_id: str, category_id: str):
    """Single active category or None."""
    return await prisma_client.catalogcategory.find_first(
        where={"id": category_id, "clientId": client_id, "isActive": True}
    )


async def list_items(client_id: str, category_id: str) -> list:
    """Active items for a category, sorted by sort_order."""
    return await prisma_client.catalogitem.find_many(
        where={"categoryId": category_id, "clientId": client_id, "isActive": True},
        order={"sortOrder": "asc"},
    )


async def find_item(client_id: str, item_id: str):
    """Single active item with its parent category or None."""
    return await prisma_client.catalogitem.find_first(
        where={"id": item_id, "clientId": client_id, "isActive": True},
        include={"category": True},
    )


# ── Extra functions used by public/catalog.py ────────────────────────────────

async def list_categories_with_children(
    client_id:  str,
    module_key: Optional[str] = None,
    parent_id:  Optional[str] = None,
) -> list:
    """Active categories including their active children — used by public catalog route."""
    where: dict = {"clientId": client_id, "isActive": True}
    if module_key:
        where["moduleKey"] = module_key
    if parent_id:
        where["parentId"] = parent_id
    else:
        where["parentId"] = None  # top-level by default

    return await prisma_client.catalogcategory.find_many(
        where=where,
        order={"sortOrder": "asc"},
        include={
            "children": {
                "where":    {"isActive": True},
                "order_by": {"sortOrder": "asc"},
            }
        },
    )


async def find_category_basic(client_id: str, category_id: str):
    """Single active category without children/items — used for 404 guard."""
    return await prisma_client.catalogcategory.find_first(
        where={"id": category_id, "clientId": client_id, "isActive": True}
    )


async def list_items_filtered(
    client_id:    str,
    category_id:  str,
    featured_only: bool = False,
) -> list:
    """Active items for a category with optional featured filter."""
    where: dict = {
        "categoryId": category_id,
        "clientId":   client_id,
        "isActive":   True,
    }
    if featured_only:
        where["isFeatured"] = True

    return await prisma_client.catalogitem.find_many(
        where=where,
        order={"sortOrder": "asc"},
    )


async def list_featured_items(
    client_id:  str,
    module_key: Optional[str] = None,
) -> list:
    """All active featured items, optionally filtered by module_key via category."""
    where: dict = {"clientId": client_id, "isActive": True, "isFeatured": True}
    if module_key:
        where["category"] = {"is": {"moduleKey": module_key}}

    return await prisma_client.catalogitem.find_many(
        where=where,
        order={"sortOrder": "asc"},
        include={"category": True},
    )
