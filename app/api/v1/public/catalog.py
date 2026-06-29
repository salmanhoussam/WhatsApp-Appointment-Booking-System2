from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.db.dependencies import get_current_tenant
from app.core.services import require_service
from app.services import catalog_service

router = APIRouter()


@router.get("/categories")
async def list_categories(
    module_key: Optional[str] = Query(None),
    parent_id:  Optional[str] = Query(None),
    tenant: dict = Depends(get_current_tenant),
    _svc = Depends(require_service("catalog")),
):
    data = await catalog_service.list_categories_public(
        client_id=tenant["id"],
        module_key=module_key,
        parent_id=parent_id,
    )
    return {"success": True, "data": data}


@router.get("/categories/{category_id}/items")
async def list_category_items(
    category_id:   str,
    featured_only: bool = Query(False),
    tenant: dict = Depends(get_current_tenant),
    _svc = Depends(require_service("catalog")),
):
    data = await catalog_service.get_category_items_public(
        client_id=tenant["id"],
        category_id=category_id,
        featured_only=featured_only,
    )
    return {"success": True, "data": data}


@router.get("/items/{item_id}")
async def get_item(
    item_id: str,
    tenant: dict = Depends(get_current_tenant),
    _svc = Depends(require_service("catalog")),
):
    data = await catalog_service.get_item_public(
        client_id=tenant["id"],
        item_id=item_id,
    )
    return {"success": True, "data": data}


@router.get("/featured")
async def list_featured(
    module_key: Optional[str] = Query(None),
    tenant: dict = Depends(get_current_tenant),
    _svc = Depends(require_service("catalog")),
):
    data = await catalog_service.list_featured_public(
        client_id=tenant["id"],
        module_key=module_key,
    )
    return {"success": True, "data": data}
