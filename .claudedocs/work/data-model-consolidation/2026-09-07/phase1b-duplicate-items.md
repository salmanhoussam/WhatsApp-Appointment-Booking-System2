# Phase 1b — 11 of the 12 duplicate service rows deleted

**Status:** CLOSED · verified in a real browser after execution

## What the rows were

Before the CatalogService/CatalogItem split (Phase 3.7C, 2026-08-08) a bookable service was a
`CatalogItem` carrying `metadata.requires_booking = true`. The split built the real model; the old
rows were never removed. `rk` and `mr-h` each held their six services **twice**.

Selector used: `metadata ? 'requires_booking'` — the fossil marker itself, never a name list, so a
real product sharing a service's name could not be caught by accident.

## The guard earned its place immediately

The script refuses to delete a row that has no `CatalogService` twin, because such a row is not a
duplicate — it is the only record of a service the tenant appears to offer. On the first dry run:

```
!! KEPT  mr-h / تمشيط أو تسريح -- no CatalogService twin, not a duplicate
11 deletable (twin confirmed) · 1 kept
```

`mr-h`'s service list has `شعر ودقن وتمشيط` instead. Had the script deleted by marker alone — which
the plan's wording implied — it would have removed a service from a live tenant. **1 of 12 was not
what it looked like.** `mr-h` is deferred work; the row is left for a decision, not cleaned up.

## Collateral, checked before deleting

Every FK referencing `catalog_items`, from `information_schema`:

| child | rule | referenced by the 12 |
|---|---|---|
| `store_order_items` | CASCADE | **0** |
| `store_cart_items` | CASCADE | **0** |
| `gallery_images` | CASCADE | **0** |
| `restaurant_order_items` | RESTRICT | 0 rows platform-wide |

The script aborts rather than cascading if any of these is non-zero at run time.

## Result

```
deleted 11 rows · remaining fossils: 1
rk:   services=7  items=5     (5 = the real store products)
mr-h: services=6  items=1     (1 = the kept orphan)
```

## Verification — real browser, live production

`https://demo.salmansaas.com/rk/home`, 4s after load:

```json
{ "rootLen": 47909,
  "servicesFound": ["شعر","شعر ودقن","كرياتين","دقن","تمشيط أو تسريح","حنة أو صبغة"],
  "hasBookCta": true, "hasAddToCart": true,
  "headings": ["RK Barber Shop","من نحن","خدماتنا","احجز موعدك الآن","منتجاتنا","ساعات العمل"] }
```

All six services still render under **خدماتنا** with **احجز الآن**, and the store still renders under
**منتجاتنا** with **أضف للسلة**. Screenshot: `rk-home-after-dupe-cleanup.png`.

Note this ran against the **currently deployed** frontend, which still holds the old branch
condition — `rk` takes the services branch under both the old and the new condition, so this proves
the data deletion is safe independently of the Phase 1a code change.
