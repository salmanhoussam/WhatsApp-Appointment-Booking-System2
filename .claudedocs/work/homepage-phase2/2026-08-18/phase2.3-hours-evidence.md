# Homepage Phase 2.3 — Hours — Evidence

Contract: `ALZABT_MISTER_H_HOMEPAGE_PHASE2_IMPLEMENTATION_CONTRACT.md`, Phase 2.3. Same
`homepageTheme === 'black_gold'` opt-in mechanism as the other 4 already-migrated sections.

## What changed

`frontend/src/components/dynamic-sections/HoursSection.jsx` — accepts `homepageTheme`; heading,
underline rule, row background/border, day label, and open-hours time text all use
`homepageTokens`/`themeAccent` when `'black_gold'`. `مغلق` (closed) stays red regardless of theme
— a status color, not a brand color, deliberately untouched.

## Live verification

| Check | Result |
|---|---|
| `mr-h` heading | `homepageTokens.text` / Tajawal — confirmed via DOM |
| `mr-h` time text | `rgb(217,164,65)` = `#D9A441` = `homepageTokens.accent` — confirmed via DOM |
| Console errors | 0 |
| `rk` heading/time | `rgb(240,240,245)` / `rgb(47,79,79)` (RK's own real `#2F4F4F` teal `primary_color`) — both original, unchanged |
