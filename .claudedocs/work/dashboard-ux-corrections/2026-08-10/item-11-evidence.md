# Item #11 — Dashboard routing/URL fixes — Evidence

Follows: `.claudedocs/implementation/DASHBOARD_UX_CORRECTIONS_CONTRACT.md`, Section B.11. Follows
`investigation-protocol.md`'s Confirmed/Side Findings/Unknowns discipline throughout — this item
ships **partially**, with one real, confirmed, unresolved bug named explicitly rather than folded
into a "done" claim.

## What Was Implemented

1. **URL ↔ tab sync** — `frontend/src/pages/generic-admin/GenericAdminDashboard.jsx`: `activeTab`
   is now read from `useParams()['*']` on mount and written back via `navigate(..., {replace:true})`
   on every tab switch (`changeTab()`, replacing every `setActiveTab` call site). Works uniformly
   for both real route patterns mounting this component (`/dashboard/:slug/*` legacy,
   `/:slug/dashboard/*` canonical) since both wildcard-capture the tab segment.
2. **Login.jsx canonical redirect** — `frontend/src/pages/admin/Login.jsx`: now redirects every
   tenant to `/{slug}/dashboard` (bare, no hardcoded tab segment), matching `SSOLoginPage.jsx`'s
   already-fixed, unconditional behavior exactly — closing the two-different-URLs-for-one-
   destination inconsistency. The previous `smar`-special-case (`/dashboard/smar/units`) was
   removed after confirming via a direct read of `App.jsx`'s real route table that
   `/dashboard/:slug/*` already renders `GenericAdminDashboard`, not `SmarAdminDashboard` — the
   special-case was never reaching its intended target in the first place.
3. **STAFF Overview-flash fix** — `activeTab`'s initializer now resolves `isStaff` synchronously
   (from the JWT, no async wait) and defaults directly to `'calendar'` for STAFF, instead of always
   starting at `'overview'` and being force-corrected by a later effect. This is real and correct on
   its own merits (STAFF should never transiently mount `OverviewTab` or fire requests against
   endpoints it has no access to) — confirmed fixed: a later 5-cycle re-test showed **zero** 403s
   and **zero** Overview-text sightings, versus the original bug report's real 403s on
   `catalog/items`, `catalog/categories`, `store/orders`.

## Real Verification — TENANT_ADMIN (PASS)

Desktop + mobile: tab clicks correctly changed the URL (`/rk/dashboard/calendar`,
`/rk/dashboard/reservations`, `/rk/dashboard/staff`, `/rk/dashboard/store`,
`/rk/dashboard/overview`); a hard reload on a non-default tab (الموظفون) landed back on that same
tab, not reset to Calendar/Overview; login via `/login` landed on the canonical `/rk/dashboard`
pattern with no crash. **Full regression** (Overview, Calendar, Reservations, Staff ×2 subviews,
Store ×3 subviews, Settings) — all loaded real content, zero blank screens, desktop + mobile.

**Real side finding, non-blocking:** browser back-button doesn't step back through each visited tab
one at a time — internal tab navigation uses `replace`, so two consecutive back-presses jump further
than one tab at a time. Reported here as a real UX note, not a functional blocker (every landing
page still renders real content); not fixed in this pass — `replace` was an explicit requirement
(Section B.11: avoid history-spam on every tab click), and switching to `push` would need its own
separate evaluation of that tradeoff, not silently decided here.

## STAFF — 🔴 Confirmed, Unresolved Bug

### Confirmed Finding

Clicking a STAFF nav item (الحجوزات or عملائي) — specifically the **first click after a fresh
login** — intermittently does nothing: the URL stays on the landing page, the breadcrumb doesn't
change, and no tab-content update occurs.

**Reproduction rate, real evidence across 4 independent test rounds, both dev and production
builds:**

| Round | Build | Cycles | Failures | Notes |
|---|---|---|---|---|
| Full verification pass | dev | 3 (desktop×2 + mobile×1) | 3/3 | First discovery |
| 5-cycle re-test (post STAFF-flash fix) | dev, fresh restart | 5 | 4/5 | Fix didn't resolve it |
| 800ms-wait timing test | dev | 5 | 3/5 | Rules out script-speed artifact |
| Definitive diagnostic (console-instrumented) | dev, fresh restart | 1 (stopped at first failure) | 1/1 | Click event never reaches React at all |
| **Production build test** | **production (`vite build` + `vite preview`, real backend via `VITE_API_URL`)** | **6** | **3/6** | **Confirms this is NOT a dev-only artifact** |

