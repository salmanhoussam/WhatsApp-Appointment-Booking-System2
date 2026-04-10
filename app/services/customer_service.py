from prisma import Prisma
from app.schemas.customer import CustomerCreate, CustomerUpdate
from typing import List, Optional

async def get_customers(db: Prisma, client_id: str) -> List[dict]:
    return await db.customer.find_many(
        where={"clientId": client_id}, # 👈 تصحيح الاسم
        order={"createdAt": "desc"}    # 👈 تصحيح الاسم
    )

async def get_customer(db: Prisma, customer_id: str, client_id: str) -> Optional[dict]:
    return await db.customer.find_first(
        where={"id": customer_id, "clientId": client_id} # 👈 تصحيح الاسم
    )

async def get_customer_by_phone(db: Prisma, phone: str, client_id: str) -> Optional[dict]:
    return await db.customer.find_first(
        where={"phone": phone, "clientId": client_id} # 👈 تصحيح الاسم
    )

async def create_customer(db: Prisma, data: CustomerCreate) -> dict:
    data_dict = data.model_dump()
    
    # تحويل الاسم ليتوافق مع قاعدة البيانات
    if "client_id" in data_dict:
        data_dict["clientId"] = data_dict.pop("client_id")
        
    return await db.customer.create(data=data_dict)

async def update_customer(db: Prisma, customer_id: str, data: CustomerUpdate, client_id: str) -> Optional[dict]:
    existing = await get_customer(db, customer_id, client_id)
    if not existing:
        return None
        
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # تحويل الاسم ليتوافق مع قاعدة البيانات
    if "client_id" in update_data:
        update_data["clientId"] = update_data.pop("client_id")
        
    return await db.customer.update(
        where={"id": customer_id},
        data=update_data
    )

async def delete_customer(db: Prisma, customer_id: str, client_id: str) -> bool:
    existing = await get_customer(db, customer_id, client_id)
    if not existing:
        return False
    await db.customer.delete(where={"id": customer_id})
    return True