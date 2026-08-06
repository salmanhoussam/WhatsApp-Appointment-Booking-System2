# API Boundary Review — Reservation Platform (Before Staff Management)

**Date:** 2026-08-06
**Type:** Investigation only — per `investigation-protocol.md`. No code changed, no endpoints
renamed, no refactor performed. Every claim below cites a real file:line read during this review.
**Scope:** the API surface the generic-admin dashboard (`hr` tenant, and any future Reservation-type
tenant) actually uses or will need — Reservations, Catalog (Services/Products), Barbers/Staff,
Customers, Settings, Client-Services, Team. The pre-existing Booking/Property/Restaurant/Store/
Fleet/Dating/Moments domains are documented only where they collide with this scope (see §3),
otherwise explicitly out of scope — this is not a whole-platform audit.

**Rule followed, as instructed:** document current reality first; only after §1-§5 are complete does
§6 name any separation candidate. No target architecture was designed before the inventory below was
finished.

---

## 1. Complete Endpoint Inventory

### Reservations (`app/api/v1/{public,admin}/reservations.py`)

| Method | Path | File:Line | Notes |
|---|---|---|---|
| POST | `/api/v1/public/reservations/` | `public/reservations.py:52` | Customer-facing create |
| GET | `/api/v1/public/reservations/resources` | `public/reservations.py:93` | Clinic doctor picker |
| GET | `/api/v1/public/reservations/barbers` | `public/reservations.py:115` | Barber picker — **calls `barber_repo` directly, no Service layer** (see §3) |
| GET | `/api/v1/public/reservations/availability` | `public/reservations.py:131` | Open slots for barber+date+duration |
| GET | `/api/v1/public/reservations/{id}` | `public/reservations.py:165` | Customer self-lookup, phone-verified |
| PATCH | `/api/v1/public/reservations/{id}/cancel` | `public/reservations.py:182` | Customer self-cancel, phone-verified |
| GET | `/api/v1/admin/reservations/` | `admin/reservations.py:60` | List, supports `date` or `date_from`/`date_to` range (Week Calendar) |
| GET | `/api/v1/admin/reservations/stats` | `admin/reservations.py:100` | Today's counts by status |
| GET | `/api/v1/admin/reservations/{id}` | `admin/reservations.py:130` | |
| PATCH | `/api/v1/admin/reservations/{id}/status` | `admin/reservations.py:145` | |
| PATCH | `/api/v1/admin/reservations/{id}/reschedule` | `admin/reservations.py:166` | Drag-and-drop |
| PATCH | `/api/v1/admin/reservations/{id}` | `admin/reservations.py:192` | Full edit |
| POST | `/api/v1/admin/reservations/` | `admin/reservations.py:222` | Admin Quick Create — same `reservation_service.create_reservation()` as public |

**Owning service:** `app/services/reservation_service.py`. **Owning repo:** `app/repositories/reservation_repo.py`. **Owning model:** `Reservation` (`prisma/schema.prisma:675`).

### Barbers (`app/api/v1/admin/barbers.py`) — the closest thing to "Staff" today

| Method | Path | File:Line | Roles |
|---|---|---|---|
| GET | `/api/v1/admin/barbers/` | `admin/barbers.py:70` | SUPER_ADMIN, TENANT_ADMIN, MANAGER_RESERVATIONS |
| POST | `/api/v1/admin/barbers/` | `admin/barbers.py:80` | SUPER_ADMIN, TENANT_ADMIN |
| PATCH | `/api/v1/admin/barbers/{id}` | `admin/barbers.py:102` | SUPER_ADMIN, TENANT_ADMIN |
| PATCH | `/api/v1/admin/barbers/{id}/deactivate` | `admin/barbers.py:135` | SUPER_ADMIN, TENANT_ADMIN |

**Owning model:** `Barber` (`prisma/schema.prisma:777`) — `id, name, phone, isActive, workingHours (Json), sortOrder`, `Reservation[]` back-relation. No `require_service` dependency declared on this router at all (confirmed — grep of the file shows only `require_roles`; every route does still carry `_svc = Depends(require_service("reservations"))` per-route, not router-level).

### Resources (`app/api/v1/admin/resources.py`) — a second, independent "Staff-like" concept

| Method | Path | File:Line |
|---|---|---|
| GET/POST/PATCH/PATCH-deactivate | `/api/v1/admin/resources/*` | `admin/resources.py:72-153` |

