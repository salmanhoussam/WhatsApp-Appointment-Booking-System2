from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class UnitBase(BaseModel):
    unit_number: Optional[str] = None
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = []
    capacity: int
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    is_active: bool = True
    is_available: bool = True
    sort_order: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class UnitCreate(UnitBase):
    pass

class UnitResponse(UnitBase):
    id: str
    property_id: str
    client_id: str
    created_at: datetime
    updated_at: datetime