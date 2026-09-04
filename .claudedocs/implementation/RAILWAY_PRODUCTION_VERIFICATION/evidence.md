# Railway Production Environment Verification (Priority 5)

Follows: `investigation-protocol.md` evidence discipline. Trigger: Salman's explicit "Production
Readiness Final Sweep — Priority 5" instruction (2026-08-31). **No secret values appear anywhere in
this document.** No application code was changed, no commit, no push, no Railway variable changed,
no migration run, no production data modified.

**Method note**: no Railway CLI/dashboard access exists in this environment (re-confirmed fresh
this pass — `which railway` empty, no `~/.railway`, no Railway env vars — same result every prior
session that checked). Unlike those prior sessions, this pass did NOT stop there — real outbound
HTTPS requests to the actual live production domains are possible from here and were used
extensively below. This is genuinely new evidence, not a re-statement of "no access."

---

## 0. Prior documents read fresh, not assumed current

- `.claudedocs/implementation/CUSTOMER_IDENTITY_PHASE_F/RAILWAY_RESUME_CHECKLIST.md` — **confirmed
  stale**: still says "Railway: NOT YET STARTED, No production changes made yet." This is
  contradicted by extensive real evidence gathered below and in prior sessions (real live
  production traffic, real bookings, real logins). **Not edited** — kept as historical record per
  the explicit instruction not to alter old conclusions to look current. Reconciled item-by-item in
  §9 below instead.
- `.claudedocs/work/railway-production-readiness/2026-08-28/audit.md` — read in full (§3.1-3.8,
  Gap List §5, 2026-08-29 status update §5b). Used as the baseline env-var inventory; not
  duplicated, only re-verified/extended where this pass found new live evidence.

---

## 1. Current Railway production status

**Real domain architecture, discovered this pass (not previously documented this precisely
anywhere in the repo):**

| Domain | What it actually is | Evidence |
|---|---|---|
| `dashboard.salmansaas.com` | **The real backend API** (FastAPI on Railway, behind Cloudflare) | `/health` → real JSON `{"status":"ok","db":"ok",...}`; `/docs` → real FastAPI 404 JSON (not SPA HTML); response headers show `x-railway-edge`, `x-railway-request-id`, `server: cloudflare` |
| `alzabt.salmansaas.com` | A **frontend** static deployment | Every path tested (`/health`, `/api/v1/public/rk/config`, `/docs`) returns the **same SPA `index.html`** — a client-side catch-all, not real backend routing |
| `demo.salmansaas.com` | A **second frontend** static deployment | Same SPA-fallback behavior confirmed on `/docs` |

**This matters**: my own initial pass on this exact investigation briefly mis-read
`alzabt.salmansaas.com`'s 200-on-everything as "backend healthy" — caught and corrected within the
same pass by checking response *bodies*, not just status codes (this is exactly the class of
mistake `browser-verification-protocol.md` warns about — "200 status codes do not mean the app
rendered [the intended thing]"). Corrected before writing anything down as a finding.

**Real, live evidence, `dashboard.salmansaas.com` (the actual backend):**
```
GET /health  → 200  {"status":"ok","db":"ok","timestamp":"2026-08-31T17:05:30.935119+00:00"}
GET /        → 200  {"status":"online","service":"Chalet & Hotel Booking SaaS","version":"2.0.0","docs":"/docs"}
GET /docs    → 404  {"success":false,"error":{"code":"NOT_FOUND","message":"Not Found","details":[]}}
GET /api/v1/public/rk/config → 200, real RK Barber Shop data (name, colors, WhatsApp number, hero content)
```

**Deployment status: live and healthy.** Real-time timestamp matches the actual current
date/time, DB connectivity confirmed (`"db":"ok"`), real tenant data served correctly.

**Crash/restart symptoms**: none observed — zero failures across ~9 real requests made during this
pass (including repeated hits to `/health`). Railway's own deploy/restart history (the dashboard's
own log view) is not accessible from here, so "no restarts ever" cannot be claimed — only "no
instability observed in this pass's own traffic."

