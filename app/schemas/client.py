from pydantic import BaseModel, EmailStr, ConfigDict # أضف ConfigDict
from datetime import datetime
from typing import Optional

class ClientBase(BaseModel):
    name: str
    slug: str # 👈 أضفنا هذا الحقل لأنه إجباري في الداتابيز
    phone: str
    email: Optional[str] = None
    isActive: bool = True

class ClientCreate(ClientBase):
    password: str

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None # 👈 أضفناه هنا أيضاً
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    isActive: Optional[bool] = None
    password: Optional[str] = None

class Client(ClientBase):
    id: str
    createdAt: datetime
    updatedAt: datetime
    
    # 👈 الطريقة الصحيحة في Pydantic V2
    model_config = ConfigDict(from_attributes=True)