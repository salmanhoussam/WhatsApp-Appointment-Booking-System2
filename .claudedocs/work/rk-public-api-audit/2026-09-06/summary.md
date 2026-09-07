# RK Customer-Facing Journey → Public API Audit

**Date:** 2026-09-06 · **Scope:** Phase 1 only — RK public customer journey.
**Explicitly out of scope:** the Dashboard/Admin API review (Phase 2), and the Supabase migration
(closed; production has been on Frankfurt since Gate 6).

**Question asked:** does the RK homepage, or any customer-facing flow under it, depend in any way on
Admin/Dashboard APIs — directly, or indirectly through a shared component, hook, service or helper?

**Answer: No. Not directly, not indirectly, not in the shipped bundle.** Proven three independent
ways below. One real *adjacent* exposure was found and is reported as a Side Finding — it is not an
Admin API call by RK.

---

## The request chain, traced end to end

`rk` is not in `tenantRegistry`, so it resolves config-driven (ADR-0006):

```
alzabt.salmansaas.com/rk
  → App.jsx:271            <Route path="/:slug/*" element={<TenantResolver/>} />
  → TenantResolver.jsx     slug='rk' not in tenantRegistry → fallback
  → _dynamic.routes.jsx    the ENTIRE public surface = 4 components:
        index | home  → pages/generic/normal/DynamicPage.jsx
        catalog|menu|store → pages/generic/normal/CatalogPage.jsx
        cart          → pages/generic/normal/CartPage.jsx
        reserve       → pages/generic/normal/ReservePage.jsx
  → hooks/useTenantConfig.js · services/catalogApi.js · hooks/useReservationBooking.js
  → utils/publicApi.js     baseURL = `${VITE_PUBLIC_API_URL}/api/v1/public`
  → app/api/v1/public/*    (public routers)
```

---

## Confirmed Findings

### 1. Static: the admin client is unreachable from RK's public pages

A transitive import walk from all 4 entry components resolved **35 modules**. Across all 35:

- references to `adminApi` / `utils/admin.config` / `api/v1/admin` / `'/admin/'` → **0**
- HTTP clients present in the graph → **`utils/publicApi.js` only**

`publicApi.js` is 15 lines: `axios.create({ baseURL })` with **no interceptor, no `Authorization`
header, and no `localStorage` read** — it is structurally incapable of sending an admin credential.

### 2. Runtime: every request the journey makes is `/api/v1/public/`

Real browser (Playwright), production, four pages. **13 API requests, all `200`, all public:**

| page | requests |
|---|---|
| `/rk` (home) | `/public/rk/config` · `/public/reservations/catalog-services` · `/public/store/categories` · `/public/store/products` |
| `/rk/store` | `/public/rk/config` · `/public/store/categories` · `/public/store/products` |
| `/rk/reserve` | `/public/rk/config` · `/public/reservations/barbers` · `/public/reservations/catalog-services` · `/public/reservations/barbers?service_id=…` · `/public/reservations/availability` |
| `/rk/cart` | `/public/rk/config` |

Requests to `/api/v1/admin/*`: **0.** Console errors/warnings across the journey: **0.**
Host is `api.salmansaas.com` — the **public** API host, not `dashboard.salmansaas.com` (the admin
host, per the 2026-08-28 domain split). The customer journey never contacts the admin domain at all.

### 3. Bundle: the admin client is not even shipped to the public page

On `/rk`, fetched all **35 loaded JS chunks** and searched each for the admin base-URL string
`/api/v1/admin`. **Chunks containing it: 0.** Page rendered (`#root` innerHTML = 47,806 chars).

So it is not merely "not called" — the admin API client is **not present in the public bundle**.

### 4. Backend: the two contracts are genuinely separate, verified anonymously

Fully anonymous requests (no cookie, no token):

| public endpoint | result | | admin endpoint | result |
|---|---|---|---|---|
| `/public/rk/config` | **200** | | `/admin/settings` | **401** |
| `/public/reservations/barbers` | **200** | | `/admin/reservations/` | **401** |
| `/public/reservations/catalog-services` | **200** | | `/admin/units/` | **401** |
| `/public/store/categories` | **200** | | `/admin/catalog/categories` | **401** |
| `/public/store/products` | **200** | | `/admin/customers/` | **401** |

