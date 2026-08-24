# Phase F — Production Contract / Gate

Per Salman's explicit instruction (2026-08-24): Phase F does not start with "run Railway blindly."
It starts with this Contract — exact env vars, exact migration command, exact webhook URL, and an
exact safe smoke-test sequence — reviewed and approved BEFORE any real Railway/production action
is taken. **Nothing in this document has been executed. No Railway command has been run, no env
var has been changed, no deployment has been triggered.** This is 100% investigation, matching
this project's own Implementation-Contract-before-Implementation discipline
(`documentation-policy.md`).

**Hard constraint discovered while writing this**: no Railway CLI is installed/authenticated in
this environment (`which railway` → not found). Every Railway-dashboard action named below is
something only Salman (or whoever holds Railway access) can actually perform — this Contract
names exactly what to do and how to verify it, not something this session can execute unilaterally.

---

## 1. The one already-known P0 blocker (from the 2026-08-22 Final Production Gate Audit)

Real, prior, still-unresolved finding — re-confirmed today, not newly discovered:

> Every production protection this app has — CORS restriction, hidden `/docs`/`/redoc`, and the
> `SECRET_KEY`/`WHATSAPP_VERIFY_TOKEN` startup guards — is gated behind exactly one flag:
> `settings.ENVIRONMENT == "production"` (`app/core/config.py:22`, checked in `app/main.py:35,
> 53-63` and `config.py:102-106`). Local `.env` has `ENVIRONMENT=development` (confirmed again
> today). **Whether Railway's real deployed service has `ENVIRONMENT=production` set cannot be
> checked from this session — no Railway access exists here.**

**This is Phase F's real Step 0**, before anything else: Salman confirms, directly in the Railway
dashboard (Backend service → Variables), that `ENVIRONMENT=production` is actually set. If it
isn't, real production traffic would get wide-open CORS and exposed `/docs` — a real, not
hypothetical, gap.

---

## 2. Required Environment Variables — Backend Service (Railway)

