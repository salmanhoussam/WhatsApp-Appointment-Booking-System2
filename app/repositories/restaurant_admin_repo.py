"""
Restaurant Admin Repository — Prisma queries for RestaurantOrder management.
All queries MUST filter by restaurantId (which is owned by a specific client).
No business logic here.
"""

from typing import Optional
from app.db.client import prisma_client


async def find_restaurant_config(client_id: str):
    """Active RestaurantConfig for a tenant or None."""
    return await prisma_client.restaurantconfig.find_first(
        where={"clientId": client_id, "isActive": True}
    )


async def list_orders(restaurant_id: str, status: Optional[str] = None, limit: int = 50) -> list:
    where: dict = {"restaurantId": restaurant_id}
    if status:
        where["status"] = status
    return await prisma_client.restaurantorder.find_many(
        where=where,
        include={"items": True},
        order={"createdAt": "desc"},
        take=limit,
    )


async def find_order(restaurant_id: str, order_id: str):
    """Single order scoped to restaurant (which is owned by a specific tenant)."""
    return await prisma_client.restaurantorder.find_first(
        where={"id": order_id, "restaurantId": restaurant_id}
    )


async def update_order_status(order_id: str, status: str):
    """Update order status by primary key."""
    return await prisma_client.restaurantorder.update(
        where={"id": order_id},
        data={"status": status},
        include={"items": True},
    )


async def list_today_orders(restaurant_id: str, today_start) -> list:
    """All orders for a restaurant created today (for stats)."""
    return await prisma_client.restaurantorder.find_many(
        where={
            "restaurantId": restaurant_id,
            "createdAt": {"gte": today_start},
        }
    )
