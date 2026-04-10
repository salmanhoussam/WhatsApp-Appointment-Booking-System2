from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class ServiceBase(BaseModel):
    property_id: Optional[str] = None # 👈 جعلناه اختيارياً
    name_ar: str
    name_en: str
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    image_url: Optional[str] = None
    duration: Optional[int] = None
    base_price: float
    currency: str = "SAR"
    client_id: str

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    property_id: Optional[str] = None
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    image_url: Optional[str] = None
    duration: Optional[int] = None
    base_price: Optional[float] = None
    currency: Optional[str] = None
    client_id: Optional[str] = None

class Service(ServiceBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)