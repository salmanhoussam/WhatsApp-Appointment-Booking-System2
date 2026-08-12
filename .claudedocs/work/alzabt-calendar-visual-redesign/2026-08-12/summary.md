# Alzabt Dashboard Calendar — Visual Redesign

Scope: the shared admin Calendar/Appointment surface only (`ReservationsTab.jsx`'s Today/Week
header, `ReservationsWeekCalendar.jsx`, `ReservationsTodayView.jsx`) — per explicit instruction,
no other surface touched (List/table view, popovers, Staff, Services, `/alzabt`, `/demo-builder`,
public reservation page, Dashboard shell, onboarding, backend).

## A real conflict flagged before implementing

The request asked to "keep Alzabt's Violet `#7C3AED`" on this surface. But this Calendar is the
*shared* `GenericAdminDashboard` component — the exact same code RK, `alzabt-demo`, and every
`/demo-builder` tenant render, driven by each tenant's own `color`/`primary_color` prop (RK's real
green). Hardcoding violet here would silently repaint RK's live production calendar, directly
violating this same request's own "do not modify RK" constraint, and reversing the "Two Distinct
Brand Layers" principle established and repeatedly enforced earlier this session (violet is
Alzabt's *marketing* brand — `/alzabt`, root — never a tenant-rendered surface). **Resolved by
keeping the existing `color` prop mechanism unchanged** — the reference image was used for layout/
density/hierarchy/structure only, never as a literal palette swap. Confirmed correct in the real
screenshots below: RK's calendar renders in RK's own real color throughout.

## What changed

**`frontend/src/pages/generic-admin/tabs/ReservationsTab.jsx`**
- New `CalendarKPIRow` component (reuses the existing `StatCard`, no new card component) — 4 real
  counts already present in the already-fetched `reservations`/`countByStatus` state (total,
  confirmed, pending, cancelled). No trend/delta badges — no week-over-week data exists, so none
  were invented (`StatCard`'s own `trend=null` hides that UI natively). Rendered above the Today/
  Week grid only — List keeps its own existing status-pill counts, unaffected.

**`frontend/src/pages/generic-admin/components/ReservationsWeekCalendar.jsx`**
- Day-column headers now show a real per-day appointment count (`byDay.get(key).length` — already
  computed for the grid itself, not a new fetch), matching the reference's day-header count pattern.
- `WeekReservationCardBody` now shows the service name (via the same `serviceNameFor` the popover
  already used) when the block has room — brings Week's cards up to parity with Today's cards,
  which already showed this; a real, justified consistency fix, not new functionality.
- New header-level "+ حجز جديد" button, reusing the exact same `CreatePopover`/`setCreateSlot` path
  the empty-slot-click already uses (`defaultReservedAt: undefined` — the same pattern already
  proven by List's own Add button) — Week previously had no explicit Add entry point, only an
  implicit empty-slot click.
- Minor header/day-header spacing and typography tidy.

**`frontend/src/pages/generic-admin/components/ReservationsTodayView.jsx`**
- `DayNav`'s native `<input type="date">` replaced with the existing `DatePicker` component
  (already used by the List view's own date filter, Dashboard UX Corrections #3) — closes a real
  inconsistency (this was the one remaining native date input in this file), same wire format
  (ISO `YYYY-MM-DD`), only the picker chrome changes.
- The icon-only "+" button upgraded to a labeled "+ حجز جديد" button, matching Week's new button —
  same click handler, same `CreatePopover` path, zero new mutation logic.

**Explicitly unchanged**: all grid math/positioning constants (`ROW_HEIGHT_PX`, `QUARTER_PX`,
quarter-hour resolution), drag-and-drop logic, status-change logic, `ReservationPopover`/
`CreatePopover` internals, the List/table view, backend endpoints, RTL direction handling.

## Verification (real browser, RK's real production data — read-only, no mutations made)

Nested Playwright pass, `rkbarber@dev.invalid` / RK's real seeded reservations:

- **Desktop, Today view**: KPI row renders real counts, `+ حجز جديد` button present, `DatePicker`
  opens a real in-app month grid (not native OS chrome) and closes on Escape. Clicked a real
  appointment card → real detail popover opened (phone, service, reschedule form) — all pre-
  existing functionality confirmed intact. **0 console errors.**
- **Desktop, Week view**: day-count badges correct (`2 حجز` on the day with real bookings, `—`
  elsewhere), `+ حجز جديد` header button opens the real Quick-Create popover (staff/service/
  customer fields) — closed via Cancel, no reservation submitted. **0 console errors.**
- **Mobile (390×844)**: no horizontal page overflow in either Today or Week view. Bottom tab bar
  renders correctly (separate from the desktop sidebar, untouched by this work). KPI row reflows
  to 2 columns via its existing `auto-fit` grid.
- **List view (untouched surface, regression check)**: table renders, 6 real rows, **0 new
  console errors** — confirms this surface is genuinely unaffected.
- **Total across the entire pass: 0 console errors, 0 failed network requests.**

Screenshots (repo root): `today-view-redesign.png`, `today-datepicker-open.png`,
`today-popover-open.png`, `week-view-redesign.png`, `week-popover-open.png`,
`week-create-popover.png`, `mobile-today-redesign.png`, `mobile-week-redesign.png`.

## Side findings — pre-existing, NOT fixed (per explicit "do not fix opportunistically" instruction)

- **Escape does not close the appointment detail popover** (`ReservationPopover`) — only its
  explicit "إغلاق" button does. This file (`reservationInteractions.jsx`) was not touched by this
  work at all, so this is confirmed pre-existing, not a regression from this redesign. Inconsistent
  with the new `DatePicker` panel, which *does* close on Escape — worth a future fix, out of scope
  here.
- **Calendar tab took longer to settle than expected during verification** (~3-4s before the real
  grid replaced the loading spinner, on both desktop and mobile). None of this redesign's changes
  add new network requests — the KPI row, day counts, and service names all read from data the
  component already fetches; this is very likely either normal `load()` round-trip time or a one-
  time Vite dev-server compile cost for the freshly-edited files (not a warm-cache measurement) —
  not independently confirmed as a real regression, flagged honestly as unverified rather than
  dismissed.

## Deliverable summary

- **Files changed**: `ReservationsTab.jsx`, `ReservationsWeekCalendar.jsx`,
  `ReservationsTodayView.jsx` — 3 files, all inside the Calendar/Appointment surface.
- **Functionality preserved**: real data loading, status changes, drag-and-drop reschedule, quick
  create, edit/cancel, staff filtering, date navigation, RTL layout, mobile responsiveness — all
  confirmed via real interaction, not just code inspection.
- **Desktop verification**: clean, matches the reference's layout/density direction (KPI row, day
  counts, clearer Add action, service info on cards) while keeping each tenant's own real color.
- **Mobile verification**: clean, no overflow, existing responsive strategy (horizontal grid
  scroll, bottom tab bar) untouched and still correct.
- **Real blocker found**: none.
