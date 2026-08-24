# Guest Booking & Barber Data Lineage Audit — read-only, no code/DB changes

Requested by Salman 2026-08-24. Executed one real guest booking on `rk`'s public reserve page,
traced it through the database directly (not inferred from UI), and confirmed the same row
renders in the real admin Calendar with correct filtering. Test data cancelled afterward via the
app's own existing status-update endpoint (soft-cancel, matching this project's convention) —
confirmed via a second real API call, not assumed.

## 1. What the real entities are

| Entity | What it really is | Evidence |
|---|---|---|
| `Client` | The tenant itself (RK Barber Shop) — one row per business. | `prisma/schema.prisma:15` |
| `User` | A Dashboard login account (`TENANT_ADMIN`/`STAFF`/etc.) — `email`+`password_hash`, optionally linked to exactly one `Barber` via `barberId` for `STAFF`. | `User` model; real rk data: 8 `User` rows, one `STAFF` row linked to حسين's own `barberId` |
| `Barber` | A staff member with a real calendar (`workingHours`) — not a login account by itself, not a customer. | `Barber` model, no `email`/`password_hash` fields at all |
| `Customer` | A model that exists in schema, tied to smar's `Booking` flow — **confirmed unused by the Reservation Engine** (see §4). | `customers` table: 0 rows for `rk` despite real, live reservation activity |
| Public guest | Not a DB entity at all — just the `customer_name`/`customer_phone`/`customer_email` values submitted with one `Reservation`. No account, no session, no row of their own. | Traced `create_reservation()` end-to-end — zero `Customer`/`User` creation anywhere in the path |

**Why a Barber is not a Customer**: schema-level — `Barber` has no auth fields and is the thing being
*booked*, not the one booking. `Reservation.barberId` points at who performs the service;
`Reservation.customerName/Phone/Email` are plain strings for who booked it. No shared table, no
shared identity concept.

**Any flow that blends these?** One real, evidenced case: a `STAFF` `User` row *is* tied 1:1 to a
`Barber` row via `barberId` (`User.barberId`, unique) — this is a deliberate identity link (Staff
Scoped Access, Phase A, 2026-08-09), not a conflation: the `User` row is still the login/auth
identity, the `Barber` row is still the calendar/business-data identity, connected by one nullable
FK for exactly the "which barber's schedule does this login see" question. No other blending found.

## 2. Real guest booking flow, end-to-end (traced from source, then executed live)

| Step | API endpoint | Frontend component | Backend | DB |
|---|---|---|---|---|
| Load page | `GET /public/reservations/catalog-services` | `ReservePage.jsx` → `useReservationBooking.js` | `catalog_service_service.public_list_services()` | `catalog_services WHERE clientId=... AND isActive` |
| Select service | (client-side only) | `ServiceCircle` | — | — |
| Barber list | `GET /public/reservations/barbers?service_id=` | `StaffCarousel` | `barber_repo.list_barbers()` + soft-filter via `barber_service_repo.list_barber_ids_for_service()` | `barbers` + `barber_services WHERE clientId=...` |
| Select barber | (client-side only) | `BarberCard` | — | — |
| Date/slots | `GET /public/reservations/availability` | `CalendarPanel` | `reservation_service.get_available_slots()` | `reservations` (conflict check) + `barbers.workingHours` |
| Confirm | `POST /public/reservations/` | `ConfirmPanel` → `confirmLocally()` | `reservation_service.create_reservation()` | `reservations` INSERT |

No mocks anywhere in this chain — every step above was independently confirmed twice: once by
reading the real source files, once by executing the real flow and capturing the real network
calls live (see §3).

## 3. Where the booking actually goes — real execution, real DB read

Executed live on `localhost:5173/rk/reserve`, no auth, real service (شعر), real barber (حسين),
real future slot (2026-08-25 15:00), real submitted name/phone (`AUDIT-GUEST-VERIFY`/`70000088`).
Confirmation screen showed a real id (`dec41868`) and a real `200 OK` on `POST .../reservations/`.

**Not trusted on its own — verified by reading the database directly:**

