"""
Dating Repository — Prisma queries for DatePage.
Prisma calls ONLY — no business logic.
"""

from datetime import datetime, timezone

from app.db.client import prisma_client


async def create_date_page(data: dict):
    """Insert a new DatePage row and return the created record."""
    return await prisma_client.datepage.create(data=data)


async def get_date_page(slug: str):
    """Fetch an active (non-deleted) DatePage by slug, or None."""
    return await prisma_client.datepage.find_first(
        where={"slug": slug, "is_deleted": False}
    )


async def record_answer(
    slug: str,
    answer: str,
    chosen_food: str,
    event_date: datetime,
):
    """Stamp the answer fields on an existing DatePage row."""
    return await prisma_client.datepage.update(
        where={"slug": slug},
        data={
            "answer": answer,
            "chosen_food": chosen_food,
            "event_date": event_date,
            "answered_at": datetime.now(timezone.utc),
        },
    )


async def soft_delete_expired() -> int:
    """
    Mark all expired, non-deleted pages as deleted.
    Returns the count of rows affected.
    """
    result = await prisma_client.datepage.update_many(
        where={
            "is_deleted": False,
            "expires_at": {"lt": datetime.now(timezone.utc)},
        },
        data={"is_deleted": True},
    )
    return result.count
