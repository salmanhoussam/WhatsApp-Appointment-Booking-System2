# WhatsApp Webhook Signature Verification — Evidence

Follows: `investigation-protocol.md` evidence discipline, `service-execution-constitution.md`
(investigate → real evidence → fix → verify → document). Trigger: Salman's explicit "Production
Readiness Final Sweep — Priority 1" instruction (2026-08-31), closing the finding first surfaced
(but explicitly deferred) during the 2026-08-30 Production Functional Sweep — see
`.claudedocs/work/production-functional-sweep/2026-08-30/summary.md`, item `#5 WhatsApp booking`.

---

## Original finding

`app/api/v1/webhook.py`'s `POST /whatsapp` handler had **zero request authentication**. It parsed
and processed any JSON body shaped like a Meta WhatsApp payload, with no verification that the
request actually originated from Meta. Anyone on the internet who discovered the endpoint URL could
POST a forged payload and it would be dispatched to the real state machine
(`handle_incoming_message`) exactly like a genuine inbound WhatsApp message — first noticed
2026-08-30 as a side effect of using this exact gap to run a synthetic multi-step conversation test
(no other way existed to script an unattended test against the real webhook at the time).

## Investigation (before any code changed)

1. **Read the complete webhook flow** — `app/api/v1/webhook.py` in full (both `GET /whatsapp` and
   `POST /whatsapp`), confirmed the POST handler went straight from `await request.json()` to
   dispatching `handle_incoming_message` as a background task, with no header/signature check
   anywhere before that point.
2. **Identified where the request enters the app** — `app/main.py:68`,
   `app.include_router(webhook_router, prefix="/api/v1/webhook", ...)`, no body-consuming
   middleware registered ahead of it (only `CORSMiddleware`, which doesn't touch the body) — safe
   to read `request.body()` once and reuse it.
3. **Identified raw body handling** — the original code called `request.json()` directly, which
   discards the exact raw bytes Meta actually signed. Signature verification requires the *raw*
   body, so the fix reads `await request.body()` first and parses JSON from those same bytes
   (`json.loads(raw_body)`), never re-fetching or re-encoding.
4. **Checked for a configured Meta App Secret — real result: it does not exist.** Grepped
   `app/core/config.py`, `.env`, `.env.example` for `WHATSAPP` and `APP_SECRET` — the only WhatsApp
   settings present were `WHATSAPP_VERIFY_TOKEN` (GET challenge only, a shared setup-time token,
   not a signing key), `WHATSAPP_ACCESS_TOKEN` (outbound API calls), `WHATSAPP_PHONE_NUMBER_ID`,
   `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_CENTRAL_NUMBER`. None of these are the Meta App Secret
   HMAC verification requires — confirmed before writing any code, per the task's explicit "do not
   assume the env var name" instruction. **This is a real, separate, pre-existing gap** (a required
   secret was never provisioned for this specific mechanism, distinct from G5b's known-missing
   `WHATSAPP_ACCESS_TOKEN`), not something introduced by this fix.

## Root cause

`POST /api/v1/webhook/whatsapp` trusted the shape of the JSON body alone as proof of authenticity.
Meta's Cloud API webhook contract requires verifying `X-Hub-Signature-256` (HMAC-SHA256 of the raw
body, keyed with the Meta App Secret) on every POST — this codebase never implemented that side of
the contract, only the one-time `GET` verification handshake.

## Exact fix

**`app/core/config.py`** — added one new setting, following the existing `WHATSAPP_*` naming
convention exactly:
```python
WHATSAPP_APP_SECRET: Optional[str] = os.getenv("WHATSAPP_APP_SECRET")
```
Deliberately `Optional`/no startup-crash guard (unlike `SECRET_KEY`/`WHATSAPP_VERIFY_TOKEN`, which
raise `ValueError` at import time if left at their insecure defaults) — a hard crash here would take
down the **entire backend**, not just the webhook, the moment this deploys (since the secret isn't
in Railway yet — see Deployment Requirement below). The route-level fail-closed behavior below
achieves the same security outcome (reject everything until configured) with a much smaller blast
radius.

