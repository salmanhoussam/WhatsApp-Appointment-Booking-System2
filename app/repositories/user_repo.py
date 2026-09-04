"""
User Repository — Prisma queries only.
All queries MUST filter by clientId where applicable. No business logic here.
"""

import re

from app.db.client import prisma_client

_LEBANON_COUNTRY_CODE = "961"


def normalize_local_phone(phone: str) -> str:
    """Strip everything but digits, then strip a leading Lebanon country code
    (961) if present -- Salman's explicit request 2026-08-29: phone LOGIN
    should match on the local number alone, regardless of whether "+", "00",
    or "961" was typed/stored. Used only for users.phone (the login-matching
    field) -- NEVER apply this to clients.phone, which must keep its full
    country code for real outbound WhatsApp sends (whatsapp_service.py) to
    keep working."""
    digits = re.sub(r"\D", "", phone or "")
    if digits.startswith(_LEBANON_COUNTRY_CODE) and len(digits) > len(_LEBANON_COUNTRY_CODE):
        digits = digits[len(_LEBANON_COUNTRY_CODE):]
    return digits


async def find_user_by_email(email: str):
    """Find a user by email (global — used for login)."""
    return await prisma_client.user.find_unique(
        where={"email": email},
        include={"client": True},
    )


async def find_user_by_phone(phone: str):
    """Find a user by phone (global — used for login), matching on the
    normalized local number (see normalize_local_phone) so "+96176985477",
    "96176985477", and "76985477" all resolve to the same account. phone has
    no unique constraint (only STAFF-relevant fields do), so find_first, not
    find_unique."""
    normalized = normalize_local_phone(phone)
    if not normalized:
        return None
    return await prisma_client.user.find_first(
        where={"phone": normalized},
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


async def find_user_by_barber_id(barber_id: str):
    """The login account linked to a Barber, if any.

    User.barberId is @unique, so this answers "is this barber already linked?" before a create
    attempt turns a constraint violation into a 500 (Phase 2B-4). Intentionally NOT client-scoped:
    the uniqueness it guards is global, and the caller has already verified the barber belongs to
    its own tenant — scoping here would report "free" for a barber linked elsewhere and then fail
    at the DB anyway.
    """
    return await prisma_client.user.find_first(where={"barberId": barber_id})


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


async def deactivate_user(user_id: str, client_id: str) -> int:
    """Soft-deactivate a team member, scoped to tenant. Returns rows affected.

    Phase 2B-4: the tenant filter is now applied AT THE DB LEVEL. It previously ran
    `where={"id": user_id}` only — the docstring said "scoped to tenant" but the query was not,
    and the scope rested entirely on the caller's preceding find_user_by_id(user_id, client_id)
    ownership check in admin/team.py. Never exploitable through any real caller, but it is the
    exact shape flagged 2026-08-30 in resource_repo/unit_repo and again by Dashboard Architecture
    Review 1 (Discovery 3). Tightened here, deliberately narrowly, because this phase adds its
    mirror (reactivate_user) right beside it — shipping a new mutation next to an unscoped one
    would knowingly propagate the pattern.

    update_many (not update) because a composite where needs it: Prisma's `update` accepts only a
    unique selector, so `id` alone would be the only filter available.
    """
    return await prisma_client.user.update_many(
        where={"id": user_id, "clientId": client_id},
        data={"isActive": False},
    )


async def reactivate_user(user_id: str, client_id: str) -> int:
    """Re-activate a soft-deactivated team member, scoped to tenant. Returns rows affected.

    The exact inverse of deactivate_user, with the same tenant scoping — Dashboard Architecture
    Review 1 pattern P2 ("soft-delete without a restore path", two independent real cases: this
    one and StaffTab's hide-without-unhide). There is no hard delete anywhere in this lifecycle.
    """
    return await prisma_client.user.update_many(
        where={"id": user_id, "clientId": client_id},
        data={"isActive": True},
    )
