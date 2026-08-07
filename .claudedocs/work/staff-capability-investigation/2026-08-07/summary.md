# Staff Capability Investigation

**Date:** 2026-08-07 | **Type:** Investigation only, per Salman's explicit instruction — no code
changed, no refactor opened, Reservation untouched. First step of Staff Management, same
discipline as the Reservation Platform API Boundary Cleanup that preceded it.

**The one question this document answers:** *what does Staff actually own, and what remains
Reservation's?* Extended, per Salman's own instruction, to examine Catalog/Category/Items alongside
Staff, since the real open question (below) sits at exactly that boundary.

---

## 1. What "Staff" currently is, in real code — two unrelated concepts sharing one English word

Confirmed by reading the schema and route files directly, not assumed from naming:

| Concept | Model | Owns | Route file |
|---|---|---|---|
| **Operational staff** (who actually performs a service — the thing Multi-Staff Scheduling means) | `Barber` / `Resource` | Name, phone, `isActive`, `workingHours`, `sortOrder` | `admin/barbers.py`, `admin/resources.py` |
| **Login accounts** (who can access the dashboard, and with what role) | `User` | Email, password hash, `role` (`TENANT_ADMIN`/`MANAGER_RESERVATIONS`/`MANAGER_UNITS`/`SUPER_ADMIN`) | `admin/team.py` |

These are unrelated today — no FK between `Barber` and `User`. This is the same naming-collision
class already found once this session (the "service" word meaning four different things,
`api-boundary-review/2026-08-06`) — worth stating explicitly now, before "Staff Management" gets
built and someone has to guess which of the two this phase means. Per the existing Dashboard
Calibration decision on record (multi-staff scheduling books the *Barber*, not a chair), **Staff
Management as a product concept means the `Barber`/`Resource` roster — not `User`/Team accounts**,
which already have their own working CRUD (`admin/team.py`) and aren't part of this investigation's
scope.

## 2. What Reservation currently does with Barber/Resource — real coupling, read-only

`reservation_service.py` genuinely reads `Barber`/`Resource` data — not incidentally, but as a real
part of its own logic:

- `_resolve_barber()`/`_resolve_resource()` (pipeline stage 2) — validates the referenced barber/
  resource exists for this tenant.
- `_check_working_hours()` reads `Barber.workingHours`/`Resource.workingHours` directly to compute
  valid slots and reject out-of-hours reservations.
- `edit_reservation()`/reschedule paths re-validate the same way when the barber changes.

This read dependency is legitimate regardless of who *writes* Barber data — Reservation needs to
know a barber's hours to do its own conflict-checking job. The real ownership question is about
**write path and admin surface**, not about whether Reservation is allowed to read staff data at
all (it should, always will, the same way it's fine for it to read `CatalogItem.metadata` for
service duration).

## 3. Independent lifecycle — the same test this project already used for Category

