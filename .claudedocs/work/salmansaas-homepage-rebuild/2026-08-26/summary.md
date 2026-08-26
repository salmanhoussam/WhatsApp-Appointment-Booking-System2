# SalmanSaaS Homepage Rebuild — 3-Tab Vertical Switcher

Follows: `service-execution-constitution.md`, `investigation-protocol.md`.

## Request lineage (same session, same day)

1. Salman asked to inspect `Home-Page-main/` (a disconnected 2026-07-04 prototype, `salmansaas-landing`)
   and consider rebuilding it as a literal "tower" homepage — each service a room in a real tower.
2. Investigation found: standalone Vite project, never wired into the live app, never actually
   implemented the tower/room concept (zero matches for tower/floor/room in its code) — a generic
   8-section template that stopped short of the ambition. Salman confirmed the tower page should
   replace the live root `/` (`ProductShowcaseHome.jsx`), needed before 2026-08-31, with an Alzabt
   section opening the demo builder.
3. Built and published a **Tower Concept Lab** artifact — 3 real, interactive comparisons (2.5D
   parallax diorama, CSS isometric floor stack, drag-to-orbit tower) with build-time/mobile-risk
   verdicts on each, so Salman could try them by hand rather than judge from a text description.
4. **Salman rejected all three** — the tower concept needs more time than the deadline allows.
   Deferred to the future, not cancelled. Asked instead: search the internet, come back with a plan
   for a different homepage for "the company SalmanSaaS."

## Real web research (this task)

Searched for real precedent: multi-vertical SaaS platforms that solve "one homepage, several
industries" (SalmanSaaS's own situation — booking/restaurant/store, one server, one DB, per
CLAUDE.md's own Vision section). Fetched two real, current company homepages directly:

- **Lightspeed** (retail + restaurant + golf, one platform) — hero uses a **tab switcher** (Retail/
  Restaurant/Golf) that swaps headline/imagery/CTA per industry, same page structure underneath.
  The closest real precedent to SalmanSaaS's own 3 modules.
- **Square** — same idea at the navigation level instead of the hero (Food & Beverage/Retail/
  Beauty/Services taxonomy).

Presented this as a plan (not code yet) — Salman confirmed the tab-switcher direction and resolved
two real open questions before any implementation:

1. **CTA honesty gap**: only Booking (Alzabt) has a real self-service instant-demo flow today.
   Restaurant/Store don't. Salman's call: those two tabs' CTA is "تواصل معنا" (contact), not a fake
   "جرّب الآن" promising an experience that doesn't exist yet.
2. **Visual content for restaurant/store**: Salman explicitly said NOT to screenshot the real
   caracas/footlab admin UI — those are due for a redesign soon, so a real screenshot now would be
   stale almost immediately. His own words: use generic/illustrative mockups now, swap for the real
   thing once those verticals get their own visual pass.

## What was built

Full rewrite of `frontend/src/pages/home/ProductShowcaseHome.jsx` (the real root `/` component,
mounted via `ShowcaseRoutes`'s index route — no router changes needed):

- **3-tab hero** (حجوزات/مطاعم/متجر) — clicking a tab swaps headline, sub-copy, bullets, CTA, and
  the device-mockup visual, all from one `VERTICALS` config array. Booking tab uses the REAL,
  already-captured RK/Alzabt dashboard screenshot (`/assets/alzabt/dashboard.png`, shared asset,
  no duplication) in the same CSS `LaptopFrame` bezel built for Alzabt's own page yesterday.
  Restaurant/store tabs use new, clearly-illustrative CSS mockups (`RestaurantMockup`,
  `StoreMockup`) — a menu/order-summary UI and a product-grid UI — deliberately generic, not
  claiming to be real screenshots, per Salman's own instruction.
- CTA wiring is honest per the resolved gap: booking gets a real dual CTA (`demo-builder` relative
  route — real, working; `/alzabt` absolute route — real marketing page). Restaurant/store get a
  single "تواصل معنا" CTA routing to the real, already-existing `pricing` route (which has its own
  real WhatsApp contact mechanism — reused, not a new contact channel invented for this).
- "3 أنظمة، منصة وحدة" section — one card per module, echoing CLAUDE.md's own 3-module Vision
  directly.
- Generic 3-step "how it works" and trust-pillar sections — same anti-fabrication discipline as
  Alzabt's own redesign (no invented customer counts/reviews).
- Dropped `SmartOrderProductSection` (the old first section) — a placeholder for a 4th, not-yet-
  real product, out of scope now that the page is organized around the 3 real live modules. The
  component file itself is untouched, just no longer imported here — a hygiene note, not resolved
  in this task.

## Confirmed Findings

1. Real browser pass (`/showcase`, the dev-mode mount for this route): 0 console errors, hero text
   present, the real dashboard screenshot loads (`naturalWidth > 0`, confirmed via direct DOM
   check, not just a 200 status).
2. Real tab-click interaction test: clicking "مطاعم" then "متجر" correctly swapped the headline
   text each time (`document.body.innerText` checked after each click, not assumed from the click
   succeeding).
3. Real mobile check (390×844): no horizontal overflow (`scrollWidth === clientWidth`).
4. Visually reviewed the full-page screenshot for both the booking and store tabs before
   committing — confirmed the device-mockup frame, illustrated store-grid colors, and CTA button
   differences (dual CTA on booking vs. single "تواصل معنا" on store) all render as intended.

## Side Findings

- A pre-existing global `<DemoLauncher />` floating CTA (part of `ShowcaseLayout`, not this task)
  appears on top of this page too, same as every other showcase page — expected, not a bug
  introduced here.

## Unknowns

- No explicit visual sign-off yet from Salman on this specific build (published mid-session,
  awaiting his read).
- The restaurant/store illustrated mockups are intentionally generic — when those verticals get
  their own real visual/product pass, these should be revisited (named here so it isn't forgotten,
  not treated as done).

## Verification checklist

- [x] Investigated the old `Home-Page-main/` prototype before proposing anything.
- [x] Built a real, interactive comparison artifact so the tower decision was made from direct
      experience, not a text description.
- [x] Real web research (Lightspeed, Square) before proposing the tab-switcher structure.
- [x] Both real open questions (CTA honesty, restaurant/store visuals) resolved with Salman before
      writing code.
- [x] Real browser verification: desktop, tab-switch interaction, mobile — 0 console errors, 0
      overflow, real screenshot loads.
- [x] No fabricated numbers, no fake screenshots, no invented contact channel.
