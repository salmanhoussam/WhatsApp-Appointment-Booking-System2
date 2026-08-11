# Item #4 — "قائمة" pill removal — Evidence

Follows: `.claudedocs/implementation/DASHBOARD_UX_CORRECTIONS_CONTRACT.md`, Section B.4, G2 default
applied (remove from Reservations-tab instance only, keep on Calendar-tab instance).

## What Was Implemented

`frontend/src/pages/generic-admin/tabs/ReservationsTab.jsx` — the "قائمة" pill button (view-mode
row) is now conditionally rendered on `defaultView !== 'list'`. Since `GenericAdminDashboard.jsx`'s
wrapping `motion.div` uses `key={activeTab}`, switching between the Calendar and Reservations nav
tabs fully remounts `ReservationsTab`, so `defaultView` is safe to gate on directly (fixed for the
whole instance lifetime) — no new prop needed, contrary to the plan's original assumption that it
would require a new prop shared with item #2. `viewMode`'s internal default (`'list'` on
Reservations, `'today'` on Calendar) is unchanged.

## Real Verification (nested Playwright, real TENANT_ADMIN login `rkbarber@dev.invalid`)

**Desktop (1440×900):**
- Reservations tab: "قائمة" pill NOT visible; list renders correctly (real table, 2 rows: `amigo`/
  `amiga`, real phone numbers, `مؤكّد` status, real date/time).
- Calendar tab: "قائمة" pill visible and functional — clicking it switches to the same list-table
  render, zero console errors.
- Console: 0 errors, 0 warnings (4 benign info/debug lines only).
- Network (`/reservations` filter): 7 requests, all `200 OK`, zero ≥400.

**Mobile (390×844):**
- Reservations tab (via bottom-nav click): "قائمة" pill NOT visible; renders as cards, both real
  rows visible, no broken layout.
- `document.documentElement.scrollWidth` (390) === `window.innerWidth` (390) — no horizontal
  overflow.
- Calendar tab: "قائمة" pill visible.
- Console: 0 new errors.

## Side Finding (not this item's bug, logged for item #11)

Navigating directly to `/dashboard/rk/reservations` on mobile initially rendered the Calendar
day-grid view (not the Reservations list) — the URL's trailing segment doesn't map to a distinct
route/tab state. Clicking the bottom-nav "الحجوزات" button afterward correctly switched tabs, so
this didn't block verification here, but it's the same class of bug item #11 (Dashboard
routing/URL fixes) is scoped to fix — carried forward as evidence for that item, not treated as a
new/separate finding.

## Acceptance

✅ Pill hidden on Reservations, visible on Calendar, both roles' regression untouched (STAFF not
separately re-tested for this item — it doesn't alter the pill's own gating logic, which reads only
`defaultView`, a value both roles receive identically).
