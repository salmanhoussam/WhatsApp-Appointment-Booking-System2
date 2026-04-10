from prisma import Prisma
from app.schemas.service import ServiceCreate, ServiceUpdate
from typing import List, Optional

async def get_services(db: Prisma, client_id: str, property_id: Optional[str] = None) -> List[dict]:
    # تصحيح clientId و propertyId و createdAt
    where = {"clientId": client_id}
    if property_id:
        where["propertyId"] = property_id
    return await db.service.find_many(where=where, order={"createdAt": "desc"})

async def get_service(db: Prisma, service_id: str, client_id: str) -> Optional[dict]:
    return await db.service.find_first(
        where={"id": service_id, "clientId": client_id}
    )

async def create_service(db: Prisma, data: ServiceCreate) -> dict:
    data_dict = data.model_dump()
    
    # تحويل الحقول لتطابق قاعدة البيانات
    if "client_id" in data_dict:
        data_dict["clientId"] = data_dict.pop("client_id")
    if "property_id" in data_dict:
        data_dict["propertyId"] = data_dict.pop("property_id")
    if "base_price" in data_dict:
        data_dict["basePrice"] = data_dict.pop("base_price")
        
    return await db.service.create(data=data_dict)

async def update_service(db: Prisma, service_id: str, data: ServiceUpdate, client_id: str) -> Optional[dict]:
    existing = await get_service(db, service_id, client_id)
    if not existing:
        return None
        
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # تحويل الحقول لتطابق قاعدة البيانات
    if "client_id" in update_data:
        update_data["clientId"] = update_data.pop("client_id")
    if "property_id" in update_data:
        update_data["propertyId"] = update_data.pop("property_id")
    if "base_price" in update_data:
        update_data["basePrice"] = update_data.pop("base_price")
        
    return await db.service.update(
        where={"id": service_id},
        data=update_data
    )

async def delete_service(db: Prisma, service_id: str, client_id: str) -> bool:
    existing = await get_service(db, service_id, client_id)
    if not existing:
        return False
    await db.service.delete(where={"id": service_id})
    return True