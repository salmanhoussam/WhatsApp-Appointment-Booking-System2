# Gate 8 — Write Verification (Frankfurt)

**Opened 2026-09-06.** Gate 8 is the last open gate of ADR-0007. Criterion, as recorded:
**a real booking — one from the website, one from WhatsApp — confirmed written to the Frankfurt
database. No synthetic test data.**

Status: **READINESS VERIFIED / BOOKINGS PENDING.** Both write paths were probed live today and are
healthy on Frankfurt. The two bookings themselves require a real human action (a real form
submission and a real WhatsApp message) and are therefore not something this session could
manufacture without violating the gate's own "no synthetic test data" rule.

---

## Part 1 — Readiness, verified 2026-09-06

Every line below is a real command run against **production** (`dashboard.salmansaas.com`, which is
the Railway app now pointing at Frankfurt) — deliberately *not* against a local connection, per
[[credential-rotation-reaches-all-consumers]]: a check that runs from this machine's `.env` would be
probing **Sydney** and would be a green check on the wrong target.

| # | Check | Command | Result |
|---|---|---|---|
| 1 | App + DB alive | `GET /health` | `{"status":"ok","db":"ok"}` — **0.215 s** |
| 2 | Reservation read path | `GET /api/v1/public/reservations/barbers?client_slug=rk` | `200`, 1 barber (`حسين`) — **0.323 s** |
| 3 | Tenant config | `GET /api/v1/public/rk/config` | `active_services = ['whatsapp_ordering','reservations','store']` ✅ `reservations` present |
| 4 | WhatsApp webhook alive | `GET /api/v1/webhook/whatsapp?...&hub.verify_token=wrong` | `HTTP 403` — correct rejection, endpoint is serving |
| 5 | Central bot number live | `GET /api/v1/public/reservations/whatsapp-link?client_slug=rk` | `{"url":"https://wa.me/96179022398?text=حجز rk","available":true}` |

Latencies at 0.2–0.3 s are themselves corroborating evidence that these responses came from
Frankfurt, not Sydney (the Sydney baseline for the same endpoints was 1.70 s / 2.95 s).

### Path A — website booking, code-traced

`frontend/src/hooks/useReservationBooking.js` → `createReservation()` POSTs to
`/public/reservations` **before** the WhatsApp tab is navigated (lines 268-300; the blank tab is
opened synchronously first only to survive popup-blockers). So **the DB row is written server-side
regardless of what happens in WhatsApp afterwards.** A website booking is therefore a valid Gate 8
write on its own.

### Path B — WhatsApp booking, code-traced

```
customer → wa.me/96179022398  "حجز rk"
  → Meta → POST /api/v1/webhook/whatsapp   (HMAC-SHA256 verified, webhook.py:60)
  → handle_incoming_message()              (background task, returns 200 immediately)
  → _resolve_client_from_text()            (the slug token in the text picks the tenant)
  → _step_idle() → is_reservations_active(rk) == True
  → whatsapp_reservation_flow.start()      (whatsapp_flow.py:399)
  → … service → barber → date → slot …
  → reservation_service.create_reservation()   (whatsapp_reservation_flow.py:393)
```

`create_reservation()` is **the same function the website calls** — a deliberate Phase C reuse
constraint, stated in that module's own header. So Path B exercises the identical write path plus
the webhook and session layers on top.

### The one honest risk in Path B

`WHATSAPP_APP_SECRET` must be set on Railway or **every** inbound POST is rejected with 403 and the
message is silently dropped (`webhook.py:88-93` — fails closed by design). It was working on
2026-09-05 (booking `BF948302` was created through this exact path), and the Gate 6 cutover changed
only `DATABASE_URL` / `DIRECT_URL` / `SUPABASE_URL` / `SUPABASE_KEY` — so it *should* be intact. It
cannot be proven from outside without a validly-signed POST. **This is exactly what the Gate 8
WhatsApp booking tests.**

---

## Part 2 — The two bookings

### B1 — Website booking

| field | value |
|---|---|
| URL used | `https://alzabt.salmansaas.com/rk` → احجز موعد |
| reservation id | _pending_ |
| verification | `GET /api/v1/public/reservations/{id}?customer_phone={phone}&client_slug=rk` → must return `200` |
| result | _pending_ |

### B2 — WhatsApp booking

| field | value |
|---|---|
| number messaged | **+961 79 022 398** (the Central WABA number — **not** the shop's own number) |
| opening message | `حجز rk` |
| reservation id | _pending_ |
| verification | same public GET as B1 |
| result | _pending_ |

**Why the public GET closes the gate:** production reads Frankfurt. A `200` for a reservation id
that did not exist before proves the row was **written to Frankfurt**, end-to-end, through the real
stack — no local credentials required, no synthetic row inserted.

---

## Side finding — the entry-point problem (NOT a Gate 8 blocker)

Raised by Salman before this gate ran, and **confirmed in code**: the WhatsApp number shown on
tenant websites is `clients.whatsapp_number` — the **shop owner's own number**. Messages sent there
never reach our WABA, never fire the webhook, and produce **zero** database rows.

The central bot number exists and is live (check 5 above), and a helper already builds the deep link
(`whatsapp_service.build_central_booking_link()`, exposed at
`GET /public/reservations/whatsapp-link`) — but **no tenant page consumes it**. The only consumer
found in the entire frontend is `frontend/src/pages/home/DemoBuilderPage.jsx:68`.

**So: the bot is live but undiscoverable from any tenant site.**

Two clarifications that keep this from being over-fixed:

1. **The post-booking confirmation link is not a data-loss bug.** `useReservationBooking.js:293`
   messages the owner's number, but the reservation is already in the DB by then (Path A above).
   Messaging the owner there is intentional and correct.
2. **`whatsapp_service.py:82-92` already documents these as two different use cases** — "contact the
   shop" (owner's number) vs "book with the bot" (central number). This was checked and decided at
   Phase B contract time, 2026-08-24. It is not an accidental duplicate.

**Impact:** Gate 8 is unaffected — Salman can message the central number directly. The entry-point
gap is a **product/distribution** decision, deferred to its own discussion after this gate closes.
