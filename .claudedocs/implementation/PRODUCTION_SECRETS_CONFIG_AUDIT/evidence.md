# Secrets / Configuration Security Check — Evidence

Follows: `investigation-protocol.md` evidence discipline. Trigger: Salman's explicit "Production
Readiness Final Sweep — Priority 2" instruction (2026-08-31), the deploy-gate for Priority 1
(`WHATSAPP_WEBHOOK_SIGNATURE_FIX/evidence.md`).

**No code was changed in this pass** — investigation and cross-reference only, per the task's
explicit stop condition. **No secret values appear anywhere in this document** — only variable
names, code locations, and known-state classifications (present / absent / unknown / configured in
code / documented but not configured), per Salman's explicit instruction.

**Authoritative source, not duplicated**: a real, evidence-based full env-var inventory already
exists — `.claudedocs/work/railway-production-readiness/2026-08-28/audit.md` §3.3 (inventory) and
§5/§5b (Gap List G1–G8, with a 2026-08-29 status update). This document cross-references that one
rather than recreating it, and adds only what's genuinely new since: `WHATSAPP_APP_SECRET`
(introduced this session, Priority 1) and 2 new side-findings (below).

---

## Production configuration matrix

| Variable | Required? | Runtime area | Client-safe? | Current known state | Action required |
|---|---|---|---|---|---|
| `DATABASE_URL` | Hard-required | DB (Prisma runtime) | No | Present — G3 closed 2026-08-29, confirmed via live reservation create/read against the real production DB | None |
| `DIRECT_URL` | Hard-required | DB (Prisma migrations only) | No | Unknown — same connection family as `DATABASE_URL`, but never independently exercised (no migration run against production this session) | Confirm before the next real migration, not urgent otherwise |
| `ENVIRONMENT` | Effectively required (gates 2 startup guards + CORS/`/docs` exposure) | App-wide | No | Unknown — `RAILWAY_RESUME_CHECKLIST.md` STEP 1 ("Confirm `ENVIRONMENT=production`") is still an unchecked item | Confirm on Railway dashboard |
| `SECRET_KEY` | Required once `ENVIRONMENT=production` (else `ValueError` at boot) | Auth/JWT | No | Present — confirmed real by Salman 2026-08-29 (G5) | None |
| `WHATSAPP_VERIFY_TOKEN` | Required once `ENVIRONMENT=production` (else `ValueError` at boot) | WhatsApp GET challenge | No | Unknown — "presumed fine," never separately confirmed (G5's own wording) | Confirm on Railway dashboard |
| `WHATSAPP_ACCESS_TOKEN` | Optional (safe no-op degrade) | WhatsApp outbound sends | No | Present but expired (G5b) — confirmed in code (`whatsapp_service.py:15,26`) that a 3-day test token was issued and has since expired | Non-blocking, explicitly deferred (Salman's 2026-08-29 decision) — needs a permanent Meta System User token, pending Meta verification, outside this session's access |
| `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID` | Optional | WhatsApp outbound sends | No | Unknown — not independently re-verified this session | Low priority — outbound sends already covered by the `WHATSAPP_ACCESS_TOKEN` gap above |
| `WHATSAPP_CENTRAL_NUMBER` | Optional (safe no-op degrade) | WhatsApp deep links | No | Unknown — not independently re-verified this session, though real Central WABA notifications shipped 2026-08-24 per project memory (not re-confirmed here, not assumed) | Low priority |
| **`WHATSAPP_APP_SECRET`** | **Required for Priority 1's fix to protect anything in production** (app itself still boots without it — fails closed at the route level) | WhatsApp webhook signature verification | No | **Absent** — confirmed via direct grep this session: does not exist in `config.py`, `.env`, `.env.example`, or Railway (by direct implication — it was never even a concept in this codebase before this session) | **Must be added to Railway before Priority 1 is deployed** — see Deploy Dependency Check below |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (or `SUPABASE_KEY`) | Optional (silent degrade — broken image URLs, not a crash) | Storage (uploads, catalog images) | No | Present (inferred) — real tenant image uploads confirmed working against production Supabase Storage in `FILE_UPLOAD_AUDIT/evidence.md` (2026-08-30) | None — working evidence exists, just never phrased as an env-var confirmation before |
| `ONBOARDING_SECRET` | Optional in code, but **fails OPEN when absent** (G8 — real, still-open security gap) | Self-service onboarding webhook | No | Unknown | **Already known, already deferred by Salman's own 2026-08-29 decision** (waits for the n8n-references cleanup pass) — not re-opened here, just cross-referenced |
| `ANTHROPIC_API_KEY` | Optional | AI settings agent | No | Unknown | Low priority, non-critical path |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Optional (safe degrade — logged warning, no send) | Email confirmations | No | Unknown | **This is Priority 4** (Email/Resend functional verification) — intentionally not tested in this pass |
| `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` | Optional (safe degrade) | CRM sheet-sync | No | Unknown | Informational only (G6), not blocking |
| `SAMSARA_WEBHOOK_SECRET`, `SAMSARA_API_TOKEN`, `SAMSARA_DEFAULT_SLUG` | Optional (empty-string default, fails closed on signature check) | Fleet webhook (unrelated feature) | No | Unknown | Informational only (G6), not blocking |
| `HIGGSFIELD_API_KEY` | N/A | Dead — confirmed not read anywhere in `app/` (2026-08-28 audit, re-confirmed not re-grepped this pass) | No | Documented but not configured (moot either way) | None — candidate for `.env.example` cleanup someday, not a security matter |
| `SUPER_ADMIN_SLUG` | Soft (has a working default: `"smar"`) | Super admin resolution | No | Configured in code (default) | None |
| `FRONTEND_URL` | Soft (has hardcoded CORS baseline fallback) | CORS + link-building | No | Present — G2 closed, canonical `alzabt.salmansaas.com` confirmed live | None |
| `PORT` | N/A — dead field in `Settings`, Railway's real `$PORT` bypasses it via the Dockerfile `CMD` shell | — | No | N/A | None — do not "fix" by setting a Railway `PORT` var expecting it to matter (G7) |

**Frontend — separately confirmed clean**: `frontend/.env.example` has exactly 2 variables,
`VITE_PUBLIC_API_URL` and `VITE_ADMIN_API_URL` — both plain backend URLs, correctly `VITE_`-prefixed
(the only prefix Vite exposes to the browser bundle), neither is a secret. **No client-side secret
exposure risk found.**

---

## Deploy Dependency Check — `WHATSAPP_APP_SECRET`

| Question | Answer |
|---|---|
| Where does the application expect it? | `app/core/config.py:88` (`Settings.WHATSAPP_APP_SECRET`), consumed in `app/api/v1/webhook.py`'s `_verify_signature()` helper |
| Required at runtime? | Yes — checked on every `POST /api/v1/webhook/whatsapp`, not at app startup |
| What happens when absent? | `_verify_signature()` logs one `ERROR`-level line (no secret value) and returns `False` → every POST is rejected with `403 {"detail": "Invalid signature."}`. **The application itself boots and runs normally** — this is a route-level fail-closed, not a startup crash (deliberately different from `SECRET_KEY`/`WHATSAPP_VERIFY_TOKEN`'s harder startup-guard pattern, to keep the blast radius to just the webhook) |
| Is fail-closed intentional? | Yes — confirmed by design (Priority 1's own evidence.md) and by live test #6 (secret genuinely unset → POST 403, app stays up) |
| Does GET verification stay independent? | Yes — confirmed by code read (`verify_webhook()` only ever references `settings.WHATSAPP_VERIFY_TOKEN`, never `WHATSAPP_APP_SECRET`) and by live test (GET returned 200 with the correct challenge both with and without `WHATSAPP_APP_SECRET` configured) |

No attempt was made to obtain, generate, or invent the real secret value — per the task's explicit
instruction. The real value must come from the Meta App Dashboard (Settings → Basic → App Secret),
Salman's own action.

---

## Additional security/configuration gaps discovered this pass (new, not in the 2026-08-28 audit)

1. **`STORE_QR_BASE_URL`** (`app/api/v1/admin/settings.py:30`, `os.getenv("STORE_QR_BASE_URL",
   "https://demo.salmansaas.com")`) — not a secret, but genuinely undocumented: absent from both
   `.env.example` and the 2026-08-28 audit's env-var inventory. Low severity (has a safe default),
   purely a documentation completeness gap.
2. **`rules/backend/security.md:134` names the wrong Supabase env var** — it documents
   `SUPABASE_SERVICE_ROLE_KEY` as "Required — no default," but the real code (confirmed via
   `public_service.py:14`, `storage_service.py:16`, `registration_service.py:64`, and
   `.env.example:39`) reads `SUPABASE_SERVICE_KEY` (with a `SUPABASE_KEY` fallback) — `
   SUPABASE_SERVICE_ROLE_KEY` is never read anywhere in `app/`. This is a real, standing-rules-file
   inaccuracy: anyone following that rule's exact variable name to configure Railway would set a
   variable the application never actually checks. Not fixed in this pass (rules-file edits fall
   under `repository-hygiene.md`'s "Persona & Prompt Drift" — a commit needs a stated Intent, and
   this is a one-line factual correction better handled as its own small, explicit fix, not folded
   silently into an audit document).

Neither of these blocks Priority 1's deployment or is itself a live exploit — both are documentation
completeness/accuracy gaps, reported per the task's "identify whether any other security-sensitive
configuration gap is currently known" instruction, not acted on.

**No other new security-sensitive configuration gap was found.** `ONBOARDING_SECRET`'s fail-open
behavior (G8) remains the one real, still-open security gap in this whole area — already known,
already deferred by Salman's own 2026-08-29 decision, cross-referenced here rather than re-litigated.

---

## Is Priority 1 deployment-ready once `WHATSAPP_APP_SECRET` is supplied?

**Yes.** Every other precondition is independently satisfied:
- `ENVIRONMENT` gate for `SECRET_KEY`/`WHATSAPP_VERIFY_TOKEN` startup guards — those two are
  themselves already confirmed present/presumed-fine (G5), so deploying does not risk an
  unrelated boot crash.
- The webhook's `GET` verification path is provably unaffected by this change.
- The fail-closed behavior when the secret is briefly absent (e.g., mid-deploy, before the Railway
  var propagates) does not crash the app — it just pauses inbound WhatsApp processing, which is the
  correct, safe failure mode.

**The one real action required before deploying Priority 1**: add the real `WHATSAPP_APP_SECRET`
(Meta App Dashboard → Settings → Basic → App Secret) to Railway's backend service environment
variables. No other blocking dependency was found.

## Status

**Investigation complete. No code changed this pass.** Awaiting Salman's review before any further
action (Priority 3 — Units/Resources functional verification).
