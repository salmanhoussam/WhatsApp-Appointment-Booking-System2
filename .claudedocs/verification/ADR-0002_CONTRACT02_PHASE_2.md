# ADR-0002 (Contract 02) — Verification: Phase 2 — Repositories & `subscription_service`

Governed by `.claudedocs/implementation/ADR-0002_IMPLEMENTATION_CONTRACT_02.md` §2/§7 (Phase 2). Service/repository layer only — no routes, per the Contract's explicit Phase 2 boundary.

## Files added

- `app/repositories/plan_repo.py` — `PlanRepository`: `find_by_key`, `find_by_id`, `list_all`, `create`. Pure Prisma queries, no business logic.
- `app/repositories/subscription_repo.py` — `SubscriptionRepository`: `find_active_for_client` (the `endedAt IS NULL` lookup implementing the "at most one active Subscription per Client" business rule from ADR-0002 §11.0b), `create`, `end_subscription`, `update_status`.
- `app/services/subscription_service.py` — the core of this phase:
  - `_sync_client_lifecycle_state` (internal) — the **single write path** to `Client.lifecycle_state`, per Decision 9.1.
  - `set_lifecycle_state(db, client_id, lifecycle_state)` — public entry point for manual changes. Updates `Client.lifecycle_state` and, if an active `Subscription` exists, keeps its `status` in sync too. If no active `Subscription` exists (pre-migration transition window), degrades gracefully to a `Client`-only update rather than erroring. This is what Phase 3's re-routed `PATCH /clients/{id}/lifecycle` will call.
  - `assign_plan(db, client_id, plan_key, status=None)` — ends any existing active `Subscription` for the `Client` (enforcing at-most-one-active), creates a new one on the given `Plan`, and syncs `Client.lifecycle_state` through the same single write path. `status` defaults to the `Client`'s current `lifecycle_state` if not given — a continuity default, not an invented business rule (Contract 02 didn't resolve what a new subscription's starting status "should" be; the caller decides).
  - `list_plans(db)` — convenience read.

## Direct evidence (real DB, functions called directly — no HTTP layer, proving unit-testability in isolation as scoped)

| Test | What it proves | Result |
|---|---|---|
| A | `assign_plan` creates a `Subscription` on the right `Plan` with the given `status`, and `Client.lifecycle_state` is synced to match | `Subscription.status == "paid"`, `Client.lifecycle_state == "paid"` |
| B | Cache invalidation actually fires (`invalidate_tenant_cache` called, not just referenced) | No stale entry in `_tenant_cache` after the write |
| C | A second `assign_plan` call ends the prior `Subscription` and creates a new one — **exactly one active at a time**, never two | 2 `Subscription` rows total, 1 with `endedAt IS NULL`; the prior row's `endedAt` is now set |
| D | `set_lifecycle_state` with an active `Subscription` present updates **both** `Client.lifecycle_state` and that `Subscription`'s `status` | Both read back as `"expired"` after the call |
| E | `set_lifecycle_state` with **no** active `Subscription` degrades gracefully — updates `Client.lifecycle_state` alone, doesn't error | `subscription_id: None` in the result, `Client.lifecycle_state` still correctly updated to `"paid"` |
| F | `assign_plan` with an unknown `plan_key` raises a clear error rather than silently doing nothing | `ValueError: Plan 'does-not-exist' not found` |
| G | `list_plans` returns real `Plan` rows | Confirmed both test `Plan`s present in the result |

## Cleanup

All test `Subscription`/`Client`/`Plan` rows deleted. Confirmed via row counts: `clients: 15 → 15`, `plans: 0 → 0`, `subscriptions: 0 → 0` — exactly back to the Phase 1 baseline.

## `app.main` import check

**121 paths** — unchanged from Phase 1, confirming these new files introduce zero routes and zero import-time side effects, exactly as scoped ("no Routes or Endpoints in this phase").

## Scope confirmation

No route, no endpoint, nothing in `app/api/` touched. Phase 3 (`PATCH /clients/{id}/subscription` + re-routing `PATCH /clients/{id}/lifecycle` through `set_lifecycle_state`) is next.
