from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from prisma import Json

from app.db.dependencies import get_current_admin_user
from app.core.services import require_service
from app.repositories import admin_catalog_repo as _repo

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

_VALID_TEMPLATES = {"grid", "list", "showcase"}

class CategoryCreate(BaseModel):
    name_ar:          str
    name_en:          Optional[str] = None
    image_url:        Optional[str] = None
    sort_order:       int = 0
    parent_id:        Optional[str] = None
    module_key:       str = "catalog"
    display_template: str = "grid"

class CategoryUpdate(BaseModel):
    name_ar:          Optional[str] = None
    name_en:          Optional[str] = None
    image_url:        Optional[str] = None
    sort_order:       Optional[int] = None
    parent_id:        Optional[str] = None
    is_active:        Optional[bool] = None
    display_template: Optional[str] = None

class ItemCreate(BaseModel):
    category_id:    str
    name_ar:        str
    name_en:        Optional[str] = None
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    image_url:      Optional[str] = None
    price:          Optional[float] = None
    currency:       str = "USD"
    is_featured:    bool = False
    sort_order:     int = 0
    metadata:       Optional[dict] = None

class ItemUpdate(BaseModel):
    name_ar:        Optional[str] = None
    name_en:        Optional[str] = None
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    image_url:      Optional[str] = None
    price:          Optional[float] = None
    currency:       Optional[str] = None
    is_featured:    Optional[bool] = None
    is_active:      Optional[bool] = None
    sort_order:     Optional[int] = None
    metadata:       Optional[dict] = None


# ── Categories ─────────────────────────────────────────────────────────────────

@router.get("/categories")
async def list_categories(
    module_key:       Optional[str] = Query(None),
    parent_id:        Optional[str] = Query(None),
    include_inactive: bool          = Query(False),
    user = Depends(get_current_admin_user),
    _svc = Depends(require_service("catalog")),
):
    cats = await _repo.list_categories(
        client_id=user.clientId,
        module_key=module_key,
        parent_id=parent_id,
        include_inactive=include_inactive,
    )
    return {"success": True, "data": [
        {
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
        for c in cats
    ]}


@router.post("/categories", status_code=201)
async def create_category(
    body: CategoryCreate,
    user = Depends(get_current_admin_user),
    _svc = Depends(require_service("catalog")),
):
    if body.display_template not in _VALID_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"display_template must be one of: {_VALID_TEMPLATES}")

    cat = await _repo.create_category(data={
        "clientId":        user.clientId,
        "nameAr":          body.name_ar,
        "nameEn":          body.name_en,
        "imageUrl":        body.image_url,
        "sortOrder":       body.sort_order,
        "parentId":        body.parent_id,
        "moduleKey":       body.module_key,
        "displayTemplate": body.display_template,
        "isActive":        True,
    })
    return {"success": True, "data": {"id": cat.id}}


