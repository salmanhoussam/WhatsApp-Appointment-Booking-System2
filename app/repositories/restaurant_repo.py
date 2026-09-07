"""
Restaurant Repository — Prisma queries only.
All queries MUST filter by clientId. No business logic here.
"""

from app.db.client import prisma_client


async def list_menu_categories(client_id: str, include_items: bool = False) -> list:
    """Active restaurant categories, sorted. Optionally include items."""
    kwargs: dict = {
        "where": {"clientId": client_id, "moduleKey": "restaurant", "isActive": True},
        "order": {"sortOrder": "asc"},
    }
    if include_items:
        kwargs["include"] = {"items": True}
    return await prisma_client.catalogcategory.find_many(**kwargs)


async def find_menu_category_with_items(client_id: str, category_id: str):
    """Single active restaurant category with its items or None."""
    return await prisma_client.catalogcategory.find_first(
        where={
            "id":        category_id,
            "clientId":  client_id,
            "moduleKey": "restaurant",
            "isActive":  True,
        },
        include={"items": True},
    )


async def find_catalog_items_by_ids(client_id: str, item_ids: list) -> list:
    """Fetch multiple active restaurant catalog items by ID list."""
    return await prisma_client.catalogitem.find_many(
        where={
            "id":       {"in": item_ids},
            "clientId": client_id,
            "isActive": True,
            "category": {"moduleKey": "restaurant"},
        }
    )


