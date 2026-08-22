# Localhost Production Readiness — Store: cart/category separation at the source (2026-08-22)

Fixes the finding confirmed at the end of the last session: rk's Store → "الخدمات" (Services) tab
let a non-Store item enter the Store cart, breaking checkout with a 404. Scope, per Salman's
explicit instruction: read-only investigation first, smallest safe fix at the source, no
cart/checkout rebuild, no cash-only change, no WhatsApp-mechanism change, no scope expansion beyond
Store. Railway explicitly out of scope for this task.

## Investigation (read-only, done before any code change)

Confirmed via a real, read-only DB query on rk: two real categories exist —
`"منتجات العناية"` (`module_key: 'store'`, 4 real products, real prices 7–22 USD) and
`"الخدمات"` (`module_key: 'catalog'`, 6 real services, real prices — all 5 USD). Both categories'
items are real, correctly-priced `CatalogItem` rows; nothing in the data itself is wrong.

Traced the real render path: `useCatalog()` (`frontend/src/hooks/useCatalog.js`) deliberately
fetches **every** real category for the tenant with no `module_key` filter — confirmed intentional
by that hook's own comment ("no tenant-wide moduleKey gate... nothing here needs to know 'the
tenant's type'"). `CatalogPage.jsx` (the consumer, rendered at `/rk/store`) was the actual gap: it
only checked `canOrder = hasOrderCapability(config?.active_services)` — a **tenant-level** "can
this tenant order at all" check — before passing `onAddToCart` down to every category's items,
regardless of which specific category was being browsed. Since rk has real order capability, both
"منتجات العناية" (correctly) and "الخدمات" (incorrectly) rendered the identical "+ أضف للسلة"
affordance.

Confirmed the real backend-side consequence: `app/repositories/store_repo.py`'s own
`category.moduleKey == "store"` filter is what genuinely rejects a non-store `catalog_item_id` with
a 404 during `POST /store/cart` — this part of the backend was already correct; the frontend was
offering an action the backend was always going to refuse.

### Relationship to the parked "0 USD" finding — resolved, not just connected

Traced the full formatting chain for a real service item ("شعر", real DB price `5`):
`app/services/catalog_service.py`'s `_fmt_item_public()` correctly returns `price: 5.0` — confirmed
backend-correct. `CatalogItemCard.jsx` renders it via
`Number(item.price).toLocaleString('ar-SA')`, and the `'ar-SA'` locale formats digits as
**Arabic-Indic numerals** — `5` becomes `٥` (U+0665), which visually resembles a "0" at small font
sizes. Confirmed live, character-by-character, via the raw DOM text node: the literal rendered
character is `٥`, not `0`. This is independently the same conclusion the earlier Final Production
Gate Audit's own accessibility-tree read reached
(`.claudedocs/work/final-production-gate-audit/2026-08-22/summary.md`'s own side finding). **The
"0 USD" finding is very likely not a real price bug at all — a misread Arabic-Indic digit.** Not
"fixed" here (nothing to fix — the data, backend, and frontend arithmetic are all already correct);
registered explicitly so this long-parked finding isn't carried forward as an open bug without this
evidence attached.

**These are two independently confirmed, separate root causes on the same page** — the cart-
breaking 404 is real and now fixed; the "0 USD" finding is very likely a legibility artifact, not a
functional defect. Per `investigation-protocol.md`'s "Independent Causes Are Allowed", reported as
two distinct findings, not force-merged into one story.

## Fix — smallest safe change, at the source

One file, `frontend/src/pages/generic/normal/CatalogPage.jsx`:

```js
const canOrderActiveCategory = canOrder
  && (activeCategory?.module_key === 'store' || activeCategory?.module_key === 'restaurant')
...
onAddToCart={canOrderActiveCategory ? onAddCart : undefined}
```

`canOrder` (the tenant-level check) is unchanged and still solely gates the floating `CartBadge` —
a real cart holding real Store items must stay reachable regardless of which category tab is
currently being browsed. Only the per-item `onAddToCart` pass-through gained the additional,
per-category real-`module_key` check. No change to `useGenericStore.js`, `CartPage.jsx`,
`useCatalog.js`, `store_repo.py`, or any checkout/WhatsApp/payment logic — the fix is exactly where
Salman asked for it: the source that decides whether the action is even offered, not a workaround
inside checkout.

## Real browser verification — both tenants, real dev servers, real DB

Same locally-minted admin-JWT-free (public pages) real dev-server technique already established.

- **rk, "الخدمات" tab**: confirmed via raw DOM inspection — **zero** `<button>` elements inside any
  service card, even under a direct `hover` — the add-to-cart overlay no longer renders at all for
  this category. Real price text confirmed to be `٥` (Arabic-Indic 5), not `0`.
- **rk, "منتجات العناية" tab**: completely unaffected — "+ أضف للسلة" overlay renders and works
  normally, add-to-cart, cart page (correct item/price), and a **real cash order completed through
  the normal "تأكيد الطلب" button** (not the WhatsApp quick-button, to specifically prove the
  primary cash-checkout path is intact): `payment_method` select defaulted to `cash` (unaffected
  cash-only decision), real `POST /store/orders` → 200, real success screen with a real order ID.
- **mr-h**: completely unaffected — no store/cart UI (never had any, unrelated to this fix), real
  independent reservation flow renders normally end-to-end.
- Console: 0 errors, 0 warnings across both tenants, every step.
- **Cleanup**: the real test order (`5e1ff0d1-ed38-45e6-b079-3ec5b16cc7ee`, customer
  "SOURCE-FIX-VERIFY-CASH") was cancelled via the real admin API
  (`PATCH /admin/store/orders/{id}/status`, `{"status":"cancelled"}`) — confirmed `status:
  "cancelled"` in the response, matching this project's soft-cancel convention. No raw DB writes,
  no deletes.

## No new P0/P1 findings surfaced during this fix

Nothing found that blocks the purchase journey beyond what's already documented above. The already-
known architecture note from the prior session's own investigation
(`POST /store/cart` calling `store_repo.py` directly with no `store_service.py` in between — a
layering deviation from `rules/backend/api-rules.md`) is a real, pre-existing, unrelated
observation — not touched, not re-verified independently in this pass, registered here only for
completeness since it surfaced during the same investigation thread.

## Acceptance — checked explicitly against every instruction

- ✅ Read-only investigation done first, real root cause identified before any code change.
- ✅ Fixed at the source (the category-level gate), not a checkout-side workaround.
- ✅ Cart/checkout mechanism, `CatalogItem`/`StoreOrder` models — untouched.
- ✅ Cash-only decision — unaffected, verified live (cash still the real default).
- ✅ WhatsApp order mechanism — untouched, not exercised in this pass (the normal cash-submit path
  was used instead, deliberately, to isolate what was actually being tested).
- ✅ No expansion to Marketplace/Menu/Demo application — single file touched, `CatalogPage.jsx`.
- ✅ mr-h: zero behavior change, confirmed live.
- ✅ rk Store products: full real flow works, real order created and cleaned up.
- ✅ rk Services tab: no longer breaks cart/checkout — because it can no longer add anything to the
  cart in the first place.
- ✅ "0 USD" behavior checked during testing — resolved as a likely non-bug (Arabic-Indic digit),
  not fixed since there's nothing broken to fix.
- ✅ 0 console errors.
- ✅ Real test order cancelled, DB restored to its real prior state (only a `status` column change,
  matching this project's own soft-cancel convention for every prior test this session).

## Result

**DONE.** Not proceeding to Railway or any P2 item, per instruction.