@router.patch("/categories/{category_id}")
async def update_category(
    category_id: str,
    body: CategoryUpdate,
    user = Depends(get_current_admin_user),
    _svc = Depends(require_service("catalog")),
):
    cat = await _repo.find_category(user.clientId, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    if body.display_template is not None and body.display_template not in _VALID_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"display_template must be one of: {_VALID_TEMPLATES}")

    patch = {k: v for k, v in {
        "nameAr":          body.name_ar,
        "nameEn":          body.name_en,
        "imageUrl":        body.image_url,
        "sortOrder":       body.sort_order,
        "parentId":        body.parent_id,
        "isActive":        body.is_active,
        "displayTemplate": body.display_template,
    }.items() if v is not None}

    updated = await _repo.update_category(category_id, patch)
    return {"success": True, "data": {"id": updated.id}}


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    user = Depends(get_current_admin_user),
    _svc = Depends(require_service("catalog")),
):
    cat = await _repo.find_category(user.clientId, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    # Soft delete — deactivates items in this category too
    await _repo.soft_delete_category(category_id, user.clientId)
    return {"success": True}


# ── Seed from template ─────────────────────────────────────────────────────────

class TemplateCategorySeed(BaseModel):
    name_ar:          str
    name_en:          str
    display_template: str = "grid"

class SeedFromTemplateRequest(BaseModel):
    template_key:   str
    module_key:     str = "catalog"
    categories:     list[TemplateCategorySeed]
    clear_existing: bool = False


@router.post("/seed-from-template", status_code=201)
async def seed_from_template(
    body: SeedFromTemplateRequest,
    user = Depends(get_current_admin_user),
    _svc = Depends(require_service("catalog")),
):
    """
    Bulk-seed catalog categories from a template.
    Called once during onboarding — the tenant picks a template on the sign-up page
    and this endpoint creates all starter categories automatically.
    """
    invalid = [c.display_template for c in body.categories if c.display_template not in _VALID_TEMPLATES]
    if invalid:
        raise HTTPException(400, f"Invalid display_template value(s): {invalid}")

    if body.clear_existing:
        await _repo.delete_categories_by_client(user.clientId)

    created = []
    for i, cat in enumerate(body.categories):
        record = await _repo.create_category(data={
            "clientId":        user.clientId,
            "nameAr":          cat.name_ar,
            "nameEn":          cat.name_en,
            "displayTemplate": cat.display_template,
            "moduleKey":       body.module_key,
            "sortOrder":       i,
            "isActive":        True,
        })
        created.append({"id": record.id, "name_ar": record.nameAr, "name_en": record.nameEn})

    return {
        "success": True,
        "data": {
            "template_key":  body.template_key,
            "created_count": len(created),
            "categories":    created,
        },
    }


# ── Items ──────────────────────────────────────────────────────────────────────

@router.get("/items")
async def list_items(
    category_id:      Optional[str] = Query(None),
    featured_only:    bool          = Query(False),
    include_inactive: bool          = Query(False),
    user = Depends(get_current_admin_user),
    _svc = Depends(require_service("catalog")),
):
    items = await _repo.list_items(
        client_id=user.clientId,
        category_id=category_id,
        featured_only=featured_only,
        include_inactive=include_inactive,
    )
    return {"success": True, "data": [
        {
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
        for i in items
    ]}


@router.post("/items", status_code=201)
async def create_item(
    body: ItemCreate,
    user = Depends(get_current_admin_user),
    _svc = Depends(require_service("catalog")),
):
    # Verify category belongs to this client
    cat = await _repo.find_active_category(user.clientId, body.category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    data: dict = {
        "clientId":   user.clientId,
        "categoryId": body.category_id,
        "nameAr":     body.name_ar,
        "currency":   body.currency,
        "isFeatured": body.is_featured,
        "sortOrder":  body.sort_order,
        "isActive":   True,
    }
    if body.name_en        is not None: data["nameEn"]        = body.name_en
    if body.description_ar is not None: data["descriptionAr"] = body.description_ar
    if body.description_en is not None: data["descriptionEn"] = body.description_en
    if body.image_url      is not None: data["imageUrl"]      = body.image_url
    if body.price          is not None: data["price"]         = body.price
    if body.metadata       is not None: data["metadata"]      = Json(body.metadata)

    item = await _repo.create_item(data)
    return {"success": True, "data": {"id": item.id}}


@router.patch("/items/{item_id}")
async def update_item(
    item_id: str,
    body: ItemUpdate,
    user = Depends(get_current_admin_user),
    _svc = Depends(require_service("catalog")),
):
    item = await _repo.find_item(user.clientId, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    patch = {k: v for k, v in {
        "nameAr":        body.name_ar,
        "nameEn":        body.name_en,
        "descriptionAr": body.description_ar,
        "descriptionEn": body.description_en,
        "imageUrl":      body.image_url,
        "price":         body.price,
        "currency":      body.currency,
        "isFeatured":    body.is_featured,
        "isActive":      body.is_active,
        "sortOrder":     body.sort_order,
        "metadata":      body.metadata,
    }.items() if v is not None}

    updated = await _repo.update_item(item_id, patch)
    return {"success": True, "data": {"id": updated.id}}


@router.delete("/items/{item_id}")
async def delete_item(
    item_id: str,
    user = Depends(get_current_admin_user),
    _svc = Depends(require_service("catalog")),
):
    item = await _repo.find_item(user.clientId, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    await _repo.soft_delete_item(item_id)
    return {"success": True}
