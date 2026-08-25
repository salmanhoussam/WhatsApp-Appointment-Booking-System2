# Alzabt Landing Page — Content Expansion (offerings, real screenshots, roadmap)

Follows: `service-execution-constitution.md` (evidence discipline), `investigation-protocol.md`
(Confirmed/Side Findings/Unknowns report structure).

## Request (Salman, 2026-08-25, via /bo-hussein)

Colors on the page were confirmed good, but wanted more content: a clear statement of what the
product offers (websites/pages, the reservation system, customer registry), real dashboard/page
images, an honest note that Barber is the first booking pattern being actively built, a mention
that an online shop can also be built on the same page, and a note that Clinic/Beauty are future
choices.

## Investigation before building

Confirmed via a real Explore pass that the target page is `frontend/src/pages/alzabt/
AlzabtLandingPage.jsx` (the full `/alzabt` marketing page, the one carrying the "Violet Confidence"
`#7C3AED` palette Salman referred to as "colors are good") — not `ProductShowcaseHome.jsx`'s summary
teaser, not `AlzabtProductSection.jsx`'s embedded card. Confirmed the page had no dashboard/booking
screenshots at all (explicit comment in the file: "3 real steps, not a screenshot"), and no mention
anywhere of customer registry, online shop, or future verticals. Confirmed no real product
screenshots existed anywhere in the repo — `new-matirial/alzabt/` only holds competitor-reference
images analyzed in Master Plan Section C, not Alzabt's own product.

Checked `ALZABT_MASTER_PRODUCT_PLAN.md` Section A's Rollout Priority (Barber = current/sole
priority, Clinic = next-phase/gated, Real Estate = not now) against the request — concluded no
conflict: naming Clinic/Beauty as "قريباً" on the marketing page is roadmap communication, not
pulled-forward build work; no Clinic code was touched. The "online shop" mention was checked against
real running state, not assumed: RK's own real dashboard sidebar and real booking-page nav both show
an active "المتجر" (Store) entry point (confirmed live in the screenshots captured for this task) —
`store`/Catalog is an already-live capability, so this claim is accurate today, not speculative
marketing. Appended a dated note to Section A recording this (not a rewrite).

## What was built

**File 1**: `frontend/src/pages/home/../alzabt/AlzabtLandingPage.jsx`
- New `OFFERINGS` array + section ("شو بنقدملك بمنصة وحدة؟") — 4 cards: website/booking page,
  reservation system, customer registry, dashboard — using the existing Violet Confidence card
  pattern already established in the file (`V.cardBg`/`V.cardBorder`/`V.violetSoft` tokens).
- New real-screenshot section — two `<figure>` cards, `booking-page.png` and `dashboard.png`
  (captured this session, see below), each in a fixed-height (460px) `object-fit: cover` frame so
  both cards render at a uniform size regardless of the underlying screenshots' different aspect
  ratios (first pass without this fix produced a visibly lopsided layout — caught and fixed before
  finalizing, see Confirmed Findings).
- New `ROADMAP` array + section — 3 cards: "هلأ عم نبني: صالونات الحلاقة" (active), "متوفر كإضافة:
  متجر إلكتروني بنفس الصفحة" (active), "قريباً: كلينكات وصالونات تجميل" (inactive/muted styling).
- The existing Hero, 3-step proof, Benefits, Closing CTA, and Footer sections are unchanged.

**File 2**: `frontend/public/assets/alzabt/booking-page.png` + `dashboard.png` — real screenshots,
captured via a nested Playwright session against the actual running local dev servers.
- `booking-page.png`: RK's real `/rk/reserve` page, fully loaded (services + barbers + real
  calendar), not a loading/preloader state.
- `dashboard.png`: RK's real `/rk/dashboard/overview` page, **cropped** (`(0,0,1067,730)` via PIL)
  to keep only the KPI stat cards + order-distribution + revenue-chart rows. The uncropped version
  included a real "آخر النشاطات" activity feed exposing internal QA test-order names
  (`PHASE-A-TEST-1-DIFFERENT-NAME`, `AUDIT-GUEST-VERIFY`, `DRAG-TEST-VERIFY`, etc.) — not
  appropriate for a public marketing page. Cropped, not faked: the visible content (stat cards,
  donut, chart) is real, unedited RK data.

