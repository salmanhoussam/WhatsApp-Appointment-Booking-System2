# Interface / API Boundary Map — evidence-first

**Mode: INVESTIGATION ONLY.** No code, schema, database or configuration was modified to produce
this. Salman's instruction, 2026-09-07: *"ولا تنفّذ أي تعديل أو حذف أو migration … ممنوع تعديل
الكود أو DB."*

**Frame:** Salman's own Interface decision tree (`~/.claude/plans/we-moved-on-new-hazy-barto.md` §4).
Every finding below is filed under exactly one of its branches — that is what makes the tree a
diagnostic and not just documentation.

**Scope:** 187 routes across 45 route files, enumerated mechanically from source, plus the frontend
consumers of each contract. Counts are parsed, not estimated.

---

## 0. The foundational claim, re-verified

> **The browser never touches PostgreSQL.**

| check | result |
|---|---|
| DB/Supabase client in `frontend/package.json` | **0** |
| `supabase.from(` · `createClient(` · `SUPABASE_ANON` · `VITE_SUPABASE` · `postgrest` in `frontend/src` | **0 hits** |
| `supabase.co` references in `frontend/src` | 36 — **35** are `/storage/v1/object/public/…` CDN asset URLs |
| the 36th | `SmarAdminDashboard.jsx:1244` — **placeholder text inside an input field**, not a call |

Both spines hold as designed:

```
CUSTOMER BROWSER → Public API  → Services → Repositories → PostgreSQL
ADMIN BROWSER    → Admin API   → Services → Repositories → PostgreSQL
```

---

## 1. Route census

| surface | routes | mount |
|---|---:|---|
| Admin | 116 | `/api/v1/admin` |
| Public | 53 | `/api/v1/public` |
| Super | 13 | `/api/v1/super` |
| Webhooks | 5 | `/api/v1/webhook`, `/api/v1/webhooks` |
| **total** | **187** | |

---

## 2. Branch: **Business/Admin → Admin Contract → authenticated tenant → permission**

### ✅ The admin floor is real and correctly built

`app/api/v1/admin/__init__.py:24` —
`_protected = APIRouter(dependencies=[Depends(get_authenticated_tenant)])` wraps **20 routers**.

`get_authenticated_tenant` is **JWT-only** — it deliberately drops the `X-Tenant-Slug` header,
`?client_slug=` query param and subdomain fallbacks that `get_current_tenant` accepts. The file's own
comment states this and cites the review that closed it
(`reviews/SECURITY-2026-07-30-admin-authorization-bypass.md`).

**Result: 0 admin routes are reachable without authentication.** A flat scan appears to show 8; all
8 are false positives and each was traced:

| apparent gap | reality |
|---|---|
| `/login`, `/users/login`, `/setup`, `/set-password`, `/register` (`admin/auth.py`) | mounted at **`/api/v1/auth`** (`main.py:67`), not under `/admin`. These *are* the auth boundary — public by definition. |
| `GET /me` (`admin/me.py`) | inside `_protected`; its docstring says so explicitly |
| `GET /settings`, `GET /settings/qr` | mounted **outside** `_protected` on purpose, carrying their own `_require_valid_tenant_jwt` — because ADR-0002 §9.1 needs `allow_during_soft_block` to run **before** any tenant dependency, and a router-level dependency always runs first. Documented at `admin/__init__.py:6-13`. |

**This is the single healthiest boundary in the system.** Worth stating plainly, because the rest
of this document is findings.

### ⚠️ Double tenant resolution — redundant, not exploitable

**70 of 116** admin routes declare `get_current_tenant` in their own signature *in addition to* the
floor's `get_authenticated_tenant`. `get_current_tenant` resolves JWT **first**
(`app/core/tenant.py`, priority order), so an authenticated admin's own token always wins and a
supplied header/query slug cannot override it.

**Classification: consistency debt, not a hole.** Two dependencies answer the same question on every
one of those requests. Naming it here so nobody re-derives the alarm later.

