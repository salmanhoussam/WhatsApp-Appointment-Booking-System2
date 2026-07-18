# Implementation Contract — ADR-0002 First Slice (Tenant Status / Account Lifecycle State Split)

Governs implementation against `.claudedocs/adr/ADR-0002.md` (specifically §7 and the resolved §9.1–9.3). Any change during coding gets measured against **this document**, not developer judgment in the moment. Scope is the first slice only — no Subscription/Plan/Payment/Invoice/Usage entities, all deferred per ADR-0002 §6.

## 1. Scope

Separate the administrative concept — **Tenant Status** (`Client.status`, narrowed going forward to `active`/`suspended` only, Hard Block, unchanged from ADR-0001) — from the lifecycle concept — **Account Lifecycle State** (new column `lifecycle_state`, values: `trial`, `paid`, `grace_period`, `expired`, `cancelled`, `archived`, `evergreen`).

`lifecycle_state == "expired"` gets a new enforcement behavior distinct from Hard Block: **Soft Block** — most endpoints rejected, but a defined allowlist of routes stays reachable (ADR-0002 §9.1). `paid`/`grace_period`/`cancelled`/`archived`/`evergreen` are represented in the schema and read consistently, but no transition logic *into* them is built in this slice beyond the one-time migration (§5) — e.g., there is no billing flow that moves a tenant into `paid` yet, since Payment doesn't exist. This slice only guarantees the field exists, is correctly seeded, and is correctly enforced for `trial` and `expired`.