```
id:              dec41868-e228-4b0a-8bf1-95fd23c5dd18
client_id:       7ef5c8c9-3d47-4aa9-b5e0-43b746ee2657   (client.slug confirmed = "rk")
module_key:      barber
customer_name:   AUDIT-GUEST-VERIFY
customer_phone:  70000088
customer_email:  None
reserved_at:     2026-08-25 15:00:00+00:00
duration_min:    20
status:          pending
barber_id:       f64ce71e-682c-4f3c-b17d-5fc48e0adaf5  -> barber.name = "حسين"
service_id:      71502964-79f0-4840-b676-ab1882402a13  -> service.name_ar = "شعر"
resource_id:     None
metadata:        {"barber_id": "...", "service_id": "..."}  (kept alongside the real FKs, redundant by design — backward-compat)
matching customers row: None
```

Direct answers: row created ✅ · client_id correct ✅ · barber_id saved as a real FK ✅ · service_id
saved as a real FK ✅ · customer data saved (as plain fields, not a `Customer` row) ✅ · module_key
saved ✅ · status = `pending` (real default) ✅.

## 4. Customer identity — traced from code, not guessed from schema

`reservation_service.create_reservation()` (`app/services/reservation_service.py:164-293`) never
references `prisma_client.customer` anywhere in its body — confirmed by reading the entire
function. `customer_name`/`customer_phone`/`customer_email` are written directly onto the
`Reservation` row as plain columns. **No `Customer` row is created, ever, by this flow.** Directly
confirmed live: `rk` has zero `customers` rows despite real reservation activity throughout this
session, and the one booking executed for this audit produced no matching `customers` row either.

