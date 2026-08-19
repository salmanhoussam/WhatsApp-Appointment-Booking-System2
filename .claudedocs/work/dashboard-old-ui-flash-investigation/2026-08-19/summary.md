# Investigation — "Old Dashboard" Flash on Load / Weak Connection

Follows `investigation-protocol.md`. **Investigation only — no code changed, no data changed, no
commit made**, per Salman's explicit instruction.

## Trigger

Salman's real screenshot (`/mr-h/dashboard/settings`, real browser, Firefox) showed, briefly, a
Dashboard with a short nav (`نظرة عامة`/`الطلبات`/`الكتالوج`/`الإعدادات`) and generic/default
General Settings values (`الاسم بالعربي` = "لوحة التحكم", color `#6366f1`) — visibly different from
Mister H's real, fuller reservations-nav and real branding, appearing briefly before the correct
UI settles in.

## Method

Code traced first with exact file/line citations, then confirmed with real browser evidence
(Playwright, driven directly in-session): route-matching analysis for both localhost and the
`demo.` subdomain, a real CDP-level whole-network throttle pass, a real route-level API-delay pass
(isolating API latency from JS-bundle-transfer latency), 2 real screenshots captured mid-load, and
citation of real backend-log evidence from earlier in this same session (genuine Supabase pooler
failures, not simulated).

---

## A. Which component/route renders the "old" Dashboard?

**None — there is no second, old Dashboard component involved.** It is `GenericAdminDashboard.jsx`
itself — the same, current, single Dashboard component every tenant uses — caught mid-render,
across two real, sequential loading states that only become visible when its data sources are slow
or fail:

1. **Full-screen spinner** (`GenericAdminDashboard.jsx:217-232`, `FullScreenSpinner`) — shown while
   `loading === true` (`:334`), which stays `true` until `GET /admin/settings` resolves
   (`:345-357`). **Real screenshot captured** (`.claudedocs/work/dashboard-old-ui-flash-investigation/2026-08-19/loading-window-fresh.png`,
   also `final-window-fresh.png`): a light-gray full-screen background with a small spinning ring
   in `#6366f1` — confirmed by reading the component: `color = settings?.primary_color ?? '#6366f1'`
   (`:454`), and `settings` is still `null` at this point, so the fallback color is what renders —
   exact match to the captured screenshot.

2. **The dashboard shell with mismatched data** (Salman's own screenshot) — once `loading` becomes
   `false` (the settings fetch has resolved, successfully **or** into its own `.catch()` fallback),
   `GenericAdminDashboard` renders its real shell — nav (`NAV`, `:606,832`) and `SettingsTab`. Two
   things can still be behind at this exact moment, independently of each other:
   - `NAV = isStaff ? STAFF_NAV : buildNav(hasReservations)` (`:460-461`), where
     `hasReservations = activeServices.includes('reservations')` (`:458`) and
     `activeServices = config?.active_services ?? []` (`:457`) — `config` comes from a **separate**
     hook, `useTenantConfig()`, not from `settings`. Confirmed exact match:
     `buildNav(false)` (`:169-177`) returns **precisely** `نظرة عامة`/`الطلبات`/`الكتالوج`/
     `الإعدادات` — the exact 4 items in Salman's screenshot, byte-for-byte.
   - `settings` itself, if `GET /admin/settings` genuinely failed rather than being slow, is set to
     a hardcoded literal (`:354`): `{ name_ar: 'لوحة التحكم', primary_color: '#6366f1' }` — the
     exact values shown in the screenshot's "الاسم بالعربي" field and color swatch.

**Both are real, current code paths in the one real Dashboard component** — not a legacy file, not
a cached bundle, not a second render tree.

## B. Why is it selected during startup / weak connection?

Because **two independent async data sources gate different parts of the same render, and nothing
waits for both before showing the "final" shell**:

- `settings` — a local `useEffect` + `useState`, fetched once via `GET /admin/settings`
  (`:345-357`). Its own error path (`.catch()`) silently substitutes hardcoded generic values
  instead of surfacing an error state — by design (`prevents white screen`, matching
  `useTenantConfig.js`'s own documented same-intent fallback), but with the side effect of *looking
  like a different, older product* rather than an error.
- `config`/`activeServices` — `useTenantConfig()` (`useTenantConfig.js`), a **separate** TanStack
  Query hook. Its own documented fallback (`useTenantConfig.js:24,34-55,83-87`): `resolved = config
  ?? DEFAULT_CONFIG`, and `DEFAULT_CONFIG.active_services = []` — used **both while the query is
  still loading and on a real error**, not only on error. So `NAV` computes from an empty
  `active_services` (→ the short, generic nav) for the entire real duration this query is in
  flight, independent of whatever `settings`/`loading` are doing.

These two fetches are not synchronized. `loading` (gating the spinner) only tracks the `settings`
fetch. The moment `loading` flips to `false`, the real shell renders using *whatever each source
currently has* — which, on a slow or degraded connection, is very often "`settings` back (fast, one
row), `config` still pending (a heavier query with its own retry logic, `retry: 2`,
`useTenantConfig.js:74`)". That gap is the real, structural cause — not a special-cased "startup
mode" or feature flag; there is no such flag anywhere in this file (confirmed, no `isInitializing`/
`isFirstLoad` state exists).

