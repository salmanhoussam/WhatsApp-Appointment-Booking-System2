# Alzabt Homepage — Dark-Mode Screen Flip (2026-08-27)

Follows: `investigation-protocol.md`. Explicit Salman instruction, citing the ChatGPT composite and
the e-commerce UI-kit reference images (both showing dark-mode UI inside their device mockups).

## Tension flagged, then executed as instructed

The original Contract's header comment specified mockups "styled like the actual app's real
light-mode admin/booking UI" — a deliberate earlier choice grounded in fact: the real Alzabt admin
UI (the RK screenshots removed earlier this same session) is genuinely light-mode today. Flagged
this once, plainly, before proceeding — a dark-mode marketing mockup no longer pixel-matches the
real product a new signup will actually see. Salman's instruction was explicit and specific (cited
exact reference files), so this is his call, not an open question — executed as asked, not silently
complied with or silently refused. The file's header comment now documents this decision and its
rationale so a future reader doesn't have to reconstruct it from git blame.

## What was built

Added a `SCREEN` palette (bg `#111827`, `bgAlt` `#0B1220`, translucent white cards/borders, light
text tiers, a muted-violet inactive-chart-bar tone) alongside the existing `V` (page-level) palette.
Replaced every light-mode literal (`#fff` screen backgrounds, `#FAFAFA`/`#EEE`/`#F0F0F3`/`#F1F1F4`
cards and borders, `#111`/`#999`/`#666`/`#222`/`#444` text, `#DCFCE7`/`#16A34A` success colors,
`#E4DBFB` inactive chart bars) with `SCREEN.*` tokens, across every mockup component:
`LaptopFrame`, `PhoneFrame`, `ScreenTile` (bezel screen backgrounds), `CustomerBookingFlowMockup`
(both states), `DashboardControlCenterMockup` (including the ranked-list added earlier this
session), `MenuCatalogMockup`, `RetailCatalogMockup` (including the discount badge/heart added
earlier this session — badge stays violet, heart-circle backdrop flipped to a dark translucent
circle), `ProServiceMockup`, `BarberSceneMockup`, and the WhatsApp Integration panel's
customer-side tile (WhatsApp's own green bubble/badge deliberately kept — brand-correct accent,
not a leftover light patch). Verified with a grep pass afterward: zero light-mode literals remain
inside any mockup component.

Untouched: page-level chrome (nav, Hero copy column, section headers, Trust/How-It-Works/Closing
CTA, `V` palette, WhatsApp's green accent, device bezel colors which were already dark) — this pass
only touched what renders *inside* a device screen.

## Confirmed Findings (real browser evidence, reviewed via direct screenshot inspection myself)

1. **0 console errors, 0 warnings** at both 1440×900 and 390×844.
2. **No horizontal overflow**: 1440/1440 desktop (`document.body`), 375/375 mobile
   (`document.documentElement.scrollWidth/clientWidth` both confirm 390/390 — the `body` figure
   differing from `html` is a pre-existing body padding/max-width artifact, not new, not an
   overflow).
3. **All mockup screens confirmed dark by direct screenshot review** (not just nested-session
   prose): Hero laptop+phone, Master Dashboard laptop, Order→Dashboard Ecosystem phone+laptop, all
   4 Vertical Showcase tiles, WhatsApp panel's dashboard tile and chat-bubble tile.
4. **Discount badge + heart icon (from the earlier enrichment pass) still render correctly** on the
   dark Store card — badge violet, heart icon now light-on-dark-circle instead of dark-on-light-
   circle, confirmed legible.
5. **Ranked mini-list (from the earlier enrichment pass) still renders correctly** on dark
   backgrounds at all placements, `minHeight: 0` fix unaffected by the color change.
6. **WhatsApp's green stays green** (bubble, status badge) — correctly kept as WhatsApp's own brand
   accent against the new dark tile, not converted to violet, not a leftover unstyled patch.
7. **Visual consistency**: every mockup screen now reads as one coherent dark system with the page's
   own `#0A0A0F` background and violet accent language — no leftover white/light patch anywhere
   across 7 screenshots (full-page desktop, full-page mobile, 5 section crops).

## Side Findings

- None new. The `flex:1`/`minHeight:0` fix and the discount-badge/heart addition from the earlier
  same-day enrichment pass both continue to hold correctly under the new color scheme — a real,
  useful confirmation that the two passes are independent (colors changed, layout logic didn't).

## Unknowns

- None — every mockup component was checked directly (grep for leftover literals + real-browser
  screenshot review of every placement), not sampled.

## Not yet done

- **Not committed.** Per this project's "never commit unless explicitly asked" rule and Salman's
  own "let me know when the color update is applied" phrasing (a review request, not a commit
  request) — waiting for his sign-off.
