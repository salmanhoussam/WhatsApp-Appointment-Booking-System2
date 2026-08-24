# Phase C — Reservation Integration & State Machine

Implements Phase C of `.claude/plans/we-moved-on-new-hazy-barto.md`, approved by Salman
2026-08-24 ("PHASE B APPROVED - EXECUTE PHASE C"). Scope: (1) close the Study 6 double-booking
race condition before anything else, (2) build the "احجز موعد" WhatsApp conversation branch,
strictly reusing existing public functions. No frontend/UI changes (explicit constraint).

## Part 1 — Closing the race condition

### What was tried first, and rejected on real evidence

A PostgreSQL advisory-lock approach (`pg_advisory_xact_lock`, scoped to `(client_id, barber_id)`,
held for the read-conflict-check + write span inside a `db.tx()` interactive transaction) was the
first candidate — theoretically correct, needs no schema change. **Directly measured against this
project's real pooled Supabase connection (`DATABASE_URL`, pgbouncer transaction mode, port 6543)
and disproven**: two concurrent transactions both acquired the "same" advisory lock key while the
first still held it (real timing measurement — the second transaction should have blocked for
~1.7s and instead returned in ~0.7s). Abandoned per this project's own verify-before-trust
discipline rather than shipped on the strength of the general pattern being theoretically sound.

### What was built instead — a real DB-level partial unique index

`prisma/migrations/add_reservation_barber_slot_unique_index.sql`:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS reservations_active_barber_slot_uidx
ON reservations (client_id, barber_id, reserved_at)
WHERE status IN ('pending', 'confirmed', 'arrived') AND barber_id IS NOT NULL;
```
Applied directly against the live DB (not expressible in `schema.prisma`'s DSL — no
partial/filtered-index support there; same raw-SQL convention as `add_unit_type.sql`/
`add_tenant_config.sql`/`add_reservation_customer_id.sql` before it). Enforced natively by
Postgres's B-tree index at INSERT time, regardless of connection pooling — no isolation-level or
pooler-mode fragility, unlike the advisory-lock attempt.

`app/services/reservation_service.py` — `create_reservation()`'s `repo.create(create_data)` call
is now wrapped in `try/except UniqueViolationError`, translated into the exact same customer-facing
message the existing pre-check already gives ("This barber is already booked for that time...").
Callers (website, WhatsApp) see one consistent behavior whether the conflict was caught early (the
common case) or only at the DB (the actual race case this closes).

**Known, accepted boundary** (documented in the migration file itself): this closes the race for
identical `reserved_at` collisions — which is what this system's real booking flow always produces
(`get_available_slots()` only ever offers grid-aligned candidate times), not the fully general
"any overlapping duration" race, which would need a GiST exclusion constraint over a derived time
range (needs `btree_gist`, not pursued without a confirmed real need for that). Scoped to the
`barber` module_key only (Study 6's own finding) — the resource-backed `clinic` path has the
identical theoretical race, named as a deliberate out-of-scope follow-up, not silently ignored.

### Real BEFORE/AFTER proof

`/tmp/.../scratchpad/race_condition_before_after.py` — two genuinely concurrent
`reservation_service.create_reservation()` calls (`asyncio.gather`) for the exact same real
barber (`rk`'s جعفر) and the exact same future slot:

```
BEFORE the index existed:
  ('A', 'SUCCESS', 'd7606ccf-...')
  ('B', 'SUCCESS', '50b31a71-...')
  2/2 concurrent requests SUCCEEDED for the identical slot.
  ✅ Race REPRODUCED as expected (double-booking confirmed real, not theoretical).

AFTER the index + translation were added:
  ('B', 'SUCCESS', '7fa8145e-...')
  ('A', 'REJECTED', 'This barber is already booked for that time. Please choose a different time.')
  1/2 concurrent requests SUCCEEDED for the identical slot.
  ✅ Race CLOSED as expected -- exactly one booking succeeded, the other cleanly rejected.
```
Both runs' test rows deleted immediately after (real `DELETE`, confirmed 0 leftover rows before
moving on).

## Part 2 — The "احجز موعد" WhatsApp conversation branch

### New file: `app/services/whatsapp_reservation_flow.py`

A sibling module to `whatsapp_flow.py`, not folded into it — same precedent this codebase already
follows for the Barber vs. Clinic conflict-check paths in `reservation_service.py` ("own file per
real case, built as if the other didn't exist"), applied here to keep the pre-existing Booking/
Property engine's conversation code completely undisturbed. 6 new states
(`RES_AWAITING_SERVICE/BARBER/DATE/SLOT/NAME`, `RES_CONFIRMING`), dispatched from
`whatsapp_flow._dispatch()` via one delegated branch.

**Strict reuse, zero duplicated booking/availability logic** (per the explicit constraint):
| Step | Reused function | Duplicated? |
|---|---|---|
| Service list | `catalog_service_service.public_list_services()` | No |
| Barber list + soft filter | `barber_repo.list_barbers()` + `barber_service_repo.list_barber_ids_for_service()` | No — same fallback-to-full-list rule as `GET /public/reservations/barbers` |
| Slot list | `reservation_service.get_available_slots()` | No |
| Booking confirm | `reservation_service.create_reservation()` | No — the SAME function the website's `POST /public/reservations/` route calls, already Customer-aware (Phase A) and now race-protected (Part 1 above) |

### `whatsapp_flow.py` changes (small, additive)

- `ConversationSession` gained 7 new `res_*` fields (service/barber/slot/name-in-progress) —
  nothing above them touched.
- `_step_idle()`: checks `whatsapp_reservation_flow.is_reservations_active(client.id)` first: if
  active, routes into the new branch; otherwise falls through to the pre-existing property-list
  flow, byte-for-byte unchanged. **Real, confirmed via a live DB check before writing this**: no
  tenant today has both a Property row and an active `reservations` service simultaneously (`smar`
  has 1 Property row and no `reservations` service; `rk`/`mr-h` have `reservations` active and 0
  Property rows) — a hard either/or, not a menu, is a deliberate v1 scope choice, not an oversight.
  Documented here rather than hidden. This also fixes a real pre-existing dead-end: before this
  phase, a barbershop customer messaging the bot got "لا توجد وحدات متاحة حالياً" (no properties) —
  a side-effect fix, not the point of this phase, noted rather than silently absorbed.
- `_dispatch()`: one new `elif session.state in whatsapp_reservation_flow.STATES` branch,
  delegating to the new module's own `handle()`.

### Validation & edge cases (explicit ask)

- **No available slots**: `NO_SLOTS_MESSAGE` mirrors the public booking page's own copy
  ("لا توجد مواعيد متاحة... جرّب يوماً آخر") and the conversation **stays on `RES_AWAITING_DATE`**
  rather than dead-ending — the customer can immediately try another date.
- **Free-text garbage at any step**: every `RES_*` handler checks `msg_type` first; a mismatch
  re-prompts with the same message and leaves `session.state` untouched — the exact pattern every
  existing Booking-engine step handler already uses, applied consistently here.
- **A race/conflict surfacing at confirm time** (the new unique-index rejection, or any other
  `ValueError` from `create_reservation()`): friendly message, back to `RES_AWAITING_DATE` with
  service/barber context kept — the customer picks a new time without restarting the whole flow.

## Real end-to-end verification (not code-inspection-only)

`/tmp/.../scratchpad/phase_c_full_conversation.py` — drives the **actual**
`handle_incoming_message()` webhook pipeline with real Meta-shaped payloads, against real `rk`
services/barbers, in 3 scenarios:

### Scenario 1 — full happy path, garbage-input resilience, real DB proof
```
1. entry "حجز rk"                          -> RES_AWAITING_SERVICE
2. garbage text                             -> RES_AWAITING_SERVICE (unchanged -- re-prompted)
3. real service selected                    -> RES_AWAITING_BARBER
4. real barber selected                     -> RES_AWAITING_DATE
5. garbage date text                        -> RES_AWAITING_DATE (unchanged -- re-prompted)
6. real but PAST date                       -> RES_AWAITING_DATE (unchanged -- rejected)
7. real future date (18 real slots fetched) -> RES_AWAITING_SLOT
8. real slot selected                       -> RES_AWAITING_NAME
9. too-short name "A"                       -> RES_AWAITING_NAME (unchanged -- re-prompted)
10. real name                               -> RES_CONFIRMING
11. free text instead of a button           -> RES_CONFIRMING (unchanged -- re-prompted)
12. confirm button                          -> session cleared

Real DB row created:
  moduleKey  = barber            status     = pending
  barberId   = c75b89c3-...      (matches selected barber)
  serviceId  = 71502964-...      (matches selected service)
  customerId = bef605fd-...      (non-null -- Phase A find-or-create fired for real)
  reservedAt = 2026-08-26T09:00:00+00:00
✅ SCENARIO 1 PASSED
```

### Scenario 2 — closed day, graceful fallback, conversation recovers
```
closed-day date (real future Monday, حسين's own real closed_days) -> STAYS on RES_AWAITING_DATE
followed immediately by a real open date                          -> RES_AWAITING_SLOT
✅ SCENARIO 2 PASSED
```

### Scenario 3 — a real race surfacing mid-conversation
```
Walked a real WhatsApp conversation up to RES_CONFIRMING for a specific slot, then a SECOND,
independent create_reservation() call (simulating a faster competing booking) took the exact
same slot for real. The WhatsApp customer then pressed confirm:

confirm after losing the race -> falls back to RES_AWAITING_DATE (not a crash, not a dead-end)
the losing customer's phone has NO Reservation row in the DB (confirmed via a real query)
✅ SCENARIO 3 PASSED
```

All test rows across all 3 scenarios deleted afterward (`notes` containing `"Phase C Test"`,
confirmed 0 leftover rows via a real DB read after cleanup).

### Live HTTP-level confirmation (not just the in-process script)

Backend restarted to load the new code; real `curl -X POST /api/v1/webhook/whatsapp` with a
`"حجز rk"` message reached the real route → real dispatch → real tenant resolution → real
`reservations`-service check → real `whatsapp_reservation_flow.start()` (confirmed via the
server's own log reaching the credential-guarded send attempt, same proof style as Phase B's
evidence).

## What was NOT changed (per explicit constraint)

- No React/frontend files touched.
- `catalog_service_service.public_list_services()`, `barber_repo.list_barbers()`,
  `barber_service_repo.list_barber_ids_for_service()`, `reservation_service.get_available_slots()`,
  `reservation_service.create_reservation()` — all called as-is, zero modification beyond Part 1's
  race-condition fix (which benefits every caller, not just WhatsApp).
- `whatsapp_flow.py`'s existing Booking/Property engine states and handlers — completely
  untouched beyond the one new `_step_idle()` branch-point and the one new `_dispatch()` delegate
  line.

## Unknowns / real limitations, named rather than hidden

- **No real WABA sandbox exists in this environment** — same Unknown Phase B's evidence already
  named; every check above is real (real DB, real webhook route, real conversation logic) except
  an actual inbound message from a real WhatsApp client. Still open until Stage 1 goes fully live.
- **Transient infrastructure hiccups during this phase's own testing**: one connection-pool
  timeout (`P2028`-adjacent, "Timed out fetching a new connection from the connection pool... pool
  timeout: 10, connection limit: 5") and one query-engine spawn failure occurred while running many
  rapid successive test scripts back-to-back against the dev pool — both resolved on retry with no
  code change, consistent with this project's own already-documented "recurring unrooted Supabase
  pooler flakiness." Reported plainly rather than omitted; neither reproduced against the actual
  Phase C logic itself (both happened in test-harness connection setup, not inside
  `create_reservation()`/the conversation flow).
- **No menu when a tenant has both Property rows and `reservations` active** — a real, deliberate
  v1 scope limit (see above), not currently exercised by any real tenant, worth a small explicit
  decision if that combination ever becomes real.
- **The resource-backed `clinic` path's identical theoretical race** was not closed in this phase
  — named as an explicit, deliberate follow-up (Study 6's own scope was `barberId`/`reservedAt`),
  not silently left unaddressed.

## Cleanup

Every test row this phase's scripts created (race-condition probes, all 3 conversation scenarios)
was deleted via real `DELETE` calls, confirmed via a real follow-up query showing 0 rows matching
`"Phase C Test"`/the race-probe's own notes marker. No Property/Customer/other table was touched
beyond the `Reservation` rows and the `Customer` rows Phase A's own find-or-create legitimately
created for the test phone numbers used (left in place — a real customer contact, even from a test
booking that later gets deleted, is not itself disposable data by this project's own established
convention).
