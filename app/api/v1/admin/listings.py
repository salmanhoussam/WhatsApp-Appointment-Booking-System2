from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List
from app.db.client import prisma_client
from app.db.dependencies import get_current_tenant
from app.repositories import ListingRepository
from app.services import ListingService
from app.schemas.listing import ListingCreate, ListingResponse

router = APIRouter()

# Dependency Injection for the service
def get_listing_service():
    repository = ListingRepository(prisma_client)
    return ListingService(repository)

@router.post("/", response_model=ListingResponse)
async def create_listing(
    listing_data: ListingCreate,
    current_tenant: dict = Depends(get_current_tenant),
    service: ListingService = Depends(get_listing_service)
):
    """Create a new listing for the authenticated tenant."""
    return await service.create_listing(
        current_tenant["id"], 
        current_tenant["slug"], 
        listing_data.dict(by_alias=True)
    )

@router.get("/", response_model=List[ListingResponse])
async def list_listings(
    current_tenant: dict = Depends(get_current_tenant),
    service: ListingService = Depends(get_listing_service)
):
    """List all listings belonging to the authenticated tenant."""
    return await service.get_all_by_tenant(current_tenant["slug"])
