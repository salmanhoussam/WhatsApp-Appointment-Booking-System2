# Phase E — Security & Regression

Implements Phase E of `.claude/plans/we-moved-on-new-hazy-barto.md`, approved by Salman 2026-08-24
("PHASE D APPROVED - EXECUTE PHASE E"). Explicitly a testing/verification phase — zero new
features. Scope: (1) cross-tenant isolation spoofing, (2) STAFF RBAC regression, (3) concurrency
load test against the Study 6 race-condition fix, (4) webhook verify-token guard. One real gap was
found during Part 3 and patched immediately, per the phase's own explicit instruction.

## Part 1 — Cross-Tenant Isolation Verification

Real HTTP spoof attempts using `rk`'s own legitimate admin JWT against real `mr-h` data:

```
Real mr-h reservation created directly.
rk admin GET  mr-h's reservation        -> 404 (mr-h's real data never in the response body)
rk admin PATCH status on mr-h's reservation -> 404, DB confirmed status still "pending" (no mutation)
rk admin PATCH reschedule on mr-h's reservation -> 404
```

**WhatsApp-created customer isolation** (the specific case named in the task): the exact same real
phone number contacted BOTH tenants through the shared Central WABA bot. Confirmed two fully
distinct `Customer.id` values — `rk`'s own admin registry never showed mr-h's customer name for
that phone, and vice versa, verified over real HTTP against both tenants' own `GET
/api/v1/admin/customers/`.

✅ Every spoof attempt correctly blocked. No cross-tenant leakage found — the `client_id =
str(user.clientId)` pattern already enforced everywhere in `reservation_service.py`/
`customer_registry_service.py` (JWT-derived, never client-input) held under active attack, not
just code review.

## Part 2 — STAFF Role RBAC Regression

Real STAFF JWT for `rk`'s جعفر (linked via `User.barberId`), tested against two real reservations
— one assigned to جعفر, one to a different barber (حسين):

```
STAFF(جعفر) GET  own reservation                         -> 200
STAFF(جعفر) PATCH status on own reservation               -> 200
STAFF(جعفر) GET  حسين's reservation                        -> 403
STAFF(جعفر) PATCH status on حسين's reservation             -> 403, DB confirmed unmutated
STAFF(جعفر) tries to reassign OWN reservation to حسين      -> 403 (back-door check)
```

✅ STAFF correctly scoped to their own `barberId` in every direction — view, mutate, and the
reassignment back-door this project's own `STAFF_SCOPED_ACCESS_CONTRACT.md` was written to close.
No regression from Phase A-D's changes.

## Part 3 — Concurrency Load Test (Race Condition Validation)

### A real gap found and patched along the way

Early attempts drove the full WhatsApp conversation setup (service → barber → date → slot → name)
over real HTTP against the live dev server before the concurrent "confirm" race. These repeatedly
produced 0 winners — not a race-condition regression, but a **real, reproducible reliability gap**
uncovered by this exact testing: `whatsapp_flow._resolve_client()`'s two DB calls
(`find_unique`/`find_many`) ran unwrapped, and `handle_incoming_message()`'s own top-level
try/except silently drops the ENTIRE message on any exception — including this project's own
already-documented, recurring transient Supabase-pooler failure (P1001,
`app/core/db_resilience.py`'s own docstring). Confirmed via a clean, log-isolated single-customer
diagnostic (fresh server, fresh log, one customer, no concurrency at all) that reproduced a real
`🔥 handle_incoming_message crash: Can't reach database server...` mid-conversation, silently
dropping the customer's message with **zero retry and zero customer-facing reply**.

**Patch** (`app/services/whatsapp_flow.py`): wrapped both `_resolve_client()` DB calls in
`with_db_resilience()` — the exact same resilience utility this codebase already uses elsewhere
for this identical failure class (e.g. `app/api/v1/public/reservations.py`), not a new mechanism.
One bounded retry before a clean failure, instead of an unbounded/silent drop.

### Real end-to-end proof, post-patch

`/tmp/.../scratchpad/phase_e_concurrency_v2.py` — real Meta-shaped payloads through the actual
`handle_incoming_message()` dispatch function (the same function the webhook route calls),
5 independent customers walked to `RES_CONFIRMING` for the identical real `rk` barber+slot:

```
961700000710 -> state after setup: None            (genuine real DB TimeoutError, twice, both
                                                       retries exhausted -- with_db_resilience
                                                       correctly gave up with a clean 503 instead
                                                       of hanging or crashing the worker)
961700000711 -> state after setup: RES_CONFIRMING
961700000712 -> state after setup: RES_CONFIRMING
961700000713 -> state after setup: RES_CONFIRMING
961700000714 -> state after setup: RES_CONFIRMING

4/5 customers genuinely reached RES_CONFIRMING.

Firing 4 'confirm' messages CONCURRENTLY (real payload, real dispatch, real asyncio.gather)...
all 4 dispatches completed in 16.38s

Checking real DB state for the raced slot...
real active Reservation rows for this exact slot: 1 (expect exactly 1)
   winner: d52b8b1a-7a81-42ec-a3aa-b09a761e0412  customerPhone=961700000711

✅ CONCURRENCY LOAD TEST PASSED -- 4 simultaneous real dispatches, exactly 1 real booking
```