**Deployed commit/version — not observable via any exposed endpoint.** `/` reports
`"version":"2.0.0"` — a **different value than `app/core/config.py`'s own `VERSION: str =
"1.0.0"` field** (informational inconsistency, not investigated further — likely a separately
hardcoded string in `main.py`'s root route, not derived from `settings.VERSION`; not blocking).
No git SHA, build timestamp, or other commit-identifying data is exposed anywhere reachable.
**What IS certain, from git state directly (§8) rather than guessing at a live version string**:
production cannot contain any of this session's uncommitted/unpushed work.

## 2. Production environment verification matrix

Per Salman's explicit instruction: presence/absence and consistency only, **no values printed**,
nothing rotated or changed.

| Variable | Required? | Verifiable this pass? | Result | How |
|---|---|---|---|---|
| `ENVIRONMENT` | Effectively required (gates prod guards) | **Yes — confirmed live** | **`production`** | Two independent live signals agree: `/docs` returns a real 404 (only happens when `docs_url=None`, which only fires `if _is_production`, `main.py:35,41`); CORS correctly rejects an unlisted origin (§7) — only happens `if settings.is_production()`, `config.py:55`. Previously "Unknown" in the 2026-08-28 audit and the Resume Checklist's own unchecked STEP 1 — **now VERIFIED**, independent of Railway dashboard access. |
| `SECRET_KEY` | Required in prod | Not independently re-verified this pass | Presumed present (app boots, confirmed by `/health`) | Already confirmed real by Salman 2026-08-29 (prior audit's G5); re-derivable here too — if it were still the insecure default, `Settings()` would raise `ValueError` at import and the app wouldn't be serving `/health` at all |
| `WHATSAPP_VERIFY_TOKEN` | Required in prod | Not verifiable without the real value (out of scope to test with a guess) | Reported present/correct by Salman | Same boot-guard logic as `SECRET_KEY` — its presence (some non-default value) is implied by the app booting at all, but its *correctness* for Meta's own handshake can't be confirmed without either the real value or a real Meta verification attempt, neither available here |
| `WHATSAPP_APP_SECRET` | Reported configured by Salman | **Not verifiable this pass** | Reported present, not independently confirmed | The currently-deployed code (§8) predates this variable entirely — it isn't read by any code that's actually live in production yet, so no live behavior can confirm or deny its presence. Will become independently testable only after the signature-verification fix (Priority 1) is deployed. |
| `WHATSAPP_ACCESS_TOKEN` | Not yet configured (Salman's own statement — pending System User token) | **Not verifiable this pass**, and not expected to be | Expected absent | Same reasoning — no safe live test exists without a real WhatsApp send, and Salman has already confirmed this one is intentionally not set yet |
| `RESEND_API_KEY` | Reported configured (verified domain) by Salman | Independently re-tested **locally only** (Priority 4 re-test, same session) — succeeded | Reported present; local re-test succeeded, Railway's own value not directly observed | See Priority 4's evidence — real send succeeded against the verified domain using the local `.env` key. Whether Railway's deployed key is byte-identical to local's is not derivable from here; a real registration-flow smoke test against production itself is the only way to close that specific gap, not attempted this pass (would create a real tenant — out of scope, "do not create test tenants/users/data unless explicitly necessary") |
| `RESEND_FROM_EMAIL` | Reported configured by Salman | Not independently verifiable | Reported present | Same reasoning as above |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | Required for uploads/storage | **Yes — strong existing evidence, not re-tested** | Present and correctly configured | Cited, not re-run: `FILE_UPLOAD_AUDIT/evidence.md` (2026-08-30) performed real image uploads against live production Supabase Storage and verified them — this is only possible if these variables are correctly set on Railway. Re-testing was judged unnecessary (avoids creating new test uploads for a fact already evidenced) |
| `DATABASE_URL` | Hard-required | **Yes — confirmed live, this pass** | Present, healthy | `/health`'s `"db":"ok"` is a real, current, live database round-trip — cannot be faked by a stale cache |
| `DIRECT_URL` | Hard-required (Prisma migrations only) | **Not verifiable without a migration** | Unknown | Never exercised by any runtime API call — the prior audit's own G3 finding (DB identity confirmed via `DATABASE_URL`'s real read/write behavior) doesn't independently exercise `DIRECT_URL`; testing it means running a migration, explicitly forbidden this pass |
| `FRONTEND_URL` | Soft (CORS baseline fallback exists) | **Yes — confirmed live** | Present and correct | CORS correctly allows `https://alzabt.salmansaas.com` (§7) — consistent with the already-closed G2 finding (canonical domain resolved 2026-08-29) |

## 3. What is verified (real, live evidence, this pass)

- Production backend (`dashboard.salmansaas.com`) is live, healthy, serving real data, DB
  connectivity confirmed.
