# "Old Dashboard Flash" — Real Browser Investigation

Follows: `investigation-protocol.md`, `browser-verification-protocol.md`. Origin: Salman reported
via `/bo-hussein` that the old (legacy) dashboard briefly shows before the correct current
dashboard when opening a tenant page. Prior code-only hypothesis (this session, same date):
`SSOLoginPage.jsx`'s `resolveRedirect()` sends non-trial tenants to the legacy `/admin` route. Two
real Playwright traces were run to confirm or reject this against real code, real DB state, real
login.

**Tenant slug correction applied throughout**: RK Barber Shop's real slug is `rk`, not `hr` (`hr`
no longer exists as a `Client` row — confirmed via a direct read-only DB query,
`SELECT ... FROM clients WHERE slug IN ('hr','rk')` → one row, `slug: 'rk'`). Admin credentials
used: `rkbarber@dev.invalid` / `password123` (reset via `scripts/reset_hr_admin_password.py --slug
rk --password password123`, itself generalized this session from a hardcoded `hr` default).

## Trace 1 — Plain login (`localhost:5173/login` → `Login.jsx`)

Full raw output: `/tmp/claude-1000/.../scratchpad/dashflash-wLyb.log` (not preserved past this
session — key facts captured below).

- Login → lands directly on `/dashboard/rk/calendar` → `GenericAdminDashboard.jsx`. No `/admin`
  path, no `SmarAdminDashboard` module ever requested, across 6 DOM samples (5 rapid-fire + 1 after
  1.5s). Console clean (4 benign entries, 0 errors).
- **This path shows no bug.** `Login.jsx` only renders on localhost/non-demo hosts (`App.jsx:116-120`,
  `IS_DEMO_SUBDOMAIN ? <SSOLoginPage /> : <Login />`), so it never exercises the code this
  investigation actually suspected.

## Trace 2 — SSO login page (`SSOLoginPage.jsx`, reached via `demo.test.localhost:5173/login`)

`demo.test.localhost` resolves to loopback (RFC 6761 `.localhost` TLD behavior, confirmed via
`getent hosts`/`socket.gethostbyname` — no `/etc/hosts` edit needed) and satisfies
`App.jsx`'s `IS_DEMO_SUBDOMAIN` condition (`IS_SUBDOMAIN_MODE && _h.startsWith('demo.')`), so it
renders the real `SSOLoginPage.jsx` component instead of `Login.jsx`. Confirmed via
`browser_snapshot`: heading "بوابة الإدارة المركزية", distinct single-step form (email/phone/short-link
+ password), different from `Login.jsx`'s shape.

### Confirmed Findings

1. **The legacy-dashboard bug is real, and it is not a transient flash — it's the landing state.**
   After password login as `rk`'s real `TENANT_ADMIN`, every one of 6 DOM samples (the click result,
   5 rapid-fire reads, 1 after a 1.5s wait) showed the exact same URL and content:
   `http://localhost:5173/rk/admin` with real-estate-specific markup — `الوحدات` (Units), `معرض
   الصور` (Gallery), `Housekeeping`, `Maintenance`, `Gardens`, `Page Builder`, and confirmed module
   loads for `SmarAdminDashboard.jsx` + its full sub-tree (`UnitFormModal.jsx`, `ActionInbox.jsx`,
   `SettingsTab.jsx`, `TeamTab.jsx`, `ServicesTab.jsx`, `GalleryTab.jsx`, `VisualBuilder.jsx`,
   `ChalletPagePreview.jsx`). `/dashboard` never appeared at any sampled instant — the SSO flow
   never routes there at all for this tenant. Network also shows it hitting the legacy `Booking`
   model endpoint (`GET /api/v1/admin/bookings/?...&client_slug=rk`), not `reservations`.
2. **Redirect target**: the `browser_click` tool result itself showed the browser already at
   `http://localhost:5173/rk/admin?token=eyJhbGci...` — a decodable JWT (`type: admin, user_id:
   81edde7e-..., client_id: 7ef5c8c9-..., slug: rk, role: TENANT_ADMIN`). Confirms `SSOLoginPage`'s
   redirect target is `/{slug}/admin`, matching the `SmarAdminDashboard` legacy route named in
   `routing.md §0b`.
3. **A second, independent bug**: this is a hard `window.location` redirect (full page reload), not
   a client-side React Router navigation — proven by the Vite HMR client disconnecting and
   reconnecting from scratch on a *different hostname* (`demo.test.localhost` → `localhost`) in the
   console log. Post-login, the tenant is dropped off the `demo.` host entirely, onto plain
   `localhost` — a second, independent bug from the `/admin` vs `/dashboard` route choice, not the
   same root cause.

### Side Findings

- **Auth JWT passed in the URL query string** (`?token=eyJhbGci...`), not a cookie/POST body/hash
  fragment — lands in browser history, server access logs, and any subsequent third-party request's
  `Referer` header. A real security hygiene finding, independent of the routing bug, worth flagging
  to Salman separately.

### Unknowns

- Not traced at the source level: which exact line in `SSOLoginPage.jsx` constructs the
  `/rk/admin?token=...` URL, and whether the hard-redirect (cross-hostname reload) is the same code
  path or a separate one. This trace is browser-observed behavior only, per
  `browser-verification-protocol.md`'s own scope — a source read is a fast, safe next step before
  editing, not yet done in this pass.
- Not verified whether `RegistrationPage.jsx`'s already-fixed redirect bug
  (`.claudedocs/work/registration-redirect-bug/2026-08-07/`) shares a helper with this one, or is
  fully independent — worth checking before writing the fix, so the fix lands in the right shared
  location if one exists.
