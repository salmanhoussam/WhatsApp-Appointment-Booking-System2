# Pre-B — Setup host browser verification (`demo.salmansaas.com/setup`)

**Date:** 2026-09-08 · **Mode:** READ-ONLY browser verification.
**Status:** CLOSED — verdict below.
**Tool:** real Playwright MCP browser, per `rules/frontend/browser-verification-protocol.md`.

> **The browser test verifies deployed behavior, not the literal Railway `FRONTEND_URL` variable
> value.** That variable's stored value was not read and cannot be read from this environment. What
> is proven here is what a real staff member's browser actually does at the intended setup host.

**Operator input:** Salman states `FRONTEND_URL` was manually updated in Railway ~2 days ago. That
statement is **not** independently verified here and is not what this document claims to prove.

---

## 1. URL tested

| | |
|---|---|
| Requested | `https://demo.salmansaas.com/setup` |
| **Final URL after redirects** | **`https://demo.salmansaas.com/setup`** — **no redirect occurred** |
| Page title | `SalmanSaaS — Cloud Business Solutions` |

Navigated **twice** (15:52:03Z and 15:53:04Z); results identical both times — not a one-off.

## 2. Bundle / chunk identity

Read from `performance.getEntriesByType('resource')`, not inferred:

```
index-PnxR8Gfi.js        ← main bundle
index-CPs7vmtG.css
SetupPage-D7mMrBBI.js    ← dedicated lazily-loaded route chunk
```

**This is the current deployed bundle.** `index-PnxR8Gfi.js` is byte-identical in name to the bundle
served by `alzabt.salmansaas.com`, the host already known to work (both confirmed by `curl`
2026-09-08). It is **not** the apex `salmansaas.com` build (`index-CEGFNe9L.js`), which is a
different, older artifact.

## 3. Is there real route handling for `/setup`?

**Yes — proven, not assumed.** `SetupPage-D7mMrBBI.js` was requested and returned **HTTP 200**. A
dedicated route chunk is only fetched when the router actually matches `/setup` and lazy-loads its
component. A fallback/catch-all render would never request it.

Corroborated in source: `frontend/src/App.jsx:145` declares `<Route path="/setup" …>`.

## 4. Setup UI result

React mounted — `#root` children present, `innerHTML` **904 chars** (not an empty root):

```
⛔
رابط غير صالح

رابط غير صالح — لا يوجد token

تسجيل الدخول يدوياً
```

**This is the SetupPage component's own missing-token branch**, which is the correct behaviour for a
`/setup` URL carrying no token. It is **not** a 404, **not** the marketing root site, and **not** a
router fallback. The rendered string is specific to the setup flow's token validation, and it is
rendered by the setup chunk that was just proven to load.

No token was supplied, per the task's explicit prohibition.

## 5. Network observations

Every request succeeded — full list, `static: true`:

| # | Request | Status |
|---|---|---|
| 1 | `demo.salmansaas.com/setup` | **200** |
| 2, 6 | Google Fonts CSS | 200 |
| 3 | `/assets/index-PnxR8Gfi.js` | **200** |
| 4 | `/assets/index-CPs7vmtG.css` | 200 |
| 5 | Cloudflare beacon | 200 |
| 7 | **`/assets/SetupPage-D7mMrBBI.js`** | **200** |
| 8 | `/cdn-cgi/rum?` (RUM beacon) | 204 |
| 9, 10 | `fonts.gstatic.com` woff2 | 200 |

**Zero 4xx. Zero 5xx. Zero failed requests.**

**`apiCallsMade: []`** — no backend call was made, because the page short-circuits client-side when
no token is present. This is intentional and is why the test causes **zero DB writes** (no
`setup_login_failed` audit row was created). It is also a stated limitation — see §8.

## 6. Console errors

`browser_console_messages` at `debug` level (all levels included):

```
Total messages: 0 (Errors: 0, Warnings: 0)
```

**No blocking runtime error. No error at any level.**

Per `browser-verification-protocol.md`, "no console errors" alone is never treated as proof — here
it agrees with the DOM evidence (a mounted, correctly-branching component) rather than contradicting
it, so the two are consistent.

---

## 7. VERDICT

# ✅ FRONTEND_URL / SETUP HOST = VERIFIED FOR B

All three decision conditions are met, each with its own evidence:

| Condition | Evidence |
|---|---|
| Correct setup UI loads | SetupPage chunk 200 + its own missing-token branch rendered, 904 chars in `#root` |
| Current deployed bundle served | `index-PnxR8Gfi.js` — same as the known-good `alzabt.` host, not the apex build |
| No blocking console/runtime error | 0 messages at all levels; 0 failed network requests |

`demo.salmansaas.com` is also the host `rules/frontend/routing.md` §0b designates for **trial**
tenants, and `rk` is `lifecycle_state='trial'` — so this host is correct by the routing contract,
not only by this test.

## 8. Limitations — stated, not waived

1. **The Railway variable's literal value is still unread.** This test proves the setup host renders
   correctly; it does **not** prove `team.py:219` will build its links against *this* host. If
   `FRONTEND_URL` is unset, that line falls back to `https://salmansaas.com` — the apex, which
   serves the different `index-CEGFNe9L.js` build. **Closing that requires reading the variable, or
   observing a real generated `setup_url`.**
2. **The token-bearing path was never exercised** — prohibited by the task, and correctly so: a real
   or fake token triggers `GET /auth/setup-login`, which writes a `setup_login_failed` row to
   `security_audit_log`. That is a DB write. So the token-validation → password-form → auto-login
   chain is **UNVERIFIED** and belongs to the B verification prompt, under explicit approval.
3. **The screenshot could not be retrieved.** `browser_take_screenshot` reported success writing
   `pre-b-setup-demo.png`, but the file is not reachable from this session's shell. The direct DOM
   read is the protocol's stated ground truth and stands on its own; the visual cross-check is
   simply absent rather than assumed to agree.
4. **The comma-separated `FRONTEND_URL` defect is untouched and still latent** — `config.py:32`
   documents the variable as comma-separated for CORS while `team.py:219`,
   `registration_service.py:217` and `email_service.py:109` consume it as a single base URL. Not
   fixed here, by instruction. Still an open item.

## 9. Commands run

```
mcp__playwright__browser_navigate      × 2   → https://demo.salmansaas.com/setup
mcp__playwright__browser_evaluate      × 2   → DOM/URL/chunk/API read-only introspection
mcp__playwright__browser_console_messages    → level=debug (all)
mcp__playwright__browser_network_requests    → static=true (full list)
mcp__playwright__browser_take_screenshot     → file not retrievable (see §8.3)
```

**0 DB writes · 0 code changes · 0 migrations · 0 deploys · 0 push · no token submitted · no
employee created · no password changed · `FRONTEND_URL` unmodified.**