*(the admin 401s were re-checked following redirects — the initial `307`s are trailing-slash
redirects, and every one lands on `401 UNAUTHORIZED — Missing or invalid Authorization header`.)*

Mechanism: `app/api/v1/admin/__init__.py:24` mounts all admin sub-routers through
`APIRouter(dependencies=[Depends(get_authenticated_tenant)])`, which — per its own comment —
deliberately closes the `X-Tenant-Slug` / `?client_slug=` / subdomain fallbacks that
`get_current_tenant` still allows. JWT or nothing.

**Conclusion: the intended shape holds.**
`RK customer-facing pages → Public API → public tenant/customer data.`

---

## Side Findings

*Real, found along the way, NOT answers to the question asked.*

### S1 — The dashboard shares an origin with the public page, so the admin JWT is readable there

`alzabt.salmansaas.com` serves **both** the public tenant pages (`/rk`) and the dashboard
(`/rk/dashboard`, `App.jsx:197`). Same origin ⇒ same `localStorage`. Confirmed live: on `/rk`,
`localStorage` contained `admin_access_token` (**PRESENT**) alongside `rk_generic-cart`,
`rk_cart_session`, `tenant_status`, `trial_ends_at`.

Stated precisely, without overclaiming: **RK's public page does not read that token** (Finding 3
proves the admin client isn't even loaded). But because the shop owner's dashboard login and the
public page live on one origin, the admin JWT is *reachable by any script running on the public
page*. That is an XSS blast-radius question, not an Admin-API-dependency question. In this session
the token came from prior admin browsing in the same browser profile — a real customer would have
none.

### S2 — A different public page *does* import the admin client: `DemoPublicPage.jsx`

Not RK, and not on RK's route — but in the same codebase and publicly reachable at
`/demo/{slug}/legacy` (`App.jsx:190` → `DynamicTenantResolver.jsx:87`, no `ProtectedRoute`):

- `frontend/src/pages/demo/DemoPublicPage.jsx:12` — `import adminApi from '../../utils/admin.config'`
- `:346-349` — `persistToDb()` → `adminApi.patch('/settings', patch)`
- called by `handleHeroChange` (:351) and `handleCatalogChange` (:357), **neither of which is
  rendered in the JSX** — so the write path is unreachable today.

Also `:334-343`: a `postMessage` listener with **no `e.origin` check**.

### S3 — `frontend/src/api.js`: unauthenticated raw `fetch` to admin routes

`GET /api/v1/admin/units` and `PUT /api/v1/admin/units/{id}` with **no `Authorization` header**.
Its only importer is `components/ChaletModal.jsx:2`, which is itself imported by nothing. Dead pair,
and it would be rejected server-side anyway (Finding 4).

---

## Unknowns

1. **Not every reservation step was driven to completion.** The read chain was exercised
   (services → barbers → availability), but no booking was submitted — that write belongs to Gate 8
   and must be a real booking, so it was deliberately not faked here. The submit path is
   `useReservationBooking.js:255-263`, `publicApi.post('/reservations')`, and is inside the audited
   35-module graph — but it is verified statically, not at runtime.
2. **`GlobalAuthModal`'s customer login/register** (`/${slug}/auth/login`, `/auth/register`, both via
   `publicApi`) is in the graph but was not exercised — no customer account was logged in.
3. **Whether S2's handlers were ever wired into the JSX in an earlier revision** — `git log -p` on
   `DemoPublicPage.jsx` was not run. At `HEAD` they are orphaned.

---

## Recommendation / Decision / Execution

- **Recommendation:** no action needed for RK — the boundary is correct as built. S2 and S3 are
  small pure deletions worth doing, but they are **not RK** and belong to their own track.
- **Decision:** none taken. Salman asked for investigation only.
- **Execution:** none. No file was modified, nothing committed, nothing deployed.
