# Dashboard Production Readiness Audit — P1 Fix: Overview catalog-fetch gating (2026-08-22)

Fixes the one new P1 finding from `.claudedocs/work/dashboard-production-readiness-audit/2026-08-22/summary.md`:
`OverviewTab.jsx` fired `GET /admin/catalog/items` and `GET /admin/catalog/categories`
unconditionally on every load, with no capability check — unlike every other fetch in the same
file. mr-h (no `catalog`/`store` service) got a real, confirmed-live 403 on the items call, every
single load. Scope, per Salman's explicit instruction: this one gate only, no other change.

## Change

One file, one `useEffect`, no backend/schema/DB change:

- **`OverviewTab.jsx`** — added `hasCatalogData = hasCapability(activeServices, 'catalog') ||
  hasCapability(activeServices, 'store')` (reusing the already-imported `hasCapability` helper,
  same shape `orderEndpoint` two lines above already uses). The catalog-fetch `useEffect` now
  skips the network call entirely when `hasCatalogData` is false, setting `catalogCats`/
  `catalogItems` to empty arrays directly (same end state the failed request used to produce via
  its `.catch(() => {})`, just without the doomed request). `[hasCatalogData]` replaces the old `[]`
  dependency array.

## Real browser verification — both tenants, real dev servers, real DB

Same locally-minted admin JWT technique already established this session.

- **mr-h (no catalog/store)**: full network list read (no filter) on two separate fresh loads of
  Overview — **zero** requests to `/admin/catalog/items` or `/admin/catalog/categories`, on either
  load. Console: 0 errors, 0 warnings both times (only the standard Vite HMR/React DevTools debug
  lines) — the previously-confirmed 403 is genuinely gone, not just silenced. Products/Categories
  stat cards still render cleanly (`٠`, the same value the old failed-and-caught request used to
  produce — this fix removes the wasted/failing request, not the display value, per the
  instruction's own exact scope).
- **rk (has catalog + store)**: both `GET /admin/catalog/categories?client_slug=rk` and
  `GET /admin/catalog/items?client_slug=rk` still fire (confirmed multiple times, react-query's own
  refetch pattern — unchanged from before this fix) and return 200 OK. Real data renders: Products
  `١٠` (10), Categories `٢` (2), plus a populated real activity feed. Console: 0 errors.
- Confirmed both dashboards land on the Calendar tab by default (a manual click to "نظرة عامة" was
  needed) — investigated during the audit itself and already dismissed there as pre-existing,
  persisted local browser state from repeated testing this session, not a real routing regression
  and not something this fix touches.

## Acceptance — checked explicitly against the instruction's exact scope

- ✅ mr-h no longer requests `/admin/catalog/items` at all — confirmed, not just error-suppressed.
- ✅ rk's identical requests are completely unaffected — same URLs, same 200s, same real data.
- ✅ No other file touched, no other logic in `OverviewTab.jsx` changed (diff is exactly the one
  `useEffect` plus its new guard).
- ✅ 0 console errors, both tenants.

## Result

**P1: DONE.** This closes the Dashboard Production Readiness Audit's only P0/P1 finding. The 2 P2
items (transient pooler-flakiness 503, benign `ERR_ABORTED` on fast tab-switch) remain registered,
not actioned, per the audit's own recommendation.
