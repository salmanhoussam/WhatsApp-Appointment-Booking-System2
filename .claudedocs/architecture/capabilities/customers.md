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
| View customer list | ⚠️ Real code exists, but **not live** | `app/api/v1/admin/customers.py` defines full CRUD, but is never `include_router`'d in `app/api/v1/admin/__init__.py` — confirmed by reading that file's router list directly; this endpoint is unreachable today |
| Edit / delete a customer | ⚠️ Same as above | same file, same unmounted status |

This Capability's gap is treated as a formally-classified Architecture Integrity Finding (below),
not an ordinary Gap — the internal implementation is correct; the failure is one layer up.

## Operations (Editing Engine, `TOS-002`)

Not applicable yet — the Capability is unreachable end-to-end, so no Editing Engine integration has
been attempted.

## Schema

`Customer` model — full CRUD implemented in `customer_service.py`.

## Admin Projection

`app/api/v1/admin/customers.py` → `customer_service.py` — internally correct, but the route itself
is never mounted (see Open Findings).

## Public Projection

Not applicable — Customers is an Admin-only Capability; there is no tenant-facing public read
surface for a tenant's own customer list.

## Maturity

**Experimental** — Service correctly built, but its route is unmounted and unguarded — unreachable
end-to-end.

## Open Findings

**Missing Architecture — Customers (`customers.py`).** The Service itself is correctly built
(`customer_service.py`, real full CRUD) — the missing piece is one layer up: the route is never
`include_router`'d in `app/api/v1/admin/__init__.py` (confirmed by reading that file's include list
directly), so the Capability is unreachable end-to-end despite being internally correct. Once
mounted, its endpoints also need a tenant-auth dependency added — they currently take `client_id`
as an **unguarded query parameter** with no `get_current_tenant`/`get_current_admin_user`/
`require_service` dependency anywhere in the file, unlike every other admin route.

## Related

- `../adr/TOS-001-tenant-os.md` — the Interface anatomy this finding violates (a Capability that
  exists internally but has no real Dashboard Interface reaching it).
