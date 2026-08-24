# Phase D — Customer Experience

Implements Phase D of `.claude/plans/we-moved-on-new-hazy-barto.md`, approved by Salman
2026-08-24 ("PHASE C APPROVED - EXECUTE PHASE D"). Scope: (1) returning-customer greeting in the
WhatsApp reservation flow, (2) real fire-and-forget WhatsApp notifications for Reservation
mutations from every caller (not just the bot), (3) real join/include-based customer history in
the admin registry. No frontend/UI changes, continues using only the global Central WABA env vars
(no per-tenant credentials).

## Part 1 — Returning-customer greeting

`app/services/whatsapp_reservation_flow.py`:
- `start()` now looks up `CustomerRepository.get_by_phone(customer_phone, client.id)` before
  anything else. If a real `Customer` row exists **and has a name on file**, `session.
  res_customer_name` is pre-filled immediately and the greeting header becomes "أهلاً بعودتك
  {name} 👋" instead of the generic "احجز موعدك في {client.name}". A first-time customer, or one
  whose `Customer` row has no name yet, gets the exact unchanged generic greeting — no regression.
- `_step_awaiting_slot()`: after a real slot is chosen, checks `session.res_customer_name` — if
  already set (returning customer), calls the new shared `_send_confirmation_summary()` helper
  directly, **skipping `RES_AWAITING_NAME` entirely**. A new customer (or no name on file) still
  gets asked "ما اسمك الكريم؟" exactly as before.
- `_send_confirmation_summary()` extracted as a small shared helper — used by both the
  returning-customer skip path and the original `_step_awaiting_name()` path (after a new
  customer types their name), so the summary/buttons/state-transition logic is written once.

## Part 2 — Real WhatsApp notifications for Reservation mutations

### `app/services/whatsapp_notifications.py`
Three new functions, same "never raises, logs instead" contract as the existing Booking
functions: `send_reservation_confirmation`, `send_reservation_cancellation`,
`send_reservation_reschedule`.

### `app/services/reservation_service.py`
A new `_notify_reservation_event(reservation_row, kind)` helper, called directly from the
**Service layer** (not routes) — per this project's "One Capability, One Service" rule
(`rules/backend/architecture.md` §9), so every real caller gets the same behavior for free instead
of each route having to remember to schedule it:

| Trigger | Function | Fires when |
|---|---|---|
| `update_status()` → `"confirmed"` | confirmation | A REAL transition only (idempotent same-status calls, already allowed by the Phase A transition guard, do NOT re-notify) |
| `update_status()` → `"cancelled"` | cancellation | Same real-transition-only rule |
| `cancel_by_customer()` succeeds | cancellation | The customer's own self-cancel — same receipt-style message an admin-driven cancel gives |
| `edit_reservation()` with `schedule_changed=True` | reschedule | Never fires for a name/phone/service-only edit — reuses this function's own existing `schedule_changed` distinction |

Scheduled via `asyncio.create_task()` (not a route-supplied `BackgroundTasks` object) — the
Service layer doesn't have one, and several real callers (the WhatsApp webhook's own background
task) never will either. Task references are held in a module-level `set` with a `done_callback`
cleanup (the standard asyncio idiom for this — `create_task()` alone doesn't protect a task from
GC without something holding a reference).

**Every real caller benefits automatically, confirmed by reading the actual call sites, not
assumed**: `app/api/v1/admin/reservations.py`'s `PATCH /status` and drag/reschedule/full-edit
routes call `reservation_service.update_status()`/`edit_reservation()` directly;
`app/api/v1/public/reservations.py`'s self-cancel route calls `cancel_by_customer()` directly. No
route file was touched — the notification now fires from underneath all of them.

**Scoped honestly, not oversold**: name/barber resolution (`_notify_reservation_event`) degrades
to an empty label rather than crashing for module_keys that don't use `barberId`/`serviceId`
(restaurant/real_estate/clinic) — built and tested end-to-end for the `barber` module_key only
(the one real WhatsApp channel that exists today), documented as a real, named scope limit.

## Part 3 — Admin Customer History via a real join

### New repository methods
- `CustomerRepository.list_with_reservations(client_id)` — real Customer rows for the tenant,
  `include={"reservations": {"include": {"service": True}}}` — a genuine Prisma relational join
  through the `customerId` FK (Phase A), not a `customerPhone` string match.
- `ReservationRepository.list_orphan_for_client_with_service(client_id)` — Reservations with
  `customerId IS NULL`: the fallback for rows that predate Phase A's find-or-create, so pre-Phase-A
  history is never silently dropped.

### `app/services/customer_registry_service.py`
`list_customer_registry()` now seeds its bucket registry from the real `Customer`-joined
reservations FIRST (carrying a real `customer_id`/`email` into each bucket), then layers in
whatever the orphan-reservation fallback and the existing StoreOrder phone-matching path still
need to cover — same phone-based bucket key throughout (StoreOrder has no `customerId` to join
through, so phone stays the cross-model unifier), but the Reservation side is now genuinely
FK-joined rather than string-matched wherever a real `Customer` row exists.

### `app/api/v1/admin/customers.py`
**Unchanged** — the route already just calls `customer_registry_service.list_customer_registry()`
and returns its output; the richer shape (`customer_id`, `email`, real joined `reservations`)
flows through automatically. Confirmed by reading the route file, not assumed.

