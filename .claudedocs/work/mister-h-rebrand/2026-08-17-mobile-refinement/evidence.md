# Booking Flow Mobile Refinement — Evidence

Response to a detailed mobile UI refinement brief (target reference image + a screenshot of the
"current state" showing visible white margins around a narrow content column). Investigated the
white-margin claim directly rather than assuming it was a real CSS bug — see Confirmed/Not-a-bug
split below.

## Confirmed real bug found and fixed

`document.documentElement.scrollWidth` measured 400px against a 390px viewport on first check — a
genuine ~10px horizontal overflow. Root-caused to `CalendarPanel`'s own two-column grid:
`gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'` forced a **minimum** 280px column
even when the real available width (after page/card/panel padding) was only ~254-296px on a
390px viewport, on both `CalendarPanel`'s internal grid and the `ConfirmPanel`+`SummaryCard` grid
below it. Fixed by changing both to `minmax(min(280px, 100%), 1fr)` -- a well-understood CSS
pattern: the minimum becomes `100%` on any container narrower than 280px (never overflows), and is
byte-identical to the old behavior on anything wider (desktop unaffected). Verified via a clean
fresh-tab measurement (a stale/shared Playwright session had been reporting inconsistent viewport
sizes mid-session -- confirmed a tooling artifact, not a real one, by opening a genuinely fresh tab
and re-measuring): `scrollWidth === clientWidth` exactly at all three required widths --
**390px** (375/375), **375px** (360/360), **360px** (345/345).

## Investigated, found NOT to be a real bug

The attached "current state" screenshot showed visible white/light margins around a narrow dark
column, with a resize-handle icon and scrollbar indicator visible in the frame. A clean Playwright
screenshot (no browser chrome) at the same 390px width showed the actual page content filling the
viewport edge-to-edge already (only the design system's normal ~20-24px card padding, not a bug).
Conclusion: the white margins in that screenshot came from the browser/DevTools chrome around an
emulated device frame during capture, not from the app's own CSS. Not silently dismissed --
verified with fresh evidence before concluding, rather than either blindly trusting or blindly
rejecting the report.

## What changed (code)

`frontend/src/pages/generic/normal/ReservePage.jsx`:
1. `CalendarPanel` + `ConfirmPanel`/`SummaryCard` grid: `minmax(280px, ...)` → `minmax(min(280px,
   100%), ...)` (the real overflow fix above).
2. New `BarberCard` component + rewritten `StaffCarousel`: barber selection was single-focus paging
   (one card + prev/next chevrons) regardless of list length -- confirmed against the real
   reference image, which shows every barber in a row at once. Now: **≤4 barbers → wrapping row,
   all visible at once, no scrolling** (matches the reference); **>4 barbers → the same horizontal
   scroll-snap pattern already used for services/time-slots** (one consistent swipe pattern site-
   wide, not a bespoke prev/next control). Cards are portrait-photo cards (3:4 image + name label
   strip below), not small circular avatars -- closer to the reference's card shape. Real photo
   used when `barber.image_url` exists, same icon fallback as before otherwise.
3. Compact breadcrumb subtitle ("اختر الخدمة · اختر الحلاق · اختر الموعد · تأكيد") replacing a
   single paraphrased sentence -- states the whole 4-step flow at a glance, matching the reference.

## Live verification

| Check | Result |
|---|---|
| Overflow, 390/375/360px | `scrollWidth === clientWidth` exactly at all three, fresh tab, both Mister H and RK |
| Mister H barber row (1 real barber) | Single portrait card, purple ring, checkmark badge, name label |
| RK barber row (service-filtered to 1 of its 2 real barbers for the currently selected service) | Same card treatment; confirmed this is real, pre-existing `BarberService` data (documented earlier this session: RK's staff-to-service linkage is only 2 of 12 possible pairs) surfacing through unchanged filtering logic -- not a regression from this change |
| Console | 0 errors, both tenants, all three widths |
| ESLint | Same 3 pre-existing findings as before this pass, none new |

## Explicitly NOT attempted this pass (scope discipline, not oversight)

Per the brief's own §15 ("don't change business logic") and the realistic size of the remaining
ask, these are still open and were not silently skipped:
- **Sticky/anchored bottom CTA** -- the brief itself only permits this "only if it doesn't cover
  content"; reworking the two-button (WhatsApp/local-form) `ConfirmPanel` into a safe anchored bar
  is a real interaction-design decision, not a safe one to rush.
- **Header logo/icon mark** -- would need either a real uploaded tenant logo (none exists) or a
  generic decorative icon; flagged rather than invented.
- **Arabic/English language switch + real RTL/LTR** -- confirmed in an earlier pass to be entirely
  unbuilt for tenant pages. The brief explicitly forbids partial translation; this needs its own
  dedicated, complete pass across every section, not a partial attempt here.
- **Back button per step** -- still not built. The flow remains one continuous scroll (state is
  preserved by construction), not stepped views with a back action.
- **Typography/spacing final pass** -- not audited line-by-line this round beyond what the two
  concrete fixes above touched.
