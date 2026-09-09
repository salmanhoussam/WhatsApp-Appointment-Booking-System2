"""
app/api/v1/admin/team.py
Team (staff/managers) management — mounted at /api/v1/admin/team.

Authorization (Authorization Hardening, 2026-07-30 — approved matrix):
  GET/POST /team, DELETE /team/{id} -> SUPER_ADMIN or TENANT_ADMIN only.
  Resource = user accounts; Owner = Tenant Admin (ADR-0004 Information
  Ownership Model's ownership question, applied here). Managers are denied
  because no business use case exists TODAY for a Manager to view or manage
  colleague accounts — not because this is an absolute architectural
  prohibition. If a real use case appears later (e.g. a "assign to staff
  member" picker needing names/ids only), it gets its own reviewed Matrix or
  a separate limited-field endpoint, not a widened role list on this one.
"""

import logging
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from prisma import Json
from pydantic import BaseModel, EmailStr

from app.core.permissions import resolve_preset
from app.core.tenant import get_current_tenant, require_roles
from app.core.security import get_password_hash, PENDING_PASSWORD_SENTINEL, is_password_pending
from app.services.whatsapp_notifications import send_staff_setup_link
from app.core.phone import normalize_for_storage
from app.core.tenant_urls import setup_link, mint_setup_token
from app.core.config import settings as _settings
from app.repositories import admin_client_repo as _client_repo
from app.repositories import barber_repo as _barber_repo
from app.repositories import user_repo as _repo

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Admin Team"])


def _whatsapp_configured() -> bool:
    """Whether outbound WhatsApp is configured at all on THIS deployment.

    Surfaced to the Team UI so a failed invite can say "the platform has no WhatsApp credentials"
    instead of leaving the owner to guess. Reports only presence, never a value.
    """
    return bool(getattr(_settings, "WHATSAPP_PHONE_NUMBER_ID", None)
                and getattr(_settings, "WHATSAPP_ACCESS_TOKEN", None))


def _derive_email(phone: Optional[str], full_name: str, slug: str) -> str:
    """A stable placeholder address for a staff account created without one.

    Shaped like the accounts this platform already has (جعفر is `jaafar@rk.salmansaas.com`), and
    keyed on the PHONE so the same person re-added later collides on @unique instead of silently
    creating a duplicate account. Falls back to a random suffix only when there is no phone either,
    which the caller already rejects for an invite.
    """
    # Normalise FIRST: the whole point of keying on the phone is that the same person re-added as
    # "70999888", "+961 70 999 888" or "0096170999888" collides on @unique instead of quietly
    # creating a second account. Keying on the raw input would defeat that.
    local = normalize_for_storage(phone) or f"staff{secrets.token_hex(4)}"
    return f"{local}@{slug}.salmansaas.com"


def _project(u) -> dict:
    """The single shape every /team route returns. Passwords never appear.

    Phase 2B-4 added preset/permissions/scope/barber_id so a Team UI can show what an account
    actually has — GET /team previously returned role only, which cannot describe a
    permission-based account (design constraint C3).
    """
    return {
        "id":          u.id,
        "full_name":   u.fullName,
        "email":       u.email,
        "role":        u.role,
        "is_active":   u.isActive,
        "created_at":  u.createdAt.isoformat() if u.createdAt else None,
        "preset":      getattr(u, "preset", None),
        "permissions": getattr(u, "permissions", None),
        "scope":       getattr(u, "scope", None),
        "barber_id":   getattr(u, "barberId", None),
        # Lets the Team UI offer "resend invite" on exactly the accounts that can use one, instead
        # of showing a button that would 409 (2026-09-09).
        "invite_pending": is_password_pending(getattr(u, "password_hash", None)),
        "phone":       getattr(u, "phone", None),
    }


# ── Schemas ───────────────────────────────────────────────────────────────────

