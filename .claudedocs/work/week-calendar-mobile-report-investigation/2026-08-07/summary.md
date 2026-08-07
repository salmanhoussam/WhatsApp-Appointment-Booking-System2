# Week Calendar "Collapsed Grid" Report — Investigation

**Date:** 2026-08-07 | **Type:** Investigation only, no fix applied — none was needed.

A user message described a mobile-viewport bug (Week Calendar's 7-column grid collapsing to a
single vertical column, oversized text) with a Tailwind-CSS-flavored technical diagnosis
(`md:grid-cols-7`, `flex-col`, `text-xs md:text-sm`). No image was actually attached to the message.
Before touching any code, per this project's own "real browser evidence first, code inspection
second" standing rule, verified the claim directly.

## Confirmed Findings

- `ReservationsWeekCalendar.jsx` does not use Tailwind CSS anywhere — it's built entirely with
  inline React style objects, confirmed by reading the file directly. The specific classes named in
  the report don't exist in this codebase's implementation of this component.
- Real code, `ReservationsWeekCalendar.jsx:454`: `gridTemplateColumns: '56px repeat(7,
  minmax(120px, 1fr))'`, `minWidth: 900` — a fixed 7-column grid, deliberately wider than a mobile
  viewport, meant to scroll horizontally, not collapse.
- Real Browser Verification at a confirmed 390×844 viewport (`window.innerWidth`/`innerHeight`
  read back as exactly 390/844):
  - Computed `gridTemplateColumns`: `56px 120.562px 120.578px 120.562px 120.578px 120.562px
    120.578px 120.562px` — a genuine 8-track (1 gutter + 7 day) grid.
  - All 7 day-column headers share the same `top` (293) with 7 distinct `left` offsets
    (~120.6px apart) — proves real horizontal layout, not vertical stacking.
  - `scrollWidth` 900px vs `clientWidth` 326px, `overflow-x: auto` confirmed — the intended
    scroll mechanism, working as designed.
  - Scrolling actually rotated different day columns into view (screenshots before/after).
  - No literal "أغسطس 2026" month header exists in this UI; the closest real text (week summary,
    day-number labels) measured 11px/13px — normal for a 390px viewport, not oversized.
- **Verdict: the reported bug is not real.** No code was changed.

## Side Finding (real, unrelated to the reported symptom)

10 genuine `500 Internal Server Error` responses fired on core admin endpoints
(`/catalog/categories`, `/catalog/items`, `/reservations/stats`, `/store/orders`, `/barbers/`,
`/reservations/`) during the verification pass, causing a stuck "جارٍ التحميل..." loading state on
first render; a later re-check on the same session found the page had recovered and rendered real
data. This matches the same class of intermittent Supabase pooler connectivity issue that separately
affected this session's own backend restarts during Phase 3.7A (`aws-1-ap-southeast-2.pooler.
supabase.com:6543` unreachable for several minutes, confirmed via raw TCP checks). Not root-caused
here — flagged as a real, recurring reliability question, not a new one-off.

## Unknowns

- Root cause of the intermittent 500s/pooler unreachability was not investigated in either
  occurrence this session — both times, the workaround was retrying until a healthy window, never a
  real root-cause fix.
- Whether the original report was based on a genuinely stale screenshot (an old cached build), a
  moment during one of these 500-error windows (a degraded loading state can visually resemble a
  broken layout), or something else entirely was not determined — no image was ever actually
  available to compare against.
- Real touch-drag horizontal scrolling was not exercised (only programmatic `scrollLeft`).
