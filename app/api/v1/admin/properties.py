from fastapi import APIRouter, Body, Depends, Query
from app.db.client import prisma_client
from app.db.dependencies import get_current_tenant
from app.repositories import PropertyRepository
from app.services import PropertyService
from app.schemas.property import PropertyCreate, PropertyResponse
from app.schemas.pagination import PaginatedResponse

router = APIRouter()


def get_property_service():
    repository = PropertyRepository(prisma_client)
    return PropertyService(repository)


@router.get("/", response_model=PaginatedResponse[PropertyResponse])
async def list_properties(
    page:  int = Query(1,  ge=1,         description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_client: dict = Depends(get_current_tenant),
    service: PropertyService = Depends(get_property_service),
):
    """Paginated list of properties for the authenticated tenant."""
    return await service.get_client_properties(current_client["id"], page=page, limit=limit)


@router.post("/", response_model=PropertyResponse, status_code=201)
async def create_property(
    property_data: PropertyCreate,
    current_client: dict = Depends(get_current_tenant),
    service: PropertyService = Depends(get_property_service),
):
    """Create a new property for the authenticated tenant."""
    return await service.create_property(
        current_client["id"],
        property_data.dict(by_alias=True),
    )
