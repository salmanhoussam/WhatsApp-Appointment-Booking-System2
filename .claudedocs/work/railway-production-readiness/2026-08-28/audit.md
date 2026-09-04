# Railway Production Readiness — Research & Audit (Phase: RESEARCH ONLY)

Follows: `service-execution-constitution.md` (investigate before executing), `investigation-protocol.md`
(evidence discipline, Confirmed/Side Findings/Unknowns). Triggered by Salman's explicit instruction,
2026-08-28: open a dedicated, non-Frontend session for Railway Production Readiness. **No code
touched. No commit made. No Railway variable changed. This document is 100% investigation.**

Session rule in force: do not modify `ProductShowcaseHome.jsx`, do not commit, do not touch any
Railway Production Variable before the research/audit phase is reviewed and approved.

---

## 1. Session Objectives (as given)

1. Prove what the project actually needs to run in production on Railway.
2. Match those requirements against the current Railway Production Environment.
3. Identify missing/stale/wrong Variables.
4. Prove Database Identity before any migration or destructive operation.
5. Prove the Railway deployment itself is Healthy and reachable.
6. Verify WhatsApp + Resend configuration.
7. Execute a real Smoke Test — last, not first.
8. Write a final evidence/report another session can resume from without re-researching.

---

## 2. Railway Official Sources Consulted (2026-08-28, `docs.railway.com`)

