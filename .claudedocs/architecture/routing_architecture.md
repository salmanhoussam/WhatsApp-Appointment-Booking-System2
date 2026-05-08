# Routing Architecture — SalmanSaaS Platform
**Last updated:** 2026-05-05 (Phase 52 — Self-Service Onboarding)

---

## Frontend Routing

### Mode Detection (App.jsx)

```js
const IS_SUBDOMAIN_MODE  = hostname !== 'localhost' && hostname.split('.').length >= 3
const IS_AUTH_SUBDOMAIN  = IS_SUBDOMAIN_MODE && hostname.startsWith('auth.')
const IS_SHOWCASE_DOMAIN = !IS_SUBDOMAIN_MODE && hostname !== 'localhost'
```

| Mode | Examples | Routing behavior |
|------|----------|-----------------|
| localhost dev | `localhost:5173` | `/:slug/*` → TenantResolver |
| auth subdomain | `auth.salmansaas.com` | `/login` → SSOLoginPage, `/:slug/dashboard/*` → GenericAdminDashboard |
| tenant subdomain | `smar.salmansaas.com` | `/*` → TenantResolver (no slug prefix) |
| showcase domain | `salmansaas.com` | `/*` → ShowcaseRoutes |

---

### Static Routes (App.jsx)

| URL | Conditions | Component | Notes |
|-----|-----------|-----------|-------|
| `/` | localhost | redirect → `/smar` | root redirect |
| `/` | auth subdomain | redirect → `/login` | |
| `/` | tenant subdomain | redirect → `/showcase` | |
| `/login` | auth subdomain | `SSOLoginPage` | SSO portal |
| `/login` | localhost | `Login` | legacy dev form |
| `/register?template=X` | any | `TenantRegisterPage` ← **Phase 52** | 4-step self-signup |
| `/register` | auth subdomain | `SSOLoginPage` | |
| `/register` | localhost (no template) | redirect → `/` | |
| `/demo/:slug` | auth subdomain / localhost | `DemoPublicPage` ← **Phase 50/52** | public demo page |
| `/:slug/dashboard/*` | auth subdomain / localhost | `GenericAdminDashboard` ← **Phase 52** | trial admin UI |
| `/:slug/admin/*` | localhost | `SmarAdminDashboard` | legacy smar admin |
| `/dashboard/:slug/*` | localhost | `SmarAdminDashboard` | legacy dev path |
| `/admin/*` | subdomain mode | `SmarAdminDashboard` | smar.domain.com/admin |
| `/dashboard/*` | subdomain mode | `SmarAdminDashboard` | smar.domain.com/dashboard |
| `/super/*` | any | `ClientsManager` | Salman's control room |
| `/showcase/*` | localhost | `ShowcaseRoutes` | dev preview of showcase site |
| `/*` | showcase domain | `ShowcaseRoutes` | salmansaas.com marketing site |
| `/404` | any | `NotFound` inline | |
| `/:slug/*` | localhost / auth subdomain | `TenantResolver` | dynamic tenant routing |
| `/*` | subdomain mode | `TenantResolver` | slug from hostname |

All protected routes are wrapped in `<ProtectedRoute>` which checks `admin_access_token` in localStorage.

---

### Tenant Registry (router/tenants/index.js)

```js
export const tenantRegistry = {
  smar:    { routes: lazy(./smar.routes),    defaultRedirect: 'home',  theme: 'gold-dark'   },
  caracas: { routes: lazy(./caracas.routes), defaultRedirect: 'menu',  theme: 'red-dark'    },
  footlab: { routes: lazy(./footlab.routes), defaultRedirect: 'store', theme: 'purple-dark' },
}
```

**FM12 Rule:** Any page using `useScroll`, `useTransform`, or MotionValue bindings MUST be `lazy()`.
Direct imports at chunk-load time crash React 19 StrictMode with FM12 (blank `div#root`).

---

### Smar Tenant Routes (smar.routes.jsx)

| URL | Component | Import |
|-----|-----------|--------|
| `/smar` / `/smar/*` | redirect → `showcase` | — |
| `/smar/showcase` | `ShowcaseTemplate` | direct |
| `/smar/listings` | `ListingsTemplate` | direct |
| `/smar/gallery` | `SmarGalleryPage` | **lazy** |
| `/smar/spatial` | `SpatialHomePage` | **lazy** — FM scroll |
| `/smar/spatial/property/:id` | `SpatialPropertyDetails` | **lazy** — FM scroll |
| `/smar/challet` | `ChalletDemo` | **lazy** |
| `/smar/ring` | `SmarLiquidRing` | **lazy** — WebGL |
| `/smar/admin` | `SmarAdminDashboard` | **lazy** + ProtectedRoute |

---

### Folder Structure