**Real trigger already observed this session, not simulated**: repeated genuine Supabase pooler
failures during this same session's own Phase 1 verification (`Can't reach database server at
aws-1-ap-southeast-2.pooler.supabase.com:6543`, and once a connection-pool timeout) produced real
500/503s on exactly `GET /admin/settings` and `GET /content/sections` — this is a real, already-
documented, recurring instance of the "weak/failing connection" condition Salman described, not a
hypothetical.

## C. Is it a real production render path, or a dev/cache artifact?

**Real production render path — confirmed by reading the actual code, not environment-specific.**
Neither `FullScreenSpinner` nor `NAV`'s computation nor `settings`'s `.catch()` fallback contain any
`import.meta.env.DEV` check, any dev-only branch, or any cache-layer involvement:

- **No Service Worker** registered anywhere in the codebase (grepped `frontend/src/`,
  `frontend/public/`, `vite.config.js` — zero matches for `serviceWorker`/`workbox`).
- **No relevant localStorage/sessionStorage caching** — the only `localStorage` keys touched
  anywhere near this path are `admin_access_token` (`ProtectedRoute.jsx`,
  `GenericAdminDashboard.jsx:350,499`) — pure auth token storage, not a UI/config cache.
- **React Query's own cache** (`staleTime`/`gcTime` in `useTenantConfig.js:66-67` and the app-wide
  `QueryClient` in `App.jsx:26-35`) is real and does mean a *second* visit within 10 minutes skips
  the loading window — but the *first* visit (or any visit past the 10-minute staleTime) always
  re-runs this exact real sequence. This is why Salman's own report names "أول مرة" (first time) and
  "اتصال ضعيف" (weak connection) specifically — both are exactly when this cache can't help.

**One real, additional, dev-environment-specific contributing factor, confirmed separately** by a
real CDP whole-network-throttle test (400kbps/600ms latency) against the live `localhost:5173` dev
server: `document.getElementById('root').innerHTML` stayed **completely empty** (not even the
spinner) for over 7 real seconds before jumping straight to content, because Vite dev mode serves
hundreds of individual unbundled ES module requests (`node_modules/.vite/deps/*.js`, confirmed in
the real network log) rather than one bundled, minified, cacheable file. **This is a real,
distinct, dev-only tax on top of the API-timing cause above** — a production build (bundled,
code-split, browser/CDN-cached) would not have this specific blank-white-screen precursor, but
would still have the two-stage spinner→mismatched-shell sequence from §B, since that part depends
only on API timing, not on how the JS itself is served.

## D. Does it affect `mr-h` only, or the whole Tenant OS?

**The whole Tenant OS — confirmed structurally, not just tested on two tenants.**
`GenericAdminDashboard.jsx`'s loading/`settings`/`useTenantConfig`/`NAV` logic contains **zero**
`slug`/tenant-specific branching anywhere in this code path (confirmed by reading the full
relevant range, `:325-461` — the only conditionals are `isStaff` (role-based, not tenant-based) and
`hasReservations` (capability-based, not tenant-based)). Any tenant using the Generic Admin
Dashboard — RK included, and every future Tenant OS tenant this session's own TOS-005/Section
Editor work targets — hits the identical sequence under the identical conditions. `SmarAdminDashboard`
(the one real *other* Dashboard component in this codebase, `frontend/src/pages/smar/admin/
SmarAdminDashboard.jsx`) is architecturally unrelated and, confirmed by tracing `App.jsx`'s real
route table (`:137-185`) against the exact URL pattern `/{slug}/dashboard/*` on both `localhost`
and `demo.salmansaas.com`, **never matches this URL at all** in either environment — ruled out as a
routing-ambiguity cause, not merely assumed absent.

## E. Least, correct architectural fix (recommendation only — not implemented)

The real structural gap is that **one render decision (show the final shell) currently depends on
only one of two real async sources**. The smallest correct fix: gate `FullScreenSpinner` on *both*
`loading` (the `settings` fetch) **and** `useTenantConfig()`'s own `isLoading` — i.e., don't clear
the spinner until both real data sources are ready, not just one. Concretely (described, not
written): change `if (loading) return <FullScreenSpinner />` to also check the `isLoading` this
component's own already-called `useTenantConfig()` hook (`:342`) already returns — no new fetch, no
new state, no new component, just widening one existing boolean condition. This collapses the real
sequence from 3 visually distinct states (spinner → mismatched shell → correct shell) to 2 (spinner
→ correct shell), which is the actual fix for "looks like an old product" — the mismatched middle
state is what reads as regression, not the spinner itself (a spinner is an honest loading signal;
a wrong-but-fully-rendered dashboard is not).

**Separately, a smaller, independent finding**: `settings`'s own `.catch()` fallback
(`:354`) silently substitutes fake-looking real data (`'لوحة التحكم'`, a real-looking name) instead
of a visible error/retry state, on any real fetch failure — including the exact kind of transient
Supabase pooler failure this session has hit repeatedly. Worth a future decision (a real error
banner + retry action, rather than a silent fake-default), but that is a separate, smaller UX
decision from the NAV/spinner sequencing fix above — not bundled into "the" fix.

---

## Confirmed Findings

- The "old Dashboard" is `GenericAdminDashboard.jsx`'s own real, current, unmodified loading
  sequence — not a legacy component, not a cache artifact, not a routing bug.
- Two independent, unsynchronized async sources (`settings` local fetch, `useTenantConfig()` React
  Query) each gate different visible parts (spinner vs. NAV/branding), producing a real 2-3 stage
  visible sequence under slow/failing conditions.
- Confirmed with real evidence: 2 real screenshots of stage 1 (the spinner, exact color match to
  code), Salman's own real screenshot as direct evidence of stage 2 (exact nav/value match to
  code), and real backend-log evidence of the actual "weak connection" trigger from earlier this
  session.
- Affects the entire Tenant OS structurally (no tenant-specific code in this path) — not an
  `mr-h`-only issue.
- `SmarAdminDashboard` ruled out by real route-table tracing, not assumption.
- No Service Worker, no relevant localStorage cache, no feature flag involved.

## Side Findings

- A real, separate, dev-environment-only contributing factor: Vite dev mode's unbundled
  module-transfer time can itself produce an even earlier, longer, fully-blank (`#root` empty)
  window under a throttled connection — distinct from, and additive to, the API-timing cause above.
- `settings`'s `.catch()` fallback (`:354`) silently fakes real-looking default data on any fetch
  failure rather than surfacing an error — a real, separate, smaller UX gap.
- **Pre-existing, confirmed unrelated to Phase 1 of the Tenant OS Section Editor**: this session's
  Phase 1 work touched only `SettingsTab.jsx`'s `SectionSettingsArea`/`SectionRow` internals: it
  never touched `GenericAdminDashboard.jsx`'s `loading`/`settings`/`useTenantConfig`/`NAV` logic at
  all. This bug predates that work entirely and is logged here as its own, separate, standing
  finding — not folded into Phase 1's own evidence trail.

## Unknowns

- The exact wall-clock duration a real user experiences this on a genuinely slow connection (not
  simulated) wasn't measured — the real trigger observed this session was backend-side failures/
  retries, not last-mile client bandwidth specifically; both are named in §B as real triggers, but
  only the backend-failure case has real, first-party evidence from this exact session.
- A clean, single-frame screenshot of *stage 2 specifically* (the mismatched shell) was not
  captured fresh by this investigation's own browser automation — the synthetic route-delay attempts
  stayed on stage 1 (the spinner) for the tested window rather than advancing to stage 2, likely
  because the isolated test page's own auth/query timing didn't line up with the artificial delay
  window. This does not weaken the finding (Salman's own real screenshot already *is* direct,
  first-party evidence of stage 2, matched precisely against the code in §A) — named here as a real
  gap in this investigation's own reproduction, not hidden.