class TeamMemberCreate(BaseModel):
    """Two creation paths, deliberately both supported.

    `preset` given  -> Phase 2B-4 path: the SERVER resolves preset (+ add-ons) into permissions/
                       scope/role via app.core.permissions.resolve_preset(). `role` is ignored.
    `preset` absent -> the pre-2B-4 legacy path, byte-identical to before: `role` is honoured and
                       permissions stay NULL. The legacy smar TeamTab posts exactly this shape
                       ({full_name, email, password, role}) and must keep working — removing it
                       would be a regression disguised as a migration (I1 applied to this API).

    A client-supplied `permissions` array is NOT a field here and is ignored if sent: permission
    resolution is server-side only (I7), so a crafted request cannot grant itself anything.
    """
    full_name: str
    # OPTIONAL since 2026-09-09 (Salman, from a real attempt to add a manager): for a merchant the
    # essentials are the NAME and the PHONE -- most staff have no work email, and demanding one
    # turned a two-field action into a blocked one. `users.email` is NOT NULL and @unique in the
    # schema, so when it is omitted the server DERIVES a stable one from the phone and the tenant
    # slug (see _derive_email below) rather than the column being relaxed. No schema change.
    email:     Optional[EmailStr] = None
    # Staff Invite (2026-09-07): optional. Omitted -> the account is created with no usable
    # password and a one-time setup link is generated (and WhatsApped when `phone` is given), which
    # the invitee exchanges for a password of their own via POST /api/v1/auth/set-password.
    # Supplied -> the pre-existing behaviour, byte-identical: the owner sets the password directly.
    # Both paths stay supported for the same reason the legacy `role` path below does: the smar
    # TeamTab still posts a password and must keep working.
    password:  Optional[str]       = None
    # Stored on User.phone. Serves two purposes at once: it is where the invite is delivered, and
    # find_user_by_phone() already backs phone login, so the invitee can sign in by number after.
    phone:     Optional[str]       = None
    role:      Literal["MANAGER_RESERVATIONS", "MANAGER_UNITS"] = "MANAGER_RESERVATIONS"
    preset:    Optional[str]       = None
    addons:    Optional[list[str]] = None
    barber_id: Optional[str]       = None
    # Team as the employee-management surface (2026-09-09, Salman's decision). A self-scoped preset
    # needs a Staff identity to point at; until now the owner had to create the Barber on the Staff
    # page FIRST and only then come here -- the two "new employee" buttons that made the two
    # surfaces confusing. Supplying this creates the Staff identity in the same request and links
    # it. Mutually exclusive with barber_id: pick an existing identity, or create one, never both.
    # Deliberately NOT a merge -- Barber and User stay separate rows, exactly as investigated in
    # .claudedocs/work/team-barber-user/2026-09-09/report.md.
    new_staff_name:  Optional[str] = None
    new_staff_phone: Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/team")
