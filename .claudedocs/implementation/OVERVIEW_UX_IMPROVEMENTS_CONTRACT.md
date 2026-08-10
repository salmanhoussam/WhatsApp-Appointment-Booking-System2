# Overview — Evidence-Based UX Improvements (Implementation Contract)

Deliberately **not** named "Overview Redesign" — per Salman's explicit correction, the fresh
evidence pass (`.claudedocs/work/overview-redesign-contract/2026-08-10/evidence-pass.md`) showed 3
of the original 5 reasons Overview was rated 🔴 no longer hold up against today's real data. This
is a small, scoped 🟡 Improve contract for what's actually left — not a ground-up redesign.

## Scope

**Frontend/UI only**, unless implementation genuinely surfaces a backend decision — if that
happens, it stops and gets named as a separate blocker, not absorbed silently.

**Explicitly out of scope, not reopened**: API redesign, dashboard architecture, navigation-system
rewrite, data model changes, Store/Services separation. All separately closed or tracked elsewhere
this session.

## The 5 items, each resolved by investigation before any code

### 1 & 5. "من الكتالوج" (From Catalog) vs. "الأكثر مبيعاً" (Best Sellers) — resolved: remove From Catalog

Investigated both components directly:
- `TopItemsWidget` ("الأكثر مبيعاً") computes real top-sellers from actual `orders` data (quantity +
  revenue per item, sorted) — genuinely useful, keep as-is, not touched.
- `TopCatalogItems` ("من الكتالوج") is just `catalogItems.slice(0, 5)` — an arbitrary slice of the
  raw catalog, unrelated to sales, unrelated to orders, unrelated to activity. It duplicates data
  already fully browsable in Staff → Services and Store → Items, with no distinct purpose on this
  screen.

**Decision** (per Salman's own "clear meaning or remove" rule): remove `TopCatalogItems` and its
render call entirely. It doesn't complement either neighbor in its actual grid row (`RecentOrders`
+ `TopCatalogItems`, not `TopItemsWidget` as originally eyeballed from a flat text dump — corrected
here) — Recent Orders is order history, From Catalog is an unrelated catalog slice. No replacement
widget invented; the bottom panel becomes `RecentOrders` alone (full width when `hasOrders`,
nothing when not — matches existing `hasOrders`-gating already used elsewhere on this screen).

### 2. Nav position — resolved: move `overview` to the front of the `hasReservations` nav array

Investigated `buildNav()` (`GenericAdminDashboard.jsx:168`): the **other** branch
(`!hasReservations`, restaurant/store tenants) already puts `overview` **first**. The
`hasReservations` branch (what `rk` uses) is the one inconsistent outlier with it last. Moving it
to first makes both branches consistent with each other — not inventing a new convention, matching
one this codebase already has. One-line reorder in the existing array; no new logic, no routing
change (`activeTab`'s initial/URL-driven resolution is untouched — this only reorders the rendered
list).

### 3. Customer count stat — resolved: NOT added, explicitly not invented

Checked whether a real count is available from data already on this screen or any existing
endpoint: it is not. `admin/customers.py` was already confirmed dead code and deleted this session
(Orphaned Admin Router Cleanup); no `Customer` entity exists; `/reservations/stats` returns only
status aggregates, no distinct-customer count; `orders` (Store) is fetched in full but would only
ever reflect Store customers, not the tenant's real customer base (reservation/booking customers),
making it a misleading stat for a barber shop specifically. Per Salman's own explicit rule — add
only if available with a clear contract, never invent a new API just for a card — **this item is
not implemented**. Named here as a real, explicit non-decision: a future small aggregate endpoint
(e.g., distinct `customerPhone` across `Reservation`) would close this, but that's backend work,
out of this contract's frontend-only scope.

### 4. Mobile bottom-nav overlap — pending a real scroll-position test (running now, not assumed)

Per Salman's explicit instruction: fix only if confirmed via a real scroll/viewport test, no
speculative change. Test in progress; result and any resulting fix (or explicit "not confirmed, no
change made") will be appended to this contract's Verification section before implementation of
this specific item, not assumed either way here.

## Files Touched

- `frontend/src/pages/generic-admin/tabs/OverviewTab.jsx` — remove `TopCatalogItems` function,
  its render call, and the now-single-item bottom grid's `gridTemplateColumns` (simplify to always
  full-width for `RecentOrders`, since it's the only occupant left).
- `frontend/src/pages/generic-admin/GenericAdminDashboard.jsx` — reorder `overview` to the front of
  `buildNav()`'s `hasReservations` return array. No other line in this function changes.
- *(Item 4, conditional)* — a small CSS padding/z-index fix, file TBD by what the real scroll test
  finds, only if it confirms a real overlap.

## Acceptance Criteria

1. "من الكتالوج" no longer renders anywhere on Overview. `TopItemsWidget` ("الأكثر مبيعاً")
   continues to render exactly as before (untouched).
2. "نظرة عامة" is the first item in the sidebar (desktop) and bottom tab bar (mobile) for the
   `hasReservations` tenant type. Every other nav item's relative order is unchanged.
3. No customer-count stat card added. No new API call added to this screen.
4. Mobile overlap either confirmed-and-fixed or confirmed-not-reproducing — not left ambiguous.
5. Zero new console errors, zero new network errors ≥ 400, on either change.
6. `STAFF` role still has zero access to Overview (unchanged — `STAFF_NAV` doesn't include it;
   this contract doesn't touch that array).

## Verification Plan (real, before this is called done)

- **Desktop (1440×900), TENANT_ADMIN**: Overview loads first-ish in nav, all remaining widgets
  (6 stat cards, Revenue chart, Status donut, Activity Feed, Best Sellers, Recent Orders) render
  exactly as before minus From Catalog. Console/network clean.
- **Mobile (390×844), TENANT_ADMIN**: same, plus the real scroll-position check for item 4.
- **STAFF (Jaafar)**: confirm Overview still doesn't appear in his nav at all — a negative check,
  not a scoped-view check (this screen was never his to begin with).
- **Regression, explicitly required by Salman**: Calendar (Today + Week), Reservations List, Store
  (Categories/Items/Orders), Staff (Employees/Services) all still load and function normally —
  this contract touches only `OverviewTab.jsx` and one array in `GenericAdminDashboard.jsx`, but
  the nav-order change is exactly the kind of thing that's cheap to verify doesn't silently affect
  routing/tab-switching elsewhere.

## Status

Not yet implemented — this contract is presented for review before any code, per Salman's explicit
instruction. Item 4's real test result will be appended before implementation starts.
