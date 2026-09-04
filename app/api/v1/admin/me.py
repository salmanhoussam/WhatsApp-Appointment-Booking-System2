"""
app/api/v1/admin/me.py
GET /api/v1/admin/me — the authenticated caller describing itself.

Phase 2B-4 (design: .claudedocs/implementation/PERMISSION_MODEL/PHASE_2B_4_DESIGN.md, APPROVED).
Closes finding B1 of the Dashboard Architecture Review 1 (.claudedocs/maturity/dashboard.md):
Phase 2B-3 deliberately put permissions in the DATABASE with zero token changes (I6), while the
dashboard's only identity input was the JWT it decodes client-side — so the frontend had no way to
learn a user's real authority. This endpoint is that missing link.

WHAT THIS IS, AND WHAT IT MUST NEVER BECOME
  A projection. Every field in the `authority` block is produced by app/core/permissions.py's own
  functions (describe_authority / describe_legacy_owner_authority). This module contains NO
  authorization rule of its own — no role→permission mapping, no bundle table, no write⇒read
  expansion. Salman's explicit condition on approving this phase: /admin/me must not become a
  second permission engine. If a rule is ever needed here, it belongs in permissions.py instead.

WHY A SEPARATE FILE FROM team.py
  /team manages OTHER people's accounts and is SUPER_ADMIN/TENANT_ADMIN-only. /me is the caller
  describing ITSELF and must be readable by every authenticated admin-surface identity, including a
  STAFF account — otherwise the dashboard cannot decide what to render before it knows who it is.
  Different resource, different authorization; a separate file keeps that obvious.

AUTHORIZATION
  None of its own, deliberately. The _protected router this is mounted on already requires a valid
  JWT (get_authenticated_tenant, admin/__init__.py) — that is the floor. Gating an identity
  endpoint on a permission the caller might lack would deadlock the dashboard.

TWO TOKEN TYPES (constraint C2 in the design)
  get_current_admin_user() requires type=='admin' and loads a User row, but get_authenticated_tenant
  accepts Client-type tokens too, and a tenant owner logging in through the Client path has NO User
  row at all. Depending on get_current_admin_user alone would 401 exactly those owners and break
  their dashboard. So both branches are handled here. The client branch returns precisely what
  useAdminRole.js already synthesizes client-side today (type=='client' → TENANT_ADMIN) — an
  existing mapping moved to the server, not a new authority.
"""

import logging

from fastapi import APIRouter, HTTPException, Request

from app.core.permissions import describe_authority, describe_legacy_owner_authority
from app.core.security import decode_token
from app.core.tenant import get_current_admin_user, _verify_tenant
from app.repositories import client_services_repo as _services_repo

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Admin Identity"])


async def _active_services(client_id: str) -> list[str]:
    """The tenant's active capability keys.

    Included here (design §3.5, approved) so the dashboard can decide visibility from ONE
    server call: nav needs both axes at once — what this USER may do, and what this TENANT has.
    The Dashboard Review found two real bugs caused by a surface acting before capability was
    known (Store B1 2026-08-21; OverviewTab 2026-08-22).

    Same derivation the public config endpoint already uses (public_service.py:227) — active rows'
    serviceKey — not a second definition of what "active" means.
    """
    rows = await _services_repo.list_client_services(client_id)
    return [r.serviceKey for r in rows if r.isActive]


@router.get("/me")
async def get_me(request: Request):
    """Return the caller's resolved identity, authority and tenant capabilities."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        # Unreachable in practice — the _protected floor rejects this first. Kept so the branch
        # below can never dereference a missing payload.
        raise HTTPException(status_code=401, detail="Missing Authorization header.")

    payload = decode_token(auth_header[7:])
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    token_type = payload.get("type")

    # ── Client-type token: tenant owner, no User row (C2) ─────────────────────
    if token_type == "client":
        slug = payload.get("slug")
        if not slug:
            raise HTTPException(status_code=401, detail="Malformed token payload.")
        # Re-verified rather than trusted from the token: _verify_tenant re-runs the ADR-0001
        # suspended / ADR-0002 expired checks on every call, cache hit or miss.
        tenant = await _verify_tenant(slug, endpoint=request.url.path)
        return {
            "identity": {
                "account_type": "client",
                "user_id":      None,
                "full_name":    None,
                "email":        None,
                "client_id":    tenant["id"],
                "slug":         tenant["slug"],
            },
            "authority":    describe_legacy_owner_authority(),
            "capabilities": {"active_services": await _active_services(tenant["id"])},
        }

    # ── Admin-type token: real User row ───────────────────────────────────────
    # Raises 401 itself for an invalid/expired token, a deactivated user, or a suspended/
    # lifecycle-blocked tenant — this endpoint adds no bypass around those checks.
    user = await get_current_admin_user(request)

    return {
        "identity": {
            "account_type": "admin",
            "user_id":      user.id,
            "full_name":    user.fullName,
            "email":        user.email,
            "client_id":    user.clientId,
            "slug":         user.client.slug if getattr(user, "client", None) else None,
        },
        "authority":    describe_authority(user),
        "capabilities": {"active_services": await _active_services(user.clientId)},
    }
