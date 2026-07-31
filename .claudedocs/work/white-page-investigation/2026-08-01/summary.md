# White-Page Investigation — 2026-08-01
Follows: Investigation Protocol (`.claude/rules/investigation-protocol.md`)

**Scope:** reproduce and evidence-gather the white-page issue reported on `/hr/store`. Per explicit
instruction, **no fix was implemented** — this is evidence collection only, using the newly-verified
Playwright MCP browser (see `.claudedocs/work/browser-mcp-tool-verification/2026-08-01/evidence.md`
for proof the tool itself is trustworthy before trusting what it reports here).

## Method

Real Chromium, launched and driven via `@playwright/mcp`, navigated to two independent URLs on the
real local dev servers (`http://192.168.16.103:5173`, `http://192.168.16.103:8000`):
- URL A: `/hr/store` (the originally reported bug)
- URL B: `/smar/showcase` (this project's own documented "Original baseline ✅ Live" tenant — chosen
  specifically to test whether the bug is `hr`/Store-specific or broader)

For each: navigate → wait 3s → `browser_evaluate` (direct DOM read) → `browser_console_messages`
(full list) → `browser_network_requests` (filtered) → `browser_take_screenshot`.

## Confirmed Findings

1. **React never mounts, on both URLs.** `browser_evaluate` returned
   `rootHTMLLength: 0, bodyHTMLLength: 87` for both `/hr/store` and `/smar/showcase` — `#root` is
   completely empty; `bodyHTMLLength: 87` is just `index.html`'s static shell. Screenshots
   (`urlA-hr-store.png`, `urlB-smar-showcase.png`) visually confirm a blank, off-white viewport for
   both.
2. **This is not `hr`-specific or Store-specific.** Identical failure on `smar/showcase`, a
   completely different tenant, different module (`booking` vs `store`), different route file. This
   overturns the working assumption from earlier tonight (that this was a Store Pilot / `hr`
   problem) — it is an app-wide failure in the current dev-server process state.
3. **Zero console errors on either URL.** `browser_console_messages` (all levels) returned exactly
   3 benign messages both times: `[vite] connecting...`, `[vite] connected.`, and the standard React
   DevTools suggestion. No thrown exception, no unhandled rejection, no React error-boundary log
   surfaced through this capture method.
4. **Vite itself is healthy.** All 28 requests per URL (module/asset graph) returned `200`. The
   `@vite/client` HMR handshake completed (`connecting...` → `connected.`) on both.
5. **Zero `/api/` requests fired on either URL.** Checked the full unfiltered 28-request list for
   both, not just the filtered view — confirms the app never got far enough to call the backend at
   all. This directly answers "are API requests succeeding" — they're not attempted, not failing.
