# Reservation Platform — API Boundary Cleanup

**Date:** 2026-08-07 | **Type:** Documentation only, per Salman's explicit instruction — no code
changed. Synthesizes and extends two prior same-session documents
(`.claudedocs/work/api-boundary-review/2026-08-06/summary.md`,
`.claudedocs/work/dashboard-workload-api-audit/2026-08-06/summary.md`) into one reference document,
plus two genuinely new pieces (Payload Review, `domain.action` Monitoring Namespaces) neither prior
document covered.

**Explicitly out of scope**: the SSO login trial/active bug (Item 3 of the Registration Routing
work) — independent follow-up ticket. The Layer Violation and the undecided duplicate
`/dashboard/:slug/*` route — both already on record, referenced not re-litigated. No fix to
anything found imperfect below — this phase documents, it does not change code.

---

## Step 0 — Freshness Gate

**Result: PASS — no regeneration needed.**

```
git log --since="2026-08-06 00:00" -- app/api/v1/public/reservations.py \
  app/api/v1/admin/reservations.py app/api/v1/admin/barbers.py \
  app/api/v1/admin/catalog.py app/api/v1/public/catalog.py
→ 0 commits
```

Zero commits to any reservation-surface backend route file since the 2026-08-06 review — no
endpoint added, removed, renamed, or payload-changed. Frontend re-verified separately: the exact
same 7 endpoint call-sites from the prior audit are still the only ones in
`ReservationsTab.jsx`/`reservationInteractions.jsx` (Phase 3.5 reused all four existing mutation
routes, added zero new backend calls). One real correction to the prior audit's own completeness,
found while re-verifying rather than assumed: the public booking flow (`ReservePage.jsx`) consumes
`GET /reservations/barbers`, `GET /reservations/availability`, and `POST /reservations/` through a
dedicated hook, `frontend/src/hooks/useReservationBooking.js` — not inlined in the page component
itself, which is why the earlier audit's grep-based pass under-captured the Public consumer side.
Corrected here.

---

## 1. Inventory

| Capability | Method | Path | Owner | Status | Consumer |
|---|---|---|---|---|---|
| Create | POST | `/api/v1/public/reservations/` | Reservation | Stable | Public — `useReservationBooking.js:180` |
| Create | POST | `/api/v1/admin/reservations/` | Reservation | Stable | Admin — `ReservationsTab.jsx:462` (Quick Create, both Calendar and List) |
| Update/Edit | PATCH | `/api/v1/admin/reservations/{id}` | Reservation | Stable | Admin — `ReservationsTab.jsx:469` |
| Cancel | PATCH | `/api/v1/public/reservations/{id}/cancel` | Reservation | Stable | Public — customer self-cancel, phone-verified |
| Confirm / Status (generic) | PATCH | `/api/v1/admin/reservations/{id}/status` | Reservation | Stable | Admin — `ReservationsTab.jsx:444` (covers Confirm, Cancel-via-dropdown, Arrived, No-show — one endpoint, five transitions) |
| Reschedule | PATCH | `/api/v1/admin/reservations/{id}/reschedule` | Reservation | Stable | Admin — `ReservationsTab.jsx:453` (drag, mini-reschedule form) |
| Availability | GET | `/api/v1/public/reservations/availability` | Reservation | Stable | Public — `useReservationBooking.js:155` |
| List (Calendar + List views) | GET | `/api/v1/admin/reservations/` | Reservation | Stable | Admin — `ReservationsTab.jsx:428`, one fetch path for all three views (`date`/`date_from`+`date_to` params) |
| Stats | GET | `/api/v1/admin/reservations/stats` | Reservation | Stable | Admin — Overview tab |
| Get single | GET | `/api/v1/admin/reservations/{id}` | Reservation | Stable | Admin — not currently called by any live frontend code (built, unused) |
| Get single (self-lookup) | GET | `/api/v1/public/reservations/{id}` | Reservation | Stable | Public — not currently called by any live frontend code (built, unused) |
| Barbers list | GET | `/api/v1/public/reservations/barbers` | Reservation *(proxies Staff data — see §2)* | Stable | Public — `useReservationBooking.js:110` |
| Barbers list | GET | `/api/v1/admin/barbers/` | Reservation *(proxies Staff data — see §2)* | Stable | Admin — `reservationInteractions.jsx:77`, shared across Today/Week/List |
| Barbers CRUD | POST/PATCH/deactivate | `/api/v1/admin/barbers/*` | Reservation *(proxies Staff data)* | Stable | Admin — not yet wired to any UI (no Staff Management tab exists yet) |
| Resources list (clinic) | GET | `/api/v1/public/reservations/resources` | Reservation *(proxies Staff data)* | Planned | Public — `module_key="clinic"` only; no clinic tenant exists yet, built ahead of real use |
| Resources CRUD (clinic) | POST/PATCH/deactivate | `/api/v1/admin/resources/*` | Reservation *(proxies Staff data)* | Planned | Admin — same, no live consumer yet |
| Catalog items (services picker) | GET | `/api/v1/admin/catalog/items` | Catalog | Stable | Shared — `reservationInteractions.jsx:93` (Admin), `useReservationBooking.js` via `fetchItems()` (Public) |
| Catalog categories | GET | `/api/v1/{public,admin}/catalog/categories` | Catalog | Stable | Shared — Public via `fetchAllCategories()` in `useReservationBooking.js`, Admin via `CatalogTab.jsx` |

