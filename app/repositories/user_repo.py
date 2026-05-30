"""
User Repository — Prisma queries only.
All queries MUST filter by clientId where applicable. No business logic here.
"""

from app.db.client import prisma_client


async def find_user_by_email(email: str):
    """Find a user by email (global — used for login)."""
    return await prisma_client.user.find_unique(
        where={"email": email},
        include={"client": True},
    )


async def find_user_by_setup_token(token: str):
    """Find a user by setup token (one-time magic link)."""
    return await prisma_client.user.find_first(
        where={"setupToken": token},
        include={"client": True},
    )


async def invalidate_setup_token(user_id: str):
    """Wipe setupToken + setupTokenExp (one-time use)."""
    return await prisma_client.user.update(
        where={"id": user_id},
        data={"setupToken": None, "setupTokenExp": None},
    )


async def find_users_by_client(client_id: str) -> list:
    """All users for a tenant, ordered by creation date."""
    return await prisma_client.user.find_many(
        where={"clientId": client_id},
        order={"createdAt": "asc"},
    )


async def find_user_by_id(user_id: str, client_id: str):
    """Single user scoped to tenant."""
    return await prisma_client.user.find_first(
        where={"id": user_id, "clientId": client_id}
    )


async def find_admin_user_for_client(client_id: str, role: str = "TENANT_ADMIN"):
    """First user with the given role for a client."""
    return await prisma_client.user.find_first(
        where={"clientId": client_id, "role": role}
    )


async def create_user(data: dict):
    """Create a new User record."""
    return await prisma_client.user.create(data=data)


async def update_user(user_id: str, data: dict):
    """Update a user by primary key (no client filter — only for internal use)."""
    return await prisma_client.user.update(
        where={"id": user_id},
        data=data,
    )


async def deactivate_user(user_id: str, client_id: str):
    """Soft-deactivate a team member, scoped to tenant."""
    return await prisma_client.user.update(
        where={"id": user_id},
        data={"isActive": False},
    )
