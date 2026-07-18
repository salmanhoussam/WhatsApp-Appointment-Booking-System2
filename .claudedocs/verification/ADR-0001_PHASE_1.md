# ADR-0001 — Verification: Phase 1 — `SecurityAuditLog` Schema

Extracted from `.claudedocs/sessions/2026-07-17.md` ("الخطوة 1"), reformatted for permanent reference. No new information — see the original session log for full day-by-day narrative context.

## Files changed
`prisma/schema.prisma` — new `SecurityAuditLog` model + `securityAuditLogs` relation on `Client`.

## Execution
`prisma db push` against the real Supabase database defined in `.env` — succeeded: *"database is now in sync... Done in 15.35s"*.

## Direct evidence (queried against the real database after apply)
- Table exists: `to_regclass('public.security_audit_log')` → `security_audit_log` ✅
- All 7 columns match the design exactly (`id uuid`, `timestamp timestamptz`, `event_type text`, `client_id uuid`, `endpoint text`, `detail jsonb`, `actor text`).
- 3 indexes + primary key present: `client_id`, `event_type`, `timestamp`.
- FK on `client_id`: `confdeltype = 'n'` (SET NULL) — matches ADR-0001 §10's decision not to cascade-delete audit rows when a tenant is deleted.
- `clients` table unaffected: 15 rows (same count before and after).
- `security_audit_log` itself: 0 rows (nothing writes to it yet — behavioral impact is exactly zero, as expected for this step).
- `prisma generate` succeeded; `app.main` imports successfully afterward (16 routes, no error).

## Transparency note
The first two verification attempts via the Python client failed with "Could not connect to the query engine" — this was a transient query-engine subprocess cold-start, not a real DB connectivity issue (confirmed via a raw Python `socket` connection test and the fact that `prisma db push` via CLI succeeded on the first try). Retried and succeeded.
