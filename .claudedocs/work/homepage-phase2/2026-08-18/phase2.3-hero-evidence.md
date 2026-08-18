# Homepage Phase 2.3 — Hero (full-bleed default) — Evidence

Contract: `ALZABT_MISTER_H_HOMEPAGE_PHASE2_IMPLEMENTATION_CONTRACT.md`, Phase 2.3, Hero row.
Implements §5.1 (full-bleed default, framed-card kept as alternate) and the color/typography half
of §5.2 (homepage = fixed black+gold, not tenant `primary_color`) for the Hero section only.

## The regression-safety mechanism (new, not previously named in the Contract)

Discovered while implementing: `HeroSection.jsx` (and every `dynamic-sections/*` component) is
**shared** across every tenant rendering through `DynamicPage.jsx` — RK included. Hardcoding
`homepageTokens` into the component would have silently changed RK's rendering too, which no
document or conversation ever approved. Fix: a real, additive, per-tenant `Client.config.
homepage_theme` flag (`"black_gold"` or absent), read in `DynamicPage.jsx`, threaded as a new
`homepageTheme` prop. Absent for every tenant except Mister H (set explicitly, one JSON field) —
every other tenant's code path is untouched, confirmed live below. This is real
`Client.config`-driven data, not a `slug ===` check — same sanctioned pattern this session already
used for `reserveHref` (gated on `active_services`).

## What changed

- `app/` — none. Two direct one-off DB writes to Mister H only (`id
  fd53e0e1-684c-4a14-a41e-31dfe5d39f45`): `config.homepage_theme = "black_gold"`, and removed
  `framed_video_url`/`framed_video_caption_ar` from the hero section's `data` so the existing
  `_inject_page_hero_media` injection (Phase 1) targets `bg_image_url`+`bg_type` instead — which is
  exactly what makes the section fall into full-bleed mode without any new backend code.
- `frontend/src/pages/generic/normal/DynamicPage.jsx` — `homepageTheme` derived from
  `tenantConfig.config?.homepage_theme`, added to `sectionProps`.
- `frontend/src/components/dynamic-sections/HeroSection.jsx` — accepts `homepageTheme`; when
  `'black_gold'`: fixed black+gold fallback background/overlay (`homepageTokens`, not `accent`),
  `themeAccent` (gold) instead of `accent` (tenant purple) for the CTA/rule/framed-card borders,
  `headingFont`/`bodyFont` from tokens. `isVideo` detection now prefers the real `bg_type` field
  over extension-sniffing (safe, backward-compatible improvement — falls back to the old heuristic
  for any tenant without `bg_type`).

## Live verification

| Check | Result |
|---|---|
| `mr-h` real browser render | Full-bleed real hero video (`hero-video.mp4`), dark bottom-fade overlay, gold CTA ("احجز موعدك الآن"), gold accent underline, Tajawal-weighted heading — screenshot confirms visually. 0 console errors |
| `rk` real browser render (regression) | Unchanged: RK's own teal (`#2F4F4F`-derived) CTA button, original hero image, 0 console errors — confirms `homepageTheme` absence keeps RK's exact prior rendering |
| eslint | Pre-existing `'motion' is defined but never used` false positive confirmed via `git stash` to exist on the file **before** this change too (same error, different line number) — not introduced by this work |

## Known, deliberate non-goals for this increment

- Dual-CTA (primary "Book" + secondary "View Services") — separately named gap
  (`ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md` §1 item 2), not bundled into this pass.
- Every other section (Services, Story, Gallery, etc.) still renders with the old purple `accent`
  on Mister H's page — expected, not a bug; each gets the same `homepageTheme` treatment in its own
  Phase 2.3 sub-step.

## Data impact

Two real JSON-field writes to Mister H only, confirmed via live public config diff. RK and every
other tenant: zero writes, zero rendering change, confirmed live via browser.
