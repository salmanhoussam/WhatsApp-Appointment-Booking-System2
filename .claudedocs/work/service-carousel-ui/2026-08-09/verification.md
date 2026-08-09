# Service Selection — Circular Horizontal Carousel — Verification

UI-only change, requested directly by Salman: convert `/rk/reserve`'s service-selection cards
(rectangular, wrapped grid) into a horizontal swipe carousel of circular photo/icon items. No
backend, API, reservation logic, or selection-state change — confirmed by design (only
`ServiceCircle`'s render output and its wrapping scroll container changed; `chooseService`/
`selectedServiceId` from `useReservationBooking.js` untouched).

## Changes

- `frontend/src/pages/generic/normal/ReservePage.jsx`: `ServiceCard` → `ServiceCircle` (circular
  image/icon, ring + small check badge on selection, no size jump — `box-shadow` ring only, not a
  scale transform). Falls back to the existing `SERVICE_ICONS` lucide icon set (no backend field
  invented) when `item.image_url` is null — true for all of `rk`'s real services today (`price`,
  `duration_min` real; `image_url` null across all 8, confirmed via a direct API check before
  writing any code). Renders a real `<img>` automatically once a service gets a real photo via the
  existing `catalog_service` upload context (already wired, Staff/Store IA Separation session).
  Services section wrapped in a horizontal `overflow-x: auto` scroll-snap container with a subtle
  edge mask-image fade, RTL-aware (verified below).

## Real Browser Verification (mobile 390×844, `rk`)

- **Circles, not cards**: all 8 real service items confirmed `borderRadius: 50%`, `72×72`, via
  direct DOM query — not inferred from a screenshot alone.
- **Real horizontal scroll**: `scrollWidth: 806px` vs `clientWidth: 281px` on the scroll
  container — confirms genuine overflow with a visible next-item peek, not a static row.
- **Swipe/scroll actually works**: `scrollLeft` measurably changed (`0 → -102`, RTL-correct
  direction — Chrome runs `scrollLeft` negative when scrolling forward in an RTL container),
  screenshot confirms different items in view before/after.
- **Selection state correct**: newly-selected circle shows a `3px` solid green ring
  (`box-shadow: 0 0 0 3px rgb(22,163,74)`) and a separate green check-badge child element with a
  white check icon; the previously-selected circle's ring/badge correctly disappeared
  (single-select preserved).
- **Downstream state correct**: the Summary Card ("ملخص الحجز") updated to the newly-selected
  service name immediately after the click — proves `chooseService`/`selectedServiceId` wiring is
  untouched and still correct.
- **Staff section unaffected**: "2. اختر الحلاق" renders exactly as before, no visual/structural
  regression.
- **No new errors**: 0 console errors/warnings, 0 network requests ≥ 400 across the full session
  (including the fresh `barbers`/`availability` calls the new selection triggered) — the known
  intermittent pooler-related 500s on these same endpoints (separate, already-reported Production
  Blocker) did not recur in this particular run; not claimed as fixed, unrelated to this change.

## Side Note (not a defect, flagged for awareness)

Services took ~3-5s to appear after page load in this run (sequential API calls before the
carousel had data) — a perceived-latency item, separate from this shape/interaction change, not
investigated further here.

## Verdict

**Meets the acceptance criterion as stated**: service selection now presents as a fast, modern
visual carousel rather than an admin-style card grid, with real interaction (not just a static
screenshot) verified end-to-end.
