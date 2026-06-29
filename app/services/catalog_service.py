"""
Catalog Service — business logic only.
No Prisma imports. All DB access via repositories.

Covers both public (read-only) and admin (CRUD) operations.
"""

from fastapi import HTTPException
from prisma import Json
from typing import Optional

from app.repositories import catalog_repository
from app.repositories import admin_catalog_repo


_VALID_TEMPLATES = {"grid", "list", "showcase"}


# ── Formatters (public) ───────────────────────────────────────────────────────

def _fmt_item_public(item) -> dict:
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
        "sort_order":     item.sortOrder,
        "metadata":       item.metadata or {},
    }


def _fmt_category_public(cat, include_children: bool = False) -> dict:
    d = {
        "id":               cat.id,
        "name_ar":          cat.nameAr,
        "name_en":          cat.nameEn,
        "image_url":        cat.imageUrl,
        "sort_order":       cat.sortOrder,
        "parent_id":        cat.parentId,
        "module_key":       cat.moduleKey,
        "display_template": cat.displayTemplate,
    }
    if include_children and hasattr(cat, "children"):
        d["children"] = [_fmt_category_public(c) for c in (cat.children or [])]
    return d


# ── Formatters (admin) ────────────────────────────────────────────────────────

def _fmt_item_admin(i) -> dict:
    return {
        "id":            i.id,
        "name_ar":       i.nameAr,
        "name_en":       i.nameEn,
        "price":         float(i.price) if i.price is not None else None,
        "currency":      i.currency,
        "image_url":     i.imageUrl,
        "is_featured":   i.isFeatured,
        "is_active":     i.isActive,
        "sort_order":    i.sortOrder,
        "category_id":   i.categoryId,
        "category_name": i.category.nameAr if hasattr(i, "category") and i.category else None,
        "metadata":      i.metadata or {},
    }


def _fmt_category_admin(c) -> dict:
    return {
        "id":               c.id,
        "name_ar":          c.nameAr,
        "name_en":          c.nameEn,
        "image_url":        c.imageUrl,
        "sort_order":       c.sortOrder,
        "parent_id":        c.parentId,
        "module_key":       c.moduleKey,
        "is_active":        c.isActive,
        "display_template": c.displayTemplate,
        "children_count":   len(c.children) if hasattr(c, "children") and c.children else 0,
    }


# ── Public Service Functions ──────────────────────────────────────────────────

async def list_categories_public(
    client_id:  str,
    module_key: Optional[str] = None,
    parent_id:  Optional[str] = None,
) -> list[dict]:
    cats = await catalog_repository.list_categories_with_children(
        client_id, module_key, parent_id
    )
    return [_fmt_category_public(c, include_children=True) for c in cats]


