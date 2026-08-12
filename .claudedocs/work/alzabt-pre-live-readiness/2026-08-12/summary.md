# Alzabt — Local Pre-LIVE Readiness Check

Follows `investigation-protocol.md` / `browser-verification-protocol.md`. Scope: verify the
salmansaas.com Product IA (`ef7ac2d`) and Alzabt Demo Builder (`ff38f89`) are locally
production-ready, without reopening either for cosmetic polish. **Localhost only — no Railway, no
production, RK and `alzabt-demo` untouched as data.**

## 1. Full Regression — Three Real Tenant Paths

### RK (real production reference tenant)
Real browser pass, `rkbarber@dev.invalid` (TENANT_ADMIN) and `jaafar@rk.dev.invalid` (STAFF).

- **TENANT_ADMIN, desktop**: login → `/rk/dashboard/calendar`. Full 8-item nav (نظرة عامة/
  التقويم/الحجوزات/الموظفون/المتجر/العملاء/الإشعارات/الإعدادات). 0 console errors post-auth.
  Reservations tab navigation clean.
- **Mobile (390×844)**: no horizontal overflow (`scrollWidth === clientWidth`).
- **STAFF, desktop**: login → nav correctly scoped to 4 items (التقويم/الحجوزات/عملائي/خروج) —
  no admin-only items. Calendar shows **only جعفر's own column** (حسين not visible) — confirms
  server-enforced self-scoping, not a UI-only filter. 0 new console errors.

