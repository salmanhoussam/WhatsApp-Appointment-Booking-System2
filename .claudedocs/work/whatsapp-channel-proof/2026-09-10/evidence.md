# Phase 0 — Channel Proof · Evidence
**Date:** 2026-09-10 · **Tenant:** `barberlab-test` (RK explicitly excluded by Salman) · **Commits:** `7910d8a`, `d49ec06`

## Confirmed Findings

### C1 — A real inbound booking completed end-to-end through the bot
Read from production (`_db_target.resolve(direct=True)`), compared against a baseline snapshot
taken before the run (`scratchpad/barberlab-test.baseline.json`).

| table | before | after |
|---|---|---|
| `reservations` | 2 (both `cancelled`, Aug) | **3** |
| `customers` | 0 | **1** |
| `whatsapp_sessions` | 0 | 0 — see C3 |

```
id             0b803353-dd18-489e-a279-fcf348697679
customer_name  Houssam          customer_phone  96178727986
reserved_at    2026-09-10 12:00:00+00:00        duration_min 30
status         pending          barber Rami      service قص شعر
created_at     2026-09-10 05:31:29.935000+00:00
```
The reference shown in the chat (`0B803353`) equals `id[:8].upper()` — the same row, not a
similar one. The bot is the only path that reaches `create_reservation` from WhatsApp, so this
row is itself proof the inbound webhook was received and dispatched.

### C2 — Deploy verified by behaviour, not elapsed time
`index-OWYQJNkp.js → index-C4Y7Rx4i.js`, `GenericAdminDashboard-CDVift63.js → 4hXAF8Kc.js`,
and the new banner string present in the deployed chunk at +90s. `/health` `{"status":"ok","db":"ok"}`.
Webhook GET with a wrong verify token → 403; POST with no signature → 403.

### C3 — `whatsapp_sessions` is deleted on success; my predicted artifact was wrong
I stated before the run that a session row would appear and prove the webhook arrived. It does not.
`_step_confirming` calls `clear_session_fn` on a successful booking
(`whatsapp_reservation_flow.py:419`), and the repo's `delete()` removes the row. Zero rows is
therefore the *correct* outcome for a completed booking, not a failure. Recorded because the
prediction was wrong, not because the system was.

### C4 — R2 (timezone) confirmed on live data, not just read in code
`reserved_at` stored `12:00:00+00:00`. The customer picked **12:00 Beirut**, which is 09:00 UTC
(EEST, UTC+3). The offset is proven independently by the same row: `created_at 05:31:29 UTC`
against the chat's own `08:31` timestamp.

So Beirut wall-clock is being labelled UTC (`reservation_service.py:555-563`). It is *self-
consistent* today — generation, storage and `strftime` display all skip conversion — and becomes
wrong the moment anything genuinely converts or compares against a real UTC `now()`. This is the
bug class Phase 1's gate is written to guard against; it is now evidenced, not predicted.

### C5 — `WHATSAPP_CENTRAL_NUMBER` is configured on production
`GET /api/v1/public/reservations/whatsapp-link?client_slug=barberlab-test` →
`https://wa.me/96179022398?text=حجز barberlab-test`, `available: true`. Audited behaviourally;
no secret value was read.

## Side Findings

- **G1 reproduced structurally.** Rami works 10:00–20:00; a 30-minute service yields 20 slots and
  `slots[:10]` shows 10. Everything from 15:00 onward was invisible during this run. The customer
  chose 12:00, inside the visible window, so the cut was silent — which is exactly the complaint.
- **G2 exercised.** The date had to be typed; there is no picker.
- `barberlab-test` has `barber_services = 0`, and the booking still worked — the soft-filter
  fallback (`whatsapp_reservation_flow.py:204-217`) shows the full barber list when a service has
  no assignments.

## Unknowns

- **The Meta error code is not observed.** No Railway CLI and no `RAILWAY_*` token exist in this
  environment, so server logs cannot be read from here. The merchant alert for this booking went to
  `barberlab-test`'s owner number `+9613300771122`, which is not a real WhatsApp number, so a
  rejection is expected and its code would exercise the new capture path — unverified.
- **No `statuses[]` payload observed** (Step 7), and **no outbound test outside the 24-hour window**
  (Step 8). Both held at Salman's explicit instruction pending his reading of the logs.
- Therefore **Gate 0 remains OPEN**: 3 of its 5 conditions are closed.
