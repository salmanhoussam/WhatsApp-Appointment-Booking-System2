from fastapi import APIRouter, HTTPException, Query, Depends
from app.db.client import prisma_client
from app.services import unit_service
# أزلنا استيراد Unit من هنا لأننا سنعتمد على موديلات Prisma مباشرة
from app.schemas.unit import UnitCreate, UnitUpdate
from typing import List, Optional
from app.db.dependencies import get_current_client 

router = APIRouter(prefix="/units", tags=["Units"])

# أزلنا response_model لتجنب تعارض الأسماء (camelCase vs snake_case)
@router.get("/")
async def list_units(
    property_id: Optional[str] = Query(None, description="Filter by property ID"),
    client_id: str = Depends(get_current_client) 
):
    return await unit_service.get_units(prisma_client, client_id, property_id)

@router.post("/", status_code=201)
async def create_unit(
    data: UnitCreate,
    client_id: str = Depends(get_current_client)
):
    # تعيين العميل تلقائياً للبيانات قبل حفظها (نستخدم getattr/setattr لضمان التوافق)
    if hasattr(data, 'client_id'):
        data.client_id = client_id
    elif hasattr(data, 'clientId'):
        data.clientId = client_id
        
    return await unit_service.create_unit(prisma_client, data)

@router.get("/{unit_id}")
async def get_unit(
    unit_id: str,
    client_id: str = Depends(get_current_client)
):
    unit = await unit_service.get_unit(prisma_client, unit_id, client_id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return unit

@router.put("/{unit_id}")
async def update_unit(
    unit_id: str,
    data: UnitUpdate,
    client_id: str = Depends(get_current_client)
):
    updated = await unit_service.update_unit(prisma_client, unit_id, data, client_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Unit not found")
    return updated

@router.delete("/{unit_id}", status_code=204)
async def delete_unit(
    unit_id: str,
    client_id: str = Depends(get_current_client)
):
    deleted = await unit_service.delete_unit(prisma_client, unit_id, client_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Unit not found")
    return