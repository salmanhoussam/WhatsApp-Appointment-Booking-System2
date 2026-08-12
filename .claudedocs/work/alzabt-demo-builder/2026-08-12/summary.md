# Alzabt Demo Builder — Real Per-Visitor Tenant Provisioning

Follows `investigation-protocol.md` / `browser-verification-protocol.md`. Implements
`.claude/plans/we-moved-on-new-hazy-barto.md` ("Alzabt Demo Builder — Real Per-Visitor Tenant
Provisioning"), approved by Salman 2026-08-12 with 3 refinements (optional `name_en` with a
business-type-aware slug fallback, personalized barber name, confirmation that the trial-expiry
mechanism is already inherited). This is an explicit, knowing reversal of Section P's earlier
"static `alzabt-demo` tenant only, no auto-provisioning" call.

## What changed

**Backend:**
- `app/api/v1/public/demo.py` — `VALID_BUSINESS_TYPES` gains `"barbershop"`. `name_en` is now
  optional (was required, min 2 chars, for both fields); `name_ar` stays required.
- `app/services/demo_service.py`:
  - `_SERVICE_MAP["barbershop"]` / `_VENUE_TYPE_MAP["barbershop"]` added (isolated new keys,
    existing `restaurant`/`store`/`booking` branches untouched).
  - New `_BARBERSHOP_SEED_SERVICES` constant + `_seed_demo_barbershop(client_id, name_ar)` —
    composes 4 already-existing repository functions (`barber_repo.create_barber`,
    `admin_catalog_repo.create_category`, `catalog_service_repo.create_catalog_service`,
    `barber_service_repo.set_services_for_barber`) — zero new repository code needed.
  - Barber name personalized: `f"الحلاق الرئيسي — {name_ar}"`.
  - Slug fallback: when `name_en` is empty, uses `"Barber"` (barbershop-specific) instead of the
    generic `_slugify("")` → `"tenant"` default, so slugs read `demo-barber-{4hex}`.
  - `admin_url` bug fix: `/{slug}/admin` (legacy `SmarAdminDashboard`) → `/{slug}/dashboard`
    (canonical, `routing.md` §0b) — bundled in because the demo builder's success view surfaces
    this exact URL to real visitors.
- Trial lifecycle (`lifecycle_state="trial"`, `trial_ends_at` = now + 14 days) was **already**
  applied generically by `create_demo_tenant` for every business type before this change — the new
  `barbershop` branch inherits it automatically, no new code required.

**Frontend:**
- `frontend/src/pages/home/DemoBuilderPage.jsx` (new) — 2-field form (`name_ar` required,
  `name_en` optional), loading/error states, success view (slug badge, masked/revealable temp
  password, primary CTA → `/{slug}/reserve`, secondary link → `admin_url`). Modeled directly on
  `DemoLandingPage.jsx`'s proven pattern; same `/demo/create` endpoint, new `business_type` value.
- `frontend/src/router/showcase.routes.jsx` — new `demo-builder` route, same container
  `ProductShowcaseHome` already lives in.
- `frontend/src/pages/home/sections/AlzabtProductSection.jsx` — CTA changed from
  `navigate('/alzabt')` to `navigate('demo-builder')` (relative, resolves correctly under both the
  prod `/` mount and the dev `/showcase` mount).
- **Explicitly unchanged**: `AlzabtLandingPage.jsx` (`/alzabt`)'s own CTAs, `App.jsx`'s
  `IS_DEMO_SUBDOMAIN` → `/alzabt` route, `SmartOrderProductSection` (still inert) — all still
  point at/serve the static `alzabt-demo` reference tenant, per Salman's explicit "two coexisting
  paths" decision.

## Confirmed Findings (real evidence)

**Direct API test** (`POST /api/v1/public/demo/create`, `{"business_type":"barbershop","name_ar":"صالون تجريبي فحص"}`, `name_en` omitted entirely):
```json
{"success":true,"data":{"slug":"demo-barber-a484","admin_url":"https://demo.salmansaas.com/demo-barber-a484/dashboard","temp_password":"6LEddPAS","expires_at":"2026-08-26T14:35:02.327903+00:00"}}
```
- Slug fallback confirmed: `demo-barber-a484` (not `demo-tenant-...`).
- `admin_url` confirmed using `/dashboard`, not the legacy `/admin`.
- `expires_at` confirmed 14 days out.

