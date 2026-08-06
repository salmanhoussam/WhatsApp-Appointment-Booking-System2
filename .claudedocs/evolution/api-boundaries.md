## 2026-08-06

### Context

Reservation Calendar (Today + Week) closed as v1 (`reservation-calendar-v1` tag). Before starting
Staff Management, Salman asked for an API Inventory & Boundary Review — investigation only, no
refactor — to map the real API surface (Reservations, Catalog, Barbers, Customers, Settings) before
Staff/Customers/Notifications get built on top of it. Full report:
`.claudedocs/work/api-boundary-review/2026-08-06/summary.md`.

### Discovery

Six real, evidenced findings came out of reading every route/service/repo/schema file touching this
surface (not inferred):

1. `admin/customers.py` exists but is not mounted in `admin/__init__.py` and has zero frontend
   callers — dead code, and its auth/tenancy pattern (no JWT dependency, raw `client_id` query param)
   violates every convention every other admin route in this codebase follows.
2. `Reservation` has no relation to `Customer` at the schema level — `Customer` only relates to
   `Booking`. `Reservation.customerName/Phone/Email` are denormalized strings.
3. `public/reservations.py`'s `/resources` and `/barbers` GET routes call the repository layer
   directly, skipping `reservation_service` — a real, if small, Routes→Services→Repositories
   violation.
4. `metadata.requires_booking` (the flag that decides which CatalogItem rows are bookable services)
   has zero backend references anywhere and is duplicated verbatim in two frontend files instead of
   living in the already-existing shared `reservationInteractions.jsx` module.
5. `admin/reservations.py` has two different `VALID_MODULE_KEYS` lists, one dead, one real — a
   confusing trap for a future edit.
6. "Service" means four unrelated things in this codebase (`Service` model, `CatalogItem`,
   `BookingService`, `ClientService`/serviceKey) — none currently collide in code, but the naming
   overlap is a real risk for future engineers/agents.

### Current Understanding

The Reservation domain (Reservations/Barbers/Resources/Catalog) and the pre-existing Booking domain
(chalets/villas, smar) are cleanly separate today — no shared model, no shared write path. Every
Capability inside the Reservation surface has exactly one owning service/repo/model, consistent with
`rules/backend/architecture.md §9`'s "One Capability, One Service" principle, without that having
been explicitly enforced by anyone — it happened by construction. The one real gap is finding #2: to
build a real Customers capability for `hr` (a Reservation-domain tenant), a genuinely new decision is
needed — phone-string matching against the existing `Customer` table (no schema change, no
referential integrity) vs. a new `Reservation.customerId` FK (schema change + migration + backfill).
Neither is decided here.

### Open Questions

- Does "Staff Management" mean managing `Barber` rows (the existing Reservation precedent), `User`
  Team accounts, or both surfaced in one UI? Not decided by this review — surfaced as a real open
  question the Staff Management phase needs to answer explicitly before writing code.
- How should `Reservation` connect to `Customer` (§ finding #2 above) — the actual blocking decision
  for a clean Customers phase.
- Should `admin/customers.py` be rebuilt from scratch to the current auth pattern, or deleted and
  written fresh? Not decided — flagged only.

### Promoted?

No — this is a documentation-only investigation, not an ADR candidate. No pattern here has appeared a
second independent time yet (this project's Abstraction Rule threshold); revisit if the same
Customer-FK gap or the same dead/unmounted-route pattern reappears in a second tenant/module.

### Escalation Watch

If a second Reservation-domain tenant (beyond `hr`) is onboarded before the Customer-FK question is
settled, that is the second independent confirming case for finding #2 — at that point it stops being
an `hr`-specific open question and becomes a real architectural decision blocking every future
Reservation tenant, worth raising to Salman directly rather than deferring again.
