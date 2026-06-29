from app.repositories import UnitRepository
from typing import List, Optional

class UnitService:
    def __init__(self, repository: UnitRepository):
        self.repository = repository

    async def get_property_units(self, property_id: str, client_id: str):
        """Fetch all individual units for a specific property."""
        return await self.repository.get_all_by_property(property_id, client_id)

    async def get_unit(self, unit_id: str, client_id: str):
        """Fetch a specific unit by UUID."""
        return await self.repository.get_by_id(unit_id, client_id)