# RK Barber — Service/Product Catalog Separation + Real Store Order (End-to-End Verification)

**Tenant:** `hr` (RK Barber Shop) — **Date:** 2026-07-28 — Follows `investigation-protocol.md`'s
evidence discipline and `bo-hussein.md`'s End-to-End Verification Routine. Screenshots referenced
below are saved at `/tmp/claude-1000/.../scratchpad/` (session scratchpad, shown directly in
conversation — not committed to the repo per this project's existing evidence convention).

## Confirmed Findings

1. **The service/product separation mechanism already existed** — `CatalogCategory.moduleKey`
   (`prisma/schema.prisma:402`), and `store_repo.py` (lines 26/47/58/75) already filters
   Cart/Checkout queries by `category.moduleKey == "store"`. This is not new architecture.
2. **The gap was purely in the Admin UI** — `CatalogTab.jsx`'s `EMPTY_CAT` never included
   `module_key`, so every category created through the Generic Admin Dashboard silently used the
   backend's `module_key: str = "catalog"` default (`app/api/v1/admin/catalog.py:20`). Confirmed
   directly by reading both files side by side before making any change.
3. **`hr`'s real starting state** (checked via direct Prisma query before any change): services
   active = `catalog`, `booking`, `whatsapp_ordering`, `reservations` — **`store` was not active**.
   One category ("الخدمات", `module_key="catalog"`), 3 items (الشعر / قصة / كرياتين), all haircut
   services.
4. **Fix applied** — `frontend/src/pages/generic-admin/tabs/CatalogTab.jsx`: added a
   Service/Product type selector (mapped to `module_key`) in the category-creation modal, disabled
   on edit (backend's `CategoryUpdate` schema doesn't accept `module_key`, left alone deliberately
   to avoid re-classifying a category with existing data), plus a colored type badge on every
   category card (`منتج` green for `store`, `خدمة` purple for `catalog`).
5. **`store` service activated for `hr`** via a new scoped one-off script,
   `scripts/activate_hr_store_service.py` — mirrors `set_hr_working_hours.py`'s pattern (direct
   Prisma write scoped to `Client.slug == "hr"` only, never touches any other tenant or
   `SUPER_ADMIN` row). Real output: `'store' service created+activated for hr
   (7ef5c8c9-3d47-4aa9-b5e0-43b746ee2657), row id=d50a822d-bf1c-454a-8c4f-38acf56c1a44`.
6. **Real category + real products created** via the actual admin API (not a raw DB insert) —
   `POST /api/v1/admin/catalog/categories` with `module_key: "store"` → category id
   `9d38a82e-0f64-4cea-bfb0-302f458bc6c4` ("منتجات العناية" / Grooming Products), then 4 real
   `POST /api/v1/admin/catalog/items` calls: Hair Fixing Spray ($8), Styling Wax ($10), Styling Gel
   ($7), Men's Cologne ($22).
7. **Confirmed publicly reachable** — `GET /api/v1/public/store/products` (with `X-Tenant-Slug: hr`)
   returned all 4 real products with the correct `category_id`, proving the `moduleKey="store"`
   wiring works end-to-end, not just in the admin view.
8. **Real Cart + Cash Checkout order placed**:
   - `POST /public/store/cart` × 2 (2× Styling Wax, 1× Men's Cologne)
   - `GET /public/store/cart/real-e2e-test-session-01` confirmed both items, correct prices
   - `POST /public/store/orders` (`payment_method: "cash"`) → **200**, order id
     `c8ba498e-dd6e-4a61-9ee9-03d01f19bcd0`, `total_price: 42.0`, `status: "pending"`
9. **Real DB row confirmed** (direct Prisma read-back, full dump):
   ```json
   {
     "id": "c8ba498e-dd6e-4a61-9ee9-03d01f19bcd0",
     "clientId": "7ef5c8c9-3d47-4aa9-b5e0-43b746ee2657",
     "customerName": "زبون اختبار متجر حقيقي",
     "customerPhone": "+96170000010",
     "totalPrice": 42.0,
     "currency": "USD",
     "paymentMethod": "cash",
     "status": "pending",
     "items": [
       {"catalogItemId": "49ceda8a-...", "quantity": 2, "unitPrice": 10.0, "totalPrice": 20.0},
       {"catalogItemId": "8dde72f3-...", "quantity": 1, "unitPrice": 22.0, "totalPrice": 22.0}
     ]
   }
   ```
   Category re-checked directly: `module_key = "store"` — confirmed correct, not reverted.
10. **Real headless-Chrome screenshots** (real JWT injected into `localStorage`, real browser
    render, same technique as the Reservations Calendar verification):
    - Catalog tab: two category cards, visually distinct — "منتجات العناية" with a green **منتج**
      badge, "الخدمات" with a purple **خدمة** badge. This directly resolves the original complaint
      ("services shown mixed in as if they were items").
    - Expanded "منتجات العناية": all 4 real products listed with correct names/prices.
    - Orders tab: the real order visible — customer "زبون اختبار متجر حقيقي", USD 42, status
      "معلق" (pending), 2 items, dated 28 يوليو 2026 — matching the DB row exactly.

## Side Findings

- The dev environment's backend hit the same intermittent Supabase pooler issue already logged in
  `.claudedocs/reviews/pilot-test-20260720-verification.md` (`EngineConnectionError` on the pooled
  `DATABASE_URL`). Resolved on a single quick retry, consistent with that finding — not a new
  issue, no fresh log entry needed per Salman's own established "quick retry, then move on"
  handling of this known environmental flakiness.
- An old, unresponsive `uvicorn` process from an earlier session was found still bound to port 8000
  (hanging, not serving) and had to be killed before a fresh instance could start.

## Unknowns

- The `CategoryUpdate` API path still cannot change `module_key` after creation — intentional for
  this fix (avoids silently re-classifying a category with live orders/reservations), but if a
  tenant genuinely needs to reclassify a category later, that remains unbuilt.
- No automated test covers the new type selector; verified manually via the real admin UI and
  API only, per this session's time budget.

## Recommendation vs Decision vs Execution

- **Recommendation** (made to Salman before implementing): expose the existing `module_key` field
  in the Admin UI rather than introduce a new schema field — smaller, reuses proven architecture,
  no migration.
- **Decision**: approved implicitly by Salman's own request to "افصل بين طلب خدمة وطلب سلعة... ونكمل
  شغلنا" (separate service-request from product-request... and continue), which described exactly
  this outcome (real products, real order, real proof).
- **Execution**: as documented above, this session, 2026-07-28.
