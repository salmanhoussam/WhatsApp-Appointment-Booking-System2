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

**Resolved 2026-08-07, Salman's explicit decision — the Admin URL Strategy, current vs. future:**
on a real tenant subdomain (`{slug}.salmansaas.com`), no route currently serves
`GenericAdminDashboard` at all — every subdomain-mode admin route goes to the legacy
`SmarAdminDashboard`. Rather than treat this as a gap to close now, it's a deliberate, deferred
stage:

| Stage | Admin URL | Status |
|---|---|---|
| **Development** | `localhost/{slug}/dashboard` (or LAN IP, same pattern) | ✅ Live now |
| **Free-trial tenants** | `https://demo.salmansaas.com/{slug}/dashboard` | ✅ Live — canonical for demo/trial tenants |
| **Subscribed/paid tenants** | `https://alzabt.salmansaas.com/{slug}/dashboard` | ✅ Live, added 2026-08-28 (Tenant Lifecycle + Dual Subdomain rollout) — realizes this section's own "Future Strategy" below, but as a **shared path-based domain**, not per-tenant subdomains. `smar` was the first tenant moved off its legacy `smar.salmansaas.com` subdomain onto this pattern (DNS retired same day). |
| **Future (still not built)** | `https://{slug}.salmansaas.com/dashboard` (real per-tenant subdomain) | Still deferred — 2026-08-28's rollout answered "how do we split paid from trial traffic" with a second shared domain, not with per-tenant subdomains. This row stays open until there's a real reason to revisit it. |

**Binding rule, updated 2026-08-28:** admin-facing links now correctly target either
`demo.salmansaas.com/{slug}/dashboard` (trial) or `alzabt.salmansaas.com/{slug}/dashboard`
(subscribed) depending on tenant type — never a tenant subdomain, still. When true per-tenant
subdomains are eventually built, the change still happens only in the routing layer, per this
file's original reasoning — now proven twice (this rollout was exactly that kind of routing-layer-
only change, no call sites hunted down individually).

**Hostname/environment detection duplication — grew, not shrank, confirmed 2026-08-28.** The
2026-08-XX finding below (three copies) is now **four**, per the Tenant Lifecycle audit
(`.claudedocs/work/railway-production-readiness/2026-08-28/tenant-lifecycle-audit.md` §A):
`App.jsx`'s `IS_SUBDOMAIN_MODE`/`IS_DEMO_SUBDOMAIN`/`IS_ALZABT_SUBDOMAIN`, `TenantResolver.jsx`'s
`isDemoSubdomain`/`isAlzabtSubdomain`, `useTenantSlug.js`'s private `_isSubdomainMode()` (which had
**zero** demo/alzabt awareness at all until 2026-08-28, despite being used by 24+ files — the
highest-blast-radius instance found so far), and `tenant.config.js`'s own tier-based resolution. All
four were updated together 2026-08-28 to add `alzabt.` consistently, but the underlying duplication
itself was not resolved — a genuine candidate for the Abstraction Rule (`rules/team-roles.md`) once
a third real domain is ever added, not before.

*(Original three-way finding, kept for history):* `App.jsx`'s `_IS_LOCAL_HOST`/`IS_SUBDOMAIN_MODE`
constants, `useTenantSlug.js`'s private `_isSubdomainMode()` (explicitly written to mirror `App.jsx`,
per that file's own comment), and `RegistrationPage.jsx`'s own inline `isProd` check — the third one,
independently written, did **not** treat `192.168.*` LAN IPs as local (the other two do), meaning a
tenant registered from a LAN dev/test setup got redirected to a real production domain that wasn't
running the dev build. Fixed as part of Item 1 (`RegistrationPage.jsx` now uses the same
local-detection check the other two files already share).

Any future admin-facing link/redirect must point at `/{slug}/dashboard` (dev),
`demo.salmansaas.com/{slug}/dashboard` (trial), or `alzabt.salmansaas.com/{slug}/dashboard`
(subscribed) — never a tenant subdomain — and any new hostname/environment check should reuse the
same local-detection logic `useTenantSlug.js` already centralizes, rather than writing a fifth
independent copy.

## 0c. Canonical Registration Flow (resolved 2026-08-07)

Item 1's own fix initially targeted the wrong file — a real gap in the Item 0 review that hadn't
verified which component `/register` actually renders before proposing a fix target. Corrected by
checking real inbound traffic, not assumptions:

| Route | Component | Real inbound links | Last real commit |
|---|---|---|---|
| `/register` | `TenantRegisterPage.jsx` | **Yes** — `DemoLandingPage.jsx` (3 CTAs), `Login.jsx`'s signup link, `SSOLoginPage.jsx`'s own register toggle, `showcase/config.js`'s `REGISTER_URL` constant | 2026-07-31, a real bug fix |
| `/showcase/register` | `RegistrationPage.jsx` | **None found** — no `href`, no `navigate()`, no CTA anywhere links here; only reachable via direct URL or `ShowcaseRoutes`'s own route table | 2026-06-29 (initial rebuild) — untouched since, while its sibling kept receiving real fixes |

**Resolved: `/register` → `TenantRegisterPage.jsx` is the one canonical registration flow.**
`/showcase/register` → `RegistrationPage.jsx` is **Legacy** — a real Repository Hygiene "Forgotten"
case (`repository-hygiene.md`), not actively linked from anywhere, left as-is until an explicit
decision to delete it. Its own redirect fix (Item 1's first, mistaken pass) is harmless and stays —
correct code, just not the code that matters — but no further work is scheduled on this file.

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
