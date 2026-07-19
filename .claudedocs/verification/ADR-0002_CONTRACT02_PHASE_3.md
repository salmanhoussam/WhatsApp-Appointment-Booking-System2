# ADR-0002 (Contract 02) — Verification: Phase 3 — Routes Wired to `subscription_service`

Governed by `.claudedocs/implementation/ADR-0002_IMPLEMENTATION_CONTRACT_02.md` §2/§6/§8 (Phase 3).

## Files changed

- `app/api/v1/super/clients.py` — new `PATCH /clients/{client_id}/subscription` (assign/change `Plan`, calls `subscription_service.assign_plan`). Existing `PATCH /clients/{client_id}/lifecycle` **re-routed**: now calls `subscription_service.set_lifecycle_state` instead of `super_service.update_client_lifecycle_state` — the direct-write path is no longer reachable from any live route.
- `app/services/super_service.py` — `update_client_lifecycle_state()` **flagged as superseded in its docstring, not deleted** (out of this phase's explicit scope to remove, per the project's minimal-change discipline — same treatment `find_active_client_by_slug()` got in the first ADR-0002 slice). It still writes `Client.lifecycle_state` directly if called, but nothing calls it anymore.

## Note on API response shape

`PATCH /clients/{client_id}/lifecycle`'s response body changed from `{id, slug, lifecycle_state}` to `{client_id, lifecycle_state, subscription_id}` (matching `subscription_service.set_lifecycle_state`'s return shape). This is a deliberate, disclosed consequence of Phase 3's re-routing, not an accident — confirmed via all prior audits this session that no frontend or external consumer exists for this endpoint yet (no self-service plan-change UI, per Contract §1).

## Direct evidence (real HTTP requests via `httpx.AsyncClient` + `ASGITransport`, real DB, real JWTs — exactly the "atomic across both tables" proof requested)

| Test | Request | Result |
|---|---|---|
| A | `PATCH /clients/{id}/subscription {"plan_key": ..., "status": "paid"}` | **200** — `Client.lifecycle_state == "paid"` **and** the new `Subscription.status == "paid"`, read back independently and confirmed equal |
| B | `PATCH /clients/{id}/lifecycle {"lifecycle_state": "expired"}` (the **old** endpoint) | **200** — `Client.lifecycle_state == "expired"` **and** the *same* `Subscription` row's `status` is now also `"expired"` (same `Subscription.id` as Test A — no new row created, just updated) — **direct proof the old endpoint no longer writes `Client.lifecycle_state` in isolation; both tables move together through the one write path** |
| C | Same tenant (now `lifecycle_state="expired"`), `GET /admin/dashboard` (plain route) | **403** — full-stack atomicity: the subscription PATCH → `Client.lifecycle_state` update → cache invalidation → `tenant.py` Soft Block enforcement all completed and took effect on the very next request |
| C (cont.) | Same tenant, `GET /admin/settings` (allowlisted route) | **200** — Soft Block allowlist still functions correctly on top of the new write path |
| D | Regression: `PATCH /clients/{id}/status {"status": "suspended"}` then `GET /admin/settings` | **(200, 403)** — Hard Block still wins even on the allowlisted route, completely unaffected by this phase's changes |

## Cleanup

All test rows deleted (`Client`, `User`, `Plan`, `Subscription`, any `SecurityAuditLog` rows). Confirmed: `clients: 15 → 15`, `plans: 0 → 0`, `subscriptions: 0 → 0`.

## `app.main` import check

**122 paths** — exactly +1 versus Phase 1/2's 121, matching the single new `PATCH /clients/{id}/subscription` endpoint. No other route count change.

## Scope confirmation

This phase touched exactly the two files scoped in the Contract. `app/core/tenant.py` was not modified — Test C's enforcement behavior is a consequence of that module's existing, unchanged logic correctly reading the now-updated `Client.lifecycle_state`, not a new capability added here.
