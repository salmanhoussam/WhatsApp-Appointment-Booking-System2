# Capability Investigation — User Roles / Permissions (RK: Salman / Hussein / Jaafar)

Follows: `investigation-protocol.md`, `service-execution-constitution.md`. Requested by Salman: a
real 3-tier authorization model — Super Admin (platform-wide), Tenant Owner (full access within one
tenant only), Staff-scoped-to-self (own calendar/reservations/clients only) — **backend-enforced**,
not UI-hidden. Explicitly distinct from Staff↔Service (`BarberService`/`CatalogService`, "which
services can a barber perform") — this investigation is about "what can a logged-in *user* do in the
dashboard," a different question. No code written. RK is the test tenant only; findings and any
future design must stay reusable, not hardcoded to `rk`/Hussein/Jaafar.

## Confirmed Findings

### 1. What authorization/role infrastructure exists today

- **Roles**: a Prisma enum `UserRole` (`schema.prisma:116-122`) — exactly `SUPER_ADMIN`,
  `TENANT_ADMIN`, `MANAGER_RESERVATIONS`, `MANAGER_UNITS`. No `STAFF`/`OWNER`/`BARBER` role exists.
- **JWT claims**: admin/user tokens carry `{type:"admin", user_id, client_id, slug, role}`
  (`app/api/v1/admin/auth.py:165-171`) — no `barberId`, no per-resource claim of any kind.
- **`get_current_admin_user`** (`app/core/tenant.py:334-382`): validates the JWT, loads the `User`
  row scoped by `{id, clientId, isActive}`, checks tenant lifecycle status. No role/resource check.
- **`require_roles(*allowed_roles)`** (`app/core/tenant.py:465-484`): calls
  `get_current_admin_user`, then a flat `if user.role not in allowed_roles: raise 403`. Variadic —
  supports an OR of multiple roles per route (already-existing mechanism, not something to build).
  **Zero per-resource scoping** — it only ever checks the role string, never which specific record is
  being touched.
- **`require_super_admin`** (`tenant.py:385-417`): admin JWT with `role=="SUPER_ADMIN"` OR a client
  JWT whose `slug == settings.SUPER_ADMIN_SLUG` — this is real, working, platform-wide gating.
  Nothing in `TENANT_ADMIN` or any other role can satisfy this — confirmed clean separation between
  Super Admin and everything else.
- **No route anywhere filters its response body by caller role.** Grep for `role ==`/`user.role ==`
  inside route bodies (excluding `auth.py`'s own login code) returned zero matches. No existing
  precedent for "user sees only their own data" — this would be genuinely new logic.

### 2. What can be reused

- `require_roles()` itself — the mechanism is real, works, and is variadic; a new role name
  (e.g. `STAFF`) can be added to the enum and immediately used in existing `require_roles(...)`
  calls with zero changes to the dependency's own code.
- The **exclusion-by-omission** pattern already does most of the "Jaafar can't touch X" work for
  free: `team.py`, `barbers.py`, `catalog_services.py`, `settings.py` (PATCH), `store.py` all already
  gate on `require_roles("SUPER_ADMIN","TENANT_ADMIN"[, ...])` — a new `STAFF` role, simply by never
  being added to those allow-lists, is automatically blocked with a real 403 from every one of them.
  No new "deny" logic needs to be written for Services/Prices*/Catalog/Settings/Staff-management —
  just *not adding* `STAFF` to their existing allow-lists.

  \*with one caveat — see Gap 4 below, `prices.py` currently has no auth at all.

### 3. Where the real gaps are

- **`User` and `Barber` are completely unlinked.** No `User.barberId`, no `Barber.userId`, no
  relation of any kind (`schema.prisma:125-151` for `User`, `:835-863` for `Barber`). There is
  today no way to derive "which barber is this logged-in user" from a JWT — nothing to derive it
  from exists in the schema.
- **The admin reservations list has no per-barber filter at all, server-side.**
  `reservation_service.list_reservations()` / `ReservationRepository.list_by_client()`
  (`reservation_repo.py:31-56`) build `where = {clientId: ...}` plus optional
  `moduleKey`/`status`/date range — `barberId` is never part of that `where` clause. **Today,
  `GET /api/v1/admin/reservations/` always returns every reservation for the whole tenant**, to any
  authenticated admin user regardless of role. The dashboard's existing per-barber pill filter
  (`ReservationsTodayView.jsx:330,441-454,542`) is confirmed **client-side only** — the backend
  already sends everything, the browser just hides the rest. This is precisely the failure mode
  Salman named explicitly: hiding in the UI is not enforcement.
- **`reservations.py` and `catalog.py` call zero `require_roles()` anywhere** — every route in both
  files is reachable by *any* authenticated admin user today, of any role. This isn't a Jaafar-shaped
  gap specifically — it means even today, a `MANAGER_UNITS`-role user (who per `services.py`'s own
  table should be locked to units-only) can already fully read/write reservations and catalog.
  Needs closing regardless of whether Jaafar's role ships.
- **No real Customer entity for the barber/reservation module.** A `Customer` model does exist
  (`schema.prisma:280-296`) but it's wired only to `Booking` (the real-estate module). `Reservation`
  stores customer identity as plain free-text (`customerName`, `customerPhone`, `customerEmail`,
  `schema.prisma:731-733`) with no FK to any person entity. **"Jaafar's own clients" is not a
  well-defined query today** — it would have to be derived (distinct name/phone appearing on
  Jaafar's own reservations) or a real Customer entity would need building for this module. This is
  a design decision, not a wiring task.
- **Severe, pre-existing, unrelated security gap — flagged prominently, not part of this feature**:
  `app/api/v1/admin/customers.py`, `prices.py`, `booking_services.py` have **no auth dependency
  chain at all** — not `require_roles`, not `require_service`, not even `get_current_tenant`. They
  trust a raw `client_id` query parameter with zero authentication. `listings.py` uses
  `get_current_tenant` only, no role check. Anyone who knows or guesses a real `client_id` UUID can
  hit these routes today, fully unauthenticated. Independent of the roles project — recommend
  addressing regardless of this feature's timeline, not bundled into it.

### 4. Does "Tenant Owner" already exist as a concept?

**Yes, in spirit — `TENANT_ADMIN` already is it.** `app/api/v1/admin/team.py:7-11`'s own comment:
*"Resource = user accounts; Owner = Tenant Admin (ADR-0004 Information Ownership Model's ownership
question, applied here)."* `TENANT_ADMIN` already has full access within its own tenant across
every capability checked (Staff, Services, Staff↔Services, Settings, Store, Catalog) and is
structurally excluded from every Super-Admin-only route (`require_super_admin` never accepts a bare
`TENANT_ADMIN` role). **No new role is needed for Hussein.** Giving him "Tenant Owner" access to RK
is not a build task — it's creating one real `User` row (`role: TENANT_ADMIN`, `clientId`: RK's) —
zero code change.

### 5. Can Staff be reliably linked to User?

**Not today — this is the central real gap.** Confirmed no existing field/relation connects them.
A reliable link requires a real (additive, conservative) migration adding either `User.barberId`
(nullable, since not every `User` is a barber) or the inverse on `Barber`. This is a schema change,
not something achievable by configuration alone — unlike Hussein's case above.

### 6. Can current staff/barber be determined from the authenticated user instead of query params?

**Not today, and this is exactly why real enforcement doesn't yet exist.** Every place `barber_id`
appears in a request today is either (a) a client-supplied *write* field (`RescheduleIn.barber_id`,
`EditReservationIn.barber_id` — data being set, not an identity filter) or (b) an anonymous public
query param on the availability-check endpoint (`public/reservations.py:167-173` — correct there,
since that caller has no login at all). **No authenticated admin route derives "the current staff
member" from the JWT anywhere** — because, per finding 5, the JWT has nothing to derive it from
(`role` and `user_id` only). Building this requires both the `User↔Barber` link (finding 5) *and*
new server-side filtering logic that doesn't exist anywhere in the codebase to copy from.

### 7. Which endpoints need tenant/user scoping (full inventory)

| Area | File | Current role gate | Gap for Staff-scoped-to-self |
|---|---|---|---|
| Staff CRUD | `barbers.py` | SUPER_ADMIN,TENANT_ADMIN(+MGR_RES on GET) | Correctly excludable — just don't add STAFF |
| Services CRUD | `catalog_services.py` | SUPER_ADMIN,TENANT_ADMIN(+MGR_RES on GET) | Correctly excludable |
| Reservations | `reservations.py` | **none at all** | Needs `require_roles` added, THEN per-barber filtering added |
| Catalog | `catalog.py` | **none at all** | Needs `require_roles` added (excludable once present) |
| Store | `store.py` | SUPER_ADMIN,TENANT_ADMIN,MGR_RES | Correctly excludable |
| Settings | `settings.py` | none on GET; SUPER_ADMIN,TENANT_ADMIN on PATCH | GET needs a role gate added too, or Jaafar can read tenant settings today |
| Team/Users | `team.py` | SUPER_ADMIN,TENANT_ADMIN | Correctly excludable |
| `customers.py`,`prices.py`,`booking_services.py` | — | **no auth at all** | Separate, urgent, pre-existing gap (finding 3) |
| `listings.py` | — | `get_current_tenant` only | Same class of gap, lower severity |

## Side Findings

- `require_roles` never appears inside a route that also does per-resource filtering except
  `team.py`'s DELETE, which re-checks `clientId` (tenant isolation) — not per-user ownership. No
  existing precedent to model Jaafar's "own calendar" logic on; it would be new code either way.
- The dashboard's `useAdminRole.js` (`ROLE_TABS`) already maps roles to visible tabs — this is the
  correct place to add a `STAFF` entry for hiding tabs, but per Salman's own instruction this is not
  sufficient alone; it's cosmetic on top of real backend enforcement, not a substitute for it.

## Unknowns

- Whether "Jaafar's own clients" should be a derived query (group by name/phone on his own
  reservations, no new model) or a real `Customer` entity for the barber module — a design decision,
  not resolved here.
- Whether the missing role-gating on `reservations.py`/`catalog.py` (open to any authenticated admin
  today) should be fixed as its own separate, immediate hardening step before the Staff role work
  even starts, given it's a real gap independent of Jaafar.

## Minimal Architecture Change — the actual answer to "what's the least needed for all 3 tiers"

1. **Super Admin (Salman)**: zero change. Already fully enforced (`require_super_admin`).
2. **Tenant Owner (Hussein @ RK)**: zero code change. Create one `User` row,
   `role: TENANT_ADMIN`, `clientId`: RK's — `TENANT_ADMIN` already is "Tenant Owner" in every
   capability checked.
3. **Staff scoped-to-self (Jaafar @ RK)** — real, minimal build, in order:
   a. Add `STAFF` to the `UserRole` enum (schema change, additive).
   b. Add a `User↔Barber` link (additive migration — same conservative-migration precedent as
      Phase 3.7C: add, don't touch/rename existing data).
   c. Add `require_roles(...)` to `reservations.py` and `catalog.py` (currently missing entirely) —
      needed regardless of Jaafar, closes an existing gap for every non-privileged role.
   d. Add real per-barber filtering to the reservation list/detail service+repository layer, driven
      by the JWT-derived `barberId` (via the new link from 3b) when `role == STAFF` — genuinely new
      logic, no existing pattern to extend.
   e. Decide and build the "own clients" query (Unknown above) once (a)-(d) land.
   f. `STAFF` is never added to the allow-lists of Services/Prices/Catalog-write/Store/Settings/Team
      routes — this part is free once (a) exists, per finding 2.
4. **Separate, not bundled**: fix the unauthenticated `customers.py`/`prices.py`/`booking_services.py`
   routes (finding 3) — a real security gap regardless of this feature.

Nothing above has been built. This is the investigation Salman asked for; the next step is his
decision on scope/sequencing, not implementation.
