"""
app/core/permissions.py
Granular permission core — Phase 2B-3 (2026-09-04).

Design: .claudedocs/implementation/PERMISSION_MODEL/PHASE_2B_DESIGN.md (APPROVED) and
PHASE_2B_2_DESIGN.md (APPROVED). This module implements the resolver and the
require_permission() dependency; it does NOT delete or replace require_roles(), which stays live
for every area not yet migrated (app/core/tenant.py).

Binding invariants implemented here (numbering from the approved design):

  I1  permissions IS NULL  -> the account is legacy and resolves through the route's own existing
      role list, byte-identical to before this feature existed. No bundle is reinterpreted.
  I2  scope is account-level and capability-aware: only areas in SCOPABLE_AREAS may interpret
      'self'. Every other area ignores it completely -- a non-scopable area never invents row
      filtering.
  I3  SUPER_ADMIN is a hard bypass and is never permission-modelled.
  I4  permissions IS NOT NULL -> require_permission() evaluates the array; require_roles() DENIES
      (that half lives in tenant.py). This is what makes incremental migration safe: a
      permission-based account can never inherit legacy role privileges on a route that has not
      been migrated yet.
  I5  x.write satisfies x.read.
  I6  No JWT involvement -- get_current_admin_user() reloads the User row every request, so
      permissions/scope are read live from the DB.
  I7  Permission arrays are resolved server-side from a preset; nothing here trusts a
      client-supplied permission list.

HOW LEGACY BEHAVIOR IS PRESERVED ON A MIGRATED ROUTE
require_permission() takes BOTH the permission string AND that route's own current legacy role
tuple. A legacy account (permissions IS NULL) is checked against the literal tuple the route
already had -- not against a re-derived "bundle". This matters because the coarse read/write
vocabulary cannot express every distinction the existing per-route tuples make: e.g. in
admin/barbers.py, `GET /` allows STAFF while `GET /{id}/services` does not, yet both are
staff-area reads. Carrying the route's own tuple preserves that exactly, with no invented rule and
no reinterpretation (I1).
"""

from typing import Optional

from fastapi import Depends, HTTPException, Request

from app.core.tenant import get_current_admin_user


# ── Vocabulary ────────────────────────────────────────────────────────────────

# Areas whose rows have a real per-employee owner, and which may therefore interpret scope='self'.
# Both already implement server-derived ownership via User.barberId. Adding an area here is a real
# design decision, never a convenience -- an area with no ownership concept must never appear.
SCOPABLE_AREAS: frozenset[str] = frozenset({"reservations", "staff"})

# The permission set the approved 'staff' preset resolves to (PHASE_2B_2_DESIGN.md §2). Kept here
# next to the resolver so the preset and the thing enforcing it cannot drift apart.
PRESET_STAFF: list[str] = ["reservations.write", "staff.read", "services.read"]



def _role_of(user) -> str:
    """Prisma may hand back an enum or a plain string depending on call path."""
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def _is_super_admin(user) -> bool:
    return _role_of(user) == "SUPER_ADMIN"


def _permissions_of(user) -> Optional[list]:
    """The stored array, or None for a legacy account.

    An empty list is NOT None: it means "permission-based with zero permissions" and denies
    everything, which is the correct fail-closed reading.
    """
    perms = getattr(user, "permissions", None)
    if perms is None:
        return None
    if isinstance(perms, list):
        return perms
    # Defensive: never treat an unexpected shape as "legacy" (that would silently widen access).
    return []


def is_permission_based(user) -> bool:
    """True when this account is governed by its permission array rather than its role."""
    return _permissions_of(user) is not None


def has_permission(user, permission: str) -> bool:
    """Membership test against the resolved array, honouring write-implies-read (I5).

    Only meaningful for permission-based accounts; callers must handle the legacy path first.
    """
    perms = _permissions_of(user) or []
    if permission in perms:
        return True
    if permission.endswith(".read"):
        area = permission.rsplit(".", 1)[0]
        return f"{area}.write" in perms
    return False


def scope_of(user) -> str:
    """'self' | 'all'. Legacy accounts derive it from the STAFF role exactly as before."""
    if is_permission_based(user):
        return (getattr(user, "scope", None) or "all")
    return "self" if _role_of(user) == "STAFF" else "all"


def scope_barber_id(user, area: str) -> Optional[str]:
    """Server-derived ownership identity for a scopable area, or None when no scoping applies.

    NEVER derived from client input -- always from the authenticated User row (I7).

    Returns None (no filtering) when: the area is not scopable (I2), the caller is SUPER_ADMIN
    (I3), or the account's scope is 'all'. Raises 403 when a self-scoped account has no barber
    link -- fail closed, never a silent fallback to seeing everything. That fail-closed rule is the
    pre-existing behaviour of _require_staff_barber_id(), preserved here unchanged.
    """
    if area not in SCOPABLE_AREAS:
        return None
    if _is_super_admin(user):
        return None
    if scope_of(user) != "self":
        return None
    if not getattr(user, "barberId", None):
        raise HTTPException(status_code=403, detail="Staff account is not linked to a barber profile.")
    return str(user.barberId)


# ── Dependency ────────────────────────────────────────────────────────────────

def require_permission(permission: str, *legacy_roles: str):
    """Dependency factory for a MIGRATED route.

    permission    e.g. "reservations.write" -- evaluated for permission-based accounts.
    legacy_roles  the route's OWN existing role tuple -- evaluated, unchanged, for legacy accounts
                  so their behaviour is byte-identical to before migration (I1).

    Returns the User, matching require_roles()'s contract so handler bodies are unaffected.
    """
    if not legacy_roles:
        # A migrated route must always carry its legacy tuple, otherwise legacy accounts would
        # silently lose access. Fail loudly at import/definition time rather than at runtime.
        raise ValueError(
            f"require_permission('{permission}') must be given the route's existing legacy role tuple"
        )

    async def _dependency(request: Request):
        user = await get_current_admin_user(request)

        if _is_super_admin(user):          # I3
            return user

        if not is_permission_based(user):  # I1 -- legacy account, this route's own tuple
            role = _role_of(user)
            if role not in legacy_roles:
                raise HTTPException(
                    status_code=403,
                    detail=f"Role '{role}' is not authorized. Required: {list(legacy_roles)}",
                )
            return user

        if not has_permission(user, permission):   # I4/I5 -- permission-based account
            raise HTTPException(
                status_code=403,
                detail=f"Missing permission '{permission}'.",
            )
        return user

    return _dependency