6. **The module graph stops at an identical point on both URLs**: the last-loaded module is
   `/src/router/tenants/_dynamic.routes.jsx` (request #28 of 28). No tenant-specific routes file
   (`hr.routes.jsx`, `smar.routes.jsx` — neither exists as a request), no page component, nothing
   past that file is ever requested.
7. **The Vite dependency-optimizer cache is stale relative to this session's edits.**
   `frontend/node_modules/.vite/deps` — `stat` shows Modify/Change/Birth all
   `2026-07-23 23:23:45`, i.e. over a week old. An `rm -rf` of this exact directory was attempted
   earlier in tonight's session (as a fix for a different, human-observed error — see Side Findings
   #1) but produced no confirming output at the time; this `stat` check, done fresh just now, proves
   that clear **did not take effect** — the cache directory's own timestamps are unchanged from
   before the attempt. The current Vite process (`pid 45057`, started `Jul 31 23:53:10`) has been
   serving requests against this same stale, pre-tonight's-edits dependency pre-bundle the entire
   time.

## Side Findings

1. Earlier tonight (before this Playwright-based investigation existed), a human using Chrome
   DevTools with "pause on uncaught exceptions" manually enabled caught a real thrown error:
   `"lazy: Expected the result of a dynamic import() call. Instead received: %s..."`, with a call
   stack through `TenantResolver.jsx:100` (the line rendering
   `<Suspense><DynamicTenantRoutes /></Suspense>`, where `DynamicTenantRoutes = lazy(() =>
   import('./tenants/_dynamic.routes'))`). This matches Confirmed Finding #6's stop point exactly.
   **This exception did not appear in this session's `browser_console_messages` capture**, even
   though the same class of failure (React never mounting) is reproduced. This is not a
   contradiction — a debugger's "pause on exceptions" breakpoint intercepts at the JS engine level,
   before/independent of whatever React's own internal error-logging does; `console_messages`
   only sees what actually gets logged via `console.*`. If React's `lazy()` internally
   catches/retries a bad Promise resolution without ever calling `console.error`, a debugger
   breakpoint can see it while a console-log capture cannot. Recorded as a real methodology lesson,
   folded into the new Browser Investigation Protocol.
2. Running two navigations back-to-back within the same nested session opened two browser tabs; a
   `browser_network_requests` call without first specifying a fresh navigation returned a merged
   list across both tabs. Worked around by re-navigating and re-capturing per URL rather than
   trusting a stale multi-tab list — noted so a future investigation doesn't lose an hour to the
   same trap.

## Root Cause — confidently identified, evidence-backed, NOT implemented as a fix

The stale `node_modules/.vite` dependency-optimizer cache (Confirmed Finding #7) is the most likely
root cause: this project's Vite dev server has been restarted many times tonight (HTTP → HTTPS →
proxy → HTTP again, multiple config edits to `vite.config.js`, `.env`, `publicApi.js`,
`api/index.js`) while the underlying pre-bundled dependency cache stayed frozen at a July 23 state.
A stale pre-bundle serving a dynamic-import chain (`TenantResolver.jsx` → `lazy(() =>
import('./tenants/_dynamic.routes'))`) against a source tree that has since changed shape is a
well-documented class of Vite bug — the dynamic import resolves to a stale/mismatched module
reference, which is exactly the "Expected the result of a dynamic import() call. Instead received:
%s" error shape React throws.

This explains every Confirmed Finding coherently: Vite/network layer genuinely healthy (stale cache
still serves 200s, it's just serving the *wrong* content), no console error surfaces (the failure
happens inside React's lazy-loading internals, not as an app-level thrown/logged error), and it's
reproducible identically across unrelated tenants (the shared dependency, `_dynamic.routes.jsx`'s
own lazy-import chain, is common to all of them).

## Recommended Fix — described only, not executed (out of scope for this investigation)

1. Stop the Vite dev server. Confirm no duplicate process is bound to the port (a real, previously
   observed risk tonight — a second `vite --host` process silently competing on 5174).
2. `rm -rf frontend/node_modules/.vite` and confirm via `stat` (not just trusting the command's exit
   code) that the directory is actually gone before restarting — tonight's attempt appears to have
   silently no-opped, and that should not be assumed fixed without checking.
3. Restart Vite fresh, then re-run this exact Playwright verification sequence (Confirmed Finding
   method above) against both `/hr/store` and `/smar/showcase` before declaring it resolved.
4. If the stale-cache clear does **not** resolve it: the next diagnostic step (not a fix) is
   temporarily wrapping the `<Suspense>` in `TenantResolver.jsx` with a React Error Boundary, purely
   to force the swallowed/retried lazy-loading error to actually render/log visibly, since Side
   Finding #1 shows the current failure mode is invisible to normal console capture.

## Unknowns (as of the original evidence-only pass — resolved below)

- Whether clearing the cache correctly (per the Recommended Fix above) actually resolves this —
  genuinely unverified, since no fix was applied in this investigation.
- The exact reason the dynamic import resolves badly (a genuine Vite optimizer bug for this
  dependency graph, vs. a real code issue in `_dynamic.routes.jsx` that happens to be masked by the
  stale cache) — cannot be distinguished until a clean-cache run is actually observed.
- Whether the interaction (`browser_click`) capability of the Playwright MCP works end-to-end
  against this app specifically — untested, since no page currently renders anything clickable (see
  the tool-verification evidence file's Known Limitation).

---

## Resolution — same day, follow-up mission ("Frontend White Page Resolution")

Salman authorized a follow-up mission to actually resolve this, under a strict methodology: one
change at a time, real Playwright MCP re-verification after every change, revert if no measurable
effect, never stack fixes in one commit. Executed exactly that way — the stale-cache hypothesis
above turned out to be a real but insufficient lead; the actual root causes were three independent,
smaller issues, only found because each change was re-verified in a real browser instead of assumed
fixed.

### Change #1 — clear `node_modules/.vite` properly (REJECTED — no measurable effect)

The original evidence-only pass's cache-clear attempt had silently no-opped (confirmed via `stat`:
the cache directory's Modify/Change/Birth timestamps were all `2026-07-23`, unchanged by the earlier
`rm -rf`, whose command produced no confirming output at the time). Redone properly this time: Vite
stopped, cache directory removed, **confirmed gone via `ls` before restarting** (unlike the earlier
attempt, which was never checked), Vite restarted clean, single process confirmed via `ss` (no
duplicate port-5174 competitor). Cache rebuilt fresh, confirmed via `stat` showing `2026-08-01`.

**Playwright re-verification, both `/hr/store` and `/smar/showcase`:** identical failure signature
to the original evidence — `rootHTMLLength: 0` on both, zero console errors, zero `/api/` calls,
module graph still stopping dead at `_dynamic.routes.jsx` on both. **No change at all.** Per the
mission's own Verification Standard ("if nothing changed, the edit didn't address the real cause"),
this rejected the stale-cache-alone hypothesis as *sufficient* — real evidence, not "I think this
fixes it."

### Change #2 — `App.jsx`'s `IS_SUBDOMAIN_MODE` hostname check (CONFIRMED real cause, part 1 of 3)

**Root cause:** `App.jsx` (module scope, lines 54-58) classifies a request as "subdomain mode" from
`window.location.hostname` — but its check only excludes `localhost` and `127.*`, not `192.168.*`
(LAN IPs). `useTenantSlug.js`'s own, separate `_isSubdomainMode()` **already** excludes `192.168.`
(line 19) — the two files disagreed. For a LAN IP, `App.jsx` wrongly computed
`IS_SUBDOMAIN_MODE = true`, which changes which React Router pattern gets registered for the tenant
catch-all: `<Route path="/*">` instead of `<Route path="/:slug/*">` (`App.jsx` lines 222-225).
`TenantResolver.jsx`'s own docblock explicitly documents relying on the `/:slug/*` pattern to strip
the right `pathnameBase` prefix for its child `<Routes>` to match correctly. With the wrong pattern,
`_dynamic.routes.jsx`'s inner router tries to match sub-paths against the wrong remaining path,
never matches any real route, and falls through to its own catch-all
`<Route path="*" element={<Navigate to="" replace />} />` — which renders nothing and silently
redirects, explaining every original symptom (empty root, zero console errors, zero `/api/` calls,
module graph stopping at `_dynamic.routes.jsx`).

**Fix:** aligned `App.jsx`'s hostname check with `useTenantSlug.js`'s already-proven pattern —
excluded `192.168.` the same way. Single file, single cause.

**Playwright re-verification:** real, measurable, partial progress — `/hr/store` now fires real
`/api/` calls (`hr/config`, `hr/catalog/categories`, both 200) for the first time, proving the
module graph now continues past `_dynamic.routes.jsx` into real page code. But it still hit a *new*,
different, later-stage error (Change #4 below). `/smar/showcase` was **unaffected** — still
`rootHTMLLength: 0`, zero `/api/` calls. This asymmetry became the clue for Change #3.

### Change #3 — `TenantResolver.jsx`'s own, separate copy of the same class of bug (CONFIRMED real cause, part 2 of 3)

**Root cause:** `TenantResolver.jsx` (lines 58-60, unrelated code path from `App.jsx`, its own
independent hostname parsing) has the *identical* gap: `isLocalhost` excluded `127.0.0.1` but not
`192.168.*`. For a LAN IP, this made `subdomain = parts[0]` evaluate to `'192'` (the first octet),
and `activeSlug = subdomain ?? pathSlug` picked that literal `'192'` over the real path-based slug.
`tenantRegistry['192']` is never found, so **every registered tenant** (`smar`, `caracas`,
`footlab`, ...) got treated as unregistered and silently routed through the generic
`_dynamic.routes.jsx` fallback instead of its own real `*.routes.jsx` file — which has no matching
route for paths like `showcase` or `home`, so it also fell through to the same silent
`<Navigate to="" replace />` catch-all. This is why Change #2 alone fixed `hr` (never registered,
so this bug was a no-op for it) but did nothing for `smar` (registered, directly hit by this second,
independent instance of the same class of mistake).

This exact gap had actually been noticed earlier the same night as a "side finding" and dismissed as
not mattering for `hr` specifically — correct for `hr` alone, but the dismissal was too narrow; it
was quietly breaking every *registered* tenant the whole time.

**Fix:** same pattern, same single-purpose change, applied to `TenantResolver.jsx`'s own
`isLocalhost` check — added the `192.168.` exclusion.

**Playwright re-verification:** `/smar/showcase` now renders its real cinematic hero — real Arabic
text visible (`"بيت سمار / حيث يهدأ العالم..."`), `rootHTMLLength: 31851`, zero console errors,
real `/api/v1/public/smar/config` call succeeding, and downstream GSAP/ScrollTrigger/media assets
all loading (200/206). `/hr/store` unaffected by this specific change (expected — different bug,
Change #4 below).

### Change #4 — `crypto.randomUUID()` needs a secure context (CONFIRMED real cause, part 3 of 3 — arguably the most consequential one)

**Root cause:** `frontend/src/pages/generic/store/useGenericStore.js:9`'s `getSessionId()` calls
`crypto.randomUUID()` unconditionally to mint a new cart session ID. The Web Crypto API's
`randomUUID()` is only exposed by browsers in a
[secure context](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) — HTTPS, or
the literal hostname `localhost`. `http://192.168.16.103` (a plain-HTTP LAN IP) is **not** a secure
context, so `crypto.randomUUID` is `undefined` there, the call throws
(`TypeError: crypto.randomUUID is not a function`), it's caught nowhere (`<CatalogPage>` has no
Error Boundary), and React's whole tree unmounts to a blank root — the *exact* mechanism behind
every white-page symptom seen tonight for any Store-module tenant specifically.

**This is arguably the single most consequential finding of the whole investigation**: the entire
reason tonight's testing uses a LAN IP over plain HTTP at all is the real Pilot's own requirement — a
phone on the same Wi-Fi scanning a QR code. Without this fix, the real physical Pilot with the real
barber would have hit this exact crash on the real phone, regardless of anything else being correct.

**Fix:** feature-detect `crypto.randomUUID` and fall back to a non-cryptographic random ID when
unavailable — appropriate here since this is a cart session key, not a security-sensitive token, not
a secure-context workaround that weakens anything real.

**Playwright re-verification:** `/hr/store` now renders fully — real header ("RK Barber Shop"), real
nav, real category pills (الخدمات / منتجات العناية), 3 real product cards with prices and add-to-cart
buttons, `rootHTMLLength: 4528`, zero console errors, 5 real `/api/` calls all succeeding (config,
categories, items).

### Final combined regression check — three tenants, one pass

| Tenant | URL | `rootHTMLLength` | Visible content | Console errors |
|---|---|---|---|---|
| `hr` (Store module) | `/hr/store` | 4528 | Real header, categories, products | None |
| `smar` (Booking, registered) | `/smar/showcase` | 31851 | Real cinematic hero, Arabic text | None |
| `caracas` (Restaurant, registered — not touched by tonight's debugging until this check) | `/caracas/home` | 24864 | Real menu/branding content | None (1 unrelated Framer Motion dev-mode warning, non-functional) |

All three independent tenants — spanning all three module types (booking, restaurant, store) and
both registered/unregistered tenant paths — render correctly. The fix generalizes; it was not
narrowly patched for the two tenants under active debugging.

### Side Finding (not fixed, not this mission's scope)

Product prices render as `0` in the DOM/screenshot but the accessibility snapshot reported Arabic-
Indic numerals (`٥` etc.) for the same fields — a display-formatting discrepancy, logged for a future
pass, unrelated to the white-page root causes above.

### Unknowns closed

- The stale-cache hypothesis from the original pass is now known to have been a real, correct
  observation but an **insufficient** one — the actual causes were the three above, unrelated to
  cache freshness. Re-run the original Recommended Fix's step 3 (clear cache, confirm via `stat`)
  is no longer necessary as a diagnostic path — closed.
- `<CatalogPage>`'s missing Error Boundary (from the earlier pass's Side Findings) remains a real,
  separate hardening opportunity — any future uncaught error in that subtree will still white-page
  the whole app rather than degrading. Not fixed in this mission (out of scope — three root causes
  was already the full, real story; adding a fourth, unrelated hardening change would have violated
  the "one cause per change" discipline this mission was run under).
