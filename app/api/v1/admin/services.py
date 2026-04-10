from fastapi import APIRouter, HTTPException, Query
from app.db.client import prisma_client
from app.services import service_service
from app.schemas.service import Service, ServiceCreate, ServiceUpdate
from typing import List, Optional

router = APIRouter(prefix="/services", tags=["Services"])

@router.get("/", response_model=List[Service])
async def list_services(
    client_id: str = Query(..., description="Client ID"),
    property_id: Optional[str] = Query(None)
):
    return await service_service.get_services(prisma_client, client_id, property_id)

@router.post("/", response_model=Service, status_code=201)
async def create_service(
    data: ServiceCreate
):
    return await service_service.create_service(prisma_client, data)

@router.get("/{service_id}", response_model=Service)
async def get_service(
    service_id: str,
    client_id: str = Query(..., description="Client ID")
):
    service = await service_service.get_service(prisma_client, service_id, client_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

@router.put("/{service_id}", response_model=Service)
async def update_service(
    service_id: str,
    data: ServiceUpdate,
    client_id: str = Query(..., description="Client ID")
):
    updated = await service_service.update_service(prisma_client, service_id, data, client_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Service not found")
    return updated

@router.delete("/{service_id}", status_code=204)
async def delete_service(
    service_id: str,
    client_id: str = Query(..., description="Client ID")
):
    deleted = await service_service.delete_service(prisma_client, service_id, client_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Service not found")
    return