**File 3**: `.claudedocs/implementation/ALZABT_MASTER_PRODUCT_PLAN.md` — a dated note appended
under Section A's Rollout Priority (original text unchanged), recording this content expansion and
why it doesn't conflict with the standing Barber-only build-order rule.

## Confirmed Findings

1. **Real credentials still work.** `rkbarber@dev.invalid` / `password123` against
   `POST /api/v1/auth/users/login` returned a valid `TENANT_ADMIN` JWT for `rk` — used only to
   capture screenshots, no data was written.
2. **Both screenshots required a retake.** First pass caught `/rk/reserve` mid-preloader (a single
   gold dot on black) and the dashboard's calendar view mid-skeleton-load ("جار التحميل..."). Fixed
   by waiting longer and evaluating real page text (`document.body.innerText`) before trusting a
   screenshot, rather than a fixed short delay.
3. **The dashboard's default calendar/day view was a poor screenshot choice independent of
   timing** — "اليوم" (today, 2026-08-25) has zero real reservations scheduled, so the calendar view
   itself is legitimately empty. Switched to the Overview tab instead, which shows real non-empty
   stats (4 orders today, real revenue-trend chart, real category/product counts).
4. **A real, unplanned privacy/professionalism issue was caught before shipping**: the Overview
   tab's full page includes a real "آخر النشاطات" feed that names internal QA test artifacts by
   their literal test-run labels. Caught by looking at the actual screenshot pixel content (not
   just checking "did it load"), fixed by cropping to the KPI section only via a real PIL crop,
   verified by re-reading the cropped file.
5. **First implementation pass produced a visibly lopsided two-image layout** — the tall,
   narrow-aspect `booking-page.png` next to the short, wide-aspect cropped `dashboard.png` at
   `width: 100%, height: auto` created a large empty-space imbalance. Caught by rendering and
   visually reading the actual screenshot (not just checking `img` count/200-status), fixed with a
   fixed-height `object-fit: cover` frame on both.
6. **Real browser verification of the final page** (`/alzabt`, desktop): 0 console errors, both
   images return `200 OK` (`GET /assets/alzabt/booking-page.png`, `GET /assets/alzabt/dashboard.png`),
   and all four target copy strings present in the real DOM
   (`document.body.innerText`): "شو بنقدملك بمنصة وحدة؟", "هلأ عم نبني", "متجر إلكتروني", "كلينكات".
7. **Real mobile-viewport check** (390×844): `document.documentElement.scrollWidth` (375) equals
   `clientWidth` (375) — no horizontal overflow; the new sections stack to a single column using
   the same `repeat(auto-fit, minmax(...))` responsive pattern already used elsewhere in this file.

## Side Findings

- None beyond what's already logged in Confirmed Finding 4 (the test-data exposure caught before
  shipping, not after).

## Unknowns

- No explicit visual sign-off from Salman on the exact copy/wording chosen for the four offering
  cards and three roadmap cards — drafted directly from his verbal description per this session's
  Auto Mode bias toward action; he can redirect specific wording if it doesn't match his intent.
- The screenshots reflect RK's state as of 2026-08-25, 14:4x local time — if RK's dashboard/booking
  UI changes meaningfully later, these images will visually drift from the live product and may need
  a refresh (no automated re-capture mechanism exists for this).

## Verification checklist

- [x] Real Explore-agent investigation of the correct target page before writing any code.
- [x] Real screenshots captured against the actual running dev servers (not stock/mock imagery).
- [x] A real privacy issue in the raw screenshot caught and fixed before shipping.
- [x] Real browser pass confirming 0 console errors, both images 200 OK, all target copy present.
- [x] Real mobile-viewport check confirming no horizontal overflow.
- [x] Master Plan doc updated (append-only) to record the decision and why it doesn't conflict with
      the standing Rollout Priority rule.
