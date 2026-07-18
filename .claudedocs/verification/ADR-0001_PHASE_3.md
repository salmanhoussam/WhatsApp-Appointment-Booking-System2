# ADR-0001 — Verification: Phase 3 — Centralized Enforcement (`_assert_client_active`)

Extracted from `.claudedocs/sessions/2026-07-17.md` ("الخطوة 3"), reformatted for permanent reference. This phase found and fixed a genuine bug before the step was accepted, not after.

## File changed
`app/core/tenant.py` — two new functions (`_assert_status_allowed`, `_assert_client_active`), called from `_verify_tenant()` and `get_current_admin_user()`.

## 🐛 Real bug discovered and fixed (before this step was accepted, not after)
The first real end-to-end HTTP test revealed all four status cases returning 200 — including `suspended` and `expired`. Root cause: the status check only ran on a **cache miss** (first fetch); on a **cache hit**, the function returned the cached tenant dict directly **with no status re-check at all**. So a tenant whose status changed after it was already cached (5-minute TTL) would bypass enforcement for the remainder of that window, even if `invalidate_tenant_cache()` had been called — because the test server process and the test script process were separate. This exposed a real design flaw: relying entirely on invalidation being called from every future status-mutating code path is exactly the "remember to do it everywhere" fragility Finding 2 already warned about.

**Fix:** store `status` alongside the tenant dict in the cache (a 3-tuple instead of 2), and re-check it on every call — cache hit or miss, not only on first fetch.

## Direct evidence of the fix (same-process test, isolated from the caching issue itself)
- Call 1 (miss, `status=active` in DB) → succeeded, cached with `status='active'`.
- Call 2 (hit, same slug, within TTL) → succeeded (proves the fix didn't break normal behavior).
- The cached status was manually corrupted to `'suspended'` **without** touching the DB and **without** calling invalidation (to isolate the hit-path specifically).
- Call 3 (hit, cached status now `suspended`) → **actually rejected with 403** — direct proof the cache-hit path now re-checks status, unlike the pre-fix behavior.

## Required test matrix (4 statuses, real HTTP server, real endpoint `/api/v1/public/catalog/categories`, 4 isolated test tenants)

| Status | Actual HTTP code | Actual message | Audit before | Audit after | Audit rows created |
|---|---|---|---|---|---|
| `active` | **200** | `{"success": true, "data": []}` | 0 | 0 | 0 |
| `trial` | **200** | `{"success": true, "data": []}` | 0 | 0 | 0 |
| `suspended` | **403** | `"This tenant account has been suspended. Contact support for assistance."` | 0 | **1** | `{event_type: tenant_suspended, endpoint: /api/v1/public/catalog/categories}` |
| `expired` | **403** | `"This tenant's subscription has expired. Please renew to restore access."` | 0 | **1** | `{event_type: tenant_expired, endpoint: /api/v1/public/catalog/categories}` |

## Cleanup after testing (test data only)
4 test tenants + their `ClientService` rows + related audit rows — all deleted. Confirmed: `clients` back to 15 rows (original count), `security_audit_log` back to 0 rows. The HTTP test server was not running before this step — started for testing, stopped afterward (original state restored). `app.main` imports successfully after all changes (16 routes, no error) — before and after the bug fix.
