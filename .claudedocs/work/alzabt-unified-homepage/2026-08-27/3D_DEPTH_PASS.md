# Alzabt Homepage — 3D Depth Pass (2026-08-27)

Follows: `investigation-protocol.md`. Salman flagged the page as reading flat/dated next to premium
SaaS sites and pointed at 7 new files in `new-matirial/alzabt/` as the target look ("high-resolution
3D rendered composite graphics with real depth, shadows, and reflections").

## A real conflict found and reported before touching any code

Inspected all 7 new files (`WhatsApp Image 2026-08-11 at 21.10.22*.jpeg`,
`...21.10.23*.jpeg`) visually. **None are Alzabt's own assets — every one is a real, named
competitor product's own screenshot or a generic stock template**, each with fabricated trust
numbers baked directly into the image:

| File | What it is |
|---|---|
| `21.10.22.jpeg` | Generic stock "barber shop" website template — `LOGO` placeholder, fabricated "+20K Happy Customer" |
| `21.10.22 (1).jpeg` | Real competitor scheduling SaaS — branded "PWT Location" |
| `21.10.22 (2).jpeg` | Competitor/template landing page — branded "LocAppoint," fabricated revenue/rating, fake activity feed |
| `21.10.22 (3).jpeg` | **Trafft** (real, existing SaaS product) — UI literally reads "Welcome to your Trafft dashboard" |
| `21.10.23.jpeg` | A real barbershop's own branded site — "FRISOR World," real interior photos, a real Ukrainian street address |
| `21.10.23 (1).jpeg` | Real competitor — branded "Calendr.com" |
| `21.10.23 (2).jpeg` | Real competitor — branded "Bookly," "trusted by 10,000+ businesses," "4.9/5 · 2,400+ reviews" |

Embedding any of these would violate the Contract's own hard rules (no real screenshots as
marketing assets, no invented testimonials/numbers, no third-party branding) — rules mechanically
re-verified after every change this whole session. Reported this plainly rather than silently using
or silently ignoring the underlying request. Presented 3 options; Salman chose: keep it CSS-only,
match the reference *style* (perspective, shadow depth, gloss), not their content.

## What was built

Enhanced the two shared device-bezel components — `LaptopFrame` and `PhoneFrame` — with real CSS 3D
depth, no raster images:

- **`perspective` + `rotateX`/`rotateY`** on one rigid wrapper per device (screen + hinge + base
  rotate together as a single unit — an early local check confirmed rotating each piece
  independently looked visibly broken/misaligned, not attempted in the shipped version).
- **`filter: drop-shadow(...)` instead of `box-shadow`** — `box-shadow` renders flat under a CSS 3D
  transform; `drop-shadow` follows the actual tilted silhouette, giving a real floating-in-space
  shadow. Two stacked drop-shadows per device: a dark contact/ambient shadow + a soft violet-tinted
  glow (brand-consistent, matches `V.violetSoft`).
- **A diagonal glass-reflection gradient** overlaid on every screen's content (`linear-gradient`,
  low-opacity, angled) — the "glossy highlight" premium device-mockup renders characteristically
  have.
- **`ScreenTile`** (Vertical Showcase cards, WhatsApp panel) deliberately left untouched — it's the
  intentionally lighter-weight tier established in Amendment 1; matching its weight to the main
  device mockups would erase that already-approved hierarchy, not asked for here.

## Confirmed Findings (real browser evidence, checked directly via Playwright MCP tools —
now confirmed available mid-session, no nested `claude -p` process needed)

1. **0 console errors** at both 1440×900 and 390×844.
2. **No horizontal overflow**: 1425/1425 desktop, 375/375 mobile — confirmed the 3D transforms
   don't push content past any `overflow: hidden` section boundary (a real risk with CSS 3D
   transforms interacting with ancestor clipping, checked deliberately, not assumed safe).
3. **Hero composition** (laptop + floating phone): both devices now show clear perspective tilt,
   layered shadow depth including the violet ambient glow, and the glass-reflection sweep — visually
   confirmed via direct screenshot review, both desktop and mobile.
4. **Master Dashboard section** and **Order→Dashboard Ecosystem section**: same treatment renders
   consistently — confirmed via direct screenshot review.
5. **No clipping** of the tilted devices by any parent `overflow: hidden` (the Hero section itself
   has `overflow: hidden` — checked specifically since this was the highest-risk regression).

## Side Findings

- None new.

## Unknowns

- None — every claim checked by direct screenshot review at both breakpoints.

## Not yet done

- **Not committed.** Same standing rule — waiting for Salman's review of the live page.
