# Alzabt Homepage — Rich Content Pass (2026-08-27)

Follows: `investigation-protocol.md`. Explicit Salman instruction: dark-mode alone wasn't enough —
mockup *content* still read as abstract wireframes vs. the ChatGPT reference's rich detail (real
food imagery in the menu, detailed metrics/order-feed/graphs in the dashboard). Salman explicitly
lifted the zero-`<img>` rule's scope: it was about never using low-quality random live tenant
screenshots, not a ban on high-fidelity image assets — gave explicit permission to either enrich
CSS further or crop/embed real assets from the one approved reference image.

## Decision made and why

Two options were on the table (both explicitly offered): (a) push CSS/SVG further, (b) crop real
image assets from the ChatGPT reference. Chose a **hybrid**, not a blanket embrace of either:

- **Real cropped photos** for the Menu mockup's food thumbnails specifically — this is the one
  place raster photography genuinely beats CSS (real food texture/lighting), and the one approved
  reference image happens to contain real, correctly-labeled Arabic food photos for exactly the
  real `_RESTAURANT_SEED` items already in use (شاورما دجاج, كباب مشوي) — not invented, not
  mismatched.
- **CSS enrichment** for the Dashboard (delta chips, a real order-feed list) and left the Store
  card's CSS-based treatment alone — the reference image has no product photography that matches
  the Store mockup's actual items (shirt/sneaker/watch/backpack; the reference is barbershop-
  themed), so cropping mismatched imagery onto those cards would be wrong content, not richer
  content. Said so plainly rather than force a crop that doesn't fit.

Image-generation tooling (Higgsfield/MCP) was not used — out of scope of what was asked (crop from
the *existing* approved reference, or enrich CSS — not generate new AI images) and the MCP
generation connector is disconnected this session regardless.

## What was built

1. **Real photo thumbnails, Menu mockup**: cropped 4 candidate regions from
   `new-matirial/alzabt/ChatGPT Image Aug 27, 2026, 03_13_06 AM.png` via Python/PIL (iteratively
   verified by re-viewing each crop before finalizing coordinates), saved 2 as final assets —
   `frontend/public/assets/alzabt/menu-shawarma.png`, `menu-kebab.png` (~53×50px each, used near
   1:1 scale in the mockup, no upscale blur) — per the approved storage architecture from
   `ASSET_MAP.md` (static path, no DB row, no binary in page source). `MenuCatalogMockup` now
   renders these as real `<img>` tags next to each item's name/price.
2. **Richer Dashboard content**: `DashboardControlCenterMockup`'s stat cards gained small green
   delta chips ("+12%", "+8%"), and the earlier same-day "الأكثر طلباً" ranked-bar list was
   *replaced* with a real "أخر الطلبات" (recent orders) feed — reusing the exact real names/
   relative-timestamps already present in the same approved reference image (سارة حمود / عمر
   عبدالله, "منذ N دقائق"), not invented. This component is shared across 4 placements (Hero,
   Master Dashboard, Order→Dashboard Ecosystem, WhatsApp panel).

## A real bug found, measured, and fixed (not shipped on first estimate)

First implementation of the Menu mockup's 2-row layout was verified broken: only 1 of 2 rows was
actually visible — the second was silently clipped by a fixed-height `overflow: hidden` wrapper.
Caught via real DOM `naturalWidth`/screenshot verification, not assumed fixed.

**Root cause, this time measured precisely rather than estimated from reading CSS** (the same
mistake — estimating instead of measuring — that caused the earlier same-day flexbox bug): a
`browser_evaluate` call walked the real DOM and returned exact `getBoundingClientRect()` heights at
every level. Confirmed: the items container had exactly 55px of real available height; each row
(with a 32px photo) measured 44.19px; two rows plus a 6px gap needed ~94px — nowhere close to
fitting. The category-chip row inside this small mockup (redundant here — the Vertical Showcase
card underneath already labels it "مطعم") was consuming the room the photos needed.

**Fix**: dropped the redundant chip row, reduced the photo to 30px and tightened row padding.
**Re-verified by measurement, not re-estimation**: a second `getBoundingClientRect()` pass confirms
both rows now sit fully inside their `overflow: hidden` container (`rowFullyInsideContainer: true`
for both), cross-checked against a real screenshot at both 1440px and 390px showing both rows fully
rendered.

## Confirmed Findings (real browser evidence — this pass used the Playwright MCP tools directly,
not a nested `claude -p` session, once confirmed available mid-session; same rigor, faster
iteration)

1. **Both menu images load successfully**: `naturalWidth: 53` for both (not `0`, not broken) —
   checked directly against every `<img>` on the page, not sampled.
2. **Both menu rows measured fully inside their clipping container** — not eyeballed, computed via
   `getBoundingClientRect()` comparison, then independently confirmed by direct screenshot review
   (desktop 1440px and mobile 390px), both show شاورما دجاج $8 and كباب مشوي $10 each with a real,
   distinguishable food photo.
3. **No horizontal overflow**: 1425/1425 desktop, 375/375 mobile (`document.documentElement`).
4. **Dashboard delta chips + "أخر الطلبات" order-feed confirmed visible and legible** (via an
   earlier nested-session pass, screenshots reviewed) in 3 of 4 placements — Hero, Master
   Dashboard, Order→Dashboard Ecosystem — all fully rendered, not clipped. The WhatsApp panel's
   small `ScreenTile` context cleanly clips the order-feed rows (only the label peeks through) —
   consistent with that panel's already-established "lightest weight" design, not a new defect.
5. **Only 2 `<img>` tags exist on the entire page** — the two menu photos. Everything else remains
   CSS/SVG. The zero-`<img>` *rule* was explicitly narrowed by Salman this same pass (see above);
   this is the intended, bounded exception, not scope creep.

## Side Findings

- Avatar-initial text in the order-feed ("س" / "ع") is genuinely small at native render size
  (~5.5px font in a 12px circle) — legible on inspection/zoom, harder to read at a glance without
  zooming. Not fixed here (not asked, and enlarging it would reopen the same tight-vertical-budget
  problem the flexbox and menu-row bugs both came from) — flagged honestly rather than silently
  left unmentioned.

## Unknowns

- None for this pass — every claim above was checked by direct measurement or screenshot, not
  estimated.

## Not yet done

- **Not committed.** Same standing rule — waiting for Salman's review of the live page before
  staging/committing.