```
frontend/src/
├── App.jsx                            ← Root router
├── router/
│   ├── TenantResolver.jsx             ← slug → tenantRegistry lookup
│   ├── ProtectedRoute.jsx             ← JWT guard
│   ├── showcase.routes.jsx            ← salmansaas.com marketing
│   └── tenants/
│       ├── index.js                   ← REGISTRY (only place to add tenants)
│       ├── smar.routes.jsx
│       ├── caracas.routes.jsx
│       └── footlab.routes.jsx
├── pages/
│   ├── admin/Login.jsx                ← Dev-only login
│   ├── auth/
│   │   ├── SSOLoginPage.jsx           ← auth.salmansaas.com SSO portal
│   │   └── TenantRegisterPage.jsx     ← 4-step tenant self-signup (Phase 52)
│   ├── demo/DemoPublicPage.jsx        ← Trial tenant public preview (Phase 50)
│   ├── generic-admin/
│   │   └── GenericAdminDashboard.jsx  ← Trial admin: CatalogTab + SettingsTab (Phase 52)
│   ├── super-admin/ClientsManager.jsx ← Super admin control room
│   ├── smar/                          ← Smar-specific pages
│   ├── caracas/                       ← Caracas-specific pages
│   └── footlab/                       ← Footlab-specific pages
└── design-system/                     ← Shared tenant-agnostic components
```

---

## Backend Routing

All routes are prefixed with `/api/v1`.

### Auth — `/api/v1/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | none | CLIENT JWT (`type=client`) for public API |
| POST | `/auth/users/login` | none | USER JWT (`type=admin`, `role`) for admin dashboard |
| POST | `/auth/register` | none | Create tenant + return USER JWT directly ← **updated Phase 52** |
| GET | `/auth/me` | USER JWT | Current user info |
| POST | `/auth/sso/token` | none | SSO token exchange |

### Webhooks — `/api/v1/webhook`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhook/whatsapp` | webhook secret | WhatsApp booking confirmations |
| POST | `/webhook/onboarding/process` | `x-onboarding-secret` header ← **new Phase 52** | Raw WhatsApp text → Claude Haiku → auto-register tenant |

**Onboarding webhook flow:**
1. n8n sends raw conversation text + `x-onboarding-secret` header
2. Claude Haiku (`claude-haiku-4-5-20251001`) extracts structured JSON
3. `register_new_tenant()` creates Client + User + seeds services
4. Returns: `{ dashboard_url, trial_ends_at, temp_password, slug }`

### Public — `/api/v1/public`
No auth required. CLIENT JWT optional for personalization.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/public/client/{slug}/config` | Tenant config (branding, features) |
| GET | `/public/client/{slug}/units` | Available units with filters |
| POST | `/public/client/{slug}/book` | Create booking |
| GET | `/public/{slug}/catalog` | Catalog categories + items |
| GET | `/public/{slug}/restaurant` | Restaurant menu |
| GET | `/public/{slug}/store` | Store products |

### Admin — `/api/v1/admin`
Requires USER JWT (`type=admin`).

| Path group | Description |
|-----------|-------------|
| `/admin/bookings/*` | Booking CRUD + status updates |
| `/admin/units/*` | Unit CRUD |
| `/admin/services/*` | Add-on services CRUD |
| `/admin/prices/*` | Price calendar management |
| `/admin/gallery/*` | Gallery images CRUD |
| `/admin/settings` | Tenant config PATCH |
| `/admin/catalog/*` | CatalogCategory + CatalogItem CRUD ← **Phase 49/51** |
| `/admin/restaurant/*` | Restaurant config + menu CRUD |
| `/admin/store/*` | Store products + orders CRUD |
| `/admin/upload` | Image upload → Supabase Storage ← **Phase 53 (pending)** |

### Super Admin — `/api/v1/super`
Requires USER JWT with `role=SUPER_ADMIN`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/super/clients` | List all tenants |
| POST | `/super/clients` | Create new tenant manually |
| PATCH | `/super/clients/{id}` | Update tenant |
| GET/PATCH | `/super/clients/{id}/services` | Toggle tenant's active services |
| GET/POST/PATCH | `/super/platform-services` | Manage SalmanSaaS product catalog |

---

## Adding a New Tenant (3 Steps)

1. Create `src/pages/[slug]/` (canvas/, sections/, ui/, store/, spatial/, normal/, admin/)
2. Create `src/router/tenants/[slug].routes.jsx`
3. Add entry to `src/router/tenants/index.js`

**Nothing else.** `App.jsx` and `TenantResolver.jsx` stay untouched.

---

## Trial vs Production Routing

```
client.status = "trial"  → /{slug}/dashboard  (GenericAdminDashboard)
client.status = "active" → {slug}.salmansaas.com/admin  (SmarAdminDashboard)
```

`SSOLoginPage.resolveRedirect()` reads `status` from the JWT response and routes accordingly.
User role (`TENANT_ADMIN`) is the same for both — only `client.status` determines the URL.
