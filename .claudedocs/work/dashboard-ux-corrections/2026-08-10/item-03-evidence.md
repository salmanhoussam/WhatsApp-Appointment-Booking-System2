# Item #3 — Reservations DatePicker — Evidence

Follows: `.claudedocs/implementation/DASHBOARD_UX_CORRECTIONS_CONTRACT.md`, Section B.3.

## What Was Implemented

New `frontend/src/pages/generic-admin/components/DatePicker.jsx` — same architectural pattern as
the already-proven `Dropdown.jsx` (button/field trigger + an app-controlled, fixed-position panel
that opens below and clamps to the viewport, never native OS chrome). Supports both a typed
`MM/DD/YYYY` entry (auto-inserts `/`, validates against real calendar dates, rejects cleanly on an
invalid date by reverting to the last valid value) and a calendar-grid picker. Wire format is
unchanged — still the same ISO `YYYY-MM-DD` `load()` already sends.
`frontend/src/pages/generic-admin/tabs/ReservationsTab.jsx`'s date-filter row now uses it in place
of the native `<input type="date">`.

## Bug Found and Fixed During Verification

First real-browser pass (2026-08-10) crashed the entire app on opening the calendar panel:
`ReferenceError: navBtnStyle is not defined` at `DatePicker.jsx:319` — a style constant was
referenced in the month-nav prev/next buttons but never defined. The crash propagated past any
error boundary (`document.getElementById('root').innerHTML.length === 0` — full white screen).
Fixed by adding the missing `navBtnStyle` module-level constant. Re-verified clean on a fresh dev
server restart (no HMR carry-over) afterward.

## Real Verification (nested Playwright, real TENANT_ADMIN, fresh server restart)

**Desktop (1440×900):**
- Field shows `08/11/2026` (MM/DD/YYYY) + a separate "فتح التقويم" calendar-icon button — confirmed
  not a native date input.
- Opened panel: no crash, `root.innerHTML.length` = 44285 (alive), showed أغسطس 2026 with day 11
  correctly highlighted as selected.
- Clicked day 20 → panel closed, field → `08/20/2026`, real network request
  `GET /reservations/?date=2026-08-20&limit=200&client_slug=rk` → 200 OK, list updated correctly.
- Typed `08/05/2026` + Enter → field updated, list re-fetched (200 OK), 6 real rows shown.
- Typed invalid `13/45/2026` + Enter → cleanly reverted to the last valid value (`08/05/2026`), no
  crash, no error toast, underlying filter never received the bad date.
- Console: 0 errors, 0 warnings.

**Mobile (390×844):** no horizontal overflow (`scrollWidth` 390 = `innerWidth` 390). Real bounding-
rect check confirmed the open panel (`top:170.5 / bottom:451.5`) does not overlap the fixed bottom
nav bar (`top:765`) and is not clipped off-screen. Picked a day, confirmed it worked, no crash.

## Acceptance

✅ Ships clean after the one real bug found+fixed mid-verification, per this project's own Browser
Verification Restart Rule — the full pass above is the POST-fix evidence, not mixed with the earlier
crash.