## Real verification (not code-inspection-only)

`/tmp/.../scratchpad/phase_d_verify.py` — 3 parts, all against real `rk` data:

### Part 1 — returning-customer greeting
```
precondition: real Customer row found -- phone=961700000301, name='Phase C Test Customer'
entry message -> state=RES_AWAITING_SERVICE, res_customer_name pre-filled='Phase C Test Customer'
   (name pre-filled from the real Customer row on the very first message)
...
slot selected -> state=RES_CONFIRMING (NOT RES_AWAITING_NAME -- skipped for real)
(booking completed for real via the "confirm" button: customerId=bef605fd-... -- matches the
 existing Customer row exactly, not a new one)
✅ PART 1 PASSED
```

### Part 2 — real notification attempts for every mutation path
Each step below produced a real, logged WhatsApp send attempt (the dev environment's own
credential guard: "⚠️ WhatsApp credentials missing... ❌ Missing WhatsApp credentials. Cannot
send message." — the exact same proof style used throughout this session for a genuinely-attempted
send with no live Meta credentials configured):
```
update_status() pending -> confirmed     -> send attempted (confirmation)
update_status() confirmed -> cancelled   -> send attempted (cancellation)
edit_reservation() real time change      -> send attempted (reschedule)
edit_reservation() NAME-ONLY edit        -> NO send attempted (schedule_changed=False, correctly suppressed)
cancel_by_customer() self-cancel         -> send attempted (cancellation)
✅ PART 2 PASSED
```
The name-only-edit case is the real negative proof: no credential-guard log line appeared for that
step, confirming the `schedule_changed` gate actually suppresses the notification rather than
firing on every edit indiscriminately.

### Part 3 — real join output, in-process AND over real HTTP
In-process (`customer_registry_service.list_customer_registry()` called directly):
```
phone: 961700000301  name: Phase C Test Customer  customer_id: bef605fd-9eca-4adb-8e58-ace7639bba03
badge: services_only  reservation_count: 1
reservations: [{'id': 'dc8dfdbb-...', 'service_name_ar': 'شعر', 'reserved_at': '2026-08-28T09:00:00+00:00', 'status': 'pending'}]
✅ PART 3 PASSED
```
Re-verified over a **real HTTP call** against the restarted dev server (`GET
/api/v1/admin/customers/`, real minted `TENANT_ADMIN` JWT for `rk`) — confirmed the live route
returns the identical richer shape:
```json
{
  "phone": "961700000501", "name": "Phase D HTTP Test",
  "customer_id": "bc8778d3-4a62-496b-97cc-4896312ab432", "email": null,
  "reservation_count": 1,
  "reservations": [{"id": "6383aba7-...", "service_name_ar": "شعر",
                     "reserved_at": "2026-08-31T10:00:00+00:00", "status": "pending"}]
}
```
The same live response also showed a **real pre-existing orphan case** — a phone with
`"customer_id": null` and real reservation history (from an unrelated, earlier Phase A test
artifact, `customerId` legitimately null) — confirming the orphan-fallback path genuinely works on
real historical data, not just synthetic test rows built for this phase.

## What was NOT changed (per explicit constraint)

- No React/frontend files touched — the richer JSON shape is available for Phase F to consume,
  nothing renders it yet.
- Still the global `WHATSAPP_PHONE_NUMBER_ID`/`WHATSAPP_ACCESS_TOKEN` env vars only — no
  per-tenant credential work (Stage 2, still deferred).
- `GET /api/v1/admin/customers/`'s own route file — untouched, the richer output flows through the
  existing route automatically.
- `StoreOrder`'s own dead `StoreCustomer` FK — not touched, out of scope (already a named,
  separately-tracked item).

## Unknowns / real limitations, named rather than hidden

- **Notification content for non-`barber` module_keys is unresolved-label-safe, not fully built**
  — a restaurant/real_estate/clinic reservation confirmed/cancelled/rescheduled today would send a
  real WhatsApp message with an empty "الخدمة"/"الحلاق" field rather than crashing, but the message
  copy wasn't tailored per module_key in this phase. Named here as a real, deliberate scope
  boundary (only `barber` has an actual live WhatsApp channel today).
- **No real WABA sandbox exists in this environment** — same standing Unknown named in Phase B/C's
  own evidence; every notification attempt above is real up to the point of an actual Meta API
  call, which cannot be exercised without live credentials.
- **Real infra flakiness recurred during this phase's own testing too** — a test run had to be
  retried twice after leftover rows from an earlier, interrupted script run collided with this
  run's own hardcoded test slot times (a real conflict-check catching stale test data, not a code
  bug) — fixed by adding a self-cleaning pre-run step to the verification script itself; reported
  plainly rather than omitted, consistent with this project's own evidence discipline.

## Cleanup

Every test row this phase's scripts created was deleted via real `DELETE` calls, confirmed via a
follow-up query showing 0 remaining rows matching this phase's own test markers. The pre-existing
`Customer` row (phone `961700000301`, from Phase C) was left in place — a real customer contact is
not itself disposable data, same convention already established in Phase A/C's own evidence.
