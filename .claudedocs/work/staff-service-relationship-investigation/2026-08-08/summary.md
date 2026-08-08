# Phase 3.7C — Staff ↔ Service Capability Investigation

**Date:** 2026-08-08 | **Type:** Investigation only — no code, no UI, no API changes, per explicit
instruction. Answers 7 specific questions with real evidence before any Staff↔Service design work
starts, same discipline as the Catalog UX and original Staff Capability investigations.

**Builds directly on** `.claudedocs/work/staff-capability-investigation/2026-08-07/summary.md`,
which already established: `Barber`/`Resource` pass this project's independent-lifecycle test for
Capability-hood; `reservation_service.py` legitimately *reads* `Barber.workingHours` regardless of
who owns writes; and — the load-bearing finding this investigation extends — **no Barber↔CatalogItem
relationship exists in any form, structural or informal-but-enforced.** This investigation traces
exactly what that gap means in practice, end to end, with new evidence not gathered before (the
public API surface, the real FK shape already used for `Reservation.barberId`, and the availability
pipeline's actual parameters).

## Method

Full reads: `prisma/schema.prisma` (`Reservation`, `Barber`, `CatalogItem`, `CatalogCategory`,
`ClientService` model blocks), `app/services/reservation_service.py` (`get_available_slots`,
`edit_reservation`, `_resolve_barber`), `app/api/v1/public/reservations.py` (`/availability`,
`/barbers` route signatures), `frontend/src/hooks/useReservationBooking.js` (the service→duration
bridge). No browser check needed — this is a structural/data-model question, answerable from real
code and schema, not runtime UI behavior.

## Confirmed Findings

- **`Reservation.barberId` is a real FK today** (`schema.prisma:715`, `onDelete: SetNull`) — not
  just JSON metadata. The schema comment mirrors it into `metadata.barber_id` too, but the real,
  structural link is the FK column. **`Reservation` has no equivalent FK to `CatalogItem`/service at
  all** — `service_id` exists only inside the `metadata` JSON blob, informal and unenforced.
- **The public availability endpoint has zero awareness of "service" today.** `GET /availability`
  (`public/reservations.py:131-138`) takes exactly `barber_id`, `date`, `duration_min` — no
  `service_id`/`catalog_item_id` parameter exists in its signature at all. `duration_min` is a raw
  integer the frontend computed from `CatalogItem.metadata.duration_min` *before* calling this
  endpoint (`useReservationBooking.js:149,156`) — the backend never independently knows which
  service that duration came from, let alone whether the chosen barber actually performs it.
- **The public barber-list endpoint has zero service filtering.** `GET /barbers`
  (`public/reservations.py:115-127`) always returns every active `Barber` for the tenant,
  unconditionally — confirmed no `service_id`/`catalog_item_id` query param exists on this route
  either. `StaffCarousel` in `ReservePage.jsx` renders whatever this endpoint returns with no
  client-side filtering by selected service.
- **Concrete, verifiable consequence**: today, a real customer selecting "كرياتين" (90 min,
  presumably a specialized service) on `hr`'s live booking page sees the exact same barber picker —
  حسين, جعفر, and the 2 masked test records — as selecting "دقن" (15 min, presumably any barber can
  do a beard trim). Nothing in the stack distinguishes them. This isn't a hypothetical gap; it's the
  real, current behavior of the live public booking flow.
- **An existing, directly-reusable bridge-table pattern already exists in this codebase**:
  `ClientService` (`client_id` + `service_key`, unique pair — `service-system.md`'s own documented
  many-to-many-via-bridge pattern for Client↔service-capability). A future `BarberService` (or
  similarly named) join table with a `barberId` + `catalogItemId` unique pair would be the same
  shape, not a new architectural idea — reuse, not invention.
- **`Reservation.resourceId`/`barberId`'s `onDelete: SetNull` is the established precedent** for
  "what happens to historical reservations when the referenced roster row goes away" — both FKs are
  deliberately nullable with `SetNull`, specifically so deactivating/removing a `Barber`/`Resource`
  never cascade-deletes historical `Reservation` rows (confirmed via the schema's own inline
  comments at `:706-711`, `:713-716`).

## Answers to the 7 questions, in order

1. **كيف نعرّف العلاقة (relationship shape)?** A real, structural many-to-many join table —
   `BarberService`-shaped, mirroring `ClientService`'s already-proven pattern
   (`barberId` + `catalogItemId`, unique pair, `@@unique([barberId, catalogItemId])`). Not a JSON
   array on either side — a real table is queryable both directions (which services does this
   barber do; which barbers do this service), which a JSON blob on one side alone isn't.
2. **هل الخدمة يمكن أن تكون عند عدة Staff؟** Yes — confirmed as the realistic case for a real
   barbershop (`hr`'s own live data has 4 real staff and 6 services; most barbershops don't dedicate
   one staff member per service). A plain many-to-many join table supports this natively — no
   special design needed beyond the join table itself.
3. **هل Staff يمكنه تقديم عدة Services؟** Yes, same answer, same join table — this is exactly what
   a many-to-many bridge is for. No asymmetry between the two directions.
4. **ماذا يحدث للحجوزات الموجودة إذا أزلنا خدمة من Staff؟** **Nothing** — and this is structurally
   guaranteed, not just a policy choice, given what already exists: `Reservation` has no FK to
   `CatalogItem`/service at all (only `metadata.service_id`, informal), so a future
   `BarberService` join-row deletion has no FK path to cascade through to historical `Reservation`
   rows regardless of what's decided — they're independent tables. The **only** way this question
   becomes a real FK-cascade concern is if a future phase *also* adds a real `serviceId` FK to
   `Reservation` (paralleling how `barberId` was added) — if that happens, the same
   `onDelete: SetNull` precedent already used for `resourceId`/`barberId` is the direct, consistent
   answer: a reservation keeps its historical record; only the *live* join relationship changes.
5. **هل availability يجب أن يتحقق من هذه العلاقة؟** Not automatically, but it *could*, and the
   evidence above shows exactly where: `GET /availability` and `GET /barbers` would each need a new
   optional `catalog_item_id`/`service_id` query param, and `reservation_service.get_available_slots`
   / the barber-listing query would filter through the new join table. This is additive — neither
   existing endpoint needs to change its current behavior when the param is omitted (backward
   compatible), it only gains the *option* to filter once the relationship exists. Whether to
   actually enforce this (reject booking a barber for a service they don't offer) versus just using
   it to pre-filter the picker is a real product decision, not a technical one — named in Recommendation
   below, not answered here.
6. **هل Catalog هو الذي يملك العلاقة أم Staff؟** Neither, cleanly — matching this project's own
   `architecture.md §9` principle ("One Capability, One Contract, One Service... Many Interfaces")
   applied to a genuinely cross-cutting relationship: a `BarberService` join table is its own small
   thing, owned by whichever Capability's write path creates/deletes rows in it (most naturally
   Staff Management's own admin surface — "which services does حسين do" is a Staff-editing action,
   not a Catalog-editing one), while both Catalog and Staff's own read paths, plus Reservation's
   availability path, are legitimate readers — the same "ownership of data ≠ exclusive right to
   read it" distinction the prior Staff Capability Investigation already established for
   Reservation's read of `Barber.workingHours`.
7. **الـ API boundary الصحيح؟** A new small route surface (e.g. `admin/barber_services.py` or a
   sub-resource under `admin/barbers.py`, `PATCH /barbers/{id}/services`) for the write path —
   admin-only, matching this project's Admin/Public Contract split (`architecture.md §10`) — plus
   two additive query params on the two existing public routes named in Q5. No new Capability-sized
   surface needed; this is a small, well-precedented join table with a thin admin CRUD layer on top.

## Side Findings

- `hr`'s real live data (4 staff, 6 services, both fetched fresh during this session's Catalog work)
  is exactly the right size to build and verify this against once implementation starts — no seed
  data invention needed.
