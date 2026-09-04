"""
Slice 3 — focused tests for store/customers migration, the shop_manager preset, the Store add-on,
and the Dependency/Gate Matrix.

Extends the pattern of test_permission_core.py (45 tests) and test_phase_2b4_core.py (37), both of
which must keep passing unchanged. Pure unit tests with in-memory fake User objects: touches NO
database and mutates NO real data.

Run:  source venv/bin/activate && python scripts/test_slice3_core.py
"""

import sys
import types

sys.path.insert(0, ".")

import app.db.client  # noqa: E402,F401  (circular-import order, as the sibling scripts do)

from fastapi import HTTPException  # noqa: E402

from app.core.permissions import (  # noqa: E402
    ADDONS,
    ASSIGNABLE_ADDONS,
    ASSIGNABLE_PRESETS,
    MIGRATED_AREAS,
    PRESETS,
    SCOPABLE_AREAS,
    has_permission,
    is_assignable,
    require_permission,
    resolve_preset,
    scope_barber_id,
    scope_of,
    unmigrated_areas_for,
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


def call(dep, u):
    import asyncio
    import app.core.permissions as perms_mod

    async def fake(_request):
        return u

    orig = perms_mod.get_current_admin_user
    perms_mod.get_current_admin_user = fake
    try:
        return asyncio.get_event_loop().run_until_complete(dep(None))
    finally:
        perms_mod.get_current_admin_user = orig


def allowed(dep, u):
    try:
        call(dep, u)
        return True
    except HTTPException:
        return False


def raises(fn, *a, **kw):
    try:
        fn(*a, **kw)
        return None
    except ValueError as e:
        return str(e)


# The real tuples the migrated routes carry, transcribed from source.
STORE_TUPLE     = ("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS")
CUSTOMERS_TUPLE = ("SUPER_ADMIN", "TENANT_ADMIN")

store_read  = require_permission("store.read",  *STORE_TUPLE)
store_write = require_permission("store.write", *STORE_TUPLE)
cust_read   = require_permission("customers.read", *CUSTOMERS_TUPLE)

shop = lambda: user(  # noqa: E731
    role="STAFF", permissions=list(PRESETS["shop_manager"]["permissions"]),
    scope="all", preset="shop_manager",
)
staff_inv = lambda: user(  # noqa: E731
    role="STAFF", permissions=resolve_preset("staff", ["inventory"])["permissions"],
    scope="self", preset="staff", barber_id="barber-1",
)

print("\nA. Legacy equivalence (I1) — permissions IS NULL keeps each route's own tuple")
for role, store_ok, cust_ok in [
    ("SUPER_ADMIN",          True,  True),
    ("TENANT_ADMIN",         True,  True),
    ("MANAGER_RESERVATIONS", True,  False),   # in store's tuple, NOT in customers'
    ("MANAGER_UNITS",        False, False),   # in neither — untouched by this slice
    ("STAFF",                False, False),
]:
    u = user(role=role, barber_id="b1")
    check(f"{role:22} store.read  -> {'allow' if store_ok else 'deny'}",
          allowed(store_read, u) == store_ok)
    check(f"{role:22} store.write -> {'allow' if store_ok else 'deny'}",
          allowed(store_write, u) == store_ok)
    check(f"{role:22} customers   -> {'allow' if cust_ok else 'deny'}",
          allowed(cust_read, u) == cust_ok)
check("MANAGER_RESERVATIONS keeps FULL store.* (the I3 anomaly, carried forward untouched)",
      allowed(store_read, user(role="MANAGER_RESERVATIONS"))
      and allowed(store_write, user(role="MANAGER_RESERVATIONS")))
check("MANAGER_RESERVATIONS remains DENIED on customers (matches customers.py's real tuple)",
      not allowed(cust_read, user(role="MANAGER_RESERVATIONS")))
check("MANAGER_UNITS untouched by this slice (denied on both migrated areas)",
      not allowed(store_read, user(role="MANAGER_UNITS"))
      and not allowed(cust_read, user(role="MANAGER_UNITS")))

print("\nB. Resolver — shop_manager")
r = resolve_preset("shop_manager")
check("permissions are EXACTLY [store.write, customers.read]",
      r["permissions"] == ["store.write", "customers.read"])
check("scope = all", r["scope"] == "all")
check("role placeholder = STAFF (inert, non-authoritative)", r["role"] == "STAFF")
check("no barber link required", r["requires_barber"] is False)
check("catalog.write is NOT granted (dropped — it reaches store+restaurant partitions)",
      "catalog.write" not in r["permissions"] and "catalog.read" not in r["permissions"])
check("no services.* granted", not any(p.startswith("services.") for p in r["permissions"]))
sm = shop()
check("shop_manager satisfies store.read via write⇒read (I5)", has_permission(sm, "store.read"))
check("shop_manager allowed on store routes", allowed(store_read, sm) and allowed(store_write, sm))
check("shop_manager allowed on customers", allowed(cust_read, sm))
check("SHOP_MANAGER is NOT a UserRole value anywhere in the registry",
      all(s["legacy_role"] != "SHOP_MANAGER" for s in PRESETS.values()))

print("\nB2. Resolver — the Store add-on")
check("'inventory' grants exactly [store.write]", ADDONS["inventory"] == ["store.write"])
check("staff + inventory == staff perms + store.write",
      resolve_preset("staff", ["inventory"])["permissions"]
      == ["reservations.write", "staff.read", "services.read", "store.write"])
check("the add-on does not change scope (inherits the preset's)",
      resolve_preset("staff", ["inventory"])["scope"] == "self")
check("add-on is not a preset", "inventory" not in PRESETS)
check("shop_manager + inventory does not duplicate store.write",
      resolve_preset("shop_manager", ["inventory"])["permissions"].count("store.write") == 1)

print("\nB3. Unknown permissions stay unknown")
check("customers.write is granted by NO preset",
      not any("customers.write" in (s["permissions"] or []) for s in PRESETS.values()))
check("orders.write is granted by NO preset",
      not any("orders.write" in (s["permissions"] or []) for s in PRESETS.values()))
check("orders.write is in NO add-on",
      not any("orders.write" in perms for perms in ADDONS.values()))
check("a customers.write dependency denies a shop_manager (no such permission exists)",
      not allowed(require_permission("customers.write", *CUSTOMERS_TUPLE), shop()))

print("\nC. Dependency / Gate Matrix (design §5)")
check("MIGRATED_AREAS now includes store + customers",
      {"store", "customers"} <= MIGRATED_AREAS)
check("catalog is NOT migrated", "catalog" not in MIGRATED_AREAS)
check("shop_manager assignable", is_assignable("shop_manager"))
check("staff assignable", is_assignable("staff"))
check("tenant_admin assignable", is_assignable("tenant_admin"))
check("reservations_manager NOT assignable", not is_assignable("reservations_manager"))
check("  ...blocked specifically by catalog",
      unmigrated_areas_for("reservations_manager") == ["catalog"])
check("inventory add-on assignable", "inventory" in ASSIGNABLE_ADDONS)
check("ASSIGNABLE_PRESETS == exactly the presets whose areas are all migrated",
      ASSIGNABLE_PRESETS == frozenset(p for p in PRESETS if is_assignable(p)))
check("  (i.e. {shop_manager, staff, tenant_admin} today)",
      ASSIGNABLE_PRESETS == frozenset({"shop_manager", "staff", "tenant_admin"}))

print("\nC2. Server-side gate rejects blocked presets, naming the dependency")
msg = raises(resolve_preset, "reservations_manager")
check("reservations_manager rejected", msg is not None)
check("  ...and the message names 'catalog'", msg is not None and "catalog" in msg)
check("reservations_manager IS registered (so the gate can name its dependency)",
      "reservations_manager" in PRESETS)
check("staff+inventory is NOT blocked (store is migrated now)",
      raises(resolve_preset, "staff", ["inventory"]) is None)
check("an unknown preset is still rejected", raises(resolve_preset, "nope") is not None)
check("an unknown add-on is still rejected", raises(resolve_preset, "staff", ["nope"]) is not None)

print("\nD. Scope (I2) — the mandatory Slice 3 assertion")
si = staff_inv()
check("store is NOT in SCOPABLE_AREAS", "store" not in SCOPABLE_AREAS)
check("customers is NOT in SCOPABLE_AREAS", "customers" not in SCOPABLE_AREAS)
check("SCOPABLE_AREAS is still exactly {reservations, staff}",
      SCOPABLE_AREAS == frozenset({"reservations", "staff"}))
check("staff+inventory: scope is 'self'", scope_of(si) == "self")
check("  reservations -> self-scoped (own barber id)",
      scope_barber_id(si, "reservations") == "barber-1")
check("  staff        -> self-scoped (own barber id)",
      scope_barber_id(si, "staff") == "barber-1")
check("  store        -> NOT scoped (self invents no filtering)",
      scope_barber_id(si, "store") is None)
check("  customers    -> NOT scoped", scope_barber_id(si, "customers") is None)
check("staff+inventory can reach store routes despite scope=self",
      allowed(store_read, si) and allowed(store_write, si))
check("staff+inventory still CANNOT reach customers (not in its preset)",
      not allowed(cust_read, si))
check("shop_manager (scope=all) is never row-scoped",
      scope_barber_id(shop(), "reservations") is None)

print(f"\n{'='*62}\nPASSED {len(PASS)}   FAILED {len(FAIL)}")
if FAIL:
    for f in FAIL:
        print("  FAILED:", f)
    sys.exit(1)
print("ALL SLICE 3 CORE TESTS PASSED")
