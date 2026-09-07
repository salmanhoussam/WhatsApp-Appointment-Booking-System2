# Fail-open onboarding webhooks — found, measured, closed (2026-09-07)

**Status:** CLOSED. Env var set by Salman (closed it with no deploy), code fix deployed `1fc1d8a`.
**Mode:** live production measurement, then fix, then re-measurement.

Found during the Admin API Architecture & Access Audit, whose question was Salman's: *is the Admin
API genuinely the single application boundary for administrative access to the database?* This was
the sharpest answer to that question — two administrative write paths that were not merely outside
the Admin API, but outside authentication altogether.

---

## Confirmed Findings

### 1. Both onboarding webhooks failed open, and one was verified open on production

`app/api/v1/ai_settings_agent.py` and `app/api/v1/onboarding.py` each carried their own
`_verify_secret`, identical in shape:

```python
expected = getattr(settings, "ONBOARDING_SECRET", None)
if not expected:
    return                    # onboarding.py's comment: "secret غير مُفعَّل في التطوير"
```

`app/core/config.py:69` declares `ONBOARDING_SECRET: Optional[str] = os.getenv(...)` with **no
default and no production startup assertion** — unlike `SECRET_KEY` (`config.py:111-112`), which has
one. So "unset" was a reachable production state, and the early `return` made it an open door.

**Evidence it was really open, not theoretically open** — an anonymous POST with no secret header
and a deliberately non-existent `client_slug`:

```
POST https://dashboard.salmansaas.com/api/v1/webhook/ai-settings
     (no X-Onboarding-Secret header)
     {"message":"probe","client_slug":"nonexistent-probe-1788771497"}
→ 404 {"code":"NOT_FOUND","message":"Client 'nonexistent-probe-1788771497' not found"}
```

Reaching the tenant lookup proves `_verify_secret` had already passed. A configured secret returns
401 before that line. The probe was chosen so it could not mutate anything: `ai_settings_agent.py:99`
looks the client up and 404s at `:101`, **before** the Claude call (`:107`) and before the write
(`:112`). `/onboarding/process` was NOT probed while open — it creates tenants; its state was read
from code (`onboarding.py:46-51`, the same helper).

Corroborating: Salman's Railway variables screenshot listed 18 variables alphabetically, going
`FRONTEND_URL` → `PROJECT_NAME` with no `ONBOARDING_SECRET` between them.

### 2. What was reachable anonymously

| Endpoint | Capability |
|---|---|
| `POST /api/v1/webhook/ai-settings` | Mutates **any** tenant by slug: `name_ar`, `primary_color`, `whatsapp_number`, `pageType`, plus `catalog_layout`/`font` merged into `config` (`_build_update_data`, `:136-156`). Written with **raw Prisma from the route file** (`:112`), bypassing `site_configuration_service` — which `admin/settings.py:126` uses for the identical operation. Then `invalidate_tenant_cache` (`:116`) makes it live immediately. No rate limit. |
| `POST /api/v1/webhook/onboarding/process` | Creates a `Client` **and** a `TENANT_ADMIN` via `register_new_tenant` (`:86`), returning the generated password in the response (`:100-102`). No rate limit. |

The values written to `ai-settings` are whatever Claude emits under `tool_choice: {"type":"any"}`
(`:190`) over attacker-controlled text (`:191`); `primary_color`, `name_ar` and `whatsapp_number` are
declared as bare `"type": "string"` with no enum (`:51-72`) and nothing re-validates after
(`:142-150`).

**Sharpest consequence: `whatsapp_number`.** Rewriting it reroutes a shop's customer conversations
to an attacker's number.

### 3. The correct pattern already existed in the same codebase

`app/api/v1/webhook.py:88-93` (the WhatsApp signature check) **fails closed** when its secret is
absent, logs why, and says in its own comment that this is "a required Railway env var, not a code
gap". Same project, same week, opposite behaviour. The fix copies its shape rather than inventing one.

---

## Side Findings

- `_verify_secret` is **duplicated** in two modules rather than shared — which is how the same defect
  came to exist twice. Not consolidated in this fix (that is a refactor, not a security close).
- Both endpoints exist for **n8n**, which Salman retired the same day. They are now gated but
  callerless — their disposition is an open product decision, recorded, not taken here.
- `ONBOARDING_SECRET` is unrelated to staff onboarding despite the name. Staff onboarding is
  `POST /admin/team` → setup token → WhatsApp link → `POST /auth/set-password`, and never touches
  this secret. Salman made this distinction explicitly; the code comments now carry it.

---

## Unknowns

- **Whether the open window was ever exploited was NOT established.** No log review, no audit-trail
  query, and no before/after diff of tenant `config` rows was performed. Absence of evidence only —
  do not read this document as saying nothing happened.
- How long the window was open is unknown; no deployment history for the variable was examined.
- The other four boundary gaps the audit found (`POST /auth/create-user` minting SUPER_ADMIN with
  `SECRET_KEY` as a bearer, anonymous tenant creation via `/public/demo/create` and two `register`
  routes, and 39 scripts writing over a pgbouncer-bypassing direct connection) are **still open**.
  See this folder's `summary.md` when it is written.

---

## Recommendation / Decision / Execution

- **Recommendation:** set the variable immediately (closes it with no deploy), then make both checks
  fail closed so a future missing variable cannot silently reopen them.
- **Decision:** Salman, 2026-09-07 — do both; and separately, n8n is retired and must not be restored
  or preserved as a dependency.
- **Execution:** variable set by Salman; code fix `1fc1d8a`, pushed and deployed.

## Verification

| Check | Result |
|---|---|
| Pre-fix probe, no secret header, non-existent slug | `ai-settings` → **404** (gate open) |
| After Salman set the variable, same probe | `ai-settings` → **401**, `onboarding/process` → **401** |
| Local, secret configured | correct secret accepted; wrong secret and missing header → 401 (both endpoints) |
| Local, `settings.ONBOARDING_SECRET = None` | **503** "Endpoint is not configured" (both endpoints) — the regression case |
| Post-deploy, 4 consecutive probes over ~80s | `ai-settings` 401, `onboarding` 401, `/health` 200 |