- [Production Readiness Checklist](https://docs.railway.com/overview/production-readiness-checklist) — official checklist, fetched in full (§10 below)
- [Healthchecks](https://docs.railway.com/deployments/healthchecks) — fetched in full
- [Restart Policy](https://docs.railway.com/deployments/restart-policy)
- [Deployments reference](https://docs.railway.com/deployments/reference)
- [Config as Code](https://docs.railway.com/config-as-code/reference)
- [Using Variables](https://docs.railway.com/variables) — staged-changes behavior
- [Variables Reference](https://docs.railway.com/variables/reference)
- [Set a Start Command](https://docs.railway.com/deployments/start-command)
- [Build and Start Commands](https://docs.railway.com/builds/build-and-start-commands)
- [Public Networking](https://docs.railway.com/networking/public-networking)
- [Private Networking / How It Works](https://docs.railway.com/networking/private-networking/how-it-works)
- [Working with Domains](https://docs.railway.com/networking/domains/working-with-domains)
- [Railway Domains](https://docs.railway.com/networking/domains/railway-domains)
- [Logs](https://docs.railway.com/observability/logs)
- [Deployment Actions](https://docs.railway.com/deployments/deployment-actions) (rollback)

### Key facts extracted (not general knowledge — the specific claims that matter for this project)

- **Healthcheck scope is narrower than it sounds.** Railway queries `healthcheckPath` only *during
  a new deployment*, waiting for HTTP 200 before flipping traffic to it (zero-downtime cutover).
  **"Railway does not monitor the healthcheck endpoint after the deployment has gone live."** This
  matters directly for this project: `/health` (`app/main.py:89-101`) does `SELECT 1` against the
  DB and returns 503 on failure. That only blocks a *new deploy* from going live if the DB is down
  at deploy time — it does **not** cause Railway to restart an already-live service if the DB later
  becomes unreachable mid-session. Post-deploy DB outages are caught only by the app's own error
  handling per-request, not by Railway's healthcheck loop.
- Default healthcheck timeout is 300s (5 min) — this project's `railway.json` overrides it to 30s
  (`healthcheckTimeout: 30`). That is *tighter* than Railway's default, worth being aware of: a
  slow cold start (DB pool warm-up, Prisma client generation already baked into the image at build
  time) has only 30 real seconds to return 200 before the deploy is marked failed.
- Default restart policy is ON_FAILURE / 10 retries — this project's backend `railway.json` matches
  the default exactly (`restartPolicyType: ON_FAILURE, restartPolicyMaxRetries: 10`).
- Variable changes on Railway are **staged** — editing a variable does not apply immediately; it
  queues as a pending change that must be explicitly reviewed/deployed. Relevant later: after any
  variable edit this session eventually makes, an explicit deploy step is required, it isn't
  automatic the instant the value is typed in.
- `PORT` is Railway-injected; the app must bind `0.0.0.0:$PORT`. **This project's Dockerfile CMD
  already does this correctly**: `--bind 0.0.0.0:${PORT:-8080}` (`Dockerfile:24`).
- A Railway-provided public domain (`*.up.railway.app`) is generated per service, auto-detects the
  single listening port. A custom domain requires DNS + Railway's own SSL issuance — separate from
  the free domain.
- Rollback reverts both the image and the variables to the prior successful deployment — a real,
  available safety net once a healthy deployment exists to roll back to.

---

## 3. Project-Specific Findings (real code, real files, cited)

### 3.1 Backend service — Railway config, build, start

- `railway.json:1-13` — `builder: DOCKERFILE`, `dockerfilePath: Dockerfile`, `restartPolicyType:
  ON_FAILURE` / 10 retries, `healthcheckPath: /health`, `healthcheckTimeout: 30`.
- `Dockerfile:1-24` — `python:3.11-slim` base, installs `requirements.txt`, runs `python3 -m prisma
  generate` **at build time** (so the Prisma client is baked into the image, not generated at
  startup), `EXPOSE 8080`, start command:
  `gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 2 --bind 0.0.0.0:${PORT:-8080}
  --timeout 120`. Correctly uses Railway's injected `$PORT` with an `:-8080` fallback.
- `app/main.py:79-101` — two health surfaces: `GET /` (static "online" JSON, no DB dependency) and
  `GET|HEAD /health` (does `prisma_client.execute_raw("SELECT 1")`, returns 503 on failure — this
  is what `railway.json` points `healthcheckPath` at, so a real DB outage exactly at deploy time
  would fail the deploy, per §2's finding above).
- `app/main.py:35,41-43,55` — `_is_production = settings.ENVIRONMENT == "production"` gates: hiding
  `/docs`/`/redoc`/`/openapi.json`, and restricting CORS to `settings.CORS_ORIGINS` (else `["*"]`
  in dev). **Single flag, both protections** — matches `PRODUCTION_CONTRACT.md`'s already-documented
  P0 finding from 2026-08-24, re-confirmed today, not new.
- `app/core/config.py:102-106` — a real **startup crash guard**: if `ENVIRONMENT=="production"` and
  `SECRET_KEY`/`WHATSAPP_VERIFY_TOKEN` are still their insecure defaults, `Settings()` raises
  `ValueError` at import time → the app will not boot at all. This is a genuine safety net (a
  misconfigured production deploy fails loudly, not silently insecure) but also a real deploy-time
  risk if those two vars aren't actually set — the container would crash-loop, and the restart
  policy (10 retries, ON_FAILURE) would not save it since the failure is deterministic, not
  transient.
- `app/db/client.py:36-64` — startup DB connect has its own retry logic independent of Railway's
  restart policy: up to 3 attempts, 2s/4s backoff, only for a known transient-error set
  (`P1001/P1002/P1008/P1017` or `EngineConnectionError`). A non-transient error, or the 3rd
  transient failure, raises immediately — the container exits, Railway's restart policy takes over
  from there.
- `app/db/client.py:11-17` — `DATABASE_URL` gets `connection_limit=10&pool_timeout=30` appended if
  not already present. Memory (`feedback_migration_staging_discipline` era finding, 2026-07-12) once
  found a real prior incident where a *local* `.env` had `connection_limit=1` hardcoded and caused
  intermittent P1001s — worth checking Railway's own `DATABASE_URL` doesn't repeat that pattern
  (this appending logic only fires when `connection_limit` is *absent*, so an explicitly-set `=1`
  on Railway would silently override this safe default the same way it did locally).

### 3.2 Frontend service — Railway config

- `frontend/railway.json:1-11` — same Dockerfile builder, `restartPolicyType: ON_FAILURE` / 5
  retries. **No `healthcheckPath` set** — already a named, real gap in
  `PRODUCTION_CONTRACT.md §3` (2026-08-24), re-confirmed unchanged today: the frontend service has
  no configured healthcheck at all, so Railway can't gate a bad frontend deploy the way it does the
  backend.
- Frontend's only real env var: `VITE_API_URL` (`frontend/.env.example`, and the only
  `import.meta.env.*` reference besides the built-in `PROD` flag — confirmed via full-repo grep,
  `frontend/src/**`). Must point at the backend's real Railway domain, no trailing slash. Local dev
  deliberately leaves it empty (`frontend/.env`) and relies on `vite.config.js`'s dev-only proxy —
  irrelevant in production, since there is no Vite dev server in the built/served app.

### 3.3 Full environment-variable inventory (backend) — every real read site, not assumed

| Variable | Where read | Required? | Effect if missing/wrong |
|---|---|---|---|
| `DATABASE_URL` | `app/core/config.py:15` (no default — Pydantic required field), `app/db/client.py:13` | **Hard-required** | App fails to construct `Settings()` at import → immediate crash |
| `DIRECT_URL` | `app/core/config.py:16` (no default) | **Hard-required** | Same — crash at import |
| `ENVIRONMENT` | `app/core/config.py:22` (default `"development"`) | **Effectively required for prod** | If unset/wrong: CORS wide open (`["*"]`), `/docs` exposed, and the two startup guards (SECRET_KEY/WHATSAPP_VERIFY_TOKEN) never fire — silent security gap, not a crash |
| `SECRET_KEY` | `config.py:26` (default = known-insecure placeholder) | Required once `ENVIRONMENT=production` | If still the default AND `ENVIRONMENT=production` → `ValueError` at import, app won't boot |
| `WHATSAPP_VERIFY_TOKEN` | `config.py:71` (default = known-insecure placeholder) | Same shape as `SECRET_KEY` | Same — boot-blocking if still default in production |
| `FRONTEND_URL` | `config.py:33`, also read independently via bare `os.getenv()` in `registration_service.py:209` (default `"https://salmansaas.com"`) and `demo_service.py:364` (default `"https://demo.salmansaas.com"`) | No hard default via `Settings`, but 2 services have their own independent fallback defaults | If unset: CORS still has 4 hardcoded safety-baseline origins (`config.py:44-48`) so CORS doesn't fully break; but registration/demo links would silently use their own hardcoded fallback domains instead of the real frontend URl — a real, findable bug class if the real frontend domain differs from either fallback |
| `SUPER_ADMIN_SLUG` | `config.py:64` (default `"smar"`) | Soft | No startup guard exists (named gap in `PRODUCTION_CONTRACT.md`, still open) — low risk, defaults correctly for this project |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID` | `config.py:72-74`, consumed in `app/services/whatsapp_service.py:14-15` | No default | Outbound WhatsApp sends silently no-op (proven safe-degradation pattern, same as Phase A-E's local testing) |
| `WHATSAPP_CENTRAL_NUMBER` | `config.py:80`, `whatsapp_service.py:95-101` | No default | `get_...` returns `None` — wa.me deep links just don't render, no crash |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (or `SUPABASE_KEY`) | Read via **bare `os.getenv()`**, not through `Settings` — `public_service.py:12-13`, `storage_service.py:14-15`, `registration_service.py:62-63` | No default | Image/video uploads and public catalog image resolution fail silently or return broken URLs — not on the critical booking-flow path per se, but real for any tenant with photos |
| `ANTHROPIC_API_KEY` | `config.py:67` | No default | AI settings agent feature degrades, not critical path |
| `ONBOARDING_SECRET` | `config.py:68` | No default | Self-service onboarding webhook auth check fails closed if unset (needs confirming against `onboarding.py`, not done this pass — named as an Unknown) |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | `app/services/email_service.py:12-13` (bare `os.getenv`) | No default (module logs a warning and sets `_client = None` if missing) | Booking confirmation emails silently don't send — confirmed safe-degradation, not a crash |
| `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` | `app/services/sheets_service.py:22,56` (bare `os.getenv`) | No default | CRM sheet-sync silently skipped (`_get_service()` returns `None`, logged as a warning) — **not documented in `PRODUCTION_CONTRACT.md`, a real gap in that earlier Contract's own inventory**, flagged as a Side Finding below |
| `SAMSARA_WEBHOOK_SECRET`, `SAMSARA_API_TOKEN`, `SAMSARA_DEFAULT_SLUG` | `app/adapters/samsara_adapter.py:23-24`, `app/api/v1/webhooks/samsara.py:50` (all bare `os.getenv`, empty-string defaults) | No default | A whole **"Fleet — Samsara Webhook"** feature is mounted unconditionally in `app/main.py:25,76` — unrelated to booking/restaurant/store, reads its own webhook secret and defaults to empty string if unset (so signature verification would just always fail closed, not crash). **Also not in `PRODUCTION_CONTRACT.md`'s original inventory** — real Side Finding, see below. |
| `HIGGSFIELD_API_KEY` | in `.env.example` only | Not read anywhere in `app/` (confirmed via grep — dead var, already named in `PRODUCTION_CONTRACT.md`) | N/A |
| `PORT` | Injected by Railway, consumed by Dockerfile `CMD`, not by `Settings` at all despite `config.py:23` declaring a `PORT: int = 8000` field that is **never actually read anywhere** (confirmed via grep — the field exists in the Pydantic model but nothing in `app/` references `settings.PORT`) | N/A — real but harmless dead field | None — Railway's `$PORT` env var reaches the container directly via shell expansion in the Dockerfile CMD, bypassing `Settings` entirely; the `Settings.PORT` field is vestigial |

### 3.4 WhatsApp webhook — exact path (matches PRODUCTION_CONTRACT.md, re-verified against real code)

- `app/api/v1/webhook.py:20-36` — `GET /whatsapp` echoes `hub.challenge` as an integer if
  `hub.verify_token == settings.WHATSAPP_VERIFY_TOKEN`, else 403.
- `app/api/v1/webhook.py:38-58` — `POST /whatsapp` returns 200 immediately, dispatches real
  processing to a `BackgroundTasks` job (`handle_incoming_message`) — correct per Meta's 20s
  response-time requirement, already proven in Phase C/E locally.
- Mounted at `/api/v1/webhook` (`app/main.py:68`) → **full production path**:
  `https://<backend-domain>/api/v1/webhook/whatsapp`. Unchanged from `PRODUCTION_CONTRACT.md §5`.

### 3.5 Resend / email — no new findings beyond §3.3's table; safe-degradation confirmed by reading
the actual module (not assumed): `email_service.py:16-21` wraps the `resend` import itself in
`try/except ImportError`, and separately checks `_API_KEY` truthiness — a completely missing
`RESEND_API_KEY` degrades to a logged warning, never a crash, at both import time and call time.

### 3.6 Import-time crash-safety check (all `os.getenv()`-based optional integrations)

Explicitly checked whether *any* module besides `config.py`'s two hard-required DB vars can crash
the app at import time if unconfigured — this matters because a single bad optional integration
could, in theory, take down the whole app before FastAPI even starts. Confirmed clean:
`email_service.py`, `sheets_service.py`, `samsara_adapter.py`/`webhooks/samsara.py` — all either
default to empty string, wrap risky calls in `try/except`, or check truthiness before use, per the
citations in §3.3. **Only `DATABASE_URL`/`DIRECT_URL` (via bare Pydantic required fields) and the
two production-guard vars (`SECRET_KEY`/`WHATSAPP_VERIFY_TOKEN`, only when `ENVIRONMENT=production`)
can actually prevent the app from booting.**

### 3.7 Deploy mechanism this project already uses

- `.claude/commands/deploy.md` — `/deploy` = `git add -A && git commit && git push origin main`,
  relies on Railway's own GitHub-push auto-deploy (not the Railway CLI — confirmed again this
  session, `which railway` → not found, no `~/.railway/config.json`, matching
  `PRODUCTION_CONTRACT.md`'s same finding from 2026-08-24, still true today).
- `.claude/commands/audit.md` (`/audit --pre-deploy`) — a **grep-based** pre-deploy scan (plain-text
  password patterns, missing-`clientId` queries, `.env` tracked-by-git check, race-condition
  presence in `create_public_booking`, Routes-purity, `@@index([clientId])` presence). This is a
  **code-hygiene gate, not a Railway-readiness gate** — it does not check any of Objectives 1-7
  above. Worth being explicit about: running `/audit --pre-deploy` clean is a different, narrower
  claim than "Railway production-ready."

### 3.8 Canonical production URL — genuinely unresolved from the repo alone

Per Salman's own explicit instruction not to assume `FRONTEND_URL`'s current value
(`https://smar.salmansaas.com`) is correct. What the repo actually shows:
- `CLAUDE.md:30` (2026-07-18): **"the manual Cloudflare DNS binding for `demo.salmansaas.com` is
  pending, so live resolution may vary"** — i.e., even the project's own canonical demo domain was,
  as of that note, not confirmed live at the DNS level. No later note in this repo confirms it was
  completed.
- `config.py:45-48` hardcodes 4 safety-baseline production origins:
  `salmansaas.com`, `www.salmansaas.com`, `smar.salmansaas.com`, `demo.salmansaas.com` — this is
  the platform's intended domain family, not proof any one of them is what the *Alzabt marketing
  homepage* (`/`, `ProductShowcaseHome.jsx`) or the *booking-flow frontend* should canonically live
  at in production today.
- **This cannot be resolved by reading code — it requires either Salman confirming the real bound
  domain(s) in Railway's dashboard, or Railway's own auto-generated `*.up.railway.app` domain being
  treated as the real value until a custom domain is confirmed live.** Flagged as a Gap, not
  guessed.

---

## 4. Current Railway State (as reported this session — NOT independently verified, no Railway
access exists in this environment)

- Salman reported (screenshot, prior session) `ENVIRONMENT=production` appears set on the backend
  service's Variables tab.
- Salman reported, this session, that the same screenshot/dashboard view showed **"Service is
  offline."**
- No Railway CLI, no `~/.railway/config.json`, confirmed absent in this environment (re-checked
  today) — every claim about the live Railway state must come from Salman directly (screenshot,
  dashboard read, or CLI output he runs and pastes back) — this session cannot query Railway's API
  or dashboard itself.
- **Given §2's finding that Railway healthchecks only gate NEW deploys** (not continuous
  monitoring), "Service is offline" is more consistent with either (a) the backend never
  successfully completed a first healthy deployment (most likely, given a fresh setup), or (b) the
  service crashed post-deploy and either has no restart budget left or is crash-looping on a
  deterministic failure (e.g. the `SECRET_KEY`/`WHATSAPP_VERIFY_TOKEN` production guard from §3.1,
  if either is still its insecure default while `ENVIRONMENT=production` is set) — both are
  plausible from the code alone; distinguishing them requires reading the actual Railway deploy
  logs, which only Salman can pull right now.

---

## 5. Gap List (Confirmed, from this audit — not yet fixed, not yet acted on)

| # | Gap | Source | Severity |
|---|---|---|---|
| G1 | Real live/offline status of the backend service is unconfirmed beyond Salman's own screenshot description; deploy logs never read | §4 | Blocks Objective 5 |
| G2 | Canonical production `FRONTEND_URL` value is not derivable from the repo — `demo.salmansaas.com`'s DNS binding was last noted as *pending*, not confirmed live | §3.8 | Blocks Objective 1/2 correctly setting `FRONTEND_URL` |
| G3 | Whether Railway's `DATABASE_URL`/`DIRECT_URL` point at the same Supabase project this whole Phase A-E track tested against is still unconfirmed (same open question `PRODUCTION_CONTRACT.md §4` raised 2026-08-24, still open today) | §3.1, `PRODUCTION_CONTRACT.md §4` | Blocks Objective 4 — **hard stop before any migration** |
| G4 | Frontend service has no `healthcheckPath` configured at all (`frontend/railway.json`) | §3.2 | Real, low-urgency — Railway can't gate a bad frontend deploy the way it does backend |
| G5 | `SECRET_KEY`/`WHATSAPP_VERIFY_TOKEN` real values on Railway are unconfirmed — if either is still the insecure default while `ENVIRONMENT=production`, the app **will not boot at all** (deterministic `ValueError` at import) | §3.1, §3.3 | Directly explains a possible cause of G1's "offline" state |
| G6 | `GOOGLE_SHEET_ID`/`GOOGLE_SERVICE_ACCOUNT_JSON` (CRM sync) and `SAMSARA_*` (unrelated Fleet webhook feature) were never inventoried in the 2026-08-24 `PRODUCTION_CONTRACT.md` — both degrade safely if unset, but their existence as live, unconditionally-mounted surface area on the same backend service was previously undocumented | §3.3 (Side Finding) | Low — informational, not blocking |
| G7 | `Settings.PORT` field is dead/unused (Railway's real `$PORT` bypasses it via the Dockerfile shell) — cosmetic, not a functional gap, but worth knowing so nobody "fixes" it by setting a `PORT` Railway variable expecting it to matter | §3.3 | None — informational only |
| G8 | Whether `ONBOARDING_SECRET`'s absence fails open or closed was not verified this pass (not read `app/api/v1/onboarding.py`'s actual check) | §3.3 | Unknown — needs one more read before Objective 3 can call it closed |

---

## 5b. Gap Status — 2026-08-29 update (Step 4, "Production Hardening & Release Readiness")

Re-checked against real evidence accumulated since this audit, per Salman's explicit instruction
not to re-run a fresh audit — closing what's derivable from the repo/real usage, flagging only
what genuinely still needs Salman's own Railway-dashboard access.

| # | Status | Evidence |
|---|---|---|
| G1 | **Closed** | Extensively confirmed live this session and 2026-08-28: real login, real dashboard CRUD, real reservation create/cancel, all with real HTTP 200/201s. |
| G2 | **Closed** | §N resolved it — `alzabt.salmansaas.com/{slug}` is canonical, confirmed live. |
| G3 | **Closed** | Real cross-check, not assumed: local `.env`'s `DATABASE_URL` targets Supabase project `wefjghagwpkotrrdiqyi` — the exact same project ref the live frontend serves assets from (`wefjghagwpkotrrdiqyi.supabase.co/storage/...`, confirmed via real network request 2026-08-29). Independently, a reservation created via the real live browser flow was immediately readable via this same local connection, and a cancellation done via the live browser was immediately visible the same way — this local `DATABASE_URL` and Railway's production app are provably the same database, not a lookalike. |
| G4 | **Closed** | `frontend/railway.json` had no `healthcheckPath` at all — added `"/"` (nginx's real SPA fallback target, confirmed via `nginx.conf.template`), matching the backend's own `healthcheckPath: "/health"` pattern. Zero-risk config addition, no Railway access needed. |
| G5 | **`SECRET_KEY` confirmed real by Salman 2026-08-29.** `WHATSAPP_VERIFY_TOKEN` (webhook handshake secret — arbitrary string, does not expire) presumed fine, not separately confirmed. **Split into a new, more severe finding — G5b below.** |
| G5b | **PENDING — explicitly non-blocking, Salman's decision 2026-08-29.** `WHATSAPP_ACCESS_TOKEN` (the Meta Graph API send token, distinct from `WHATSAPP_VERIFY_TOKEN`) is a short-lived test token that expired 3 days after issue. Confirmed in code: `whatsapp_service.py:15,26` uses `settings.WHATSAPP_ACCESS_TOKEN` as the `Authorization: Bearer` header for every real outbound `graph.facebook.com` call; `whatsapp_notifications.py`'s confirmation/cancellation/reschedule sends all run as fire-and-forget `asyncio.create_task()` from `reservation_service.py`'s own mutation functions, so a failure there is silent — never surfaced in the reservation's own HTTP response. Practical implication: real reservations are being created successfully, but the WhatsApp confirmation message itself has almost certainly been failing quietly since the token expired. **A permanent Meta System User access token is pending Meta verification — Salman's own action, outside this session's access.** Explicitly **does not block** ongoing production-readiness or UI work. **Closing action, once available**: one real WhatsApp delivery test, close G5b with real evidence at that point — not before. |
| G6, G7 | Unchanged — informational only, no action. |
| G8 | **New real finding, not previously flagged as a security issue**: `app/api/v1/onboarding.py:46-50`'s `_verify_secret()` **fails open** — `if not expected: return` — if `ONBOARDING_SECRET` is unset on Railway, `/api/v1/webhook/onboarding/process` accepts unauthenticated tenant-creation webhooks from anyone who can guess the payload shape. Same class of finding as the Hard/Soft-Block bypass fixed 2026-08-28 (`9153d77`). **Salman's decision 2026-08-29**: defer — this is independent of the n8n scope decision (n8n itself is now out of the plan), but the fix waits for the dedicated n8n-references cleanup pass rather than a standalone patch now. Recorded as a known, accepted-for-now open item, not fixed. |

---

## 6. Proposed Execution Order (for approval before any action)

1. **Close G1 + G5 together** — ask Salman to open Railway → Backend service → **Deployments tab
   → latest deployment → build + deploy logs**, paste back (or describe) what's actually there.
   This single artifact likely resolves both at once: a crash-loop from G5 shows a specific
   `ValueError` line in the logs; a never-succeeded first deploy shows a different signature
   entirely (build failure, or healthcheck timeout in the first 30s per §2's tighter-than-default
   config).
2. **Close G2** — ask Salman what the actual, current, intended production frontend URL is (the
   Railway-assigned `*.up.railway.app` domain if no custom domain is live yet, or the real custom
   domain if DNS was completed since the 2026-07-18 note). Do not set `FRONTEND_URL` to a guess.
3. **Close G3** — ask Salman to confirm, from the Railway dashboard's Variables tab (values not
   pasted into chat — per this session's own "no secret values in the report" rule), whether the
   `DATABASE_URL`/`DIRECT_URL` host matches the same Supabase project this whole session's local
   testing used (`aws-1-ap-southeast-2.pooler.supabase.com`, per `PRODUCTION_CONTRACT.md §4`) — a
   host match is enough, full connection strings never need to be shared.
4. Only after 1-3 are closed: do the full Environment Audit table (Objective 1/2/3, this file's §3.3
   already gives the "what's required" half — the remaining half is literally reading Railway's
   current Variables tab against it, which requires Salman's access, not mine).
5. Then Objective 4 (Database Identity) gets its final proof, Objective 5 (Deployment Health) gets
   re-verified against a real `/health` and `/docs` check once a deploy is actually live.
6. Objective 6 (WhatsApp + Resend) — confirm real values are set, verify the Meta webhook
   verification handshake per `PRODUCTION_CONTRACT.md §5/§6`.
7. Objective 7 (Smoke Test) — only after 1-6, using the exact 9-row sequence already specified in
   `PRODUCTION_CONTRACT.md §6` (still valid, re-confirmed unchanged this session).
8. Objective 8 — fold this file + the smoke test's own evidence into the final **Railway Production
   Readiness Report** (the 15-section template Salman specified), superseding
   `RAILWAY_RESUME_CHECKLIST.md`/`PRODUCTION_CONTRACT.md` as the live reference (those two files
   stay as-is, historical — this new report is additive, not a rewrite, per this project's
   documentation-immutability convention).

---

## Side Findings

- `GOOGLE_SHEET_ID`/`GOOGLE_SERVICE_ACCOUNT_JSON`/`SAMSARA_*` — real, live, unconditionally-mounted
  surface area on the backend service that predates this Phase F track and was never captured in
  `PRODUCTION_CONTRACT.md`'s original inventory. Not blocking, but the Environment Audit table in
  the next step should include them for completeness now that they're known.
- `Settings.PORT` is a dead field — see G7. Purely informational.

## Unknowns

- G1 (real deploy/logs state), G2 (real intended production URL), G3 (DB identity match), G5 (real
  `SECRET_KEY`/`WHATSAPP_VERIFY_TOKEN` values on Railway), G8 (`ONBOARDING_SECRET` fail-open/closed
  behavior) — all listed explicitly in §5, none silently assumed either way.
