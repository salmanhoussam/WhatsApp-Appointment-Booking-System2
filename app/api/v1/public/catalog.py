from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.db.dependencies import get_current_tenant
from app.core.services import require_service
import app.repositories.catalog_repository as catalog_repo

router = APIRouter()


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
        "sort_order":     item.sortOrder,
        "metadata":       item.metadata or {},
    }


def _fmt_category(cat, include_children: bool = False) -> dict:
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
        d["children"] = [_fmt_category(c) for c in (cat.children or [])]
    return d


@router.get("/categories")
async def list_categories(
    module_key: Optional[str] = Query(None),
    parent_id:  Optional[str] = Query(None),
    tenant: dict = Depends(get_current_tenant),
    _svc = Depends(require_service("catalog")),
):
    cats = await catalog_repo.list_categories_with_children(
        tenant["id"], module_key, parent_id
    )
    return {"success": True, "data": [_fmt_category(c, include_children=True) for c in cats]}


@router.get("/categories/{category_id}/items")
async def list_category_items(
    category_id: str,
    featured_only: bool = Query(False),
    tenant: dict = Depends(get_current_tenant),
    _svc = Depends(require_service("catalog")),
):
    cat = await catalog_repo.find_category_basic(tenant["id"], category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    items = await catalog_repo.list_items_filtered(tenant["id"], category_id, featured_only)
    return {"success": True, "data": [_fmt_item(i) for i in items]}


@router.get("/items/{item_id}")
async def get_item(
    item_id: str,
    tenant: dict = Depends(get_current_tenant),
    _svc = Depends(require_service("catalog")),
):
    item = await catalog_repo.find_item(tenant["id"], item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    data = _fmt_item(item)
    if hasattr(item, "category") and item.category:
        data["category"] = _fmt_category(item.category)
    return {"success": True, "data": data}


@router.get("/featured")
async def list_featured(
    module_key: Optional[str] = Query(None),
    tenant: dict = Depends(get_current_tenant),
    _svc = Depends(require_service("catalog")),
):
    items = await catalog_repo.list_featured_items(tenant["id"], module_key)
    return {"success": True, "data": [_fmt_item(i) for i in items]}
