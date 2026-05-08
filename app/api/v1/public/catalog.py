from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.db.client import prisma_client
from app.db.dependencies import get_current_tenant
from app.core.services import require_service

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
    where = {"clientId": tenant["id"], "isActive": True}
    if module_key:
        where["moduleKey"] = module_key
    if parent_id:
        where["parentId"] = parent_id
    else:
        where["parentId"] = None  # top-level by default

    cats = await prisma_client.catalogcategory.find_many(
        where=where,
        order={"sortOrder": "asc"},
        include={"children": {"where": {"isActive": True}, "order_by": {"sortOrder": "asc"}}},
    )
    return {"success": True, "data": [_fmt_category(c, include_children=True) for c in cats]}


@router.get("/categories/{category_id}/items")
async def list_category_items(
    category_id: str,
    featured_only: bool = Query(False),
    tenant: dict = Depends(get_current_tenant),
    _svc = Depends(require_service("catalog")),
):
    cat = await prisma_client.catalogcategory.find_first(
        where={"id": category_id, "clientId": tenant["id"], "isActive": True}
    )
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    where = {"categoryId": category_id, "clientId": tenant["id"], "isActive": True}
    if featured_only:
        where["isFeatured"] = True

    items = await prisma_client.catalogitem.find_many(
        where=where,
        order={"sortOrder": "asc"},
    )
    return {"success": True, "data": [_fmt_item(i) for i in items]}


@router.get("/items/{item_id}")
async def get_item(
    item_id: str,
    tenant: dict = Depends(get_current_tenant),
    _svc = Depends(require_service("catalog")),
):
    item = await prisma_client.catalogitem.find_first(
        where={"id": item_id, "clientId": tenant["id"], "isActive": True},
        include={"category": True},
    )
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
    where = {"clientId": tenant["id"], "isActive": True, "isFeatured": True}
    if module_key:
        where["category"] = {"is": {"moduleKey": module_key}}

    items = await prisma_client.catalogitem.find_many(
        where=where,
        order={"sortOrder": "asc"},
        include={"category": True},
    )
    return {"success": True, "data": [_fmt_item(i) for i in items]}
