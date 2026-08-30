# Tenant Isolation / IDOR Audit — Evidence

Follows: `investigation-protocol.md` evidence discipline. Trigger: Salman's explicit "Functional
Sweep — Step 1" instruction (2026-08-30), Security Sweep phase, item 14 (Admin authorization).

---

## 1. Middleware / Auth Context — is `clientId` reliable and spoof-proof?

**`app/core/tenant.py:get_current_admin_user()`** — reads `Authorization: Bearer <token>`, calls
`decode_token()` (`app/core/security.py:49`, `jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])`
— real signature verification, explicit algorithm allowlist, no `alg: none` risk). Extracts
`user_id`/`client_id` from the verified payload, then re-derives the User row via `find_first(where=
{"id": user_id, "clientId": client_id, "isActive": True})` — a compound match, not two independent
lookups, so a token whose `user_id`/`client_id` pair doesn't correspond to a real row returns
nothing (401). **Conclusion: reliable and spoof-proof** for every route using this dependency (or
`require_roles()`, which calls it internally).

**`app/core/tenant.py:get_current_tenant()`** — a *different*, three-stage dependency used by many
routes instead: (1) JWT Bearer → `_verify_tenant(payload["slug"])`, (2) `X-Tenant-Slug` header, (3)
`?client_slug=` query param. Stages 2/3 are **client-supplied, unauthenticated** — by design, since
this same function also resolves tenant context for genuinely public routes. **Real finding**: 7
admin-namespaced GET routes used this as their *only* guard, with no role/admin check forcing
resolution through stage 1 — see §3 below. Confirmed live pre-fix: `GET /admin/settings` with only
an `X-Tenant-Slug: mr-h` header (no Authorization header at all) returned mr-h's full settings with
HTTP 200.

---

## 2. Query Audit — every Prisma read/write reachable from admin routes

Read every repository file reachable from `app/api/v1/admin/*.py` (directly or via a service layer)
— ~20 files, matching Salman's named categories (reservations, customers, services, staff, catalog)
plus the rest of the admin surface (gallery, media, resources, units, properties, dashboard,
content, fleet, store/restaurant orders).

**Already correctly scoped** (verified fresh, not assumed from memory): `admin_catalog_repo.py`,
`barber_repo.py`, `barber_service_repo.py`, `catalog_service_repo.py`, `client_services_repo.py`,
`reservation_repo.py`, `customer_repo.py`, `property_repo.py`, `dashboard_repo.py`,
`content_sections_repo.py`, `price_repo.py`, `catalog_repository.py`, `admin_client_repo.py` (every
caller of its unscoped-by-primary-key `update_client()` passes `tenant["id"]` from a verified JWT
context, never client input). Several of these carry their own "Multi-tenant DB Integrity Audit
(Study 7, 2026-08-24)" comments from a prior real pass — re-verified current, not stale.

**Found unscoped (fixed this pass, `3e05338`)** — same shape every time: the mutating Prisma call's
`where` only had `{"id": <pk>}`, no `clientId`/`restaurantId`. Every one of these was traced to its
real route caller first — in **all 9 cases**, the route already called a properly-scoped
`find_*()` first and 404'd before ever reaching the unscoped call, so **none were exploitable via
the actual API today**. Fixed anyway because (a) that's exactly what was asked, (b) it's the same
defense-in-depth invariant this codebase's own Study 7 already established for 3 other files, and
(c) it's fragile — any future caller skipping the pre-check becomes instantly exploitable:

| File | Function(s) | Route caller(s) |
|---|---|---|
| `gallery_repo.py` | `update_gallery_image`, `delete_gallery_image` | `admin/gallery.py` |
| `restaurant_admin_repo.py` | `update_order_status` (scoped by `restaurantId`) | `admin/restaurant.py` |
| `store_admin_repo.py` | `update_order_status` | `admin/store.py` |
| `service_repo.py` | `update_service`, `delete_service` | `admin/services.py` |
| `resource_repo.py` | `update_resource` | `admin/resources.py` |
| `unit_repo.py` | `.update()`, `update_raw()`, `delete_unit()` | `admin/units.py` |

Fix shape: `update()`/`delete()` → `update_many()`/`delete_many()` with the tenant key added to
`where`, re-fetching via the already-scoped find function (`update_many`/`delete_many` return a row
count in this `prisma-client-py` version, not the row — same fix Study 7 already used). All 6 call
sites updated to pass the tenant id through.

