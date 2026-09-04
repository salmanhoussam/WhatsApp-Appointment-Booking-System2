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


# ── Preset registry (Phase 2B-4) ──────────────────────────────────────────────
# PHASE_2B_4_DESIGN.md §0's binding condition: authorization rules live in THIS module and nowhere
# else. The route layer resolves a preset by calling resolve_preset() below -- it never maps a
# preset to permissions itself, and it never trusts a client-supplied permission array (I7).

PRESETS: dict[str, dict] = {
    # 'staff' -- the only preset whose areas are fully migrated as of Slice 2.
    #   legacy_role is the INERT placeholder written to User.role (PHASE_2B_2_DESIGN.md §5): the
    #   account is governed by its permission array, never by this value.
    "staff": {
        "permissions":     PRESET_STAFF,
        "scope":           "self",
        "legacy_role":     "STAFF",
        "requires_barber": True,
    },
    # 'reservations_manager' -- REGISTERED but NOT assignable until catalog is migrated (Slice 4).
    #   Registered deliberately rather than omitted: the gate must be able to say WHICH dependency
    #   is missing ("catalog"), which it can only do if the preset's real permission array exists
    #   here. An unregistered preset would fail with "Unknown preset", telling nobody anything.
    #
    #   ⚠ customers.read is an INTENTIONAL PRESET EXPANSION (design §4.1), NOT legacy equivalence:
    #   customers.py's real tuple is ("SUPER_ADMIN","TENANT_ADMIN"), so a legacy
    #   MANAGER_RESERVATIONS account CANNOT read the customer registry today. This preset grants
    #   more than that legacy role holds. Acceptable because it is a NEW preset no existing account
    #   uses -- nothing regresses -- but it is recorded, never implied to be preservation.
    #   It is NOT Permission Bundle Correction: that ticket narrows the LEGACY bundle; this widens
    #   a NEW preset. Opposite directions, separate decisions.
    #   services.write is deliberately absent (PHASE_2B_2_DESIGN.md, Salman's decision 3).
    "reservations_manager": {
        "permissions":     ["reservations.write", "staff.read", "services.read",
                            "catalog.read", "customers.read"],
        "scope":           "all",
        "legacy_role":     "MANAGER_RESERVATIONS",
        "requires_barber": False,
    },
    # 'shop_manager' (Slice 3) -- PHASE_2B_5_SLICE3_DESIGN.md §4.2.
    #   catalog.write was DROPPED from the originally-approved row: catalog.py can reach the store
    #   AND restaurant partitions of CatalogItem/CatalogCategory (module_key is client-supplied and
    #   catalog_service's update/delete apply no module filter), so granting it here would hand a
    #   "shop" manager wider access than the name implies. store products, store categories and
    #   store orders all sit behind store.write, so nothing is lost for its real job.
    #   legacy_role STAFF is an INERT PLACEHOLDER (design §4.2): this account is governed by its
    #   permission array, never by role. No SHOP_MANAGER enum value exists or is added.
    "shop_manager": {
        "permissions":     ["store.write", "customers.read"],
        "scope":           "all",
        "legacy_role":     "STAFF",
        "requires_barber": False,
    },
    # 'tenant_admin' is deliberately NOT permission-based (PHASE_2B_2_DESIGN.md §2): an owner is
    # stored exactly as owners are stored today (role=TENANT_ADMIN, permissions=NULL) so it resolves
    # through the legacy path and keeps working across migrated and unmigrated areas alike.
    "tenant_admin": {
        "permissions":     None,          # None => legacy account, not "no permissions"
        "scope":           "all",
        "legacy_role":     "TENANT_ADMIN",
        "requires_barber": False,
    },
}

# Add-on -> the permissions it grants (PHASE_2B_2_DESIGN.md §3).
#
# NAMING vs AUTHORITY -- Salman's explicit framing correction, PHASE_2B_5_SLICE3_DESIGN.md §3.1:
# this add-on is called "inventory" for product/UI purposes, but its authority is the ENTIRE Store
# area, because store.write is the approved v1 Store permission and is deliberately NOT split
# (splitting it would require an orders.write string that the approved vocabulary does not contain).
# So it also grants store category mutation and PATCH /orders/{id}/status. Do not describe, label,
# or implement it as a narrower inventory-only grant.
ADDONS: dict[str, list[str]] = {"inventory": ["store.write"]}

# ── The migration gate, as data ───────────────────────────────────────────────
# PHASE_2B_2_DESIGN.md §1's binding rule: "a preset may only be offered once every area it grants
# has been migrated to permission checks." Enforced HERE (server-side) as well as in the UI --
# UI-only enforcement would leave a crafted request able to create an account that is 403'd
# everywhere by deny-by-default (I4).
#
# MIGRATED_AREAS is the single source of truth for the Dependency/Gate Matrix
# (PHASE_2B_5_SLICE3_DESIGN.md §5). Salman's requirement: "preset enabled" must not be scattered
# across frontend/backend assumptions -- the API gate and the Team UI both read from THIS, and
# neither computes assignability independently.
#
#   Slice 1 -> capabilities   Slice 2 -> reservations, staff, services
#   Slice 3 -> store, customers                      Slice 4 -> catalog (not yet)
MIGRATED_AREAS: frozenset[str] = frozenset({
    "capabilities",                          # Slice 1 (2B-1)
    "reservations", "staff", "services",     # Slice 2 (2B-3)
    "store", "customers",                    # Slice 3
})


def _areas_of(permissions: Optional[list]) -> set[str]:
    """The distinct areas a permission list touches ('store.write' -> 'store')."""
    return {p.split(".", 1)[0] for p in (permissions or [])}


