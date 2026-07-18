# ADR-0001 — Verification: Phase 2 — Audit Log Write Helper

Extracted from `.claudedocs/sessions/2026-07-17.md` ("الخطوة 2" + the data-cleanup note), reformatted for permanent reference.

## File added
`app/services/security_audit_service.py` — single write function `log_security_event()`.

## Best-Effort principle (the condition for accepting this step)
No exception may reach application logic; a 3-second timeout (`asyncio.wait_for`) prevents any hang; every failure is logged internally via `logger.error` without affecting the original request's outcome; the interface is generic (`event_type` is a free-text string, no enum) so it's reusable for any future event type.

## Two real bugs found and fixed during the first actual test run (not assumed to work)
1. Passing `clientId=None` explicitly caused a Prisma engine error — fixed by building the data dict so optional fields are omitted entirely when `None`, instead of passed explicitly.
2. The optional `detail` (`Json?`) field needs explicit `Json(...)` wrapping (same pattern already used in `units.py`) — passing a raw dict fails.

## Direct evidence — 3 tests (not "tests passed," actual behavior proven)
- **Test A (happy path):** real call → `security_audit_log` goes from 0 to 1 row → the written row matches every input value exactly (`event_type`, `endpoint`, `detail`, `actor`).
- **Test B (simulated DB failure):** `prisma_client` replaced with an object that raises `RuntimeError` → `log_security_event()` did **not** raise (confirmed `False` return) → the real `security_audit_log` row count **did not change** → a `logger.error` message actually appeared in output.
- **Test C (simulated hang/timeout):** replaced with an object that sleeps 10 seconds → actual measured time was **exactly 3.00 seconds** (proof `asyncio.wait_for` genuinely intervened, not a full wait) → no exception raised → real row count unchanged.
- `app.main` imports successfully after all changes (16 routes).

## Data cleanup (not an application-logic change)
One real test row remained after Test A (`event_type=tenant_suspended, note="verification run"`). Deleted via `DELETE FROM security_audit_log WHERE endpoint='/api/v1/public/test-endpoint' AND actor='system'` — before: 1 row, after: 0 rows, confirmed by direct query. Classified purely as test-data cleanup — no code or application logic touched. Goal: the table's first permanent row should be a real security event, not a manual verification artifact.