**`app/api/v1/webhook.py`** — `POST /whatsapp`:
- Reads `raw_body = await request.body()` before anything else.
- New helper `_verify_signature(raw_body, signature_header)`: returns `False` (never raises) if
  `WHATSAPP_APP_SECRET` isn't configured (logs a clear, actionable error, no secret value), if the
  header is missing or doesn't start with `sha256=`, or if the computed HMAC-SHA256 digest doesn't
  match via `hmac.compare_digest` (constant-time, avoids timing side-channels).
- On failure: `logger.warning(...)` + `raise HTTPException(403, "Invalid signature.")` — same
  pattern and status code the pre-existing `GET` handler already uses for its own verification
  failure, not a new error convention.
- On success: `payload = json.loads(raw_body)` (same bytes just verified — never re-derives a
  different body), then unchanged existing logic (`_has_messages` filter,
  `background_tasks.add_task(handle_incoming_message, payload)`).
- `GET /whatsapp` (the Meta verification challenge) — **completely untouched**, still validates
  `hub.verify_token` against `WHATSAPP_VERIFY_TOKEN` exactly as before.
- `_has_messages()` — **completely untouched**.
- `app/services/whatsapp_flow.py`, `whatsapp_reservation_flow.py`, `whatsapp_service.py` — **not
  read or modified**; this fix sits entirely upstream of them, at the transport boundary.

**`.env.example`** — added a documented `WHATSAPP_APP_SECRET=` placeholder line (empty, no value)
next to the other WhatsApp settings, with a comment pointing at where to find the real value (Meta
App Dashboard → Settings → Basic → App Secret) and stating it's required in production.

No secret value was written to any file, log, or this document at any point.

## Verification — real local tests, this session

Backend restarted locally (`uvicorn`, port 8000) twice: once with a locally-generated random test
secret (`secrets.token_hex(32)`, stored only in `/tmp/claude-1000/wa_test_secret.txt`, deleted
immediately after testing, never printed to output or committed), once with no secret configured at
all (simulating current real Railway state). All 6 required checks below were run against the
running server, not simulated:

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| 1 | Valid signature (correct HMAC over the real body, test secret configured) | 200, accepted | `200 {"status":"received"}` | ✅ Pass |
| 2 | Invalid signature (`sha256=` + 64 zero chars, test secret configured) | 403, rejected | `403 {"error":{"code":"FORBIDDEN","message":"Invalid signature."}}` | ✅ Pass |
| 3 | Missing signature header entirely (test secret configured) | 403, rejected | `403`, same error body | ✅ Pass |
| 4 | Payload modified after signing, old/stale signature reused (test secret configured) | 403, rejected | `403`, same error body — proves HMAC is bound to body content, not just header presence | ✅ Pass |
| 5 | `GET /whatsapp` verification/challenge (default `WHATSAPP_VERIFY_TOKEN`) | 200, echoes challenge | `200`, body `12345` (the challenge value sent) | ✅ Pass — completely unaffected by this change |
| 6 | `WHATSAPP_APP_SECRET` genuinely unset (real current Railway state simulated locally) — POST with a plausible signature header, and separately `GET` challenge | POST → 403 fail-closed; GET → unaffected | POST → `403`; GET → `200`, correct challenge echoed | ✅ Pass — confirms the fix fails closed, doesn't crash the app, and doesn't touch the GET path |

