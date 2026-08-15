# `connect_db()` Startup Resilience — Evidence

Proposal: `.claudedocs/architecture/ALZABT_CONNECT_DB_STARTUP_RESILIENCE_PROPOSAL.md` (approved
2026-08-16). Classification: **Production reliability risk**, closed generically — not a
Supabase-specific workaround.

## Code verification

- `git diff` on `app/db/client.py` matches the proposal exactly: `connect_db()` only, up to 3
  attempts, 2s/4s backoff, retries only on the same transient classes `with_db_resilience()`
  already treats as transient (`EngineConnectionError`, Prisma `DataError` with code in
  `{P1001,P1002,P1008,P1017}`); any other exception, or the 3rd attempt, still raises immediately.
  `_pool_url()` and `disconnect_db()` untouched. `venv/bin/python3 -m py_compile` — clean.
- No drift from the proposal found before implementing — confirmed via `git diff` being empty on
  this file immediately before the edit.

## Live infrastructure verification — real, unplanned, exactly the scenario the fix targets

Restarting the backend to pick up the change hit two genuine, live transient pooler failures in a
row (not simulated) — captured directly in the real startup log:

```
Waiting for application startup.
{"error_code":"P1001", "message":"Can't reach database server at ...:6543"...}
DB startup connect transient failure (attempt 1/3): EngineConnectionError(...) -- retrying in 2s
{"error_code":"P1001", ...}
DB startup connect transient failure (attempt 2/3): EngineConnectionError(...) -- retrying in 4s
Application startup complete.
Uvicorn running on http://0.0.0.0:8000
```

**Before this fix, either of these two failures alone would have crashed the entire application
immediately** (`app/main.py`'s `lifespan` raising out of `connect_db()`, "Application startup
failed. Exiting.") — this exact failure mode was hit repeatedly earlier in this session, each time
requiring a manual restart. With the fix, the app recovered on the 3rd attempt automatically, no
manual intervention, and was confirmed serving real requests immediately after
(`GET /public/rk/config` → `200`).

## Regression check — previously-verified paths, post-restart

| Check | Result |
|---|---|
| Ali's `GET /admin/catalog/categories` fix (`6a08dec`, same session) | `200`, same real category, unchanged |
| RK public config | `200`, unchanged |
| `GET /reservations/barbers` (query-time `with_db_resilience`, untouched by this change) | `200`, unchanged |

## What this does NOT claim

- Does not fix or hide the underlying Supabase pooler instability — that incident stays open,
  separate, undecided. This fix is generic startup resilience, using the same transient-error
  vocabulary already established for query-time resilience in 2026-08-10 — nothing Supabase-specific
  was added (no special-cased host/port, no workaround tied to this one incident).
- Does not change steady-state behavior when the first connection attempt succeeds (the normal
  case) — zero added delay, confirmed by the code path itself (`return` on the first successful
  `connect()`).
- No tenant data touched — zero DB writes anywhere in this change or its verification.

## Result

Implemented exactly as proposed. Live-verified against a real, naturally-occurring failure — not a
forced/simulated one — with a clean automatic recovery and zero regression on every
previously-verified path.
