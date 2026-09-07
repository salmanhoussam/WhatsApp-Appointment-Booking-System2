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
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from prisma import Json
from pydantic import BaseModel, EmailStr

from app.core.permissions import resolve_preset
from app.core.tenant import get_current_tenant, require_roles
from app.core.security import get_password_hash, PENDING_PASSWORD_SENTINEL
from app.services.whatsapp_notifications import send_staff_setup_link
from app.repositories import admin_client_repo as _client_repo
from app.repositories import barber_repo as _barber_repo
from app.repositories import user_repo as _repo

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Admin Team"])


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
    email:     EmailStr
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
        existing = await _repo.find_user_by_email(body.email)
        if existing:
            raise HTTPException(status_code=409, detail="البريد الإلكتروني مستخدم بالفعل")

        # Staff Invite (2026-09-07). No password supplied -> mint a one-time setup token and park
        # the sentinel in password_hash (NOT NULL in the schema). verify_password() rejects any
        # hash not starting with "$2", so the account is unreachable by login until
        # POST /api/v1/auth/set-password writes a real bcrypt hash and consumes the token.
        invited        = body.password is None
        setup_token    = secrets.token_urlsafe(32) if invited else None
        # 7 days, matching registration_service.py's existing tenant setup links — one lifetime for
        # every setup link in the platform rather than a second, competing one.
        setup_expires  = (datetime.now(timezone.utc) + timedelta(days=7)) if invited else None

        row: dict = {
            "clientId":      tenant["id"],   # CRITICAL: always the current tenant
            "fullName":      body.full_name,
            "email":         body.email,
            "password_hash": PENDING_PASSWORD_SENTINEL if invited
                             else get_password_hash(body.password),
            "role":          body.role,
        }
        if body.phone:
            row["phone"] = body.phone
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
            elif body.barber_id:
                raise HTTPException(
                    status_code=422,
                    detail=f"Preset '{body.preset}' does not take a barber link.",
                )

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
            base_url  = os.getenv("FRONTEND_URL", "https://salmansaas.com")
            setup_url = f"{base_url}/setup?token={setup_token}"
            # Returned to the OWNER as well as WhatsApped: delivery is best-effort (the helper
            # never raises), so without this the owner would have no way to reach an invitee whose
            # message failed to send. This is the only response that ever carries the raw token,
            # and it goes only to the TENANT_ADMIN who just created the account.
            result["setup_url"]   = setup_url
            result["invite_sent"] = bool(body.phone)
            if body.phone:
                # get_current_tenant() resolves only {id, slug, currency} (core/tenant.py:206), so
                # the shop's real display name is read here rather than sent as a bare slug — an
                # invite reading "حسابك في rk" is not something to hand a real staff member. One
                # extra read, only on the invite path.
                client = await _client_repo.find_client_by_id(tenant["id"])
                shop_name = (
                    getattr(client, "name_ar", None)
                    or getattr(client, "name_en", None)
                    or tenant["slug"]
                ) if client else tenant["slug"]
                background_tasks.add_task(
                    send_staff_setup_link,
                    staff_phone=body.phone,
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

        await _repo.deactivate_user(user_id, tenant["id"])
        logger.info("🗑️  Team member deactivated: %s for tenant %s", user.email, tenant["slug"])
        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔥 DB error deactivating user {user_id}: {e}", exc_info=True)
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
