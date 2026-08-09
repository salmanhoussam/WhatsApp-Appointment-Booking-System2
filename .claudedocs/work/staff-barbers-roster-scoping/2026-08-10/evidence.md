# STAFF `/admin/barbers/` Roster Scoping — Evidence (closed)

Follows: `.claudedocs/work/staff-barbers-roster-scoping/2026-08-10/investigation.md` (leak shape +
required contract, established before any code was written).

## Fix

`app/api/v1/admin/barbers.py`'s `list_barbers()` — reused `_require_staff_barber_id()` (already
proven in `reservations.py`, Staff Scoped Access Phase B) rather than a new mechanism: `STAFF`
callers get the query result filtered to their own `barberId`; every other role is unaffected.
Zero write routes touched — investigation confirmed none needed to change.

## Real API Tests (backend restarted with the fix loaded, all against the live server)

| Account | Role | `barberId` | Result |
|---|---|---|---|
| `jaafar@rk.dev.invalid` | STAFF (real barber, جعفر) | `c75b89c3-...` | `200`, **1 row** — only جعفر |
| `rkbarber@dev.invalid` | TENANT_ADMIN | — | `200`, **2 rows** — full roster (حسين + جعفر), unchanged |
| `staff-no-barber-verify@rk.dev.invalid` | STAFF, no barber link | `null` | **`403 FORBIDDEN`**, "Staff account is not linked to a barber profile." — fail-closed, not a silent 200 |

The third account is a real, pre-existing row (`b01011e1-...`, "Staff No Barber Verify", surfaced
during today's Production Data Hygiene investigation, deliberately left in the DB for exactly this
edge case) — password reset for testing, not fabricated.

## Real Browser Regression (Calendar, both roles)

- **Jaafar (STAFF)**: Today view shows exactly one barber column ("جعفر"), Week view renders
  normally (day-based, no barber-scoping surface to break). Zero new console errors. Network
  response for `/admin/barbers/` confirmed single-row.
- **TENANT_ADMIN**: Calendar's barber picker still shows both "حسين" and "جعفر" as selectable
  options; Staff tab (الموظفون) still renders the full roster with both cards, edit/hide controls
  intact. Zero console errors. Network response confirmed 2-row.

**Side finding, not caused by this change** (re-confirmed, already known from the 2026-08-09/10
Staff-scoped reviews): Jaafar's dashboard shell still fires 5 wasted `403` requests to
`catalog/categories`/`catalog/items`/`store/orders` regardless of his role having no nav entry
pointing there — correctly blocked (403, not a leak), just noisy. Named again, not fixed here —
out of this task's scope.

## Verdict

**No regression for either role.** All four required outcomes confirmed with real accounts and a
real browser, not assumed:
- STAFF sees only themselves. ✅
- TENANT_ADMIN keeps the full roster. ✅
- STAFF with no `barberId` fails closed (403). ✅
- Write routes unchanged. ✅ (confirmed by reading every route in the file — none needed to change)
- Calendar (Today + Week) unaffected for both roles. ✅
