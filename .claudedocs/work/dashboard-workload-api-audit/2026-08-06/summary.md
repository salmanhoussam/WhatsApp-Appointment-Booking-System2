# Dashboard Workload / API Audit — Generic Admin Dashboard (`hr` tenant)

**Date:** 2026-08-06
**Type:** Investigation only — per `investigation-protocol.md`. No refactor, no code changed.
**Scope:** every real screen in `GenericAdminDashboard.jsx` — Overview, Calendar, Reservations,
Catalog/Services, Orders, Settings. Builds directly on the earlier same-day
`.claudedocs/work/api-boundary-review/2026-08-06/summary.md` (backend endpoint ownership) — this
pass is the frontend side: what each screen actually requests, when, how often, and whether it's
cached.
**Method:** full read of every tab component and every shared component that issues a request —
`GenericAdminDashboard.jsx`, `ReservationsTab.jsx`, `OverviewTab.jsx`, `CatalogTab.jsx`,
`OrdersTab.jsx`, `SettingsTab.jsx`, `ActivityFeed.jsx`, `reservationInteractions.jsx`,
`useTenantConfig.js` — not grep-only. `ReservationsTodayView.jsx`/`ReservationsWeekCalendar.jsx`
confirmed to issue zero requests of their own (pure render over props, per Phase 3.4's Step 0).

## Structural fact that explains most findings below

`GenericAdminDashboard.jsx`'s `renderTab()` (`:416-446`) is a plain `switch` — only the active tab's
component exists in the tree at all, wrapped in `<AnimatePresence mode="wait"><motion.div
key={activeTab}>` (`:698-714`). Changing `activeTab` changes that `key`, which **unmounts the
previous tab's component and mounts a fresh one** — this is a real unmount, not a hidden/kept-alive
component. Every tab's own `useEffect`-based fetch therefore re-runs from scratch on every single
navigation back into that tab, all session long. The one exception is `useTenantConfig()`
(`frontend/src/hooks/useTenantConfig.js`), which is backed by React Query (`queryKey: [slug,
'config']`, `staleTime: 10min`) — calling it from multiple components does not cost a second network
request, proving in this exact codebase that the remount cost is avoidable wherever React Query is
used. This is the same gap already named in `.claudedocs/evolution/frontend-data-layer.md`; this
audit supplies the concrete numbers behind it.

**"Calendar" and "Reservations" are the same screen.** Both nav items (`GenericAdminDashboard.jsx:429-432`)
render the exact same `ReservationsTab` component, differing only in the `defaultView` prop
(`'today'` vs `'list'`). Because they're different `activeTab` values, toggling between them is a
full remount — documented as its own duplicate-request finding in §3.

---

## 1. API Inventory

### Overview (`OverviewTab.jsx` + `ActivityFeed.jsx`, nested)

| Requests | Method | Endpoint | When | React Query? |
|---|---|---|---|---|
| Orders | GET | `/{restaurant\|store}/orders` | On mount (`loadOrders`, `:568-583`); also called again every 30s by `ActivityFeed`'s poll (`:126-130`, via `onRequestRefresh` prop) | No — `useState`+`useEffect` |
| Reservation stats | GET | `/reservations/stats` | On mount, gated by `hasReservations` (`:586-600`) | No |
| Catalog categories + items | GET | `/catalog/categories`, `/catalog/items` | On mount, `Promise.all` in parallel (`:603-617`) | No |
| Reservations (full list) | GET | `/reservations/` | On mount of `ActivityFeed`, gated by `hasReservations` (`ActivityFeed.jsx:113-123`) — **no filters, no `limit` param** | No |

### Calendar / Reservations (`ReservationsTab.jsx` — one component, two nav entries)

| Requests | Method | Endpoint | When | React Query? |
|---|---|---|---|---|
| Reservations | GET | `/reservations/?{params}` | On mount, and on every `statusFilter`/`dateFilter`/`showAllDates`/`viewMode`/`weekStart`/`todayViewDate` change (`load`, `:365-394`, driven by `useEffect(load)` at `:396`) | No — has its own out-of-order-response guard (`requestSeqRef`) instead |
| Barbers | GET | `/barbers/` | On mount only (`useBarbers()`, `reservationInteractions.jsx:61-83`) | No |
| Catalog items | GET | `/catalog/items` | On mount only (`useCatalogItems()`, `:85-98`) | No |
| Tenant config (working hours) | GET | `/{slug}/config` | On mount, but React-Query-cached — shares the cache `GenericAdminDashboard.jsx`'s own `useTenantConfig()` call already populated | **Yes** |
| Status change | PATCH | `/reservations/{id}/status` | On mutation (click) | No |
| Reschedule (drag/mini-form) | PATCH | `/reservations/{id}/reschedule` | On mutation | No |
| Full edit | PATCH | `/reservations/{id}` | On mutation | No |
| Create | POST | `/reservations/` | On mutation | No |

### Catalog / Services (`CatalogTab.jsx`)

| Requests | Method | Endpoint | When | React Query? |
|---|---|---|---|---|
| Categories | GET | `/catalog/categories` | On mount (`loadCategories`, `:111-119`) | No |
| Items for selected category | GET | `/catalog/items?category_id={id}` | On `selectedCat` change only — not on mount, not the full list (`:123-130`) | No |
| Category create/update/delete | POST/PATCH/DELETE | `/catalog/categories*` | On mutation | No |
| Item create/update/delete | POST/PATCH/DELETE | `/catalog/items*` | On mutation; a **sequential chain** for "save with image" — see §6 | No |

### Orders (`OrdersTab.jsx`)

| Requests | Method | Endpoint | When | React Query? |
|---|---|---|---|---|
| Orders | GET | `/{restaurant\|store}/orders` | On mount + manual refresh button (`loadOrders`, `:373-387`) — **no `limit`/`page` sent to the backend at all**, all filtering/sorting/pagination happens client-side over the full result | No |
| Status change | PATCH | `/{restaurant\|store}/orders/{id}/status` | On mutation | No |

### Settings (`SettingsTab.jsx` + shell)

| Requests | Method | Endpoint | When | React Query? |
|---|---|---|---|---|
| Admin branding | GET | `/settings` | Once, in the shell (`GenericAdminDashboard.jsx:286-298`) — persists across tab switches since the shell itself never remounts; passed to `SettingsTab` as a prop, not re-fetched by the tab | No, but effectively cached by construction (shell-level, not tab-level) |
| Store QR | GET | `/settings/qr` | Every time Settings tab is (re)mounted (`StoreQRSection`, `:100-109`) | No |
| Settings update | PATCH | `/settings` | On save | No |

---

## 2. Dependency Map

```
Overview     → Orders (restaurant|store), Reservations stats, Catalog (categories+items), Reservations (full list, via ActivityFeed)
Calendar     → Reservations, Barbers, Catalog items, Tenant config
Reservations → identical to Calendar (same component)
Catalog      → Catalog categories, Catalog items (scoped)
Orders       → Orders (restaurant|store)
Settings     → (none — receives settings via shell props) + Store QR
```

Overview is the only screen touching four different domains; every other screen is domain-pure
except Calendar/Reservations, which legitimately spans Reservations + Barbers + Catalog (a
reservation references both a staff member and a service — see §4).

---

## 3. Duplicate Requests — real, evidenced

1. **True duplicate, identical shape:** `GET /{restaurant|store}/orders` is fetched independently by
   both `OverviewTab.jsx:575` and `OrdersTab.jsx:377` — same endpoint, same (absence of) params.
   Visiting both tabs in one session fires the exact same request twice, no sharing.
2. **Calendar ↔ Reservations toggle:** because both nav items remount the same `ReservationsTab`
   (see structural note above), switching between "التقويم" and "الحجوزات" refires `GET
   /reservations/`, `GET /barbers/`, and `GET /catalog/items` every single time, even though it is
   functionally the same screen re-showing the same tenant's data. This is the single most wasteful
   pattern found — three requests repeated for a toggle that changes only which view mode is
   selected.
3. **Same resource, different shape, no reuse:** `/catalog/items` is independently fetched by three
   places with no cache sharing — `OverviewTab.jsx:607` (full, unfiltered), `useCatalogItems()` in
   `reservationInteractions.jsx:93` (full, unfiltered, powers Calendar/Reservations), and
   `CatalogTab.jsx:126` (correctly scoped by `category_id`). The first two are identical requests
   that could share one cache entry; the third is legitimately different (category-scoped) and not
   part of this finding.
4. **Same resource, different shape, no reuse:** `/reservations/` is independently fetched by
   `ReservationsTab.jsx:384` (filtered by date/status/view) and `ActivityFeed.jsx:116` (completely
   unfiltered, full table, just to build a "last 10 events" feed). These two screens are never
   mounted simultaneously (tabs are exclusive), so this isn't a same-render duplicate — but every
   Overview↔Calendar bounce re-issues both from scratch, and `ActivityFeed`'s unfiltered fetch is
   real over-fetching for what it actually needs (10 most recent).
5. **Dead-weight refetch:** `GET /settings/qr` regenerates on every Settings tab visit even though
   its content (a QR image encoding `{slug}/store`) is a pure function of the tenant slug and never
   changes — confirmed by the backend route's own docstring (`admin/settings.py:120-125`,
   "not stored... URL itself never changes").

