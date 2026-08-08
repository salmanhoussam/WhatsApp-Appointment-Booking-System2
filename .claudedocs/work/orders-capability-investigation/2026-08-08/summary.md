# Orders Capability Investigation — "Done enough for RK/Ali?"

Follows: `investigation-protocol.md`, `service-execution-constitution.md`. Same discipline as the
Phase 3.7C Staff↔Service investigation, applied to Orders per Salman's explicit request — no code
written, no assumption that Ali needs what RK has until proven by real comparison.

## 1. Backend

**Two separate, parallel order systems exist — not one unified "Orders" capability.** `Restaurant`
(`RestaurantOrder`/`RestaurantOrderItem`, `schema.prisma:568-603`) and `Store`
(`StoreOrder`/`StoreOrderItem`/`StoreCart`/`StoreCartItem`, `schema.prisma:610-711`) are fully
independent models, tables, repositories, and routes. For RK/Ali (barbershops with `store` as an
optional retail add-on, not `restaurant`), the relevant system is **Store**.

- **Models**: `StoreOrder` (id, clientId, customer fields, totalPrice as `Float` — inconsistent with
  `RestaurantOrder.totalPrice`'s `Decimal(10,2)`, currency, status, paymentMethod, shippingAddress
  Json, notes), `StoreOrderItem` (catalogItemId FK, quantity, unitPrice, totalPrice, color/size),
  `StoreCart`/`StoreCartItem` (session-based, `catalogItemId` FK). `StoreCustomer` model exists but
  is **fully orphaned** — zero references anywhere in `app/` outside the schema; no signup/login
  flow; checkout is guest-only, `customerId` never populated on either `StoreCart` or `StoreOrder`.
- **Migrations**: none. These tables exist only via `prisma db push`, no dedicated migration file
  under `prisma/migrations/`.
- **Repositories**: `app/repositories/store_repo.py` (public-side: products, cart, checkout) and
  `store_admin_repo.py` (admin-side: order list/status/stats), both real. One real gap:
  `find_cart_by_session` filters only by `sessionId`, not `clientId` — tenant scoping is enforced
  after the fetch (`store.py` public routes check `cart.clientId != tenant["id"]` post-query), not
  at the DB `WHERE` clause — a deviation from this project's own multi-tenancy rule ("every DB query
  MUST filter by clientId — no exceptions").
- **Services**: **no service layer exists** — `app/services/` has no store/order/cart file.
  Checkout logic, status-transition rules (`STORE_TRANSITIONS`), and totals math live directly
  inside the route files (`app/api/v1/admin/store.py`, `app/api/v1/public/store.py`) — a real
  violation of this project's own Routes → Services → Repositories → DB rule
  (`backend/api-rules.md §1`, `backend/architecture.md §2`).
- **APIs**: real, both contracts present. Public (`public/store.py`): products, categories, cart
  CRUD, checkout (`POST /orders`), order lookup. Admin (`admin/store.py`): product/category CRUD,
  order list/status/stats. Every route gates on `require_service("store")`.
- **Gating**: `SERVICE_TYPE_MAP["ecommerce"] = ["store", "store.products", "store.cart"]` — only the
  bare `"store"` key is ever checked at runtime; `store.products`/`store.cart` are seeded but dead,
  never referenced by any `require_service()` call.

## 2. Dashboard

**Real, working — not a stub.** `GenericAdminDashboard.jsx` has a live "الطلبات" (Orders) nav entry
→ `OrdersTab.jsx`, a fully built list/detail view (search, status filters, sort, pagination, mobile
cards, expandable item/shipping/payment detail). Confirmed, directly relevant to RK/Ali: **which
backend it talks to is derived purely from `activeServices`** (`OrdersTab.jsx:344-346`,
`hasCapability(activeServices,'restaurant') ? 'restaurant' : hasCapability(activeServices,'store') ?
'store' : undefined`) — not from `service_type`. This is exactly the "shared dashboard, tenant
activation is config" shape Salman's rollout decision calls for; **no dashboard code needs to
change** for Ali. If neither key is active, `orderEndpoint` is `undefined` and the tab quietly shows
an empty/loaded state (`OrdersTab.jsx:374`, `if (!orderEndpoint) { setLoading(false); return }`) —
graceful, not broken, but also not informative about *why* it's empty.

## 3. Catalog ↔ Store/Order relationship

