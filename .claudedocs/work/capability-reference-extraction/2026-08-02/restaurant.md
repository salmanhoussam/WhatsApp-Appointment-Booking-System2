# Restaurant (Menu + Ordering) Capability

## References

- **`caracas`** — `arizona`'s feature set is too thin (no cart, no admin dashboard at all) to count
  as a second real data point, excluded as a reference.

## What exists today

A bespoke, per-tenant build — `caracas/normal/MenuPage.jsx`, its own inline `OrderPanel`, its own
`CaracasAdminDashboard.jsx` (Orders/Menu/Stats tabs) — never generalized into the shared `generic/`
layer the way Store was.

## ✅ Keep

- Menu structure and category grouping
- Admin Orders/Stats tabs
- Real state-machine order-status transitions → `app/api/v1/admin/restaurant.py:29`

## ❌ Remove

- `caracas/normal/MenuPage.jsx:33-38`'s client-only order flow — confirmed real bug, it builds a
  `wa.me` link and clears the cart without ever calling the backend. No order row is ever persisted
  from the real customer journey; the Admin's own Orders/Stats tabs read from a path nothing writes
  to. This must not ship as-is — the underlying structure (menu, admin) is worth keeping, the wiring
  is not.
- `MenuTab` in the admin dashboard — read-only despite backend CRUD already existing for it

## 🟦 Missing Capability

- Customer-facing order-tracking UI — only a phone-lookup backend endpoint was found
  (`GET /orders/{id}`), no confirmed UI calling it
- Same variants/discount gap as Store — shared `CatalogItem` model, same loose `metadata` bag issue

## 🎯 Target Architecture

**Frontend**
- Menu (already real, candidate to promote into the generic layer)
- Cart/Checkout (needs to actually call the backend — currently doesn't)
- Order Tracking (new)

**Backend**
- `app/api/v1/admin/restaurant.py` (already real, the state machine is good) — needs the frontend
  actually wired to it

**Shared Models**
- `CatalogItem` / `RestaurantOrderItem` (already real)

**Tenant Customization**
- Menu categories
- Branding
- Table/delivery configuration
