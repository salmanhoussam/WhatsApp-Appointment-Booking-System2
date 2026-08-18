# Homepage Phase 2.3 — Story — Evidence

Contract: `ALZABT_MISTER_H_HOMEPAGE_PHASE2_IMPLEMENTATION_CONTRACT.md`, Phase 2.3. Same
`homepageTheme === 'black_gold'` opt-in mechanism as Hero/Services/Staff/Gallery.

## What changed

`frontend/src/components/dynamic-sections/StorySection.jsx` — accepts `homepageTheme`; accent
rule, heading, body text, and `StatCard`'s surface/border/number/label all use
`homepageTokens`/`themeAccent` when `'black_gold'`.

## Live verification

| Check | Result |
|---|---|
| `mr-h` heading | `color: rgb(243,238,228)` (`homepageTokens.text`), `fontFamily: Tajawal, Cairo, sans-serif`, text "قصتنا" — confirmed via DOM |
| Console errors | 0 |
| `rk` heading | `color: rgb(240,240,245)`, `fontFamily: Cairo, sans-serif` — original values, unchanged |
