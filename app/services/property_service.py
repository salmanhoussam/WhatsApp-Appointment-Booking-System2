import asyncio
from app.repositories import PropertyRepository
from app.schemas.pagination import PaginatedResponse
from typing import List, Optional

class PropertyService:
    def __init__(self, repository: PropertyRepository):
        self.repository = repository

    async def get_client_properties(self, client_id: str, page: int = 1, limit: int = 20) -> PaginatedResponse:
        """Fetch properties for a client — paginated."""
        skip = (page - 1) * limit
        total, items = await asyncio.gather(
            self.repository.count_by_client(client_id),
            self.repository.get_all_by_client(client_id, skip=skip, take=limit),
        )
        return PaginatedResponse.build(data=items, total=total, page=page, limit=limit)

    async def get_property_details(self, property_id: str, client_id: str):
        """Fetch a specific property with nested units and services."""
        return await self.repository.get_by_id(property_id, client_id)

    async def create_property(self, client_id: str, data: dict):
        """Create a new property belonging to an enterprise client."""
        return await self.repository.create(client_id, data)