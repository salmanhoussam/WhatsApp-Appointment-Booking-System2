# Implementation Contract — Staff Scoped Access (User Roles / Permissions, Phase A-D)

Per `documentation-policy.md`: "No code is written without an Implementation Contract — a one-page
gate listing exactly which files change, what tests are required, success criteria, and a rollback
plan." Follows the investigation at
`.claudedocs/work/user-roles-permissions-investigation/2026-08-09/summary.md` and Salman's
2026-08-09 decision to proceed as a phased build (A→B→C→D).

**Process note, flagged not blocked**: this creates a new enforcement mechanism (per-resource
authorization scoping), which `documentation-policy.md`'s `decisions/` rule would normally route to
a full ADR rather than a standalone Contract. Salman explicitly asked for a small Implementation
Contract here — his call as architecture authority, noted transparently rather than silently
deviating from the documented default. Can be retroactively formalized as an ADR later if he wants
one.

## Scope

Builds real, backend-enforced scoping for a new `STAFF` role (Jaafar's tier). Explicitly does
**not** touch: `BarberService`/`CatalogService` (Staff↔Service, already correct), the Hussein/Salman
tiers (already fully covered by existing `TENANT_ADMIN`/`SUPER_ADMIN` — zero code), or the
unrelated `customers.py`/`prices.py`/`booking_services.py` unauthenticated-route finding (separate
track, per Salman's explicit instruction not to expand scope).

## Phase A — Authorization Foundation

**Files:**
- `prisma/schema.prisma` — add `STAFF` to the `UserRole` enum (`:116-122`). Add
  `User.barberId String? @map("barber_id") @db.Uuid` (nullable — not every `User` is staff) +
  relation to `Barber`, with a `@unique` constraint (one login account maps to at most one Barber).
- `prisma/migrations/add_user_barber_link.sql` — additive only: new column, new FK, new unique
  index, new enum value. No existing data touched, matches the conservative-migration precedent
  from Phase 3.7C.

**Real simplification found during this contract's own drafting**: no JWT change is needed.
`get_current_admin_user()` (`tenant.py:334-382`) already loads the full `User` row from DB on every
request — `user.barberId` is available there directly once the column exists, with zero token-shape
change and no staleness risk if a Barber link is edited later.

**Tests**: after migration, a direct DB read confirming the new column/enum value exist and a real
`User` row can be linked to a real `Barber` row (`c75b89c3-...` / جعفر, per the investigation's own
evidence) without touching Barber↔Service data.

## Phase B — Staff Calendar/Reservations (the real enforcement work)

**Files:**
- `app/api/v1/admin/reservations.py` — add `require_roles(...)` to every route (currently has
  **none at all** — a gap independent of Jaafar, closed here as a prerequisite). Include `STAFF` in
  the allow-list for read + the specific write actions Jaafar needs (status update, reschedule) on
  his own reservations only — ownership enforced one layer down, not by the role gate itself.
- `app/services/reservation_service.py` / `app/repositories/reservation_repo.py` — add
  server-side `barberId` scoping: when `current_user.role == "STAFF"`, force
  `where["barberId"] = current_user.barberId` in `list_by_client`'s query, **regardless of any
  `barber_id` sent by the client** — a client-supplied value is never trusted for authorization,
  per Salman's explicit requirement. For single-reservation routes (GET/PATCH/status/reschedule by
  ID), fetch first (existing `clientId` scoping unchanged), then: `if role == "STAFF" and
  reservation.barberId != current_user.barberId: raise HTTPException(403)`.
- `app/api/v1/admin/catalog.py` — add `require_roles("SUPER_ADMIN","TENANT_ADMIN", ...)` (currently
  **none at all**, same class of gap as reservations.py) — `STAFF` explicitly excluded.

**Design point flagged for Salman's confirmation, not decided unilaterally**: if a `STAFF` caller's
request includes a `barber_id`/`resource_id` query param that doesn't match their own, the contract
defaults to **silently overriding it to their own `barberId`** (never trusting it, never leaking
whether a different ID is valid via a distinguishable error) rather than rejecting with a specific
"mismatch" error. Flag if a different behavior is wanted.

**Tests (real API calls, not assumed)**:
- STAFF login → `GET /reservations/` with no filter → only own reservations returned.
- STAFF login → `GET /reservations/?barber_id=<other-barber-id>` → still only own reservations
  (override, not honored).
- STAFF login → `GET/PATCH /reservations/{id}` on another staff member's reservation → 403.
- STAFF login → any `catalog.py` route → 403.
- TENANT_ADMIN/MANAGER_RESERVATIONS login → unchanged behavior (sees everyone) — explicit
  regression check, not assumed from code reading alone.

## Phase C — Staff Clients

**Decision, per Salman's stated preference**: derive "my clients" from the staff member's own
reservations — no new `Customer` entity. Simpler, matches the investigation's finding that
`Reservation.customerName`/`customerPhone` are already the only identity fields this module uses.

**Files:**
- `app/repositories/reservation_repo.py` — new method, e.g. `list_distinct_customers_for_barber()`
  — `SELECT DISTINCT customerName, customerPhone` (or a groupBy) scoped by `clientId` +
  `barberId`.
- `app/services/reservation_service.py` — thin wrapper.
- `app/api/v1/admin/reservations.py` — new route, e.g. `GET /reservations/my-clients`, gated
  `require_roles("STAFF", ...)` (and usable by higher roles too if useful, TBD at build time —
  not a new capability for them, same data they already see via the full list).

**Tests**: real query against `rk`'s existing reservation data (once حسين/جعفر have real
reservations tied to them) confirming distinct customer identity only from their own bookings, none
leaking from the other staff member's.

