# Email / Resend Functional Verification (Priority 4)

Follows: `investigation-protocol.md` evidence discipline. Trigger: Salman's explicit "Production
Readiness Final Sweep — Priority 4" instruction (2026-08-31), closing item #12 ("Email/Resend
⏳ pending") from `.claudedocs/work/production-functional-sweep/2026-08-30/summary.md`.

**No secret values appear anywhere in this document** — `RESEND_API_KEY`/`RESEND_FROM_EMAIL` are
referenced only by name and presence/absence, per Salman's explicit instruction.

---

## Step 1 — Investigation

### 1. Which emails are actually supported today?

`app/services/email_service.py` defines **two** functions: `send_booking_confirmation()` and
`send_welcome_email()`. Grepped the entire `app/` tree for real callers of each:

```
grep -rn "from app.services.email_service" app/ --include="*.py"
→ app/services/registration_service.py:16  (send_welcome_email only)
```

**Real finding: `email_service.send_booking_confirmation()` is dead code.** It is fully built (a
complete, styled HTML template) but **imported and called by nothing, anywhere in this codebase.**
The only wired real-world flow is `send_welcome_email()`, triggered once, at new-tenant
registration.

This matters for scoping the rest of this pass: Salman's task template asked to verify an
"email-triggering reservation flow" and "cancellation/reschedule flow" — **neither exists.**
Booking/reservation confirmations in this product are sent via **WhatsApp**
(`app/services/whatsapp_notifications.py`'s own, unrelated `send_booking_confirmation()` — same
name, different module, confirmed via `admin/bookings.py:31,184`'s real import — no email path at
all for that flow). Per this project's own "do not test operations the product does not support"
rule (already applied identically in Priority 3), those tests are **N/A**, not skipped silently —
recorded as such in §4.

### 2. Which production flow triggers the one real email?

`registration_service.py`'s tenant-registration function, after creating the `Client`/`User` rows
and seeding services:
```python
asyncio.get_event_loop().run_in_executor(
    None,
    lambda: asyncio.run(send_welcome_email(
        to_email=data["email"], business_name=..., slug=client.slug,
    ))
)
```

### 3. Synchronous or background?

**Background, fire-and-forget**, scheduled on a thread-pool executor (`run_in_executor`) — the
registration request's own HTTP response does **not** wait for the email to send or even confirm
it was scheduled successfully beyond the `run_in_executor` call itself returning immediately.

### 4/5. What happens when Resend fails? Is the business operation reported as successful anyway?