**Intentional or gap?** Evidence points to **intentional, by construction** — not an oversight:
- The `Reservation` model has **no `customerId` FK column at all** in the schema (unlike
  `Booking.customerId`, which is a real, required FK for smar's flow). A missing FK that was
  supposed to exist would be a gap; a FK that was never added at all, on a model built and
  iterated on extensively over multiple real phases (Clinic, Barber, Phase 3.7C), is a design
  choice.
- The same pattern repeats in `StoreOrder` (customer fields stored directly, `StoreCustomer` a
  known separately-flagged dead table per this project's own prior session record) — this is a
  cross-cutting convention in this codebase for guest-facing order/booking flows, not a
  Reservation-specific gap.
- The project already built a **read-side answer** to the resulting "who are my customers"
  question — a real, shipped `GET /admin/customers/` endpoint that merges `Reservation` +
  `StoreOrder` by phone number *at query time*, with no new table — confirming this was a known,
  deliberate tradeoff (denormalized write, aggregated read) rather than an unnoticed hole.

## 5. Barber/service relationship — proven from real data, not assumed

`barbers` → `barber_services` → `catalog_services`, traced and executed live:

- Real DB state before the test: exactly 2 `barber_services` rows for `rk` — حسين qualified for
  "شعر", جعفر qualified for "دقن". Everything else unassigned.
- Live `GET /public/reservations/barbers?service_id=<شعر's id>` returned **only حسين** — confirmed
  raw JSON response, not a UI impression: `{"data":[{"id":"...حسين...",...}]}`, جعفر correctly
  excluded.
- This is `barber_service_repo.list_barber_ids_for_service()` — a real, `clientId`-scoped Prisma
  query (`app/repositories/barber_service_repo.py`) — not hardcoded frontend data, not stale
  config, not local component state. Confirmed by reading the query and by the live network
  response matching exactly what the query would produce against the DB state read moments
  earlier.

## 6. Calendar shows the same persisted reservation, with real filtering

After creating the real booking, opened `/rk/dashboard/calendar` (real TENANT_ADMIN JWT) and
navigated to 2026-08-25:

- The exact card appeared: `AUDIT-GUEST-VERIFY  معلّق  ✂️ شعر  15:00 · 20 د`, under حسين's column.
- Opening its real `ReservationPopover` showed every field matching the DB row exactly (name,
  phone `70000088`, service شعر, time 15:00, status معلّق, barber حسين).
- **Barber filtering proven real, not cosmetic**: with only جعفر selected (حسين toggled off), the
  grid column relabeled to "جعفر" and the card **disappeared entirely**. Re-selecting حسين made it
  reappear, unchanged. This is `barber_id`-based filtering happening in real data, not a visual
  trick — confirmed via the grid re-rendering different columns with different real content.
- **Tenant filtering** is enforced server-side, not client-side: `app/api/v1/admin/reservations.py`
  derives `client_id = str(user.clientId)` from the authenticated JWT's own DB-verified user row —
  never from a client-suppliable parameter (matches this project's own already-verified
  cross-tenant IDOR protection from an earlier session's Final Production Gate Audit).
- Service info in the popover comes from the persisted `serviceId` FK (`service.nameAr`), not from
  re-deriving it from `metadata` — confirmed by reading `_fmt()`'s real formatting logic.
- Date/time in the grid position is computed directly from `reserved_at` (`quarterIndexFromIso`),
  not a separate stored display field.

**Side finding, not a bug**: the desktop "جدول اليوم" (Agenda) sidebar always shows every barber's
reservations regardless of which grid columns are toggled — this is the same, deliberate,
already-documented design from this session's own Mobile Calendar work ("Agenda دائماً الكل" — the
agenda intentionally ignores the column selection so it always shows the full picture). Correctly
classified as ✅ intended, not flagged as a gap.

## 7. Guest vs Dashboard authentication

Confirmed by reading both route files directly: every route in `app/api/v1/public/reservations.py`
declares zero `get_current_admin_user`/`require_roles` dependency — only `get_current_tenant`
(slug resolution) + `require_service("reservations")` (module gate). **A guest never authenticates
at all** — no account, no password, no session token of any kind is created or required for the
entire booking flow. Every route in `app/api/v1/admin/reservations.py`, by contrast, requires a
real JWT resolving to a `User` row with an appropriate `role`.

This is the expected, correct security boundary, not a bug: `clients` (the tenant), `users` (who
can log into that tenant's Dashboard), and `customers`/guest bookers (anonymous, verified only by
phone-number knowledge for self-service actions like cancellation — `CancelIn.customer_phone`) are
three genuinely different trust levels, and the code enforces exactly that split at the route
layer. A guest does not need, and is not offered, any account/password — by design.

## 8. Final Classification

| Item | Classification | Note |
|---|---|---|
| Guest booking writes a real `Reservation` row with correct `client_id`/`barber_id`/`service_id`/`module_key`/`status` | ✅ Correct / intended | Proven via direct DB read of a real execution, not inferred |
| Guest booking does not create a `Customer` row | ✅ Correct / intended | No FK exists for it; matches the same pattern in `StoreOrder`; a read-side aggregation (`GET /admin/customers/`) already answers the resulting question |
| Barber/service filtering (`/barbers?service_id=`) | ✅ Correct / intended | Live-verified against real, sparse assignment data — correctly excluded the unqualified barber |
| Calendar shows the same persisted reservation | ✅ Correct / intended | Exact field match confirmed via popover |
| Calendar barber-column filtering | ✅ Correct / intended | Card disappears/reappears with real barber toggling |
| Tenant isolation on all routes tested | ✅ Correct / intended | `client_id` server-derived from JWT, never client-supplied |
| Guest has no auth/account | ✅ Correct / intended | Deliberate trust-boundary design, not a gap |
| `Customer` table existing but entirely unused by Reservation/StoreOrder | 🟡 Data-model inconsistency | Not a bug — a real, load-bearing table sits unused by the two busiest guest-facing write paths. Worth a conscious decision (formally deprecate, or wire it in) at some point — not urgent, not this audit's call to make |
| Desktop Agenda sidebar ignoring the barber-column filter | ✅ Correct / intended | Confirmed deliberate design from this session's own Mobile Calendar work, not a new finding |
| `metadata.barber_id`/`metadata.service_id` still written alongside the real FKs | ⚪ Legacy/unused (harmless) | Kept for backward-compatible reads of pre-3.7C rows per the schema's own comment; adds no risk, not load-bearing going forward |

**No 🔴 Real persistence/flow bug found.** The chain **Database → services/barbers → guest booking
→ reservations → Calendar** is confirmed, end-to-end, by direct execution and direct database
reads, to be one real, connected pipeline — not separately verified pieces assumed to connect.
Every tenant/barber/customer filter checked in this pass is grounded in real database state, not
frontend assumption or stale config.

## Cleanup

Test reservation `dec41868-e228-4b0a-8bf1-95fd23c5dd18` cancelled via the real, existing
`PATCH /api/v1/admin/reservations/{id}/status` endpoint (soft-cancel, this project's established
convention — never a hard delete). Confirmed via the endpoint's own real response:
`"status":"cancelled"`. No raw DB writes were made at any point in this audit — every write came
from the app's own real API paths (the guest booking itself, and this cleanup call).