- `ENVIRONMENT=production` is genuinely active (two independent live signals, not assumed).
- `/docs`/`/redoc`/`/openapi.json` are correctly hidden on the real backend (RAILWAY_RESUME_CHECKLIST
  STEP 3's own checkbox — now genuinely checkable, and it PASSES).
- CORS is correctly restrictive in production (rejects an unlisted origin, allows the real frontend
  origin) — the other half of STEP 3.
- `DATABASE_URL` is present and the database is reachable and healthy, live, right now.
- Supabase Storage credentials are correctly configured (via existing, cited real-upload evidence,
  not re-tested).
- The two frontend deployments (`alzabt.salmansaas.com` trial-tier, `demo.salmansaas.com` — wait,
  reversed per routing.md's own convention: `demo.` = trial, `alzabt.` = subscribed) are both live
  and serving the built SPA correctly.
- Production currently contains **none** of this session's uncommitted/unpushed work (§8) — a
  certain, git-evidence-based conclusion, not a guess.

## 4. What remains unknown

- `DIRECT_URL`'s real correctness (untestable without a migration, out of scope).
- `WHATSAPP_VERIFY_TOKEN`'s exact value's correctness for Meta's own handshake (its mere presence is
  implied by the app booting, but that's as far as this pass can go without either the real value or
  a real Meta-initiated verification attempt).
- Whether Railway's deployed `RESEND_API_KEY`/`RESEND_FROM_EMAIL` are identical to what was
  successfully re-tested locally in Priority 4 — a real production registration smoke test would
  close this, not attempted here (creates real data, judged unnecessary right now).
- Railway's actual deploy/restart history (dashboard-only visibility, not reachable from here).
- The deployed commit SHA/tag (no endpoint exposes it) — though its *practical* content is fully
  determined regardless, via §8's git-based reasoning.

## 5. What is blocked specifically by `WHATSAPP_ACCESS_TOKEN`

**Nothing about the webhook itself.** Confirmed independently, twice now (once in the earlier
WhatsApp Cloud API Finalization check, again by re-reading the code fresh this pass): `GET
/whatsapp` (Meta's verification challenge) and `POST /whatsapp`'s signature verification both read
only `WHATSAPP_VERIFY_TOKEN`/`WHATSAPP_APP_SECRET` — never `WHATSAPP_ACCESS_TOKEN`. Once Priority
1's fix is committed, pushed, and deployed, the webhook can be fully verified end-to-end
(Meta's dashboard verification step included) **without** `WHATSAPP_ACCESS_TOKEN` being present at
all.

**What genuinely needs it**: only *outbound* sends — `whatsapp_service.py`'s `_send_request()`,
used for every real message the platform sends TO a customer (booking confirmations, WhatsApp bot
replies, cancellation/reschedule notices). Until it's added, **inbound** webhook processing can
work fully, but the bot cannot reply to anything — confirmed by existing code behavior
(`_send_request()` logs a warning and returns `None` when the token/phone_number_id is missing,
never crashes, matches the same safe-degradation pattern already used throughout this codebase).

## 6. Genuine production blocker found

**None found that requires stopping and reporting as a new defect.** Everything checked in this
pass that was independently verifiable came back healthy/correct. The two real, already-known gaps
(`WHATSAPP_ACCESS_TOKEN` pending Salman's new number; `ONBOARDING_SECRET`'s fail-open behavior, G8,
already deferred 2026-08-29) are pre-existing, already-tracked items, not new findings from this
pass.

## 7. CORS — live evidence

```
Origin: https://evil-example.com  → no access-control-allow-origin header returned (browser blocks it)
Origin: https://alzabt.salmansaas.com → access-control-allow-origin: https://alzabt.salmansaas.com (correctly echoed)
```
Confirms `settings.CORS_ORIGINS` (the restrictive, allowlisted set) is active — not the
development-mode `["*"]` fallback, which only activates `if not settings.is_production()`.

---

## 8. Deployment/config consistency — working tree vs. committed vs. deployed

Three genuinely distinct states, kept separate per the explicit instruction not to assume any of
them are equivalent:

| State | Contents |
|---|---|
| **(a) Working tree** (uncommitted) | Priority 1's WhatsApp signature fix (`webhook.py`, `config.py`, `.env.example`) + Priority 3's Units CREATE fix (`admin/units.py`) — confirmed via `git status`, unchanged since last reported |
| **(b) Committed, local only** | `671ea99` "Unified tenant header integration" — `git log` shows it as the current `HEAD`; `git log origin/main -1` shows `origin/main` is still at `bd787b6` (2026-08-30, the Bilingual Audit doc commit) — **`671ea99` has never been pushed** |
| **(c) Deployed to production** | Whatever Railway last auto-deployed from `origin/main` — since `origin/main` itself has not moved past `bd787b6`, production contains **at most** `bd787b6`'s code, and certainly nothing from (a) or (b) |

**Conclusion, certain not inferred**: production currently has **none** of — the Unified Tenant
Header work, the WhatsApp webhook signature fix, or the Units CREATE fix. This isn't a live-probed
guess; it follows directly from Railway's own documented deploy mechanism (git-push-triggered
auto-deploy, confirmed in the 2026-08-28 audit's §3.7) applied to real, current `git log`/`git
status` output.

## 9. Railway Resume Checklist — reconciled against real evidence, item by item

Per `CUSTOMER_IDENTITY_PHASE_F/RAILWAY_RESUME_CHECKLIST.md` (kept unedited — reconciled here, not
overwritten there):

| Item | Checklist status | Real status now | Classification |
|---|---|---|---|
| Header: "Railway: NOT YET STARTED" | Stated | **False** — extensive real production traffic confirmed across this and many prior sessions | **NOT APPLICABLE** — the checklist's own premise is stale |
| STEP 1: Confirm `ENVIRONMENT=production` | Unchecked | Confirmed live, this pass (§1, §2, §7) | **VERIFIED** |
| STEP 2: Confirm `DATABASE_URL` points to the same Supabase project used during Phase A-E | Unchecked | Confirmed by the 2026-08-29 audit's G3 (real reservation create/read round-trip proved same DB) — not re-derived this pass, cited | **VERIFIED** (pre-existing evidence, correctly still valid) |
| STEP 3: Deploy/start Railway | Unchecked | Long since done — see above | **VERIFIED** |
| STEP 3: Verify startup succeeds with production guards enabled | Unchecked | Confirmed this pass — `/docs` 404, CORS restrictive, both only possible with guards active and the app having booted successfully | **VERIFIED** |
| STEP 3: Verify CORS behavior | Unchecked | Confirmed this pass (§7) | **VERIFIED** |
| STEP 3: Verify `/docs` is hidden in production | Unchecked | Confirmed this pass (§1) | **VERIFIED** |
| STEP 4: Configure WhatsApp credentials | Unchecked | `WHATSAPP_APP_SECRET`/`WHATSAPP_VERIFY_TOKEN` reported configured by Salman, not independently verifiable (§2); `WHATSAPP_ACCESS_TOKEN` confirmed still pending | **BLOCKED** (on `WHATSAPP_ACCESS_TOKEN` + code not yet deployed) |
| STEP 4: Verify webhook URL | Unchecked | Path confirmed from code (`/api/v1/webhook/whatsapp`); real domain is `dashboard.salmansaas.com` per this pass's own discovery (§1) — this specific fact was never confirmed before this session | **VERIFIED** (the domain question from the earlier Finalization check is now answered) |
| STEP 4: Verify `WHATSAPP_VERIFY_TOKEN` | Unchecked | Presence implied by app booting; correctness for Meta's own handshake not testable without a real Meta verification attempt or the real value | **NOT VERIFIED** |
| STEP 4: Do not start Stage 2 / per-tenant WABA work | Unchecked (a constraint, not a fact to verify) | Confirmed still true — no per-tenant WABA code exists anywhere (already established this session, Central WABA architecture) | **VERIFIED** (constraint upheld) |
| STEP 5: Production smoke test (full list — inbound WhatsApp message through double-booking protection) | Unchecked | **BLOCKED** — requires `WHATSAPP_ACCESS_TOKEN` (for the bot to reply) and, more fundamentally, the webhook signature fix isn't deployed yet at all (§8) | **BLOCKED** |

---

## 10. Recommended next action

1. **No code, commit, or Railway action needed right now to close this priority** — Priority 5's own
   scope (verification) is complete.
2. When Salman is ready to deploy Priority 1 (WhatsApp signature) + Priority 3 (Units fix): commit
   both (already approved individually), push, let Railway auto-deploy, then the webhook's
   `WHATSAPP_APP_SECRET` behavior becomes independently live-testable for the first time.
3. `WHATSAPP_ACCESS_TOKEN` remains parked on Salman's own new-number step, as already agreed —
   nothing here changes that.
4. Optional, low-priority, whenever convenient: a real registration-flow smoke test against
   production itself would close the one remaining Resend uncertainty (local key re-tested
   successfully; Railway's own key not independently confirmed) — not urgent, not blocking.

## Status

**Priority 5 is CLOSED — verification complete.** No genuine new production blocker found. The
Railway Resume Checklist's real open items are now down to exactly two: `WHATSAPP_VERIFY_TOKEN`'s
correctness (untestable without Meta's own handshake) and the full production smoke test (blocked
on the still-undeployed webhook fix + the pending access token) — both already known, both already
tracked, neither new.