**Console/application errors**: `tail`'d the backend log after every test — zero unhandled
exceptions, zero unexpected 500s, zero stack traces. The one non-error log line seen
(`⚠️ No client resolved for display_phone=...`) is pre-existing `whatsapp_flow.py` behavior for an
unrecognized test phone number in the accepted (test #1) message's background-task processing —
unrelated to signature verification, not touched by this fix, and itself proof the accepted request
really did reach the existing state-machine code unchanged.

**Regression check on the existing WhatsApp flow**: not re-run end-to-end this pass (that would
require sending real, signed traffic through a real Meta-connected number, or setting a real Meta
App Secret locally — neither available/safe from here) — the 2026-08-30 WhatsApp DB Session Fix's
own 7-step conversation test (`WHATSAPP_DB_SESSIONS_FIX/evidence.md`) already proved the downstream
state machine and DB persistence work correctly; this fix sits entirely upstream of that logic and,
per test #1 above, correctly-signed traffic still reaches it unchanged.

## Files changed

```
app/core/config.py          — added WHATSAPP_APP_SECRET setting (Optional, no default, no startup crash)
app/api/v1/webhook.py       — POST handler now verifies X-Hub-Signature-256 before parsing/dispatching;
                               new _verify_signature() helper; GET handler and _has_messages() untouched
.env.example                — documented the new required env var (empty placeholder + comment)
```

No backend service/repository files, no frontend files, no database/Prisma schema, no other routes
touched.

## Environment/configuration requirement — real, not optional

**`WHATSAPP_APP_SECRET` must be added to Railway's backend service environment variables before
this fix is deployed**, or the WhatsApp bot will stop accepting all real inbound messages the
moment this ships (confirmed by test #6 above — this is the intended, correct security behavior:
unsigned traffic must not be accepted once verification exists, and this codebase already accepts
this same tradeoff for `SECRET_KEY`/`WHATSAPP_VERIFY_TOKEN` via a harder startup-crash guard).

**Where to get the real value**: Meta App Dashboard → the WhatsApp Business app → Settings → Basic
→ **App Secret** (a "Show" button reveals it — copy exactly, no whitespace). This is a genuinely
different value from `WHATSAPP_VERIFY_TOKEN` (a token *you* choose during webhook setup) and from
`WHATSAPP_ACCESS_TOKEN` (a separate, rotatable API access token) — do not reuse either.

## Remaining deployment requirement

1. Add `WHATSAPP_APP_SECRET` (the real Meta App Secret) to Railway's backend service env vars.
2. Deploy this code change.
3. Order matters in principle (setting the secret without the code has no effect; deploying the
   code without the secret set fails closed exactly as tested in check #6 — safe, just means the
   bot pauses until the secret is added) — but doing both in the same deploy is the clean path:
   set the Railway env var, then deploy.
4. After deploy, a real inbound WhatsApp message (or Meta's own webhook test tool, if used) is the
   only way to confirm live production end-to-end — not repeated here, since this session has no
   access to a real, currently-signed Meta payload or Railway's env var console.

## Status

**Implementation + local verification complete. Not committed, not pushed** — per the task's
explicit "do not commit until implementation + verification are complete... wait for approval
before moving to Priority 2." Awaiting Salman's review and the Railway env var addition before this
can safely go live.

---

## WhatsApp Cloud API Production Finalization — 2026-08-31

Salman reported the external configuration work complete except the access token: Resend domain
verified + API key + `RESEND_FROM_EMAIL` configured; Railway populated for WhatsApp/webhook;
`WHATSAPP_APP_SECRET` configured from Meta; `WHATSAPP_VERIFY_TOKEN` configured matching the value
intended for Meta's webhook setup. Re-investigated the current code fresh (repository over memory)
to confirm exactly what remains — **no code was changed in this pass.**

### 1–3. Outbound access token variable — confirmed, no competing variable

`app/services/whatsapp_service.py:15` — `self.access_token = access_token or
settings.WHATSAPP_ACCESS_TOKEN`, sent as `Authorization: Bearer {token}` to
`https://graph.facebook.com/v18.0/{phone_number_id}/messages`
(`whatsapp_service.py:10,26,29`). `settings.WHATSAPP_ACCESS_TOKEN` is defined once
(`config.py:73`), read from the identically-named env var.

**One other name (`WHATSAPP_API_TOKEN`) appears in the codebase — confirmed NOT a competing
variable.** It exists only inside TODO-comment docstrings in `app/services/dating_service.py` (an
unrelated, unbuilt "Dating Service" feature that currently sends plain `wa.me` links, no Cloud API
calls at all) — never passed to `os.getenv()` anywhere, never read, dead documentation for a future
migration that hasn't happened. Confirmed via a full-repo grep for every real
`ACCESS_TOKEN`/`Authorization: Bearer`/`graph.facebook.com` reference.

**`WHATSAPP_ACCESS_TOKEN` is the correct, sole, real variable. No inconsistency found — no new
verify token needed, matching Salman's own instruction not to suggest one absent an actual
inconsistency.**

### 6. Webhook implementation — re-verified fresh, live, this session

Re-read `app/api/v1/webhook.py` in full (unchanged since the Priority 1 fix, still uncommitted) and
re-ran a live sanity check against the local backend (same code, not a re-derivation):
```
GET  /api/v1/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=<local default>&hub.challenge=42
→ 200, echoes 42
POST /api/v1/webhook/whatsapp (no signature header)
→ 403, rejected
```
Confirms both requirements hold: **GET challenge verification intact** (uses
`WHATSAPP_VERIFY_TOKEN` only, untouched since before this session); **POST validates
`X-Hub-Signature-256` via `WHATSAPP_APP_SECRET` before any parsing/dispatch**, missing/invalid
signatures rejected with 403. Neither path reads `WHATSAPP_ACCESS_TOKEN` at all — confirmed by
code (§ above): that variable is used exclusively by `whatsapp_service.py` for **outbound** sends.

### 7. Production webhook URL

**Path, confirmed from code**: `/api/v1/webhook/whatsapp` (`main.py:68` mounts `webhook_router` at
`/api/v1/webhook`; the router itself defines `/whatsapp`).

**Domain — genuinely not derivable from this repository or session.** No file stores the backend
service's real public Railway (or custom-mapped) domain, and this session has no Railway dashboard
access. Confirmed by checking `frontend/.env` (local dev's `VITE_API_URL` is empty — resolves via
the Vite dev proxy, not a real domain) and `frontend/.env.example` (only a placeholder). Salman
must supply the real backend domain from Railway's own Settings → Domains (or wherever the frontend's
production `VITE_PUBLIC_API_URL`/`VITE_ADMIN_API_URL` currently point) and append the path above.

### 8. WABA `subscribed_apps` — not automated by this codebase

Grepped the entire `app/` tree for `subscribed_apps`/`subscribe` — the only match is the unrelated
`hub.mode == "subscribe"` string check inside `verify_webhook()`'s own GET-challenge logic (Meta's
own protocol constant, not a WABA subscription call). **No code anywhere calls Meta's
`POST /{WABA-ID}/subscribed_apps` endpoint or automates this step.** This is a standard,
one-time Meta-side action — normally completed automatically by the Meta App Dashboard's own
WhatsApp → Configuration screen when the Callback URL + Verify Token are entered there and saved
(the dashboard flow subscribes the app to the WABA as part of that same screen), or done manually
via one API call. **Whether it has already happened is Meta-dashboard state this session cannot
see** — not confirmed either way, reported as a real open item rather than assumed done.