---

## 4. Domain Boundary

No unnecessary or accidental cross-domain call was found — every cross-domain read in this dashboard
is deliberate and explainable:

- **Overview** reads Orders + Reservations + Catalog by design — it's a cross-capability summary
  screen, the same conclusion the earlier API Boundary Review reached from the backend side.
- **Calendar/Reservations** reads Barbers + Catalog alongside Reservations — legitimate, because a
  reservation's popover needs to offer a staff member and a service to pick from. Worth stating
  plainly: "Calendar" is not a Reservations-only screen, it's a Reservations+Staff+Catalog composite.
- **Catalog**, **Orders**, and **Settings** are each domain-pure — Catalog never calls Reservations,
  Orders never calls Catalog, Settings never calls Catalog. Clean.

---

## 5. Monitoring Readiness — per real screen

| Screen | Namespace(s) to watch |
|---|---|
| Overview | `/{restaurant\|store}/orders`, `/reservations/stats`, `/reservations/` (unfiltered), `/catalog/*` |
| Calendar / Reservations | `/reservations/*`, `/barbers/*`, `/catalog/items` |
| Catalog | `/catalog/*` |
| Orders | `/{restaurant\|store}/orders*` |
| Settings | `/settings*` (note: shell-level `/settings` GET is not tab-scoped — it fires once per dashboard session, not per Settings-tab visit) |

