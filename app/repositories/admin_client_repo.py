"""
Admin Client Repository — Prisma write/read queries for the Client model.
Extends the read-only client_repo with admin mutations.
No business logic here.
"""

from app.db.client import prisma_client


async def find_client_by_id(client_id: str):
    """Fetch Client by UUID."""
    return await prisma_client.client.find_unique(where={"id": client_id})


async def find_client_by_slug(slug: str):
    """Fetch Client by slug."""
    return await prisma_client.client.find_unique(where={"slug": slug})


async def find_client_by_identifier(identifier: str):
    """Find a client matching slug, email, or phone (for login)."""
    return await prisma_client.client.find_first(
        where={
            "OR": [
                {"slug":  identifier},
                {"email": identifier},
                {"phone": identifier},
            ]
        }
    )


async def update_client(client_id: str, data: dict):
    """Update a Client row by primary key."""
    return await prisma_client.client.update(
        where={"id": client_id},
        data=data,
    )