### Answers to the stop-condition questions

| Question | Answer |
|---|---|
| Which token type is required? | **System User Access Token** — matches Salman's own correct understanding. Not the short-lived "User token" from the Cloud API quickstart page. |
| Where to generate it in Meta? | Meta **Business Settings** (business.facebook.com) → Users → **System Users** → select/create a System User → Add Assets (assign the WhatsApp Business Account/App) → **Generate New Token** → select the target App → select permissions → Generate. This is a different screen from the "User token" section Salman already found. |
| Which permissions does it need? | Per Meta's own official Cloud API "Get Started" guide (Step 5, confirmed directly against the doc Salman provided 2026-08-31): **`business_management`**, **`whatsapp_business_messaging`**, **`whatsapp_business_management`** — all three together, generated as one token against the System User's assigned assets (App: Manage app; WhatsApp account: Manage WhatsApp Business accounts). `whatsapp_business_messaging` is the one this code actually calls (send/receive via `/{phone_number_id}/messages`); the other two match what Meta's own token-generation flow bundles in by default and cover the asset-management/`subscribed_apps` side (§8). Superseded the earlier two-permission answer in this same row — Meta's own doc is authoritative here. |
| Which Railway variable receives it? | `WHATSAPP_ACCESS_TOKEN` — confirmed the sole, correct variable (§1–3). |
| Can the webhook be verified before the token is added? | **Yes.** GET challenge and POST signature verification are both fully independent of `WHATSAPP_ACCESS_TOKEN` (§6) — Meta's webhook setup/verification in the dashboard can proceed and succeed right now regardless of token status. |
| Does WABA subscription still need to be performed? | **Unconfirmed from this session** (§8) — this codebase has zero automation for it either way; Salman should confirm via the Meta dashboard whether the Callback URL screen already completed this, or do it now (dashboard save, or one manual API call once the System User token exists). |

### Status — updated

Only remaining dependency for full WhatsApp Cloud API production readiness, confirmed by this
investigation: **`WHATSAPP_ACCESS_TOKEN`** (a System User token). Webhook signature verification
(this file's original subject) is code-complete, locally verified, and confirmed independent of the
access token — still uncommitted, still awaiting Salman's go-ahead to commit/deploy (unchanged from
before). No code was changed in this finalization pass.