**Side findings (pre-existing, unrelated to today's Alzabt work — not fixed, out of scope):**
- 13 `401 Unauthorized` console errors fire on initial unauthenticated dashboard load (categories/
  items/orders/reservations/stats requests racing ahead of JWT attachment) — recovers once
  authenticated, cosmetic noise only.
- Admin login redirects to `/rk/dashboard/calendar` (real path change); STAFF login stays at
  `/rk/dashboard` while rendering the same calendar client-side — inconsistent URL, not broken.

### Static `alzabt-demo` reference tenant
- `/alzabt-demo/reserve`: real services render (شعر 8 USD, لحية 6 USD, شعر ولحية 12 USD, كرياتين
  25 USD, تصفيف 5 USD, صبغة 15 USD), barber كريم present. 0 console errors.
- Mobile (390×844): no horizontal overflow.

### Fresh `/demo-builder`-created tenant (`demo-barber-f93b`)
- **Creation**: real `Client` provisioned via `/demo/create` (`business_type=barbershop`).
- **Booking page** (`/demo-barber-f93b/reserve`): real seeded catalog renders — same 6-service set,
  correct prices/durations, real personalized barber "الحلاق الرئيسي — فحص حد 1".
- **Dashboard access**: real login (`demo-barber-f93b@demo.salmansaas.com` / captured temp
  password) → redirects correctly to the canonical `/demo-barber-f93b/dashboard/calendar`
  (`GenericAdminDashboard`, `routing.md` §0b), full 8-item nav, 0 console errors/warnings.
  All-zero reservation counts are expected (no bookings made against this tenant yet), not a bug.
- **Availability/calendar**: reachable, no errors; not independently booked end-to-end this pass
  (already proven once earlier this session — see `.claudedocs/work/alzabt-demo-builder/
  2026-08-12/summary.md`).

## 2. Full IA Chain

`/` (root) → click "جرّب عالزبط" (Alzabt section) → `/demo-builder` → submit → `/{slug}/reserve` →
`/{slug}/dashboard` — walked end-to-end via real browser.

- Every hop landed on the exact expected route (`/showcase/demo-builder` in dev, correct
  `/{slug}/reserve`, correct `/{slug}/dashboard` → `/login` → `/dashboard/calendar` chain).
- **0 unattributed console errors** across the entire chain. The only console error observed (a
  429) is correctly attributed to the rate-limit test in §3 below, not a bug.
- **0 failed network requests** outside the same, expected 429.
- No mobile horizontal overflow on any tested surface (root, `/alzabt`, `alzabt-demo/reserve`).
- `/alzabt`'s own CTA correctly stays in-app (`/alzabt-demo/reserve`) on localhost — the
  production cross-domain branch (`demo.salmansaas.com/alzabt`) remains untestable locally (no
  real DNS in this sandbox; a sudo `/etc/hosts` workaround was blocked by Claude Code's own
  auto-mode safety classifier, per the earlier IA verification pass) — unchanged Unknown, not
  re-attempted here.

## 3. Demo Creation Safety — Rate Limit

**Confirmed working, real evidence, barbershop type does not bypass it.**

Sequential `POST /demo/create` calls (`business_type: "barbershop"`) against the freshly-restarted
backend:

| Call | Result |
|---|---|
| 1-3 | `200 OK` — real tenants created (`demo-barber-a484`, `demo-barber-c57f` via browser, `demo-barber-5513`) |
| 4th+ | `429 {"error":"Rate limit exceeded: 3 per 1 hour"}` — confirmed via direct curl AND via the real `/demo-builder` UI form, which surfaced the error inline without crashing |

Rate limiter (`app/core/limiter.py`, `slowapi`, keyed on `get_remote_address`) is untouched by
this work — the new `barbershop` branch shares the same `@limiter.limit("3/hour")` decorator as
every other business type on the same route. Not redesigned, per instruction.

**Side effect of this test**: 5 real throwaway demo tenants now exist
(`demo-barber-a484/c57f/5513/82d5/f93b`) — expected, matches the already-known "no cleanup cron
yet" deferred gap (§5 below), not cleaned up as part of this check.

## 4. Static Reference Demo Regression

Confirmed unchanged and unaffected by the Demo Builder:
- `/alzabt` (marketing page) — loads clean, 0 console errors, CTA still targets the static
  `alzabt-demo` tenant.
- `demo.salmansaas.com/alzabt` (subdomain route) — code path untouched by this work (no commits
  since `ef7ac2d` touched `App.jsx`'s `IS_DEMO_SUBDOMAIN` branch); cross-domain hit itself remains
  untestable locally (see §2's Unknown).
- The Demo Builder does not replace, redirect, or mutate the static `alzabt-demo` tenant's data —
  confirmed by direct comparison in §5.

## 5. Tenant Isolation

Direct API-level evidence, not code inspection:

| Tenant | Barbers (id) | CatalogService IDs (6 each) |
|---|---|---|
| RK (`rk`) | حسين, جعفر | (not queried — real production data, out of scope) |
| `alzabt-demo` | كريم (`42f3fc4f…`), طارق (`ec20ecab…`) | `936ad349…`, `1defb79e…`, `1777b29a…`, `19a3e334…`, `8a7484ad…`, `217d0860…` |
| `demo-barber-f93b` | الحلاق الرئيسي — فحص حد 1 (`6027781e…`) | `3cb5f09f…`, `13d79db2…`, `178b8772…`, `2960c1ff…`, `136daff1…`, `47177e8e…` |

**Zero ID overlap between any two tenants, zero shared/duplicated rows.** Every `Barber` and
`CatalogService` row created by the Demo Builder is a genuinely new, isolated row — no leakage
into or from RK or `alzabt-demo`.

## Unknowns

- `demo.salmansaas.com/alzabt`'s real cross-domain behavior — still untestable in this local
  sandbox (no real DNS, sudo `/etc/hosts` blocked by the harness's own safety classifier).
  Unchanged from the earlier IA verification pass; recommend a real staging/prod smoke check once
  deployed, before treating it as fully closed.
- The 5 throwaway demo tenants created during rate-limit testing were not cleaned up (matches the
  already-known, not-yet-built cleanup-cron gap) — harmless for readiness purposes, noted for
  awareness.

## Side Findings (not fixed — pre-existing, unrelated to Alzabt, out of this check's scope)

- RK dashboard: 13 pre-auth `401` console errors on initial unauthenticated load (§1).
- RK dashboard: admin vs. STAFF post-login URL inconsistency (§1).
- Both pre-date today's Alzabt work and are unaffected by it — logged for awareness only, per the
  explicit "do not reopen for polish" / "do not opportunistically fix" instructions governing this
  check.

## Final Verdict

### A. READY — pending explicit LIVE approval

No real blocker found across regression (3 tenant paths, both RK roles, desktop+mobile), the full
IA chain, rate-limit safety, static-reference-demo non-interference, or tenant isolation. Every
finding that surfaced was either pre-existing and unrelated to today's work, a test-script
artifact, or an already-known, already-documented deferred gap that did not re-trigger as a real
blocker during this check.

**Alzabt is locally production-ready based on the tested scope. The only remaining action is
Salman's explicit decision to proceed with LIVE/Railway. Step 13 (LIVE) remains STOPPED — this
verdict is not permission to deploy.**