---

## 3. Branch: **Customer-facing → Public Contract → `require_service` → public tenant resolution**

**27 of 53 public routes carry no `require_service` gate.** They are not one problem — they are four
distinct groups, and only two need a decision:

| group | routes | verdict |
|---|---|---|
| **Booking/listings reads** — `/{slug}/config`, `/listings`, `/price`, `/services`, `/units/{id}/gallery`, `/units/{id}/calendar`, `properties.py`, `units.py`, `listings.py` | 13 | **Correct.** `booking` gates nothing anywhere in the codebase (established 2026-09-06, `app/core/verticals.py:29-50`); these resolve a tenant and read published data only |
| **Customer self-service auth** — `POST /{slug}/auth/register`, `/auth/login` | 2 | **Correct.** Rate-limited (3/min, 5/min); an auth endpoint cannot sit behind a capability gate |
| **Standalone micro-SaaS** — `dating.py` (3), `moments.py` (6) | 9 | **Out of the tenant model by design.** `DatePage`/`Occasion*` carry no `clientId` (`schema.prisma`, documented). All 4 tables are **empty**. Not a boundary violation — a different product |
| 🔴 **Anonymous tenant creation** — `POST /public/demo/create`, `POST /public/register` | 2 | **The known family.** Deferred by Salman's explicit instruction: *"كل واحد بدّو قرار مستقل"* |
| **Booking writes** — `POST /{slug}/bookings`, `POST /` (`bookings.py`) | 2 | Resolve a tenant and re-check ownership; ungated for the same `booking`-gates-nothing reason |

---

## 4. Branch: **WhatsApp → verify secret FIRST → resolve tenant → capability → service → DB**

| endpoint | secret verified first? | writes via | verdict |
|---|---|---|---|
| `POST /webhook/whatsapp` (`webhook.py:88-93`) | ✅ HMAC before body parse, constant-time, **fails closed** | `whatsapp_flow` → services → repos | **the reference implementation** |
| `POST /webhook/onboarding/process` (`onboarding.py`) | ✅ **now** — fixed today (`1fc1d8a`), was fail-open | `registration_service` | closed |
| `POST /webhook/ai-settings` (`ai_settings_agent.py`) | ✅ **now** — fixed today | 🔴 **raw Prisma from the route** — `:99` `client.find_first`, `:112` `client.update` | see §5 |
| `POST /webhooks/samsara` | — | 1 direct Prisma call | Fleet; all 6 Fleet tables empty |

---

## 5. Branch: **AI → decide the actor; never pick a Contract for convenience**

Two AI surfaces exist, and they land on opposite sides of this rule.

**`public/ai_chat.py` — clean.** A marketing chatbot: no tenant, no DB, no tools, no auth needed.
Stateless SSE. Correctly Public.

> ⚠️ Side finding: its rate limiter is an **in-memory dict** (`:42 _rate_store`). Under gunicorn's
> multiple workers the stated 20/min becomes 20/min **per worker**. This is the *same class of bug*
> already found and fixed for WhatsApp sessions (`WHATSAPP_DB_SESSIONS_FIX`, in-memory dict broken
> across workers). Not a security boundary issue; a real correctness one.

**`ai_settings_agent.py` — the violation this branch exists to catch.** It writes
`name_ar` / `primary_color` / `whatsapp_number` / `config` with **raw Prisma from the route file**
(`:99`, `:112`), bypassing `site_configuration_service` — which `admin/settings.py:126` already uses
for the identical operation. It also busts the tenant cache, so changes go live immediately.

Filed as **Broken Architecture** under `.claudedocs/architecture/TENANT_OS.md`'s existing taxonomy —
a Route bypassing its Service. Not a new label.

---

## 6. Routes executing Prisma directly — the full list

**5 of 45 route files.** Every other route file goes through a repository or service.