**Correct and consistent, no violations found.** `catalog_item_id`/`catalogItemId` — the one
sanctioned identifier per `catalog-contract.md` — is used end-to-end: `CatalogItem` (module_key
`store`) → cart item → `StoreOrderItem.catalogItemId`, verified in the public checkout route
(`store.py:240`) and in every tenant Zustand store checked (`useGenericStore.js`,
`useFootlabStore.js`, `useOlivelloStore.js`). No `product_id`/`menu_item_id` deprecated-pattern
usage found anywhere in the current cart/checkout code.

## 4. RK vs Ali — real state, not assumed

| | `rk` | `ali` |
|---|---|---|
| `client_services.store` | ✅ active | ❌ **not activated** |
| `store_orders` rows | 5 (all test/verification data — see below) | 0 |
| `store_carts` rows | 0 (carts expire; none currently live) | 0 |
| Dashboard Orders tab | Would resolve `orderEndpoint = 'store'` → real data | Would resolve `orderEndpoint = undefined` → empty tab, no error |
| Public checkout (`POST /store/orders`) | Reachable (service active) | **403** — `require_service("store")` rejects before reaching any Orders code |

RK's 5 `store_orders` rows are **all verification/test data** — `customer_name` values like "Pilot
Verify", "HTTPS Pilot Verify", "زبون اختبار متجر حقيقي" (Arabic: "real store test customer"),
`created_at` 2026-07-28/31, 4 of 5 already `cancelled`. The end-to-end checkout flow has been
**proven to work** (this is real evidence the pipe is live), but **zero genuine paying-customer
orders exist for either tenant** — Orders is technically functional, not yet operationally proven.

**What Ali is missing is exactly one thing, not a rebuild**: `client_services.store` isn't
activated. Everything downstream (backend routes, repos, dashboard tab, checkout UI, catalog
linkage) is the same shared code RK already uses — confirming Salman's "same system, configuration
not architecture" framing for this specific capability. Whether Ali *should* have `store` activated
is the same real business question named in the earlier `ali-customer-readiness` doc (does this
barbershop also sell retail products?) — not re-decided here.

## Side Findings (real, not the point of this investigation)

- Two independent order systems (Restaurant vs Store) where one might eventually be expected, per
  this project's own "One Capability, One Contract" principle — same shape as the Service/Item
  conflation Phase 3.7C already found and fixed once for Catalog. Not evidence enough on its own to
  propose unification (only two known consumers, both already working) — named per the Abstraction
  Rule as a pattern to watch, not to act on.
- No Service layer for Orders/Cart — a real, standing architecture-rule violation (routes calling
  repositories directly), independent of RK/Ali readiness.
- `StoreCustomer` model is fully dead code — zero real usage anywhere.
- `find_cart_by_session` tenant-scoping gap (filters by `sessionId` only, `clientId` check happens
  after the fetch, not in the query).
- `StoreOrder.totalPrice`/`unitPrice` use `Float`, not `Decimal` — a real precision-safety
  inconsistency versus `RestaurantOrder`'s `Decimal(10,2)`.

## Unknowns

- Whether Ali's business actually needs `store` (retail products alongside services) — a product
  question, not technical, still open from the earlier readiness doc.
- Whether the Restaurant/Store order-system duplication is worth a Maturity Review now or should
  wait for a third real consumer — not decided here, named only.

## Completion Bar — what "Orders done enough for RK/Ali" actually means

Given the evidence above, the bar is **not** "build something new." It's:

1. **Backend, dashboard, catalog-linkage**: already real and working for any tenant with `store`
   active — no gap blocks RK or a would-be Ali-with-store-activated today.
2. **RK-specific**: Orders is code-complete and proven end-to-end via test/verification traffic;
   what's missing is real customer usage, not implementation — not something to "build," something
   that happens operationally once RK is actually taking orders.
3. **Ali-specific**: the only blocker is the `client_services.store` activation decision (a business
   question, one Super Admin toggle once decided) — everything else already works identically to RK
   because it's the same shared system.
4. **Standing technical debt, explicitly not blocking RK/Ali**: no Service layer (architecture-rule
   violation), `find_cart_by_session`'s scoping gap, `Float` vs `Decimal` inconsistency,
   `StoreCustomer` dead code, dual Restaurant/Store order systems. None of these have caused a real
   incident and none are named as urgent by this investigation — they're debt to track, not to fix
   as a precondition for calling Orders "done."

**Verdict: Orders is functionally done for the shared-system/multi-tenant purpose this investigation
was asked to check.** No implementation plan follows from this investigation — per Salman's explicit
instruction, nothing gets built from this pass alone. The one real open item is the `store`
activation business decision for Ali, which was already named (not resolved) in the earlier
`ali-customer-readiness` doc.
