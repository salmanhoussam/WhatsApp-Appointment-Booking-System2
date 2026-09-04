# Alzabt Homepage — Asset-Informed Mockup Enrichment Pass (2026-08-27)

Follows: `investigation-protocol.md` (Confirmed/Side Findings/Unknowns), `ASSET_MAP.md` (this same
folder). Not a new Contract amendment (no new section, no copy/positioning change) — a scoped
enrichment of two existing mockup components, using the 6 approved reference-only images from
`new-matirial/alzabt/` as visual direction, per Salman's explicit go-ahead.

## What was built

`frontend/src/pages/home/ProductShowcaseHome.jsx`:

1. **`DashboardControlCenterMockup`** — replaced the old plain two-avatar "موظفان نشطان" row with
   a compact "الأكثر طلباً" ranked mini-list (2 rows, thin progress bars), recreated Alzabt-native
   (violet, own copy, CSS-only) from the compositional idea in the "DigiLab"-branded reference image
   (`jNA4nXUur8…jpeg` — rejected-for-direct-use in the Asset Map, reference-only). This component
   is shared across 4 placements: Hero, Master Dashboard section, Order→Dashboard Ecosystem
   section, and the WhatsApp Integration panel's `ScreenTile`.
2. **`RetailCatalogMockup`** — added a small violet `-15%` discount badge + a wishlist heart icon to
   one product tile, recreated Alzabt-native from the generic e-commerce UI-kit reference
   (`aPcgZUtz…jpeg` — reference-only). Single placement: the متجر/Store card in Vertical Showcase.
3. Two source-code comments added, each citing the specific reference file that informed the
   change — matching this project's evidence-traceability habit, not left as an unexplained diff.
4. Everything else — copy, section order, positioning, other 3 Vertical Showcase mockups, WhatsApp
   panel, Hero composition, routing — untouched. No new section. No redesign.

## A real bug found and fixed during this pass (not shipped as "good enough")

First verification pass (nested Playwright session) flagged the new ranked-list content as
"partially overlapped/less legible" in the Hero and Ecosystem laptop instances. Direct screenshot
review (opening the actual PNGs myself, not just trusting the nested session's prose) showed it was
worse than that: the two labels and their bars were **entirely clipped** at the bottom edge in
those two narrower contexts, invisible, not just hard to read.

**Root cause**: the chart `<div>` inside `DashboardControlCenterMockup` had `flex: 1` but no
`minHeight: 0`. Classic flexbox trap — a flex child defaults to `min-height: auto`, so it refuses to
shrink below its own intrinsic content size even when its sibling (the new ranked list) needs the
room. In the wider Master Dashboard section instance there was enough slack for both to fit; in the
narrower Hero/Ecosystem instances, the chart just as tall as before)`; and the new list got pushed
past the frame's `aspect-ratio`-constrained height, then silently clipped by the outer
`overflow: hidden`.

**Fix**: added `minHeight: 0` to the chart div (one line) and `flexShrink: 0` to the ranked-list
wrapper (so it's guaranteed its own space once the chart can actually compress). Re-verified via a
second real-browser pass — see Confirmed Findings below — labels/bars now fully visible at all
three larger-frame placements, at both 1440×900 and 390×844.

## Confirmed Findings (real browser evidence, two verification passes, both reviewed via direct
screenshot inspection, not just nested-session prose)

1. **0 console errors** across both passes (navigate, resize, all section screenshots, mobile
   resize).
2. **No horizontal overflow**: 1425/1425 at desktop, 375/375 at mobile, both passes.
3. **Master Dashboard section**: ranked list ("قص شعر" / "حلاقة ذقن", violet + light-violet bars)
   renders fully, cleanly, legibly — confirmed by my own direct screenshot review
   (`master-laptop-1440.png`).
4. **Order→Dashboard Ecosystem section** (narrower, `maxWidth: 420`): same list renders fully and
   cleanly after the fix, plus the pre-existing "طلب جديد" toast unaffected — confirmed directly
   (`eco-laptop-1440.png`).
5. **Hero section, laptop's own internal layout** (verified with the overlapping phone mockup
   temporarily hidden to get an uncontaminated read): renders fully and cleanly after the fix, both
   desktop and mobile — confirmed directly (`hero-laptop-clean-1440.png`,
   `hero-laptop-mobile-clean-390.png`).
6. **WhatsApp Integration panel** (`ScreenTile`, 148px fixed height): the ranked list's label
   ("الأكثر طلباً") is visible at the bottom edge, its two bars are cropped off by the tile's own
   `overflow: hidden` — a clean hard edge, no spillage, no glitch. Acceptable per the section's own
   design (deliberately the lightest-weight placement of this component) — not something to
   "fix" by growing the WhatsApp panel, which would reopen its own already-approved restraint rule.
7. **Vertical Showcase, متجر/Store card**: confirmed by my own direct screenshot review
   (`11-store-card-crop.png`) — the `-15%` badge and heart icon render crisply on one tile, the
   other three tiles show the heart icon only (matches the reference's own "not every card" pattern,
   not a uniform template stamped everywhere).

## Side Findings

- **Hero's default (non-debug) composition visually obscures the new ranked-list content.** The
  Hero's phone mockup floats over the laptop's bottom-left corner *by design* — this predates this
  pass and was already part of the original, approved 2026-08-26 composition. Previously that area
  held a minor, low-information avatar-pair; now it holds slightly more substantive (if still
  decorative) content that a visitor can't actually read in the Hero specifically, because the
  phone sits on top of it. Not a regression in the sense of anything breaking (no overflow, no
  glitch — the content is exactly as legible as the old avatar row was in that same spot), but
  worth naming plainly: the enrichment's practical value is fully realized in 3 of its 4 placements
  (Master Dashboard, Order→Dashboard Ecosystem, and partially the WhatsApp panel), and cosmetic-only
  in the 4th (Hero). Not fixed here — fixing it would mean touching the Hero's own phone-over-laptop
  layering, which is outside this pass's scope and was not asked for.

## Unknowns

- Tablet viewport (768×1024) not independently re-verified for this specific pass — same reasoning
  as Amendment 1's evidence: the page's existing `auto-fit`/`flexWrap` patterns already cover this
  breakpoint generally, and neither change alters layout structure, only internal mockup content.

## Not yet done

- **Not committed.** Per this project's "never commit unless explicitly asked" rule — Salman asked
  to see the UI first ("let me know when the UI is updated for review"). Waiting for his review
  before staging/committing this change.
