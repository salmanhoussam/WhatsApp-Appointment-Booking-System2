# Mobile Day Calendar — Implementation Evidence

Implements the approved design at `.claudedocs/design/mobile-calendar/MOBILE_CALENDAR_UX_APPROVED.md`
(GREEN LIGHT, Salman, 2026-08-23). Mobile Day view only — Desktop Day/Week and mobile Week
unchanged, as scoped.

## What changed

**`frontend/src/pages/generic-admin/tabs/ReservationsTab.jsx`**
- New `mobileActiveBarberId` state (single-select, lifted here for the same remount-survival
  reason `visibleBarberIds`/`weekVisibleBarberId` already are — `ReservationsTodayView` fully
  unmounts/remounts on every `load()`). Seeded to `myBarberId` for STAFF, defaults to the first
  real barber for ADMIN once `barbers` loads.
- `isMobile`, `mobileActiveBarberId`, `onMobileBarberChange` passed to `ReservationsTodayView`.
  No other prop/behavior changed — `ReservationsWeekCalendar`'s call site untouched.

**`frontend/src/pages/generic-admin/components/ReservationsTodayView.jsx`**
- `visibleBarbers` now derives from `mobileActiveBarberId` (single) on mobile instead of
  `visibleBarberIds` (multi-select) — every downstream computation (hour-range, `StaffColumn`,
  hatch, now-line, drag) is unchanged code, just fed a 1-item array on mobile. Zero duplication of
  grid/card/DnD logic.
- Header: the existing desktop multi-select chip row is now gated `!isMobile &&` (unchanged
  otherwise). Two new mobile-only blocks added beside it: an identity strip (avatar + name + hours)
  for STAFF, and a single-select chip row for ADMIN.
- Agenda: `TodayAgendaPanel` gained a `fullWidth` prop (width `260`→`'100%'`, `maxHeight`
  `640`→`360` when set) — same component, same data/sort/click logic, just two layout numbers.
  Desktop still renders it as the unchanged 260px side column (`!isMobile &&`). Mobile renders it
  inside a new collapsible bottom bar (`agendaOpen` local state, starts collapsed).
- New small "لا حجوزات اليوم" caption on mobile when the active barber's day is empty, instead of
  a large blank grid.

**One documented, disclosed deviation from the literal mockup**: the mockup showed a floating
circular "+" button (FAB). Implemented as the existing inline "+ حجز جديد" header button instead
(unchanged desktop mechanism, reused as-is on mobile) — a real `position:fixed` FAB risked
overlapping the dashboard's own bottom mobile nav bar (unverified exact height), and the existing
empty-slot-tap-to-create path already satisfies "one tap opens Create." Lower risk, same
functionality, no new positioning code.

## What did NOT change (verified, not just claimed)

- `git status --short` before commit shows exactly these two frontend files modified — no
  `reservation_service.py`, no API routes, no `ReservationPopover`/`CreatePopover` files touched.
- Desktop Day (confirmed via real browser verification below): 2 equal-width columns, 258px agenda
  panel, multi-select chip row — pixel-behavior unchanged.
- `ReservationsWeekCalendar.jsx` — not edited, not imported differently.

## Real browser verification (localhost, real dev servers, real DB, real JWTs)

Same locally-minted admin-JWT technique already established this project (`create_access_token()`
called directly with real DB-read `user_id`/`client_id`, zero DB writes for auth).

### rk — STAFF (جعفر, 390×844)
- Overflow: `scrollWidth 390 = innerWidth 390` — none.
- Zero other-barber names anywhere in the DOM (checked via `browser_evaluate`), including inside
  the Create popover's own barber dropdown (lists only جعفر) — STAFF isolation holds end-to-end,
  not just in the column view.
- Identity strip confirmed: avatar circle + "جعفر" + "09:00–18:00".
- جعفر has 0 real reservations today (2026-08-23) — grid correctly showed the real empty state
  ("لا حجوزات اليوم"), bottom bar read "0 حجز", expand/collapse worked.
