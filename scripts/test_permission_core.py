"""
Phase 2B-3 — focused tests for the permission core (resolver + require_roles compatibility).

Pure unit tests against app/core/permissions.py and the require_roles deny-by-default rule, using
in-memory fake User objects. Deliberately touches NO database and mutates NO real data.

Run:  source venv/bin/activate && python scripts/test_permission_core.py
"""

import asyncio
import sys
import types

from fastapi import HTTPException

sys.path.insert(0, ".")

# app.core.tenant <-> app.db.dependencies are mutually importing; the running app resolves the
# order at startup. A standalone script must establish the same order first -- pre-existing
# project characteristic, not something this slice introduced.
import app.db.client  # noqa: E402,F401

from app.core.permissions import (  # noqa: E402
    PRESET_STAFF,
    SCOPABLE_AREAS,
    has_permission,
    is_permission_based,
    require_permission,
    scope_barber_id,
    scope_of,
)

PASS, FAIL = [], []


def check(name, cond):
    (PASS if cond else FAIL).append(name)
    print(("  ✅ " if cond else "  ❌ ") + name)


def user(role="STAFF", permissions=None, scope=None, preset=None, barber_id=None):
    """Minimal stand-in for a Prisma User row."""
    return types.SimpleNamespace(
        role=role, permissions=permissions, scope=scope, preset=preset,
        barberId=barber_id, clientId="client-1", id="user-1",
    )


def call(dep, u):
    """Invoke a require_* dependency with get_current_admin_user patched to return `u`."""
    import app.core.permissions as perms_mod
    import app.core.tenant as tenant_mod

    async def fake(_request):
        return u

    orig_p, orig_t = perms_mod.get_current_admin_user, tenant_mod.get_current_admin_user
    perms_mod.get_current_admin_user = fake
    tenant_mod.get_current_admin_user = fake
    try:
        return asyncio.get_event_loop().run_until_complete(dep(None))
    finally:
        perms_mod.get_current_admin_user = orig_p
        tenant_mod.get_current_admin_user = orig_t


def allowed(dep, u):
    try:
        call(dep, u)
        return True
    except HTTPException:
        return False


def status(dep, u):
    try:
        call(dep, u)
        return 200
    except HTTPException as e:
        return e.status_code


LEGACY_RES = ("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS", "STAFF")
LEGACY_WRITE = ("SUPER_ADMIN", "TENANT_ADMIN")

res_read = require_permission("reservations.read", *LEGACY_RES)
res_write = require_permission("reservations.write", *LEGACY_RES)
staff_read = require_permission("staff.read", *LEGACY_RES)
staff_write = require_permission("staff.write", *LEGACY_WRITE)
svc_read = require_permission("services.read", *LEGACY_RES)
svc_write = require_permission("services.write", *LEGACY_WRITE)

staff_acct = lambda **kw: user(  # noqa: E731
    role="STAFF", permissions=list(PRESET_STAFF), scope="self", preset="staff",
    barber_id=kw.get("barber_id", "barber-1"),
)

print("\nA. Legacy equivalence (all new fields NULL -> route's own role tuple, unchanged)")
for role in ["SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS", "MANAGER_UNITS", "STAFF"]:
    u = user(role=role, barber_id="b1")
    expect_res = role in LEGACY_RES or role == "SUPER_ADMIN"
    check(f"{role:22} reservations.read -> {'allow' if expect_res else 'deny'}",
          allowed(res_read, u) == expect_res)
    expect_w = role in LEGACY_WRITE or role == "SUPER_ADMIN"
    check(f"{role:22} staff.write       -> {'allow' if expect_w else 'deny'}",
          allowed(staff_write, u) == expect_w)
check("MANAGER_UNITS is denied reservations (unchanged, never in that tuple)",
      not allowed(res_read, user(role="MANAGER_UNITS")))

print("\nB. Permission resolution — staff preset")
sa = staff_acct()
check("staff preset: reservations.write allowed", allowed(res_write, sa))
check("staff preset: reservations.read  allowed", allowed(res_read, sa))
check("staff preset: staff.read         allowed", allowed(staff_read, sa))
check("staff preset: services.read      allowed", allowed(svc_read, sa))
check("staff preset: services.write     DENIED", not allowed(svc_write, sa))
check("staff preset: staff.write        DENIED", not allowed(staff_write, sa))
check("staff preset: store.read         DENIED (not in array)",
      not has_permission(sa, "store.read"))
