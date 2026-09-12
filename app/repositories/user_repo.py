"""
User Repository — Prisma queries only.
All queries MUST filter by clientId where applicable. No business logic here.
"""

import logging
import re

from datetime import datetime, timezone

from app.db.client import prisma_client

logger = logging.getLogger(__name__)

_LEBANON_COUNTRY_CODE = "961"


def normalize_local_phone(phone: str) -> str:
    """Reduce any way a Lebanese number can be typed or stored to its local form.

    Salman's request 2026-08-29: phone LOGIN matches on the local number alone, whatever the
    caller typed. NEVER apply this to clients.phone, which must keep its country code for real
    outbound WhatsApp sends (whatsapp_service.py).

    Extended 2026-09-11 after measuring production. The original stripped ONLY a leading "961",
    which left two real forms unhandled:

      * "0096170764479" does not start with "961", so the whole string survived intact and was
        stored/compared as-is -- garbage either way.
      * "070764479" -- the form a Lebanese merchant types by hand -- kept its national trunk "0"
        and so matched nothing, even against a locally-stored row.

    Order matters: international prefix, then country code, then the national trunk zero. Each
    step is length-guarded so a short or malformed value is never eaten down to nothing.
    """
    digits = re.sub(r"\D", "", phone or "")
    if digits.startswith("00") and len(digits) > 2:
        digits = digits[2:]
    if digits.startswith(_LEBANON_COUNTRY_CODE) and len(digits) > len(_LEBANON_COUNTRY_CODE):
        digits = digits[len(_LEBANON_COUNTRY_CODE):]
    if digits.startswith("0") and len(digits) > 1:
        digits = digits[1:]
    return digits


async def find_user_by_email(email: str):
    """Find a user by email (global — used for login)."""
    return await prisma_client.user.find_unique(
        where={"email": email},
        include={"client": True},
    )


async def find_user_by_phone(phone: str):
    """Find a user by phone — the login path Salman wants to be the ONLY one merchants see.

    FIXED 2026-09-11. The previous version normalised the TYPED input and then compared it
    LITERALLY against the stored column, so it could only ever match rows already stored in local
    form. Its own docstring claimed "+96176985477", "96176985477" and "76985477" all resolved to
    one account; they did not. Measured on production that day: 3 of 10 accounts were unreachable
    by phone, including BOTH of rk's TENANT_ADMINs — the real owner of a live shop. Nobody
    reported it because email login worked.

    Worse, it contradicted this project's own rule. `rules/phone-numbers.md` MANDATES storing
    with the country code, so the more faithfully a write path followed the rule, the more
    certainly its user could not log in.

    The fix compares against every form a real row is stored in rather than assuming one. No
    migration, and no weakening of the storage rule.
    """
    normalized = normalize_local_phone(phone)
    if not normalized:
        return None

    # Every shape `users.phone` actually holds in production, plus the ones the storage rule
    # produces going forward. Cheap: an IN over a handful of exact strings, not a scan.
    candidates = [
        normalized,                                     # 76985477   (legacy local rows)
        f"{_LEBANON_COUNTRY_CODE}{normalized}",         # 96176985477 (what phone-numbers.md mandates)
        f"0{normalized}",                               # 076985477
        f"00{_LEBANON_COUNTRY_CODE}{normalized}",       # 0096176985477
    ]

    # `phone` carries no unique constraint, and in production one number really does sit on more
    # than one account — one person owning two shops. Ordered by createdAt so the answer is at
    # least STABLE rather than arbitrary, and logged loudly, because silently picking a tenant is
    # exactly the failure a merchant could never diagnose. Choosing BETWEEN shops needs the
    # multi-tenant membership model, which is a deliberate, separate decision.
    matches = await prisma_client.user.find_many(
        where={"phone": {"in": candidates}},
        include={"client": True},
        order={"createdAt": "asc"},
    )
    if not matches:
        return None
    if len(matches) > 1:
        logger.warning(
            "⚠️  Phone %s matches %d accounts (%s) — signing in the oldest. One person owning "
            "several shops needs the membership model, not a guess here.",
            normalized, len(matches),
            ", ".join(getattr(m.client, "slug", "?") for m in matches),
        )
    return matches[0]


async def find_active_user_by_phones(client_id: str, phones: list[str]):
    """The active User AT THIS TENANT whose phone matches any candidate form, or None.

    A2 (2026-09-12). Deliberately NOT find_user_by_phone() above: that one is the LOGIN path and
    is cross-tenant by necessity, which is why its own comment says one number really can sit on
    several accounts (a person owning two shops) and that choosing between them needs the
    membership model.

    Here the tenant is already known -- it comes from the reservation the button tap answers --
    so the ambiguity that blocks login simply does not arise. That is the anchor earning its keep.

    `phones` is a list because the caller owns the matching policy; this layer only queries.
    Active-only: a deactivated account has no authority.
    """
    if not phones:
        return None
    return await prisma_client.user.find_first(
        where={"clientId": client_id, "isActive": True, "phone": {"in": phones}},
        order={"createdAt": "asc"},
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
