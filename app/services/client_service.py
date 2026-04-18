from app.db.client import prisma_client
from app.schemas.client import ClientCreate, ClientUpdate
from app.core.security import get_password_hash
from typing import Optional

async def create_client(data: ClientCreate):
    hashed = get_password_hash(data.password)
    return await prisma_client.client.create(
        data={
            **data.dict(exclude={"password"}),
            "password_hash": hashed
        }
    )

async def get_client(client_id: str):
    return await prisma_client.client.find_unique(where={"id": client_id})

async def update_client(client_id: str, data: ClientUpdate):
    update_data = data.dict(exclude_unset=True)
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))
    return await prisma_client.client.update(
        where={"id": client_id},
        data=update_data
    )