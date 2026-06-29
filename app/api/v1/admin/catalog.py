from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.db.dependencies import get_current_admin_user
from app.core.services import require_service
from app.services import catalog_service

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

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
    category_id:    Optional[str] = None

class TemplateCategorySeed(BaseModel):
    name_ar:          str
    name_en:          str
    display_template: str = "grid"

class SeedFromTemplateRequest(BaseModel):
    template_key:   str
    module_key:     str = "catalog"
    categories:     list[TemplateCategorySeed]
    clear_existing: bool = False


# ── Categories ─────────────────────────────────────────────────────────────────

@router.get("/categories")
async def list_categories(
    module_key:       Optional[str] = Query(None),
    parent_id:        Optional[str] = Query(None),
    include_inactive: bool          = Query(False),
    user = Depends(get_current_admin_user),
    _svc = Depends(require_service("catalog")),
):
    data = await catalog_service.admin_list_categories(
        client_id=user.clientId,
        module_key=module_key,
        parent_id=parent_id,
        include_inactive=include_inactive,
    )
    return {"success": True, "data": data}


@router.post("/categories", status_code=201)
async def create_category(
    body: CategoryCreate,
    user = Depends(get_current_admin_user),
    _svc = Depends(require_service("catalog")),
):
    data = await catalog_service.admin_create_category(
        client_id=user.clientId,
        name_ar=body.name_ar,
        name_en=body.name_en,
        image_url=body.image_url,
        sort_order=body.sort_order,
        parent_id=body.parent_id,
        module_key=body.module_key,
        display_template=body.display_template,
    )
    return {"success": True, "data": data}


@router.patch("/categories/{category_id}")
async def update_category(
    category_id: str,
    body: CategoryUpdate,
    user = Depends(get_current_admin_user),
    _svc = Depends(require_service("catalog")),
):
    data = await catalog_service.admin_update_category(
        client_id=user.clientId,
        category_id=category_id,
        name_ar=body.name_ar,
        name_en=body.name_en,
        image_url=body.image_url,
        sort_order=body.sort_order,
        parent_id=body.parent_id,
        is_active=body.is_active,
        display_template=body.display_template,
    )
    return {"success": True, "data": data}


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    user = Depends(get_current_admin_user),
    _svc = Depends(require_service("catalog")),
):
    await catalog_service.admin_delete_category(user.clientId, category_id)
    return {"success": True}


@router.post("/seed-from-template", status_code=201)
async def seed_from_template(
    body: SeedFromTemplateRequest,
    user = Depends(get_current_admin_user),
    _svc = Depends(require_service("catalog")),
):
    data = await catalog_service.admin_seed_from_template(
        client_id=user.clientId,
        template_key=body.template_key,
        module_key=body.module_key,
        categories=body.categories,
        clear_existing=body.clear_existing,
    )
    return {"success": True, "data": data}


# ── Items ──────────────────────────────────────────────────────────────────────

@router.get("/items")
async def list_items(
    category_id:      Optional[str] = Query(None),
    featured_only:    bool          = Query(False),
    include_inactive: bool          = Query(False),
    user = Depends(get_current_admin_user),
    _svc = Depends(require_service("catalog")),
):
    data = await catalog_service.admin_list_items(
        client_id=user.clientId,
        category_id=category_id,
        featured_only=featured_only,
        include_inactive=include_inactive,
    )
    return {"success": True, "data": data}


@router.post("/items", status_code=201)
async def create_item(
    body: ItemCreate,
    user = Depends(get_current_admin_user),
    _svc = Depends(require_service("catalog")),
):
    data = await catalog_service.admin_create_item(
        client_id=user.clientId,
        category_id=body.category_id,
        name_ar=body.name_ar,
        name_en=body.name_en,
        description_ar=body.description_ar,
        description_en=body.description_en,
        image_url=body.image_url,
        price=body.price,
        currency=body.currency,
        is_featured=body.is_featured,
        sort_order=body.sort_order,
        metadata=body.metadata,
    )
    return {"success": True, "data": data}


@router.patch("/items/{item_id}")
async def update_item(
    item_id: str,
    body: ItemUpdate,
    user = Depends(get_current_admin_user),
    _svc = Depends(require_service("catalog")),
):
    data = await catalog_service.admin_update_item(
        client_id=user.clientId,
        item_id=item_id,
        name_ar=body.name_ar,
        name_en=body.name_en,
        description_ar=body.description_ar,
        description_en=body.description_en,
        image_url=body.image_url,
        price=body.price,
        currency=body.currency,
        is_featured=body.is_featured,
        is_active=body.is_active,
        sort_order=body.sort_order,
        metadata=body.metadata,
        category_id=body.category_id,
    )
    return {"success": True, "data": data}


@router.delete("/items/{item_id}")
async def delete_item(
    item_id: str,
    user = Depends(get_current_admin_user),
    _svc = Depends(require_service("catalog")),
):
    await catalog_service.admin_delete_item(user.clientId, item_id)
    return {"success": True}
