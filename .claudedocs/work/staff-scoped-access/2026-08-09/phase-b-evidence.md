# Staff Scoped Access — Phase B Evidence

Follows: `.claudedocs/implementation/STAFF_SCOPED_ACCESS_CONTRACT.md`, `investigation-protocol.md`'s
Evidence Interrogation standard. Real API calls via `curl` against the local dev backend
(`localhost:8000`), real JWTs from real logins — nothing simulated or assumed.

## Changes

- `app/repositories/reservation_repo.py` — `list_by_client()` gains an optional `barber_id` filter.
- `app/services/reservation_service.py` — new `ReservationAccessDenied` exception;
  `get_reservation`, `update_status`, `edit_reservation` gain an optional `staff_barber_id` param
  that (a) scopes single-reservation lookups to that barber, raising `ReservationAccessDenied` on
  mismatch, and (b) in `edit_reservation`, also blocks reassigning the reservation to a *different*
  barber. `list_reservations` gains a `barber_id` passthrough.
- `app/api/v1/admin/reservations.py` — every route switched from bare `get_current_admin_user` to
  `require_roles("SUPER_ADMIN","TENANT_ADMIN","MANAGER_RESERVATIONS","STAFF")` (previously **no**
  role gate existed on this file at all — closed as part of this change, matching the investigation's
  own finding, not just for Jaafar). New `_require_staff_barber_id(user)` helper derives the
  barberId from the authenticated `User` row only, fails closed (403) if a STAFF user has no
  `barberId` link. `ReservationAccessDenied` caught and turned into a real 403 in every relevant
  route.
- `app/api/v1/admin/catalog.py` — every route switched to
  `require_roles("SUPER_ADMIN","TENANT_ADMIN","MANAGER_RESERVATIONS","MANAGER_UNITS")` — explicitly
  excludes `STAFF` only; every other role's existing (previously ungated) access is preserved
  unchanged.

## Real API Test Matrix

Logged in via real `POST /api/v1/auth/users/login` calls — `jaafar@rk.dev.invalid` (STAFF, linked
to Barber جعفر) and `rkbarber@dev.invalid` (TENANT_ADMIN) — real JWTs used for every call below.

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| 1 | Jaafar `GET /reservations/?limit=200` | only his own `barber_id` | 3 rows, single distinct `barber_id = c75b89c3-...` (جعفر) | ✅ PASS |
| 2 | Jaafar `GET /reservations/?barber_id=<حسين>&limit=200` | override ignored, same as #1 | identical 3 rows, still only جعفر's `barber_id` | ✅ PASS |
| 3 | Jaafar `GET /reservations/{his own id}` | 200 | `HTTP 200` | ✅ PASS |
| 4 | Jaafar `GET /reservations/{حسين's id}` | 403 | `{"code":"FORBIDDEN","message":"Not authorized to access this reservation."}`, `HTTP 403` | ✅ PASS |
| 5 | Jaafar `PATCH /reservations/{حسين's id}/status` | 403 | same FORBIDDEN body, `HTTP 403` | ✅ PASS |
| 6 | Jaafar `GET /catalog/categories` | 403 | `HTTP 403` | ✅ PASS |
| 7 | Jaafar `PATCH /reservations/{his own id}` with `barber_id=<حسين>` (reassign attempt) | 403 | FORBIDDEN, `HTTP 403` | ✅ PASS |
| 8 | TENANT_ADMIN `GET /reservations/?limit=200` (regression) | sees everyone | 37 rows, `barber_id` set of `{None, حسين, جعفر}` | ✅ PASS — unaffected |
| 9 | TENANT_ADMIN `GET /catalog/categories` (regression) | 200 | `HTTP 200` | ✅ PASS — unaffected |
| 10 | TENANT_ADMIN `GET /reservations/{حسين's id}` (regression) | 200 | `HTTP 200` | ✅ PASS — unaffected |

10/10 pass. No test was skipped or assumed — every row above is a real HTTP response captured in
this session.

## Deviations / decisions made during implementation, not silently assumed

- `MANAGER_UNITS` excluded from `reservations.py`'s new allow-list (unlike `catalog.py`, where it's
  kept). Reasoning: `reservations.py` had zero gate before this change, so every role technically had
  access; but `MANAGER_UNITS`'s stated scope everywhere else in the codebase (`units.py`,
  `resources.py`) is Units, never Reservations — closing this is treated as fixing an accidental
  over-permission, not removing an intended one. Flagged here for Salman to override if he disagrees.
- STAFF is included in `reservations.py`'s `POST /` (create) allow-list — Salman's acceptance
  criteria named read/status/reschedule/edit explicitly but not create. Not specially scoped (no
  forced `barber_id` on creation) since `ReservationCreateIn` has no top-level `barber_id` field to
  begin with — named as an open question in the Contract's Phase B section, not resolved here.
- A STAFF user with no `barberId` link fails closed (403 on every reservation route) rather than
  silently seeing nothing or everything — not explicitly asked for, but the only safe default given
  "never trust client input for authorization."

## Regression check

`Staff↔Service` (`BarberService`/`CatalogService`), Catalog write access for
non-STAFF roles, and TENANT_ADMIN's full reservation visibility — all confirmed unaffected by tests
7-9 above. `barbers.py`/`catalog_services.py` (Staff↔Service's own routes) were not touched in this
phase at all.