async def get_category_items_public(
    client_id:    str,
    category_id:  str,
    featured_only: bool = False,
) -> list[dict]:
    cat = await catalog_repository.find_category_basic(client_id, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    items = await catalog_repository.list_items_filtered(client_id, category_id, featured_only)
    return [_fmt_item_public(i) for i in items]


async def get_item_public(client_id: str, item_id: str) -> dict:
    item = await catalog_repository.find_item(client_id, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    data = _fmt_item_public(item)
    if hasattr(item, "category") and item.category:
        data["category"] = _fmt_category_public(item.category)
    return data


async def list_featured_public(
    client_id:  str,
    module_key: Optional[str] = None,
) -> list[dict]:
    items = await catalog_repository.list_featured_items(client_id, module_key)
    return [_fmt_item_public(i) for i in items]


# ── Admin Service Functions ───────────────────────────────────────────────────

async def admin_list_categories(
    client_id:        str,
    module_key:       Optional[str] = None,
    parent_id:        Optional[str] = None,
    include_inactive: bool = False,
) -> list[dict]:
    cats = await admin_catalog_repo.list_categories(
        client_id, module_key, parent_id, include_inactive
    )
    return [_fmt_category_admin(c) for c in cats]


async def admin_create_category(
    client_id:        str,
    name_ar:          str,
    name_en:          Optional[str],
    image_url:        Optional[str],
    sort_order:       int,
    parent_id:        Optional[str],
    module_key:       str,
    display_template: str,
) -> dict:
    if display_template not in _VALID_TEMPLATES:
        raise HTTPException(400, f"display_template must be one of: {_VALID_TEMPLATES}")
    cat = await admin_catalog_repo.create_category(data={
        "clientId":        client_id,
        "nameAr":          name_ar,
        "nameEn":          name_en,
        "imageUrl":        image_url,
        "sortOrder":       sort_order,
        "parentId":        parent_id,
        "moduleKey":       module_key,
        "displayTemplate": display_template,
        "isActive":        True,
    })
    return {"id": cat.id}


async def admin_update_category(
    client_id:        str,
    category_id:      str,
    name_ar:          Optional[str],
    name_en:          Optional[str],
    image_url:        Optional[str],
    sort_order:       Optional[int],
    parent_id:        Optional[str],
    is_active:        Optional[bool],
    display_template: Optional[str],
) -> dict:
    cat = await admin_catalog_repo.find_category(client_id, category_id)
    if not cat:
        raise HTTPException(404, "Category not found")
    if display_template is not None and display_template not in _VALID_TEMPLATES:
        raise HTTPException(400, f"display_template must be one of: {_VALID_TEMPLATES}")
    patch = {k: v for k, v in {
        "nameAr":          name_ar,
        "nameEn":          name_en,
        "imageUrl":        image_url,
        "sortOrder":       sort_order,
        "parentId":        parent_id,
        "isActive":        is_active,
        "displayTemplate": display_template,
    }.items() if v is not None}
    updated = await admin_catalog_repo.update_category(category_id, patch)
    return {"id": updated.id}


async def admin_delete_category(client_id: str, category_id: str) -> None:
    cat = await admin_catalog_repo.find_category(client_id, category_id)
    if not cat:
        raise HTTPException(404, "Category not found")
    await admin_catalog_repo.soft_delete_category(category_id, client_id)


async def admin_seed_from_template(
    client_id:      str,
    template_key:   str,
    module_key:     str,
    categories:     list,
    clear_existing: bool,
) -> dict:
    invalid = [c.display_template for c in categories if c.display_template not in _VALID_TEMPLATES]
    if invalid:
        raise HTTPException(400, f"Invalid display_template value(s): {invalid}")
    if clear_existing:
        await admin_catalog_repo.delete_categories_by_client(client_id)
    created = []
    for i, cat in enumerate(categories):
        record = await admin_catalog_repo.create_category(data={
            "clientId":        client_id,
            "nameAr":          cat.name_ar,
            "nameEn":          cat.name_en,
            "displayTemplate": cat.display_template,
            "moduleKey":       module_key,
            "sortOrder":       i,
            "isActive":        True,
        })
        created.append({"id": record.id, "name_ar": record.nameAr, "name_en": record.nameEn})
    return {"template_key": template_key, "created_count": len(created), "categories": created}


async def admin_list_items(
    client_id:        str,
    category_id:      Optional[str] = None,
    featured_only:    bool = False,
    include_inactive: bool = False,
) -> list[dict]:
    items = await admin_catalog_repo.list_items(
        client_id, category_id, featured_only, include_inactive
    )
    return [_fmt_item_admin(i) for i in items]


async def admin_create_item(
    client_id:      str,
    category_id:    str,
    name_ar:        str,
    name_en:        Optional[str],
    description_ar: Optional[str],
    description_en: Optional[str],
    image_url:      Optional[str],
    price:          Optional[float],
    currency:       str,
    is_featured:    bool,
    sort_order:     int,
    metadata:       Optional[dict],
) -> dict:
    cat = await admin_catalog_repo.find_active_category(client_id, category_id)
    if not cat:
        raise HTTPException(404, "Category not found")
    data: dict = {
        "clientId":   client_id,
        "categoryId": category_id,
        "nameAr":     name_ar,
        "currency":   currency,
        "isFeatured": is_featured,
        "sortOrder":  sort_order,
        "isActive":   True,
    }
    if name_en        is not None: data["nameEn"]        = name_en
    if description_ar is not None: data["descriptionAr"] = description_ar
    if description_en is not None: data["descriptionEn"] = description_en
    if image_url      is not None: data["imageUrl"]      = image_url
    if price          is not None: data["price"]         = price
    if metadata       is not None: data["metadata"]      = Json(metadata)
    item = await admin_catalog_repo.create_item(data)
    return {"id": item.id}


async def admin_update_item(
    client_id:      str,
    item_id:        str,
    name_ar:        Optional[str],
    name_en:        Optional[str],
    description_ar: Optional[str],
    description_en: Optional[str],
    image_url:      Optional[str],
    price:          Optional[float],
    currency:       Optional[str],
    is_featured:    Optional[bool],
    is_active:      Optional[bool],
    sort_order:     Optional[int],
    metadata:       Optional[dict],
    category_id:    Optional[str] = None,
) -> dict:
    item = await admin_catalog_repo.find_item(client_id, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    if category_id is not None:
        cat = await admin_catalog_repo.find_active_category(client_id, category_id)
        if not cat:
            raise HTTPException(404, "Target category not found or unauthorized")
    patch = {k: v for k, v in {
        "nameAr":        name_ar,
        "nameEn":        name_en,
        "descriptionAr": description_ar,
        "descriptionEn": description_en,
        "imageUrl":      image_url,
        "price":         price,
        "currency":      currency,
        "isFeatured":    is_featured,
        "isActive":      is_active,
        "sortOrder":     sort_order,
        "metadata":      metadata,
        "categoryId":    category_id,
    }.items() if v is not None}
    updated = await admin_catalog_repo.update_item(item_id, patch)
    return {"id": updated.id}


async def admin_delete_item(client_id: str, item_id: str) -> None:
    item = await admin_catalog_repo.find_item(client_id, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    await admin_catalog_repo.soft_delete_item(item_id)