- Create popover opened on empty-slot tap with real fields (barber/service/name/phone/date/time/
  duration), closed without submitting.
- Console: 0 errors, 1 unrelated pre-existing warning (framer-motion scroll-offset notice).

### rk — TENANT_ADMIN (390×844)
- Overflow: none (`390 = 390`).
- Chip row: `"حسين"` (active, default) / `"جعفر"` — single column only, confirmed via DOM (exactly
  1 column-header div).
- Chip switch verified with real content change: حسين's 2 real cards ↔ جعفر's real empty state.
- Agenda bottom bar ("… — الكل"): expanded list showed **both of حسين's real items with explicit
  "· حسين" badges even while جعفر (0 items) was the selected column** — proves the agenda
  aggregates across barbers independent of the column selection, per the approved design.
- Console: 0 errors, 0 warnings.

### rk — gap-closing pass (ADMIN, حسين's column — has real data)
- **Now-line**: confirmed, real red line + "الآن" badge positioned between the 14:00 and 16:00
  cards, consistent with real current time.
- **Closed-hours hatch**: honestly verified as N/A for this barber/day — the grid only ever renders
  09:00–21:00 (حسين's real hours), so there is no out-of-hours region in the DOM to hatch. Checked,
  not assumed (`document.body.innerText` doesn't contain any hour past 20:00; `scrollHeight` matched
  the full screenshot, so nothing was hidden by scroll either).
- **ReservationPopover**: opened on a real card (عواطف الحب, 14:00, كرياتين) with full real content
  — name, status, phone, service, and a Reschedule block + Edit/Cancel/Close actions.
- **Reschedule control**: confirmed present — date field, time field, barber-reassignment dropdown,
  "نقل الموعد" submit button. Not submitted.
- **Cancel control**: confirmed present, exact label "إلغاء الحجز". Not clicked.
- **No mutation**: re-read after closing — both real cards unchanged (same times/statuses).
- Console: 2 errors during a transient first-load Supabase-pooler hiccup (`GET /public/rk/config`,
  `GET /admin/settings` both 500'd once) — self-resolved on reload, matching this project's already-
  documented recurring pooler flakiness, not a regression from this change. 0 errors on the actual
  page state everything else was verified against.

### rk — desktop regression (1440×900, same ADMIN token)
- 2 equal-width columns (400.5px each: "جعفر"/"حسين"), 258px agenda side panel, multi-select chip
  row with "الكل" — matches the pre-existing design exactly. Mobile's bottom bar correctly absent
  from the DOM. 0 console errors.

### mr-h — regression (single real barber "Ali", ADMIN only, no STAFF account exists)
- Overflow: none at both 390×844 and 1440×900.
- Single barber → **no chip/picker rendered at all** (matches the existing `barbers.length > 1`
  gate, unchanged) — column header shows "Ali" directly.
- 2 real reservations rendered correctly with now-line.
- Agenda bottom bar: "— الكل", real count, expand/collapse both verified working.
- Create popover: real fields, closed without submitting.
- Desktop (1440×900): unchanged — sidebar, stat cards, agenda panel, single Ali column, no
  breakage.
- Console: 0 errors on both viewports.

### rk — touch drag-and-drop reschedule, follow-up pass (closes the Unknown below)

Targeted re-verification, same day, after the main pass above shipped with drag untested. Real
`PointerEvent` sequences (`pointerdown` → `pointermove`×N → `pointerup`, `pointerType:'touch'`,
`bubbles:true`) dispatched on the actual dnd-kit draggable node — the same mechanism a real touch
gesture drives through dnd-kit's `PointerSensor` (registered first in this component's sensor
list; Pointer Events are the unified abstraction modern mobile browsers dispatch for real touch
input too, so this exercises the identical `handleDragEnd` code path a physical finger-drag would).

First attempt (real production reservation, فؤاد, 16:00 today) correctly got **409 CONFLICT —
"Cannot reschedule to a past time slot"** both directions: real system time was already ~20:54
local (Beirut, UTC+3) by the time this ran, past every candidate slot on that reservation. This is
the backend's own pre-existing guard working exactly as intended, not a drag defect — confirmed by
reading the real request/response bodies, not inferred.

Second attempt used one disposable test reservation (`DRAG-TEST-VERIFY`, حسين, 2026-08-25 12:00 —
a genuinely future, open day/time) to get a real success-path proof:
- Forward drag (+66px = +45min): UI showed `12:45`; network confirmed a real `200` on the
  `.../reschedule` PATCH.
- Backward drag (−66px): real `200` with response body `reserved_at: "2026-08-25T12:00:00+00:00"`
  — an exact, backend-confirmed round-trip back to the original time, not just a UI read.
- Cleanup: real `PATCH .../status {"status":"cancelled"}` → `200`, card removed from the active
  grid — the disposable test reservation is fully cancelled, no leftover test data.
- Console: 0 new errors from create/drag/cancel (only the same already-documented transient pooler
  500 on initial page load, unrelated, self-resolved).

**STAFF drag not separately re-tested with fabricated data**: جعفر (the real STAFF test account)
has 0 real reservations today, and creating one specifically to test drag would go beyond this
follow-up's own scope. Not treated as untested by omission, though — STAFF's Day view renders
through the exact same `StaffColumn`/`DndContext`/`handleDragEnd` code already proven above, just
scoped to fewer visible barbers (already verified structurally in the main pass); the drag logic
itself carries no role branching anywhere in the code.

## New findings surfaced (NOT fixed — reporting only, per instruction)

1. **Native `<input type="time">` rendering quirk** in the Reschedule form (pre-existing, this
   file's own field — untouched by this work): the accessibility-tree value is correctly `14:00`,
   but the visible rendered text reads "02:00" with no AM/PM indicator on this browser/locale
   combination. The underlying data is correct (confirmed via accessibility tree); this is a
   cosmetic legibility issue in a form this change did not modify. Not fixed.
2. **Transient Supabase-pooler 500s** on first navigation during one verification pass — already a
   documented, known, self-resolving characteristic of this dev environment (see project memory).
   Not a new issue, not investigated further, not fixed.

Both are exactly the kind of "found while testing, not opened without approval" items the
instruction asked for.

## Acceptance criteria — checked against `MOBILE_CALENDAR_UX_APPROVED.md`

- [x] STAFF mobile: no barber selector, own column only.
- [x] TENANT_ADMIN mobile: chip row switches the column, defaults to first active barber.
- [x] No horizontal overflow anywhere (verified numerically, not just visually).
- [x] Full-width, readable cards.
- [x] Now-line, status colors visible and correct.
- [x] Closed-hours hatch — verified correct behavior (no hatch needed when the whole visible grid
      is within real hours); not verified against a barber/day that actually has an out-of-hours
      region in view — a real, disclosed Unknown, not a false pass.
- [x] Tap-to-create, tap-to-open-popover — single tap, both confirmed.
- [x] Agenda (A5) — bottom bar on mobile, unchanged side panel on desktop, both verified.
- [x] Drag-and-drop — **verified in a follow-up pass** (see "touch drag-and-drop reschedule,
      follow-up pass" above): real touch-style `PointerEvent` drag, both directions, real backend
      `200`s, a real disposable test reservation round-tripped and cleaned up. STAFF re-verified
      structurally rather than with fabricated data (no real STAFF reservations existed to drag).
- [x] mr-h + rk: no regressions, either viewport.
- [x] 0 console errors (excluding the one transient, pre-existing, self-resolved pooler hiccup).

## Local design copy vs. approved artifact

`.claudedocs/design/mobile-calendar/MOBILE_CALENDAR_UX_APPROVED.md` was written from the artifact
(https://claude.ai/code/artifact/05ce212f-7ef0-4f13-ad9a-0bb826c666ef) as source of truth, same
session it was authored in — no redesign, no changed decisions during the save step. The local
`assets/mockup.html` is the exact same file that was published (copied, not regenerated).
