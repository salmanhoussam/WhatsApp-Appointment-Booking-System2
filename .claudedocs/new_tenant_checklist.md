# New Tenant Onboarding Checklist

Every time a new tenant subdomain is added (e.g., `demo.salmansaas.com`), you MUST
update ALL of the following locations. Missing any one will cause CORS errors or 404s.

---

## 1. Backend — CORS Whitelist
**File:** `app/core/config.py` → `CORS_ORIGINS` property

Add the new subdomain to the hardcoded production origins list:
```python
"https://demo.salmansaas.com",   # ← ADD THIS
```

Why: FastAPI CORSMiddleware rejects preflight OPTIONS requests from unlisted origins
with HTTP 400. The Railway `FRONTEND_URL` env var is additive but not sufficient alone.

---

## 2. Frontend — Tenant Registry
**File:** `src/router/tenants/index.js`

Add lazy import entry:
```js
demo: {
  routes: lazy(() => import('./demo.routes')),
  defaultRedirect: 'showcase',
  theme: 'default',
},
```

Why: `TenantResolver` looks up the slug here. Missing entry → redirect to `/404`.

---

## 3. Frontend — Route File
**File:** `src/router/tenants/demo.routes.jsx` (NEW)

Copy `smar.routes.jsx` and adapt page imports for the new tenant.

---

## 4. Backend — Seed / DB Row
Run `python seed.py` (or a tenant-specific seed) to insert the `Client` row.
Ensure these fields are NOT null:
- `primary_color` (default: `#d4a853`)
- `whatsapp_number`
- `instagram_url`
- `currency` (default: `USD`)
- `password_hash` (must be bcrypt — never plain text)

See: `scripts/fix_passwords.py` and `scripts/backfill_smar.py` for reference.

---

## 5. Railway — Environment Variables (optional)
If `FRONTEND_URL` is set on Railway, append the new subdomain:
```
FRONTEND_URL=https://smar.salmansaas.com,https://demo.salmansaas.com
```
This is optional because the hardcoded list in `config.py` covers it,
but good practice to keep Railway in sync.

---

## URL Structure (No Duplicate Slug)

### Production (subdomain routing)
- ✅ `smar.salmansaas.com/showcase`
- ✅ `smar.salmansaas.com/listings`
- ❌ `smar.salmansaas.com/smar/showcase`  ← legacy URLs auto-redirect to clean form

### Localhost (path routing)
- ✅ `localhost:5173/smar/showcase`
- ✅ `localhost:5173/smar/listings`

### How it works
- `App.jsx` detects subdomain mode at module scope (`IS_SUBDOMAIN_MODE`)
- Subdomain: uses `<Route path="/*">` so pathnameBase = `/`
- Localhost: uses `<Route path="/:slug/*">` so pathnameBase = `/${slug}`
- All `navigate()` calls use `useTenantBase()` hook:
  - Subdomain: returns `""` → `navigate('/showcase')`
  - Localhost: returns `"/smar"` → `navigate('/smar/showcase')`
- `TenantResolver` has a legacy redirect: if path starts with `/${subdomain}/`,
  strips the prefix and redirects to the clean URL.
