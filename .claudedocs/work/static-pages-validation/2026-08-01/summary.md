# Static Public Pages Validation — 2026-08-01
Follows: Investigation Protocol (`.claude/rules/investigation-protocol.md`)
Mission owner: Browser Verification Capability's first named mission
(`.claude/skills/frontend/browser-verification-capability/SKILL.md`,
`.claudedocs/architecture/ENGINEERING_ORGANIZATION.md`)

**Scope:** the 4 real, untracked, unlinked static HTML pages already in `frontend/public/` —
`3ashek.html`, `asmar-vs-talia.html`, `diwan-27-july.html`, `omseya-rabee.html`. Left exactly where
they are (explicit decision, not moved into any new folder — they may already be shared as direct
links). Not fixed, not redesigned — evidence and a Content Review judgment only, per this mission's
explicit scope.

## Method

Real Chromium, driven via `@playwright/mcp`, one nested `claude -p` call covering all 4 URLs.
Per page: navigate → console (full, all levels) → network (full, flagged for ≥400) → DOM evaluate
(body text length, title, first heading) → accessibility snapshot → desktop screenshot → resize to
390×844 (mobile) → mobile screenshot → a Content Review judgment call.

## Confirmed Findings

| Page | Console | Network | DOM/Content | Desktop | Mobile |
|---|---|---|---|---|---|
| `3ashek.html` | 1 error — `favicon.ico` 404 only | 6 requests, all 200 (the favicon 404 isn't a page-asset failure) | Real: 2,861 chars, 2 full poems, byline + editorial note each | Clean — dark navy/gold hero, 2 nav pills | Clean — title wraps 2 lines, no overlap |
| `asmar-vs-talia.html` | 0 errors, 0 warnings | 6 requests, all 200 | Real: 5,037 chars, 9-block notebook-letter layout | Clean — notebook-paper card, heart bookmark tab | Clean — card scales down, text stays readable |
| `diwan-27-july.html` | 0 errors, 0 warnings | 6 requests, all 200 | Real: 12,822 chars (largest of the 4), 14 full poems with attribution + correction notes | Clean — 14 nav pills fit the top bar | **Flagged** — 14-pill nav bar overflows the 390px viewport; only ~9 pills visible, cut off both edges, no visible scroll affordance. Body content (title/subtitle/poems) unaffected. |
| `omseya-rabee.html` | 0 errors, 0 warnings | 6 requests, all 200 | Real: 3,749 chars, 7 poems (one explicitly merged from 4 duplicate recitations) | Clean — 7 nav pills fit comfortably | Clean — title wraps 2 lines, pills fit |

All 4 pages render real content — none are blank, none have a broken asset, none have a JS crash.

## Content Review (judgment, not a technical check)

All 4: **Still represents current quality.** None flagged for `Looks outdated` / `Replace later` /
`Archive`. `diwan-27-july.html` carries a minor caveat (mobile nav-pill overflow, noted above) — not
enough to change its own quality judgment, since the actual content renders correctly; it's a
responsive-layout nit on the nav bar specifically, worth a look if this page is ever revisited, not
urgent.

## Side Findings

- Two distinct design templates are in active use across these 4 pages: a dark navy/gold family
  (`3ashek`, `diwan-27-july`, `omseya-rabee`) and a separate cream/notebook-letter family
  (`asmar-vs-talia`). Both render internally consistent and comparable in quality — noted as a real
  observation, not a defect; no action implied.
- `3ashek.html`'s only console entry is a missing `favicon.ico` — cosmetic, does not affect page
  content or function, not worth a fix in this pass.

## Unknowns

- Interactive elements (clicking a nav pill to jump between poems, any scroll-triggered animation)
  were not exercised — this validation covered load/render/responsive-layout only, per the mission's
  stated scope. If these pages are ever revisited for real use, a click-through pass would close
  this gap.
- Whether `diwan-27-july.html`'s mobile nav overflow is an intentional horizontal-scroll strip
  (common for pill-navigation on mobile) or a genuine layout bug — not distinguished by this pass;
  would need either a source read of that page's own CSS or an actual touch-scroll test to close.

## Final Summary Table

| Page | Desktop | Mobile | Console | Network | Accessibility | Content | Decision |
|---|---|---|---|---|---|---|---|
| `3ashek.html` | ✅ | ✅ | ⚠ (favicon 404 only, cosmetic) | ✅ | ✅ | Still represents current quality | No action |
| `asmar-vs-talia.html` | ✅ | ✅ | ✅ | ✅ | ✅ | Still represents current quality | No action |
| `diwan-27-july.html` | ✅ | ⚠ (nav-pill overflow) | ✅ | ✅ | ✅ | Still represents current quality | Low priority — check mobile nav-pill scroll affordance later |
| `omseya-rabee.html` | ✅ | ✅ | ✅ | ✅ | ✅ | Still represents current quality | No action |

**Overall: all 4 pages are healthy.** No fixes applied in this pass, per the mission's explicit
scope (validation, not a rebuild). Only actionable item is `diwan-27-july.html`'s mobile nav-pill
overflow, logged as low priority.