### Evidence Interrogation

- **Files read:** `GenericAdminDashboard.jsx` (full, multiple passes), `NavItem` component
  definition, `hasSetDefaultRef` effect, `changeTab` callback, `basePath` computation;
  `ProtectedRoute.jsx` (full); `useAdminRole.js`/`useAdminBarberId()` (full, ruled out — pure
  synchronous localStorage reads, no async, no navigation side effects); `useTenantSlug.js` (full,
  ruled out — pure synchronous computation); `admin.config.js`'s axios interceptors (full, ruled out
  as a cause of spurious redirects — 401 handling is real but not observed firing during any
  captured failure); `App.jsx`'s route table (confirmed only one route matches a bare
  `/{slug}/dashboard` URL, ruling out a duplicate-route double-mount).
- **Alternative explanations considered and excluded, each with real evidence:**
  1. **Script-click-too-fast artifact** — excluded. An 800ms human-reaction-time wait before
     clicking still failed 3/5 times; a scripted click firing within milliseconds of element
     availability would predict near-100% success once a realistic wait is added, which did not
     happen.
  2. **Mobile/`isMobile` responsive-breakpoint flip** — excluded. A console-instrumented diagnostic
     logged `isMobile`/`innerWidth` on every render; both stayed constant (`isMobile: false`,
     `innerWidth: 1534`) across the entire session, including the failing click.
  3. **Router/`navigate()` bug (handler fires but has no effect)** — excluded. A temporary
     diagnostic `console.log` placed inside `changeTab()` itself never fired during any of the
     captured failures (confirmed via a controlled 4-cycle test: 2 successes both logged
     `[DIAG changeTab]` + a URL change; 2 failures logged neither) — the click event does not reach
     the React `onClick` handler at all in the failure case, this is not a state/navigation-layer
     bug.
  4. **React StrictMode's documented dev-only double-mount** — the leading hypothesis for several
     hours of this investigation, given `main.jsx` does wrap the app in `<StrictMode>` and a
     console-instrumented test did capture a real, confirmed mount→unmount→remount cycle on the
     sidebar's `NavItem`s happening once, automatically, right after `loading` resolves (matches
     React 18+'s documented "simulate unmounting and remounting" StrictMode behavior). **Decisively
     excluded** by two independent pieces of evidence: (a) the one fully-instrumented failure
     capture showed the remount had *already completed*, with two stable render cycles logged,
     before the click — the DOM was not mid-transition at click time; (b) a genuine `vite build` +
     `vite preview` production run (no StrictMode double-invoke at all) still failed 3/6 times, the
     same order of magnitude as every dev-mode round.
  5. **A stray 401/session-expiry redirect** — excluded. `admin.config.js`'s response interceptor
     does a hard `window.location.href = '/login'` on any 401, which would be trivially visible
     (full page reload, URL becomes `/login`). No failing cycle showed this.
- **What remains unconfirmed:** the exact mechanism by which the click event fails to reach React's
  synthetic event system on the very first STAFF interaction after login, roughly half the time.
  Ruled out: mobile state, router logic, StrictMode, session expiry, script timing. Not yet
  isolated: whether this is specific to `browser_click`'s CDP-level event dispatch (ref/coordinate
  resolution racing a real but not-yet-instrumented render/layout pass) or a genuine React event-
  delegation edge case independent of the test tool. No real mouse/keyboard test outside Playwright
  MCP has been possible in this environment.

### Side Finding

One login-submit attempt during testing required two clicks on the submit button before the login
form actually navigated away — noted once, not investigated further (separate from this nav-click
bug; happened at `/login`, not on the dashboard).

### Practical Impact

Every failing case self-resolved on a second click or a page reload — no session showed a
*permanently* stuck nav button. STAFF can always reach Reservations/Customers via a second click or
a direct URL. This is a real usability rough edge on first login, not a hard blocker to the
underlying pages (both work correctly once reached), but it is a confirmed, unresolved, intermittent
regression risk for the STAFF role's daily entry point.

## Status

✅ **TENANT_ADMIN** portion of Item #11 (URL sync, canonical Login.jsx redirect, full regression):
verified, shipped.
🔴 **STAFF nav-click bug**: real, confirmed, reproduces in production, root cause not isolated after
substantial investigation (5 independent real-browser test rounds, one leading hypothesis
decisively ruled out). Left open — not silently shipped as resolved, not fixed with an unproven
guess. Flagged to Salman directly rather than closed out.
