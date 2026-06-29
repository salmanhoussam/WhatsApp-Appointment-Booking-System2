from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List
from app.db.client import prisma_client
from app.repositories import ClientRepository, PropertyRepository
from app.services import PropertyService
from app.schemas.property import PropertyResponse

router = APIRouter()

# Dependency Injection
def get_property_service():
    repository = PropertyRepository(prisma_client)
    return PropertyService(repository)

def get_client_repository():
    return ClientRepository(prisma_client)

@router.get("/", response_model=List[PropertyResponse])
async def get_properties(
    client_slug: str = Query(..., alias="client_slug"),
    service: PropertyService = Depends(get_property_service),
    client_repo: ClientRepository = Depends(get_client_repository)
):
    """
    Fetch all properties for a specific client (slug).
    Enterprise-ready: Resolves slug to UUID before querying properties.
    """
    client = await client_repo.get_by_slug(client_slug)
    if not client:
        raise HTTPException(status_code=404, detail="Client/Tenant not found")
        
    return await service.get_client_properties(client.id)

@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property_details(
    property_id: str,
    client_slug: str = Query(..., alias="client_slug"),
    service: PropertyService = Depends(get_property_service),
    client_repo: ClientRepository = Depends(get_client_repository)
):
    """Fetch details for a specific property including units."""
    client = await client_repo.get_by_slug(client_slug)
    if not client:
        raise HTTPException(status_code=404, detail="Client/Tenant not found")

    property_data = await service.get_property_details(property_id, client.id)
    if not property_data:
        raise HTTPException(status_code=404, detail="Property not found")
        
    return property_data
