# salmansaas.com Product IA — Root Home + Demo Subdomain Routing

Follows `investigation-protocol.md` / `browser-verification-protocol.md`. Implements the direction
decided in `.claude/plans/we-moved-on-new-hazy-barto.md` ("salmansaas.com — Company/Product IA
Recommendation"), approved by Salman 2026-08-12 with one clarification (demo entry point =
`demo.salmansaas.com/alzabt`, not the plan's earlier draft).

## What changed

- **`frontend/src/pages/home/ProductShowcaseHome.jsx`** (new) — root (`/`) page. Light shell, two
  sections only, no broader redesign, no reusable "product section framework":
  - `SmartOrderProductSection` (new, `frontend/src/pages/home/sections/`) — static "قريباً"
    placeholder. No working CTA, no demo link, no data. Muted styling on purpose (per Salman's
    explicit constraint: must not look like a finished product on par with Alzabt).
  - `AlzabtProductSection` (new, same folder) — real, complete summary carrying Alzabt's own
    Violet `#7C3AED` accent, links to `/alzabt`.
- **`frontend/src/router/showcase.routes.jsx`** — index route now renders `ProductShowcaseHome`
  instead of `HomePage`. `HomePage.jsx` itself is untouched, just no longer mounted at `/` (its
  `/company` move stays optional/independent, not part of this scope, per the plan).
- **`frontend/src/App.jsx`** — new route: `IS_DEMO_SUBDOMAIN && <Route path="/alzabt" element={
  <Navigate to="/alzabt-demo/reserve" replace />} />`. Makes `demo.salmansaas.com/alzabt` redirect
  directly into the existing, pre-seeded `alzabt-demo` tenant — no new tenant, no RK involvement.
- **`frontend/src/pages/alzabt/AlzabtLandingPage.jsx`** — `tryDemo()` now checks
  `window.location.hostname.includes('salmansaas.com')` (same idiom as
  `pages/showcase/config.js`'s `REGISTER_URL`): production → `https://demo.salmansaas.com/alzabt`;
  local/dev (no real subdomain) → unchanged in-app `navigate('/alzabt-demo/reserve')`.

## Confirmed Findings (real browser verification, nested Playwright, localhost:5173)

- **`/showcase` (dev-mode root)**: loads clean, `h1` = "منتجاتنا", both section headings present
  ("Smart Order", "عالزبط"). Exactly one real CTA button ("جرّب عالزبط") — Smart Order's section
  has **no** clickable CTA, only the "قريباً" label, matching the honesty constraint. 0 console
  errors, 40/40 network requests 200 OK.
- Clicking "جرّب عالزبط" on the root page → lands on `/alzabt` correctly (root section → full
  marketing page, per the IA).
- Mobile (390×844): no horizontal overflow (`scrollWidth === clientWidth === 375`).
- `/alzabt` itself still loads clean (0 console errors) after the `tryDemo()` change. Clicking its
  top-nav "جرّب عالزبط" on localhost → `/alzabt-demo/reserve` (in-app navigate branch, correctly
  NOT the production cross-domain redirect, since `localhost` doesn't match `salmansaas.com`).
- Screenshots: `root-desktop.png`, `root-after-alzabt-click.png`, `root-mobile.png`,
  `alzabt-cta-after-click.png`.

## Unknowns

- **`demo.salmansaas.com/alzabt` itself was not verified by a real cross-domain browser hit** — no
  real DNS/hosts entry for that subdomain exists in this local sandbox, so the exact
  `IS_DEMO_SUBDOMAIN` branch added to `App.jsx` could not be exercised end-to-end here. Confidence
  is based on code parity: the new route uses the exact same `IS_DEMO_SUBDOMAIN` condition already
  gating the working `/home` (DemoLandingPage) and `/login` (SSO) routes in the same file — not a
  new detection mechanism, just one more branch on an already-proven one. Recommend a real
  production/staging smoke check of `https://demo.salmansaas.com/alzabt` once deployed, before
  treating it as fully closed.
- The production cross-domain redirect in `AlzabtLandingPage.jsx`'s `tryDemo()` (the
  `window.location.href = 'https://demo.salmansaas.com/alzabt'` branch) is likewise unverified by
  a real hostname match locally — same reasoning, same recommended follow-up.

## Explicitly out of scope (per the approved plan)

- No `/company` route added for `HomePage.jsx` — optional, independent, not built now.
- No Smart Order demo route (`demo.salmansaas.com/smart-order`) — no real tenant to redirect to.
- No changes to `/alzabt`'s own content beyond the CTA target logic — already shipped, already
  verified separately (`.claudedocs/work/alzabt-marketing-verification/2026-08-12/summary.md`).
- Step 13 (LIVE) — unaffected, still stopped, still requires Salman's own explicit decision.
