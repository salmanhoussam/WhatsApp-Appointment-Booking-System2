# Phase 4a — cart isolation moved into the repository

**Status:** CLOSED · verified end-to-end on live production

## What was wrong

`store_cart_items` has no `client_id` of its own, and the cart repository was **entirely
tenant-blind**: `find_cart_by_session` did `find_unique(where={"sessionId": ...})` — `sessionId` is
globally unique — with no tenant column at all. It would hand back another tenant's cart.

The only thing preventing that was **five separate route call sites** each remembering to write
`if cart.clientId != tenant["id"]`. All five were present and correct, so this is **defence in
depth, not a live bug fix**. The risk was the sixth caller.

## What changed

| function | before | after |
|---|---|---|
| `find_cart_by_session` | `find_unique(sessionId)` | `find_first(sessionId + clientId)` |
| `get_or_create_cart` | unscoped find, unscoped race re-fetch | both scoped |
| `list_cart_items` | `cartId` only | `+ cart.is.clientId` |
| `delete_cart_item` | `cartId` only | `+ cart.is.clientId` |
| `delete_all_cart_items` | `cartId` only | `+ cart.is.clientId` |
| `delete_cart` | `delete(id)` | `delete_many(id + clientId)` |

A foreign cart is now indistinguishable from a missing one, and callers already 404 on `None`.

**`upsert_cart_item` is left unscoped, deliberately.** Prisma's `upsert` addresses one compound
unique key and accepts no relation filter, so a tenant clause cannot be expressed. It is safe
because every `cart_id` now provably comes from one of the two scoped resolvers — there is no path
left that produces an unscoped cart id. A per-item ownership SELECT would also cost one extra query
per item on the bulk endpoint for a guarantee the resolvers already give.

Confirmed no other module calls any of these: all cart access goes through `public/store.py`.

## Verification — real HTTP against production

```
product=49ceda8a…  session=71a9427c…
1. add to cart                        -> 200
2. read cart (rk)                     -> items=1
3. read cart (olivello, cross-tenant) -> items=0   ✅ isolated
4. remove item                        -> 200
5. cart now empty                     -> items=0
```

---

# Side finding — the restaurant order engine is broken, not merely unused

Input to the next step (order-engine unification). Measured live, not inferred.

**Every `RestaurantConfig`-gated route 404s for every tenant, because `restaurant_configs` has 0
rows platform-wide:**

```
POST /public/restaurant/orders   (caracas) -> 404   "Restaurant not configured for this tenant."
GET  /public/restaurant/menu     (arizona) -> 404
GET  /public/restaurant/menu/categories    -> 200   (does NOT touch the config)
```

So `restaurant_orders` holding 0 rows is not disuse — **the endpoint cannot succeed.**
`CartPage.jsx:324` posts to exactly that path.

**caracas survives because its menu never needed the broken route.** `useCaracasMenu.js` fetches
`/restaurant/menu/categories`, which is config-free. Verified in a real browser — the live page
renders 10 categories and real prices:

> كاراكاس · تشاينيز $4.50 · فاهيتا $4.50 · قريدس $5.00 · فرانسيسكو $4.00 …

**And caracas does not sell online at all.** The page's only buttons are category filters — no cart,
no add, no order CTA (`orderCtaPresent: false`). It is a **digital menu**, not an ordering system.
That, not the 404, is why no restaurant order has ever existed.

Consequences for the unification:

- Retiring `restaurant_orders` / `restaurant_order_items` / `restaurant_configs` removes a path
  that has never worked and that no live tenant uses.
- `CartPage.jsx`'s restaurant branch must be repointed at the store order engine — otherwise a
  future restaurant tenant with a real cart inherits the same dead end.
- `OrdersTab.jsx:352` picks the `restaurant` endpoint whenever a tenant has that capability, so
  caracas's dashboard Orders tab reads a table that is permanently empty. Same repoint fixes it.
