paths: "frontend/src/**,frontend/public/**"

# Multi-Tenant Routing System Rules

When modifying routes or adding new tenants, you MUST strictly adhere to the Registry-Based Lazy Routing architecture.

## 0. Canonical URL Rule (CRITICAL — one URL per tenant)

Every custom-built tenant has EXACTLY ONE canonical public URL:
```
demo.salmansaas.com/{slug}/{defaultRedirect}
```

Examples:
- olivello → demo.salmansaas.com/olivello/home  ✅
- smar     → demo.salmansaas.com/smar/home      ✅
- caracas  → demo.salmansaas.com/caracas/menu   ✅

The `/demo/{slug}` path is for AUTO-ONBOARDED tenants only (not in tenantRegistry).
`DynamicTenantResolver` automatically redirects `/demo/{slug}` → `/{slug}/{defaultRedirect}`
for any slug found in `tenantRegistry`.

**NEVER give a client two working URLs.** Always use `/{slug}/{defaultRedirect}` in all
marketing materials, emails, and admin panels.

## 0b. Canonical Admin URL Rule (established 2026-08-07)

Every tenant's admin dashboard has exactly one canonical URL, path-based, on both localhost and
`demo.salmansaas.com`:
```
/{slug}/dashboard
```
Renders `GenericAdminDashboard` (`frontend/src/pages/generic-admin/GenericAdminDashboard.jsx`) —
the one correct admin surface for every tenant type, branching internally per `active_services`
(Reservations/Catalog/Orders/Settings, etc.). Matches `App.jsx:174`'s
`/:slug/dashboard/*` route, condition `(IS_DEMO_SUBDOMAIN || (!IS_SUBDOMAIN_MODE &&
!IS_SHOWCASE_DOMAIN))`.

Established after a real, confirmed bug (2026-08-07, investigation:
`.claudedocs/work/registration-redirect-bug/2026-08-07/`): `RegistrationPage.jsx`'s post-signup
redirect pointed at `/{slug}/admin` (dev) and `https://{slug}.salmansaas.com/dashboard` (prod) —
both resolve to `SmarAdminDashboard`, the old, smar-specific dashboard — sending every newly
self-registered tenant, regardless of type, into the wrong admin surface.

### Every admin-route pattern in `App.jsx`, classified

| Route | Condition | Target | Status |
|---|---|---|---|
| `/{slug}/dashboard/*` | demo subdomain OR plain localhost/LAN | `GenericAdminDashboard` | ✅ **Canonical** |
| `/dashboard/:slug/*` | none (all domains) | `GenericAdminDashboard` | Duplicate path to the same correct component — not yet classified as legacy/redirect/removed; open item, no decision made yet |
| `/:slug/admin/*` | none (all domains, any slug) | `SmarAdminDashboard` | **Legacy** — subject of a dedicated architecture investigation (not a bug fix); see Item 3, `.claudedocs/evolution/admin-routing.md` |
| `/admin/*` (subdomain mode) | real tenant subdomain | `SmarAdminDashboard` | Legacy, same investigation scope as above |
| `/dashboard/*` (subdomain mode) | real tenant subdomain | `SmarAdminDashboard` | Marked **"Subdomain mode legacy"** in the code's own comment; same investigation scope |

**Open gap, not yet resolved:** on a real tenant subdomain (`{slug}.salmansaas.com`, `IS_SUBDOMAIN_MODE
&& !IS_DEMO_SUBDOMAIN`), no route currently serves `GenericAdminDashboard` at all — every
subdomain-mode admin route goes to the legacy `SmarAdminDashboard`. The canonical rule above is
proven and working for localhost/LAN and `demo.salmansaas.com`; real-tenant-subdomain admin access
is an unresolved question, not silently assumed solved by this rule.

**Second open finding — hostname/environment detection is duplicated three ways, only two in
sync:** `App.jsx`'s `_IS_LOCAL_HOST`/`IS_SUBDOMAIN_MODE` constants, `useTenantSlug.js`'s private
`_isSubdomainMode()` (explicitly written to mirror `App.jsx`, per that file's own comment), and
`RegistrationPage.jsx`'s own inline `isProd` check — the third one, independently written, does
**not** treat `192.168.*` LAN IPs as local (the other two do), meaning a tenant registered from a
LAN dev/test setup gets redirected to a real production domain that isn't running the dev build.

Any future admin-facing link/redirect must point at `/{slug}/dashboard` only, and any new
hostname/environment check should reuse `useTenantSlug.js`'s logic rather than writing a fourth
independent copy.

## 1. The Registry Pattern

NEVER add tenant-specific routes directly to App.jsx.
App.jsx only handles static routes (/login) and delegates /:slug/* to TenantResolver.
TenantResolver reads the slug and looks it up in src/router/tenants/index.js.

## 2. Adding a New Tenant (Strict 3-Step Process)

When scaffolding a new tenant (e.g., vila):

1. **Create Directory:** `src/pages/[slug]/` with canvas/, sections/, ui/, store/, spatial/, normal/, admin/
2. **Create Routes File:** `src/router/tenants/[slug].routes.jsx`
3. **Register:** Add to `tenantRegistry` in `src/router/tenants/index.js`:
   ```js
   vila: {
     routes: lazy(() => import('./vila.routes')),
     defaultRedirect: 'home',  // canonical: demo.salmansaas.com/vila/home
     theme: 'green-dark',
   }
   ```

The canonical URL is automatically `demo.salmansaas.com/{slug}/{defaultRedirect}`.
No further configuration needed — DynamicTenantResolver handles the /demo/{slug} redirect.

## 3. Imports and Performance

All tenant routes must be dynamically imported using React.lazy.
Standardize the fallback component inside a Suspense wrapper when lazy loading.
