# Homepage Phase 2.3 — Location (Contact Us) — Evidence

Contract: `ALZABT_MISTER_H_HOMEPAGE_PHASE2_IMPLEMENTATION_CONTRACT.md`, Phase 2.3 — last of the 6
sections in Salman's requested theming order (Hero → Services → Team → Gallery → Story → Hours →
Location).

## What changed

`frontend/src/components/dynamic-sections/LocationSection.jsx` — accepts `homepageTheme`; heading,
underline rule, paragraph, tag pills, and map embed border all use `homepageTokens`/`themeAccent`
when `'black_gold'`.

## Live verification

| Check | Result |
|---|---|
| `mr-h` heading | `homepageTokens.text` / Tajawal — confirmed via DOM |
| Console errors | 0 |
| `rk` | Location section renders empty (`innerHTML.length === 0`) — RK's `para_ar` is still a known, pre-existing placeholder value, correctly caught by the already-shipped P2 honesty rule (`PLACEHOLDER_PARA_VALUES`), unrelated to this change. 0 console errors confirms no side effect |

## Phase 2.3 — sections themed so far (this session)

Hero, Services, Staff/Team, Gallery, Story, Hours, Location — all 7 of Salman's requested order,
done. Remaining from the original Contract table: `WhyChooseUsSection` (new), `CtaSection` (2
variants), `Footer` (new, site-wide) — not yet started.
