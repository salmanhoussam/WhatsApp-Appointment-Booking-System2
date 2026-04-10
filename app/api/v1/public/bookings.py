from fastapi import APIRouter, Depends, Query, HTTPException, Body
from app.db.client import prisma_client
from app.repositories import ClientRepository, BookingRepository, CustomerRepository
from app.services import BookingService
from app.schemas.booking import BookingCreate, BookingResponse

router = APIRouter()

def get_booking_service():
    booking_repo = BookingRepository(prisma_client)
    customer_repo = CustomerRepository(prisma_client)
    return BookingService(booking_repo, customer_repo)

def get_client_repository():
    return ClientRepository(prisma_client)

@router.post("/", response_model=BookingResponse)
async def create_booking(
    unit_id: str = Body(..., embed=True),
    client_slug: str = Body(..., embed=True),
    booking_payload: BookingCreate = Body(...),
    service: BookingService = Depends(get_booking_service),
    client_repo: ClientRepository = Depends(get_client_repository)
):
    """
    Enterprise Booking Endpoint:
    1. Resolves customer identity (via phone).
    2. Validates unit availability.
    3. Persists enterprise booking record.
    """
    client = await client_repo.get_by_slug(client_slug)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    try:
        # Separate customer data from booking meta
        customer_data = {
            "name": booking_payload.customer_name,
            "phone": booking_payload.customer_phone
        }
        
        booking_data = booking_payload.dict(exclude={"customer_name", "customer_phone"})
        
        booking = await service.create_booking(
            client.id, unit_id, customer_data, booking_data
        )
        return booking
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
