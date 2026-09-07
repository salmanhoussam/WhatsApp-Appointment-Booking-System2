# Phase 2 — Dashboard → Admin API Audit

**Date:** 2026-09-06 · **Mode:** investigation only. No file modified, nothing committed or deployed.
**Scope:** the Admin/Dashboard API surface. RK's public journey was **not** touched (see
`.claudedocs/work/rk-public-api-audit/2026-09-06/summary.md`, Phase 1).

---

## Inventory

| | count |
|---|---|
| Admin route modules | **23** (+`auth.py`, mounted outside the admin prefix) |
| Admin endpoints | **114** |
| Frontend `adminApi` call sites | **140** → **91** unique (verb, endpoint) pairs |
| Endpoints never called by any frontend | **30 / 114 (26 %)** |
| Frontend calls with no backend route | **0** |
| Parallel admin dashboards | **5** |

---

## 1. Auth & permission — how the floor is built

`app/api/v1/admin/__init__.py:24` mounts **22 of 23** modules through
`APIRouter(dependencies=[Depends(get_authenticated_tenant)])` — a mandatory JWT floor that
deliberately closes the `X-Tenant-Slug` / `?client_slug=` / subdomain fallbacks
`get_current_tenant` still allows.

`settings.py` is mounted **outside** that floor, with a documented reason (ADR-0002 §9.1 Soft-Block
allowlist ordering — a router-level dependency runs before a route's own signature and would break
the ordering guarantee). It self-gates: `GET /settings` and `/settings/qr` via
`_require_valid_tenant_jwt`, `PATCH /settings` via `require_roles("SUPER_ADMIN","TENANT_ADMIN")`.
**This is a deliberate exemption, not a hole** — verified by live probe (`/admin/settings` → 401).

### ⚠️ Finding A1 — two authorization generations coexist

| model | modules |
|---|---|
| **`require_permission(...)`** (newer, permission-based) | `barbers`, `catalog_services`, `customers`, `reservations`, `store` |
| **`require_roles(...)`** (older, role-list) | `bookings`, `catalog`, `client_services`, `content`, `dashboard`, `fleet`, `gallery`, `media`, `properties`, `provisioning`, `resources`, `restaurant`, `services`, `settings`, `team`, `units`, `upload` |

Both are enforced server-side, so this is **not** a security gap — it is an **incomplete migration**.
The permission model reached 5 modules and stopped. Consequence: `store` is permission-gated while
its sibling `catalog` and `restaurant` are still role-gated, so the same conceptual action is
authorized two different ways depending on which module serves it.

### Finding A2 — `GET /me` declares no auth in its own signature
Covered by the router floor (verified: `/admin/me` → **401** anonymous). Correct, but it is the one
endpoint whose protection is invisible when reading the route file alone.

---

## 2. Tenant isolation — **verified, and an earlier false alarm corrected**

⚠️ **Correction, recorded deliberately:** a first pass grepping for `tenant["id"]` reported *zero*
client-scoped call sites in 8 modules (`bookings`, `customers`, `properties`, `reservations`,
`restaurant`, `store`, `client_services`, and near-zero in `catalog`). **That was a false alarm
caused by a too-narrow grep**, not a real finding. Those modules scope by a different idiom:

- `user.clientId` — `customers.py:35`, `reservations.py:131,151,188`, `restaurant.py:119`, `store.py:143,162,207`
- `current_client["id"]` — `bookings.py:124`, `properties.py`
- `tenant["id"]` — `catalog.py:26` and the rest
- `client_services.py` documents it in prose: *"tenantId comes from the JWT — never from the payload."*

**No admin route accepts a client id from the request body or query.** The only `client_id`
parameters found are internal helper-function arguments (`me.py:51`, `restaurant.py:96`) and
`auth.py` (mounted outside the admin prefix).

**Repository layer:** 138 Prisma query sites in `app/repositories/`. 23 lacked a literal
`clientId` within 18 lines; each was inspected. Every admin-path one is scoped — either the `where`
dict is built with `clientId` upstream (`admin_catalog_repo.py:168-173`) or by a tenant-owned
foreign key (`restaurant_admin_repo.py` scopes on `restaurantId`, itself resolved through
`_get_restaurant(client_id)`). `restaurant_admin_repo.py:37-45` even carries a prior *Tenant
Isolation Audit (2026-08-30)* fix in its docstring.

The remaining unscoped sites are **outside the admin dashboard** (`occasions_repo.py`,
`dating_repo.py`, `store_repo.py`'s session-keyed cart, `user_repo.py`'s login lookups) — noted, not
in Phase 2 scope.

---

## 3. Dead / unused admin surface — 30 endpoints

### 🔴 B1 — `fleet` is an entire module with no UI: **6 endpoints, zero frontend references**
`GET /fleet/dashboard` · `/fleet/vehicles` · `/fleet/alerts` · `PATCH /fleet/alerts/{id}/read` ·
`POST /fleet/trips/import` · `DELETE /fleet/drivers/{id}/data`
No `fleet` string exists anywhere in `frontend/src`. It is also not a `client_services` service key.
Its own docstring describes a Samsara/Uber vehicle-tracking product — a different product line.
**`DELETE /fleet/drivers/{id}/data` is a live, reachable GDPR-erasure endpoint with no UI.**