Matches and slightly refines the backend-side namespace map already proposed in the earlier API
Boundary Review's §7 — this table is the frontend half: which screen is the actual source of each
request, not just which backend prefix owns it.

---

## 6. Performance Notes (observations only, no fix proposed)

- **Root cause of most duplicates above:** every tab except Settings refetches from scratch on every
  tab switch, because switching tabs unmounts/remounts the tab component (see structural note). This
  is not specific to any one endpoint — it's a property of how `GenericAdminDashboard.jsx` renders
  tabs.
- **`useTenantConfig()` is the one proof this is avoidable in this exact codebase** — it's the only
  fetch that survives a remount without a new network call, because it's React-Query-backed.
- **Necessary sequential chain:** `CatalogTab.saveItem()` (`:206-244`) does create/update → (if a new
  image was chosen) upload → PATCH `image_url` → re-fetch the item list — up to 4 awaited requests in
  series for one save action. This is not avoidable over-fetching; the image upload genuinely needs a
  real item id first. Flagged only because it's the slowest single user action in the dashboard, not
  because it's wrong.
- **No pagination sent to the backend:** neither `OrdersTab.jsx` nor `OverviewTab.jsx`'s orders fetch
  sends a `limit`/`page` param — the full order table is fetched every time and paginated/filtered
  entirely client-side. Fine at `hr`'s current volume; will not scale as order count grows (Reservations'
  own list fetch, by contrast, already sends `limit`).
- **Inconsistent polling coverage:** `ActivityFeed`'s 30-second timer (`:126-130`) only calls
  `onRequestRefresh` (Overview's `loadOrders`) — it never re-fetches reservations. So the "activity
  feed" mixes a live-updating order stream with a reservation stream that silently goes stale after
  the initial mount. A real, evidenced inconsistency, not assumed.
- **Dead-weight refetch:** `GET /settings/qr`, as noted in §3.5 — recomputes a value that can't
  change for a given tenant.
- **No server-side N+1 was found triggered by any of these calls** — each listed endpoint is a single
  request from the frontend's point of view. Whether any of them does N+1 work *inside* the backend
  route is outside this pass's scope (this is a frontend request-count/timing audit, not the backend
  code audit the earlier API Boundary Review already did).

---

## 7. Recommendations — categorized, no refactor performed

**Stays as-is:**
- `CatalogTab.jsx`'s category-scoped item fetch — already correctly scoped, not part of any
  duplicate finding.
- Settings receiving `/settings` via shell props instead of its own fetch — already correctly
  shared, zero duplication.
- `useTenantConfig()`'s usage everywhere it appears — already the correct, already-proven pattern.
- Overview's cross-domain reads — legitimate by design, not a boundary violation.