Both `send_booking_confirmation()` and `send_welcome_email()` share the identical, deliberate
pattern: wrap the real `resend.Emails.send()` call in `try/except`, log via `logger.error()` on
failure, **return `False`, never raise.** Combined with the fire-and-forget scheduling in
`registration_service.py` (§3), **yes — tenant registration is unconditionally reported as
successful to the caller regardless of whether the welcome email actually sends.** This is the same
"best-effort notification" philosophy already established elsewhere in this codebase (identical
shape to `whatsapp_notifications.py`'s own explicit docstring: *"never raises, logs errors
instead"*) — **an intentional, consistent design choice, not a newly-discovered defect**, per
Salman's own explicit allowance to document intentional best-effort behavior rather than treat it
as a bug.

### 6. Observable in logs?

Yes — a single `logger.error(f"❌ Resend welcome failed: {e}")` line, including Resend's own error
message. No metric/counter, no retry, no external alerting — same maturity level as every other
background-notification failure path in this codebase (WhatsApp notifications included). Not a new
gap; consistent with the rest of the platform.

### 7. Are the required env vars actually present in production?

**Genuinely unknown from this environment** — no Railway CLI/dashboard access (confirmed absent in
every prior session that checked, most recently the 2026-08-28 Railway audit). What **is**
confirmed, locally only: `RESEND_API_KEY` is present (non-empty) in the local `.env`;
`RESEND_FROM_EMAIL` is **not** set locally, so the code's own default
(`SalmanSaaS <noreply@salmansaas.com>`) is what's actually in effect for the test below. Whether
Railway's production backend has the same key value, or a different (possibly correctly-configured)
one, is not derivable from this session — flagged as a real open item, not assumed either way.

---

## Step 2 — Real functional test (not code inspection alone)

Called `send_welcome_email()` directly against the real Resend API (not simulated), using Resend's
own official test recipient `delivered@resend.dev` — a publicly-documented address Resend provides
specifically for exercising the send path without emailing a real person. No real customer or
tenant email was used anywhere in this pass.

```
send_welcome_email(to_email='delivered@resend.dev', business_name='QA Sweep Test Tenant', slug='qa-sweep-test')
→ ERROR: ❌ Resend welcome failed: The salmansaas.com domain is not verified.
         Please, add and verify your domain on https://resend.com/domains
→ returned: False
```

**Distinguishing the three layers, per the task's own explicit instruction:**
- **Application accepted the email request**: Yes — the function ran, built the HTML, and reached
  the real Resend API (a live network round-trip, not a local failure — confirmed by receiving
  Resend's own, specific, server-side error message back).
- **Resend accepted the request**: **No** — rejected outright with a clear, unambiguous
  domain-verification error.
- **Actual delivery confirmed**: **Not applicable** — nothing was queued for delivery; Resend
  rejected the request before any send attempt.

## Step 3 — Failure path

- **Does the main business transaction still succeed?** Yes, confirmed by code structure (§1.4/5)
  — registration is fully decoupled from email outcome by design.
- **Is the failure logged?** Yes — confirmed live in this exact test run, one `ERROR`-level line,
  Resend's real error message captured, no secret value in it.
- **Does the dashboard/API expose the failure?** No — by design, matching the rest of the
  platform's background-notification philosophy. Documented here as intentional, not re-litigated
  as a defect.
- **Do background-task failures disappear silently?** Partially — they don't crash or corrupt
  anything, but there is no operator-facing surface (dashboard badge, alert, retry queue) showing
  "N welcome emails failed to send." Same maturity gap as WhatsApp's own notification failures
  elsewhere in this codebase — not new, not fixed here (matches "do not redesign the email system
  during this pass").

## Genuine defect found — STOPPED per instructions, not fixed

**The `salmansaas.com` sending domain is not verified in Resend**, confirmed via a real, live API
rejection — not a code bug (the code's own error handling behaved exactly as designed: caught,
logged, returned `False`, nothing crashed). This is a **configuration/operational** gap, not
something fixable in this repository:

- **Reproduction**: any call to `send_welcome_email()` (or the currently-dead
  `send_booking_confirmation()`, if it is ever wired up later) using the `RESEND_API_KEY` present
  in this local environment fails with Resend's domain-verification error.
- **Root cause**: the domain `salmansaas.com` (the `RESEND_FROM_EMAIL` default's sender domain) has
  not completed Resend's domain verification (SPF/DKIM DNS records) under whatever Resend account
  this API key belongs to.
- **Impact, honestly scoped**: **confirmed for the local test environment's Resend account.
  Whether this is also true of Railway's production Resend account is unconfirmed** — could be the
  same account/key (in which case every real new tenant's welcome email has likely been silently
  failing since this feature was built) or a different, correctly-configured one. This distinction
  matters and is not collapsed into a single claim.
- **Proposed smallest fix**: **not a code fix** — this requires verifying `salmansaas.com` (or
  whichever domain Railway's real `RESEND_FROM_EMAIL` uses) in the Resend dashboard
  (resend.com/domains), adding the DNS records Resend provides. Entirely Salman's own action —
  outside this repository, outside this session's access. No code change is proposed because none
  would fix this; the code's failure handling is already correct.

**Not fixed. Not code-fixable. Waiting for Salman's decision** on whether/how to verify the domain,
and whether to independently confirm Railway's production Resend configuration.

---

## Security

| Check | Result |
|---|---|
| API key server-side only | **Confirmed** — `RESEND_API_KEY` read only in `app/services/email_service.py` (Python backend); zero references anywhere under `frontend/` (grepped `.js`/`.jsx`/`.env*`) |
| No secret in logs | **Confirmed** — the real failure captured in this test logs Resend's own error message only, no key value |
| Sender cannot be abused via user input | **Confirmed** — `_FROM` is read once from the env var at module load; never parameterized per-call from any request body in either email function |
| Email content doesn't over-expose sensitive info | **One real side finding** (not the stop-worthy defect above): `send_welcome_email()`'s HTML interpolates `business_name` and `temp_password` via raw f-string, with **no HTML-escaping** — `business_name` is tenant-admin-supplied (registration payload) and reaches this live, reachable email flow unescaped. A crafted `business_name` containing HTML/script tags would render as-is in the recipient's mail client. Low real-world severity (the recipient is the tenant's own admin, and most mail clients sanitize script execution), but a real code-quality/defense-in-depth gap. **Not fixed** — flagged per "do not redesign the email system during this pass"; `send_booking_confirmation()` has the identical unescaped pattern but is dead code, so currently unreachable there. |

No other security-sensitive configuration gap found in this pass beyond what Priority 2 already
recorded.

---

## PASS / FAIL / N/A / NOT TESTABLE matrix

| # | Item | Result |
|---|---|---|
| 1 | Welcome email — application correctly builds and attempts the real Resend send | **PASS** |
| 2 | Welcome email — actual Resend API acceptance | **FAIL** — domain not verified (see Genuine Defect above) |
| 3 | Welcome email — actual delivery confirmation | **NOT TESTABLE** — nothing was queued once Resend rejected the request |
| 4 | Reservation-confirmation email flow | **N/A** — does not exist; this product notifies bookings via WhatsApp, not email (§1.1) |
| 5 | Cancellation/reschedule email flow | **N/A** — same reason |
| 6 | Order email flow | **N/A** — no such flow found anywhere in `app/` |
| 7 | Sender/from configuration | **PASS** — correctly server-side, non-abusable, confirmed via code + live test |
| 8 | Failure handling — main transaction unaffected by email failure | **PASS** — confirmed by code structure (fire-and-forget executor scheduling) |
| 9 | Failure handling — logged | **PASS** — confirmed live in this exact test |
| 10 | Failure handling — dashboard-visible | **N/A (intentional)** — best-effort by design, consistent with the rest of the platform |
| 11 | Security — key server-side only, no client exposure | **PASS** |
| 12 | Security — no secret in logs | **PASS** |
| 13 | Security — sender not user-abusable | **PASS** |
| 14 | Security — email content escaping | **Side finding, not blocking** — unescaped user input in the one live template |

## Re-test — 2026-08-31, after Salman verified the domain

Salman reported completing the external fix: `salmansaas.com` domain verified in Resend,
`RESEND_API_KEY` configured for the verified domain, `RESEND_FROM_EMAIL` configured. Re-ran the
**exact same live test** (`send_welcome_email()` → `delivered@resend.dev`, Resend's own official
test recipient, no real address touched), no code changed in between:

```
INFO: ✅ Welcome email sent to delivered@resend.dev
send_welcome_email() returned: True
```

**Resend accepted the request cleanly this time — no error, real success response.** Local `.env`'s
`RESEND_API_KEY` was unchanged from the earlier failing test (confirmed same value length before
re-testing) — meaning the domain verification Salman completed applies to the same account/key
already configured in this environment, not a separate one. `RESEND_FROM_EMAIL` is still unset
locally, so this ran on the code's own default sender (`SalmanSaaS <noreply@salmansaas.com>`) —
also now accepted, confirming that exact address's domain is the one that got verified.

**Layer distinction, same discipline as the original test**: application accepted the request ✓,
Resend accepted the request ✓ (this time, real success — not assumed). Actual human-inbox delivery
remains not independently confirmable from here — `delivered@resend.dev` is Resend's own
test-simulate address, not a real mailbox, by design (that's why it's safe to use repeatedly). This
is the strongest signal obtainable without emailing a real person, and it flipped from a hard
rejection to a clean success with zero code changes — directly attributable to the domain fix.

## Status

**Priority 4 is CLOSED.** The one real email flow this product has (`send_welcome_email`, triggered
at tenant registration) now succeeds end-to-end against the real Resend API, re-verified live after
Salman's domain-verification fix — not assumed from the fix being reported, independently
re-tested. Everything code-side (error handling, business-transaction decoupling, security posture)
was already confirmed correct in the original pass. The one open side finding (unescaped
`business_name`/`temp_password` in the welcome email's HTML) remains — low severity, not blocking,
not fixed (redesign explicitly out of scope).

**What remains before Priority 5**: nothing outstanding on Email/Resend. Whether Railway's real
production `RESEND_API_KEY`/`RESEND_FROM_EMAIL` match what was just re-tested locally is still
worth a real registration-flow smoke test against production itself whenever convenient — this
local re-test confirms the *code path and the verified domain* work together, not that Railway's
specific deployed values are identical to local's.

<!-- superseded-status-note: the paragraph below reflects this file's status before the re-test
above; kept for history, not the current status. -->

**Previously**: Salman's decision on the domain-verification gap — specifically
whether to verify `salmansaas.com` in Resend now, confirm Railway's production Resend
configuration independently, or accept this as a known, deferred gap (matching the precedent
already set for `WHATSAPP_ACCESS_TOKEN`/G5b — non-blocking, tracked, fixed when convenient). No
code change is proposed or needed.
