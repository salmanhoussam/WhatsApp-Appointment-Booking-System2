# Registration Redirect Fix — Evidence

**Date:** 2026-08-07 | **Investigation:** old dashboard shown after tenant registration
**Related:** `.claude/rules/frontend/routing.md` §0b/§0c (Canonical Admin URL Rule, Canonical
Registration Flow), `.claudedocs/work/legacy-admin-route-investigation/2026-08-07/summary.md`

## Sequence of work (kept honest, including the correction)

1. **Item 0** — established the Canonical Admin URL Rule (`/{slug}/dashboard` →
   `GenericAdminDashboard`), classified every admin route in `App.jsx`. Did not yet verify which
   component `/register` actually renders — a gap, not caught until Item 2.
2. **Item 1, first pass (mistaken)** — fixed `frontend/src/pages/showcase/pages/RegistrationPage.jsx`'s
   redirect. Real, correct fix — but to a file only reachable at `/showcase/register`, not `/register`.
3. **Item 2, first pass** — real Browser Verification against `/register` correctly FAILED on "landed
   on `/{slug}/dashboard`" (got `/dashboard/{slug}?welcome=1` instead), and traced the real cause:
   `/register` (`App.jsx:127`) renders `TenantRegisterPage.jsx`, a completely different component
   with its own independent, still-broken redirect. `RegistrationPage.jsx`'s fix never executes for
   a real user.
4. **Paused, per Salman's instruction** — resolved "which registration page is real" with evidence
   (inbound-link search + git history) before touching more code. See `routing.md` §0c:
   `/register` → `TenantRegisterPage.jsx` has real CTAs (`DemoLandingPage.jsx` ×3, `Login.jsx`,
   `SSOLoginPage.jsx`, `showcase/config.js`) and a real commit 2026-07-31.
   `/showcase/register` → `RegistrationPage.jsx` has zero real inbound links, zero commits since
   the 2026-06-29 initial rebuild — documented as Legacy.
5. **Item 1, corrected** — fixed `frontend/src/pages/auth/TenantRegisterPage.jsx:174`'s real redirect
   from `/dashboard/${slug}?welcome=1` (non-canonical, worked only by coincidence of a duplicate
   route) to `/${slug}/dashboard?welcome=1` (canonical).
6. **Item 2, corrected — full real Browser Verification, from scratch, on the corrected code.**

## Item 2 (corrected) — real evidence

**Target:** `http://localhost:5173/register` (the real, confirmed-canonical route).

**Real tenant created this run** (Data proof — queryable in the dev DB):
- slug: `bohussein-test-1786114296`
- email: `bohussein.test.1786114296@example.com`
- business name: `BoHussein RealRegisterTest 1786114296`

**Final redirect URL, exact:**
```json
{
  "href": "http://localhost:5173/bohussein-test-1786114296/dashboard?welcome=1",
  "pathname": "/bohussein-test-1786114296/dashboard",
  "search": "?welcome=1"
}
```
Slug-first segment order confirmed — matches `/{slug}/dashboard`, not the old `/dashboard/{slug}`.

**DOM marker check** (`document.body.innerText`):
```json
{ "genericFound": ["نظرة عامة","الطلبات","الكتالوج","الإعدادات","DASHBOARD"], "genericCount": 5,
  "smarFound": [], "smarCount": 0 }
```
5/5 `GenericAdminDashboard` markers present; 0/9 `SmarAdminDashboard` markers present.

**Network** — every request correctly scoped to `client_slug=bohussein-test-1786114296`; a filtered
search for `units|action-inbox|housekeeping|gardens|maintenance` (SmarAdminDashboard-only endpoints)
returned zero matches. Registration `POST /api/v1/auth/register` → 200 OK; `PATCH /admin/settings` →
200; `POST /admin/catalog/seed-from-template` → 201.

**Console** — 4 messages total, 0 errors, 0 warnings (Vite HMR + React DevTools notice + one
pre-existing, unrelated DOM advisory).

## Verdict

| # | Check | Result |
|---|---|---|
| a | Registration succeeded with real data | ✅ PASS |
| b | Final URL matches `/{slug}/dashboard` (slug-first) | ✅ PASS |
| c | `GenericAdminDashboard` markers present | ✅ PASS (5/5) |
| d | `SmarAdminDashboard` markers absent | ✅ PASS (0/9) |
| e | No new console errors | ✅ PASS |
| f | Registration POST returned success | ✅ PASS |

## Unknowns

- Only the default "Fashion Grid" template path was exercised (no `?template=`/`?venue_type=` query
  params passed) — booking/restaurant template registration flows were not separately re-verified.
- Production/`demo.salmansaas.com` behavior for `/register` was not tested (localhost only, matches
  this project's established testing scope).