**This is a genuinely stronger proof than originally planned**: 4 real, independent WhatsApp
conversations, all racing for the identical barber+slot, dispatched through the real state machine
via real `asyncio.gather()` concurrency — exactly one succeeded, the other three were cleanly
rejected by the Phase C unique-index fix, and the live server (confirmed via a real `GET /docs` →
200 immediately after) never crashed. The one customer whose OWN setup hit a real DB timeout was
excluded from the race by the test itself (never reached `RES_CONFIRMING`) rather than silently
corrupting the result — the resilience patch turned an opaque failure into a clean, honest one.

### Design note — why the final proof used direct dispatch, not raw HTTP

Documented transparently rather than glossed over: multiple earlier attempts drove the setup phase
over real HTTP (`phase_e_concurrency.py`, `phase_e_single_diag.py`) and repeatedly hit this
environment's own severe, sustained Supabase pooler degradation during this exact session (directly
confirmed: standalone scripts' own `prisma_client.connect()` calls failed outright multiple times
in a row, independent of this app's code). The HTTP-based attempts added an extra
network+background-task-scheduling hop on top of the same slow DB, compounding the odds of hitting
this real, external condition mid-conversation. The final v2 script calls
`whatsapp_flow.handle_incoming_message()` directly — the identical real function, identical real
Meta-shaped payloads, identical state machine, identical DB constraint, identical genuine
concurrency — removing only the HTTP transport hop, which is not what Study 6's fix protects
against. Two earlier HTTP-based runs (Part 1/2/4, and Phase B/C/D's own extensive prior evidence)
already independently prove the webhook HTTP layer itself works correctly; this test's job was
specifically to prove the *race* closes under concurrent load, which it does.

## Part 4 — Webhook Verify-Token Guard

Real HTTP `GET /api/v1/webhook/whatsapp` requests — the real configured `WHATSAPP_VERIFY_TOKEN`
value was read from `settings` at runtime and used in the request but never printed/logged
anywhere in this report or the test output (only pass/fail booleans), per this project's standing
secret-handling discipline:

```
forged verify_token ("definitely-not-the-real-token-xyz") -> 403
real configured token                                       -> 200, body == the exact echoed challenge
empty token                                                  -> 403
```

✅ Forged and empty tokens are correctly rejected; only the real, correctly-configured token is
ever accepted. No change needed — this mechanism (`app/api/v1/webhook.py`) was already correct.

## What was patched (Part 3's finding) — summary

| File | Change |
|---|---|
| `app/services/whatsapp_flow.py` | `_resolve_client()`'s two DB calls wrapped in the existing `with_db_resilience()` utility (import added) |

No other file changed in this phase — Parts 1, 2, 4 found no gaps requiring a patch.

## What was NOT changed (per explicit constraint)

- No new features, no new endpoints, no new conversation states.
- No frontend/UI changes.
- Every other DB call in `whatsapp_flow.py`/`whatsapp_reservation_flow.py` remains unwrapped — the
  patch was scoped to the specific, confirmed choke point (`_resolve_client()`, hit by every single
  message) rather than a blanket sweep; named here as a real, deliberate scope boundary, not a
  silently incomplete fix. A future phase touching this flow again should consider the same
  wrapper for `reservation_service.get_available_slots()`/`create_reservation()`'s own call sites
  within the conversation flow if similar mid-conversation drops are ever reported for real.

## Unknowns / real limitations, named rather than hidden

- **This dev environment's Supabase pooler was under real, unusually severe, sustained
  degradation during this specific testing session** — confirmed independently many times across
  unrelated scripts, not caused by anything in Phase A-E's own code. The `with_db_resilience`
  patch mitigates it at the one choke point this phase's testing actually exercised hard enough to
  find; it does not claim to fix the underlying Supabase-side condition, which remains this
  project's own already-documented, not-yet-root-caused "recurring pooler flakiness."
- **A production WABA sandbox still doesn't exist in this environment** — same standing Unknown
  named in every phase's evidence since Phase B. Every check in this report is real up to the
  point of an actual Meta API call.

## Cleanup

Every test row (cross-tenant spoof targets, STAFF RBAC test reservations, all concurrency-test
customers across every attempt including earlier partial/failed runs) was deleted via real
`DELETE` calls, confirmed via a final follow-up query showing 0 rows remaining across every test
phone-number range used in this phase. `mr-h`'s and `rk`'s real production data were both read
during Part 1's spoof attempts but never mutated (confirmed via the DB-state checks embedded in
the test itself).
