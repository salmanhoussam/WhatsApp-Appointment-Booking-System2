"""
User Repository — Prisma queries only.
All queries MUST filter by clientId where applicable. No business logic here.
"""

import re

from datetime import datetime, timezone

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


async def set_password_and_clear_setup_token(user_id: str, password_hash: str):
    """Store a real bcrypt hash and consume the setup token in ONE update (Staff Invite,
    2026-09-07).

    Deliberately one statement rather than reusing invalidate_setup_token() alongside a separate
    password write: two updates can interleave, and a crash between them would leave an account
    whose token is spent but whose password is still the pending sentinel -- unusable and
    un-reinvitable without an admin. One update makes that state unreachable.
    """
    return await prisma_client.user.update(
        where={"id": user_id},
        data={
            "password_hash": password_hash,
            "setupToken":    None,
            "setupTokenExp": None,
        },
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


async def touch_last_login(user_id: str):
    """Stamp User.lastLoginAt (Auth Audit Trail, 2026-09-07).

    The column has existed since the model was written, under a comment block headed
    "Auth lifecycle" -- and nothing ever wrote it: 0 of 31 users had a value. Called only from the
    login SUCCESS path, and only via BackgroundTasks, so it adds no latency to the response.

    update_many, not update: this runs after the response has been sent, so a row that vanished in
    between (a deleted account) must be a no-op, never an unhandled error in a background task.
    """
    return await prisma_client.user.update_many(
        where={"id": user_id},
        data={"lastLoginAt": datetime.now(timezone.utc)},
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
        # REVERSED 2026-09-09 (Salman's decision): deactivation no longer clears barberId.
        #
        # It did between 2026-09-07 and today, for a real reason: User.barberId is @unique, so a
        # switched-off account held a live staff member hostage and creating that person's
        # replacement account returned 409 with no way out -- "team.py has no edit route" was the
        # stated justification for choosing the smaller change at the time.
        #
        # That justification is now gone: PATCH /team/{user_id} exists (added in the same pass as
        # this reversal) and can re-link or release a staff identity explicitly. So the 409 has a
        # real escape hatch, and the destructive side effect can be dropped.
        #
        # Why it had to be dropped: an account's DEACTIVATION is an authentication concern; the
        # person's STAFF IDENTITY is a business one. Clearing the link silently destroyed the second
        # while operating on the first -- which broke two things measurably. (1) Reactivation
        # restored an account that was then 403'd on every scoped request, because
        # permissions.py:250-254 raises when a self-scoped account has no barberId. (2) It stranded
        # جعفر: deactivated 2026-09-08, link released, a still-valid setup token he could no longer
        # use. Releasing the link is now an explicit, separate action, never a side effect.
        data={"isActive": False},
    )


async def reactivate_user(user_id: str, client_id: str) -> int:
    """Re-activate a soft-deactivated team member, scoped to tenant. Returns rows affected.

    The exact inverse of deactivate_user, with the same tenant scoping — Dashboard Architecture
    Review 1 pattern P2 ("soft-delete without a restore path", two independent real cases: this
    one and StaffTab's hide-without-unhide). There is no hard delete anywhere in this lifecycle.

    Since 2026-09-09 this is a true inverse again: deactivation keeps barberId, so reactivation
    restores a working account rather than one that is 403'd on every scoped request.
    """
    return await prisma_client.user.update_many(
        where={"id": user_id, "clientId": client_id},
        data={"isActive": True},
    )