**Direct read of the created tenant's public data:**
- `GET /reservations/barbers?client_slug=demo-barber-a484` → `[{"name":"الحلاق الرئيسي — صالون تجريبي فحص"}]` — personalization confirmed.
- `GET /reservations/catalog-services?client_slug=demo-barber-a484` → all 6 real services with
  correct `name_ar`/`name_en`/`price`/`duration_min` (شعر 8 USD/20min ... صبغة 15 USD/40min).

**Real browser pass (nested Playwright, second attempt — first hit a `browser_snapshot`
permission block, retried with it included):**
1. Root (`/showcase`) → clicked "جرّب عالزبط" (Alzabt section only, distinct from the inert Smart
   Order section) → landed on `/showcase/demo-builder`. Correct.
2. Form rendered: `h1`="ابني ديمو عالزبط تبعك", inputs=["صالون الأناقة", "Elegance Salon"]
   (placeholders). 0 console errors.
3. Filled Arabic name only, left English blank on purpose (testing the fallback for real, not
   just via curl) → submit → loading state → success view: `slugVisible: "demo-barber-c57f"`,
   `hasReserveCTA: true`. 0 console errors through submit.
4. Screenshot: `builder-success.png` — slug badge, masked password with eye-toggle, CTA.
5. Clicked "جرّب صفحة الحجز الآن" → landed on `/demo-barber-c57f/reserve` (correct `/{slug}/reserve`
   pattern) → real seeded services rendered with real prices (شعر 20 دقيقة · 8 USD, etc.).
6. Screenshot: `builder-reserve-page.png`. Final console check: 0 errors across the entire flow.

Screenshots (repo root, this run): `builder-success.png`, `builder-reserve-page.png`,
`builder-reserve-page-top.png`.

## Side Findings

- **Async render race on a freshly created tenant's reservation page** (pre-existing behavior,
  not introduced by this change): immediately after navigation, `ReservePage.jsx`'s initial
  services/availability fetch can still be in flight — a read taken right at that moment showed
  "لا توجد مواعيد متاحة في هذا اليوم" (no available times) and no services, before the real data
  loaded a few seconds later. No console error accompanied this (a normal async loading state, not
  a thrown exception) — it would not surface in a simple error-count check, only by re-verifying
  actual rendered content per `browser-verification-protocol.md`'s discipline. Worth a future UX
  pass (does the page show a skeleton/spinner during this window, or a bare "no appointments"
  flash?) — **not fixed here**, out of this feature's scope, affects every tenant's first load,
  not specific to demo-builder tenants.

## Unknowns

- No automated cleanup/expiry cron exists yet to purge these trial tenants once `trial_ends_at`
  passes (`app/api/v1/super/maintenance.py`'s only cleanup endpoint targets an unrelated dating
  table) — a real, pre-existing gap shared by every demo/trial tenant type (restaurant/store/
  booking), not introduced or worsened by this feature. Flagged per Salman's own question about
  cleanup; not built now — a real follow-up item whenever trial-tenant volume makes it worth
  building.
- Rate limiting (`3/hour` per IP, existing `@limiter.limit` decorator) and slug-collision retry
  logic were not independently stress-tested — inherited unchanged from the existing, already-used
  `/demo/create` endpoint, not re-verified here.

## Conclusion

Real per-visitor Alzabt/barbershop demo provisioning works end-to-end: root → builder → real
tenant creation (Client, Barber, CatalogCategory, 6 CatalogService rows, BarberService
assignments, `booking`+`reservations` client-services) → real booking page with real seeded data.
`/alzabt` and `demo.salmansaas.com/alzabt` remain unchanged, still serving the static `alzabt-demo`
reference tenant, confirmed by design (not re-tested this pass — no code in those paths changed).
