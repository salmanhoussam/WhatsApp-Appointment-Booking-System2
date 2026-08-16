# Mister H Hero Redesign (v2) — Evidence

Follow-up to `../2026-08-16/evidence.md` after real feedback: the full-bleed autoplay hero video
"مش ضابط" (not working visually) and the overall result was below the bar expected after this
session's own research. Salman asked to actually inspect real reference designs
(`dribbble.com/tags/barber-website`) rather than continue guessing, and to move the video into a
small framed box instead of a full-bleed background.

## Research — real, screenshotted, not paraphrased from search snippets

Visited `dribbble.com/tags/barber-website` and 3 individual shots directly (real navigation +
screenshots, not thumbnails):

1. **"Barber, Salon Website Landing Page UI Design for Barbershop"** (Imrul Kayes / Taqwah) — bold,
   colorful, illustrative direction (green/orange/multicolor), oversized display type, circular
   staff-photo grid, real team photo, a visible date-picker/slot UI ("Thu Fri Sat Sun").
2. **"Barber Shop Website"** (Farzan Faruk / Rylic Studio) — warm beige/tan + black, real photo of
   an active haircut in progress, 3-column named testimonials (role/title attribution, matching
   this session's earlier Booksy/Fresha finding).
3. **"Barber Shop Landing Page"** (Safayet Hossain) — **the directly load-bearing reference**: pure
   black background, single amber/orange accent, bold white display type, and — critically — two
   rounded-corner, bordered photo/video cards with a small circular play-button + "See Video"
   caption sitting beside content, **not** a full-bleed background. This is real, observed evidence
   for exactly the treatment requested, not invented.

## What changed (code)

`frontend/src/components/dynamic-sections/HeroSection.jsx` — added an optional, additive
`framed_video_url` (+ `framed_video_caption_ar`) data field. When present: the section always uses
the dark gradient background (the old full-bleed video/image `bg_type` path is skipped), and splits
into a two-column flex (text one side, a bordered/rounded video card the other, RTL-correct — text
anchors right, card left) on wide viewports, stacking on mobile. The card: rounded corners (24px),
1px accent-tinted border, drop shadow, autoplaying muted video, a bottom-left play-icon + caption
overlay. **Zero change to any tenant not setting this new field** — RK's hero (still full-bleed
video, no `framed_video_url`) is untouched by construction, not just by testing.

**One real bug found and fixed during verification**: the new content wrapper initially rendered at
574px wide instead of filling the ~1100px section, because it's a flex *child* of the outer
`<section>` (which uses `justifyContent:'center'`) — under that, a flex item without an explicit
width shrinks to its own content size rather than filling available space, so `flexWrap` triggered
prematurely and the video card always stacked below the text even on a 1440px desktop viewport.
Fixed by adding `width:'100%'` to the content wrapper when in the framed-video layout. Confirmed via
direct `getBoundingClientRect()` measurement before and after (574px → correct ~1036px), not just a
visual guess.

## What changed (Mr H's real content)

- `primary_color`: `#5B4FE9` (first-pass, weak guess from a small profile thumbnail) → `#D9A441`
  (warm gold) — now grounded in **two** independent real sources: the actual video's visible "MR H"
  gold signage, and the real Dribbble reference's dark+single-warm-accent direction. A meaningfully
  stronger evidence base than the first pass.
- Hero `data`: removed `bg_type:"video"` full-bleed mode, added `framed_video_url` (same uploaded
  video) + `framed_video_caption_ar: "شاهد أجواء الصالون"`.

## Live verification

| Check | Result |
|---|---|
| Desktop (1440×900) | Real side-by-side layout: text right (RTL-correct), framed video card left — rounded, bordered, playing real interior footage (gold-trimmed barber chair, dark marble, product shelving visible) |
| Mobile (390×844) | Stacks cleanly, full-width card, zero horizontal overflow |
| Console | 0 errors on Mister H's own page across both viewports |
| RK regression check | Hero still renders full-bleed video exactly as before (`hasVideo: true`, no framed-card layout triggered) — confirmed unaffected |
| Transient Supabase pooler `503`s hit twice during this verification pass (on `mister-h/config`, and separately on RK's unrelated catalog endpoints) | Both self-resolved on a plain retry — same external, already-documented flakiness, unrelated to this change |

Screenshots: `mister-h-v3-desktop-fixed.png`, `mister-h-v3-mobile.png`.
