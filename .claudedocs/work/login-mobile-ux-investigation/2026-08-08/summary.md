# Login Mobile UX Investigation

**Date:** 2026-08-08 | **Type:** Investigation only — no code changed, per explicit instruction.
**Trigger:** A real screenshot (Chrome DevTools, iPhone 14 Pro Max device toolbar, 430×932, 50%
zoom) showing a blank gray box at the top of `/login`'s card and clipped Arabic text (H1 title, the
identifier-field label). Salman confirmed via a genuine hard refresh on the same tab that the bug
survived — real evidence, not an unverified claim. Scoped explicitly as investigation-first: name
every real UX/layout gap before deciding a Login UX Rebuild's scope, kept independent of Catalog
3.7B.

## Method

Per `investigation-protocol.md` / `browser-verification-protocol.md`: real evidence before
conclusions, both structural (code read) and runtime (real browser). Two rounds of browser
verification were run (a first pass at 430×932 only, then a deeper multi-size pass), plus a full
structural read of the render path.

### Structural read (ruling out obvious causes first)

- `frontend/index.html:6` — `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
  is present and correctly configured. Ruled out as a cause.
- `App.jsx:114-121` — on `localhost` (non-`IS_DEMO_SUBDOMAIN`), `/login` renders `<Login />`
  directly, with no wrapping layout, no `Suspense` fallback, no loading gate above it beyond
  `QueryClientProvider > HelmetProvider > LanguageProvider > BrowserRouter`.
- `context/LanguageContext.jsx` (the one non-trivial wrapper in that chain) renders no DOM itself —
  only a `Context.Provider` and a `document.documentElement.dir/lang` side effect. No source of a
  gray box found here.
- `pages/admin/Login.jsx` (full 113-line read) has no `<img>`, no lazy-loaded sub-component, no
  conditional loading state that could render as an empty box — every element is plain Tailwind
  JSX, always present.
- No `@media (pointer:` / `(hover:` / other device-conditional CSS exists anywhere near this file
  (grepped `frontend/src/index.css` and `pages/admin/`) — ruling out a touch/hover media-query
  branch as the cause.
- No service worker is registered anywhere in the frontend (grepped for `serviceWorker`/`registerSW`)
  — ruling out a cached-response-from-SW explanation.
- Tailwind v4 is correctly configured and imported (`tailwind.config.js` content globs include
  `src/**/*.{js,ts,jsx,tsx}`; `index.css:1` is `@import "tailwindcss";`) — ruling out "Tailwind isn't
  building for this file" as a cause.

### Runtime read (real browser, two rounds)

**Round 1** — fresh Playwright session, `browser_resize` to 430×932, real DOM evaluation + screenshot.
Result: `htmlScrollWidth` (430) exactly equalled `htmlClientWidth`/viewport (430); H1 rendered in
full ("تسجيل الدخول للإدارة", not clipped); label rendered in full; no gray box in the screenshot.
This is what first surfaced the discrepancy against the human-reported screenshot.

**Round 2** — a deeper, more adversarial pass specifically designed to catch what Round 1 might have
missed: three CSS viewport sizes (375×812, 414×896, 430×932), a font-load-readiness check
(`document.fonts.status`), a full DOM dump of every element under `#root` (not just 3 selectors) at
two of the three sizes, a full network-request capture (looking for any non-2xx or a slow/failed
Google Fonts load), a full console-message capture at all levels, and — specifically to rule out a
stale-SPA-state/race explanation — a genuine full-page reload (`browser_navigate` to the same URL
again, not client-side routing) with a repeat of every check.

Every single check in Round 2 came back clean:
- `htmlScrollWidth === viewportW` at all three sizes (375, 414, 430) — zero overflow.
- Every element in the full DOM dump had `width ≤ viewport width` — no oversized/anomalous element,
  no zero-content gray block, at either 375×812 or 430×932.
- 27 network requests, all `200` — no failed/slow resource.
- Console: only `[vite] connecting/connected`, a React DevTools info line, and one unrelated
  autocomplete-attribute verbose hint — zero errors, zero warnings.
- The fresh full-reload screenshot at 430×932 was **visually identical** and its DOM dump
  **byte-for-byte identical** to the pre-reload screenshot/dump at the same size — ruling out a
  race condition or leftover SPA state as the explanation.

## Confirmed Findings

- The reported bug (gray box + clipped title/label) was **not reproduced** by any of the 6 real
  browser checks run across two independent investigation rounds — 3 sizes, both SPA-navigation and
  a genuine hard reload, full DOM/network/console capture every time.
- The render path itself has no structural source for a blank gray box — confirmed by reading every
  file in the actual component tree between `App.jsx`'s route and the rendered DOM.
- This is **not** the stale-Vite-dependency-cache class of bug from the 2026-08-01 precedent — that
  class produces different content at the same URL across sessions; here, every session (fresh
  Playwright, hard-reloaded Playwright) produced the *same*, correct content. The discrepancy is
  specifically between an automated check and the human's actual real-Chrome-DevTools session, not
  between two different automated sessions.

## Side Findings

- No `fonts.gstatic.com` request appears in the captured network log even though
  `document.fonts.status` reports `"loaded"` — most likely the actual font files were served from a
  prior cache/earlier navigation in the same long-lived Playwright browser process and never
  generated a new network log entry, not a real failure (no error, no blocking). Noted because a
  font-swap (FOUT/FOIT) timing gap is one of the few remaining plausible explanations for a
  human-visible issue an automated, fonts-already-warm check wouldn't catch — flagged, not resolved.
- The email/phone input's placeholder text (`admin@example.com أو 961xxxxxxxx أو resort-name`) visibly
  truncates at the input's own edge at narrow widths — this is normal `overflow: hidden` input
  behavior, not a page-layout bug, but worth explicitly ruling in/out with a human since it could be
  misread as "clipped text" at a glance.

## Unknowns — the real, honest gap

**The single biggest untested variable is Chrome DevTools' own Device Toolbar emulation**, which the
human's screenshot was captured through and this investigation's tooling cannot currently replicate:
- `isMobile`/touch-event injection (Playwright's `browser_resize` changes only the CSS viewport, not
  full device emulation — no `hasTouch`, no forced `devicePixelRatio`, no mobile `User-Agent`).
- The DevTools **50% display zoom** specifically shown in the human's screenshot toolbar — this is a
  known category of Chrome DevTools rendering-compositor quirk at fractional zoom levels (can produce
  incomplete/blank paint tiles independent of the actual page's real CSS), not exercised by this
  investigation at all.
- A genuinely **cold** first paint — every check run here inherited an already-`"loaded"`
  `document.fonts.status` from a long-lived browser process; a true first-ever load (cleared cache,
  fresh profile, first paint before fonts arrive) was never isolated.

None of these were fabricated or assumed away — they are named explicitly as untested, per this
project's own Evidence Interrogation standard, rather than silently resolved in the optimistic
direction.

## Recommendation (not a decision — Salman's to make)

Before committing to a full Login UX Rebuild phase, one cheap, fast, human-side test would close the
single biggest remaining Unknown: reproduce the bug in the *same* real Chrome DevTools session but
with **zoom set to 100%** instead of 50% (Device Toolbar has a zoom dropdown next to the dimensions).
If the gray box/clipping disappears at 100% zoom, this was a DevTools rendering-compositor artifact,
not a real page bug — no rebuild needed, close this investigation. If it persists at 100% zoom, that
rules out the zoom-artifact explanation and makes this a confirmed real bug worth the full Rebuild
scope Salman described (fix the layout properly, not patch dimensions) — and the next investigation
step would be adding real Playwright device-emulation (`devices['iPhone 14 Pro Max']`, not
`browser_resize`) to finally close the remaining reproduction gap myself, rather than relying on a
human recheck each time.
