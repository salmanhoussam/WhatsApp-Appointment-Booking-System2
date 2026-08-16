# Mister H — Purple/Gold Theme + Team + Gallery Placeholders — Evidence

Follow-up to the v2 hero redesign, in response to a direct reference image (a real "NOMAD Barber" /
"ALIX" booking-app UI kit mockup) and an explicit request: a visible purple+gold dark theme, and
honest empty-square placeholders for photos not yet uploaded (staff, gallery) rather than hiding
those sections entirely.

## What changed (code)

1. **`HeroSection.jsx`** — the default dark background gradient (used whenever no full-bleed image/
   video is set) changed from a barely-visible near-black tint (`oklch(0.13 0.03 280)`, chroma 0.03)
   to a genuinely visible purple-into-black gradient (`oklch(0.19 0.09 295)` → `oklch(0.07 0.02
   265)`, chroma 0.09). This is a **Layer-1/system-level** change, not a new per-tenant field —
   consistent with this project's own Locked-vs-Customizable principle (background treatment
   locked, accent color tenant-editable). Applies to every tenant using the default gradient
   background, not hardcoded for Mister H alone.
2. **`GallerySection.jsx`** — an `images[]` entry with no `url` now renders as an honest, visually-
   obvious placeholder tile (dashed border, image icon, accent-tinted) instead of being filtered
   out. The section still fully collapses (`return null`) when the array itself is empty/absent —
   RK (real `images: []`) confirmed unaffected. This is a UI *affordance* (a slot obviously meant to
   be filled), not placeholder *text* pretending to be real content, so it doesn't conflict with the
   earlier P2 honesty rule.
3. **`StaffSection.jsx`** — **no code change needed**; it already had an honest empty-photo
   placeholder (accent-tinted circular initial) built in from the original P1.1 work. It simply
   wasn't wired into Mister H's page yet.

## What changed (Mr H's real content)

- Added a `staff` section (order 2) — reads the real live `Barber` "Ali" via the existing
  `GET /reservations/barbers` endpoint (no new data, no fabrication).
- Added a `gallery` section (order 3) — 4 explicitly-empty placeholder slots (`{url: "", caption_ar:
  ""}`), ready for real photos via a future Dashboard upload flow.
- Section order: hero → story → staff → gallery → featured_items → hours → location → cta.

## Live verification

| Check | Result |
|---|---|
| Hero background | Real, visible purple gradient (top-right) fading to black, gold CTA/glow — screenshot confirms both colors read as distinct, not muddy |
| "فريقنا" (staff) section | Real "Ali" card, gold-tinted circular "A" initial placeholder (no photo yet) — matches the reference's team-card concept |
| "من أجواء الصالون" (gallery) section | 4 clean dashed-border placeholder tiles with an image icon, gold-tinted — desktop and mobile (390px) both confirmed, zero overflow |
| Existing `featured_items` (services) | Same placeholder-icon treatment already existed for missing images — confirmed visually consistent with the new gallery placeholders, no separate work needed |
| Console | 0 errors on Mister H, both viewports (after one retry — a transient Supabase pooler `503` hit the first attempt, same known external flakiness, self-resolved) |
| RK regression check | `#s_gallery` div exists (DynamicPage wrapper) but `innerHTML.length === 0` — correctly stays fully collapsed, no placeholder tiles (real empty array, not populated slots); hero still full-bleed video, unaffected. 0 console errors |

Screenshots: `mister-h-v4-hero.png` (hero, purple gradient visible), `mister-h-v6-staff.png` (desktop,
staff card + gallery placeholders + existing services), `mister-h-v6-mobile-gallery.png` (mobile
gallery placeholders).
