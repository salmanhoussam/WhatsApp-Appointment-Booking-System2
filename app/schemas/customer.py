from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class CustomerBase(BaseModel):
    name: Optional[str] = None
    phone: str
    email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class CustomerResponse(CustomerBase):
    id: str
    client_id: str
    created_at: datetime
    updated_at: datetime