`category.md` (this project's own Category Capability file) justifies splitting Category out from
Catalog with one sentence: *"a Category can exist, be renamed, or be hidden independently of any
specific product."* Applying the identical test here, with real evidence:

- A `Barber` can be created, renamed, deactivated, or have its hours changed with **zero**
  reservations existing yet, or ever (`admin/barbers.py`'s own CRUD has no dependency on
  `Reservation` rows — confirmed by reading the file, `create_barber`/`update_barber` never touch
  the `Reservation` table).
- Conversely, `Barber` rows are never created *by* the reservation flow — a barber must already
  exist before any reservation can reference one.

By this project's own established test, `Barber`/`Resource` pass the same independence bar Category
passed. This is evidence for, not a decision to, split Staff into its own Capability — stated as
such.

## 4. The real, currently-missing piece — the actual reason this matters

Checked directly: `Barber` and `Resource` have **no relation to `CatalogItem`/`CatalogCategory`** at
the schema level (confirmed by reading both model blocks in full, `schema.prisma:430-460` and
`:777-798` — no FK either direction). "Which services does this barber perform" is not a queryable
fact anywhere in the database today — `Reservation.metadata`'s `{barber_id, service_id}` pair is a
JSON blob set per-reservation, matched by convention, not a structural relationship. In effect:
**every barber can currently be booked for every service**, because nothing says otherwise.

This is the concrete design question Staff Management's own build will hit almost immediately, not
a hypothetical: does a real product need "Hussein does haircuts and beard trims; Jaafar does
everything" as an enforced fact, or does the current everyone-can-do-everything model stay correct
for the tenant types this platform actually serves today (a small barbershop, realistically, where
most staff do most services)? Not answered here — named, with the real schema gap that makes it a
genuine open question rather than an assumption either way.

## 5. Catalog/Category/Items — confirmed clean, no entanglement to unwind

Re-read `catalog.md`/`category.md` (existing Capability files) and the real route files
(`admin/catalog.py`, `public/catalog.py`) directly for this investigation, looking specifically for
any existing Staff-adjacent coupling:

- `CatalogItem`/`CatalogCategory` have zero relation to `Barber`/`Resource`, zero relation to
  `Reservation` at the schema level (confirmed — `CatalogItem`'s only relations are `Client`,
  `CatalogCategory`, `GalleryImage`, `RestaurantOrderItem`, `StoreCartItem`, `StoreOrderItem`; no
  `Reservation` or `Barber` FK anywhere).
- The only linkage between Catalog and Reservation is the same informal `metadata.service_id`
  convention already documented in the 2026-08-06 API Boundary Review (§3.4) — a frontend-only
  filter (`metadata.requires_booking === true`), no backend enforcement.
- Catalog's own already-known Open Finding (Duplicate Architecture — `store.py`/`restaurant.py`
  bypassing `catalog_service.py`) is unrelated to Staff and does not block or complicate anything
  Staff Management would build. Confirmed, not re-investigated in depth here (already fully
  documented in `catalog.md`'s Open Findings).

**Conclusion for this section: Catalog/Category/Items are not entangled with the Staff ownership
question at all.** The only real cross-domain link in this whole picture is the informal
`Reservation.metadata` JSON convention connecting Barber↔Service, which is Reservation's own
data, not Catalog's or Staff's.

---

## Answer to the stated question

**What Staff actually owns (candidate, not yet decided/built):** the `Barber`/`Resource` models
themselves — identity, contact info, `isActive`, `workingHours`, roster CRUD. Passes this project's
own independent-lifecycle test for Capability-hood, same as Category did.

**What remains Reservation's:** the reservation lifecycle itself, including all conflict/working-
hours *validation logic* (`_check_working_hours()`, `_has_conflict()`) — even after any future move,
Reservation would keep *reading* Barber data to do its own job, the same way it's expected to keep
reading Catalog data. Ownership of the data ≠ exclusive right to read it.

**What's genuinely new and undecided, not currently owned by either:** a real Barber↔Service
relationship (which staff member can perform which catalog item) — does not exist today in any
form, informal or structural. This is the one piece Staff Management cannot simply "move" from
Reservation, because Reservation never built it either.

## Not decided here, by design

Whether `Barber`/`Resource` actually gets extracted into a new `admin/staff.py` (or similar) route
file, whether the two currently-separate models (`Barber` for barbershops, `Resource` for the
not-yet-real clinic case) get unified or stay parallel, and whether a real Barber↔Service
relationship gets built — none of these are decided in this document. Per Salman's own instruction,
this is the investigation that makes those decisions possible, not the decision itself.

## Confirmed Findings

- `admin/team.py`'s `role` field (`MANAGER_RESERVATIONS`/`MANAGER_UNITS`) is unrelated to
  `Barber`/`Resource` — no FK, confirmed by reading both models.
- `admin/barbers.py`'s CRUD never touches the `Reservation` table — confirmed by reading the full
  file.
- `reservation_service.py` reads `Barber.workingHours`/`Resource.workingHours` directly in its
  conflict-checking pipeline — confirmed by reading the pipeline stages in full
  (`_resolve_barber`, `_check_working_hours`, reschedule/edit re-validation paths).
- `CatalogItem`/`CatalogCategory` have zero schema-level relation to `Barber`, `Resource`, or
  `Reservation` — confirmed by reading both model blocks in full.
- No Barber↔CatalogItem relationship exists in any form, structural or informal-but-enforced —
  confirmed by grepping the schema for any join and finding none.

## Side Findings

- `category.md`'s own "independent lifecycle" test for Capability-hood is directly reusable here —
  not something this investigation invented, an existing project precedent applied to a new case.
- The `Resource` model (clinic, `type="doctor"`) and `Barber` model remain fully parallel,
  independently-built tables per the Reservation Strategy's own documented "built as if the other
  didn't exist" decision (2026-07-31) — any future Staff Capability inherits this same
  not-yet-unified state, not something new this investigation introduces.

## Unknowns

- Whether any real tenant would actually need per-barber service restriction (§4) was not
  investigated against real customer feedback — this is a product question, not something a code
  read can answer.
- Whether `Resource` (clinic) should be folded into the same future Staff Capability as `Barber`,
  or whether clinic staff are different enough to stay separate, given no real clinic tenant exists
  yet to test either assumption against.
