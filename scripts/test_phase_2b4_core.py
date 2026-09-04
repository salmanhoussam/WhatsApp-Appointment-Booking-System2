"""
Phase 2B-4 — focused tests for the pieces this phase adds to the permission core.

Covers the projection (describe_authority / describe_legacy_owner_authority) and server-side
preset resolution (resolve_preset), including the migration gate. Pure unit tests with in-memory
fake User objects: touches NO database and mutates NO real data.

The 45 tests in test_permission_core.py still cover the resolver itself and must keep passing
unchanged — this file adds to them, it does not replace them.

Run:  source venv/bin/activate && python scripts/test_phase_2b4_core.py
"""

import sys
import types

sys.path.insert(0, ".")

# app.core.tenant <-> app.db.dependencies are mutually importing; establish the order first
# (pre-existing project characteristic, same as test_permission_core.py).
import app.db.client  # noqa: E402,F401

from app.core.permissions import (  # noqa: E402
    ADDONS,
    ASSIGNABLE_ADDONS,
    ASSIGNABLE_PRESETS,
    PRESET_STAFF,
    PRESETS,
    SCOPABLE_AREAS,
    describe_authority,
    describe_legacy_owner_authority,
    has_permission,
    resolve_preset,
    scope_of,
)

PASS, FAIL = [], []


def check(name, cond):
    (PASS if cond else FAIL).append(name)
    print(("  ✅ " if cond else "  ❌ ") + name)


def user(role="STAFF", permissions=None, scope=None, preset=None, barber_id=None):
    return types.SimpleNamespace(
        role=role, permissions=permissions, scope=scope, preset=preset,
        barberId=barber_id, clientId="client-1", id="user-1",
    )


def raises(fn, *a, **kw):
    try:
        fn(*a, **kw)
        return None
    except ValueError as e:
        return str(e)


print("\nA. describe_authority — projection fidelity (must equal the resolver, never re-derive)")
legacy = user(role="TENANT_ADMIN")
a = describe_authority(legacy)
check("legacy: role projected from the row", a["role"] == "TENANT_ADMIN")
check("legacy: is_legacy True", a["is_legacy"] is True)
check("legacy: permissions is None, NOT an invented bundle (C1)", a["permissions"] is None)
check("legacy: scope equals scope_of()", a["scope"] == scope_of(legacy) == "all")
check("legacy: preset None", a["preset"] is None)

staff = user(role="STAFF", permissions=list(PRESET_STAFF), scope="self",
             preset="staff", barber_id="b1")
b = describe_authority(staff)
check("permission-based: is_legacy False", b["is_legacy"] is False)
check("permission-based: array returned VERBATIM", b["permissions"] == PRESET_STAFF)
check("permission-based: scope equals scope_of()", b["scope"] == scope_of(staff) == "self")
check("permission-based: preset label projected", b["preset"] == "staff")
check("scopable_areas mirrors SCOPABLE_AREAS", set(b["scopable_areas"]) == set(SCOPABLE_AREAS))

check("write⇒read is NOT expanded into the payload (stays a resolver rule, I5)",
      "reservations.read" not in b["permissions"] and has_permission(staff, "reservations.read"))
check("legacy STAFF still reports scope 'self' via the resolver, not a copy of the rule",
      describe_authority(user(role="STAFF", barber_id="b1"))["scope"] == "self")

print("\nB. describe_legacy_owner_authority — the client-token owner (C2)")
c = describe_legacy_owner_authority()
check("role TENANT_ADMIN — same mapping useAdminRole.js already does", c["role"] == "TENANT_ADMIN")
check("is_legacy True", c["is_legacy"] is True)
check("permissions None", c["permissions"] is None)
check("scope 'all'", c["scope"] == "all")
check("same shape as describe_authority (no field drift between branches)",
      set(c.keys()) == set(a.keys()))

print("\nC. resolve_preset — server-side resolution (I7)")
r = resolve_preset("staff")
check("staff -> exactly the approved permission set", r["permissions"] == PRESET_STAFF)
check("staff -> scope 'self'", r["scope"] == "self")
check("staff -> inert legacy placeholder role STAFF", r["role"] == "STAFF")
check("staff -> requires a barber link", r["requires_barber"] is True)
check("returned list is a copy, not the module constant (mutation cannot poison the preset)",
      r["permissions"] is not PRESET_STAFF)

t = resolve_preset("tenant_admin")
check("tenant_admin -> permissions None (legacy-shaped, deliberately NOT permission-based)",
      t["permissions"] is None)
check("tenant_admin -> role TENANT_ADMIN", t["role"] == "TENANT_ADMIN")
check("tenant_admin -> no barber link required", t["requires_barber"] is False)

print("\nD. Migration gate — enforced server-side, not only in the UI (2B-2 §1)")
check("'inventory' add-on is defined...", "inventory" in ADDONS)
check("...but NOT assignable while store is unmigrated", "inventory" not in ASSIGNABLE_ADDONS)
msg = raises(resolve_preset, "staff", ["inventory"])
check("staff + inventory -> rejected with a reason", msg is not None and "not assignable" in msg)
check("  ...and the reason names the permission it would have granted",
      msg is not None and "store.write" in msg)
check("unknown add-on -> rejected", raises(resolve_preset, "staff", ["nope"]) is not None)
check("unknown preset -> rejected", raises(resolve_preset, "does_not_exist") is not None)
check("shop_manager is not registered at all this phase", "shop_manager" not in PRESETS)
check("reservations_manager is not registered at all this phase",
      "reservations_manager" not in PRESETS)
check("assignable set is exactly {staff, tenant_admin} today",
      ASSIGNABLE_PRESETS == frozenset({"staff", "tenant_admin"}))
check("a legacy-shaped preset takes no add-ons",
      raises(resolve_preset, "tenant_admin", ["inventory"]) is not None)

print("\nE. No client-supplied permissions can survive resolution")
check("resolve_preset's only inputs are preset + addons (no permissions parameter)",
      "permissions" not in resolve_preset.__code__.co_varnames[:resolve_preset.__code__.co_argcount])
check("every resolved array is drawn from PRESETS/ADDONS, never from a caller",
      set(resolve_preset("staff")["permissions"]) <= set(PRESET_STAFF) | set(ADDONS["inventory"]))

print(f"\n{'='*60}\nPASSED {len(PASS)}   FAILED {len(FAIL)}")
if FAIL:
    for f in FAIL:
        print("  FAILED:", f)
    sys.exit(1)
print("ALL PHASE 2B-4 CORE TESTS PASSED")
