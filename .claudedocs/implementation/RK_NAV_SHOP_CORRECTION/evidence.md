# RK Barber — Navigation & Shop Integration Correction — Evidence

Follows: `investigation-protocol.md`, `service-execution-constitution.md`. Trigger: Salman's
explicit 10-section spec, 2026-09-01, delivered after live-testing RK on a real phone over LAN.

## Confirmed Findings

### 1. Root cause of "Listings"/"Services" appearing in RK's nav

Real DB read (`client_services` table, RK's real `clientId`
`7ef5c8c9-3d47-4aa9-b5e0-43b746ee2657`) — **before** this fix:

```
catalog            active=True
booking            active=True
whatsapp_ordering  active=True
reservations       active=True
store              active=True
```

`booking` and `catalog` are `rules/backend/service-system.md`'s generic `DEFAULT_SERVICES` seed
(`["booking", "gallery", "whatsapp_ordering"]`) plus a generic catalog activation — never
deactivated once RK's real barber capabilities (`reservations`, `store`) were added on top.
`getNavItems()` (`frontend/src/config/service-catalog.js`) is purely a function of
`active_services` — it never needed a code change; the DATA was wrong, not the nav logic.

- `catalog` → nav entry "الخدمات" (labelEn "Services"), route `/rk/catalog`
- `booking` → nav entry "الوحدات" (labelEn "Listings"/"Units"), route `/rk/listings` — the
  real-estate module, never applicable to a barbershop