| file | calls | note |
|---|---|---|
| `super/platform_services.py` | 9 | Super-admin CRUD with no service layer at all |
| `super/clients.py` | 6 | incl. `:229` `user.find_unique(email)` and `:233` `user.create` — the super-admin user path |
| `ai_settings_agent.py` | 2 | §5 |
| `admin/catalog.py` | 1 | `:24` `clientservice.find_first` — a **capability check**, not a data write. Benign in kind |
| `webhooks/samsara.py` | 1 | Fleet, empty tables |

---

## 7. Frontend: who consumes which contract

### Admin surfaces reading the **Public** Contract — 3 crossings, all still present

| # | path | what it drives |
|---|---|---|
| **V1** | `GenericAdminDashboard.jsx:5,449` → `hooks/useTenantConfig.js:65` → `GET /public/{slug}/config` | nav tabs, currency, default redirect. **Partially remediated:** `:570-573` now *prefers* `/admin/me`'s capability list and keeps this as fallback |
| **V2** | `tabs/ReservationsTab.jsx:5,489,491` → same hook | `config.config.working_hours` → the calendar's time axis. **An independent second dependency**, not V1's cache |
| **V3** | `SmarAdminDashboard.jsx` → `components/UnitCalendar.jsx:20,145` → `GET /public/{slug}/units/{id}/calendar` | **strongest case:** the admin *reads* availability through the Public Contract while *writing* the same feature's overrides through `adminApi.post('/units/{id}/date-overrides')` (`:1317`). `admin/units.py` already owns this data; the UI does not read it |

Everything else is clean: **all 10** `generic-admin/tabs/*` fetch through `adminApi`.

### Public surfaces holding the **Admin** client — 2

- **A1** `pages/demo/DemoPublicPage.jsx` imports `adminApi` and PATCHes `/admin/settings`. Reachable
  with **no auth guard** at `/demo/:slug/legacy`. Bounded in practice (self-gates on a token; the
  backend would 403 anyway) — but the admin axios instance is bundled into a public chunk.
- **A3** `pages/auth/TenantRegisterPage.jsx` uses `adminApi` **after authenticating itself**. By
  design; recorded for completeness.
- **A2** `frontend/src/api.js` — admin base URL, **1 importer**. Previously flagged as fully dead;
  it now carries the 2026-08-28 domain-split comment, so re-check its importer before acting.

**The live-preview `<iframe>` reading the Public Contract is explicitly sanctioned** by
`rules/backend/architecture.md` §10 and is not a violation.

---

## Confirmed findings

1. **The browser never reaches PostgreSQL.** Measured three ways (§0).
2. **The admin authentication floor is complete** — 0 of 116 admin routes reachable anonymously; all
   8 apparent gaps traced to correct, documented design (§2).
3. **All 13 super routes carry `require_super_admin`** (§1).
4. **The WhatsApp webhook boundary now verifies before acting on all three webhooks** — one was
   fail-open this morning (§4).
5. **5 of 45 route files execute Prisma directly**; only one of those is an AI/tenant write path
   (§5, §6).
6. **3 admin→public crossings and 2 public→admin crossings persist** (§7).
7. **70 admin routes resolve the tenant twice** — redundant, not exploitable (§2).

## Side findings

- `ai_chat.py`'s in-memory rate limiter is per-worker — same bug class already fixed for WhatsApp
  sessions.
- `architecture/capabilities/customers.md` says the Customers route is **unmounted**. It is mounted
  (`admin/__init__.py:41`). **The capability doc is stale.**
- Dating + Occasions = 9 public routes over **4 empty tables** — a whole product surface with no data.

## Unknowns

- **Runtime behaviour was not probed.** This map is source-derived; no request was issued as part of
  it. The live probes quoted elsewhere in today's session belong to their own phases.
- **Whether the 3 admin→public crossings actually misbehave** for a tenant whose public config
  disagrees with `/admin/me` — not tested; V1's own code comment says the two "can disagree
  mid-load."
- **`super/*` authorization depth** — `require_super_admin` presence is confirmed on all 13, but
  what each route then does with `client_id` was not audited route-by-route.
