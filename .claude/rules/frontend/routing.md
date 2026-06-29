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
