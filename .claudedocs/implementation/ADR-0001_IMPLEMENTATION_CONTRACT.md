# Implementation Contract — ADR-0001 Tenant Status Enforcement

Governs implementation against `0001-tenant-status-enforcement.md`. Any change during coding gets measured against **this document**, not developer judgment in the moment.

**Status: fully executed, including the follow-up.** `app/api/v1/ai_settings_agent.py` was originally excluded from the first implementation pass pending §8.4a (see prior revisions of this file). §8.4a closed 2026-07-18 with §8.3 reaffirmed; a Post-Implementation Review then caught that the file's implementation had been missed rather than deliberately dropped, and it was implemented and verified in the same session — see the row below and the ADR's §8.3.

## Files That Will Change

| File | Change |
|---|---|
| `app/core/tenant.py` | Add `_assert_client_active(client)` — raises `403` for `status in {"suspended","expired"}`. Call from `_verify_tenant()` (before caching) and `get_current_admin_user()` (using already-loaded `user.client`). Also: `is_status_blocked()` (non-raising, for background-task webhook contexts) and `assert_client_active()` (public raising alias, for synchronous handlers holding an already-fetched `Client`, e.g. `ai_settings_agent.py` below). |
| `app/api/v1/public/__init__.py` | Migrate 7 endpoints off `find_active_client_by_slug()` onto the centralized `resolve_tenant_status()` (not `get_current_client()` as originally planned here — see the ADR's §4/Finding 2 note on why `get_current_client()` doesn't work for path-slug routes): `get_tenant_config_by_slug`, `get_listings_by_slug`, `create_booking_by_slug`, `get_price_by_slug`, `get_services_by_slug`, `get_unit_gallery`, `get_unit_calendar`. |
| `app/api/v1/webhooks/samsara.py` | Two-tier: `_process_event` keeps ingesting/storing always; the data-mutating step gets `is_status_blocked()`-gated per §8.4. |
| `app/services/whatsapp_flow.py` | Two-tier: `_resolve_client()` no longer filters by `isActive` (always finds the tenant); `_dispatch()` gates the mutating conversation flow via `is_status_blocked()` per §8.4a/§8.4b. |
| `prisma/schema.prisma` | New `SecurityAuditLog` model (§10) + migration. |
| `app/services/security_audit_service.py` (new) | Single write path for audit-log rows — called from every gate above. |
| `app/api/v1/ai_settings_agent.py` | **Follow-up, 2026-07-18:** full-stop gate via `assert_client_active()`, right after the client lookup, before `_run_claude_agent`. Implements §8.3. |

## What Will NOT Change

- JWT structure/claims — status stays a live per-request DB check (Option F rejected in ADR).
- `require_super_admin()` / super-admin flow — explicitly exempt, untouched.
- `local-agent/` — structurally cannot be affected (separate codebase, no shared imports or DB).
- `Client.isActive` column is **not removed** in this pass — §8.6's "gradual" phase-out is a separate follow-up, not bundled here. It is not read by any new code written in this pass either.
- No middleware, no DB-level RLS/triggers (Options A/E rejected).
- No change to `SamsaraEvent` or its existing write path — `SecurityAuditLog` is additive and separate.
- No retention/archival job built yet — the 90-day policy (§8.8) needs one, out of scope for this pass.
- No `requestId` field populated — **confirmed via `grep`: no request-ID convention exists anywhere in this codebase today.** Field is either dropped from v1's `SecurityAuditLog` row or a minimal convention is introduced as an explicit, separate decision — not assumed here.

## Required Tests

- Unit: `_assert_client_active` raises `403` for `suspended`/`expired`, passes silently for `active`/`trial`/`demo`.
- Integration: suspended tenant → public endpoint (one of the migrated 7) → `403` + one `SecurityAuditLog` row written.
- Integration: suspended tenant → admin endpoint (via `get_current_admin_user`) → `403` + audit row.
- Integration: suspended tenant → Samsara webhook → event still stored, mutating step blocked, audit row written.
- Integration: suspended tenant → WhatsApp webhook → same pattern.
- Cache: status flip via `PATCH /clients/{id}/status` → very next request blocked (confirms existing `invalidate_tenant_cache` call still does its job with the new check added downstream of it).
- Regression: full existing test suite (if any) + manual smoke test on `active`/`trial`/`demo` tenants across all 6 touched files — zero false positives.
- Super admin: confirm `require_super_admin()` path is entirely unaffected (no `Client.status` read anywhere in that function).

## Success Criteria

- A tenant set `suspended` or `expired` is blocked on the next request across all 6 changed files, with real evidence (not assumed) — one test per file above passing.
- Samsara/WhatsApp events from a suspended tenant are still accepted (`200`/ack) with zero data mutation.
- Every denial produces exactly one `SecurityAuditLog` row with correct `eventType`/`clientId`/`endpoint`/`detail`.
- Zero behavior change for `active`/`trial`/`demo` tenants anywhere touched.
- Super admin account is never blocked under any status value, verified explicitly.

## Rollback Plan

- All changes are additive (new function, new call sites, new table) — no destructive migration, no data rewritten. A `git revert` of the implementation commit(s) is sufficient; no data-migration undo is needed.
- If `_assert_client_active` produces unexpected false positives in production, the two call sites in `tenant.py` can be reverted independently of the webhook/audit-log changes — the pieces are decoupled, not one atomic change.
- `SecurityAuditLog` can be left in place unused (or the table dropped) without affecting enforcement itself if it turns out to be unnecessary — logging and enforcement are separate concerns, confirmed decoupled in §10's design.
