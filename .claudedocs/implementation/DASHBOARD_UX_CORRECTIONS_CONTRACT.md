# Dashboard UX Corrections — Pre-Polish Implementation Plan

> **STATUS: ⏸ NOT APPROVED — NO IMPLEMENTATION UNTIL SALMAN EXPLICITLY SAYS "APPROVED."**
> This file is the durable, project-committed record of the plan (the harness's own ephemeral
> plan-mode file is not guaranteed to survive a context compact/reload — this one is). If this
> session is resumed after a compact, **read this file, check the Status line above, and do not
> start any code until it says APPROVED** — per `context-recovery-protocol.md`'s own
> repository-over-memory rule and Salman's explicit instruction on 2026-08-10.
>
> Once approved, implementation proceeds strictly in Section E's order, with Section F's real
> verification (desktop + mobile, per Section B.12's standing requirement) run before any item is
> considered done, exactly like every other Implementation Contract this session
> (`OVERVIEW_UX_IMPROVEMENTS_CONTRACT.md`, `STAFF_SCOPED_ACCESS_CONTRACT.md`,
> `STAFF_STORE_IA_SEPARATION_CONTRACT.md`).

## Context

Before starting Ratified Order item #5 (the remaining 🟡 UX polish items from the three-sided
Admin Product Review — `RESERVATION_PRODUCTION_ROADMAP.md`), Salman sent 11+ real dashboard
observations from actual usage. Explicit instruction: **investigation + plan only, no code, no
commits of code this turn.** Every item below was checked against the real current code (and,
where noted, real API calls) — not assumed from the description. Several items turned out to be
different from their stated premise once verified; those are called out explicitly rather than
silently planned around, per the standing rule this whole session has followed (the Overview
🔴→🟡 reclassification, the barbers-roster reuse pattern, the Overview mobile-overlap "prove it
before fixing it" discipline).

**Headline finding, read this first**: item 2 (Reservations List vs. Calendar) is not a bug — it's
a **reversal of an explicit prior product decision**. `ReservationsTab.jsx`'s own code comment
(2026-08-03): *"Today/Week is one segmented control... so switching feels like moving between two
modes of the same calendar, not two separate pages, per Salman's explicit note."* The new request
says the opposite. This is flagged in Section G, not silently resolved either way.

---

## A. Confirmed Issues

| # | Issue | Evidence | Severity | Scope |
|---|---|---|---|---|
| 1 | Overview empty vs. skeleton | **Could not reproduce in code or live browser test** — see finding below | Unconfirmed | N/A pending re-test |
| 2 | Reservations "week" renders the Calendar grid, not a list | Confirmed in code — `viewMode` drives both date-range AND render target | Real, but **reverses a documented 2026-08-03 product decision** | Frontend-only, but needs a decision first |
| 3 | Reservations date filter hard to use | Confirmed — plain `<input type="date">`, browser-locale-dependent display, no typed-format control | Real | Frontend-only |
| 4 | "قائمة" label redundant | Confirmed — a `viewMode='list'` toggle button, redundant since Reservations already defaults to list | Real, small | Frontend-only |
| 5 | Manual refresh required | **Refuted** — data already auto-loads via `useEffect(() => { load() }, [load])` on mount and on every filter change | Not a bug | N/A |
| 6 | Filter bar UX | Mostly fine (search + status pills work); folds into #3/#4 | Minor | Frontend-only |
| 7 | Staff↔Service IA (two-column ask) | Real backend relationship + API already exists (`BarberService`, `GET/PATCH /barbers/{id}/services`); only the checklist-inside-a-modal UI is the gap | Real UX gap, not missing backend | Frontend-only |
| 8 | Staff/Services test data mixing | **Already resolved** — the 2026-08-10 Production Data Hygiene cleanup already deleted all 3 test barbers + 2 test services; 0 remain today (verified via a real, fresh API call this turn) | Resolved, pre-existing work | N/A |
| 9 | Store products hidden by default, unclear | Confirmed — the show/hide mechanism (`is_active`, "مخفي" badge, إظهار/إخفاء button) already exists and works; the gap is a *prominent nudge* when most/all products are hidden | Real, small | Frontend-only |
| 10 | Store order status control missing | **Refuted as "missing"** — a full backend `PATCH /orders/{id}/status` with real transition validation, and a frontend clickable `StatusCell` dropdown, both already exist and are wired. The real gap is *discoverability* — the clickable badge has zero visual affordance suggesting it's interactive | Real, but small (discoverability, not capability) | Frontend-only |
| 11 | Dashboard routing/URL inconsistency | Confirmed, multiple real bugs (see below) | Real | Frontend-only |
| 12 | Mobile vs. desktop layout | Standing design/verification requirement (not a one-off audit) — applies to every UI-producing item in this plan, per Section B.12's checklist and Salman's explicit correction | Real, mandatory for every touched screen | Frontend-only |
| 13 | Dev-mode slowness / duplicate requests | Already-logged finding (`todo_list.md`, Dashboard Workload/API Audit, 2026-08-06): `GET /{restaurant\|store}/orders` and `GET /catalog/items` are each independently double-fetched by Overview + Orders/reservationInteractions | Real, pre-existing, not new | Frontend-only |

---

## B. Proposed Changes

### 1. Overview empty vs. skeleton — investigate live before planning a fix

**Current behavior (verified by reading `OverviewTab.jsx`, `ActivityFeed.jsx`, `TopItemsWidget.jsx`,
`StatCard.jsx` in full):** every single widget already implements the correct 3-state pattern —
`loading ? <Skeleton/> : (empty ? <EmptyState/> : <realContent/>)`. `RevenueChart`/`StatusDonut`
check `orders.length`; `ActivityFeed` has its own `loading` state cleared in a `.finally()`
regardless of success/failure; `StatCard.isLoading` is parent-driven and resolves as soon as the
fetch settles. This session's own real browser evidence pass (2026-08-10, earlier this session)
independently confirmed this in practice: stat cards showed real `٠` values, Revenue/Status showed
real empty-state text, Activity Feed showed real content — nothing was stuck.

**Desired behavior:** unchanged from the request — Skeleton means loading, Empty State means
loaded-and-empty, Error means failed.

**Recommendation:** do not implement a fix for a problem not currently reproducible. Instead:
(a) ask Salman which specific widget/screen he saw stuck, since "stuck forever" wasn't observed in
either static code or a real browser pass, or (b) do one more live re-test at implementation time,
specifically on a cold/slow network (the recurring Supabase pooler flakiness this project has
repeatedly hit could make a *normal, finite* loading state feel like "stuck forever" without any
code bug — worth explicitly ruling in/out before writing any fix). **This is Section G's first
open question, not a planned code change.**

### 2. Reservations List vs. Calendar

**Current behavior:** `ReservationsTab.jsx` is genuinely one shared component behind both the
"Calendar" nav tab (`defaultView="today"`) and the "Reservations" nav tab (`defaultView="list"`).
Its `viewMode` state (`'list' | 'today' | 'week'`) controls *both* which date range is fetched
*and* which component renders — `'today'`/`'week'` render `ReservationsTodayView`/
`ReservationsWeekCalendar` (the same barber-column/day-grid components the Calendar tab itself
uses), not a list. Clicking "الأسبوع" on the Reservations page currently does exactly what the
request describes: turns the page into the Calendar experience.

**Confirmed, load-bearing detail:** the backend `GET /reservations/` already accepts
`date_from`/`date_to` (week-range) query params — `load()` already builds and sends them for
`viewMode==='week'` (`ReservationsTab.jsx:418-421`). **The data-fetching layer needs zero backend
changes** — this is purely about which component renders the already-fetched data.

**Desired behavior (per the request):** on the Reservations page specifically, "اليوم"/"الأسبوع"
should change the date range of the *list* view, not swap to the calendar-grid components. The
actual Calendar tab keeps its current visual grid behavior unchanged.

**Proposed change** (pending Section G's decision): add a rendering-mode distinction so the same
`ReservationsTab` component behaves differently depending on which nav tab it's mounted under —
e.g., a new prop (`forceListView` or similar) that, when true (passed only from the Reservations
nav case in `GenericAdminDashboard.jsx`), makes `'today'`/`'week'` clicks change `dateFilter`/
`weekStart` (already-existing state) without ever switching to the `ReservationsTodayView`/
`ReservationsWeekCalendar` render branch — instead extending the existing list-render branch
(currently single-day only) to also handle a week range: group the already-fetched week's
reservations by date, render with the *same* row/card components already used for the single-day
list (no new list-rendering logic invented, just a broader date range fed into it).

**Files affected:** `frontend/src/pages/generic-admin/tabs/ReservationsTab.jsx` (the render-branch
logic + a new prop), `frontend/src/pages/generic-admin/GenericAdminDashboard.jsx` (pass the new
prop only for the `case 'reservations'` render, not `case 'calendar'`).

**Backend impact:** none — `date_from`/`date_to` already work.

**Reuse:** the exact same reservation row/card components already used for the List view's
single-day case; the exact same `load()` fetch logic (already supports week ranges); no new
component invented.

**Risk:** medium — this is the single largest change in this whole plan, touches the most-used
admin screen, and reverses a documented prior decision. Needs explicit go-ahead (Section G) before
any code.

### 3. Reservations date filter

**Current behavior:** `<input type="date">` (`ReservationsTab.jsx:539-550`) — format and picker UI
are entirely browser/OS-controlled, not something this app can force to a consistent
`MM/DD/YYYY` display across all users/browsers.

**Real, directly-applicable precedent already in this codebase:** `Dropdown.jsx`
(`frontend/src/pages/generic-admin/components/Dropdown.jsx`) replaced a native `<select>` for the
*identical class of problem* — its own header comment documents a real, Salman-verified mobile bug
where the native picker rendered broken/misplaced, confirmed via real device-emulation screenshots.
The fix there was a custom trigger-button + app-controlled panel component, now reused in 3+ places.
The same reasoning applies directly to native date inputs, all 5 of which exist in
`generic-admin/` (`reservationInteractions.jsx` ×3, `ReservationsTab.jsx`, `ReservationsTodayView.jsx`).

**Proposed change:** build one shared `DatePicker` component (same architectural pattern as
`Dropdown.jsx` — button trigger, app-controlled panel, opens below, no OS chrome) supporting both
typed entry (explicit `MM/DD/YYYY` masked/validated input) and a calendar-grid picker, and swap it
into the Reservations date filter first. Do **not** touch the other 4 native-date-input call sites
in this same pass — out of this plan's scope (Reservations only), named as a natural follow-up
once this one is proven.

**Files affected:** new `frontend/src/pages/generic-admin/components/DatePicker.jsx`;
`ReservationsTab.jsx`'s date-filter row swaps the native input for it.

**Backend impact:** none — the filter still ultimately sends the same `date`/`date_from`/`date_to`
ISO-format query params `load()` already builds; only the *input UI* changes, not the wire format.

**Display-format note:** the project's existing *display* convention elsewhere uses localized
Arabic dates (`toLocaleDateString('ar-SA', ...)`, e.g. "12 أغسطس 2026") — `MM/DD/YYYY` here is
specifically for *typed filter entry*, not a request to change how dates are displayed elsewhere.
Confirmed not a conflict, but worth stating explicitly so the two don't get conflated during
implementation.

**Risk:** low-medium — new component, but following an already-proven pattern in this exact
codebase.

### 4. "قائمة" label

**Current behavior:** a real button, `onClick={() => setViewMode('list')}` — but on the
Reservations page, `defaultView='list'` already, so it's almost always already-active and inert.

**Proposed change:** remove the "قائمة" pill specifically from the Reservations-tab instance of
this component (keep `viewMode==='list'` as the internal default state — nothing about the actual
list rendering changes) — gate its render on the same new prop from item #2 (only show it when
this component is mounted under the Calendar tab, if it's ever useful there — needs checking, see
Section G). No routing/deep-link dependency found — `viewMode` is pure component state, never
reflected in the URL (confirmed by the routing investigation below), so removing this button cannot
break a deep link.

**Files affected:** `ReservationsTab.jsx` (conditional render of the pill).

**Risk:** low.

### 5. Reservations auto-refresh

**Refuted as an issue** — `useEffect(() => { load(); setPage(1) }, [load])` already fires on mount
and on every dependency change (`statusFilter`, `dateFilter`, `showAllDates`, `viewMode`,
`weekStart`, `todayViewDate`). Data already loads automatically; the "↻" and "تحديث" buttons are
purely optional manual re-fetch (e.g., to pull in a booking made by someone else without changing
any filter). **No change proposed** — matches this plan's own instruction not to remove a
manual-refresh affordance without evidence it's actually redundant, and it does have real standalone
value (getting fresher data without touching filters).

### 6. Filter bar UX

No standalone issues found beyond #3/#4 above — search and status pills are already functioning
correctly per the code read. Not a separate change.

### 7 & C. Employee ↔ Service Workflow — see Section C below (treated separately, per instruction)

### 8. Staff/Services test data — no cleanup needed

Verified via a real, fresh API call this turn: `GET /admin/barbers/` returns exactly 2 rows
(حسين, جعفر, both `is_active: true`); `GET /admin/catalog-services/?include_inactive=true` returns
6 rows, all real named services. **Zero test-looking rows remain** — the 2026-08-10 Production Data
Hygiene cleanup (3 test barbers + 2 test services deleted, evidence:
`.claudedocs/work/production-data-hygiene/2026-08-10/deletion-review.md`) already closed this. No
further action — reported here so it isn't silently "fixed again."

### 9. Store products — publish nudge

**Current behavior:** `StoreTab.jsx` already has a full, working mechanism —
`toggleItemActive()`/`toggleCatActive()` PATCH `is_active`, a "مخفي" badge, and an "إظهار"/"إخفاء"
button per row (`StoreTab.jsx:377-398`). The gap is purely a missing *summary/nudge* — nothing
tells the owner "4 of your 4 products are hidden, customers see an empty store" unless they read
every row's badge individually.

**Proposed change:** a small, dismissible-or-not banner at the top of the Items view, shown only
when `hiddenCount > 0` (or specifically when `hiddenCount === totalCount`, the "storefront looks
empty to customers" case) — e.g., "X من منتجاتك غير ظاهر للعملاء" with the existing show/hide
controls already being the action (no new action invented, just surfaced more prominently).

**Files affected:** `StoreTab.jsx` (Items sub-view render, one new conditional banner block).

**Backend impact:** none — purely derived from data already fetched (`items` array, `is_active`
field already present).

**Risk:** low.

### 10. Store order status — discoverability fix, not a missing feature

**Current behavior:** `StatusCell` (`OrdersTab.jsx:95-129`) is a real, working, clickable status
badge → opens a `Dropdown` with valid next-transitions (from `TRANSITIONS.store`, matching the
backend's `STORE_TRANSITIONS` exactly) → calls the existing `PATCH /orders/{id}/status`. This is
already wired into the main table row (`OrdersTab.jsx:585`). The earlier Product Review's "no way
to change status" finding checked the *expanded row detail* (`ExpandedRow`, items/payment/notes
only) — correctly found nothing there, but didn't notice the status badge *in the collapsed row
itself* is interactive. The badge has no visual affordance (no chevron, no hover cue, no "click to
change" hint) suggesting it's clickable — a real, understandable discoverability miss, confirmed
now by reading `StatusBadge`'s style object (plain colored pill, `cursor: pointer` only, no other
visual signal).

**Proposed change:** add a small, subtle affordance to `StatusBadge` when `clickable` is true (e.g.
a tiny chevron-down icon, or a dotted underline) — purely visual, zero logic change, since the
click handler and transition validation already work correctly end-to-end.

**Files affected:** `OrdersTab.jsx`'s `StatusBadge` component only.

**Backend impact:** none.

**Risk:** very low — pure visual addition to an already-working, already-tested interaction.

### 11. Dashboard routing/URL — real, confirmed bugs

Full investigation (real Explore-agent pass, file:line cited):

- **`activeTab` is pure internal React state, never derived from the URL** — zero
  `react-router-dom` hooks used in `GenericAdminDashboard.jsx`. Confirmed.
- **Tab-switching never updates the browser URL bar** — both sidebar and mobile-nav click handlers
  are plain `setActiveTab(item.id)`, no `navigate()`/`history.pushState` anywhere in the file.
- **A hard refresh on a non-default tab does NOT preserve it** — `activeTab` re-initializes to
  `'overview'`, then a one-time effect force-sets it to `'calendar'` for a `hasReservations`
  tenant, regardless of what the URL's trailing path segment said. Confirmed traceable, not a
  guess.
- **Two different login flows produce two different URL patterns for the same destination**:
  `Login.jsx:43` hardcodes `/dashboard/{slug}/calendar` (a **non-canonical** pattern, and the
  file's own comment admits the `/calendar` segment is purely decorative — the dashboard "ignores
  this path segment entirely"); `SSOLoginPage.jsx` uses the **canonical** `/{slug}/dashboard`
  pattern per the project's own `routing.md §0b`. Real, live inconsistency between two real entry
  points to the same screen.
- `routing.md` itself already flags `/dashboard/:slug/*` as an unresolved "open item" (line ~49) —
  this isn't a new discovery, but the plan should close it rather than let it keep drifting.

**Proposed change (scoped, not a full router rewrite):**
1. Sync `activeTab` to the URL using React Router (this app already uses `react-router-dom`
   elsewhere — `App.jsx` — just not inside this component): read the tab from
   `useParams()`/`location.pathname` on mount, call `navigate()` (replace, not push, to avoid
   history-spam) on every tab switch instead of only `setActiveTab`.
2. Fix `Login.jsx:43` to redirect through the canonical `/{slug}/dashboard` pattern (matching
   `SSOLoginPage.jsx`), closing the two-different-URLs-for-one-destination inconsistency.
3. Do **not** touch `/dashboard/:slug/*` vs. `/:slug/dashboard/*`'s existence at the `App.jsx`
   route-table level in this pass — per `routing.md`'s own note, deciding whether to fully
   deprecate/redirect the non-canonical pattern is a separate architectural call, not a "polish"
   change; flagged in Section G, not silently decided here.

**Files affected:** `GenericAdminDashboard.jsx` (URL sync), `frontend/src/pages/admin/Login.jsx`
(one-line redirect fix).

**Backend impact:** none.

**Risk:** medium — touches every tab-switch interaction across the whole dashboard; needs a real
regression pass across every tab, both roles, both viewports (Section F).

### 12. Mobile vs. desktop layout — corrected per Salman's explicit standard (not deferred)

**Revised per Salman's explicit correction**: this is not an optional add-on scoped down to "only
what's already being touched." **Every screen this plan changes must be intentionally designed and
verified for both desktop/laptop and mobile — mobile is never a scaled-down desktop layout, and no
content may ever become permanently inaccessible or overlap an interactive control.** This applies
to every item in Section B and Section C that produces UI, not a subset.

Overview's own transient-scroll question was already investigated and closed 2026-08-10 (confirmed
not a real bug — no permanent content loss at true max-scroll) — that real methodology (compute
actual element rects at real scroll/viewport positions, not eyeball a screenshot) is the standard
every item below must be held to, not just Overview.

**Per-screen desktop + mobile design/verification checklist — applied to every item that touches
UI (#2, #3, #4, #7/C, #9, #10, #11):**

| Concern | Desktop/laptop | Mobile/phone |
|---|---|---|
| Navigation | Sidebar, all items reachable, no truncation | Fixed bottom tab bar doesn't cover content at any real scroll position (real max-scroll rect check, not a screenshot) |
| Scrolling | No unintended scroll containers, no horizontal overflow | Vertical stacking correct, no horizontal overflow, real scroll-to-bottom check per changed screen |
| Modals/panels (new `DatePicker`, new Staff↔Service panel) | Opens in-context, doesn't clip against viewport edges | Doesn't get clipped by the fixed bottom bar or exceed viewport width; touch targets sized for a finger, not a cursor |
| Tables/lists (Reservations list-view, week-range grouping) | Full columns visible, sortable where already sortable | Falls back to the existing card pattern already used elsewhere in this dashboard (`MobileReservationCard`, `MobileCardSkeleton` — reuse, don't invent a second mobile pattern) |
| Filters (date filter, status pills, search) | Inline row, no wrap issues | Confirmed not to reintroduce the already-fixed mobile horizontal-overflow bug (`ReservationsTab.jsx`'s own comment names this as a previously-real, previously-fixed bug — the new `DatePicker` must not reopen it) |
| Cards (Store items, Staff↔Service panel entries) | Grid/multi-column as appropriate | Single-column stack, no cut-off text, real tap targets |
| Interactive-control overlap | N/A (no fixed chrome on desktop) | Explicit real-rect check: does the fixed bottom nav ever overlap a button/input a user needs to reach — checked the same way the Overview mobile-overlap question was closed (`getBoundingClientRect()` comparison at real scroll positions, both mid-scroll and true max-scroll) |

**Scope stays honest, not unbounded**: this checklist applies to the screens this plan actually
changes (Reservations, Staff, Store, the new DatePicker/panel components) — it is not a blanket
"re-audit every unrelated dashboard screen" task. If Salman has specific screens/screenshots showing
real mobile breakage on screens *outside* this plan's scope, naming them directly opens a separate,
precisely-scoped follow-up rather than expanding this one silently.

### 13. Dev-mode slowness / duplicate requests

Already-logged, not re-investigated fresh this pass (`todo_list.md`'s Dashboard Workload/API Audit,
2026-08-06): `GET /{restaurant|store}/orders` fetched independently by both Overview and Orders
tabs; `GET /catalog/items` fetched independently by Overview and `reservationInteractions.jsx`'s
`useCatalogItems()`. Real, but pre-existing and not something today's observations add new evidence
for. **Recommendation**: keep this named/tracked (already is), but don't fold a real refactor
(shared data-fetching layer) into this UX-polish pass — matches the plan's own scope rule (prefer
the smallest coherent improvement, don't introduce new architecture). If Salman wants this
prioritized now rather than later, say so explicitly — otherwise it stays where it already is in
`todo_list.md`.

---

## C. Employee ↔ Service Workflow (treated separately, per instruction)

**What already exists (verified, not assumed):**
- Real backend model: `BarberService` join table (`barberId` + `serviceId`, confirmed this session
  during the Staff-scoped review).
- Real API: `GET /barbers/{id}/services` (returns service_ids for one barber),
  `PATCH /barbers/{id}/services` (sets the full list for one barber) — both already exist, already
  wired, already used.
- Real current UI: inside `StaffTab.jsx`'s barber-edit modal, a checklist field
  ("الخدمات التي يقدمها") lets an admin check/uncheck services for the barber being edited — this
  IS the relationship-management UI today, just buried inside an edit modal rather than being a
  first-class, visible relationship view.

**What's genuinely missing:** a *visible*, at-a-glance way to see the relationship without opening
an edit modal per barber — exactly what the "two columns" request is asking for. There is **no
missing backend capability** here — this is a real frontend IA/presentation gap on top of a fully
working relationship model and API.

**Simplest viable UX given the existing model (recommendation, not a redesign):**

A two-panel layout inside the existing Staff tab's "الموظفون" (Employees) sub-view — not a new
top-level nav item, not a new page:
```
[ Employees list ]        [ Selected employee's services ]
  حسين  (selected)          [x] شعر
  جعفر                      [x] شعر ودقن
                            [ ] دقن
                            [ ] كرياتين
                            [ ] تمشيط أو تسريح
                            [ ] حنة أو صبغة
```
- Clicking an employee in the left panel loads their services (already-existing
  `GET /barbers/{id}/services` call) into the right panel — same checklist UI already built inside
  the edit modal, just surfaced as its own panel instead of nested in a modal.
- Checking/unchecking calls the same already-existing `PATCH /barbers/{id}/services`.
- The same service can be assigned to multiple employees today already (it's a join table, not a
  1:1 relationship) — no model change needed for this.
- Service→Staff direction ("which employees perform this service") is not currently a direct query
  the backend exposes as its own endpoint — it would need to be derived client-side from fetching
  every barber's service list, or a small new backend aggregate. **Flagging this specifically**: if
  Salman wants the reverse direction (Service → Staff) as a first-class view too, that's additional
  backend-adjacent work (or an accepted N-calls client-side derivation) — not assumed here either
  way, per the explicit instruction not to expand backend scope silently.

**Files affected:** `StaffTab.jsx` (Employees sub-view — restructure into the two-panel layout,
reusing the existing checklist markup/handlers already built for the edit-modal version, not
rewriting them).

**Backend impact:** none for the Staff→Service direction (already fully supported). Service→Staff
direction, if wanted, is a named-but-not-scoped follow-up.

**Risk:** medium — this is the second-largest change in the plan (after Reservations
List-vs-Calendar), touches a screen every tenant admin uses daily. Real regression risk: the
existing edit-modal checklist must keep working exactly as-is if it's not being fully replaced (or
be cleanly removed if the new panel replaces it — Section G).

---

## D. Explicitly NOT Changing

- Reservations' actual Calendar tab (`defaultView="today"` instance of `ReservationsTab`) — its
  visual grid behavior is correct and unchanged; only the *Reservations* instance changes.
- `store.py`/`catalog_service.py` dual-write-path — separate, already-named architecture item, not
  touched by this UX pass.
- The `/dashboard/:slug/*` vs. `/:slug/dashboard/*` route-table question at the `App.jsx` level —
  named, not decided, in Section G.
- Any backend status/transition logic for Store Orders — already correct, only a frontend visual
  affordance is added.
- Any deletion of Staff/Service/Barber data — confirmed already clean, nothing to delete.
- The already-logged duplicate-request performance item — tracked, not folded into this pass.
- The other 4 native `<input type="date">` call sites outside Reservations — named as a natural
  follow-up once the new `DatePicker` is proven in one place, not touched in this pass.
- Any Store/Catalog data-model or Staff/Store IA change — both already closed this session,
  untouched here.

---

## E. Implementation Order

Dependency-aware, safest-first:

1. **#8 (verify only, no code)** — already done this planning pass; nothing to implement.
2. **#5 (verify only, no code)** — already done; nothing to implement.
3. **#4 "قائمة" removal** — trivial, no dependency on anything else, do first to get a real quick
   win and re-confirm the "no deep-link dependency" claim in a live browser before the bigger #2
   change touches the same file.
4. **#10 Order-status affordance** — isolated, zero logic change, safe to do anytime; grouped early
   since it's independent of everything else.
5. **#9 Store publish nudge** — isolated, independent, safe early.
6. **#3 DatePicker component + Reservations wiring** — before #2, since #2's list-view week-range
   rendering will want a working date range picker for any manual date entry inside the new list
   view too (avoids building the list-view UI once, then retrofitting the picker into it right
   after).
7. **#2 Reservations List-vs-Calendar** — the largest change, done after the smaller ones are
   proven safe and after Section G's decision is confirmed. Not started before that confirmation.
8. **#7/C Staff↔Service two-panel UI** — independent of everything above, can run in parallel with
   #2 if desired, but sequenced after since it's the second-largest change and benefits from the
   same "smaller wins first" discipline.
9. **#11 Routing/URL fixes** — deliberately last: touches every tab-switch interaction across the
   whole dashboard, so it should land only after the tab-content changes above (#2, #7) are settled,
   to avoid re-testing the URL-sync behavior twice against a moving target.
10. **#1 Overview empty-state** — only if Section G's re-test actually reproduces something; no
    code until then.

---

## F. Verification Plan

**Standing rule for every item below, not repeated per line**: desktop AND mobile are both
mandatory, not desktop-with-an-optional-mobile-glance. Mobile checks use Section B.12's checklist
and the same real-rect methodology already proven closing the Overview mobile-overlap question
(real `getBoundingClientRect()` comparisons at real scroll positions — mid-scroll and true
max-scroll — never a stitched screenshot alone). Acceptance bar: no content permanently
inaccessible, no content overlapping an interactive control, at any real viewport/scroll state a
user would actually pass through.

For every item that results in code, per this project's own established discipline this whole
session (real accounts, real browser, desktop + mobile, explicit regression):

- **#4, #10, #9**: real browser check (desktop + mobile), confirm the specific UI change, confirm
  zero console/network errors, confirm the underlying action (status change / show-hide) still
  round-trips correctly to the real backend.
- **#3 DatePicker**: real browser check — type a date manually, pick one from the calendar panel,
  confirm both produce identical filter results; test an invalid typed date is rejected cleanly;
  desktop + mobile.
- **#2 Reservations List-vs-Calendar**: real browser, both TENANT_ADMIN and STAFF (Jaafar) — list
  view for Today and Week both show real reservation data as a list; every existing action (create,
  edit, confirm, cancel, reschedule) still works from the list view; the actual Calendar tab is
  confirmed **unaffected** (still shows the grid); desktop + mobile.
- **#7/C Staff↔Service panel**: real browser, TENANT_ADMIN — select a barber, confirm their real
  services show correctly checked; toggle a service, confirm it persists (re-fetch/reload to prove
  it round-tripped, not just local state); confirm the same service can be seen assigned to a
  second barber; desktop + mobile.
- **#11 Routing**: real browser — click through every tab, confirm URL updates each time; hard
  refresh on each tab, confirm it lands back on the same tab (not reset to Calendar/Overview);
  test both `Login.jsx` and `SSOLoginPage.jsx` entry points land on the same canonical URL pattern;
  browser back/forward buttons behave sensibly.
- **Explicit regression, every item**: Calendar, Reservations, Staff, Store, Overview all still
  load real content with zero new console/network errors, for both TENANT_ADMIN and STAFF — same
  4-tab regression sweep this session has run after every dashboard change so far.

---

## G. Open Questions / Decisions Needed

1. **Reservations List-vs-Calendar reverses a documented 2026-08-03 product decision**
   (`ReservationsTab.jsx`'s own comment: shared component "per Salman's explicit note" at the time).
   Confirm this is an intentional reversal, not a misremembered/different concern — the fix as
   planned (item #2) is real work on the most-used admin screen and shouldn't start on an
   assumption.
2. Should the "قائمة" pill be removed **only** from the Reservations-tab instance, or from the
   Calendar-tab instance too (where it currently also lets an admin drop into a flat list from the
   Calendar)? Investigation found no technical reason it couldn't stay on Calendar; this is a real
   product-feel choice.
3. Staff↔Service two-panel UI — does it **replace** the existing edit-modal checklist entirely, or
   do both coexist (panel for browsing/quick-toggling, modal for full barber-profile editing)?
   Affects the implementation's actual footprint in `StaffTab.jsx`.
4. Service→Staff (reverse direction) — wanted as a first-class view now, or acceptable to leave as
   Staff→Service only for this pass (with reverse direction flagged as a possible later
   backend-adjacent follow-up)?
5. Overview empty-vs-skeleton (item #1) — since this could not be reproduced in code or a real
   browser pass this session, which specific widget/moment was actually observed stuck? Needed
   before any code is written for this item — otherwise there's nothing concrete to fix.
6. `/dashboard/:slug/*` vs. `/:slug/dashboard/*` — `routing.md` already names this an open,
   undecided item. This plan's #11 fixes the *symptom* (Login.jsx's non-canonical redirect,
   URL/tab desync) without resolving whether the non-canonical route pattern should eventually be
   removed/redirected at the `App.jsx` level. Confirm that's acceptable scope, or if the full
   route-table decision should be pulled into this pass too (larger, more architectural).
7. Item #13 (duplicate requests) — leave tracked-but-deferred as currently planned, or pull into
   this pass?
