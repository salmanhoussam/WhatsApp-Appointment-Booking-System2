# Customers Capability

Per the Capability Contract model (`../adr/TOS-003-capability-contract-model.md`). Extracted from
`TENANT_OS_PLAN.md` §13 (Contract), §19/§20 (Open Findings/Maturity) during the ADR-0003 migration
(Phase 5).

## Ownership

Tenant-facing customer records — the people who have booked/ordered from a given tenant. Distinct
from `Client` (the tenant itself) and `User` (staff/admin accounts).

## Contract

| Sub-capability | Status | Mechanism |
|---|---|---|
| View customer list | ✅ **Live** | `GET /api/v1/admin/customers/` — mounted at `app/api/v1/admin/__init__.py:41`, inside the `_protected` router (JWT floor), gated by `require_permission("customers.read", "SUPER_ADMIN", "TENANT_ADMIN")` |
| Edit / delete a customer | ➖ **Not applicable** | `customers.py` has no POST/PATCH/DELETE **by design** — the registry is query-time aggregation, so there is nothing to write and deliberately no `customers.write` permission (the file says so itself) |

> **Corrected 2026-09-07** (Interface Boundary Map decision pass). This table previously said the
> route was "never `include_router`'d … unreachable today" and that the file "defines full CRUD".
> **Both were wrong, and in opposite directions** — it understated reachability and overstated the
> API surface. The doc predates the Customer Registry work (2026-08-20, `b8d0081`) and was never
> revisited.

## Operations (Editing Engine, `TOS-002`)

Not applicable — the Capability is read-only by design, so there is nothing for the Editing Engine
to write.

## Schema

`Customer` model. The **registry itself stores nothing new** — `customer_registry_service.py`
merges `Reservation` + `StoreOrder` at query time (Salman's explicit 2026-08-20 decision: no new
table).

`customer_service.py` does implement CRUD, but **no route exposes it** — it is used internally.
Since 2026-09-07 (Data Model Consolidation, Phase 3a) `StoreOrder.customerId` is a real FK to
`Customer`, so a person who buys *and* books at one tenant is one row rather than two identities.

## Admin Projection

`GET /api/v1/admin/customers/` → `customer_registry_service.list_customer_registry(clientId)`.
Mounted and reachable. Tenant comes from the authenticated user (`user.clientId`), never from a
parameter.

## Public Projection

Not applicable — Customers is an Admin-only Capability; there is no tenant-facing public read
surface for a tenant's own customer list.

## Single Source of Truth

`Customer` is the model. `customer_registry_service.py` is the single **read** path for the
registry; `customer_service.py` remains the single write path for `Customer` rows, used internally
by the booking/reservation/store flows rather than by any route.

## Governance

**Permissions**: `customers.read` (Slice 3 of the Permission Model). No `customers.write` exists,
deliberately — there is no write surface to grant.

**Draft/Publish, Audit, Versioning, Activity**: shared platform-wide Gaps, not independently
tracked for this Capability given it isn't reachable yet at all.

## Acceptance

Not independently re-scored. The previous **~13% (unreachable)** figure was based on the incorrect
claim above and should not be cited; a real score needs its own pass.

## Maturity

**Live (read-only)** — mounted, permission-gated, tenant-scoped, and verified reachable end-to-end
on `mr-h` + `rk` when it shipped (2026-08-20).

## Open Findings

**CLOSED — Missing Architecture (route unmounted).** Resolved by the Customer Registry work
(2026-08-20, `b8d0081`). The route is mounted, and the `client_id` query parameter that finding
warned about **no longer exists at all** — the tenant is derived from the authenticated user.

**Open — identity still merges on a phone string.** `customer_registry_service` groups by phone
number, not by `Customer.id`. Rows with no phone land in one shared `no_phone` bucket. Phase 3a
(2026-09-07) made the underlying FKs real, so a future pass *could* join instead of match — that
was deliberately not done, since the current path already joins `Customer` first and uses phone
only as the fallback.

## Related

- `../adr/TOS-001-tenant-os.md` — the Interface anatomy this finding violates (a Capability that
  exists internally but has no real Dashboard Interface reaching it).