def unmigrated_areas_for(preset: str, addons: Optional[list] = None) -> list[str]:
    """Which areas a preset (+ add-ons) grants that have NOT been migrated yet.

    Empty list == offerable. This function IS the gate: assignability is derived from the real
    permission arrays and MIGRATED_AREAS, never from a hand-maintained list of preset names that
    could silently drift away from what the presets actually grant.
    """
    spec = PRESETS.get(preset)
    if spec is None:
        return []
    granted = list(spec["permissions"] or [])
    for addon in (addons or []):
        granted += ADDONS.get(addon, [])
    return sorted(_areas_of(granted) - MIGRATED_AREAS)


def is_assignable(preset: str, addons: Optional[list] = None) -> bool:
    """A preset may only be offered once EVERY area it grants has been migrated
    (PHASE_2B_2_DESIGN.md §1). Offering one earlier produces an account that deny-by-default (I4)
    403s on the very thing its name promises."""
    return preset in PRESETS and not unmigrated_areas_for(preset, addons)


# Derived, not hand-maintained -- the two frozensets below stay for the existing call sites and for
# error messages, but they are now COMPUTED from the matrix above, so the table and the code cannot
# disagree.
#   After Slice 3: staff ✅ · tenant_admin ✅ · shop_manager ✅ · inventory ✅
#                  reservations_manager ❌ (needs catalog -- Slice 4)
ASSIGNABLE_PRESETS: frozenset[str] = frozenset(p for p in PRESETS if is_assignable(p))
ASSIGNABLE_ADDONS: frozenset[str] = frozenset(
    a for a, perms in ADDONS.items() if not (_areas_of(perms) - MIGRATED_AREAS)
)


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


# ── Projection (Phase 2B-4) ───────────────────────────────────────────────────

def describe_authority(user) -> dict:
    """The `authority` block GET /admin/me returns — a pure projection of this module's own
    functions. PHASE_2B_4_DESIGN.md §3.3.

    Every field is produced by calling something already defined above; this function introduces no
    rule of its own, so the endpoint and the enforcement path can never disagree.

    Note `permissions` is returned VERBATIM — null for a legacy account (constraint C1: a legacy
    account genuinely has no resolved array; I1 preserves behaviour via each route's own role
    tuple, not via a derived bundle). It is deliberately NOT expanded by write-implies-read: that
    is a resolver rule (I5), and copying it into the transport layer would let the two drift. A
    caller needing that question answered asks has_permission(), it does not re-implement it.
    """
    return {
        "role":           _role_of(user),
        "is_legacy":      not is_permission_based(user),
        "permissions":    _permissions_of(user),
        "scope":          scope_of(user),
        "preset":         getattr(user, "preset", None),
        "scopable_areas": sorted(SCOPABLE_AREAS),
    }


def describe_legacy_owner_authority(role: str = "TENANT_ADMIN") -> dict:
    """The same block for a Client-type token holder, who has no User row at all (constraint C2).

    This is NOT a new authority model: useAdminRole.js:12-13 already maps a client-type token to
    TENANT_ADMIN client-side today. This moves that existing mapping to the server unchanged so the
    dashboard has ONE source of truth, rather than inventing anything.
    """
    return {
        "role":           role,
        "is_legacy":      True,
        "permissions":    None,
        "scope":          "all",
        "preset":         None,
        "scopable_areas": sorted(SCOPABLE_AREAS),
    }


# ── Server-side preset resolution (Phase 2B-4, I7) ────────────────────────────

def resolve_preset(preset: str, addons: Optional[list] = None) -> dict:
    """preset + add-ons -> the exact row values to store on a new User.

    Returns {"permissions": list|None, "scope": str, "role": str, "requires_barber": bool}.

    Raises ValueError for an unknown or not-yet-assignable preset/add-on; the route turns that into
    a 422 with the reason. Resolution is server-side only: no caller may supply a permission array
    (I7), so a crafted request cannot grant itself anything.
    """
    if preset not in PRESETS:
        raise ValueError(f"Unknown preset '{preset}'.")
    blocked_by = unmigrated_areas_for(preset, addons)
    if blocked_by:
        # Name the exact missing dependency (design §5.1): a caller must be able to tell WHY, not
        # just that it failed. This is the server-side gate -- it rejects a direct request that
        # bypasses the UI entirely, because the UI explains assignability, it never enforces it.
        raise ValueError(
            f"Preset '{preset}' is not assignable yet: it grants permissions in "
            f"{blocked_by}, which {'has' if len(blocked_by) == 1 else 'have'} not been migrated to "
            f"permission checks. Assignable today: {sorted(ASSIGNABLE_PRESETS)}."
        )

    spec = PRESETS[preset]
    requested = list(addons or [])

    for addon in requested:
        if addon not in ADDONS:
            raise ValueError(f"Unknown add-on '{addon}'.")
        if addon not in ASSIGNABLE_ADDONS:
            raise ValueError(
                f"Add-on '{addon}' is not assignable yet: it grants "
                f"{ADDONS[addon]}, whose area has not been migrated to permission checks."
            )

    base = spec["permissions"]
    if base is None:
        # A legacy-shaped preset (tenant_admin). An add-on cannot be layered onto it -- there is no
        # array to layer onto, and inventing one would make the owner permission-based, which
        # PHASE_2B_2_DESIGN.md §2 explicitly rejects.
        if requested:
            raise ValueError(f"Preset '{preset}' is legacy-shaped and takes no add-ons.")
        permissions = None
    else:
        permissions = list(base)
        for addon in requested:
            for perm in ADDONS[addon]:
                if perm not in permissions:
                    permissions.append(perm)

    return {
        "permissions":     permissions,
        "scope":           spec["scope"],
        "role":            spec["legacy_role"],
        "requires_barber": spec["requires_barber"],
    }


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
