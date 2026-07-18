# ADR-0002 — Verification: Phase 2 — `app/core/tenant.py` (Hard Block / Soft Block Split)

Governed by `.claudedocs/implementation/ADR-0002_IMPLEMENTATION_CONTRACT.md` §2/§3/§6.

## File changed
`app/core/tenant.py` — the central enforcement module.

## ⚠️ Sequencing risk checked before making this live (not after)
Narrowing `_BLOCKED_STATUSES` to `{"suspended"}` only is safe **at this moment** because a direct query confirmed **zero** `Client` rows currently hold `status="expired"` (`demo: 1, active: 3, trial: 11` — no `expired`). This is a real, time-bound safety condition, not a permanent guarantee: until `app/api/v1/super/clients.py`'s `PATCH /clients/{id}/status` endpoint is split (a later step in this same Implementation Contract), that endpoint could still theoretically set `status="expired"` on a tenant — and after this change, such a tenant would be neither Hard-Blocked nor Soft-Blocked (nothing would set its `lifecycle_state` to `"expired"` in that path). **Recommendation: the `super/clients.py` split should happen next, not be left open.**

## Changes made
- `_BLOCKED_STATUSES` narrowed from `{"suspended", "expired"}` to `{"suspended"}` (Hard Block only, `status`-based, unchanged mechanism).
- New `_LIFECYCLE_SOFT_BLOCKED = {"expired"}` — Soft Block, `lifecycle_state`-based.
- New `_assert_lifecycle_allowed()` — parallel to `_assert_status_allowed()`, raises `403` for `lifecycle_state == "expired"` unless `soft_block_allowed=True`. Kept as a fully separate function (not merged into `_assert_status_allowed`/`_assert_client_active`) specifically so callers that must stay Tenant-Status-only per the Implementation Contract §4 (`is_status_blocked()` for webhooks, `assert_client_active()` for `ai_settings_agent.py`) are structurally unable to pick up Soft Block behavior by accident.
- New `allow_during_soft_block(request)` — opt-in DI dependency, sets `request.state.soft_block_allowed = True`. Must be declared before the tenant/admin-user dependency in a route's parameter list (FastAPI resolves `Depends()` in signature order) — documented in its docstring with an example.
- `_tenant_cache` grew from a 3-tuple to a 4-tuple (`tenant, status, lifecycle_state, timestamp`) — both `_assert_status_allowed` and `_assert_lifecycle_allowed` are re-run on cache hit, not only on miss, extending the exact cache-correctness discipline ADR-0001 Phase 3 established to the new field from day one (`.claudedocs/verification/ADR-0001_PHASE_3.md`).
- `get_current_tenant()` and `get_current_admin_user()` both read `request.state.soft_block_allowed` (defaulting to `False` if unset) and pass it through to the Soft Block check.
- `resolve_tenant_status()` (used by the 7 public path-slug routes) always passes `soft_block_allowed=False` — no public route is allowlisted in this slice; an expired tenant hitting any of those routes is simply blocked. Documented explicitly, not a silent gap.
- `assert_client_active()` (used by `ai_settings_agent.py`) and `is_status_blocked()` (used by the Samsara/WhatsApp webhook paths) are **unchanged in code** — both still call only the Hard-Block-only path. Their *behavior* shifts as a direct, documented consequence of narrowing `_BLOCKED_STATUSES`: they now no longer treat `lifecycle_state="expired"` tenants as blocked at all, since `"expired"` moved out of `status` entirely. This is explicitly scoped as acceptable-for-now by the Implementation Contract §4, not silently absorbed.
- Fixed two stale `.claudedocs/decisions/0001-*` docstring references (in `_assert_status_allowed` and `resolve_tenant_status`) left over from the earlier documentation-policy migration, while already editing this file.

## Direct evidence (real HTTP requests via `httpx.AsyncClient` + `ASGITransport` against the actual `app`, real DB-backed test tenants/users/JWTs, real audit rows)

| Test | Tenant state | Route | Result |
|---|---|---|---|
| A | `status=suspended` | plain admin route | **403**, `"...has been suspended..."` — identical message to pre-change behavior (regression check) |
| B | `status=active`, `lifecycle_state=expired` | plain admin route (no allowlist) | **403**, `"...subscription has expired..."` |
| C | same as B | allowlisted route (`Depends(allow_during_soft_block)` declared first) | **200** — proves the DI-based bypass and declaration-order requirement both work as documented |
| D | `status=active`, `lifecycle_state=trial` | plain admin route | **200** — unaffected, no regression |
| E | `status=active`, `lifecycle_state` ∈ {`paid`, `grace_period`, `cancelled`, `archived`, `evergreen`} | plain admin route | **200** for all five — confirms only `"expired"` triggers Soft Block, nothing else in the new value set |
| F | cache-hit re-check | cached tenant's `lifecycle_state` manually corrupted to `"expired"` in-memory only (DB and `invalidate_tenant_cache()` untouched, isolating the hit-path specifically) | Next call **raised the Soft Block exception** — cache-hit path re-checks `lifecycle_state`, not just on miss |

**Audit trail:** 3 rows created across the run — 1 `tenant_suspended` (Test A) + 2 `tenant_lifecycle_expired` (Test B, Test F) — Test C (successfully allowlisted) correctly created zero audit rows, confirming denials are logged and allowed access is not.

**Webhook-path consequence confirmed directly:** `is_status_blocked("expired")` now returns `False` (was `True` before this change), `is_status_blocked("suspended")` still returns `True` — exactly the documented, deliberate scope boundary from the Implementation Contract §4.

## Cleanup
7 test tenants + 7 test users + 3 audit rows created during the run — all deleted. Confirmed via row counts: `clients: 16 → 16`, `users: 16 → 16`, `security_audit_log: 0 → 0` (all back to their exact pre-test baseline).

## `app.main` import check
Confirmed clean before and after all edits: `120 paths`, same single pre-existing non-fatal duplicate-operation-ID warning on `/health` — no new warnings or errors.

## Scope confirmation
No route in the real codebase uses `Depends(allow_during_soft_block)` yet — the mechanism is complete and verified, but has zero live consumers until a future step wires it into `app/api/v1/admin/settings.py` (not part of this Implementation Contract's file list, flagged here as a gap worth deciding on explicitly rather than assuming it's implied). Until that happens, **any tenant with `lifecycle_state="expired"` is Soft-Blocked from literally every admin/tenant route**, including Settings — there is no live allowlist exception yet, even though the mechanism to create one exists.