- `moduleKey === "services"`'s older metadata shape comment (`schema.prisma:695`,
  `{ "service_name": "haircut", "staff_id": "uuid" }`) is a **different, legacy, parallel
  convention** from the `"barber"` moduleKey's real-FK-based one actually in use for `hr` — not
  relevant to this investigation, not a second relationship to reconcile; flagged only so it isn't
  mistaken for a competing pattern later.

## Unknowns

- Whether a real barbershop tenant actually *wants* per-staff service restriction enforced (reject
  booking) versus just used as a soft picker hint — a product question, not resolvable from code;
  named explicitly in Q5 rather than assumed either way.
- Whether `Resource` (clinic) should get the equivalent `ResourceService`-shaped join table in the
  same pass or later — no real clinic tenant exists yet to test the assumption against, same
  Unknown the original Staff Capability Investigation already named and left open.

## Recommendation (not a decision — Salman's to make)

Given the evidence above, the cheapest correct next step, if/when this phase moves to design: a
`BarberService` join table (mirroring `ClientService`'s proven shape) plus a small admin write
surface, with the two public routes gaining an *optional* filter param — additive, backward
compatible, no existing behavior changes for any tenant that never touches the new relationship.
Whether to make availability *enforce* the relationship (hard reject) or only *soften* the picker
(pre-filter, but still allow override) is the one real product call this investigation surfaces but
doesn't make — worth a direct decision before implementation starts, since it changes the write
path's validation strictness, not just its shape.
