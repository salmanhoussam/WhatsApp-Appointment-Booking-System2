# ADR-0001 — Verification: Phase 5 — Two-Tier Webhook Policy + §8.4a Resolution

Extracted from `.claudedocs/sessions/2026-07-17.md` (§8.4a resolution + "الخطوة 5"), reformatted for permanent reference.

## §8.4a resolution (closed before this phase's implementation, per explicit user direction to resolve it before ADR-0002)

**The conflict:** the general rule ("who initiates the connection?") would have classified `ai_settings_agent.py` as a webhook (n8n initiates the HTTP call), while §8.3 explicitly decided it should be a full-stop endpoint for the same file.

**The resolution:** §8.3 stays as-is — but the general rule itself was refined rather than overridden. The real distinguishing factor isn't "who makes the HTTP call" but "who is the actual origin of intent": Samsara/Meta are independent systems generating their own data, while n8n in `ai_settings_agent.py` is merely a transport layer for a real tenant's own direct request to change their own paid feature's settings — n8n is not the data source there, the tenant is. **Refined rule: an external system that generates its own data/events = Webhook (two-tier policy). An external system that relays a live tenant's own direct, intentional request to use a paid feature = Application Endpoint (full-stop policy), regardless of who technically makes the HTTP call.** This matches §8.3's original reasoning more precisely than the first literal test did. **§8.4a is closed — no remaining conflict.**

## Files changed
- `app/core/tenant.py` — added `is_status_blocked(status)`: a public, non-raising check for background-task contexts (after the HTTP response has already been sent, where `raise HTTPException` would be meaningless).
- `app/api/v1/webhooks/samsara.py` — `_process_event()`: ingestion always still happens (immediate 200, unchanged); only `dispatch_event()` (the actual data mutation) is blocked for suspended/expired, with an audit row logged.
- `app/services/whatsapp_flow.py` — the §4/§8.4b discovery, fully implemented: (1) removed the `isActive` filter from `_resolve_client()` entirely — the tenant is now always found regardless of status (the "always accept" half of the policy). (2) a new status gate in `_dispatch()` immediately after the client is found — if blocked, logs an audit event and returns immediately, **before** entering the stateful conversation machine that could create bookings/customers — with no reply sent to the end customer (a deliberate UX/business decision, out of scope for this ADR, documented as such).

## Direct evidence (real function calls, real database, one active tenant + one suspended tenant)

| | Active | Suspended |
|---|---|---|
| Samsara: was `dispatch_event` called? | ✅ Yes | ❌ No |
| Samsara: new audit rows | 0 | **1** (`tenant_suspended`, correct endpoint) |
| WhatsApp: did `_resolve_client` find the tenant? | ✅ Yes | ✅ **Yes** (proves "always accept") |
| WhatsApp: was `_step_idle` (the state machine) called? | ✅ Yes | ❌ No |
| WhatsApp: new audit rows | 0 | **1** (`tenant_suspended`, correct endpoint) |

## Cleanup after testing
Test tenants + audit rows — all deleted. `clients` back to 15 (original), `security_audit_log` back to 0. `app.main` imports successfully after all changes.
