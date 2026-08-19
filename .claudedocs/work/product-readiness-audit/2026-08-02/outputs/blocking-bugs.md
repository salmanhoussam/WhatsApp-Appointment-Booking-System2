# Blocking Bugs — from today's Technical Audit passes

Pure bug tracker — no UX language here, that lives in `product-decisions.md`. Four real, confirmed
issues, none fixed yet.

## 1. `/smar/home` — live infinite redirect loop

- **Where**: canonical public URL for `smar` (`defaultRedirect: 'home'` in the tenant registry).
- **Evidence**: `window.location.href` captured with `/showcase` repeated 16,333 times; 163 React
  "Maximum update depth exceeded" console errors; `browser_take_screenshot` timed out (page
  unresponsive). Full detail: `.claudedocs/work/product-readiness-audit/2026-08-02/smar/summary.md`.
- **Real cause, traced**: `smar.routes.jsx` has no `path="home"` route — only `showcase`. Falls
  through to the catch-all, which does a **relative** `<Navigate to="showcase" replace />`, so each
  failed match appends another segment instead of resolving.
- **Status**: known, already deferred by Salman before this audit — confirmed live on his own screen
  during the session. Not fixed.

## 2. `footlab` cart — empty Payment Method dropdown

- **Where**: `/footlab/cart`, the checkout form.
- **Evidence**: `select.options.length === 0`, `select.innerHTML === ""` — verified via direct DOM
  read, not assumed from the screenshot. Full detail: `footlab/summary.md`.
- **Impact**: a real customer cannot select a payment method; whether this fully blocks the "تأكيد
  الطلب" submit was not traced into the code.
- **Status**: not fixed.

## 3. `caracas` — real orders never persist

- **Where**: `caracas/normal/MenuPage.jsx:33-38`, the actual customer checkout path.
- **Evidence**: code-level, not live browser (this one came from Capability Reference Extraction,
  not a live Playwright pass) — the function only builds a `wa.me` link and clears the cart, never
  calls `POST /restaurant/orders`. Full detail:
  `.claudedocs/work/capability-reference-extraction/2026-08-02/restaurant.md`.
- **Impact**: every real "order" through this path today is an illusion — nothing is written to the
  database; the Admin's own Orders/Stats tabs read from a path nothing writes to.
- **Status**: not fixed. Backend endpoint already exists and works — this is a wiring gap.

## 4. Cross-tenant stale `client_slug` request on admin login — ✅ FIXED 2026-08-02

- **Where**: admin dashboard, right after logging into a *different* tenant than the one tested
  immediately before it in the same browser session.
- **Evidence**: confirmed independently twice — `footlab`'s admin fired a stale
  `client_slug=hr` request right after login; `smar`'s admin fired a stale `client_slug=footlab`
  request right after login. Both blocked (401) or returned without visibly rendering. Full detail:
  `project_product_readiness_audit_footlab_smar` in memory.
- **Likely cause**: a race condition in tenant-slug resolution timing (not a hardcoded value — it
  tracked whichever tenant was tested immediately prior, both times), not traced to a specific
  file/line.
- **Status**: **Fixed as part of the Reservation Pilot's P0 Gate.** Real cause traced: `ProtectedRoute.jsx`
  never verified the stored JWT's tenant matched the route's own `:slug` param. Fixed by adding that
  comparison, clearing the stale token and redirecting to `/login` on mismatch, before any child
  component can mount and fire a request. Re-verified live: zero cross-tenant requests, zero delay —
  the redirect now happens before any API call fires. Full detail:
  `.claudedocs/work/implementation_plan_reservation_pilot.md`'s P0 Gate section.

## Not in scope here

Product/UX judgments (card layouts, calendar redesign, dashboard hierarchy) — those are
`product-decisions.md`. This file is bugs only.