**Fix (data-only, zero shared code touched):** `ClientService.isActive = False` for `catalog` and
`booking`, scoped to RK's `clientId` only. Confirmed live — RK's `active_services` is now
`['whatsapp_ordering', 'reservations', 'store']`; `getNavItems()` called directly with that array
returns exactly:
```
reservations -> احجز موعد (/rk/reserve) priority=8
store        -> المتجر   (/rk/store)   priority=10
```
Home is not a nav item — the brand/logo click (`TenantHeader.jsx`'s existing `goHome`), unchanged.

**Blast radius check (before deactivating):** queried every tenant's active `client_services` —
RK is the ONLY tenant with `reservations` AND `store` both active. No other tenant has `catalog`
or `booking` deactivated by this change (RK-scoped `where` clause on the update).

### 2. `reservations`/`store` nav order

`getNavItems()` sorts by `priority` ascending. `store` was `10`, `reservations` was `15` — Shop
would have rendered before Book. Changed `reservations.priority` to `8` in
`frontend/src/config/service-catalog.js` (the shared file). Verified only RK currently has both
keys active simultaneously (real DB scan across all clients) — zero effect on any other tenant.
`booking`'s own priority (10, real-estate module) untouched.

### 3. Does removing `catalog` break anything RK actually needs?

- **`FeaturedItemsSection.jsx`** (RK's home page "خدماتنا" section) already has a P0.1 fallback
  branch (`reservations active && catalog NOT active` → use `/reservations/catalog-services`
  instead of the catalog-gated endpoint) — written 2026-08-15 for exactly this shape of tenant.
  Verified live, post-change: `GET /reservations/catalog-services?client_slug=rk` → 6 real
  services returned. RK's home page Services section is unaffected.
- **`ProductsSection.jsx`**/Shop (`CatalogPage.jsx` at `/rk/store`) call `/store/categories`,
  `/store/products` — a completely separate router (`app/api/v1/public/store.py`), gated by
  `require_service("store")`, never `"catalog"`. Verified live, post-change:
  `GET /store/categories?client_slug=rk` → 1 real category returned. Shop unaffected.
- **`/rk/catalog` itself** now correctly 403s (`require_service("catalog")` — RK genuinely has no
  active generic catalog module anymore). Expected and correct — the nav link to it is gone too.

### 4. Existing Shop route — reused, not reinvented

`frontend/src/router/tenants/_dynamic.routes.jsx:65`: `/{slug}/store` → `CatalogPage.jsx` (same
component also serves `/catalog`, `/menu` as aliases for other verticals). This IS the canonical
Shop page — no new route or component created. RK's real Store category ("منتجات العناية") already
renders there, verified live before any change (`/store/categories?client_slug=rk`, 1 category).

### 5. Shop visual language

`CatalogPage.jsx` had no ambient background at all (plain `#0a0a0f`). Added the same opt-in used
by `DynamicPage.jsx`/`ReservePage.jsx` (`Client.config.page_background === 'ambient_grid'` →
`<AmbientGridBackground accent={accent} />`), gated identically — absent for every other tenant
using this same shared page (footlab, caracas, olivello, sneakers-lb, sneakers-beirut,
beit-al-fakhar, store-pilot). RK's `Client.config.page_background` was already set to
`'ambient_grid'` earlier this session (Home/Reservation work) — Shop now picks up the exact same
flag, same shared component, same accent (`#2F4F4F`).

### 6. Shop discoverable from Home

`ProductsSection.jsx` (RK's home page Shop preview, already limited to `data.limit` items) had no
CTA to the full catalog. Added a "شاهد كل المنتجات ←" button below the grid, `onClick` →
`navigate(getServiceRoute('store', slug))` — reuses the same `service-catalog.js` route resolver
`getNavItems()` itself uses, not a hardcoded path. Renders only when real items are loaded
(`!loading && items.length > 0`) and the tenant genuinely has a Shop route.

### 7. WhatsApp button bypassing reservation — real, confirmed, and self-inflicted this session

RK's `cta` section (`s_cta`, text "احجز موعدك الآن أو تواصل معنا عبر واتساب") had its `link` field
set to a raw `wa.me/...` URL **earlier in this same session**, as part of an earlier, narrower fix
request — this IS the violation Salman is now flagging. `CtaSection.jsx`'s own `handleClick`
already branches correctly (`http` prefix → `window.open`; otherwise → `navigate()`), so no
component code change was needed — only the section's own `data`.

**Fix:** `cta.data.link` → `/rk/reserve` (relative, so `CtaSection` now calls `navigate()` into the
real reservation flow), `button_ar` → "احجز موعدك", `text_ar` → "احجز موعدك الآن" (removed the
"أو تواصل معنا عبر واتساب" phrase, since the button no longer does that).

**Contact intent already has its own, separate, correctly-labeled touchpoint** —
`frontend/src/components/Footer.jsx:116-129`, a "تواصل معنا" (Contact Us) block with a real
`wa.me/{whatsapp}` link, already present on every `DynamicPage.jsx`-rendered page including RK's.
Not duplicated — reused as-is, per the task's own "if a separate WhatsApp contact button already
exists, do not duplicate it" instruction.

`TenantHeader.jsx`'s "احجز الآن" button was already fixed to the same reservation-first rule
earlier this session (routes to `/rk/reserve` when `reservations` is active) — already compliant,
no further change needed there.

### 8. جعفر (inactive barber) appearing in the booking flow

Real DB read, RK's Barber rows:
```
Test Staff QA   isActive=False
جعفر            isActive=False
حسين            isActive=True
```
`app/repositories/barber_repo.py:list_barbers(client_id, active_only=True)` already filters
`isActive: True` at the DB query level — not a frontend-only hide. Live endpoint test,
post-investigation (no code changed for this item):
```
GET /api/v1/public/reservations/barbers?client_slug=rk
→ [{ "name": "حسين", ... }]   # only one barber, جعفر correctly excluded
```
**Conclusion: already correct.** جعفر is genuinely inactive, the backend already filters him out
correctly at the query level, and the live endpoint confirms it. No barber/reservation data was
touched — his historical record and any past reservations remain exactly as they were.
`useReservationBooking.js` has no client-side cache (`useState`+`useEffect`, fresh fetch every
mount) — nothing to invalidate on the frontend either. If جعفر was seen live at some earlier point
this session, it predates this investigation's snapshot; the system is confirmed correct as of
this report.

## Follow-up finding (same session, reported live by Salman after testing on his phone)

### Real regression: Shop showed "لا توجد عناصر" (no items) after deactivating `catalog`

**Confirmed root cause:** `CatalogPage.jsx` (the Shop page) does not use `ProductsSection.jsx`'s
own fetch functions at all — it uses a separate hook, `useCatalog.js`, whose ONLY category-listing
call was `fetchAllCategories(slug)` → `GET /{slug}/catalog/categories`, gated by
`require_service("catalog")` specifically. Deactivating `catalog` for RK (this task's own item 1
fix) made that call 403 for RK, `categories` fell back to `[]`, and the Shop rendered its real
empty state.

**Salman's own correction, confirmed correct:** this is not RK-specific. Any tenant whose real
capabilities are `reservations`+`store` without a generic `catalog` module — the standard shape
for a barber/service-vertical tenant that also sells products — hits the identical gap. Fixed
generally in `frontend/src/hooks/useCatalog.js`, not with a slug check: when `catalog` isn't
active, the hook now fetches each *specific* active module's own categories endpoint instead
(`fetchCategories('store', slug)` / `fetchCategories('restaurant', slug)` — the same functions
`ProductsSection.jsx` already uses), hand-tagging each returned category with its real
`module_key` (those module-specific endpoints don't return one, but `fetchItems()` downstream
needs it to route correctly). Every tenant that DOES have `catalog` active keeps the exact same
single-call `fetchAllCategories()` path, byte-identical to before.

Verified live: `GET /store/categories?client_slug=rk` → 1 real category; `GET
/store/products?client_slug=rk&category_id=...` → real products with real images/prices. `vite
build` clean after the fix.

## Files Changed

| File | Change | Why |
|---|---|---|
| `frontend/src/config/service-catalog.js` | `reservations.priority` 15→8 | Nav order: Book before Shop (only affects tenants with both active — currently RK only) |
| `frontend/src/components/dynamic-sections/ProductsSection.jsx` | Added "شاهد كل المنتجات" CTA | Shop discoverable from Home preview (item 4/5) |
| `frontend/src/pages/generic/normal/CatalogPage.jsx` | Added opt-in `AmbientGridBackground` | Shop visual language matches Home/Reservation (item 3) |
| DB: `ClientService` (RK only) | `catalog`, `booking` → `isActive=False` | Root-cause nav fix — data correction, zero shared code touched |
| DB: `Client.config.content.sections` (RK only, `cta` section) | `link`→`/rk/reserve`, `button_ar`/`text_ar` updated | Booking CTA must not bypass reservation via wa.me (item 6) |
| `frontend/src/hooks/useCatalog.js` | Category-fetch branches per-module when `catalog` isn't active | Fixes the real Shop regression this task's own item-1 fix caused — general fix, not RK-only |

No backend route, schema, tenant-resolution, or authentication code was touched. No other
tenant's `client_services` or section content was modified.

## Verification (real, live — this session's dev server)

- `getNavItems(['whatsapp_ordering','reservations','store'], 'rk')` called directly → exactly
  `[reservations, store]`, in that order. "Listings"/"Services" confirmed gone.
- `vite build` clean (no errors) after every change.
- `GET /rk/config` → `active_services` confirmed `['whatsapp_ordering','reservations','store']`.
- `GET /reservations/catalog-services?client_slug=rk` → 6 real services (home page Services
  section unaffected by removing `catalog`).
- `GET /store/categories?client_slug=rk` → 1 real category (Shop unaffected).
- `GET /rk/catalog/categories?client_slug=rk` → `403` (expected/correct now).
- `GET /reservations/barbers?client_slug=rk` → only حسين, جعفر correctly absent.
- `GET /rk/config` → `cta.data.link` confirmed `/rk/reserve` (no more `wa.me` bypass).
- Full-repo `git status --short` re-checked before and after — only the 3 files in the table above
  plus this evidence file are new/modified by this specific task; no unrelated file
  (`ProductShowcaseHome.jsx`, `.claude/skills/*`, `capability-operations-model.md`,
  `tenant-lifecycle-audit.md`, etc.) was touched by this task.

## Unknowns

- No real Playwright/browser session available this pass (MCP server was down earlier this
  session) — verification above is API/data-level + a direct `getNavItems()` call, not a rendered
  screenshot. Salman is testing live on his own phone over LAN as this evidence is written;
  visual/interaction confirmation (mobile menu, actual button taps, console errors) is his to
  confirm, not yet independently screenshotted here.
- Desktop-viewport rendering of the same changes not independently re-screenshotted this pass.

## Not committed

Per instruction — no `git add`/`git commit` performed. Working tree still has the pre-existing
unrelated changes noted at task start (`capability-operations-model.md`,
`tenant-lifecycle-audit.md`, `ProductShowcaseHome.jsx`, `.claude/skills/*`, `.claude/docs/*`, etc.)
untouched by this task, plus this session's earlier RK/Home/Auth work from before this task began.
