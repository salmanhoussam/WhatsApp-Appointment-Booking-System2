"""
Price Repository — Prisma queries for the Price (date-override) model.
All queries MUST filter by clientId + unitId. No business logic here.
"""

from app.db.client import prisma_client


async def delete_price_range(client_id: str, unit_id: str, date_gte, date_lte):
    """Delete all Price rows for a unit in the given date range, scoped to tenant."""
    return await prisma_client.price.delete_many(
        where={
            "unitId":   unit_id,
            "clientId": client_id,
            "date": {
                "gte": date_gte,
                "lte": date_lte,
            },
        }
    )


async def bulk_create_prices(records: list):
    """Bulk-insert Price rows."""
    return await prisma_client.price.create_many(data=records)
