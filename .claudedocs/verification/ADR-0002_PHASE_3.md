# ADR-0002 — Verification: Phase 3 — `super/clients.py` PATCH Split + First Soft Block Consumer

Governed by `.claudedocs/implementation/ADR-0002_IMPLEMENTATION_CONTRACT.md` §2, plus two follow-up decisions from the previous review: closing the transitional Hard-Block/Soft-Block gap flagged in `ADR-0002_PHASE_2.md`, and activating the first live Soft Block allowlist consumer (Settings), which the original contract's Files table omitted despite being named in §3's design.

## Step 1 — `super/clients.py` PATCH split (closes the transitional gap)

### Files changed
- `app/repositories/super_repo.py` — new `update_client_lifecycle_state(client_id, lifecycle_state)`, alongside the existing `update_client_status` (docstrings added to both clarifying which concept each owns).
- `app/services/super_service.py` — new `update_client_lifecycle_state()`; `list_clients()` now returns both `status` and `lifecycle_state` per tenant (previously only `status`).
- `app/api/v1/super/clients.py` — `_VALID_STATUSES` narrowed from `{"active", "trial", "demo", "suspended", "expired"}` to `{"active", "suspended"}`. New `_VALID_LIFECYCLE_STATES` + `LifecycleStateUpdate` schema + new `PATCH /clients/{client_id}/lifecycle` endpoint, fully independent of `PATCH /clients/{client_id}/status`.

This directly closes the sequencing risk flagged in `ADR-0002_PHASE_2.md`: it is no longer possible to set `status="expired"` through any live endpoint — the old value is rejected by Pydantic validation before it reaches the database.

### Direct evidence (real HTTP requests, real super-admin JWT, real DB)
| Test | Request | Result |
|---|---|---|
| A | `PATCH /clients/{id}/status {"status": "trial"}` | **422** — rejected, `"status must be one of: ['active', 'suspended']"` |
| B | `PATCH /clients/{id}/status {"status": "expired"}` | **422** — rejected, same message — confirms the gap is closed |
| C | `PATCH /clients/{id}/status {"status": "suspended"}` | **200** — still accepted, unchanged (regression check) |
| D | `PATCH /clients/{id}/lifecycle {"lifecycle_state": "expired"}` | **200** — new endpoint works |
| E | `PATCH /clients/{id}/lifecycle {"lifecycle_state": "bogus"}` | **422** — rejected, lists all 7 valid values |
| F | `GET /clients` | Returns both `status` and `lifecycle_state` per tenant row |
| G | Direct DB read after D | `status` stayed `"active"` (untouched by the lifecycle PATCH), `lifecycle_state` became `"expired"` — **proves the two fields are genuinely independent, not aliased** |

## Step 2 — Settings routes as the first live Soft Block allowlist consumer

### Files changed
`app/api/v1/admin/settings.py` — both `GET /settings` and `PATCH /settings` now declare `Depends(allow_during_soft_block)` **before** `Depends(get_current_tenant)` (and, on the PATCH route, before `Depends(require_roles(...))` too), per the ordering requirement documented in `allow_during_soft_block`'s docstring.

This was not in the original Implementation Contract's Files table (an omission the contract's own §3 named `app/api/v1/admin/settings.py` as the intended target without listing it as a file that changes) — closing that gap now, as agreed, rather than leaving the Soft Block mechanism with zero live consumers.

### Direct evidence (same expired test tenant from Step 1's Test D — `status=active`, `lifecycle_state=expired`)
| Test | Request | Result |
|---|---|---|
| H | `GET /admin/settings` | **200** — allowlist bypass works |
| I | `PATCH /admin/settings {"name_en": "Updated Name"}` | **200** |
| J | Direct DB read after I | `name_en == "Updated Name"` — **the write actually landed, Soft Block didn't silently no-op it** |
| K | Same tenant, `GET /admin/dashboard` (plain route, no allowlist) | **403** — proves the allowlist is scoped to Settings specifically, not a blanket bypass for the tenant |
| L | A separate `status="suspended"` tenant, `GET /admin/settings` | **403** — **Hard Block still wins**; the Soft Block allowlist does not and cannot override suspension |
| M | A separate normal `status="active"`/`lifecycle_state="trial"` tenant, `GET /admin/settings` | **200** — unaffected, no regression |

## Cleanup
All test tenants/users/audit rows deleted. `clients: 16 → 16`, `users: 16 → 16`, `security_audit_log: 0 → 0`.

## `app.main` import check
121 paths (was 120 — exactly +1 for the new `/clients/{client_id}/lifecycle` endpoint), same pre-existing non-fatal `/health` duplicate-operation-ID warning, no new errors.

## Remaining scope
Per the Implementation Contract, the last two file changes are: unifying trial creation in `registration_service.py`/`demo_service.py` (writing `lifecycle_state` at creation, 14-day default), and the one-time `scripts/migrate_lifecycle_state.py` for existing tenants.
