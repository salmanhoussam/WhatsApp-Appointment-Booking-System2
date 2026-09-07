# Order Engine Unification — one purchase path for every vertical

**Salman's ask:** unify orders, carts, customers, products and their invoices across all verticals,
in the fewest tables.

**There is no invoice model in this schema and none was added.** The order row *is* the invoice
record — totals, line items, payment method, status, and now vertical-specific fields. Confirmed by
grep: no `invoice` model or table exists anywhere.

## The end state — 4 tables carry a purchase, for every vertical

| table | role |
|---|---|
| `customers` | **who** — unified in Phase 3a; one identity for booking *and* buying |
| `catalog_items` | **what is sold** — already unified, `module_key` classifies the catalog |
| `carts` + `cart_items` | purchase in progress |
| `orders` + `order_items` | completed purchase = the invoice record |

Down from **7**: the restaurant engine's `restaurant_orders`, `restaurant_order_items` and
`restaurant_configs` are gone.

## Why two engines could merge at all

**`table_number` was the only genuinely restaurant-shaped field.** It now travels in the order's
`metadata` — the same escape hatch `CatalogItem.metadata` and `Reservation.metadata` already use,
rather than a column that would be NULL on nearly every row.

**Statuses became the union of both vocabularies**, with one merged transition map:

```
store       pending -> processing -> shipped -> delivered -> refunded
restaurant  pending -> preparing  -> ready   -> delivered
```

Deliberately **not** a per-vertical lookup. `Client.vertical` is NULL for 17 of 20 tenants, and
branching on a capability key would recreate exactly the "data source chosen by an activation flag"
defect fixed in the homepage Services section the same day. Merging keeps every guarantee that
mattered: a pending order still cannot jump to delivered, and the two paths never cross.

## Two things had to give way

**`require_any_service()`.** caracas holds `restaurant` and has never held `store`, so the unified
routes would have 403'd it out of the very tab meant to show its orders. Added as a *sibling* of
`require_service`, not a rewrite — single-key gating stays correct for every other route, and only
the cart/order routes are relaxed. Products and categories keep the old gate.

**`find_product_for_cart` accepted `module_key='store'` only.** A menu item is bought exactly like a
shop product; `module_key` classifies a catalog, it does not declare what is purchasable. Now an
explicit two-key list (`store`, `restaurant`) rather than "any module", so a `catalog` fossil still
cannot reach a cart by accident.

## The engine that was removed was never merely idle

| claim | evidence |
|---|---|
| `restaurant_configs` empty platform-wide | 0 rows |
| every route gated on it 404s | `POST /restaurant/orders` → 404 · `GET /restaurant/menu` → 404, live |
| the frontend posted to exactly that path | `CartPage.jsx:324` |
| so no tenant could ever place a restaurant order | `restaurant_orders` = 0 rows, explained |
| it also broke rule #1 | `RestaurantOrder` has **no `client_id`** — it hangs off `restaurant_id` → `RestaurantConfig` |
| the live restaurants never used it | caracas's menu page has **no cart and no order CTA** — verified in a real browser; it is a digital menu |
| `/restaurant/menu` was safe to delete | caracas *and* arizona both render fully through `/menu/categories`, verified in a real browser |

The **menu CRUD is untouched.** Only the order and config half was dead.

## Proof, on live production, before dropping anything

A caracas customer placed a real order through the unified engine:

```
1. add menu item (تشاينيز) to unified cart  -> 200
2. checkout with table_number "12"          -> order 4f347829, total 9.00

DB: tenant=caracas · metadata={'table_number': '12'} · customer linked=True
    line items=1 · total=9.0  (4.50 × 2 ✓)
```

**The first restaurant order this platform has ever recorded.** The probe order and its customer
were deleted immediately afterwards; `store_orders` back to 15.

## Ordering

Code removal shipped and deployed **before** the tables were dropped — the Phase 2d lesson, where
dropping `services` in the same breath as the code change took smar's listings down until the
deploy landed.
