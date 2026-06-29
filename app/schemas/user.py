from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: str
    full_name: str
    role: str = "manager"
    is_active: bool = True
    client_id: str

class UserCreate(UserBase):
    password: str  # كلمة مرور سيتم تشفيرها

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    client_id: Optional[str] = None

class User(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)