| Var | Required? | Current local value class | Railway action needed |
|---|---|---|---|
| `DATABASE_URL` | **Hard-required** — app crashes at import if missing | Set locally, points at Supabase pooler (port 6543) | Confirm Railway's own value points at the **same Supabase project** this whole session's testing ran against (see §4 — this matters for the migration question) |
| `DIRECT_URL` | **Hard-required** — same | Set locally, port 5432 | Same confirmation as above |
| `ENVIRONMENT` | Soft-required (silently degrades security if wrong) | `development` locally | **Must be `production` on Railway** — Step 0 above |
| `SECRET_KEY` | Soft-required — real startup guard blocks boot if left as the insecure default AND `ENVIRONMENT=production` | Set locally to a real value | Confirm Railway has a real, non-default value (the guard only fires once `ENVIRONMENT=production` is also true — the two checks are linked) |
| `WHATSAPP_VERIFY_TOKEN` | Same shape as `SECRET_KEY` | Set locally | Confirm real value set on Railway — needed for §5's webhook verification |
| `SUPER_ADMIN_SLUG` | No startup guard exists (named gap, `.claudedocs/work/final-production-gate-audit/2026-08-22/summary.md`, P2) | Defaults to `"smar"` | Low risk, already resolves correctly — not a blocker, just confirm it's still `smar` (Salman's own tenant) if that's still intended |
| `FRONTEND_URL` | No default | Unset locally | Set on Railway to the **frontend service's real Railway-assigned domain**, once known (used to extend `CORS_ORIGINS` beyond the 4 hardcoded safety-baseline domains in `config.py:38-42`) |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID` | No default — outbound WhatsApp sends silently no-op without them | Unset locally (dev has no real WABA) | **Real values needed only if this smoke test includes a real WhatsApp round-trip** (see §6) — if deferred, every WhatsApp send just logs "credentials missing" instead of crashing, same safe-degradation this whole session relied on |
| `WHATSAPP_CENTRAL_NUMBER` | New in Phase B — not a secret, the shared bot's public dialable number | Unset locally | Same as above — only needed for a real WhatsApp round-trip test |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (or `SUPABASE_KEY`) | Read via bare `os.getenv()`, not through `Settings` — real, used, architecturally inconsistent but functional | Set locally | Confirm set on Railway — needed for image uploads/storage, not this smoke test's critical path |
| `ANTHROPIC_API_KEY`, `ONBOARDING_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | No default, each independently optional | Varies | Not on this smoke test's critical path — confirm only if the specific feature using them is in scope |

**Real, named dead/inconsistent vars found while inventorying** (not blockers, not fixed here —
out of scope for this Contract, flagged so they don't get silently "fixed" as scope creep):
`HIGGSFIELD_API_KEY` (in `.env.example`, read nowhere in `app/`), `JWT_SECRET_KEY` (in local
`.env`, read nowhere — the real signing key is `SECRET_KEY`), `MAIN_DOMAIN` (referenced by
`app/utils/tenant.py`, which is never imported anywhere — dead code, not a live bug; the real
subdomain logic hardcodes `"salmansaas.com"` as a plain constant in `app/core/tenant.py:45`).

## 3. Required Environment Variables — Frontend Service (Railway)

Not inventoried in as much depth this pass (backend was this session's real focus) — named as a
real gap in this Contract rather than assumed fine: **`frontend/railway.json` has no
`healthcheckPath` set** (the backend's does: `/health`). Recommend confirming this is deliberate
or adding one before relying on Railway's own restart-on-failure behavior for the frontend service.

---

## 4. Migration Command — and the real question it depends on

**Exact command this project already uses** (its own documented convention, not invented here):
```
python3 -m prisma db push
```
Run against `DATABASE_URL`/`DIRECT_URL` — **not** `prisma migrate deploy` (this project has never
used Prisma's own migration-history mechanism; confirmed via a repo-wide grep, zero matches). This
is a real, standing project convention (`.claudedocs/archive/roadmap/completed.yaml:1496`: "every
schema.prisma change is followed by `prisma db push` from the Railway Console") — not something
this Contract is introducing.

**The real open question, not yet confirmed**: this whole session's testing (Phase A-E, all 5
phases' real DB verification) ran directly against
`aws-1-ap-southeast-2.pooler.supabase.com` — the same connection string appeared in every error
message throughout. Per this project's own stated architecture ("سيرفر واحد، DB واحد" —
one server, one DB, `CLAUDE.md`'s own Vision section), **the working assumption is that Railway's
production backend service points at this exact same Supabase project**, meaning:
- `Reservation.customerId` (Phase A), the `reservations_active_barber_slot_uidx` unique index
  (Phase C), and every other schema change this whole track made **are already live in whatever
  DB Railway's service actually uses** — no separate production migration step would be needed.

**This is an assumption, not a confirmed fact** — flagged explicitly rather than treated as
settled. **Action for Salman**: confirm Railway's `DATABASE_URL`/`DIRECT_URL` values point at the
same Supabase project (matching host, not necessarily identical full connection string given
pooler vs. direct). If they do — no migration step needed for this gate, the schema is already
correct. If they don't (a separate production database exists) — `python3 -m prisma db push` must
be run once against that database before anything else in this Contract, and Phase A-E's own
migration files (`prisma/migrations/add_reservation_customer_id.sql`,
`add_reservation_barber_slot_unique_index.sql`) — hand-authored SQL, applied via direct execution
in this session, not through `db push` alone for the unique index specifically — would need
re-applying by hand there too (the partial unique index is *not* expressible in `schema.prisma`'s
DSL, so `db push` alone does not create it — see that file's own header comment).

---

## 5. Webhook URL — exact production path

```
https://<railway-backend-domain>/api/v1/webhook/whatsapp
```
(`app/main.py:68` mounts `webhook_router` at prefix `/api/v1/webhook`; the router itself declares
`/whatsapp` for both `GET` verify and `POST` receive — `app/api/v1/webhook.py`.)

**Meta App Dashboard configuration** (manual, Salman's side, standard Meta Cloud API setup —
not something this session can perform): under WhatsApp → Configuration → Webhook, set the
Callback URL to the exact path above and the Verify Token to the same real value configured as
`WHATSAPP_VERIFY_TOKEN` on Railway. Meta will immediately call the `GET` endpoint with a challenge
— per the app's own logic (`webhook.py:20-36`), a correct token returns the challenge integer
(200), a wrong one returns 403. This is the exact mechanism Phase E's Part 4 already proved
correct against a local instance — same code, no changes needed for production.

---

## 6. Safe Smoke Test Plan — Salman's own named sequence

Exactly the sequence given, made concrete with a pass/fail signal for each step. **None of this
runs until Salman gives the explicit go to actually touch Railway** — this section is the plan for
that moment, not something executed by writing this Contract.

| # | Step | Real pass signal | Real fail signal |
|---|---|---|---|
| 1 | Railway deployment succeeds | Both services show "Active" in Railway dashboard; `GET https://<backend-domain>/health` → 200 | Build/deploy failure in Railway logs |
| 2 | `ENVIRONMENT=production` confirmed | `GET https://<backend-domain>/docs` → 404 (docs hidden) | `/docs` loads — real gap, stop here and fix before continuing |
| 3 | Webhook verification | Meta Dashboard's own "Verify and Save" succeeds after pointing at the URL in §5 | Meta reports verification failure |
| 4 | Guest WhatsApp booking (needs real WABA credentials from §2) | A real test message through the shared number reaches `RES_CONFIRMING` and creates a real `Reservation` + `Customer` row (same flow Phase C/D already proved locally) | No message received server-side, or webhook 500s |
| 5 | `Customer` + `Reservation` visible in the real DB | Direct query against the real production DB shows the new row with correct `customerId`/`barberId`/`status=pending` | Row missing or malformed |
| 6 | Calendar shows it | Real admin dashboard login → Reservations Calendar renders the new booking | Calendar empty/errors |
| 7 | Cancellation/reschedule | Real `PATCH .../status` (cancel) and `PATCH .../reschedule` against the test booking behave exactly as Phase D/E proved locally, including the real WhatsApp notification attempt | Mutation fails, or the wrong reservation is affected |
| 8 | Tenant isolation smoke check | Same technique as Phase E Part 1 — a second tenant's real admin JWT cannot see/mutate the test booking | Any cross-tenant leak |
| 9 | Concurrency smoke test | Two real near-simultaneous confirm attempts for the same slot (same technique as Phase E Part 3) → exactly one succeeds | More than one booking, or a crash |

Every test row created during this sequence gets cleaned up the same way every prior phase's test
data was — soft-cancel/delete via the app's own real mechanisms, never a raw destructive wipe of
production data outside what this specific test created.

---

## 7. Explicitly out of scope for this Contract (and for Phase F generally)

- Stage 2 WABA (per-tenant credentials, `SECRET_ENCRYPTION_KEY`, Embedded Signup) — still deferred,
  no new trigger.
- Fixing the dead/inconsistent env vars named in §2 — named, not touched.
- The frontend `healthcheckPath` gap named in §3 — named, not fixed, unless Salman asks for it
  explicitly as its own small change.
- Any code change at all, unless the smoke test in §6 finds a real, new gap — in which case, same
  rule as every phase so far: patch it, document it, don't silently expand scope beyond the fix.

---

**Status: awaiting Salman's review of this Contract, and separately, his confirmation of §1
(`ENVIRONMENT=production` on Railway) and §4 (which Supabase project Railway actually points at)
— both require direct Railway dashboard access this session does not have. No Railway action will
be taken until both are confirmed and Salman gives an explicit go for §6.**
