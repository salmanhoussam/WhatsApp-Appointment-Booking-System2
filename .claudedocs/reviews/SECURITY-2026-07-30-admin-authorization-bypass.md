# Security Finding — Admin Route Authorization Bypass via `get_current_tenant`

**Severity: Critical**
**Status: Confirmed, not yet fixed**
**Discovered**: 2026-07-30, during a Role Hierarchy architecture review (unrelated original goal —
found as a side effect of tracing how Admin routes are gated)
**Follows**: `investigation-protocol.md` (Confirmed / Side Findings / Unknowns, Evidence
Interrogation) — this document is the evidence record for the "freeze non-security work" decision
made in today's session.

---

## Confirmed Findings

### 1. `get_current_tenant` resolves tenant identity from 4 sources, 3 of which require no authentication

`app/core/tenant.py:203-260`, `get_current_tenant()`, in priority order:
1. JWT Bearer token (`credentials.credentials` → `decode_token` → `payload["slug"]`)
2. **`X-Tenant-Slug` HTTP header — no token required** (line 228-231)
3. **`?client_slug=` query parameter — no token required** (line 234-237)
4. Subdomain — no token required (line 240-251)

Its own docstring (line 208) states it is meant to "resolve the current tenant for ANY route
(public or admin)." That dual-purpose design is the root cause: it was written as a *tenant
resolver* for public read endpoints, then reused as the sole gate on admin *write* endpoints
without adding an authentication requirement on top.

### 2. Confirmed exploitable: 9 admin route files gate their routes with `get_current_tenant` alone — no `get_current_admin_user`, no `require_roles`, anywhere in the file

Verified by direct file reads and targeted grep (`Depends(get_current_admin_user)` /
`Depends(require_roles` return **zero matches** in any of these files):

| File | Exposed routes (method, path) | Real-world impact |
|---|---|---|
| `app/api/v1/admin/team.py` | `GET /team`, `POST /team`, `DELETE /team/{user_id}` | **List all staff (name/email/role). Create a new Manager-role user account with an attacker-chosen password. Deactivate any existing staff account.** For any tenant, given only its slug. |
| `app/api/v1/admin/units.py` | `POST /`, `PATCH /{unit_id}`, `POST /{unit_id}/block-dates`, `POST /{unit_id}/date-overrides`, `POST/DELETE /{unit_id}/images`, `DELETE /{unit_id}` | Create/edit/delete any tenant's bookable units, block availability, delete unit images |
| `app/api/v1/admin/bookings.py` | `POST /`, `PATCH /{booking_id}/status`, `PATCH /{booking_id}` | Create fake bookings, change booking status on any tenant |
| `app/api/v1/admin/gallery.py` | `POST /{unit_id}`, `PATCH /images/{image_id}`, `PUT /{unit_id}/reorder`, `DELETE /images/{image_id}` | Add/reorder/delete gallery images on any tenant |
| `app/api/v1/admin/properties.py` | `POST /` | Create property records for any tenant |
| `app/api/v1/admin/services.py` | `POST /`, `PATCH /{service_id}`, `DELETE /{service_id}` | Create/edit/delete add-on services for any tenant |
| `app/api/v1/admin/fleet.py` | `PATCH /alerts/{alert_id}/read`, `POST /trips/import`, `DELETE /drivers/{driver_id}/data` | Import fake trip data, delete driver data for any tenant |
| `app/api/v1/admin/upload.py` | `POST /` | Upload arbitrary files into any tenant's Supabase storage folder |
| `app/api/v1/admin/dashboard.py` | `GET /dashboard`, `GET /dashboard/stats` | Read-only — exposes any tenant's dashboard stats without auth (lower severity, no mutation) |

The single highest-impact route is `team.py`'s `POST /team`: it allows an unauthenticated caller
to provision a real, working Manager credential (email + attacker-chosen password) for any target
tenant, which can then be used to log in normally via `POST /api/v1/auth/users/login` and access
that tenant's admin panel — a full authenticated-account takeover path starting from zero
credentials.

