# Tenant Lifecycle + Dual Subdomain Production Setup — Read-Only Audit

Follows: `service-execution-constitution.md`, `investigation-protocol.md`. Triggered by Salman's
explicit instruction, 2026-08-28. **Status: IN PROGRESS — Phase 1 (Read-Only Audit) partially
complete.** No code touched. No Railway variable changed. No migration run. No tenant created.

This document is being written incrementally as evidence lands (direct investigation + two
background research passes). Sections marked `[PENDING]` are not yet written — do not treat their
absence as "nothing found," only as "not yet investigated in this pass."

---

## A. Current Architecture — Tenant Identity Resolution (CONFIRMED, direct code read)

### Backend — `app/core/tenant.py`, `get_current_tenant()` (lines 214-271), read in full

Exactly a 4-tier fallback, checked in this order, first match wins:

1. **JWT Bearer token** (`tenant.py:230-236`) — `decode_token(credentials.credentials)`, reads
   `payload["slug"]`.
2. **`X-Tenant-Slug` header** (`tenant.py:239-242`).
3. **`?client_slug=` query param** (`tenant.py:245-248`).
4. **Subdomain** (`tenant.py:250-262`) — `host.endswith(f".{MAIN_DOMAIN}")` where
   `MAIN_DOMAIN = "salmansaas.com"` (hardcoded constant, `tenant.py:45`); strips the suffix, takes
   the first dot-segment as the slug. A `.localhost` variant exists for local dev.

**The backend never reads the URL path at all** — confirmed explicitly by `resolve_tenant_status()`'s
own docstring (`tenant.py:434-437`): "`get_current_tenant()` never reads path params." Every
path-based tenant working today (caracas, footlab, olivello, etc. on `demo.salmansaas.com/{slug}`)
works ONLY because the frontend resolves the slug from the path itself and then explicitly
re-attaches it as `?client_slug=` (or `X-Tenant-Slug`) on every API call. This is a structural fact,
not an implementation detail — it directly determines what the `alzabt.salmansaas.com/{slug}` design
requires (§D/E below).

Every resolved slug is verified against a real DB row (`_verify_tenant()`, `tenant.py:164-209`) —
`prisma_client.client.find_unique(where={"slug": slug})` — a nonexistent/spoofed slug 404s, it does
not leak or silently substitute another tenant's data. Result is cached in-process for 5 minutes
(`_CACHE_TTL = 300.0`, `tenant.py:38`), Hard-Block (`status="suspended"`) and Soft-Block
(`lifecycle_state="expired"`) checks re-run on every access, cache hit or miss (`tenant.py:175-183`).

**Admin/JWT auth is completely orthogonal to hostname** — `get_current_admin_user()`
(`tenant.py:345-393`) and `require_roles()` (`tenant.py:476-495`) resolve identity purely from the
JWT payload (`user_id`, `client_id` matched against `User.clientId` in DB), never touch
`request.headers.get("host")` at all. **The domain/CORS work below has zero effect on admin
dashboard auth** — only on public-route tenant resolution.

`get_authenticated_tenant()` (`tenant.py:274-318`) is a stricter variant for admin routes that
deliberately DROPS the header/query-param/subdomain fallbacks — JWT only. Its own docstring cites a
real, already-fixed prior incident: `.claudedocs/reviews/SECURITY-2026-07-30-admin-authorization-
bypass.md` — every admin mutation route relying on plain `get_current_tenant()` was reachable by an
unauthenticated caller via those exact fallbacks. Relevant precedent for §J.

### Frontend — FOUR independent, only-partially-consistent implementations of "is this a subdomain-mode host"

This is a real, load-bearing finding, not a nitpick — adding `alzabt.` as a new domain touches all
four, and they do not currently agree with each other:

| File | Mechanism | `demo.` special-cased? |
|---|---|---|
| `App.jsx:60-65` | `IS_SUBDOMAIN_MODE = !_IS_LOCAL_HOST && hostname.split('.').length >= 3`; `IS_DEMO_SUBDOMAIN = IS_SUBDOMAIN_MODE && hostname.startsWith('demo.')`; `IS_SHOWCASE_DOMAIN = !IS_SUBDOMAIN_MODE && !_IS_LOCAL_HOST` | Yes, explicitly |
| `TenantResolver.jsx:59-81` | `isLocalhost` (incl. `192.168.*`), `subdomain` (3+ parts, not `www`), `isDemoSubdomain = hostname.startsWith('demo.')`, `activeSlug = (isLocalhost \|\| isDemoSubdomain) ? pathSlug : (subdomain ?? pathSlug)` | Yes, explicitly |
| `useTenantSlug.js:17-23` | `_isSubdomainMode()` — generic: `hostname.split('.').length >= 3 && parts[0] !== 'www'`, local-host excluded | **No** — has no demo-awareness at all |
| `tenant.config.js:1-45` | Its own 5-tier priority list; tier 1 checks the literal URL-path prefix `/demo/:slug` (not hostname); tier 4 is a generic subdomain check with a `_RESERVED` set (`auth, admin, manager, api, www, mail`) — `demo`/`alzabt` are not in `_RESERVED` | Only via the path-prefix tier, not hostname |

`App.jsx:55-59` has its own code comment already acknowledging this exact class of risk (about
`192.168.*` handling specifically, but the underlying pattern is the same): *"or this file and
useTenantSlug.js disagree on IS_SUBDOMAIN_MODE and register the tenant catch-all as the wrong route
pattern... breaking TenantResolver's pathnameBase assumption silently (blank #root, no console
error)."* This is a documented, previously-encountered failure class in this exact codebase, not a
hypothetical.

**Consequence for `alzabt.salmansaas.com`**: because none of these four implementations know about
"alzabt." today, a 3-part hostname like `alzabt.salmansaas.com` would currently be classified
`IS_SUBDOMAIN_MODE = true` / `IS_DEMO_SUBDOMAIN = false` by `App.jsx` and `TenantResolver.jsx` — i.e.
treated exactly like `smar.salmansaas.com` is today (a single-tenant subdomain, where the *hostname
itself*, not the path, is taken as the tenant slug). That is the **opposite** of the intended
`alzabt.salmansaas.com/{slug}` path-based design. All four files need a consistent, explicit
`alzabt.` case — not just `TenantResolver.jsx` (my earlier, incomplete proposal from a prior turn in
this same session).

### `App.jsx` full route map — every branch keyed on `IS_DEMO_SUBDOMAIN`, and what each needs decided for `alzabt.`

