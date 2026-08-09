# Availability Reliability — Root Cause + Fix (Production Blocker #1)

Follows: `.claudedocs/work/customer-booking-flow-review/2026-08-09/summary.md` (the Product Review
that first confirmed the symptom). This closes it with a real root cause, a real fix, and real
load-test evidence — not a guess at "Supabase is flaky."

## Confirmed Root Cause — three distinct failure modes, not one

Read the actual backend log (`/tmp/.../scratchpad/backend_restarted.log`, real tracebacks from
this session's own testing) rather than guessing. Found **three separate, confirmed** failure
modes, all stemming from the same underlying fact: **zero retry/timeout handling existed anywhere
in this codebase for any DB call**, so any transient hiccup between FastAPI and Supabase's pooler
(`aws-1-ap-southeast-2.pooler.supabase.com:6543`) surfaced immediately as an opaque 500 or an
unbounded hang.

1. **`httpx.ReadTimeout`** — Prisma Python's client talks to its own query-engine subprocess over
   local HTTP with a hardcoded 30s timeout (`prisma/http_abstract.py`'s `DEFAULT_CONFIG`). When the
   query engine itself stalls waiting on a Postgres connection from the pooler, this fires. Real
   traceback: `app/core/services.py:38` (`require_service`'s own DB check) →
   `prisma/engine/_http.py:217` → `httpx.ReadTimeout`.
2. **`prisma.errors.DataError` with code `P1001`** ("Can't reach database server") — a distinct
   failure mode confirmed only under real concurrent load (an 8-request burst test): the query
   engine reports a structured connectivity error rather than timing out. Not an `httpx` exception
   at all — a genuine Prisma engine-level error, confirmed via `exc.code`.
3. **The single highest-leverage, previously-unwrapped chokepoint**: `app/core/tenant.py`'s
   `_verify_tenant()` — `prisma_client.client.find_unique(where={"slug": slug})`. This is the
   tenant-resolution call that runs *before* `require_service()` on nearly every route in the
   entire app (public and admin). Under concurrent load, several requests can race to resolve the
   same slug before any of them populate `_tenant_cache` (a cache-stampede), all hitting this one
   query simultaneously — confirmed via a real traceback landing here specifically during a burst
   test, even after `require_service()` and the three reservation routes were already wrapped.

## Fix

New shared helper, `app/core/db_resilience.py`: `with_db_resilience(fn, timeout=8.0, retries=1)` —
bounds a DB call to 8s, retries once after a 0.5s backoff on a transient failure (httpx timeout/
connect errors, `asyncio.TimeoutError`, or a Prisma `DataError` whose `.code` is one of
`P1001`/`P1002`/`P1008`/`P1017`), and only then gives up with a clean `503` — never a bare `500`,
never an unbounded hang. Deliberately does **not** catch `DataError` broadly — that base class also
covers genuine, non-transient errors (`UniqueViolationError`, `ForeignKeyViolationError`, ...) that
retrying would never fix.

Applied at three call sites, covering all three confirmed failure modes:
- `app/core/tenant.py`'s `_verify_tenant()` — the highest-leverage fix, protects every route.
- `app/core/services.py`'s `require_service()` — protects every gated route.
- `app/api/v1/public/reservations.py`'s three hot public routes (`/barbers`, `/catalog-services`,
  `/availability`) — the specific paths the original Product Review found failing.

## Real Load-Test Evidence (not simulated — real HTTP requests against the real local backend)

| Test | Before fix (documented in the original Product Review) | After fix |
|---|---|---|
| 7 sequential `curl` probes | 3× `500`, 1× hung 2 minutes (command timeout), 2× `200`, 1× not tested this way | — |
| 10 sequential requests | ~50% failure rate observed across this session's testing | **10/10 succeeded** |
| 8-10 concurrent requests (burst) | Not tested before the fix existed; first burst test *against the partial fix* still showed 4-9 failures per round, which is what led to finding failure modes #2 and #3 above | **10/10 succeeded** (final burst, all three fixes in place), plus a follow-up 5/5 warm-cache batch, faster (3.5–6.4s vs. 12–19s cold) |

Real server-side log confirmation of the retry mechanism actually firing (not just inferred from
timing): `DB call 'get_available_slots' transient failure (attempt 1/2): TimeoutError()` — one real
retry, followed by a successful second attempt, matching a request that took 19.18s instead of
failing.

## A Real Dev-Environment Complication Hit During Testing (not a code bug)

Mid-testing, `uvicorn --reload` picked up a file save during an active concurrent burst, and the
new worker process failed to start (`prisma.engine.errors.EngineConnectionError: Could not connect
to the query engine`) — likely because the old worker was still holding connections at that exact
moment. This left the dev server fully unresponsive (even `/health` hung) until manually killed and
restarted without `--reload`. Documented here because it looked identical to "the fix made things
worse" for several minutes before the real cause (a `--reload` race, not the resilience code) was
identified — worth knowing if this recurs during future local testing.

## Independent Frontend Fix (does not depend on the backend fix above)

Per Salman's explicit instruction to fix this "بشكل مستقل" (independently): the frontend
previously could not distinguish "the request genuinely returned zero results" from "the request
failed" — both rendered the identical, misleading UI (a silent fallback to a broken legacy form for
`barbers`, and "no appointments today" for `availability`). Fixed in
`frontend/src/hooks/useReservationBooking.js` (new `barbersError`/`slotsError` state, a new `mode
=== 'error'` value distinct from `'legacy'`) and `frontend/src/pages/generic/normal/ReservePage.jsx`
(a real error+retry screen for the barbers case, a real inline error+retry state for the slots
case, both with a functioning retry button wired to the hook's new `retryBarbers`/`retrySlots`
callbacks). Real browser verification: see `commit-2-evidence.md`-style follow-up in this same
folder once the verification pass completes.

## What This Does Not Claim to Fix

The underlying Supabase pooler latency/connectivity itself is not "solved" — this fix makes the
application *resilient* to it (bounded retries, honest error states) rather than removing the root
external cause, which may be a real infrastructure/plan-tier constraint outside this codebase's
control. Whether this same flakiness reproduces in the real Railway production deployment (a
different network path to Supabase than this local dev machine's) remains an open Unknown — not
verified here, no production log access available from this environment.
