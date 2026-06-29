from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List
from app.db.client import prisma_client
from app.repositories import ClientRepository, UnitRepository
from app.repositories.availability_repo import AvailabilityRepository
from app.services import UnitService
from app.services.availability_service import AvailabilityService
from app.schemas.unit import UnitResponse
from app.core.exceptions import BusinessLogicError

router = APIRouter()


# ── Dependency factories ──────────────────────────────────────────────────────

def get_unit_service():
    return UnitService(UnitRepository(prisma_client))

def get_client_repository():
    return ClientRepository(prisma_client)

def get_availability_service():
    return AvailabilityService(AvailabilityRepository(prisma_client))


# ── Existing: list units for a property ──────────────────────────────────────

@router.get("/{property_id}/units", response_model=List[UnitResponse])
async def get_property_units(
    property_id: str,
    client_slug: str = Query(...),
    service: UnitService = Depends(get_unit_service),
    client_repo: ClientRepository = Depends(get_client_repository),
):
    """Fetch all active units for a property."""
    client = await client_repo.get_by_slug(client_slug)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return await service.get_property_units(property_id, client.id)


# ── New: availability calendar ────────────────────────────────────────────────

@router.get("/{unit_id}/availability")
async def get_unit_availability(
    unit_id: str,
    client_slug: str = Query(..., description="Tenant slug"),
    month: str = Query(
        ...,
        description="Month in YYYY-MM format (e.g. 2025-06)",
        pattern=r"^\d{4}-(0[1-9]|1[0-2])$",
    ),
    service: AvailabilityService = Depends(get_availability_service),
    client_repo: ClientRepository = Depends(get_client_repository),
):
    """
    Returns a day-by-day availability calendar for a single unit.

    Each day has one of four statuses:
      - **available**  — priced, not booked, open for reservations
      - **booked**     — a pending/confirmed booking covers this date
      - **blocked**    — price row exists but owner disabled availability
      - **no_price**   — no price configured (implicitly unavailable)

    Example: `GET /api/v1/public/units/{id}/availability?client_slug=demo&month=2025-06`
    """
    # Resolve client
    client = await client_repo.get_by_slug(client_slug)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Parse month
    try:
        year, mon = int(month[:4]), int(month[5:7])
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM.")

    try:
        return await service.get_monthly_availability(
            unit_id=unit_id,
            client_id=client.id,
            year=year,
            month=mon,
        )
    except BusinessLogicError as exc:
        raise HTTPException(status_code=400, detail=exc.message)