## 2. Files That Will Change

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `lifecycle_state String @default("trial")` to `Client`. `status` stays the same column/type — no rename — but its *valid* values narrow to `{"active", "suspended"}` going forward (enforced at the application layer, not a DB constraint, matching how `status`'s existing value set was never DB-constrained either). |
| `app/core/tenant.py` | `_BLOCKED_STATUSES` narrows to `{"suspended"}` (Hard Block only, reading `status`). New: `_LIFECYCLE_SOFT_BLOCKED = {"expired"}`, a parallel check reading `lifecycle_state`, raising `403` unless the route has opted into the Soft Block allowlist (see §3). `_tenant_cache` tuple grows to include `lifecycle_state` alongside `status`, re-checked on every access — same cache-correctness discipline ADR-0001 Phase 3 established (see `.claudedocs/verification/ADR-0001_PHASE_3.md`), applied here from day one instead of being discovered as a bug later. |
| `app/services/registration_service.py` | Trial creation unified to 14 days (retires the previous 14-day-here-vs-7-day-in-demo_service inconsistency — this file was already 14 days, so its literal behavior is unchanged, but it becomes the canonical default other paths match). Writes `lifecycle_state="trial"` alongside the existing `trial_ends_at` computation — no change to how `trial_ends_at` itself is computed. |
| `app/services/demo_service.py` | `TRIAL_DAYS = 7` → `TRIAL_DAYS = 14`, matching the unified default (ADR-0002 §9.2). Writes `lifecycle_state="trial"`. |
| `app/api/v1/super/clients.py` | The existing `PATCH /clients/{id}/status` endpoint is split: it continues to accept Tenant Status values (`active`/`suspended`) only; a new `PATCH /clients/{id}/lifecycle` endpoint (or an expanded body on the existing route — exact shape decided during coding, not here) handles Lifecycle State changes. `_VALID_STATUSES` narrows accordingly. |
| `scripts/migrate_lifecycle_state.py` (new, one-time) | Implements ADR-0002 §9.3 exactly — see §5 below. |

## 3. Architectural Decision Check — Soft Block Allowlist Mechanism

Per ADR-0002 §9.1: the allowlist is **not** a hardcoded path list centralized inside `tenant.py` (that would couple the tenant-resolution layer to knowledge of which routes are "settings," violating the existing 4-layer separation). Instead, routes opt in explicitly via a new dependency, following the exact pattern already used by `require_service()`/`require_roles()`:

```python
# app/core/tenant.py — new
async def allow_during_soft_block(request: Request):
    """
    Opt-in dependency for routes that must remain reachable when
    lifecycle_state == 'expired' (ADR-0002 §9.1's Soft Block allowlist).
    Routes NOT using this dependency are blocked by default when
    lifecycle_state == 'expired' — restrictive by default, matching
    ADR-0001's posture.
    """
    request.state.soft_block_allowed = True
```

`_LIFECYCLE_SOFT_BLOCKED`'s check in `_assert_status_allowed` (or a new sibling function) inspects `request.state.soft_block_allowed` before raising — set only when a route explicitly declares it via `Depends(allow_during_soft_block)`. First slice's allowlist is scoped honestly to what exists today (ADR-0002 §9.1): the tenant admin Settings endpoint(s) under `app/api/v1/admin/settings.py`. No billing/renewal route is allowlisted because none exists yet — this is not a placeholder for a page that isn't built.

## 4. What Will NOT Change

- Hard Block behavior for `suspended` — identical to ADR-0001 today, verified unchanged is a required test (§5).
- `require_super_admin()` — untouched, no Lifecycle State check ever applies to super admin.
- No `Subscription`, `Plan`, `Payment`, or `Invoice` model — out of scope per ADR-0002 §6.
- No new trial-duration configuration mechanism — `trial_ends_at` (already on `Client`) remains the sole per-tenant date; only the *default* computed at creation time is unified to 14 days. A Super Admin endpoint to manually extend `trial_ends_at` for a specific tenant is **not built** in this slice (flagged in ADR-0002 §9.2 as a natural, separately-scoped follow-up).
- No changes to `app/services/whatsapp_flow.py`, `app/api/v1/webhooks/samsara.py`, or `app/api/v1/ai_settings_agent.py`'s ADR-0001 gating — those continue reading Tenant Status (`status`) only, exactly as ADR-0001 left them. Whether they should also respect Soft Block is explicitly out of scope here and not decided by this contract.

## 5. Migration Strategy (one-time script, per ADR-0002 §9.3)

`scripts/migrate_lifecycle_state.py`, run once against the live database:

- For every `Client` with current `status == "trial"`: set new `status = "active"`, `lifecycle_state = "trial"`. Keep the existing `trial_ends_at` value unchanged. **If** `trial_ends_at` is already in the past at migration time: extend it by a grace window (3–7 days from the migration run date — exact number fixed at coding time, defaulting to 5 unless the user specifies otherwise) instead of landing the tenant directly in `expired`/Soft Block on migration day, and log the tenant for a manual follow-up notification (no automated notification is built in this slice — sending it is a manual/future step, not assumed here).
- For every `Client` with current `status == "demo"`: set new `status = "active"`, `lifecycle_state = "evergreen"`, and `trial_ends_at = null` (both conventions from ADR-0002 §9.3 applied together for clarity, rather than choosing one exclusively).
- For every `Client` with current `status` already `"active"` or `"suspended"`: `status` unchanged; `lifecycle_state` defaults to `"trial"` only via the schema default if not already set — **this default is wrong for already-active/paying-equivalent tenants** and must be reviewed manually per tenant before/after running the script (the script should print a list of these rows for manual review rather than silently guessing a Lifecycle State the data doesn't actually tell us).
- Script must be idempotent (Business Principle 7, `TENANT_LIFECYCLE_PLAN.md` Phase 0) — safe to re-run without double-applying grace-period extensions.

## 6. Required Tests

- Unit: `_assert_status_allowed`-equivalent for Lifecycle blocks `expired` on a plain route, passes for `trial`/`paid`/`grace_period`/`cancelled`/`archived`/`evergreen` (none of those last few are hard-blocked by this slice — only `expired` is).
- Integration: `expired` tenant → a route using `Depends(allow_during_soft_block)` (Settings) → succeeds. Same tenant → any other route → `403`.
- Integration: `suspended` tenant → any route → `403`, identical message/behavior to ADR-0001 today — a direct regression check, not assumed.
- Integration: cache correctness — status/lifecycle flip via the split PATCH endpoints → very next request reflects it, cache hit or miss (same test shape as `ADR-0001_PHASE_3.md`, applied to the new field from the start).
- Migration: dry-run against a copied/staging dataset (not production directly) — verify row counts before/after per category (trial/demo/active/suspended), verify grace-period extension only applied to already-past `trial_ends_at` rows, verify idempotency by running twice and confirming no double-extension.
- Regression: `registration_service.py`/`demo_service.py` — new tenant creation produces `lifecycle_state="trial"` and the same `trial_ends_at` computation as before (14 days), full existing onboarding tests (if any) still pass.

## 7. Rollback Plan

Purely additive — new column, new dependency function, new script. No existing column is renamed, dropped, or has its historical values rewritten (the migration script only rewrites `status`/`lifecycle_state`/`trial_ends_at`, which is the explicit purpose of this slice, not an unrelated destructive change). If Soft Block enforcement produces unexpected false positives in production, `_LIFECYCLE_SOFT_BLOCKED`'s check in `tenant.py` can be reverted independently of the schema/migration changes — the pieces are decoupled, same pattern as ADR-0001's rollback plan. The migration script's effects on `status`/`lifecycle_state` are the only non-trivially-reversible part; a pre-migration DB snapshot is required before running it in production (standard practice, not unique to this slice).