**Needs separation/cleanup, but not decided or scheduled by this audit:**
- The Calendar↔Reservations remount waste (§3.2) — the single biggest win found, since both nav
  items already render the same component. A narrow fix exists (not proposed or built here) without
  needing the full React Query migration; whether to take that narrow fix now or fold it into the
  broader migration is a real open call, deliberately left to Salman, not decided here.
- `ActivityFeed`'s inconsistent staleness (reservations never refresh on the 30s poll) — flagged as a
  candidate, not a decision.

**Should move with the Store project:**
- Any new Store-side Overview/Orders/Catalog screens should be built on `useQuery` from day one, per
  the already-recorded decision in `.claudedocs/evolution/frontend-data-layer.md`. This audit's
  duplicate findings (§3.1, §3.3, §3.4) are exactly the failure mode that decision exists to prevent
  from recurring a third and fourth time.

**Should wait for the Customer domain:**
- Nothing in this pass touches Customers — consistent with the earlier API Boundary Review's finding
  that the Customers capability isn't wired to anything yet. No action needed here until it exists.

---

## Priority Matrix

Added per Salman's explicit request — not a schedule, not an approval to build any of this now. Its
only job is to let someone reopen this report in a month and see where the real return sits within
30 seconds, instead of re-reading all seven sections.

| Opportunity | Expected Impact | Priority |
|---|---|---|
| `ReservationsTab` cache sharing (Calendar↔Reservations remount waste, §3.2) | Very High | P1 |
| Orders cache sharing (Overview↔Orders duplicate, §3.1) | High | P1 |
| Catalog cache sharing (Overview↔`reservationInteractions.jsx` duplicate, §3.3) | Medium | P2 |
| `ActivityFeed` reservation refresh (§3.4, §6) | Medium | P2 |

All four are still governed by the same deferral already on record in
`.claudedocs/evolution/frontend-data-layer.md` — none scheduled, all timed to whenever the Store
Dashboard / data-layer work actually starts.

---

## Confirmed Findings

- `GenericAdminDashboard.jsx:416-446,698-714` unmounts/remounts the active tab's component on every
  tab switch (`AnimatePresence key={activeTab}`) — confirmed by reading the full render tree, not
  inferred from behavior.
- `GET /{restaurant|store}/orders` is independently fetched, with identical (empty) params, by both
  `OverviewTab.jsx:575` and `OrdersTab.jsx:377`.
- `GET /catalog/items` (full, unfiltered) is independently fetched by `OverviewTab.jsx:607` and
  `reservationInteractions.jsx:93`.
- `GET /reservations/` is fetched with two different shapes by `ReservationsTab.jsx:384` (filtered)
  and `ActivityFeed.jsx:116` (unfiltered, no `limit`).
- `ActivityFeed.jsx:126-130`'s 30-second poll calls only `onRequestRefresh` (orders), never
  re-fetching its own `reservations` state.
- `OrdersTab.jsx:373-387` and `OverviewTab.jsx:568-583` send no `limit`/`page` query param on their
  orders fetch — confirmed by reading the full request construction, not assumed from the URL shape
  alone.
- `useTenantConfig()` (`frontend/src/hooks/useTenantConfig.js:63-76`) is the only fetch in this whole
  surface backed by `useQuery` — confirmed by reading the hook in full.

## Side Findings

- `ReservationsTodayView.jsx` and `ReservationsWeekCalendar.jsx` issue zero requests of their own —
  confirmed clean, all data arrives via props from `ReservationsTab.jsx`, consistent with Phase 3.4's
  Step 0 extraction.
- `TopItemsWidget.jsx` and `StatCard.jsx` are pure presentational components with no data fetching of
  their own — checked while building the Overview inventory row, included here for completeness
  rather than left unstated.
- `CatalogTab.jsx`'s category-type lock (`editingCat` disables the `module_key` select,
  `CatalogTab.jsx:369-381`) has nothing to do with data-fetching but was noticed while reading the
  file in full — not investigated further, out of this audit's scope.

## Unknowns

- Real network timing (actual milliseconds, waterfall vs. parallel in the browser) was not measured
  — this audit is a static code-read of request *shape and trigger*, not a live profiling pass. If
  real timing numbers are wanted, that needs a Browser Verification pass per
  `rules/frontend/browser-verification-protocol.md`, not assumed from reading the source.
- Whether the backend routes hit by these frontend calls do any N+1 work internally was not checked
  in this pass — explicitly out of scope (see §6's closing note); would need a separate backend-code
  read.