---

## 2. Domain Ownership

| Domain | Owns | Must NOT own |
|---|---|---|
| **Reservation API** | Reservation lifecycle (create/status/reschedule/edit/cancel), availability computation, working-hours/conflict checks | Staff roster data, Catalog pricing/content, Customer identity |
| **Catalog API** | `CatalogItem`/`CatalogCategory` — names, prices, `metadata.requires_booking`/`duration_min` | Reservation state, staff scheduling |
| **Staff API** *(not built)* | Barber/Resource roster, working hours | Reservation lifecycle, Catalog pricing |
| **Customer API** *(not built)* | Customer identity/contact records | Reservation state (no FK exists today — see the 2026-08-06 API Boundary Review's Confirmed Finding #2) |

**One real overlap, worth naming plainly rather than glossing over**: `Barber`/`Resource` CRUD and
listing currently live entirely under files this table calls "Reservation" (`admin/barbers.py`,
`admin/resources.py`, and a `/reservations/barbers`/`/reservations/resources` sub-path in the public
router) — there is no separate Staff API today, because there is no Staff Capability yet. This is
not a violation of anything (nothing has been built wrong), but it is the one boundary Staff
Management's own build will need to draw explicitly: does `Barber`/`Resource` move under a new,
separate Staff API at that point, or does Reservation keep owning the roster and Staff Management
becomes a UI layer over these same existing endpoints? Not decided here — flagged as the one real
open ownership question this document surfaces.

---

## 3. Endpoint Naming

Every path under `/reservations/*` and `/admin/reservations/*` does real reservation work — no
endpoint under those prefixes performs Catalog, Staff, or Customer business logic. Re-confirmed
clean, same conclusion as the 2026-08-06 review.

**Two real naming observations, distinct from that prior Layer Violation finding (still real, still
unfixed, not re-litigated here):**

- `public/reservations.py`'s own `/barbers` and `/resources` sub-routes are nested under the
  `/reservations` prefix but return Staff/Resource entities, not reservations — a naming-purity
  question, separate from the already-known Layer Violation (those same two routes calling the
  repository layer directly, skipping `reservation_service`). Even if that Layer Violation were
  fixed today, the *naming* would still read as "reservation data" while actually serving staff
  roster data — worth Staff Management's own build deciding whether these move to their own
  `/staff/barbers`-shaped prefix at that point.
- The admin side is already more consistent: `admin/barbers.py` and `admin/resources.py` are their
  own top-level route files (`/api/v1/admin/barbers/*`, `/api/v1/admin/resources/*`), not nested
  under `/admin/reservations/*` — the public and admin sides have quietly drifted into two different
  naming conventions for the same underlying entities.

---

## 4. Payload Review

**`POST /api/v1/public/reservations/` and `POST /api/v1/admin/reservations/`** (`ReservationIn` /
`ReservationCreateIn` — near-identical schemas):

| Field | Required | Optional | Server-derived |
|---|---|---|---|
| `module_key` | ✅ | | |
| `customer_name` | ✅ | | |
| `customer_phone` | ✅ | | |
| `customer_email` | | ✅ | |
| `reserved_at` | ✅ | | |
| `duration_min` | | ✅ (falls back to `MODULE_DEFAULTS`) | |
| `notes` | | ✅ | |
| `metadata` (barber_id/service_id/resource_id, module-dependent) | | ✅ | |
| `id` | | | ✅ |
| `status` (always starts `"pending"`) | | | ✅ |
| `created_at` / `updated_at` | | | ✅ |

**`PATCH /api/v1/public/reservations/{id}/cancel`** (`CancelIn`):

| Field | Required | Optional | Server-derived |
|---|---|---|---|
| `customer_phone` (verification, not identification — the id is already in the URL) | ✅ | | |

**`PATCH /api/v1/admin/reservations/{id}/status`** (`StatusUpdateIn`):

| Field | Required | Optional | Server-derived |
|---|---|---|---|
| `status` | ✅ | | |

**`PATCH /api/v1/admin/reservations/{id}/reschedule`** (`RescheduleIn`):

| Field | Required | Optional | Server-derived |
|---|---|---|---|
| `reserved_at` | ✅ | | |
| `barber_id` | | ✅ | |

**`PATCH /api/v1/admin/reservations/{id}`** (`EditReservationIn` — every field optional by design,
since this is a partial-update endpoint; no field is individually "required" here the way Create's
are):

| Field | Required | Optional | Server-derived |
|---|---|---|---|
| `customer_name` / `customer_phone` / `reserved_at` / `duration_min` / `barber_id` / `service_id` | | ✅ (all six — at least one expected, but none individually mandatory) | |

**No genuinely deprecated field was found in any of the five schemas above** — stated plainly rather
than inventing one to fill a column. This is a real, checkable fact, not an omission: every field in
every schema is still read and used by `reservation_service.py` today (confirmed by the same
Freshness Gate's zero-diff result).

---

## 5. Monitoring Namespaces

| Event | Trigger | Consumer Mapping |
|---|---|---|
| `reservation.create` | `POST /reservations/` succeeds | Shared (Public + Admin both call it) |
| `reservation.cancel` | `PATCH /{id}/cancel` succeeds, or `PATCH /{id}/status` with `status="cancelled"` succeeds | Shared |
| `reservation.confirm` | `PATCH /{id}/status` with `status="confirmed"` succeeds | Admin |
| `reservation.status` | Any other `PATCH /{id}/status` transition succeeds (arrived, no_show) | Admin |
| `reservation.reschedule` | `PATCH /{id}/reschedule` succeeds | Admin |
| `reservation.edit` | `PATCH /{id}` succeeds | Admin |
| `reservation.list` | `GET /reservations/` returns | Admin |
| `reservation.availability` | `GET /reservations/availability` returns | Public |
| `catalog.services` | `GET /catalog/items`/`/catalog/categories` returns, in a reservation-booking context | Shared |
| `staff.*` | *(placeholder — Not Built)* | — |
| `customers.*` | *(placeholder — Not Built)* | — |

`staff.*`/`customers.*` are deliberately left unexpanded — no `staff.assign`/`staff.archive`-style
sub-events are proposed here, per explicit instruction not to design ahead of those Capabilities
existing. Their placeholder rows exist only so the `domain.action` naming convention itself is
already on record before Staff Management's first real endpoint is built, avoiding that phase
inventing its own separate naming style.

---

## 6. Stability Assessment

**Reservation API — Stable.**

- Calendar (Today + Week) and Reservations List (all three admin views) call the exact same list/
  create/edit/status/reschedule endpoints — confirmed, not assumed, via the Freshness Gate's
  zero-diff result and a fresh grep of every current call site.
- The Public booking flow (`ReservePage.jsx`) reuses the same `create`/`availability`/`barbers`
  endpoints the Admin side already exercises — one Create path, not two.
- No endpoint duplication was found across the entire surface (this is distinct from the earlier,
  still-open `/dashboard/:slug/*` route-pattern duplication, which is a frontend routing question,
  not a Reservation API one).
- No new endpoint was introduced since Phase 3.5 (List's Popover/Create/Search) — confirmed via
  Step 0's Freshness Gate, not assumed from memory.

**Not claimed Stable**: the Staff-roster-under-Reservation ownership question (§2) and the two
naming observations (§3) are real, open items — Stability here means the *existing* surface is
internally consistent and duplication-free, not that every future decision is already made.
