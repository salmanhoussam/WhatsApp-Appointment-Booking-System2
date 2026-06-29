from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class PropertyBase(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    max_guests: int
    bedrooms: int
    bathrooms: int
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class PropertyCreate(PropertyBase):
    pass

class PropertyUpdate(PropertyBase):
    name: Optional[str] = None
    max_guests: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None

class PropertyResponse(PropertyBase):
    id: str  # UUID
    client_id: str
    manager_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime