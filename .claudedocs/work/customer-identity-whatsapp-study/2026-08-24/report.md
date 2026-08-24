# Customer Identity + WhatsApp Booking Study

Read-only architecture study, requested by Salman 2026-08-24. No code, schema, database, or
WhatsApp configuration was touched. No secret values were read, printed, or requested — only
environment variable *names* are referenced below, confirmed to exist by checking
`app/core/config.py`'s own field definitions, never by reading `.env` contents (confirmed no
`.env` file exists in this environment; the shell has no `WHATSAPP_ACCESS_TOKEN` set either —
checked for presence only, never for value).

Every claim below is tagged **CONFIRMED** (read directly from a real file), **INFERRED**
(a reasonable conclusion from confirmed facts, stated as such), or **UNKNOWN** (genuinely not
determinable from this repository alone).

---

## 1. Executive Verdict

**HYBRID.** Introduce a real `Customer` entity as the canonical identity for the Reservation
Engine, while `Reservation` keeps its own `customer_name`/`customer_phone`/`customer_email` as a
historical snapshot at booking time. This is not a new idea for this codebase — it is the exact
pattern already built, live, and working for the *other* booking engine (`BookingService.
create_booking()`, **CONFIRMED**, `app/services/booking_service.py:12-51`): find-or-create a
`Customer` by `(phone, clientId)`, then write the booking referencing `customer.id`, while the
booking row itself keeps its own `customer_name`/`phone` fields too. Applying the same shape to
`Reservation` is reuse of a proven pattern, not new architecture.

**On WhatsApp specifically**: a full, real, working inbound WhatsApp Cloud API booking flow
**already exists** in this repository — but it books `Unit`/`Property` (the old real-estate
engine), not `Reservation` (the Barber/Clinic engine). It already contains the exact find-or-create
Customer logic Question A asks about (**CONFIRMED**, see §5). No new WhatsApp infrastructure needs
to be invented — the gap is a second conversation branch that resolves service/barber/slot and
calls `reservation_service.create_reservation()` instead of `BookingService.create_booking()`, plus
wiring `Reservation.customerId` the same way `Booking.customerId` already works.

---

## 2. Current Identity Model

**CONFIRMED**, from `prisma/schema.prisma` and live code read this session and the prior audit:

| Entity | Identity shape |
|---|---|
| `Client` | The tenant. `phone` is unique — this is the field the existing WhatsApp flow matches an incoming WABA number against (§6). |
| `User` | Dashboard login (`email`+`password_hash`+`role`), optionally linked 1:1 to a `Barber` via `barberId`. |
| `Barber` | Staff with a calendar. No auth fields. |
| `Customer` | `id`, `clientId`, `phone`, `name?`, `email?`. Real model, real table, **used by the `Booking` engine, unused by the `Reservation` engine** (confirmed both directions this session — the guest-booking audit found zero `Customer` writes from `create_reservation()`; this study found real `Customer` writes from `BookingService.create_booking()`). |
| Public guest (Reservation Engine) | No identity row at all — just string fields on `Reservation`. |
| WhatsApp sender (Booking Engine) | A real `Customer` row, found-or-created by phone — see §5. |

---

## 3. Current Reservation Lineage

**CONFIRMED**, from `app/services/reservation_service.py:164-293` (re-verified this session, same
finding as the prior audit): `create_reservation()` writes `customerName`/`customerPhone`/
`customerEmail` directly onto `Reservation` as plain columns. `Reservation` has **no `customerId`
column at all** in the schema (`prisma/schema.prisma:768-829`) — not nullable-and-unused, genuinely
absent. Real FKs that do exist on `Reservation`: `barberId`, `serviceId`, `resourceId` — all added
across real, dated phases (Phase 3.7C for `serviceId`, 2026-07-31 for `barberId`).

---

## 4. Current Customer Table Usage

**CONFIRMED**, two independent real write paths found this session:

1. `BookingService.create_booking()` (`app/services/booking_service.py:19-25`) — real
   find-or-create: `customer_repo.get_by_phone(phone, client_id)`, create if not found. Used by
   the WhatsApp booking flow (§5) and presumably smar's own web booking flow (not re-traced this
   pass, out of this study's scope).
2. `CustomerRepository.upsert_system_customer()` (`app/repositories/customer_repo.py:26-36`) — a
   deterministic "Admin Block" system customer, used for admin-created calendar blocks. Narrow,
   unrelated to guest identity.

**Zero** write paths from the Reservation Engine (**CONFIRMED**, both this study and the prior
audit's live DB read: 0 `customers` rows for `rk` despite real reservation activity).

---

## 5. WhatsApp Integration Inventory

Full repository grep performed (`whatsapp`, `WhatsApp`, `wa.me`, `graph.facebook.com`, `WHATSAPP_`,
`webhook`, `verify_token`, `phone_number_id`, `WABA`, `access_token`) — **three distinct, real,
already-built WhatsApp touchpoints found**, none of them stubs:

### Touchpoint 1 — Outbound-only `wa.me` deep links (Reservation Engine, Store)
**CONFIRMED**, `frontend/src/hooks/useReservationBooking.js:243-269` and the earlier session's own
`CartPage.jsx` work: a pre-filled `https://wa.me/{number}?text=...` link the *customer's own
browser* opens — no Cloud API call, no webhook, no server involvement at all beyond building the
URL. This is the only WhatsApp touchpoint the Reservation Engine has today.

### Touchpoint 2 — Real outbound Cloud API sending (`WhatsAppService`)
**CONFIRMED**, `app/services/whatsapp_service.py` (77 lines, full file read): a real client for
`https://graph.facebook.com/v18.0/{phone_number_id}/messages`, using `Bearer {access_token}` auth,
supporting `send_text`, `send_interactive_buttons`, `send_list_message`. Consumed by
`app/services/whatsapp_notifications.py` (booking confirmation/cancellation messages) and by the
inbound flow below. **Currently dormant in this environment** — `WHATSAPP_ACCESS_TOKEN`/
`WHATSAPP_PHONE_NUMBER_ID` are unset (confirmed by presence-check only), so every send would hit
the code's own early-return guard (`whatsapp_service.py:16-17`) and log a warning, not actually
call Meta. The code itself is real and would work the moment real credentials are set — "dormant,"
not "fake."

### Touchpoint 3 — Real inbound webhook + full conversational booking state machine
**CONFIRMED**, `app/api/v1/webhook.py` (70 lines, full file read) + `app/services/whatsapp_flow.py`
(579 lines, full file read):
- `GET /api/v1/webhook/whatsapp` — real Meta verification challenge handler, checks
  `hub.verify_token` against `settings.WHATSAPP_VERIFY_TOKEN`.
- `POST /api/v1/webhook/whatsapp` — receives real Meta message payloads, dispatches to
  `handle_incoming_message()` as a `BackgroundTask` (correctly returns 200 immediately, per Meta's
  own 20-second requirement).
- A real, complete state machine (`IDLE → AWAITING_PROPERTY → AWAITING_UNIT → AWAITING_CHECKIN →
  AWAITING_CHECKOUT → AWAITING_GUESTS → AWAITING_NAME → CONFIRMING → booking created`) — but this
  books a `Unit`/`Property` via `BookingService.create_booking()`, **the old real-estate engine,
  not the Reservation Engine.** No branch anywhere in this file references `Barber`,
  `CatalogService`, or `reservation_service`.
- **Real, working find-or-create Customer logic already lives here** — this IS the reference
  implementation Question A/G ask about, already proven in production shape.
- Session state is an **in-memory dict** (`_sessions`, `whatsapp_flow.py:101`), 30-minute TTL, keyed
  by `(phone_number_id, customer_phone)` — **not persisted to any table.** A server restart drops
  every in-flight WhatsApp conversation silently. Real limitation of the existing code, not a new
  finding to fix now — named because any Reservation-engine WhatsApp flow inherits this same
  characteristic if it reuses this session-store pattern.

### Existing environment variables (names only, confirmed present in `app/core/config.py`, values
never read)
```
WHATSAPP_VERIFY_TOKEN         (config.py:71 — has a production-guard against the literal default)
WHATSAPP_ACCESS_TOKEN         (config.py:72 — Optional, unset in this environment)
WHATSAPP_PHONE_NUMBER_ID      (config.py:73 — Optional, unset in this environment)
WHATSAPP_BUSINESS_ACCOUNT_ID  (config.py:74 — Optional, i.e. the WABA ID)
WHATSAPP_API_VERSION          (config.py:75 — hardcoded default "v18.0", not read from env)
```
No `META_*`-prefixed variables exist anywhere in the codebase (**CONFIRMED**, grep returned zero
matches for that prefix).

### Real, but out of this study's scope (found, not investigated further)
`app/api/v1/onboarding.py`'s `POST /webhook/onboarding/process` and
`app/api/v1/ai_settings_agent.py`'s `POST /webhook/ai-settings` — both mounted under the same
`/api/v1/webhook` prefix (`main.py:74-75`) but on distinct paths (no collision with `/whatsapp`).
**INFERRED** from filenames/route names and this project's own CLAUDE.md agent inventory (كونان —
"Extracts onboarding data from WhatsApp conversations into tenant-ready JSON") that these serve
tenant *onboarding* conversation extraction, not customer booking — not read in full, named here
only so their existence is on record and not confused with Touchpoint 3.

**Direct answers to Question F:**
1. Real, substantial functionality already exists — not a stub.
2. Not outbound-only — genuine bidirectional (inbound webhook + outbound Cloud API sends).
3. Yes, real inbound webhook handling exists (`app/api/v1/webhook.py`).
4. Yes, a real WhatsApp booking flow exists — for `Booking`/`Unit`, not `Reservation`.
5. Yes, real customer-matching logic exists (`BookingService.create_booking()`), reusable as a
   pattern.
6. No — nothing in this repository creates a `Reservation` row from WhatsApp today.
7. `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
   `WHATSAPP_BUSINESS_ACCOUNT_ID` (names only).
8. All of Touchpoints 1-3 are real, live code, not dead/legacy — Touchpoint 2's *credentials* are
   unconfigured in this dev environment, which is an operational/config state, not a code-quality
   judgment.

---

## 6. WhatsApp Sender Identity Model

**CONFIRMED**, from the real Meta webhook payload shape `whatsapp_flow.py` already parses
(`handle_incoming_message`, lines 159-180, and `_extract_message`, lines 121-144):

1. **What identifier do we reliably receive for the sender?** `msg.get("from")` — the sender's
   WhatsApp phone number (E.164-ish digits, no `+`), read directly off every real incoming message
   payload. **CONFIRMED** as the only sender identifier this code reads or relies on.
2. **Is the phone number available?** Yes, always, on every message (`msg["from"]`) — this is a
   guaranteed field of the Cloud API message payload, not optional. **CONFIRMED** by how
   unconditionally the existing code reads it (no null-check on `msg.get("from", "")`'s result
   before using it as a dict key).
3. **Is the WhatsApp display/profile name reliable enough as canonical name?** **Not addressed by
   the existing code at all** — `whatsapp_flow.py` never reads `value["contacts"][0]["profile"]
   ["name"]` (a real, separate field the Cloud API payload does include, per Meta's own documented
   webhook shape — **INFERRED** from Meta's public webhook documentation, not verified against a
   real captured payload in this repository, since none exists locally). The existing flow instead
   *asks the user to type their name* (`AWAITING_NAME` state) rather than trusting the WhatsApp
   profile name — a deliberate, already-proven design choice worth keeping: a WhatsApp display
   name is often a nickname/emoji/business name, not necessarily what a customer wants on record
   for a booking.
4. **Should phone number be the primary matching key?** Yes — this is exactly what
   `CustomerRepository.get_by_phone()` already does, and it's the only stable identifier item 1-2
   confirm we reliably get. **INFERRED as correct** from the existing proven pattern, not
   independently re-derived.
5. **Should a WhatsApp-specific identifier be stored separately?** Meta's payload also carries a
   `wa_id` (WhatsApp ID) alongside phone, which is typically identical to the phone number today
   but is technically a separate field in Meta's schema (**INFERRED** from general Cloud API
   knowledge — not confirmed against a captured payload in this repo). The existing code doesn't
   store it separately; recommend not inventing a new column for it now (no evidence it diverges
   from phone in practice) — a `metadata.wa_id` key would be the low-risk place to keep it if it's
   ever needed, not a new `Customer` column.
6. **Same phone number contacts two tenants — what happens?** **CONFIRMED real gap** in the
   existing tenant-resolution logic: `_resolve_client()` (`whatsapp_flow.py:525-544`) matches the
   WABA's own `display_phone_number` → `Client.phone`, which correctly identifies *which business*
   is being messaged (each tenant would have its own WhatsApp Business number). The *customer's*
   phone number is looked up scoped by `clientId` (`get_by_phone(phone, client_id)`,
   `booking_service.py:20-22`) — so the same customer phone contacting two different tenants
   correctly produces two independent `Customer` rows, one per tenant. **Tenant isolation for
   customer identity is already correctly designed**, confirmed by reading the actual query.
7. **How is `client_id` isolation guaranteed?** Via the WABA number, not the customer's number —
   every message arrives tagged with `metadata.phone_number_id`/`display_phone_number`, which the
   code resolves to exactly one `Client` before anything else happens (`_dispatch()`,
   `whatsapp_flow.py:194-198`). **CONFIRMED, real, correct.**
8. **Customer already exists from a website booking — what happens?** For the *Booking* engine:
   correctly reused — `get_by_phone()` finds the existing row regardless of which channel created
   it, since both would go through `client_id`+`phone`. For the *Reservation* engine: not
   applicable today, since it has no Customer lookup of any kind (§3/§4).
9. **First contact via WhatsApp, books via website later?** Same answer as #8 for the Booking
   engine — the phone-keyed lookup is channel-agnostic by construction, this is not a gap.
10. **WhatsApp phone number changes?** **UNKNOWN / not handled anywhere in this codebase.** No
    code path updates an existing `Customer.phone`, and a changed number would simply create a
    *new* `Customer` row on next contact (since the old row wouldn't match). This is a real,
    inherent limitation of phone-as-identity (not specific to this codebase — the same tradeoff
    every phone-keyed system makes) — worth naming, not solving here (no evidence this has caused
    a real problem yet, so building a merge/history mechanism now would be speculative).

**Direct answer to "different name, same phone" (item 16 of Question A)**: the existing
`BookingService.create_booking()` does **not** update an existing customer's stored name on a
repeat booking with a different typed name — `get_by_phone()` returns the existing row as-is;
`customer_data` (including the newly-typed name) is only used if a *new* row is created. **CONFIRMED**
by reading the function — this is real, current behavior, not a gap invented for this report.

**Direct answer to "books without WhatsApp" (item 17)**: unaffected — the website flow (Reservation
or Booking) never touches any WhatsApp code path at all; phone number is just a normal form field.

---

## 7. Website vs WhatsApp Customer Lineage

Current real state, **CONFIRMED**:

```
Website Guest (Reservation Engine)  → Reservation (no Customer row, ever)
Website Guest (Booking Engine)      → Customer (found/created) → Booking
WhatsApp Customer                   → Customer (found/created) → Booking   [Reservation Engine: no path exists]
```

The two booking engines already disagree on identity model *today*, independent of WhatsApp. The
requirement in Question B ("Website Guest and WhatsApp Guest converge on the same Customer
identity → Reservation") is really two separate, real gaps closing at once: (a) give the
Reservation Engine the same Customer-identity pattern the Booking Engine already has, (b) extend
that pattern to a new WhatsApp conversation branch that resolves service/barber/slot instead of
property/unit. Neither is a new architectural idea — both reuse an already-proven shape.

---

## 8. Source-of-Truth Matrix

| Entity | Source of Truth | Readers | Writers | Identifiers | Tenant Isolation |
|---|---|---|---|---|---|
| Tenant | `clients` table | Every route via `get_current_tenant`/JWT | Registration/onboarding flows | `id` (uuid), `slug` (unique), `phone` (unique — also the WhatsApp WABA-match key) | N/A (it IS the tenant boundary) |
| Service (bookable) | `catalog_services` table | `GET /public/reservations/catalog-services`, `ReservePage.jsx` | Admin Staff/Service CRUD | `id` | `clientId` on every row + every query (confirmed, prior audit) |
| Barber | `barbers` table | `GET /public/reservations/barbers`, Calendar | Admin Barber CRUD | `id` | `clientId` on every row + every query |
| Barber↔Service | `barber_services` join table | Public barber-list soft-filter, Staff UI | Staff Management's assign UI | `(barberId, serviceId)` | `clientId` column present + filtered (confirmed, prior audit) |
| Availability | Computed at request time from `barbers.workingHours` + `reservations` conflict query — **not a stored table** | `GET /public/reservations/availability` | N/A (derived) | — | `client_id` param on the query |
| Customer identity | **Split today**: `customers` table (Booking engine, WhatsApp) vs. no identity at all (Reservation engine, website) | `BookingService`, `CustomerRepository` | `BookingService.create_booking()`, `upsert_system_customer()` | `(phone, clientId)` composite lookup key | `clientId` column + scoped query (confirmed) |
| Reservation | `reservations` table | Admin Calendar, `GET /admin/reservations` | `reservation_service.create_reservation()` (website only, today) | `id`, real FKs `barberId`/`serviceId`/`resourceId` | `clientId` on the row; every admin read derives `client_id` from the JWT, never a request param (confirmed, prior audit) |
| WhatsApp identity | The Cloud API's own `from`/`display_phone_number` fields on each webhook payload — not stored as a first-class identity anywhere, only consumed to resolve `Client`/`Customer` | `whatsapp_flow.py` | N/A (external, Meta-owned) | Phone number (E.164-ish digits) | `display_phone_number` → `Client.phone` match, confirmed correct (§6.7) |

No hardcoded frontend service/barber lists found anywhere in this trace (re-confirmed this
session, consistent with the prior audit's own finding).

---

## 9. Architecture Options

### Option 1 — Reservation keeps snapshot fields only; WhatsApp creates Reservations directly by phone
- **Pros**: zero schema change; fastest to ship a WhatsApp booking flow for Reservation.
- **Cons**: no reusable identity — "has this phone number booked before" requires scanning
  `reservations` by phone every time, no cheap join to a customer's full history; diverges further
  from the Booking engine's already-proven pattern instead of converging with it, working against
  Question B's own stated goal.
- **Migration cost**: none.
- **Risk**: low technically, but architecturally regressive relative to what already exists
  elsewhere in this codebase.
- **Tenant isolation**: unaffected either way — already `clientId`-scoped.
- **WhatsApp compatibility**: works, but re-derives "who is this" from scratch every message
  instead of reusing `CustomerRepository`.
- **Store compatibility**: no interaction (different table).
- **Reporting**: customer-level history across barber visits requires a phone-string `GROUP BY`,
  not a real join — exactly the shape the existing `GET /admin/customers/` endpoint already had to
  work around by merging `Reservation`+`StoreOrder` by phone at query time (confirmed real,
  shipped code from a prior session).
- **Recommendation**: rejected as the sole approach — leaves Question B's stated goal unmet.

### Option 2 — Customer becomes the canonical identity; Reservation.customerId required, snapshot
fields removed
- **Pros**: cleanest single source of truth; matches "one identity" framing directly.
- **Cons**: **loses historical accuracy** — a real, recorded lesson this project has already
  learned the hard way is that snapshot fields matter when the customer's own info changes later
  (a corrected phone number shouldn't rewrite what a past reservation said at booking time). Also a
  real migration for every existing `reservations` row (`rk`/`mr-h`'s real historical data) with no
  reversible fallback if something goes wrong.
- **Migration cost**: high — schema change + backfill + risk of orphaning historical rows that
  don't cleanly match a phone.
- **Risk**: real, non-trivial, touches live production data for two active tenants under a hard
  deadline (2026-08-31, per project memory).
- **Recommendation**: rejected — over-engineered for what's actually needed, contradicts Question
  H's own "do not recommend large schema rewrites."

### Option 3 — Hybrid: Customer entity for reusable identity/history; Reservation keeps its own
snapshot fields, gains an optional `customerId` FK
- **Pros**: exactly matches the Booking engine's already-proven, already-live pattern
  (`BookingService.create_booking()`) — not a new idea, a second application of one already trusted
  in this codebase. Fully additive: `customerId` nullable, existing rows untouched, existing reads
  (Calendar, admin list) keep working unchanged since they already read the snapshot fields.
  WhatsApp and website both write through the same `create_reservation()` call, both resolving/
  creating the same `Customer` row by `(phone, clientId)` first.
- **Cons**: two representations of "who booked this" (`customerId` + snapshot fields) instead of
  one — a real, small duplication, but the same one the Booking engine already carries in
  production today without apparent cost.
- **Migration cost**: low — one additive nullable column, one repository function reused
  (`CustomerRepository` already exists and is already tenant-scoped), no backfill required for
  existing rows (they simply have `customerId = null`, same honest-null convention this schema
  already uses elsewhere — `vertical`, `templateKey`, `provisioningStatus`).
- **Risk**: low — additive-only, same shape already proven, no existing behavior changes.
- **Tenant isolation**: identical to the Booking engine's already-correct `(phone, clientId)` scoping.
- **WhatsApp compatibility**: direct — this is literally what Question B asks for.
- **Store compatibility**: no interaction required now; a future `StoreOrder.customerId` would be
  the same pattern a third time, not scoped by this study.
- **Reporting**: a real join becomes possible (`Reservation.customerId → Customer`) alongside the
  existing phone-merge approach — additive, not a replacement.
- **Recommendation**: **this is the recommended option.**

---

## 10. Recommended Architecture

**Adopt Option 3 (Hybrid), reusing `Customer`/`CustomerRepository` exactly as the Booking engine
already does, extended to the Reservation Engine.**

Concretely, for a future Implementation Contract (not authorized by this study):

```
create_reservation(...):
    customer = customer_repo.get_by_phone(customer_phone, client_id)
    if not customer:
        customer = customer_repo.create(client_id, {"phone": ..., "name": ..., "email": ...})
    ... (existing pipeline, unchanged) ...
    create_data["customerId"] = customer.id   # NEW, additive, nullable
    create_data["customerName"] = ...          # UNCHANGED — snapshot stays
    ...
```

For WhatsApp specifically: a new conversation branch in `whatsapp_flow.py` (or a sibling module,
architecture decision for the Contract stage, not this study) that, once a tenant has the
`reservations` capability active (`client_services`, already the correct gate per the prior
architecture study), offers "احجز موعد" alongside/instead of the existing property flow, walks
service → barber → slot using the exact same public endpoints the website already calls
(`catalog_service_service.public_list_services()`, `barber_repo`/`barber_service_repo`,
`reservation_service.get_available_slots()`), then calls the same, now-Customer-aware
`create_reservation()`. **No new booking logic, no new availability logic, no new backend
capability** — the same functions, called from a second front door.

---

## 11. Required DB Changes IF authorized (none executed)

- `Reservation.customerId String? @db.Uuid` + FK to `Customer`, `onDelete: SetNull` (matching the
  existing `barberId`/`serviceId`/`resourceId` convention on the same model exactly).
- **Optional**, low-priority: `Reservation.source String?` (matching `Booking.source`, which
  already distinguishes `"whatsapp"` from web) — `Reservation` has no equivalent field today
  (**CONFIRMED**, re-read the full model this session). Could instead live in `metadata.source`
  with zero migration, at the cost of not being queryable/indexable — a real tradeoff for the
  Contract stage to decide, not this study.

No other schema change identified as necessary.

---

## 12. Required Backend Changes IF authorized (none executed)

- `reservation_service.create_reservation()` gains the find-or-create Customer step (§10).
- A new WhatsApp conversation branch for the Reservation Engine (service/barber/slot), reusing
  existing public reservation functions — no new business logic.
- `CustomerRepository` reused as-is — no changes needed to it.

---

## 13. Required WhatsApp Configuration IF authorized (names only, no values requested or read)

Already-defined variable names (config.py), needed for the outbound/inbound Cloud API path to go
from dormant to live — **not modified, not read, not requested in this study**:
```
WHATSAPP_VERIFY_TOKEN
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_BUSINESS_ACCOUNT_ID
```
No new variable names are needed for the Reservation-engine extension specifically — it would
reuse the same WABA/webhook infrastructure already wired for the Booking engine, since Cloud API
webhooks are tenant-agnostic at the transport level (routing to the right tenant already happens
via `Client.phone` matching, §6.7).

---

## 14. Security / Secret Handling

No token values were read, printed, or persisted anywhere in this study. Confirmed presence-only
(not value) of `WHATSAPP_ACCESS_TOKEN` in the shell environment (absent) and `.env` (file does not
exist in this environment). `config.py`'s own production guard
(`if settings.WHATSAPP_VERIFY_TOKEN == "my_secure_token": raise ValueError`, line 100-101) is
existing, real, and untouched. No recommendation in this report requires exposing a secret in
source code, the database, or logs — the existing `WhatsAppService` already keeps tokens in
`settings` (env-sourced) only.

---

## 15. Migration Strategy IF a redesign were authorized

Not authorized by this study. If Option 3 is later approved: single additive migration
(`add_reservation_customer_id.sql`, matching this project's existing migration-naming convention,
e.g. `add_barber_service.sql`), no backfill required (existing rows get `customerId = null`,
consistent with this schema's own established honest-null convention), zero behavior change for
any existing reader (Calendar, admin list) since they already read the snapshot fields and would
simply gain an optional new field to ignore or use.

---

## 16. What NOT to Change

- The existing `Booking`/`Property`/`Unit` WhatsApp flow (`whatsapp_flow.py`) — real, working,
  proven pattern; extend alongside it, don't refactor it as part of this work.
- `CustomerRepository` — already correct, already tenant-scoped, reuse verbatim.
- The Reservation Engine's existing public routes (`/catalog-services`, `/barbers`,
  `/availability`) — a WhatsApp flow should call these same functions, not duplicate their logic.
- `Reservation`'s existing snapshot fields — keep for historical accuracy, per Option 3.
- Any Supabase-managed schema, auth model, or the platform_services/client_services architecture
  covered by the prior study — untouched, unrelated to this question.

---

## 17. Risks / Unknowns

- **UNKNOWN**: whether the real Meta webhook payload for this account actually includes
  `contacts[0].profile.name` in the shape general Cloud API documentation describes — not verified
  against a real captured payload in this repository. Irrelevant to the recommendation either way,
  since the existing flow already deliberately asks for a typed name rather than trusting it.
- **UNKNOWN**: whether `wa_id` ever diverges from the plain phone number for a real sender in
  practice — no evidence either way in this codebase.
- **Real limitation, not a new risk introduced by this recommendation**: the in-memory WhatsApp
  session store (`whatsapp_flow.py:101`) does not survive a server restart or work correctly with
  multiple worker processes. A Reservation-engine WhatsApp flow reusing this same pattern inherits
  the same limitation. Not flagged as blocking — the existing Booking-engine flow already ships
  with this same characteristic today.
- **Risk of Option 3 specifically**: none identified beyond the standard risk of any additive
  schema change (a migration must run cleanly against live `rk`/`mr-h` data) — low, given the
  identical pattern already runs successfully in production for the Booking engine.

---

## 18. Confidence Level

| Conclusion | Confidence | Basis |
|---|---|---|
| Reservation Engine has zero Customer usage today | **High** | Directly confirmed via code read + live DB read (this study and the prior audit) |
| A real, working WhatsApp booking flow already exists (Booking engine) | **High** | Full read of `webhook.py`, `whatsapp_flow.py`, `whatsapp_service.py` |
| The find-or-create Customer pattern is already proven and reusable | **High** | Read `BookingService.create_booking()`/`CustomerRepository` directly |
| Tenant isolation for WhatsApp messages is already correct | **High** | Read `_resolve_client()` and the `Customer` lookup's `clientId` scoping directly |
| Hybrid (Option 3) is the right target | **High** | Directly mirrors an already-live, already-proven pattern in the same codebase — not a novel design |
| WhatsApp profile-name reliability | **Medium** (the recommendation) / **Unknown** (the underlying Meta payload fact) | Recommendation rests on the existing code's own design choice (ask, don't trust), not on independently verifying Meta's payload shape |
| No new WhatsApp infrastructure is needed for the Reservation extension | **High** | The webhook, credentials, and outbound client are all already real and tenant-agnostic at the transport layer |

---

**Stop condition honored**: no code, schema, database, or WhatsApp configuration was modified.
Awaiting Salman's decision on whether to authorize an Implementation Contract for §10-13.