- Whether the "flash" Salman actually described is this exact sequence (lands on `/admin` and
  stays, no self-correction observed) or whether he's separately, manually navigating to the correct
  `/dashboard` URL afterward (which would explain the "flash then correct" perception even though
  the app itself never auto-corrects) — not something browser evidence alone can confirm; only
  Salman knows his own click path.

## Verdict (Step 1)

**Hypothesis CONFIRMED, and worse than originally scoped** — not merely a mis-routed status branch,
but a full mount of the wrong tenant's dashboard shell (real-estate specific), a wrong data endpoint
(`bookings` vs `reservations`), a hard cross-hostname reload, and a JWT leaking into the URL.

## Decision (Salman, 2026-08-08)

Fix the routing now, in its own clean commit. Log the JWT-in-URL issue as a separate, independent
security finding — explicitly **not** fixed in the same change, since it needs its own investigation
(token handoff/storage/removal-from-URL, SSO-flow-compatible alternative) and mixing an
authentication-transport change into a routing bug fix is exactly the kind of scope creep this
project's commit discipline avoids. Also: the *trial* branch's `/dashboard/{slug}` path order is
also non-canonical (vs. the ratified `/{slug}/dashboard`) and must be corrected too, not just the
active/legacy branch — the fix removes `status`-based branching entirely rather than patching only
the broken branch.

## Execution — Step 2 (fix)

`frontend/src/pages/auth/SSOLoginPage.jsx`'s `resolveRedirect()` (was `:41-58`): removed the
`status === 'trial'` branch entirely. Now returns exactly one path for every tenant —
`/{slug}/dashboard?token=...` (dev: `http://localhost:5173/{slug}/dashboard?token=...`, prod:
`https://demo.salmansaas.com/{slug}/dashboard?token=...`) — matching the ratified canonical URL
(`routing.md §0b`). The now-unused `status` parameter was dropped from the function signature and
both call sites (`handleLogin`, `handleRegister`); `status` itself is still destructured and used by
`storeTrialData()`, unrelated to this change. `_isSuperAdmin` branch untouched.

**Separate, unrelated fix bundled into its own commit (not the routing fix)**: the
`scripts/reset_hr_admin_password.py` utility used to guarantee working verification credentials
hardcoded `slug == "hr"` — itself now-stale per this investigation's own slug correction. Generalized
to accept `--slug` (default `rk`), since re-hardcoding a second stale value would repeat the exact
mistake this investigation exists to catch.

## Execution — Step 3 (re-verification)

**First attempt — false CORS lead.** An initial post-fix Playwright trace reported a CORS failure
blocking login entirely. Investigated independently before trusting it: a direct `curl -i -X
OPTIONS` preflight against `POST /api/v1/auth/users/login` with
`Origin: http://demo.test.localhost:5173` returned `200 OK` with
`access-control-allow-origin: http://demo.test.localhost:5173` — CORS is not actually blocking
anything (confirmed via code read: `app/main.py:55`, `_cors_origins = settings.CORS_ORIGINS if
settings.is_production() else ["*"]` — dev mode is wide open, matching `security.md`'s documented
rule). The false CORS report was very likely stale `localStorage`/browser-context state carried
over from the earlier Trace 2 run (same underlying Playwright MCP browser instance reused across
separate nested `claude -p` invocations).

**Second attempt — fresh state, both tenants, PASS.** Explicit `localStorage.clear()` +
`sessionStorage.clear()` before each tenant's login, fresh navigation, full unfiltered network
capture:

| Tenant | Login | Final `href` | Console errors | `GenericAdminDashboard.jsx` loaded | `SmarAdminDashboard*` requested |
|---|---|---|---|---|---|
| `rk` (RK Barber Shop) | 200 OK | `http://localhost:5173/rk/dashboard` | None | Yes (#59 of 97) | **No** — zero matches in 97 requests |
| `ali` (Ali Barber Shop) | 200 OK | `http://localhost:5173/ali/dashboard` | None (during login) | Yes (#59 of 97) | **No** — zero matches in 97 requests |

Both tenants land directly on the canonical `/{slug}/dashboard` route, `GenericAdminDashboard`
exclusively, correct tenant-specific branding/data in the DOM (`RK Barber Shop` / `صالون علي
للحلاقة`), zero legacy-component requests, zero CORS/network errors on the login sequence itself.

### New side finding (not the login bug, found incidentally during Tenant B's dashboard load)

4 console errors, all `403 Forbidden`, on `ali`'s post-load Catalog prefetch:
```
GET /api/v1/admin/catalog/items?client_slug=ali        403 (×2)
GET /api/v1/admin/catalog/categories?client_slug=ali    403 (×2)
```
Most likely `require_service("catalog"|"store")` or a role gate rejecting `ali`'s freshly-issued
token — unrelated to the routing fix, not investigated further in this pass. Logged for later, same
discipline as the JWT-in-URL finding: named, not silently dropped, not chased outside this task's
scope.

## Final Verdict

**PASS.** The routing fix is confirmed correct via real, fresh-state browser verification against
two independent tenants. Committed separately from the `reset_hr_admin_password.py` generalization
and from this evidence file, per Salman's explicit commit-scope instruction.

## Deferred (named, not actioned)

- **JWT-in-URL security finding** — separate investigation + commit/plan, own scope (token
  handoff/storage/removal-from-URL alternative compatible with the SSO flow).
- **`ali`'s catalog 403** — separate investigation, not the routing bug.
- **`/dashboard/{slug}` route** (`App.jsx:152-157`) — still registered, still functionally
  equivalent to the canonical route today, but redundant per `routing.md`'s own open-item table.
  Not removed in this change (Salman: "لا نحذفه بنفس التغيير").
- Everything already deferred in the original plan (legacy dashboard retirement, page-scaffolding
  consolidation, deprecated scaffold doc cleanup, CatalogService redesign question) — unchanged.