check("staff preset resolves to exactly the approved 3 permissions",
      sorted(PRESET_STAFF) == sorted(["reservations.write", "staff.read", "services.read"]))

print("\nC. write implies read (I5)")
check("reservations.write satisfies reservations.read",
      has_permission(user(permissions=["reservations.write"]), "reservations.read"))
check("store.write satisfies store.read",
      has_permission(user(permissions=["store.write"]), "store.read"))
check("read does NOT satisfy write",
      not has_permission(user(permissions=["services.read"]), "services.write"))

print("\nD. Scope — permission-based staff account is self-scoped")
check("scope_of(staff preset) == 'self'", scope_of(sa) == "self")
check("reservations -> own barber id", scope_barber_id(sa, "reservations") == "barber-1")
check("staff        -> own barber id", scope_barber_id(sa, "staff") == "barber-1")
check("ownership derived from User row, never client input",
      scope_barber_id(staff_acct(barber_id="other-b"), "reservations") == "other-b")
check("legacy STAFF still self-scoped (I1)",
      scope_barber_id(user(role="STAFF", barber_id="b9"), "reservations") == "b9")
check("legacy TENANT_ADMIN not scoped",
      scope_barber_id(user(role="TENANT_ADMIN", barber_id="b9"), "reservations") is None)

print("\nE. Non-scopable areas ignore scope (I2)")
check("services is not scopable", "services" not in SCOPABLE_AREAS)
check("scope='self' invents NO filtering for services",
      scope_barber_id(sa, "services") is None)
check("scope='self' invents NO filtering for store",
      scope_barber_id(sa, "store") is None)
check("scopable set is exactly {reservations, staff}",
      SCOPABLE_AREAS == frozenset({"reservations", "staff"}))

print("\nF. Fail closed — self-scoped account with no ownership identity")
no_link = staff_acct(barber_id=None)
try:
    scope_barber_id(no_link, "reservations")
    check("self-scoped without barberId raises 403", False)
except HTTPException as e:
    check("self-scoped without barberId raises 403", e.status_code == 403)
try:
    scope_barber_id(user(role="STAFF", barber_id=None), "reservations")
    check("legacy STAFF without barberId also fails closed (unchanged)", False)
except HTTPException as e:
    check("legacy STAFF without barberId also fails closed (unchanged)", e.status_code == 403)
check("fail-closed never falls back to 'see everything' (returns nothing, raises instead)",
      True)

print("\nG. Deny-by-default — permission-based account on an UNMIGRATED require_roles route")
from app.core.tenant import require_roles  # noqa: E402

unmigrated = require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS")
check("permission-based account -> 403 on unmigrated route", status(unmigrated, sa) == 403)
check("  ...even though its placeholder role would otherwise match",
      status(require_roles("STAFF"), sa) == 403)
check("legacy STAFF unaffected on a route that allows it (I1)",
      status(require_roles("STAFF"), user(role="STAFF", barber_id="b1")) == 200)
check("legacy MANAGER_RESERVATIONS unaffected (I1)",
      status(unmigrated, user(role="MANAGER_RESERVATIONS")) == 200)

print("\nH. SUPER_ADMIN bypass (I3)")
sa_user = user(role="SUPER_ADMIN")
check("SUPER_ADMIN allowed on every migrated permission", all(
    allowed(d, sa_user) for d in [res_read, res_write, staff_read, staff_write, svc_read, svc_write]))
check("SUPER_ADMIN exempt from deny-by-default even if permission-based",
      status(unmigrated, user(role="SUPER_ADMIN", permissions=["x.read"])) == 200)
check("SUPER_ADMIN never scoped", scope_barber_id(
    user(role="SUPER_ADMIN", permissions=["reservations.write"], scope="self"), "reservations") is None)

print("\nI. is_permission_based classification")
check("all-NULL account is legacy", not is_permission_based(user(role="STAFF")))
check("account with [] is permission-based (denies all, fail-closed)",
      is_permission_based(user(permissions=[])))
check("empty array grants nothing", not has_permission(user(permissions=[]), "reservations.read"))

print(f"\n{'='*60}\nPASSED {len(PASS)}   FAILED {len(FAIL)}")
if FAIL:
    for f in FAIL:
        print("  FAILED:", f)
    sys.exit(1)
print("ALL PERMISSION CORE TESTS PASSED")
