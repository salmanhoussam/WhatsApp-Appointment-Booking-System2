"""
Public Listings Router — /api/v1/public/listings/

Reuses the battle-tested public_service.get_client_catalog()
to fetch units (chalets, villas) for a tenant by slug.
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import date

from app.db.client import prisma_client
from app.services import public_service

router = APIRouter()


@router.get("/")
async def get_listings(
    client_slug: str = Query(..., description="Tenant slug (e.g. 'smar')"),
    type: Optional[str] = Query(None, description="villa | chalet | restaurant | pool"),
    check_in: Optional[date] = Query(None),
    check_out: Optional[date] = Query(None),
    guests: int = Query(1),
):
    """
    Fetch all units/listings for a tenant.
    Supports optional date-availability filtering and type filtering.
    """
    # Validate dates if provided
    if check_in and check_out and check_in >= check_out:
        raise HTTPException(status_code=400, detail="check_out must be after check_in")

    if check_in and check_in < date.today():
        raise HTTPException(status_code=400, detail="Cannot search past dates")

    data = await public_service.get_client_catalog(
        prisma_client,
        slug=client_slug,
        check_in=check_in,
        check_out=check_out,
        guests=guests,
        unit_type=type,
    )

    if not data:
        raise HTTPException(status_code=404, detail="Client not found")

    return data
