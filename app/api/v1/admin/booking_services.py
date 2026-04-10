from fastapi import APIRouter, HTTPException, Query
from app.db.client import prisma_client
from app.services import booking_service_service
from app.schemas.booking_service import BookingService, BookingServiceCreate, BookingServiceUpdate
from typing import List

router = APIRouter(prefix="/bookings/{booking_id}/services", tags=["Booking Services"])

@router.get("/", response_model=List[BookingService])
async def list_booking_services(
    booking_id: str,
    client_id: str = Query(..., description="Client ID")
):
    return await booking_service_service.get_booking_services(prisma_client, booking_id, client_id)

@router.post("/", response_model=BookingService, status_code=201)
async def add_service_to_booking(
    booking_id: str,
    data: BookingServiceCreate,
    client_id: str = Query(..., description="Client ID")
):
    result = await booking_service_service.add_service_to_booking(prisma_client, booking_id, data, client_id)
    if not result:
        raise HTTPException(status_code=404, detail="Booking or Service not found")
    return result

@router.put("/{service_id}", response_model=BookingService)
async def update_booking_service(
    booking_id: str,
    service_id: str,
    data: BookingServiceUpdate,
    client_id: str = Query(..., description="Client ID")
):
    updated = await booking_service_service.update_booking_service(prisma_client, booking_id, service_id, data, client_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Booking service not found")
    return updated

@router.delete("/{service_id}", status_code=204)
async def remove_service_from_booking(
    booking_id: str,
    service_id: str,
    client_id: str = Query(..., description="Client ID")
):
    deleted = await booking_service_service.remove_service_from_booking(prisma_client, booking_id, service_id, client_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Booking service not found")
    return