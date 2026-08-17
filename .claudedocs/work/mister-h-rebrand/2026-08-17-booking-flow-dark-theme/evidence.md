# Booking Flow Dark Theme — Purple/Gold Identity — Evidence

Part of the larger "Mr. H — Frontend UI Direction" brief. This pass covers the first, most
foundational piece: the real booking flow (`ReservePage.jsx`, `mode === 'booking'`) was, before
this change, a completely separate hardcoded light theme (white cards, green accent) — confirmed
by direct code read, not assumed. It never read the tenant's own `primary_color` at all, which is
why the booking experience felt visually disconnected from the dark homepage on every reservations
tenant, not just Mister H.

## What changed

`frontend/src/pages/generic/normal/ReservePage.jsx` — the entire `mode === 'booking'` UI (`
LightLoadingDot`, `NumberedSection`, `ServiceCircle`, `StaffCarousel`, `CalendarPanel`,
`SummaryCard`, `ConfirmPanel`, `InlineConfirmation`, `BookingPage`, plus the loading/error states in
the top-level `ReservePage`) rebuilt on a new dark token set (`DT`), with:
- Every selected/active state driven by the tenant's real `config.primary_color` (`accent`) —
  previously 100% hardcoded to green, now genuinely per-tenant.
- A single restrained secondary highlight (`GOLD = '#D9A441'`) used sparingly: price text, the
  calendar's "today" ring (distinct from the purple "selected" fill), and the confirmation
  checkmark — never as a dominant color.
- Time slots converted from a wrapping grid to a horizontal scroll-snap pill strip (same pattern
  the services carousel already used), per the explicit "horizontal time-slot pills" requirement.
- `StaffCarousel` now renders a real barber photo (`barber.image_url`) when available — it never
  did before, even though the field already existed on the API response.
- Page background carries the same purple-radial-into-black treatment as `HeroSection.jsx`'s
  default gradient, so the booking flow now reads as a continuation of the homepage.

This is shared, tenant-agnostic code (`ReservePage.jsx` serves every reservations-vertical tenant),
so the fix applies to RK too, not just Mister H — confirmed intentional and verified below.

## Live verification

| Check | Result |
|---|---|
| Mister H, desktop | Service circles (purple ring + gold price+duration), staff card (purple ring, real "Ali" placeholder), calendar (dark surface, purple selected day, gold today-ring), horizontal gold/purple time pills — screenshot confirms all |
| Mister H, mobile (390px) | Confirm panel + summary card stack cleanly, zero overflow, gold price line, purple secondary CTA |
| RK, desktop | Same components now render with RK's own real `primary_color` (`#2F4F4F`, a dark teal — not gold, corrected an earlier session assumption) — confirms `accent` threads correctly per-tenant, not hardcoded to any one color |
| Console | 0 errors on both tenants |
| ESLint | 2 pre-existing findings unchanged (confirmed via `git diff`, not introduced): the repo-wide `motion` unused-var false positive, and `ServiceCircle`'s `Icon = serviceIconFor(...)` pattern — both existed before this change |

## Real bug hit and fixed during this pass (infrastructure, not this change)

Both dev servers (`uvicorn`, `vite`) were found down mid-verification (`net::ERR_CONNECTION_REFUSED`
on first navigation attempt) — unrelated to this edit (a JS error would show a Vite overlay, not a
connection refusal). Restarted both manually; confirmed real requests succeeding immediately after.

## Not changed in this pass

- `useReservationBooking.js` and all booking state/API logic — completely untouched, only
  presentation changed. No risk to the already-verified reservation creation flow.
- The single-scrolling-page structure itself (vs. a stepped wizard with back navigation) — that's
  a separate, larger decision from the full brief, not addressed here.
- Language switching / RTL infrastructure — confirmed unbuilt for tenant pages, separate phase.
- `FeaturedItemsSection`/`CatalogItemCard` (homepage services list) — still lacks a duration field
  and uses an "add to cart" CTA instead of "book"; not touched this pass.
