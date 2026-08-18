# Homepage Phase 2.3 — Staff (Team) — Evidence

Contract: `ALZABT_MISTER_H_HOMEPAGE_PHASE2_IMPLEMENTATION_CONTRACT.md`, Phase 2.3. Same
`homepageTheme === 'black_gold'` opt-in mechanism as Hero/Services.

## What changed

`frontend/src/components/dynamic-sections/StaffSection.jsx` — accepts `homepageTheme`; heading,
card background/border, `Avatar`'s accent-tint, name, and description all use
`homepageTokens`/`themeAccent` when `'black_gold'`.

## Live verification

| Check | Result |
|---|---|
| `mr-h` — real barber "Ali" | Heading `color: rgb(243,238,228)` (`homepageTokens.text`), `fontFamily: Tajawal, Cairo, sans-serif`; card `background: rgb(20,20,20)` (`homepageTokens.surface`) — confirmed via DOM |
| `rk` | No `staff` section exists in RK's real config at all (confirmed: RK's sections are hero/story/story_experience/gallery/featured_items/video_story/testimonials/hours/location/cta — never had one) — nothing to regress, 0 console errors confirms no side effect |
| Console errors | 0 on both |