## Phase D — Dashboard (last, cosmetic layer on top of real enforcement)

**Files:**
- `frontend/src/hooks/useAdminRole.js` — add `STAFF` to `ROLE_TABS`, minimal set (Calendar/
  Reservations + the new My Clients view). No other tab.
- `frontend/src/pages/generic-admin/tabs/ReservationsTab.jsx` /
  `ReservationsTodayView.jsx`/`ReservationsWeekCalendar.jsx` — when `role === 'STAFF'`, hide the
  existing barber-picker pill row (their own data is all the backend will ever return anyway, so
  showing a picker with other names would be misleading, not a security issue).

**Tests**: real Browser Verification, login as Jaafar — nav shows only the allowed tabs; **and**,
per Salman's explicit "not just hidden UI" requirement, direct `curl`/API calls (not just clicking
around) to Services/Prices/Catalog/Store/Settings/Staff-management endpoints while authenticated as
Jaafar, confirming 403 regardless of what the UI shows or hides.

## Full Regression Pass (required before calling any phase done)

- Salman (SUPER_ADMIN): unaffected — verify via real login.
- Hussein (TENANT_ADMIN): unaffected — full RK access exactly as before, verify via real login.
- Staff↔Service assignment UI (Phase 3.7C): zero change, verify via real click-through.
- Existing Reservations Today/Week/List views as TENANT_ADMIN: per-barber pill filter still shows
  everyone, unchanged.

## Success Criteria

Matches Salman's own Acceptance Criteria verbatim: Salman manages everything; Hussein manages all of
RK without Super Admin access; Jaafar sees only his own Calendar + his own reservations/clients, and
every direct attempt to reach Services/Prices/Catalog/Orders/Settings/another staff member's
calendar/Staff-management returns a real backend 403 — verified by direct API calls, not inferred
from hidden UI.

## Rollback Plan

Phase A's migration is purely additive (new nullable column + new enum value) — safe to leave in
place even if later phases are reverted; no existing data touched. Phases B-D only add new
behavior gated behind `role == "STAFF"` — since no `STAFF` user exists until Phase A creates one
for Jaafar, TENANT_ADMIN/SUPER_ADMIN/MANAGER_* behavior is provably unchanged at every phase
boundary. Each phase is independently `git revert`-able without affecting the others or any
existing tenant.

## Git Discipline

One commit per phase (A, B, C, D), each independently verified (real DB/API/browser evidence, per
`investigation-protocol.md`'s Evidence Interrogation standard) before the next starts — same
discipline as Phase 3.7C.

Nothing in this contract has been executed yet. Next step, once Salman confirms the one open design
point (Phase B's barber_id-override behavior) or approves it as written: Phase A implementation.
