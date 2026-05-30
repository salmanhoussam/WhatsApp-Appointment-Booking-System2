"""
Store Admin Repository — Prisma queries for StoreOrder management.
All queries MUST filter by clientId. No business logic here.
"""

from typing import Optional
from app.db.client import prisma_client


async def list_orders(client_id: str, status: Optional[str] = None, limit: int = 50) -> list:
    where: dict = {"clientId": client_id}
    if status:
        where["status"] = status
    return await prisma_client.storeorder.find_many(
        where=where,
        include={"items": True},
        order={"createdAt": "desc"},
        take=limit,
    )


async def find_order(client_id: str, order_id: str):
    """Single store order scoped to tenant."""
    return await prisma_client.storeorder.find_first(
        where={"id": order_id, "clientId": client_id}
    )


async def update_order_status(order_id: str, status: str):
    """Update order status by primary key."""
    return await prisma_client.storeorder.update(
        where={"id": order_id},
        data={"status": status},
        include={"items": True},
    )


async def list_today_orders(client_id: str, today_start) -> list:
    """All orders for a tenant created today (for stats)."""
    return await prisma_client.storeorder.find_many(
        where={
            "clientId":  client_id,
            "createdAt": {"gte": today_start},
        }
    )
