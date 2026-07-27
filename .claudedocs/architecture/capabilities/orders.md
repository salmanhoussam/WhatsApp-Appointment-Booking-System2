# Orders Capability

Per the Capability Contract model (`../adr/TOS-003-capability-contract-model.md`). Extracted from
`TENANT_OS_PLAN.md` §13 (Contract), §19/§20 (Open Findings/Maturity) during the ADR-0003 migration
(Phase 5).

## Ownership

Order records and their status lifecycle, across Booking, Store, and Restaurant module types. Note
Booking's own order-equivalent (Bookings) is architecturally ahead of Store/Restaurant here — see
Open Findings.

## Contract

| Sub-capability | Status | Mechanism |
|---|---|---|
| View orders | ✅ Real | `GET /{moduleKey}/orders` (`OrdersTab.jsx`) |
| Update order status | ✅ Real | `PATCH /{moduleKey}/orders/{id}/status` |
| Create an order manually (phone order) | ✅ Real for Booking only; ⚠️ Gap for Store/Restaurant | Booking's `AdminBookingModal` does this (`POST /bookings/`); no equivalent found for Store/Restaurant orders |
| Export orders | ⚠️ Gap | Not found |
| Cancel / refund distinct from a status change | ⚠️ Gap | Only status-transition exists today; no distinct refund/reversal action |

## Operations (Editing Engine, `TOS-002`)

Orders are read/mutated through `OrdersTab.jsx` today via direct route calls, not yet expressed as
Editing Engine Operations — no `EditableRegion`/Discovery integration exists for this Capability.
Status update most naturally maps to a bounded `UpdateField` (a fixed enum of statuses) once this
Capability is wired into the Engine; not yet done.

## Schema

Booking module: `Booking` (has `booking_service.py`, a real Service). Store/Restaurant modules: no
dedicated `Order` model with its own Service — status/read logic lives directly in
`store.py`/`restaurant.py` via `store_admin_repo`/`restaurant_admin_repo`.

## Admin Projection

`app/api/v1/admin/store.py`, `restaurant.py` for Store/Restaurant orders (no Service layer — see
Open Findings); `app/api/v1/admin/bookings.py` → `booking_service.py` for Booking (correctly
layered).

## Public Projection

Customer-facing order placement is out of this Capability's scope (handled by each module's public
booking/checkout flow) — this Capability covers only the tenant-facing Admin view/management side.

## Maturity

**Developing** — Dashboard works in production today for all three module types; Implementation is
Missing Architecture for Store/Restaurant (below).

## Open Findings

**Missing Architecture — Orders, Store/Restaurant (`store.py`, `restaurant.py`).** No dedicated
order service exists for either module (confirmed against the full `app/services/` listing — note
Booking's own order-equivalent, Bookings, *does* have `booking_service.py`; this Gap is specific to
Store/Restaurant); both route files call `store_admin_repo`/`restaurant_admin_repo` directly for
all order reads and status updates.

## Related

- `../adr/TOS-001-tenant-os.md` — the Capability anatomy this file's Service-layer gap is measured
  against (Contract → **Service** → Repository → Database — the missing middle layer here).