### B2 — other never-called endpoints, by module
`restaurant` menu CRUD (**7** — POST/PATCH/DELETE categories + items, and `GET /menu/items`) ·
`resources` (**4**, the whole module) · `client_services` (**3**, the whole module) ·
`units` (**3** — `POST/DELETE /units/{id}/images`, `POST /units/{id}/block-dates`) ·
`properties` (**2**, the whole module) · `store` (**2** — DELETE product, DELETE category) ·
`bookings` `PATCH /bookings/{id}` · `content` `POST /content/sections` ·
`reservations` `GET /reservations/{id}`

**Not all 30 are deletable.** `restaurant`'s menu CRUD is unused because the Generic dashboard's
`CatalogTab` writes through `/catalog/*` instead — that is the **Catalog dual-write-path** already
on record (`rules/backend/architecture.md` §9), seen here from the API side. Deleting those routes
is a Capability decision, not a cleanup.

### B3 — zero broken calls ✅
Three frontend paths looked unmatched to static analysis and are all **false positives** —
`` `/store/products${params}` `` (query string), and `` `/${orderEndpoint}/orders` `` where
`orderEndpoint` resolves to `'restaurant'` or `'store'` (`OrdersTab.jsx:352`,
`OverviewTab.jsx:475`), both of which exist.

---

## 4. Five parallel dashboards

| dashboard | lines | status |
|---|---|---|
| `generic-admin/GenericAdminDashboard.jsx` | 1025 | **canonical** (`rules/frontend/routing.md` §0b) — 10 tabs |
| `smar/admin/SmarAdminDashboard.jsx` | 2218 | **legacy**, still routed at `/:slug/admin/*` for *any* slug |
| `caracas/admin/CaracasAdminDashboard.jsx` | 221 | tenant-specific, restaurant orders only |
| `footlab/admin/FootlabAdminDashboard.jsx` | 231 | tenant-specific, store orders only |
| `olivello/admin/OlivelloAdminDashboard.jsx` | 17 | stub |

`SmarAdminDashboard` is the **sole consumer** of `bookings`, `units`, `services`, `gallery`,
`dashboard` and `dashboard/stats`. So "is this endpoint dead?" often really means "is the legacy
dashboard dead?" — those two questions cannot be answered separately.

---

## 5. Response contract

Backend is consistent: `{"success": true, "data": ...}` (`rules/backend/api-rules.md` §5).
Frontend mostly reads `r.data.data ?? []` (15 sites). But **3 sites defend against two shapes** —
`res?.data?.data ?? res?.data ?? []` (`OrdersTab.jsx:386`, `OverviewTab.jsx:525`) — which means the
envelope is being treated as *not guaranteed*. Either the fallback is dead defensive code, or some
endpoint really does return a bare array. **Not resolved in this audit** — needs an authenticated
runtime pass (see Unknowns).

---

## 6. Runtime evidence (unauthenticated)

Real browser, production:

- `alzabt.salmansaas.com/rk/dashboard` → **redirected to `/login`** ✅
- `admin_access_token` in `localStorage` → **cleared by the guard** (`tokenPresent: false`)
- `GET /api/v1/admin/me` with no token → **401** `"Missing or invalid Authorization header"`
- Anonymous probes, redirects followed: `/admin/settings`, `/admin/reservations/`, `/admin/units/`,
  `/admin/catalog/categories`, `/admin/customers/` → **401 every one**
- Only console error on the page was that deliberate 401 probe

---

## Confirmed / Side / Unknowns

### Confirmed
1. Admin auth floor is real and enforced (114 endpoints, 401 verified live on a sample).
2. Tenant isolation holds across the admin path — routes and repositories both.
3. Zero broken frontend→backend calls.
4. 30 of 114 endpoints have no frontend caller; `fleet` (6) has no UI whatsoever.
5. Two authorization generations coexist — `require_permission` reached 5 modules and stopped.
6. Five parallel dashboards; the 2218-line legacy one is the only consumer of 6 endpoint groups.

### Side findings
- `content` has 11 endpoints for one Settings tab — the largest surface-per-consumer ratio found.
- `restaurant`/`store` writing catalog data through their own modules instead of `catalog` is
  visible here as 7 orphaned menu-CRUD endpoints — the §9 dual-write-path, from the API side.
- Response-envelope defensive fallbacks (§5).

### Unknowns
1. **No authenticated runtime pass was possible** — no dashboard credentials on file; the leftover
   browser token was expired and the guard cleared it. So *response shapes*, *role behavior per
   tab*, and *which tabs actually render for RK* are unverified at runtime. **To close this I need a
   TENANT_ADMIN account for `rk`** — and per the standing rule it must belong to that same tenant,
   never a cross-tenant token.
2. **No cross-tenant read probe** — the sharpest isolation test (token for tenant A requesting
   tenant B's data) needs that same account. Static + repo evidence says it would 403/404; that is
   inference, not measurement.
3. Whether the 30 uncalled endpoints are used by anything outside this repo (scripts, n8n, external
   API clients) was not established.

---

## Recommendation / Decision / Execution
- **Recommendation:** nothing yet — this audit exists so the *next* decision is informed. The three
  candidates it surfaces are: finish the permission migration (A1), decide `fleet`'s fate (B1), and
  decide the legacy-dashboard question that gates ~half the dead endpoints (§4).
- **Decision:** none taken.
- **Execution:** none. No modification, no commit, no deploy.
