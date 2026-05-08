"""
Catalog Service — business logic only.
No Prisma imports here. All DB access via catalog_repository.
"""

from fastapi import HTTPException
from app.repositories import catalog_repository


# ── Formatters ────────────────────────────────────────────────────────────────

def _fmt_category(cat) -> dict:
    items = getattr(cat, "items", None) or []
    return {
        "id":               cat.id,
        "name_ar":          cat.nameAr,
        "name_en":          cat.nameEn,
        "image_url":        cat.imageUrl,
        "sort_order":       cat.sortOrder,
        "parent_id":        cat.parentId,
        "module_key":       cat.moduleKey,
        "display_template": cat.displayTemplate,
        "items_count":      len(items),
    }


def _fmt_item(item) -> dict:
    return {
        "id":             item.id,
        "category_id":    item.categoryId,
        "name_ar":        item.nameAr,
        "name_en":        item.nameEn,
        "description_ar": item.descriptionAr,
        "description_en": item.descriptionEn,
        "image_url":      item.imageUrl,
        "price":          float(item.price) if item.price is not None else None,
        "currency":       item.currency,
        "is_featured":    item.isFeatured,
        "is_available":   item.isActive,
        "sort_order":     item.sortOrder,
        "metadata":       item.metadata or {},
    }


# ── Service functions ─────────────────────────────────────────────────────────

async def list_categories(
    client_id:  str,
    module_key: str | None = None,
    parent_id:  str | None = None,
) -> list[dict]:
    cats = await catalog_repository.list_categories(client_id, module_key, parent_id)
    return [_fmt_category(c) for c in cats]


async def get_category_items(
    client_id:   str,
    category_id: str,
    search:      str | None = None,
) -> list[dict]:
    cat = await catalog_repository.find_category(client_id, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")

    items = await catalog_repository.list_items(client_id, category_id)

    if search:
        q = search.lower()
        items = [
            i for i in items
            if q in (i.nameAr or "").lower() or q in (i.nameEn or "").lower()
        ]

    return [_fmt_item(i) for i in items]


async def get_item(client_id: str, item_id: str) -> dict:
    item = await catalog_repository.find_item(client_id, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    data = _fmt_item(item)
    if hasattr(item, "category") and item.category:
        data["category"] = {
            "id":               item.category.id,
            "name_ar":          item.category.nameAr,
            "name_en":          item.category.nameEn,
            "display_template": item.category.displayTemplate,
        }
    return data
