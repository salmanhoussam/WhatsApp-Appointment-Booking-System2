# Final Production Gate Audit — 2026-08-22

Study only, per Salman's explicit instruction: read-only, no code, no DB writes, no commits, no
fixes during the audit. Real browser + real curl/API evidence throughout, per
`investigation-protocol.md`. Scope: Public Customer Journeys, Auth/Roles/Security, Production
Configuration/Deployment, Payments (cash-only only, no gateway discussion per instruction).

## 1. Public Customer Journeys

Real browser, both tenants, real data confirmed throughout, no final submit/confirm/place-order
button clicked anywhere (per the audit's own no-DB-writes constraint).

- **rk service booking** (`/rk` → `/rk/reserve`): real branding, real config
  (`GET /public/rk/config`, real JSON, real `primary_color`/`whatsapp_number`), 6 real services
  (شعر, شعر ودقن, كرياتين, دقن, تمشيط أو تسريح, حنة أو صبغة, all real $5), real barber "حسين"
  pre-selected, real future date + real offered time slot, order summary matched exactly, both real
  confirm paths present (WhatsApp / on-site form). Final button "تأكيد الحجز من الموقع" confirmed
  present, correctly disabled-until-form-filled then enabled — not clicked.
- **rk store journey** (`/rk/store` → `/rk/cart`): 4 real products with real distinct prices
  (سبراي تثبيت الشعر $8, واكس تصفيف الشعر $10, جل تصفيف الشعر $7, عطر ريحة رجالي $22), real add-
  to-cart, real checkout form (item, total, name/phone with +961 prefix, address, notes, a real
  `cash`/`card` payment select with **cash selected as the real default** — matches the cash-only
  launch decision exactly). Final button "تأكيد الطلب" confirmed present and enabled — not clicked.
- **mr-h sanity check** (`/mr-h` → `/mr-h/reserve`): distinct real branding (gold vs rk's teal), no
  Products section (correct — no store capability), 6 real services with a genuinely different real
  price structure ($8–$40), real barber "Ali".

All three journeys used real tenant-specific data end-to-end, not mocks or shared/copied content.

### 🔴 P0 — `/rk/cart` can go permanently blank with zero recovery UI

Confirmed live and reproducible: on first navigation to `/rk/cart`, the tenant config fetch
returned 3 consecutive real 503s (the same recurring, previously-documented Supabase pooler
flakiness this project has hit multiple times, including twice already in this same session's own
Dashboard audit). Unlike every other page checked this session, this page's retry logic gave up
after ~3 attempts and left `document.getElementById('root')` genuinely empty — a fully blank white
page, no error message, no retry button, no way forward for a real customer except knowing to
manually refresh the URL. A plain reload of the identical URL succeeded immediately.

This sits on the single highest-value page in the whole Store journey — the one right before real
revenue completes — under a condition already proven to recur, not a rare hypothetical. Real
component: `frontend/src/pages/generic/normal/CartPage.jsx` (likely inherits from the shared
`useTenantConfig()` hook other pages already use — the same hook a prior real investigation
(`GenericAdminDashboard.jsx`'s own "old UI flash" fix, referenced in project memory) already had to
patch once for a related loading-state gap on the admin side). Not fixed here, per instruction —
named with its real file location for the smallest-fix plan below.

## 2. Auth / Roles / Security

Real curl-based tests against the running backend, real existing users, zero DB writes (every test
is a GET/read or a deliberately-rejected PATCH attempt with an empty body against a route that
requires a role the test token doesn't have — no row was ever created or changed).

| # | Test | Expected | Real result |
|---|---|---|---|
| 1 | Expired JWT (deliberately minted with `expires_delta=-30s`) against a real protected route | 401 | **401** ✅ |
| 2 | Valid TENANT_ADMIN token, own tenant's own data | 200 | **200** ✅ |
| 3 | Valid rk TENANT_ADMIN token against a real SUPER_ADMIN-only route (`/super/clients`) | 403 | **403** ✅ |
| 4 | rk's own valid token, but with `client_slug=mr-h` in the query string — does the backend leak mr-h's real data, or ignore the param? | rk's own data only, never mr-h's | Returned `client_id: 7ef5c8c9-...` — **rk's own real client_id**, confirmed matching the JWT's own embedded value, not mr-h's. Query-param spoofing does not work — `clientId` is sourced from the DB-reloaded, JWT-authenticated user, never trusted from a request param. ✅ |
| 5 | No Authorization header at all | 401 | **401** ✅ |
| 6 | Malformed/garbage token string | 401, not a crash | **401** ✅ |
| 7 | Real STAFF token against a TENANT_ADMIN/SUPER_ADMIN-only route (`PATCH /settings`) | 403 | **403** ✅ |
| 8 | Same real STAFF token against their own allowed reservations list | 200 | **200** ✅ (positive control) |
| 9 | Same real STAFF token against the Customer Registry (`/admin/customers/`, TENANT_ADMIN/SUPER_ADMIN only) | 403 | **403** ✅ |
| 10 | Arbitrary unlisted `Origin` header (`https://evil-attacker-site.example`) against a public endpoint, in this dev sandbox | — | Reflected back — **but this sandbox has `ENVIRONMENT` unset**, and `main.py` line 55 explicitly sets `_cors_origins = ["*"]` only when NOT in production, per the documented, intentional dev-mode design. Not a code bug — see the Unknown below for what this actually means for real production. |
| 11 | Real SUPER_ADMIN token against a real SUPER_ADMIN-only route | 200 | **200** ✅ (positive control) |

**JWT expiration**: confirmed working via a real, deliberately-expired token (test #1) — the
mechanism (`decode_token()`'s `jwt.decode()` raising on expiry, caught, returns `None`, triggers a
real 401) is genuine and directly exercised, not just read from code.

**`SUPER_ADMIN_SLUG`**: `os.getenv("SUPER_ADMIN_SLUG", "smar")` — a real fallback exists, but
confirmed it resolves to the actual real `SUPER_ADMIN` user's own tenant (a real `User` row with
`role=SUPER_ADMIN` was found whose `client.slug` is genuinely `"smar"`) — the fallback is not
pointing at a stranger's tenant, it's correct by design. Unlike `SECRET_KEY`/
`WHATSAPP_VERIFY_TOKEN`, this value has **no startup guard** forcing it to be explicitly set in
production — low risk today (it already resolves correctly), but a real, small hardening gap.

## 3. Production Configuration / Deployment

- **`docs_url`/`redoc_url`/`openapi_url` disabled in production**: confirmed in code
  (`main.py:35,41-43`, gated on `settings.ENVIRONMENT == "production"`) AND tested directly and
  locally (no DB, no network): importing `app.core.config` with `ENVIRONMENT=production` set
  produces `is_production() == True`, which the app then uses to disable all three URLs. Verified
  working, not just read.
- **`SECRET_KEY`/`WHATSAPP_VERIFY_TOKEN` startup guards**: tested directly, 3 real scenarios, all
  correct — (a) `ENVIRONMENT=production` + still-default `SECRET_KEY` → real `ValueError` raised at
  import time; (b) same for `WHATSAPP_VERIFY_TOKEN`; (c) `ENVIRONMENT=production` + real
  non-default values for both → imports cleanly, no exception. The guard code genuinely works, not
  just present.
- **CORS**: the real, hardcoded production origin list (`config.py`'s `CORS_ORIGINS` property) has
  **zero wildcards** — confirmed by reading it directly, only real named domains
  (`salmansaas.com`, `smar.salmansaas.com`, `demo.salmansaas.com`, plus whatever `FRONTEND_URL`
  adds). The wildcard (`["*"]`) only applies when `settings.is_production()` is `False`
  (`main.py:55`) — an intentional, documented dev-mode convenience (matches
  `rules/backend/security.md`'s own stated design), not a bug.

### 🔴 P0 (conditional, not a code bug) — `ENVIRONMENT=production` must be confirmed set in the real deployment

Every one of the three protections above — CORS restriction, hidden API docs, and both secret
startup guards — is gated behind the exact same single flag: `settings.ENVIRONMENT == "production"`.
This sandbox has `ENVIRONMENT` unset (confirmed: `echo $ENVIRONMENT` → empty), which is why CORS
tested wide-open here and the guards never fired in any real run of this app. **This cannot be
verified from this sandbox** — there is no access to the real Railway environment's actual variable
values. If `ENVIRONMENT=production` is not genuinely set on the real deployed service, the API
docs would be publicly exposed and CORS would accept any origin in real production traffic, even
though the secret values themselves may already be real (the guards would simply never have had a
chance to fire and confirm that). This is the single highest-leverage manual check before launch —
named explicitly here as a real Unknown, not silently assumed either way.

## 4. Payments (cash-only, scoped exactly per instruction — no gateway/ADR-0004 discussion)

Confirmed live on rk's real checkout form: a real `payment_method` select with two real options,
`cash` (نقداً) genuinely pre-selected as the default and `card`. Matches the cash-only launch
decision exactly. Full checkout flow reached a real, working state — item, quantity, price, total,
customer fields, notes, payment method — all real, up to the final "تأكيد الطلب" button (confirmed
present and enabled, not clicked per this audit's own constraint). Full completion of this exact
flow (checkout → real order → WhatsApp confirmation) was already verified end-to-end with real data
in this session's own prior Track B (Store) work (`.claudedocs/work/store-b1-investigation/2026-08-21/`)
— cited here rather than re-exercised, since re-creating a real order would violate this audit's
own no-DB-writes constraint.

## Side findings — cosmetic, not counted as P0/P1

- Arabic-Indic numeral rendering (e.g. "٥") can look visually similar to "0" at small font sizes on
  rk's homepage services section — a legibility/font-rendering note, not a data bug (confirmed via
  the raw accessibility-tree text node, the real value is correct).
- rk's public storefront shows barber name "حسين" where an older project-memory entry referenced
  "Hassan" for a seeded barber of the same tenant — likely historical naming drift (rename/reseed
  since), not a functional bug. Not independently re-investigated this pass.

## Classification

| Severity | Item |
|---|---|
| 🔴 **P0** | `/rk/cart` (and likely sibling public pages sharing the same config-fetch pattern) goes permanently blank with zero recovery UI on repeated tenant-config 503s — a real, reproducible, revenue-blocking dead end on the Store money page, under a condition proven to recur multiple times this session. |
| 🔴 **P0 (conditional, deployment-config, not a code fix)** | Confirm `ENVIRONMENT=production` is genuinely set in the real Railway deployment — CORS restriction, hidden API docs, and both secret-value startup guards all depend on this one flag, unverifiable from this sandbox. |
| ⚪ **P2** | `SUPER_ADMIN_SLUG` has no production startup guard forcing an explicit value (low risk today — confirmed it already resolves to the real, correct SUPER_ADMIN account) — a real but low-severity hardening gap. |
| ⚪ **P2** | Arabic-Indic numeral legibility at small font sizes (cosmetic). |
| ⚪ **P2** | Barber display-name discrepancy ("حسين" vs an older "Hassan" memory reference) — likely historical, not re-investigated. |

## What was fully verified and passed, no reservations

- Every JWT/role/privilege boundary tested (11 real tests: expiry, missing/malformed tokens,
  cross-tenant query-param spoofing, SUPER_ADMIN/TENANT_ADMIN/STAFF positive and negative controls)
  — all correct, zero exceptions found.
- All three production-safety code guards (docs disabling, both secret startup checks) — confirmed
  to genuinely function, not just present in source.
- CORS production origin list — confirmed no wildcard, real domains only.
- Public homepage + booking + store browse/cart/checkout flows on both tenants — real tenant-
  specific data throughout, no mocks, no shared/copied content between tenants.
- Cash payment option — confirmed live, real, and the actual default on the real checkout form.

## Status

**Production verdict: NO-GO**, pending exactly two items — one real, small code fix (the cart
blank-page resilience gap) and one manual deployment-configuration confirmation (`ENVIRONMENT`
variable) that only Salman/the deployment owner can check directly on Railway. No code was changed,
no commits made, no fixes applied during this audit, per instruction.