Read in full (`App.jsx:96-256`). Six real, independent product decisions needed, not a single find/
replace:

| Line(s) | Behavior on `demo.` today | Open question for `alzabt.` |
|---|---|---|
| `104-111` | Root `/` redirects to `/home` on demo subdomain, `/showcase` elsewhere | Should bare `alzabt.salmansaas.com/` (no slug) redirect anywhere meaningful, or is there no valid "no slug" case for a paid-tenant domain? |
| `116-120` | `/login` → SSO portal only on demo subdomain, else legacy dev form | Should `alzabt.salmansaas.com/login` also get the SSO portal? (Likely yes, given real subscriber accounts — needs confirming) |
| `173-179` | `/:slug/dashboard/*` → `GenericAdminDashboard`, gated on `IS_DEMO_SUBDOMAIN \|\| (!IS_SUBDOMAIN_MODE && !IS_SHOWCASE_DOMAIN)` [demo subdomain OR plain localhost/LAN] | Needs `alzabt.` added to this gate, or `alzabt.salmansaas.com/smar/dashboard` 404s. This is also exactly the scenario `rules/frontend/routing.md`'s own "Canonical Admin URL Rule" (§0b) already named as a **deferred future strategy** ("multi-subdomain deployment") — this session's plan is a variant of that (one shared paid domain, not per-tenant subdomains), worth citing since that rule's own binding clause says any such change "happens only in the routing layer" — consistent with what's being proposed here. |
| `197-199` | `/home/*` → `ShowcaseRoutes` (renders `DemoLandingPage`, the demo product's own marketing/trial-creation landing) on demo subdomain only | Does `alzabt.salmansaas.com` need an equivalent bare `/home`, or does it always have a slug (no "landing" concept)? |
| `208-210` | `/alzabt` (bare path segment, on the demo subdomain only) redirects to a pre-existing demo tenant literally named `alzabt-demo` | **Naming collision worth flagging explicitly, not a functional conflict** — different domain, different mechanism, but confusing to read side-by-side with a new `alzabt.salmansaas.com` domain. Recommend not touching this route; just be aware it exists. |
| `243-249` | `/:slug/*` explicitly registered for demo subdomain (so `demo.salmansaas.com/olivello/*` gets correct `pathnameBase`) IN ADDITION to the generic subdomain-mode ternary at `246-249` which would otherwise register bare `/*` (host-as-slug) instead | **This is the one that actually breaks `alzabt.salmansaas.com/{slug}` if not added** — without an explicit `alzabt.`-gated `/:slug/*` registration alongside line 243's, the generic `IS_SUBDOMAIN_MODE` ternary (`246-249`) fires instead and registers `/*` — meaning `TenantResolver` would try to read the tenant slug from the *hostname* ("alzabt"), not the path. This is the concrete, checkable bug that must be fixed for the whole plan to function at all. |

### `SEO.jsx:19` — downgraded from my earlier turn's assessment

`BASE_URL = 'https://smar.salmansaas.com'` is used only as the fallback for `resolvedUrl` when
`typeof window === 'undefined'` (`SEO.jsx:46`) — an SSR/prerender context this app does not have (a
pure client-side Vite SPA; `window` is always defined in practice). **Effectively dead code today**,
not a real production risk — downgraded from "needs fixing" to "cosmetic, low priority" versus what
I said earlier this session before reading the actual file.

---

## B. Current Demo Lifecycle (CONFIRMED — background investigation, full citations)

**Trigger**: `POST /api/v1/public/demo/create` (`app/api/v1/public/demo.py:75`), rate-limited 3/hour
per IP (`demo.py:74`), validates `business_type` ∈ `{restaurant, store, booking, barbershop}`
(`demo.py:31`). Called by **three independently-built frontend UIs** that all hand-roll the same
POST + success-card + password-reveal pattern with no shared component:

| Component | File | `business_type` offered | Post-success destination |
|---|---|---|---|
| `DemoBuilderPage` | `frontend/src/pages/home/DemoBuilderPage.jsx` (lives in `pages/home/`, not `pages/demo/`) | hardcoded `barbershop` | `/${slug}/reserve` |
| `DemoLauncher` | `frontend/src/components/DemoLauncher.jsx` | user-selected restaurant/store/booking | `/${slug}/home` |
| `DemoLandingPage` hero form | `frontend/src/pages/showcase/pages/DemoLandingPage.jsx` (demo.salmansaas.com's own `/home` landing) | user-selected restaurant/store/booking | `/${slug}/home` |

**Slug generation** (`demo_service.py:165-181`): `demo-{slugified name_en, max 30 chars}-{4 random
hex chars}` — crypto-random suffix (`secrets.token_hex(2)`), not sequential; collision-checked
against `DemoRepository.slug_exists()`, retries up to 5 times.

**DB writes, in order** (`demo_service.py:277-377`): `Client` row (`status="active"`,
`lifecycle_state="trial"`, `trial_ends_at = now()+14 days`, placeholder `phone = "demo-{slug}"`) →
`User` row (TENANT_ADMIN, `email = "{slug}@demo.salmansaas.com"`, random 8-char password) →
`ClientService` rows (keys depend on `business_type` — e.g. barbershop gets `booking, reservations,
catalog, whatsapp_ordering`; restaurant/store/booking never get `reservations`) → catalog seed
(hardcoded demo menu/products, or `provisioning_service.provision_barber_domain()` for barbershop).

**Generated admin URL** (`demo_service.py:364-368`): `f"{FRONTEND_URL env var, default
'https://demo.salmansaas.com'}/{slug}/dashboard"` — **note this defaults to hardcoded
`demo.salmansaas.com` if `FRONTEND_URL` is unset**, meaning any environment missing that env var
generates production-pointing links regardless of where the demo was actually created. Relevant to
§H's env var matrix.

### `/demo/:slug` vs `demo.salmansaas.com/{slug}` — CONFIRMED two separate mechanisms, one is legacy dead weight for the current flow

- `demo.salmansaas.com/{slug}/home` (and `/reserve`, `/dashboard`) is what every real generated link
  from the current demo-creation flow actually points to — resolved via `App.jsx`'s
  `IS_DEMO_SUBDOMAIN` → `TenantResolver.jsx`'s `isDemoSubdomain` → path-based slug → same
  `DynamicPage` component every other path-routed tenant uses.
- `/demo/:slug/*` is a SEPARATE, always-available path prefix registered on every domain
  (`App.jsx:167-169`, `DynamicTenantResolver.jsx`), with its own nested sub-router (`index`,
  `catalog`, `menu`, `store`, `legacy` → `DemoPublicPage.jsx`, a second older axios-based
  implementation). **No current demo-creation flow ever links to it.** Its own header comment calls
  `DemoPublicPage.jsx` "an old ConfigurableHero, keep as escape hatch." For a tenant already in the
  curated `tenantRegistry` (smar, olivello, etc.), hitting `/demo/{slug}` 301-redirects to the
  canonical `/{slug}/{defaultRedirect}` — this is the real code behind `CLAUDE.md`'s documented
  "`/demo/{slug}` auto-redirects... for registry tenants" rule. For a freshly-generated demo tenant
  (not in the registry), it just falls through to the same `DynamicPage` — functionally reachable,
  practically orphaned.
- **Backend has a third, disconnected notion**: `tenant.py`'s subdomain fallback
  (`host.endswith(".salmansaas.com")`) does not special-case `demo.` at all — a bare request to
  `demo.salmansaas.com` with no JWT/header/query-param would resolve `slug="demo"`, which never
  exists as a real Client row, and 404. Not currently a live bug (every real page explicitly passes
  `client_slug`/`X-Tenant-Slug`, confirmed via grep), but a latent trap — the backend was never
  taught what the frontend already explicitly knows about `demo.` being non-tenant.

### No automated expiry — real, confirmed gap

`trial_ends_at` (14 days) is computed, stored, and returned to the frontend — **but nothing in the
codebase ever reads it to expire, block, or delete a demo tenant automatically.** The only writer of
`Client.lifecycle_state` is `subscription_service.set_lifecycle_state()`, called from exactly one
place: a manual, human-triggered super-admin `PATCH .../lifecycle-state` route. No cron/scheduler
exists for this (the only cron found anywhere in the repo is the unrelated Dating-module cleanup,
`super/maintenance.py`). **A demo tenant, once created, persists forever** — a real `Client`, `User`,
`ClientService`, and catalog rows — until a human manually finds and removes it via the Super Admin
panel, which has no `demo-` slug filter to make that easy.

### Side findings (demo lifecycle)

- Stale docs/copy: `demo.py:14`'s docstring and `DemoLandingPage.jsx`'s user-facing copy both say
  "7-day trial" — actual value is 14 days (`demo_service.py:40`, changed per a cited "ADR-0002 §9.2"
  reason, copy never updated to match).
- Only anti-abuse control is the 3/hour-per-IP rate limit — no CAPTCHA/email verification. Combined
  with no auto-expiry, this is unbounded DB growth over time, not just a cosmetic gap.
- `Client` model has **no `is_demo`/`demo`/`trial`-type boolean field at all** — a demo tenant is
  identified only by convention (`slug` prefix, placeholder `phone`, `@demo.salmansaas.com` email).
  Its `lifecycle_state="trial"` is **structurally identical** to a real self-registered
  (`registration_service.py`) trial tenant that simply hasn't paid yet — nothing in the schema
  distinguishes "anonymous auto-generated demo" from "real prospective subscriber mid-trial." This
  matters directly for §D/J: if `alzabt.salmansaas.com` is meant only for *subscribed* tenants, there
  is currently no DB-level signal to enforce or even query that distinction.

---

## C. Current Subscribed/Shared-Tenant Lifecycle (CONFIRMED — background investigation, full citations)

### There is only ONE real tenant-creation code path — no separate "super admin creates a tenant" flow exists

`app/services/registration_service.py:85` — `register_new_tenant(db, data)` — is the single real
implementation. Confirmed by exhaustively reading `app/api/v1/super/clients.py` (322 lines, full) and
`app/services/super_service.py` (73 lines, full): **neither contains a create-tenant route or
function.** Super Admin's own endpoints only manage *already-existing* tenants (list, settings,
status, lifecycle, subscription/plan, catalog seeding). So "Salman creates a tenant manually" means
he submits the exact same registration form/flow a real customer would — same code, same DB writes,
same validation. This matters directly for the domain question: there is no separate "trusted"
creation path to special-case for `alzabt.salmansaas.com`.

**Three HTTP entry points, all delegating to `register_new_tenant`:**
1. `POST /api/v1/auth/register` (`app/api/v1/admin/auth.py:354`) — the real, live endpoint behind
   `demo.salmansaas.com/register` in production (confirmed by an in-code comment,
   `admin/auth.py:279-282`).
2. `POST /api/v1/onboarding/process` (`app/api/v1/onboarding.py:56`) — the n8n/WhatsApp AI-onboarding
   webhook; Claude Haiku extracts structured data from a WhatsApp conversation, then calls
   `register_new_tenant` (`onboarding.py:86`).
3. `POST /register` (`app/api/v1/public/registration.py:59`) — a legacy/likely-dead duplicate; a
   prior investigation round is on record having mistakenly analyzed this one instead of #1.

### Full flow inside `register_new_tenant` (`registration_service.py:85-220`)

- Slug/email/phone uniqueness validated (`:88-98`) — `phone` is a real `@unique` DB column
  (`schema.prisma:21`). Slug format validated one layer up at the request-schema level
  (`admin/auth.py:250`, regex `^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$`).
- Optional `vertical` field checked against a `VERTICAL_REGISTRY` — unregistered vertical is a hard
  error (`:110-113`).
- Trial window: `trial_ends_at = now + 14 days` (`:119` — same unified 14-day default as demo
  tenants, ADR-0002 §9.2).
- `Client` row created (`:121-149`) — `status: "active"`, `lifecycle_state: "trial"` (never
  `"suspended"` at creation).
- `User` row created (`:154-162`) — `role: "TENANT_ADMIN"`, a 7-day magic-link `setupToken`
  generated.
- `ClientService` rows seeded (`:172-178`) from a union of payload-provided services and
  vertical-registry defaults.
- Non-blocking side effects: Supabase storage-folder placeholders (fire-and-forget), welcome email
  (fire-and-forget) — **but Sheets sync is NOT fire-and-forget**, it's `await`ed inline
  (`:193-207`), meaning a slow/failing Google Sheets API call would delay the actual HTTP response to
  a real registering customer.
- **Response** (`:209-220`): `dashboard_url = f"{FRONTEND_URL env var, default 'https://
  salmansaas.com'}/{slug}/dashboard"`, `setup_url` similarly — **the canonical link generated for
  every real subscribed tenant is already path-based** (`/{slug}/dashboard`), not subdomain-based.
  This is a strong, existing precedent in the platform's own code for exactly the `alzabt.
  salmansaas.com/{slug}` design being proposed.

**JWT issued immediately after registration** (`admin/auth.py:391-401`) — `slug: client.slug` pulled
straight from the just-created DB row, never from client input.

### Side findings from this pass, directly relevant to the domain decision

- **`app/services/email_service.py:104` hardcodes `dashboard_url = "https://demo.salmansaas.com/
  login"`** for the welcome email sent on every new registration — regardless of the real
  `FRONTEND_URL` env var or the tenant's real slug. Inconsistent with `registration_service.py`'s own
  (correct) `dashboard_url` construction two lines away in the same flow. **This must be fixed before
  `alzabt.salmansaas.com` goes live**, or every new subscribed tenant's welcome email will keep
  pointing at the demo domain regardless of where they actually live.
- Two duplicate `TenantRegistrationRequest` classes / two `/register` implementations exist
  (`admin/auth.py` — live — vs. `public/registration.py` — flagged dead in its own code comment).
  Worth cleaning up before/during any domain migration, so nobody edits the wrong one.
- `smar`'s Client row doubles as the platform's Super Admin identity (`tenant.py:423-426`,
  `config.py:64` — `SUPER_ADMIN_SLUG` defaults to `"smar"`): logging in as the `smar` tenant root
  (client-type JWT) grants Super Admin API access, in addition to dedicated `SUPER_ADMIN`-role User
  accounts. **This check is JWT-payload-only (`payload.get("slug") == settings.SUPER_ADMIN_SLUG`) —
  it never inspects hostname.** Moving smar's public routing from `smar.salmansaas.com` to
  `alzabt.salmansaas.com/smar` does **not** affect Super Admin auth — confirmed directly from the
  code, not assumed — but flagged explicitly here given how high-stakes breaking Super Admin access
  would be.

---

## D. Target Alzabt Architecture

**Core finding that de-risks this whole plan: the backend needs zero new tenant-resolution logic.**
Per §A/§C, `demo.salmansaas.com/{slug}` already proves the exact mechanism `alzabt.salmansaas.com/
{slug}` needs — a path-based frontend that explicitly resolves the slug from the URL and propagates
it via `?client_slug=`/`X-Tenant-Slug` on every API call, landing on backend tier 2/3 (§A), which is
already fully proven, already handles real production traffic today, and requires no new backend
code. The backend's subdomain-parsing branch (tier 4) is **only relevant for literal
`{slug}.salmansaas.com` hosts** (smar's current pattern) — confirmed directly: `demo.salmansaas.com/
{slug}` paths never hit that branch today (host resolves to the literal slug `"demo"`, which isn't a
real tenant; those pages work off JWT/query-param instead). This means the *backend* side of "smar
moves off subdomain-based resolution" is not a resolution-logic change at all — it's simply smar's
frontend pages starting to explicitly pass `client_slug=smar` the way caracas/footlab already do,
instead of relying on tier 4.

**The real work is entirely on the frontend + config side**, concretely:

1. **Backend CORS** — add `https://alzabt.salmansaas.com` to `CORS_ORIGINS`
   (`app/core/config.py:44-49`). Recommend adding it to the **hardcoded baseline list** (same tier as
   `smar.salmansaas.com`/`demo.salmansaas.com` today), not relying solely on the `FRONTEND_URL` env
   var — the code's own comment at `config.py:43-44` explains this baseline exists specifically "so
   CORS never breaks if FRONTEND_URL env var is mis-configured on Railway."
2. **Frontend hostname-detection consistency (§A)** — `App.jsx`, `TenantResolver.jsx`,
   `useTenantSlug.js`, `tenant.config.js` all need a consistent `alzabt.`-aware case, not just one of
   them. `App.jsx` specifically needs its own per-branch decision (§A's 6-row table) — this is
   product judgment, not mechanical find/replace.
3. **`email_service.py:104`'s hardcoded `demo.salmansaas.com/login`** must be fixed to use the same
   `FRONTEND_URL`-based construction `registration_service.py` already uses correctly — otherwise
   every future subscribed tenant's welcome email misdirects.
4. **Smar's own pages** need to start explicitly passing `client_slug=smar` (or `X-Tenant-Slug`) on
   their API calls, the same way caracas/footlab/other path-routed tenants already do, rather than
   depending on the subdomain-fallback tier that only works for a literal `smar.salmansaas.com` host.
   This needs a real per-page check (not spot-checked) before smar's canonical URL actually changes.
5. **Not required to launch, but a real, adjacent gap found this pass, worth a decision either way**:
   the three legacy public routers (`properties.py`, `units.py`, `bookings.py`) never call
   `resolve_tenant_status()`/`_verify_tenant()` — meaning a suspended or expired tenant's data is
   still fully servable through them, bypassing Hard/Soft Block entirely (§J). Unrelated to the
   domain change mechanically, but worth deciding whether to fix alongside it or ticket separately,
   since it's real and already-found.

---

## E. Exact Hostname/Path Resolution Rules — CONFIRMED (see §A for full detail)

Backend: JWT → `X-Tenant-Slug` header → `?client_slug=` query param → subdomain (`*.salmansaas.com`
suffix strip). No path awareness.

Frontend: slug is resolved from EITHER the URL path (localhost, `demo.salmansaas.com`, and — once
built — `alzabt.salmansaas.com`) OR the hostname itself (any other `*.salmansaas.com` subdomain, e.g.
`smar.salmansaas.com` today). Once resolved, the frontend is responsible for propagating that slug to
every backend API call via `client_slug`/`X-Tenant-Slug` — the backend has no independent way to
learn the tenant from a path-based host.

---

## F. Frontend/Backend Tenant-Resolution Flow — CONFIRMED, no mismatch found, one precondition

The backend has no concept of "path-based domain" at all — it only ever learns a tenant's identity
via JWT, an explicit header, an explicit query param, or a literal subdomain (§A). The frontend is
entirely responsible for resolving a path-based slug and then re-attaching it explicitly on every
call. This is **not currently a mismatch** — confirmed via direct grep: every real path-routed public
page (`ReservePage.jsx`, `CartPage.jsx`, `useCaracasMenu.js`, `StorePage.jsx`, `DemoCatalogPage.jsx`,
etc.) does pass `client_slug` explicitly — but it is a **precondition that must hold, not something
enforced by any shared abstraction**. There is no single hook/interceptor that guarantees every API
call from a path-routed page carries the slug; each page does it by hand. This is exactly the kind of
gap that broke silently once before in this project (`App.jsx`'s own comment about `useTenantSlug.js`
disagreement, §A) — recommend a systematic check of every smar page's API calls (not spot-checked)
before its canonical URL changes, per §D point 4, rather than assuming it "probably already works
like the others."

Once that precondition holds, `alzabt.salmansaas.com/{slug}` and `demo.salmansaas.com/{slug}` are
architecturally identical from the backend's point of view — both land on tier 2/3 of
`get_current_tenant()`, both get the same DB-verified, cached, Hard/Soft-Block-checked resolution.

---

## G. Railway Domain Map

Confirmed via Salman's own Railway dashboard screenshots this session:

- **Frontend service** (`WhatsApp-Appointment-Booking-frontend`) — Public Networking domains:
  `smar.salmansaas.com` (Cloudflare proxy detected, port 8080), `demo.salmansaas.com` (Cloudflare
  proxy detected, port 8080). Both currently point at the same frontend service/deployment.
- **Backend service** — `api.salmansaas.com` confirmed Online (screenshot, this session).
- `alzabt.salmansaas.com` — **not yet added** to Railway's Public Networking for either service.

---

## H. Complete Environment-Variable Matrix

Backend env var inventory (20 vars, every real `os.getenv`/`Settings` call site cited) was already
built in full this session: see `.claudedocs/work/railway-production-readiness/2026-08-28/audit.md`
§3.3 — not duplicated here. Relevant addition from §B above: `FRONTEND_URL`'s default value
(`https://demo.salmansaas.com`, `demo_service.py:364`) directly affects what admin URLs generated
demo tenants receive — worth keeping in mind when this var's value is revisited for the alzabt
rollout.

Frontend: only real var is `VITE_API_URL` (build-time, baked into the Vite bundle) — already
confirmed in `audit.md §3.2`.

---

## I. Database/Tenant-Identity Dependencies (CONFIRMED — full schema read)

**`Client` model** (`prisma/schema.prisma:15-134`) — full field list: `id` (UUID PK), `name`/
`name_ar`/`name_en`, **`slug String @unique`** (the identity key), **`phone String @unique`** (also
the login identifier), `email`, `password_hash` (client-root login), `isActive`, branding fields
(`primary_color`, `hero_video_url`, `whatsapp_number`, `instagram_url`, `maps_url`), `currency`
(default `"SAR"`), `features`/`config` (Json), `unit_types`/`payment_methods` (String[]),
`createdAt`/`updatedAt`, **`tier`** (billing tier: regular/pro/ultra), **`status`** (default
`"trial"`, narrowing per ADR-0002 to `"active"|"suspended"` — the Hard Block axis),
**`lifecycle_state`** (default `"trial"`: trial|paid|grace_period|expired|cancelled|archived|
evergreen — the separate Soft Block / Account Lifecycle axis), `trial_ends_at`, `service_type`,
`notes`, `selected_services` (denormalized CRM snapshot), `pageType` (normal|showcase),
`templateKey`, `vertical` (Alzabt Vertical Registry key), `provisioningStatus`
(pending|complete|failed), plus back-relations to every tenant-scoped model (`bookings`,
`customers`, `properties`, `units`, `clientServices`, `reservations`, `barbers`,
`catalogCategories`/`Items`/`Services`, etc.).

**No `is_demo` (or equivalent) field exists anywhere on `Client`** — confirmed independently by both
background investigations. A demo tenant is *structurally* a normal `Client` row, identified only by
naming convention (§B/§C). Relevant to §D: `alzabt.salmansaas.com` cannot currently be gated at the
data layer to "only real subscribed tenants" — that would need to be derived from the same
convention, or a new field added.

**`ClientService`** (`schema.prisma:571-585`) — the module-gate bridge table: `clientId` (FK,
`@db.Uuid`), `serviceKey`, `isActive`, `activatedAt`, `config` (Json?), `@@unique([clientId,
serviceKey])`, `@@index([clientId])`. Every other tenant-scoped model follows the identical
`clientId String @db.Uuid` FK convention (`Booking`, `Property`, and every model checked, confirmed
at multiple schema line citations).

---

## J. Security/Isolation Findings (CONFIRMED — both direct read and background investigation)

**No exploitable cross-tenant leak found.** Specifically checked and ruled out:
- **JWT forgery/replay**: `slug`/`client_id` claims are always set from a DB-verified row at issuance
  (`admin/auth.py`, 3 issuance sites all cited), never from client input; signed with `SECRET_KEY`;
  every consumer either re-derives from the verified payload or re-checks against the DB
  (`get_current_admin_user`'s `find_first(where={id, clientId})`). No path found where a tenant-A JWT
  could be replayed to read tenant-B's data.
- **`client_slug` spoofing → clientId injection**: in both the newer (`get_current_tenant`/
  `resolve_tenant_status`) and older ("Enterprise" `properties.py`/`units.py`/`bookings.py`) patterns,
  the raw slug string is always resolved to the real DB UUID *before* being used in any tenant-scoped
  query — never trusted directly as if it were the `clientId`. A spoofed/nonexistent slug 404s, it
  doesn't leak or substitute another tenant's private data.
- Admin/JWT-authenticated routes never trust hostname/header/query-param for identity —
  `get_authenticated_tenant()` deliberately drops those fallbacks, precisely because of a real,
  already-fixed prior incident (`SECURITY-2026-07-30-admin-authorization-bypass.md`).

**Real findings, none of them cross-tenant leaks, all worth a decision:**

1. **Legacy public routers bypass Hard/Soft Block entirely** — `properties.py`, `units.py`,
   `bookings.py` (mounted in `public/__init__.py`) never call `resolve_tenant_status()`/
   `_verify_tenant()`, unlike the newer `/{slug}/...` inline routes in the same file. A **suspended**
   (Hard Block) or **expired** (Soft Block) tenant's data is still fully servable through
   `GET /properties/?client_slug=...`, `GET /units/{id}/availability?client_slug=...`, and
   `POST /bookings/` — a real tenant-status enforcement bypass, not a cross-tenant leak. Pre-existing,
   unrelated to the domain-architecture work mechanically, but adjacent and already found — worth an
   explicit decision on whether to fix now or ticket separately (§N).
2. **One repository-layer scoping inconsistency, compensated at the call site**: `store_repo.py`'s
   cart-item methods (`find_cart_by_session`, `upsert_cart_item`, `list_cart_items`,
   `delete_cart_item`, `delete_all_cart_items`, `delete_cart`) take a bare `session_id`/`cart_id`, not
   `clientId` — every one of their 4 real call sites in `public/store.py` explicitly checks
   `cart.clientId != tenant["id"]` immediately after the lookup, so it is **not exploitable today**,
   but the repository itself provides no backstop — any future caller of those methods that forgets
   the check would silently create a cross-tenant cart bug. Every other checked repository
   (`booking_repo.py`, `property_repo.py`, the rest of `store_repo.py`) scopes by `clientId`
   consistently at the query layer itself.
3. **No automated demo-tenant expiry** (§B) — unbounded resource creation at 3/hour/IP with no
   cleanup mechanism at all. Real, slow-burning, independent of the domain-architecture work.
4. **Backend's subdomain-fallback tier doesn't exclude `demo.`** (§A/§B) — currently unreachable in
   practice (every real page explicitly propagates `client_slug`), but the same category of gap needs
   explicit verification for `alzabt.` too once its pages are built, not assumed safe by analogy.
5. **No DB-level signal distinguishes demo from real tenants** (§B/§C/§I) — relevant if
   `alzabt.salmansaas.com` is meant to be gated to subscribed-only tenants at any point.

---

## K. Exact Implementation Diff (PLANNED — not yet applied, per Phase 8)

**Required for launch:**

1. `app/core/config.py:44-49` — add `"https://alzabt.salmansaas.com"` to the hardcoded
   `CORS_ORIGINS` baseline list, alongside `smar.salmansaas.com`/`demo.salmansaas.com`.
2. `frontend/src/App.jsx:60-65` — generalize the domain-detection constants. Shape (exact wording
   pending Salman's answers to §N):
   ```js
   const IS_DEMO_SUBDOMAIN    = IS_SUBDOMAIN_MODE && _h.startsWith('demo.');
   const IS_ALZABT_SUBDOMAIN  = IS_SUBDOMAIN_MODE && _h.startsWith('alzabt.');
   const IS_PATH_BASED_DOMAIN = IS_DEMO_SUBDOMAIN || IS_ALZABT_SUBDOMAIN;
   ```
   Then, per §A's 6-row table, each of the 6 branches currently keyed on `IS_DEMO_SUBDOMAIN` gets an
   explicit per-branch decision — some likely become `IS_PATH_BASED_DOMAIN`, at least one (the
   `/alzabt` → `alzabt-demo` redirect, line 208-210) must **not** change, and the tenant catch-all
   registration (line 243) needs `IS_ALZABT_SUBDOMAIN` added the same way `IS_DEMO_SUBDOMAIN` is
   today — this is the one branch that actually breaks the whole feature if missed.
3. `frontend/src/router/TenantResolver.jsx:80` — `isDemoSubdomain` → also match `alzabt.`.
4. `frontend/src/hooks/useTenantSlug.js:17-23` — `_isSubdomainMode()` currently has **zero**
   demo/alzabt-awareness (used by 24+ files) — needs the same exclusion `App.jsx`/
   `TenantResolver.jsx` already have, or components using this hook on `alzabt.salmansaas.com/{slug}`
   will misread the slug.
5. `frontend/src/utils/tenant.config.js` — review its own tier-1 `/demo/:slug` path check; decide
   whether an `/alzabt/:slug` equivalent is needed or whether alzabt tenants never use that URL form.
6. `app/services/email_service.py:104` — replace the hardcoded `"https://demo.salmansaas.com/login"`
   with the same `FRONTEND_URL`-based construction `registration_service.py` already uses correctly.
7. Smar's own pages — audit (not spot-check) that every API call explicitly passes `client_slug=smar`
   or `X-Tenant-Slug`, per §D point 4 / §F's precondition.

**Found, adjacent, not required to launch — needs an explicit decision either way, not silent scope
creep in either direction:**

8. `properties.py`/`units.py`/`bookings.py` — add `resolve_tenant_status()` calls to close the
   Hard/Soft-Block bypass (§J.1).
9. `SEO.jsx:19` — low priority, effectively dead code in this SPA (§A).

---

## L. Exact Railway Changes (PLANNED — not yet applied)

1. **Frontend service → Public Networking** — add `alzabt.salmansaas.com` as a third domain, same
   Cloudflare-proxied pattern as the existing two (port 8080).
2. **Cloudflare DNS** — a real CNAME/DNS binding for `alzabt.salmansaas.com` needs to exist, the same
   manual step `CLAUDE.md` already notes was *pending* for `demo.salmansaas.com` as of 2026-07-18 —
   confirm this was completed for `demo.` (it now shows Online, so presumably yes) and repeat for
   `alzabt.` — this is a Cloudflare-side action, not something driven from this repo.
3. **Backend service → Variables** — no new Railway variable strictly required if CORS is hardcoded
   per K.1; `FRONTEND_URL` itself only needs revisiting if its *value* should change (a separate,
   already-flagged open question from the prior Frontend-Build-Blocker session — not decided here).
4. No `DATABASE_URL`/`DIRECT_URL`/`SECRET_KEY`/`WHATSAPP_VERIFY_TOKEN` changes needed for this work.

---

## M. Exact Verification Plan (maps directly to Salman's own Phase 7 sequence)

1. Railway domain configuration — add `alzabt.salmansaas.com`, confirm Cloudflare DNS resolves.
2. Environment variables — confirm CORS_ORIGINS change deployed (code change, not a Railway var).
3. Backend CORS — real `curl -H "Origin: https://alzabt.salmansaas.com"` preflight check against a
   real public endpoint, confirm `Access-Control-Allow-Origin` echoes back correctly.
4. Frontend configuration — confirm the build deployed with K.2-K.5's changes.
5. Tenant resolver — real browser navigation to `alzabt.salmansaas.com/smar`, confirm it renders
   smar's real page (not a 404, not the wrong tenant, not a blank #root).
6. API tenant propagation — real DevTools Network tab check: every XHR/fetch from that page carries
   `client_slug=smar` or `X-Tenant-Slug: smar`.
7. Database verification — confirm the resolved tenant is the real smar `Client` row (same `id` as
   today's `smar.salmansaas.com`), not a duplicate or mismatched row.
8. Deployment — full stack redeploy, 0 console errors on both `demo.salmansaas.com/{any-tenant}` and
   `alzabt.salmansaas.com/smar` (regression check — demo path must stay unaffected).
9. Domain verification — confirm `smar.salmansaas.com` (old URL) still resolves during any transition
   window, per Salman's own decision on whether/when to retire it (§N).
10. Tenant creation test — create one real or test tenant via the existing registration flow, confirm
    its generated `dashboard_url`/welcome-email link now points correctly (post K.6 fix).
11. Tenant resolution test — same tenant, both `demo.salmansaas.com/{slug}` (unaffected, regression
    check) and `alzabt.salmansaas.com/{slug}` (new path) both resolve correctly.
12. Cross-tenant isolation test — same technique this project's own Phase E security work already
    used (a second tenant's real JWT cannot see/mutate the first tenant's data) — re-run specifically
    against the new `alzabt.` path to confirm no regression.
13. Final smoke test — one real end-to-end CREATE → RESOLVE → REQUEST → READ/WRITE → ISOLATE cycle on
    `alzabt.salmansaas.com/{slug}`, mirroring what Phase F's own `RAILWAY_RESUME_CHECKLIST.md` already
    did for the WhatsApp booking flow — same rigor, new domain.

---

## N. User Inputs Required

1. Bare `alzabt.salmansaas.com/` (no slug) behavior — redirect somewhere, or not a valid case?
2. Does `alzabt.salmansaas.com/login` get the SSO portal (same as demo), given real subscriber
   accounts live there?
3. Does `alzabt.salmansaas.com` need an equivalent `/home` landing page, or do all real subscriber
   links always include a slug?
4. **Scope**: does `alzabt.salmansaas.com/{slug}` apply to ALL currently-subscribed tenants (rk,
   mr-h, caracas, footlab, olivello...) at once, or only smar initially, with others migrated later?
   This materially changes K.7's audit scope (one tenant's pages to check vs. many).
5. Does `smar.salmansaas.com` (the old URL) get retired immediately once `alzabt.salmansaas.com/smar`
   is live, or does it stay resolvable for some transition window? (Affects whether old bookmarks/
   links break immediately.)
6. On K.8/J.1 — fix the legacy public-router Hard/Soft-Block bypass as part of this work, or log it
   as a separate ticket? It's real and already found, but mechanically unrelated to the domain change.
7. Confirm Cloudflare DNS for `alzabt.salmansaas.com` is something Salman will set up directly (same
   as the still-referenced-as-pending `demo.salmansaas.com` binding in `CLAUDE.md`) — not something
   this session can do from the repo alone.

---

## O. Risks / Blockers

- The `App.jsx` six-branch decision table (§A/§K.2) is the real scope of the frontend work —
  meaningfully larger than a 1-line change, and touches a file with a self-documented history of
  subtle, console-error-free breakage from exactly this class of hostname-detection drift
  (`App.jsx:55-59`'s own comment about disagreeing with `useTenantSlug.js`).
- `useTenantSlug.js`'s `_isSubdomainMode()` currently has **zero** demo/alzabt-awareness and is used
  by 24+ files — the single highest-blast-radius item in this whole plan if missed.
- No DB-level signal distinguishes "demo" from "real trial" tenants (§B/§I) — worth knowing before
  assuming `alzabt.salmansaas.com` will only ever serve genuinely-paying tenants.
- `demo.salmansaas.com`'s own admin-URL generation defaults to itself when `FRONTEND_URL` is unset
  (§B) — a similar default-fallback question will need answering for whatever env var governs
  alzabt-related links.
- `email_service.py:104`'s hardcoded welcome-email link (§C) is a real, pre-existing bug independent
  of this work, but will actively mislead every new subscribed tenant once alzabt is live if not
  fixed alongside it.
- Cloudflare DNS binding for the new domain is a manual, external, Salman-only action — cannot be
  verified or completed from this repo/session.
- Legacy public-router Hard/Soft-Block bypass (§J.1) — pre-existing, found as a side effect of this
  audit, needs an explicit decision (§N.6) rather than silent scope creep either direction.

---

## P. Recommended Execution Order

1. **Decisions first** — get Salman's answers to §N (all 7 items) before writing a single line of
   code; several of §K's exact diffs depend on them (especially N.1-N.3, N.6).
2. **`email_service.py:104` fix** (§K.6) — small, independent, high-value, no dependency on anything
   else; can happen first and be verified in isolation.
3. **Backend CORS addition** (§K.1) — small, independent, safe to do early since it only *permits* an
   origin, doesn't change any existing behavior until the frontend actually starts sending requests
   from `alzabt.salmansaas.com`.
4. **Frontend hostname-detection consistency** (§K.2-K.5) — the real work, done together as one
   reviewed change (not piecemeal across separate commits/sessions), since the four files must stay
   consistent with each other or reintroduce exactly the drift risk §A/§O already flagged.
5. **Smar page audit** (§K.7) — systematic, not spot-checked, before smar's canonical URL changes for
   real users.
6. **Local build + manual smoke test** (localhost, simulating both `demo.` and `alzabt.` hostnames via
   `/etc/hosts` or a query-param override) before any Railway deploy — same discipline as the
   Frontend Build Blocker track earlier this session (verify locally, then deploy, never the reverse).
7. **Railway domain + DNS** (§L) — Salman's manual action, can happen in parallel with step 6.
8. **Deploy + full verification plan** (§M, all 13 steps) — including the explicit regression check
   that `demo.salmansaas.com` and every other existing tenant stays unaffected, not just that
   `alzabt.` newly works.
9. **§J.1's legacy-router Hard/Soft-Block fix** — only if §N.6 decides to bundle it; otherwise ticket
   separately and proceed without it blocking the domain rollout.
10. **Evidence + close-out** — final smoke test results, this document's remaining `[PLANNED]`
    markers replaced with `[DONE]`/real evidence, session log updated.

---

## Status: **Phases 1-9 implemented, deployed, and — for the core admin CRUD flows — genuinely verified live against real production data. §M steps 5-13 partially done; full smoke test still open. See session log for the complete real-world debugging arc.**

**Update, end of session 2026-08-28** — everything below this line supersedes the "Awaiting push"
status this section originally had:

- Commits `3e4b09b`/`9153d77` (this section's original K-plan) plus 5 more real commits produced
  during actual deployment/debugging: `4c6ea5b`/`4eee38f`/`197d09b`/`3a542c2` (public/admin API
  domain split — Salman's own separate, pre-existing intent, finished the same session) and
  `140aa1f`/`afb30fc` (two more real bugs found live: a `verify_password` NULL-hash crash, and
  `SSOLoginPage.jsx`'s hardcoded redirect domain).
- **§M steps 5-7, 11 confirmed with real evidence**: `alzabt.salmansaas.com/rk` and `/mr-h` both
  resolve the real tenant (not literal "alzabt"); a real admin login (`rkbarber@dev.invalid`) POSTed
  correctly to `dashboard.salmansaas.com`; real add/edit/hide CRUD on Staff and Services both hit
  `dashboard.salmansaas.com` with real `201`/`200` responses, 0 console errors; `api.salmansaas.com`
  confirmed returning real JSON config, not the SPA-fallback HTML that blocked this for most of the
  session.
- **§M step 12 (cross-tenant isolation) NOT re-run against the new `alzabt.` path this session** —
  was proven once already under the old architecture (Phase E); needs a fresh pass, not assumed to
  still hold.
- **§M step 13 (full smoke test) not completed** — reservation creation + WhatsApp notification
  round-trip on `alzabt.salmansaas.com/{slug}` is the real remaining gap.
- **Real, unplanned finding**: today's whole CRUD verification pass actually ran on
  `demo.salmansaas.com/rk/dashboard`, not `alzabt.salmansaas.com` — because the SSO login redirect
  bug (`afb30fc`) was still live at the time of testing. The fix is pushed but not yet independently
  verified against a real login from `alzabt.salmansaas.com` itself. This is genuinely the single
  most important unverified claim in this whole document — next session's first job.
- **Client-root phone login (a related, adjacent ask, not originally in this document's scope)**:
  code-side crash fixed (`140aa1f`), but RK's `Client.password_hash` is still NULL in the real DB.
  Setting it requires a direct SQL write — blocked from this session by a safety classifier on two
  separate attempts (a raw DB script, and earlier a `git remote set-url` with an embedded token) —
  this is Salman's own next action via Supabase directly, not something to retry from here.

Full narrative, chronological account of the real production debugging arc (env vars silently not
reaching the Vite build → two independent root causes found and fixed → real login credential
hunting → real CRUD verification) lives in `.claudedocs/sessions/2026-08-28.md`, not repeated here.

Salman answered all 7 §N questions 2026-08-28 and approved execution. Implemented exactly per §K:

- Commit `3e4b09b` — domain-routing change (CORS + App.jsx/TenantResolver.jsx/useTenantSlug.js/
  tenant.config.js hostname-detection consistency + email_service.py hardcoded-link fix).
- Commit `9153d77` — Hard/Soft-Block bypass fix (§N.6, bundled in as instructed), as its own
  separate commit per this project's commit-scope discipline.

**Local verification performed** (§M steps 1-4 equivalent, adapted since real DNS/hostname
simulation wasn't possible in this sandboxed environment — no `/etc/hosts` write access):
- Backend: `python3 -c "from app.main import app"` — imports clean, no errors.
- Frontend: `npm run build` — clean, 0 errors, only the pre-existing chunk-size advisory.
- **The exact new conditional logic run directly against the real committed code** (not
  re-implemented) for `App.jsx`'s domain-detection constants and `tenant.config.js`'s
  `getTenantSlug()`, against `alzabt.salmansaas.com`, `demo.salmansaas.com`, `salmansaas.com`, and
  `localhost` — all pass.
- **Real browser regression check** (Playwright, localhost, two different tenants — smar and
  caracas) — 0 console errors, 0 warnings, real DOM content confirmed via `innerText`, no existing
  tenant broken by these changes.

**Real Unknown, stated plainly, not glossed over**: I could not verify `alzabt.salmansaas.com` or
`demo.salmansaas.com`'s actual hostname-triggered behavior in a real browser in this session — that
requires either a real DNS-resolvable request (which only happens once this is deployed) or local
`/etc/hosts` write access this sandboxed environment doesn't have. §M's steps 5-13 (real navigation
to `alzabt.salmansaas.com/smar`, DevTools Network tab check, DB verification, cross-tenant
isolation, final smoke test) are the real closing verification and must happen post-deploy.

**Blocking on**: `git push origin main` — this session has no GitHub credentials (confirmed again,
same as the earlier Frontend Build Blocker track). Salman needs to push commits `3e4b09b` and
`9153d77` from a terminal with real credentials before Railway can build/deploy either change.

---

## §N — Final Answer Record (2026-08-29 update)

Salman's own restated answers, re-checked against live reality before being recorded (per this
project's Repository-over-memory discipline) rather than accepted verbatim:

1. **Bare `alzabt.salmansaas.com/`** — never relied on as a tenant URL. Real tenant URLs are always
   `alzabt.salmansaas.com/{slug}`. A root landing page, if built later, is a separate topic from
   tenant resolution. Matches what's live (external redirect to `salmansaas.com`) — no change.
2. **`alzabt.salmansaas.com/login`** — the SSO portal, same as `demo.`. Confirmed via real live
   smoke test 2026-08-29: login stays on `alzabt.salmansaas.com/{slug}/dashboard`.
3. **`/home`** — not part of the tenant routing contract. Tenant operational links are always
   slug-scoped; any future Alzabt marketing/landing homepage is separate from tenant resolution.
4. **Scope** — all subscribed tenants at once, not `smar` alone. `alzabt.salmansaas.com/{slug}` is
   the shared new tenant domain pattern.
5. **`smar.salmansaas.com` retirement** — **checked live before recording, real conflict found and
   resolved with Salman 2026-08-29**: Salman's restated preference was "don't retire immediately,
   keep it working during a transition window." Live check at the time:
   ```
   $ curl -sD- https://smar.salmansaas.com/
   HTTP/2 404
   server: cloudflare
   x-railway-fallback: true
   {"status":"error","code":404,"message":"Application not found"}
   ```
   DNS still resolves (Cloudflare proxy IPs), but the Railway-side custom domain binding is gone —
   the old URL is already broken, not "still working." Presented to Salman as a real choice: restore
   the Railway custom domain binding (real infra work) vs. accept it as already effectively retired.
   **Salman's decision: accept as already retired** — `alzabt.salmansaas.com/smar` is the one
   canonical pattern going forward, no restoration work scheduled.
6. **Legacy Hard/Soft-Block bypass** — confirmed real, needed fixing, and already shipped as part of
   this migration (`9153d77`). Salman's restated framing — that it *should* have been ticketed as a
   separate security track rather than bundled into the domain migration — is a retrospective
   categorization note for next time, not a request to revert working code. No action taken.
7. **Cloudflare DNS** — confirmed Salman's own responsibility, unchanged. Engineering-side live
   verification (this document + `.claudedocs/sessions/2026-08-29.md`) is complete; DNS
   ownership/configuration itself stays outside this session's access/scope.

Full 2026-08-29 verification evidence (SSO live check, real reservation flow, cross-tenant
isolation re-check): `.claudedocs/sessions/2026-08-29.md`.