**Owning model:** `Resource` (`prisma/schema.prisma:739`) — used today only for `type="doctor"` (clinic). Structurally near-identical to `Barber` (`name, phone, isActive, workingHours, sortOrder`) but a **separate model, separate repo, separate route file**, built independently on purpose (per the file's own docstring, `resources.py:14-18`) as the second real case in the still-open Reservation Strategy comparison logged in `.claudedocs/evolution/reservation-capability.md`.

### Team (`app/api/v1/admin/team.py`) — user accounts, not operational staff

| Method | Path | File:Line |
|---|---|---|
| GET/POST | `/api/v1/admin/team` | `admin/team.py:41,65` |
| DELETE | `/api/v1/admin/team/{id}` | `admin/team.py:108` |

**Owning model:** `User` (via `user_repo`). This is login accounts (email/password/role), not "which barber is on the schedule" — a different concept from Barber/Resource even though both could be called "staff" in casual conversation.

### Catalog / Services / Products (`app/api/v1/{public,admin}/catalog.py`)

| Method | Path | File:Line |
|---|---|---|
| GET/POST/PATCH/DELETE | `/api/v1/admin/catalog/categories*` | `admin/catalog.py:73-153` |
| GET/POST/PATCH/DELETE | `/api/v1/admin/catalog/items*` | `admin/catalog.py:158-231` |
| GET | `/api/v1/public/catalog/categories` | `public/catalog.py:11` |
| GET | `/api/v1/public/catalog/categories/{id}/items` | `public/catalog.py:26` |
| GET | `/api/v1/public/catalog/items/{id}` | `public/catalog.py:41` |
| GET | `/api/v1/public/catalog/featured` | `public/catalog.py:54` |

**Owning service:** `app/services/catalog_service.py`. **Owning model:** `CatalogItem`/`CatalogCategory` (`prisma/schema.prisma:430`). This is the same table the Reservation UI's "services" dropdown reads from — see §3, "requires_booking".

### Customers (`app/api/v1/admin/customers.py`)

| Method | Path | File:Line |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/v1/admin/customers*` | `admin/customers.py:9-49` |

**Not currently mounted anywhere** — see §3, this is the single most important finding for your next phase.

### Settings

| Method | Path | File:Line |
|---|---|---|
| GET | `/api/v1/admin/settings` | `admin/settings.py:52` |
| PATCH | `/api/v1/admin/settings` | `admin/settings.py:86` |
| GET | `/api/v1/admin/settings/qr` | `admin/settings.py:115` |

**Owning service:** `app/services/site_configuration_service.py`. **Owning model:** `Client` (branding/config fields directly on the tenant row, not a separate Settings table).

### Client Services (feature-flag activation — a 4th, platform-level meaning of "service")

| Method | Path | File:Line |
|---|---|---|
| GET | `/api/v1/admin/client-services/` | `admin/client_services.py:74` |
| POST | `/api/v1/admin/client-services/activate` | `admin/client_services.py:81` |
| POST | `/api/v1/admin/client-services/deactivate` | `admin/client_services.py:131` |

**Owning model:** `ClientService` (the `client_services` bridge table governed by `rules/backend/service-system.md`).

### Out of scope, flagged only for collision (§3) — the Booking domain

`app/api/v1/public/bookings.py`, `admin/bookings.py`, `admin/booking_services.py`, `admin/services.py`,
`admin/units.py`, `admin/properties.py`, `admin/prices.py` — this is the pre-existing **chalet/villa/
hotel** capability (CLAUDE.md's `booking` module, smar's domain), built around `Unit`/`Property`/
`Booking`/`Service`(the add-on kind)/`Customer`(FK'd) models. Structurally complete and independent of
Reservations. Listed here only because of the naming collisions documented in §3 — no boundary
recommendation is made about it.

---

## 2. Ownership

| API | Owns | Must NOT own |
|---|---|---|
| **Reservation API** (`reservation_service.py`) | Reservation lifecycle (create/status/reschedule/edit/cancel), slot-availability computation, working-hours/conflict checks | Barber/Resource roster data, Catalog/service pricing, Customer identity |
| **Barber API** (`barber_repo.py` via `admin/barbers.py`) | Barber roster + per-barber working hours | Reservation lifecycle, service pricing |
| **Resource API** (`resource_repo.py` via `admin/resources.py`) | Clinic doctor roster + working hours | Same as above, for the clinic module_key only |
| **Catalog API** (`catalog_service.py`) | Categories/Items (name, price, image, metadata) for restaurant/store/barber-service listings | Reservation state, staff scheduling |
| **Settings API** (`site_configuration_service.py`) | Client branding/config fields | Reservation config, catalog data (confirmed no overlap found — see §3 for the one soft exception) |
| **Client-Services API** (`client_services_repo.py`) | Which platform `serviceKey`s are active for a tenant | Any actual feature data |
| **Team API** (`user_repo.py`) | Login accounts + roles | Barber/Resource scheduling data |
| **Customers API** (`customer_service.py`/`customer_repo.py`) | Customer identity/contact records — **today, scoped only to the Booking domain's `Customer` model** | Reservation's customer data (structurally cannot today — see §3) |

---

## 3. Mixed Responsibilities — real findings, with evidence

### 3.1 `admin/customers.py` is dead code, and its pattern is a landmine

- `app/api/v1/admin/__init__.py` (full file read) imports and mounts every admin route file
  **except `customers`** — confirmed by the file's own `from . import properties, bookings,
  dashboard, units, settings, team, services, gallery, restaurant, store, catalog, upload,
  reservations, resources, barbers, client_services, fleet, content, media` (no `customers` token
  anywhere in that line or the `include_router` calls below it).
- Frontend: `grep -rln "'/customers" frontend/src` returned zero matches. `GenericAdminDashboard.jsx`
  has a `customers` nav entry (line 178) but no data-fetching call anywhere in the tree.
- **This means it is currently unreachable — not a live vulnerability.** But its code
  (`admin/customers.py:1-50`) is written to a completely different, older pattern than every other
  file in this inventory: no `Depends(get_current_admin_user)`, no `require_service()`, `client_id`
  taken as a raw `Query(...)` parameter instead of resolved from the JWT. If Staff/Customers work
  reuses this file as a starting point because it "already exists and has full CRUD," it inherits a
  multi-tenancy/auth pattern that violates `rules/backend/api-rules.md §2` and
  `rules/backend/security.md §3` on day one.

### 3.2 "Service" has four unrelated meanings live in this codebase today

| Meaning | Model/Table | Files |
|---|---|---|
| Booking-domain add-on (breakfast, pool access) | `Service` | `admin/services.py`, `service_repo.py` |
| Restaurant/store/barber catalog item | `CatalogItem` | `catalog_service.py`, `admin/catalog.py`, `public/catalog.py` |
| Join row between one Booking and one add-on Service | `BookingService` | `admin/booking_services.py`, `booking_service_service.py` |
| Platform feature flag (`serviceKey: "restaurant"`, `"reservations"`, ...) | `ClientService` | `client_services.py`, `require_service()` |

None of these four currently collide in code — each has its own model, its own route file, its own
service module. The risk is purely for a future reader/agent: `service_id` appears in `Reservation`'s
own `metadata` JSON (`clinic`/`barber` module_key payloads, `prisma/schema.prisma:697-700`) and refers
to a `CatalogItem.id` — a fifth informal usage, floating in an untyped JSON blob with no FK, matched
by convention only (confirmed: `CatalogItem` model, `schema.prisma:430-460`, has no `Reservation`
relation field at all).

### 3.3 Layer violation — `public/reservations.py` bypasses the Service layer twice

`public/reservations.py:17` imports `from app.repositories import resource_repo, barber_repo`
directly at the route-file level, and both `/resources` (`:105`) and `/barbers` (`:124`) call the
repository functions directly from inside the route handler — no `reservation_service` call in
between. Every other route in this same file (`create_reservation`, `get_availability`,
`get_reservation`, `cancel_reservation`) correctly routes through `reservation_service`. This is a
confirmed violation of `rules/backend/architecture.md §2`'s Routes → Services → Repositories → DB
direction — small in practice (both are simple list reads with no business logic), but a real,
checkable inconsistency in an otherwise clean file.

### 3.4 `requires_booking` — an undeclared, frontend-only, duplicated contract

The Reservation UI's "which catalog items are bookable services vs. plain retail products" filter is
implemented as `catalogItems.filter(item => item?.metadata?.requires_booking === true)`, present
**independently in two files**: `ReservationsWeekCalendar.jsx:284` and
`ReservationsTodayView.jsx:340` — not in the already-existing shared module
`reservationInteractions.jsx`, despite that module being exactly where Phase 3.4 centralized every
other piece shared between Today and Week. Grepping the entire backend
(`app/services`, `app/repositories`, `app/api`) for `requires_booking` returns **zero matches** — no
schema field, no backend validation, no mention in `rules/frontend/catalog-contract.md` (which
otherwise governs exactly this kind of `metadata` convention). It works today only because both
copies happen to stay in sync by hand. This is the same duplicated-logic risk class the Phase 3.4
Standing Rule (`.claudedocs/evolution/reservation-capability.md`, 2026-08-06 entry) was written to
close for mutation paths — this one slipped through because it's a read-only filter, not a handler.

### 3.5 `VALID_MODULE_KEYS` drift inside `admin/reservations.py`

`admin/reservations.py:20` declares a module-level `VALID_MODULE_KEYS = ["restaurant", "services",
"real_estate", "hotel"]` that omits `"clinic"`/`"barber"` and — confirmed by reading the whole
file — is **never referenced anywhere below it**. The route that actually validates module_key
(`create_reservation`, `:231`) uses a second, correct list, `CREATE_VALID_MODULE_KEYS` (`:55`,
comment explicitly says it's "kept in lockstep with `public/reservations.py`'s own
`VALID_MODULE_KEYS`, NOT the module-level one above"). Harmless today (dead code), but a real trap for
a future edit that "fixes" the wrong constant.

### 3.6 `Reservation` has no relation to `Customer` — the load-bearing finding for your next phase

`Customer` (`schema.prisma:279-295`) relates only to `Booking[]`. `Reservation`
(`schema.prisma:675-720`) stores `customerName`/`customerPhone`/`customerEmail` as plain denormalized
strings with **no FK to `Customer` at all**. `customer_service.py` (the whole file, read in full)
only ever queries `db.customer.find_many/find_first(where={"clientId": ...})` — it has no code path
that could return a `hr` (Reservation-domain) customer today, because none exist as `Customer` rows.

This is not a bug — the two domains were built independently and neither needed the other before now.
It is, however, the single concrete decision the Customers phase cannot avoid making explicitly:
**either** match Reservation customers by phone number against the existing `Customer` table (no
schema change, but a `Reservation.customerPhone` ↔ `Customer.phone` join has no referential
integrity — a customer could rename/re-register and the two would silently disagree), **or** add a
real `Reservation.customerId` FK (schema change, migration, backfill of existing `hr` reservations).
No recommendation is made here per your explicit instruction — this is flagged as a Separation
Candidate in §6, not decided.

---

## 4. Dependency Graph

```
Generic Admin Dashboard (React)
        │
        ├── Calendar (Today/Week) ──────► Admin Reservations API ──► reservation_service.py ──► reservation_repo.py ──► Reservation
        │                                        │
        │                                        ├──(layer violation, §3.3)──► resource_repo.py ──► Resource
        │                                        └──(layer violation, §3.3)──► barber_repo.py ──► Barber
        │
        ├── Staff picker (inside Reservation popovers) ──► Admin Barbers API ──► barber_repo.py ──► Barber
        │
        ├── Products/Services tab ──► Admin Catalog API ──► catalog_service.py ──► catalog_repository.py ──► CatalogItem
        │         │
        │         └── (soft, undeclared coupling, §3.4) "metadata.requires_booking" read directly
        │             by the frontend, no backend contract — Reservation's "choose a service" UI
        │             depends on this convention holding, with nothing enforcing it server-side.
        │
        ├── Settings tab ──► Admin Settings API ──► site_configuration_service.py ──► Client (config JSON)
        │
        ├── Team tab (not yet built as its own tab; API exists) ──► Admin Team API ──► user_repo.py ──► User
        │
        ├── Customers tab (planned, not built) ──► Admin Customers API [UNMOUNTED, §3.1] ──► customer_service.py ──► Customer
        │             │
        │             └── (missing edge, §3.6) NO path from Customer to Reservation exists today.
        │
        └── Overview tab ──► reads BOTH Reservations stats AND Catalog counts AND order counts
                              (a real, deliberate cross-capability read — not a violation, since it
                              only reads, never writes, through each capability's own public
                              contract)
```

No circular dependency was found anywhere in this graph — every arrow points one direction, from UI
down through Service to Repository to DB, with the two exceptions already named in §3.3.

---

## 5. API Surface — per real page/tab (generic-admin dashboard, `hr` tenant)

Extracted by grepping every `adminApi.`/`publicApi.` call under
`frontend/src/pages/generic-admin/` (39 real call sites read).

| Page/Component | APIs called | File |
|---|---|---|
| `GenericAdminDashboard.jsx` (shell) | `GET /settings`, `PATCH {field.apiPath}` (dynamic per-field) | `:287,338` |
| `ReservationsTab.jsx` | `GET /reservations/`, `PATCH /reservations/{id}/status`, `PATCH /reservations/{id}/reschedule`, `POST /reservations/`, `PATCH /reservations/{id}` | `:384,400,409,418,425` |
| `ReservationsTodayView.jsx` / `ReservationsWeekCalendar.jsx` (via `reservationInteractions.jsx`) | `GET /barbers/`, `GET /catalog/items` | `reservationInteractions.jsx:77,93` |
| `ActivityFeed.jsx` | `GET /reservations/` | `:116` |
| `OverviewTab.jsx` | `GET /{orderEndpoint}/orders`, `GET /reservations/stats`, `GET /catalog/categories`, `GET /catalog/items` | `:575,593,606,607` |
| `CatalogTab.jsx` (Products/Services UI) | `GET/POST/PATCH/DELETE /catalog/categories*`, `GET/POST/PATCH/DELETE /catalog/items*` | `:113-248` |
| `SettingsTab.jsx` | `GET /settings/qr`, `PATCH /settings` | `:103,211` |
| `OrdersTab.jsx` | `GET /{orderEndpoint}/orders`, `PATCH /{orderEndpoint}/orders/{id}/status` | `:377,391` |
| Staff tab | **does not exist yet** — nav entry present (`GenericAdminDashboard.jsx:178` area confirms `'staff'` is a registered case), no component built |
| Customers tab | **does not exist yet** — same, nav entry only |
| Notifications | **does not exist yet** — no nav entry found even as a placeholder |

This table is the literal "monitoring map" you asked for in §7 — every current page's real API
footprint, from real grep results, not inferred.

---

## 6. Separation Candidates (documentation only — no code touched)

Per your instruction, these are observations, not decisions:

- **Already correctly placed:** Reservations, Barbers, Resources, Catalog, Settings, Client-Services
  — each has one owning service/repo/model, no evidence of a second write path (consistent with
  `rules/backend/architecture.md §9`'s "One Capability, One Service" principle, already being
  enforced here without anyone having to say so).
- **Should probably move / get cleaned up before reuse:** `admin/customers.py` (§3.1) — its current
  shape should not be the starting point for the Customers phase as-is; it needs to be rebuilt to the
  same auth/tenancy pattern every other file in this inventory already follows, not un-commented and
  wired up.
- **Should remain shared, but needs its contract made explicit:** the `metadata.requires_booking`
  convention (§3.4) — Catalog stays the one owner of `CatalogItem`, but the convention itself should
  move into `rules/frontend/catalog-contract.md` (which already documents every other `metadata`
  convention in this exact area) and the duplicated filter should live in
  `reservationInteractions.jsx` once, not twice. Not proposed as an urgent fix — noted as a
  Separation Candidate since it's the same duplication risk class Phase 3.4 already fixed for every
  mutation path.
- **Missing capability, not a boundary problem:** a real link between `Customer` and `Reservation`
  (§3.6) does not exist in any form today. This is the one open architectural question that actually
  blocks starting Customers cleanly — not because the current boundary is wrong, but because the
  boundary hasn't been drawn at all yet for this specific relationship.
- **"Staff" is currently two different real models (`Barber`, `Resource`) plus one unrelated one
  (`User`/Team)** — worth naming explicitly before building a "Staff Management" tab: is "Staff
  Management" meant to manage `Barber` rows (the Reservation capability's existing precedent),
  `User`/Team accounts (login/roles), or both under one UI? Nothing here decides that — it's a real
  open question the inventory surfaces.

---

## 7. Monitoring Plan — proposed namespace map

For future observability (Prometheus/OTel/nginx logs), each page's real footprint from §5 maps
cleanly onto path prefixes that already exist, with one gap:

| Page | Namespace(s) |
|---|---|
| Calendar (Today/Week) | `/reservations/*`, `/barbers/*` (read-only) |
| Products/Services | `/catalog/*` |
| Settings | `/settings/*` |
| Orders/Overview | `/{restaurant\|store}/orders/*`, `/reservations/stats`, `/catalog/*` |
| Staff (future) | `/barbers/*` (if scoped to Reservation staff) — **no dedicated `/staff/*` namespace exists**; would need to be introduced deliberately rather than inherited |
| Customers (future) | **no working namespace exists today** — `/customers/*` is defined in code but unmounted (§3.1); §3.6's missing FK means even a working `/customers/*` route can't yet answer "which reservations belong to this customer" without a new query path |
| Notifications (future) | **no namespace exists at all** — clean slate |

Every current tenant-facing request already carries the tenant slug/JWT, so per-domain log filtering
by path prefix (`/reservations/`, `/catalog/`, `/barbers/`) is usable today with zero new
instrumentation — this was already true before the review, just not written down anywhere until now.

---

## Confirmed Findings

- `admin/customers.py` exists as real code but is not mounted in `app/api/v1/admin/__init__.py` and
  has zero frontend callers — checked via full read of `__init__.py`'s include list and
  `grep -rln "'/customers" frontend/src` (zero results). (§3.1)
- `Reservation` (schema.prisma:675) has no relation field to `Customer` (schema.prisma:279); `Customer`
  relates only to `Booking[]`. Confirmed by reading both full model blocks and all of
  `customer_service.py`. (§3.6)
- `public/reservations.py`'s `/resources` and `/barbers` GET routes call `resource_repo`/`barber_repo`
  directly, with no `reservation_service` call in between — confirmed by reading the full file
  (`:17,105,124`) against the file's own other four routes, which do go through the service. (§3.3)
- `metadata.requires_booking` has zero backend references (`grep` across `app/services`,
  `app/repositories`, `app/api` — zero matches) and exists identically in two separate frontend files
  instead of the shared `reservationInteractions.jsx` module. (§3.4)
- `admin/reservations.py:20`'s module-level `VALID_MODULE_KEYS` is dead code, unreferenced anywhere
  in the file — confirmed by reading the file in full; the real validation uses
  `CREATE_VALID_MODULE_KEYS` (`:55`). (§3.5)
- The Booking domain (`bookings.py`, `booking_services.py`, `admin/services.py`) and the Reservation
  domain (`reservations.py`, `catalog.py`, `barbers.py`) are fully independent — no shared model, no
  shared service, no shared repo — confirmed by reading every file in both groups. (§1, §3.2)

## Side Findings

- `admin/barbers.py` has no router-level `require_service` dependency (unlike `resources.py`, which
  also declares it per-route only) — consistent across both files, not a defect, just noted since it
  was checked while building the Ownership table.
- The Overview tab reads four different capabilities' data in one screen (Reservations, Catalog,
  Orders) — a legitimate cross-capability read, not a violation, but worth knowing it exists before
  any future "which page reads what" question comes up.
- `admin/dashboard.py` (Booking domain's dashboard) intentionally excludes `MANAGER_UNITS` from a
  mixed revenue+PII payload, per its own documented Least Privilege reasoning (`:8-13`) — an existing,
  good example of the ownership discipline this review is asking Staff/Customers to follow.

## Unknowns

- `site_configuration_service.py`'s internals were not read in full — only `admin/settings.py`'s
  route layer was reviewed. Whether `Client.config` (the catch-all JSON field returned by
  `GET /settings`) contains any Reservation-specific or Catalog-specific keys was not checked; flagged
  here rather than assumed clean.
- Whether any *other* tenant type (a future non-barber Reservation tenant) would hit the same
  Customer-FK gap (§3.6) the same way was not verified against a second real tenant — `hr` is the
  only Reservation-domain tenant with real data today, so this can't yet be confirmed as a general
  Reservation-domain problem vs. an `hr`-specific one. Practically the same conclusion either way,
  but stated as an open Unknown rather than generalized past the evidence.
- Booking-domain files (`prices.py`, `units.py`, `properties.py`) were not read in this pass — out of
  declared scope (§ header), so their internals are not represented in §1's inventory beyond the
  route-file list itself.