**Investigated, not exploitable, lower priority (not fixed this pass):** `fleet_repo.py`'s
`update_vehicle_status`/`update_vehicle_gps`/`get_driver`/`update_driver_safety_score` are unscoped
by primary key, but `get_driver()` has zero callers anywhere in the codebase (dead code), and the
other three are only ever called from `samsara_service.py` (webhook-triggered, using vehicle/driver
rows already resolved via `samsaraId` matching) — not reachable from any admin route with
attacker-controlled IDs. `uber_import_service.py`'s optional `driver_id` form field is written into
new `FleetTrip` rows without verifying it belongs to the calling tenant — a real data-integrity gap
(a tenant could misattribute trips to another tenant's driver ID if guessed), but not a read/write
IDOR in the classic sense; flagged here for a future pass, not fixed now (Fleet/Samsara is a
narrower, less-active vertical than the core Reservations/Catalog/Orders surface this sweep is
about).

---

## 3. Missing authentication entirely — a different, more serious class of finding

Systematically scanned every admin route for `get_current_tenant` used with **no** `require_roles`/
`get_current_admin_user`/`require_super_admin` alongside it. Found 7, all GET, across 3 files:

- `content.py`: `GET /sections`, `GET /sections/schema`, `GET /sections/{type}/repeatable/{field}`
- `media.py`: `GET /hero-image`, `GET /gallery-images`
- `settings.py`: `GET /settings`, `GET /settings/qr`

**Confirmed live before this fix** (`curl -H "X-Tenant-Slug: mr-h" .../admin/settings`, no
Authorization header at all): HTTP 200, full settings/config body returned. Practical severity is
**low, not critical** — everything these 7 routes return (section content, hero image, gallery
images, settings/config) is already equivalent to what `GET /api/v1/public/{slug}/config` serves to
any real anonymous visitor; no credentials, PII, or genuinely private data were exposed. Separately
confirmed the corresponding WRITE routes (`PATCH /settings`, etc.) were never affected — they
already had `require_roles()` and correctly returned 401 to the same unauthenticated header-only
request.

Still a real, worth-fixing gap: it breaks this codebase's own consistent pattern (every sibling
PATCH/POST/DELETE route in the same 3 files already requires real auth), contradicts `settings.py`'s
own module docstring ("Auth: any valid tenant JWT"), and would silently expose any future non-public
field added to these same response shapes.

**Fix** (`af90427`):
- `content.py` + `media.py` (5 routes, admin-only per file convention): added
  `require_roles("SUPER_ADMIN", "TENANT_ADMIN")`, matching every sibling route in the same file.
- `settings.py` (2 routes): this router intentionally serves both client-tier and admin-tier JWTs
  (its own docstring) — `require_roles()` would have wrongly broken that, since
  `get_current_admin_user()` rejects any token whose `type` isn't `"admin"`. Added a scoped
  `_require_valid_tenant_jwt()` guard instead: reads `Authorization` directly, requires a real
  Bearer token that decodes and carries a `slug` claim — guaranteeing `get_current_tenant()`'s own
  JWT branch resolves the request, never the header/query fallback, for either token type.

---

## 4. IDOR Penetration Test — real Tenant A vs. Tenant B

Real RK (Tenant A) `TENANT_ADMIN` JWT (`rkbarber@dev.invalid`, obtained via
`POST /auth/users/login`) used against real mr-h (Tenant B) record ids (fetched via direct DB query,
not mr-h's own login):

| Test | Target | Result |
|---|---|---|
| PATCH mr-h's gallery image | `/admin/gallery/images/53b25d12-...` | **404** `"Image not found."` |
| PATCH mr-h's catalog-service price | `/admin/catalog-services/bb6282f5-...` | **404** `"Service not found"` |
| PATCH mr-h's reservation status | `/admin/reservations/08f3da16-.../status` | **404** `"Reservation not found."` |
| GET mr-h's reservation directly | `/admin/reservations/08f3da16-...` | **404** `"Reservation not found."` |

All 4 correctly rejected — no data exposed, no cross-tenant write possible, both before and after
this pass's fixes (route-level ownership pre-checks were already solid; the repo-layer fixes in §2
add defense-in-depth underneath them, not a change to this observed behavior).

Separately, the missing-auth gap in §3 was itself found and closed via the same kind of direct
probe (`curl` with a spoofed header, no token) — re-verified closed post-deploy below.

---

## 5. Post-deploy re-verification

Both fix commits (`3e05338` repo-layer scoping, `af90427` missing-auth) deployed and re-tested
against live production:

| Check | Result |
|---|---|
| `GET /admin/settings` with only `X-Tenant-Slug: mr-h` header, no token | **401** (was 200 — closed) |
| `GET /admin/settings` with RK's real Bearer token (legitimate use) | **200** (unaffected) |
| PATCH mr-h's gallery image via RK's token | **404** (unchanged — was already safe) |
| PATCH mr-h's catalog-service via RK's token | **404** (unchanged — was already safe) |
| PATCH mr-h's reservation via RK's token | **404** (unchanged — was already safe) |
| RK's own reservations list | **200** (unaffected) |
| RK's own catalog-services list | **200** (unaffected) |

Zero regression on any legitimate RK admin flow; both real classes of finding (repo-layer missing
scoping, route-layer missing auth) confirmed closed without breaking anything already working.

---

## Summary

- **Auth context**: reliable and spoof-proof for the JWT-based dependencies (`get_current_admin_user`
  / `require_roles`) — real signature verification, compound DB re-check.
- **Query audit**: ~20 repository files read; the large majority were already correctly scoped
  (including 4 files from a prior real audit, Study 7, 2026-08-24, re-verified still correct). 9
  functions across 6 files had the mutating call itself unscoped — never exploitable via the actual
  API (every route already pre-checked ownership), but fixed for defense-in-depth, matching this
  project's own established pattern and explicit invariant.
- **IDOR pen test**: 4/4 real cross-tenant attempts correctly rejected, before and after this pass.
- **Separately found and fixed**: 7 admin GET routes had no authentication dependency at all,
  relying on a tenant-resolution helper designed for public routes. Confirmed live, low practical
  severity (data already public-equivalent), fixed to match every sibling route's own convention.
- **Noted, not fixed this pass**: Fleet/Samsara's `uber_import_service.py` doesn't verify a
  client-supplied `driver_id` belongs to the calling tenant before linking trips to it — a real
  data-integrity gap, narrower vertical, flagged for a future pass.