async def list_team(
    tenant: dict = Depends(get_current_tenant),
    _user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """Return all users for this tenant, active and inactive — passwords excluded.

    Inactive members are included deliberately: the Team UI needs them to offer the reactivate
    affordance (P2). This is not a behaviour change — find_users_by_client has always returned
    every row regardless of isActive; only this docstring was wrong (it said "active users").
    """
    try:
        users = await _repo.find_users_by_client(tenant["id"])
        return [_project(u) for u in users]
    except Exception as e:
        logger.error(f"🔥 DB error listing team for tenant {tenant}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


@router.post("/team", status_code=201)
async def create_team_member(
    body: TeamMemberCreate,
    background_tasks: BackgroundTasks,
    tenant: dict = Depends(get_current_tenant),
    _user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """
    Create a new staff member.
    clientId is forced to the requesting tenant — cross-tenant creation is impossible.
    Password is bcrypt-hashed before storage.

    Phase 2B-4: when `preset` is supplied, permissions/scope/role are resolved SERVER-SIDE and a
    barber link is validated. See TeamMemberCreate for why the legacy `role` path still works.
    """
    try:
        # Name + phone are the real essentials; email is a derived detail (see TeamMemberCreate).
        if not body.email and not body.phone:
            raise HTTPException(
                status_code=422,
                detail="أدخل رقم الهاتف أو البريد الإلكتروني — الاسم والرقم هما الأساس.",
            )
        email = body.email or _derive_email(body.phone, body.full_name, tenant["slug"])

        existing = await _repo.find_user_by_email(email)
        if existing:
            raise HTTPException(status_code=409, detail="البريد الإلكتروني مستخدم بالفعل")

        # Staff Invite (2026-09-07). No password supplied -> mint a one-time setup token and park
        # the sentinel in password_hash (NOT NULL in the schema). verify_password() rejects any
        # hash not starting with "$2", so the account is unreachable by login until
        # POST /api/v1/auth/set-password writes a real bcrypt hash and consumes the token.
        invited        = body.password is None
        setup_token    = mint_setup_token(tenant["slug"]) if invited else None
        # 7 days, matching registration_service.py's existing tenant setup links — one lifetime for
        # every setup link in the platform rather than a second, competing one.
        setup_expires  = (datetime.now(timezone.utc) + timedelta(days=7)) if invited else None

        row: dict = {
            "clientId":      tenant["id"],   # CRITICAL: always the current tenant
            "fullName":      body.full_name,
            "email":         email,
            "password_hash": PENDING_PASSWORD_SENTINEL if invited
                             else get_password_hash(body.password),
            "role":          body.role,
        }
        # Phone Numbers rule (.claude/rules/phone-numbers.md, 2026-09-08): storage is always WITH
        # the country code. The UI's country selector already sends that form, but normalising here
        # too is the guarantee -- an API client or a seed script bypasses the UI entirely, and a
        # bare national number is exactly what Meta rejected for جعفر on 2026-09-07.
        if body.phone:
            row["phone"] = normalize_for_storage(body.phone)
        if invited:
            row["setupToken"]    = setup_token
            row["setupTokenExp"] = setup_expires

        if body.preset:
            # The migration gate (PHASE_2B_2_DESIGN.md §1) is enforced HERE, not only in the UI:
            # a preset whose areas are unmigrated would produce an account that deny-by-default
            # (I4) blocks everywhere. resolve_preset raises for that, and for an unassignable
            # add-on.
            try:
                resolved = resolve_preset(body.preset, body.addons)
            except ValueError as e:
                raise HTTPException(status_code=422, detail=str(e))

            if resolved["requires_barber"]:
                # Create the Staff identity first when the caller asked for a new one. Ordering is
                # deliberate: the Barber row must exist before the User row is written, because
                # User.barberId is a real FK -- and if the User create fails afterwards, an orphan
                # Barber is a harmless, visible row on the Staff page, whereas the reverse would be
                # an account that fails closed on every scoped request (permissions.py:250-254).
                if body.new_staff_name and body.barber_id:
                    raise HTTPException(
                        status_code=422,
                        detail="اختر موظفاً موجوداً أو أنشئ واحداً جديداً — لا الاثنين معاً.",
                    )
                if body.new_staff_name:
                    created_barber = await _barber_repo.create_barber({
                        "clientId": tenant["id"],          # server-derived, never client-supplied
                        "name":     body.new_staff_name.strip(),
                        # Same Phone Numbers rule as the account's own number
                        # (.claude/rules/phone-numbers.md): stored WITH the country code.
                        "phone":    normalize_for_storage(body.new_staff_phone),
                        "isActive": True,
                    })
                    body.barber_id = created_barber.id

                if not body.barber_id:
                    raise HTTPException(
                        status_code=422,
                        detail=(
                            f"Preset '{body.preset}' is self-scoped and requires barber_id: an "
                            "account with no barber link fails closed on every scoped request."
                        ),
                    )
                # Ownership: the barber must belong to the REQUESTING tenant. A 404 (not 403)
                # because another tenant's id space must not be probeable from here.
                barber = await _barber_repo.find_barber(tenant["id"], body.barber_id)
                if not barber:
                    raise HTTPException(status_code=404, detail="الموظف غير موجود")
                # User.barberId is @unique — surface the collision cleanly instead of letting a
                # raw constraint error become a 500.
                linked = await _repo.find_user_by_barber_id(body.barber_id)
                if linked:
                    raise HTTPException(
                        status_code=409,
                        detail="هذا الموظف مرتبط بحساب دخول آخر بالفعل",
                    )
                row["barberId"] = body.barber_id
            else:
                # Manager-as-Staff (2026-09-09, Salman's product requirement): one real person can
                # hold BOTH a business staff identity and a manager account -- a barber who also
                # runs the shop. Previously any non-self-scoped preset rejected a staff link with
                # 422, which forced that person to exist twice in the system.
                #
                # The link is OPTIONAL here, not required: a manager with no staff identity stays
                # equally valid. And it is inert for authorization -- scope is 'all' for these
                # presets, so permissions.py never reads barberId. Its only effects are the ones a
                # staff identity should have: the person appears on the calendar and can be booked,
                # and _notify_merchant_new_reservation can reach them.
                if body.new_staff_name and body.barber_id:
                    raise HTTPException(
                        status_code=422,
                        detail="اختر موظفاً موجوداً أو أنشئ واحداً جديداً — لا الاثنين معاً.",
                    )
                if body.new_staff_name:
                    created_barber = await _barber_repo.create_barber({
                        "clientId": tenant["id"],
                        "name":     body.new_staff_name.strip(),
                        "phone":    normalize_for_storage(body.new_staff_phone),
                        "isActive": True,
                    })
                    body.barber_id = created_barber.id
                if body.barber_id:
                    barber = await _barber_repo.find_barber(tenant["id"], body.barber_id)
                    if not barber:
                        raise HTTPException(status_code=404, detail="الموظف غير موجود")
                    linked = await _repo.find_user_by_barber_id(body.barber_id)
                    if linked:
                        raise HTTPException(
                            status_code=409,
                            detail="هذا الموظف مرتبط بحساب دخول آخر بالفعل",
                        )
                    row["barberId"] = body.barber_id

            row["role"] = resolved["role"]
            # permissions stays absent (NULL) for a legacy-shaped preset such as tenant_admin --
            # writing an array there would make the owner permission-based, which the approved
            # design explicitly rejects.
            if resolved["permissions"] is not None:
                # Prisma's optional Json column rejects a bare Python list/dict — it must be
                # wrapped in Json(...). Confirmed live here 2026-09-04 (a real 500 on the first
                # create attempt). This is the THIRD independent occurrence of this exact class in
                # this codebase (reservation_service.py, then catalog_service.py, now here) —
                # recorded in the phase evidence as a pattern, not just fixed silently.
                row["permissions"] = Json(resolved["permissions"])
                row["scope"]       = resolved["scope"]
                row["preset"]      = body.preset

        user = await _repo.create_user(data=row)

        logger.info("👤 New team member created: %s (role=%s preset=%s invited=%s) for tenant %s",
                    user.email, user.role, body.preset, invited, tenant["slug"])

        result = _project(user)

        if invited:
            # Derived from the tenant's own lifecycle_state, never from FRONTEND_URL — that env var
            # was unset on Railway and this line fell back to the APEX domain, which serves an
            # older frontend build that cannot handle a setup token. See app/core/tenant_urls.py.
            _c = await _client_repo.find_client_by_id(tenant["id"])
            setup_url = setup_link(getattr(_c, "lifecycle_state", None), setup_token, tenant["slug"])
            # Returned to the OWNER as well as WhatsApped: delivery is best-effort (the helper
            # never raises), so without this the owner would have no way to reach an invitee whose
            # message failed to send. This is the only response that ever carries the raw token,
            # and it goes only to the TENANT_ADMIN who just created the account.
            result["setup_url"]   = setup_url
            result["whatsapp_configured"] = _whatsapp_configured()
            # Was `bool(body.phone)` until 2026-09-08 -- it reported the PRESENCE of a number, not
            # the success of a send, so a failed invite looked identical to a delivered one. That is
            # how جعفر sat locked out for six days while the dashboard said "sent". Now set from the
            # send's real return value below. Default False: nothing was sent unless something was.
            result["invite_sent"] = False
            if body.phone:
                # get_current_tenant() resolves only {id, slug, currency} (core/tenant.py:206), so
                # the shop's real display name is read here rather than sent as a bare slug — an
                # invite reading "حسابك في rk" is not something to hand a real staff member. One
                # extra read, only on the invite path.
                shop_name = (
                    getattr(_c, "name_ar", None)
                    or getattr(_c, "name_en", None)
                    or tenant["slug"]
                ) if _c else tenant["slug"]
                # Awaited, not backgrounded: the owner needs the real outcome in this response,
                # and a BackgroundTask cannot report one. The helper still never raises, so a
                # failed WhatsApp cannot roll back the account that was just created -- the owner
                # simply sees invite_sent=false and hands over `setup_url` by other means.
                result["invite_sent"] = await send_staff_setup_link(
                    staff_phone=row["phone"],
                    staff_name=body.full_name,
                    setup_url=setup_url,
                    client_name=shop_name,
                )

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔥 DB error creating team member: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


class TeamMemberUpdate(BaseModel):
    """Edit an existing account's authorization and/or its staff link (2026-09-09).

    Exists for two reasons that arrived together:
      * Salman's product requirement: a protected owner must be offered "تعديل الصلاحيات" instead of
        a deactivate button they are not allowed to press.
      * It is the missing escape hatch that justified the destructive side effect in
        deactivate_user() — a deactivated account holding a @unique barberId could not be released
        any other way. With this route, releasing a staff link is an explicit action, so
        deactivation no longer has to do it silently.

    Same authority rules as creation, restated because they are load-bearing:
      * `permissions` is NOT a field here and is ignored if sent — resolution is server-side only
        (invariant I7), so a crafted request cannot grant itself anything.
      * `role` is not editable — a preset resolves it. Nothing here can reach SUPER_ADMIN.
      * clientId is never accepted; the tenant comes from the caller's token.
    """
    preset:    Optional[str]       = None
    addons:    Optional[list[str]] = None
    # Explicit staff-link control. None = leave as is; "" = release the link; an id = link to that
    # staff member. Distinguishing "absent" from "cleared" is why this is Optional[str] and not str.
    barber_id: Optional[str]       = None


@router.patch("/team/{user_id}", status_code=200)
async def update_team_member(
    user_id: str,
    body: TeamMemberUpdate,
    tenant: dict = Depends(get_current_tenant),
    _user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """Change an account's preset/add-ons and/or its staff link. Ownership verified first."""
    try:
        user = await _repo.find_user_by_id(user_id, tenant["id"])
        if not user:
            raise HTTPException(status_code=404, detail="العضو غير موجود")

        patch: dict = {}

        if body.preset is not None:
            try:
                resolved = resolve_preset(body.preset, body.addons)
            except ValueError as e:
                raise HTTPException(status_code=422, detail=str(e))

            # Never let an edit strand a self-scoped account without a staff link: that account
            # would be 403'd on every scoped request (permissions.py:250-254). The link must either
            # already exist or be supplied in this same request.
            keeps_link = body.barber_id if body.barber_id is not None else getattr(user, "barberId", None)
            if resolved["requires_barber"] and not keeps_link:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"Preset '{body.preset}' is self-scoped and requires a staff link — "
                        "supply barber_id in the same request."
                    ),
                )

            # ── Owner protection, edit path (2026-09-09) ─────────────────────────────────
            # The deactivate route is not the only way to lock a tenant out: demoting the last
            # administrator's preset does it just as completely, and more quietly. Salman's
            # requirement is explicit — an owner must not be able to "remove their own tenant-admin
            # access". Same two invariants, applied to authorization instead of activation.
            _role = lambda u: u.role.value if hasattr(u.role, "value") else str(u.role)
            if _role(user) == "TENANT_ADMIN" and user.isActive and resolved["role"] != "TENANT_ADMIN":
                if str(user.id) == str(getattr(_user, "id", None)):
                    raise HTTPException(
                        status_code=403,
                        detail="لا يمكنك سحب صلاحياتك الإدارية من حسابك بنفسك.",
                    )
                admins = [
                    u for u in await _repo.find_users_by_client(tenant["id"])
                    if _role(u) == "TENANT_ADMIN" and u.isActive
                ]
                if len(admins) <= 1:
                    raise HTTPException(
                        status_code=403,
                        detail=(
                            "هذا آخر حساب إداري نشط للمنشأة — سحب صلاحياته يقفل لوحة التحكم. "
                            "عيّن حساباً إدارياً آخر أولاً."
                        ),
                    )

            patch["role"]   = resolved["role"]
            patch["scope"]  = resolved["scope"]
            patch["preset"] = body.preset
            # Same shape the create path writes (see the Json() wrap above): a resolved array is
            # stored as Json, while 'tenant_admin' resolves to None and must land as a real NULL --
            # that NULL is what makes the account resolve through the legacy role path (invariant
            # I1), so writing an empty array here instead would silently change its authorization.
            patch["permissions"] = (
                Json(resolved["permissions"]) if resolved["permissions"] is not None else None
            )

        if body.barber_id is not None:
            if body.barber_id == "":
                patch["barberId"] = None          # explicit release
            else:
                # Ownership: the staff member must belong to the REQUESTING tenant. 404 (not 403)
                # so another tenant's id space stays unprobeable — same rule as creation.
                barber = await _barber_repo.find_barber(tenant["id"], body.barber_id)
                if not barber:
                    raise HTTPException(status_code=404, detail="الموظف غير موجود")
                linked = await _repo.find_user_by_barber_id(body.barber_id)
                if linked and str(linked.id) != str(user.id):
                    raise HTTPException(
                        status_code=409,
                        detail="هذا الموظف مرتبط بحساب دخول آخر بالفعل",
                    )
                patch["barberId"] = body.barber_id

        if not patch:
            raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")

        await _repo.update_user(user_id, patch)
        logger.info("✏️  Team member updated: %s (%s) for tenant %s",
                    user.email, sorted(patch.keys()), tenant["slug"])
        return {"success": True, "data": _project(await _repo.find_user_by_id(user_id, tenant["id"]))}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔥 DB error updating user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


@router.delete("/team/{user_id}", status_code=200)
async def deactivate_team_member(
    user_id: str,
    tenant: dict = Depends(get_current_tenant),
    _user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """Soft-deactivate a team member. Verifies ownership before acting."""
    try:
        user = await _repo.find_user_by_id(user_id, tenant["id"])
        if not user:
            raise HTTPException(status_code=404, detail="العضو غير موجود")

        # ── Owner protection (2026-09-09, Salman's decision) ─────────────────────────────────
        # Enforced HERE, server-side, not by hiding a button: UI-only protection leaves a crafted
        # request able to lock a tenant out of its own dashboard with no recovery path in the
        # product. Two independent invariants, checked in order.
        #
        # 1. No self-deactivation. Signing your own account off is never a Team-lifecycle action;
        #    an owner who wants to leave hands ownership over first.
        if str(user.id) == str(getattr(_user, "id", None)):
            raise HTTPException(
                status_code=403,
                detail="لا يمكنك تعطيل حسابك بنفسك. عيّن مالكاً آخر أولاً.",
            )

        # 2. Never remove the LAST usable administrator. Counted live rather than inferred from the
        #    caller's role, because the caller may be SUPER_ADMIN acting on someone else's tenant.
        #    Both storage shapes count as an administrator: a legacy TENANT_ADMIN row and a
        #    permission-based account whose preset resolves to one (permissions.py's 'tenant_admin'
        #    writes role=TENANT_ADMIN, so the role column covers both today -- kept as one check
        #    rather than two so it cannot drift).
        _role = lambda u: u.role.value if hasattr(u.role, "value") else str(u.role)
        if _role(user) == "TENANT_ADMIN" and user.isActive:
            admins = [
                u for u in await _repo.find_users_by_client(tenant["id"])
                if _role(u) == "TENANT_ADMIN" and u.isActive
            ]
            if len(admins) <= 1:
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "هذا آخر حساب إداري نشط للمنشأة — تعطيله يقفل لوحة التحكم نهائياً. "
                        "أنشئ حساباً إدارياً آخر أولاً."
                    ),
                )

        await _repo.deactivate_user(user_id, tenant["id"])
        logger.info("🗑️  Team member deactivated: %s for tenant %s", user.email, tenant["slug"])
        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔥 DB error deactivating user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


@router.post("/team/{user_id}/resend-invite", status_code=200)
async def resend_invite(
    user_id: str,
    tenant: dict = Depends(get_current_tenant),
    _user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """Mint a fresh setup link for an account that has not set a password yet, and WhatsApp it.

    The gap this closes (2026-09-09): the platform could CREATE an invite and never re-send one.
    It bit twice in three days — deactivation released a staff link because there was no edit route,
    and an invite whose WhatsApp failed could only be recovered by deleting and recreating the
    account. Both were real, both on جعفر.

    Refuses on an account that already has a password: that account does not need an invite, and
    minting a token for it would be a password-reset path wearing an invite's clothes — a different
    feature with different rules.
    """
    try:
        user = await _repo.find_user_by_id(user_id, tenant["id"])
        if not user:
            raise HTTPException(status_code=404, detail="العضو غير موجود")
        if not is_password_pending(user.password_hash):
            raise HTTPException(
                status_code=409,
                detail="هذا الحساب لديه كلمة مرور بالفعل — لا يحتاج رابط تفعيل.",
            )
        if not user.phone:
            raise HTTPException(
                status_code=422,
                detail="لا يوجد رقم لهذا الحساب — أضف رقماً أولاً.",
            )

        token   = mint_setup_token(tenant["slug"])
        expires = datetime.now(timezone.utc) + timedelta(days=7)
        await _repo.update_user(user_id, {"setupToken": token, "setupTokenExp": expires})

        client = await _client_repo.find_client_by_id(tenant["id"])
        setup_url = setup_link(getattr(client, "lifecycle_state", None), token, tenant["slug"])
        shop_name = (
            getattr(client, "name_ar", None) or getattr(client, "name_en", None) or tenant["slug"]
        ) if client else tenant["slug"]

        # Awaited, like the create path: the owner needs the real outcome, not an assumption.
        sent = await send_staff_setup_link(
            staff_phone=user.phone, staff_name=user.fullName,
            setup_url=setup_url, client_name=shop_name,
        )
        logger.info("🔁 Invite resent for %s (delivered=%s) tenant %s", user.email, sent, tenant["slug"])
        return {"success": True, "data": {
            "setup_url": setup_url, "invite_sent": sent,
            "whatsapp_configured": _whatsapp_configured(),
        }}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔥 DB error resending invite for {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")


@router.post("/team/{user_id}/reactivate", status_code=200)
async def reactivate_team_member(
    user_id: str,
    tenant: dict = Depends(get_current_tenant),
    _user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """Re-activate a soft-deactivated team member. Verifies ownership before acting.

    Phase 2B-4, closing Dashboard Architecture Review 1's pattern P2: DELETE /team/{id} has always
    been a one-way door — the account could be deactivated and never restored through any UI or
    API. Second independent instance of that pattern (the first: StaffTab's hide with no unhide),
    which is why it is fixed inside the phase that builds on this very API rather than logged.

    POST + a sub-path deliberately, NOT PATCH /team/{id}: a general update route would be an
    editing surface, and editing existing accounts is explicitly out of v1 scope. A single-purpose
    route cannot drift into one by accident.
    """
    try:
        user = await _repo.find_user_by_id(user_id, tenant["id"])
        if not user:
            raise HTTPException(status_code=404, detail="العضو غير موجود")

        await _repo.reactivate_user(user_id, tenant["id"])
        logger.info("♻️  Team member reactivated: %s for tenant %s", user.email, tenant["slug"])
        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔥 DB error reactivating user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database connection failed")