### 3. Confirmed absent: no router-level or app-level enforcement compensates for this

Checked and ruled out, each independently:
- `app/api/v1/admin/__init__.py` — `include_router(...)` calls carry no `dependencies=[...]`
  parameter (full file read, 23 lines).
- `app/main.py:70` — `app.include_router(admin_v1_router, prefix="/api/v1/admin")`, also no
  `dependencies=[...]`.
- `app/main.py`'s only middleware is `CORSMiddleware` (lines 57-63) — CORS does not authenticate.
- `app/core/handlers.py` — grepped for `middleware|Depends|auth|Authorization`, zero matches; it
  only registers exception handlers.
- No `@app.middleware(...)` or `BaseHTTPMiddleware` subclass exists anywhere in `app/` (repo-wide
  grep, zero matches).
- No `app/api/v1/__init__.py` file exists to add an intermediate dependency layer.

**This closes the one open question from this session's prior turn** — the vulnerability is not
mitigated at any higher layer. It is real, at the exact severity previously described.

### 4. Contrast — the routes that ARE correctly gated

`app/api/v1/admin/content.py`, `settings.py`, `media.py`, `client_services.py`,
`reservations.py`, `restaurant.py`, `catalog.py`, `store.py` all use `get_current_admin_user`
and/or `require_roles(...)` for their mutation routes — proving the correct pattern already exists
and is already used elsewhere in this same codebase. This is not a missing capability; it's an
inconsistently-applied one.

---

## Side Findings (noticed, not the point of this investigation)

- `app/api/v1/admin/listings.py` also uses only `get_current_tenant`, but is **not mounted**
  anywhere (confirmed in the prior Dead Scaffolding investigation) — not currently exploitable,
  but would become exploitable immediately if ever registered as-is, compounding the existing
  "decide its fate" recommendation from that investigation.
- `app/api/v1/admin/auth.py`'s `/login`, `/users/login`, `/register` routes correctly use
  `get_current_tenant` with no additional auth — this is expected and correct, since these are
  themselves the authentication entry points. Not a finding.

## Unknowns

- Whether this has been exploited in practice against any real live tenant — no log/audit trail
  was reviewed as part of this investigation (out of scope for a code-level review; would require
  production log access).
- Whether `app/api/v1/admin/dashboard.py`'s and `upload.py`'s full route lists were exhaustively
  checked beyond the routes shown by the targeted grep above — the grep pattern used should have
  caught every `@router.` decorator in each file, but a full line-by-line read (as was done for
  `team.py`) was not repeated for every file in the table; treat the table as accurate for the
  routes matched, not certified complete for routes that might use a different decorator style.

---

## Fix Direction (not implemented — documentation only, per this session's scope)

Not a code change here, only the shape of the fix for when it's authorized: every route in the
table above needs its `Depends(get_current_tenant)` replaced with `Depends(get_current_admin_user)`
or wrapped in `Depends(require_roles(...))` with the correct role set per route (e.g. `team.py`'s
`POST /team` should require `TENANT_ADMIN`; `units.py`'s mutations should require `TENANT_ADMIN` or
`MANAGER_UNITS`; `bookings.py` should require `TENANT_ADMIN` or `MANAGER_RESERVATIONS` — matching
the same role pairing already used in `restaurant.py`/`store.py`'s docstrings). No schema change,
no new dependency function needs to be invented — `get_current_admin_user`/`require_roles` already
exist and are already proven correct elsewhere in this same codebase (§4 above).

---

## Decision Required from Salman

1. Authorize the fix now (adds `get_current_admin_user`/`require_roles` to the 9 files above), or
   review this finding first before any code change.
2. Confirm severity/priority ranking — this session's own conclusion (see session discussion,
   2026-07-30) places this above Role Hierarchy ADR-0006, Store Template Pilot, Catalog Admin
   Bypass, and Dead Scaffolding.
