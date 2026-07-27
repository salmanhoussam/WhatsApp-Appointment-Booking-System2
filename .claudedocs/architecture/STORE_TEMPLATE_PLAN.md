# Store Template — Requirements Investigation

**Status:** Investigation only, per `TEMPLATE_ROADMAP_VISION.md`'s own rule ("does not design
Store's... template schemas, sections, or catalog shape — that happens when their turn arrives").
This document is that arrival — real code/schema investigation, grounded in what already exists
and what a real live Store tenant (`footlab`) actually exercises today, not speculation. **Not an
Implementation Contract** — no file changes proposed here; that is separate, future work once this
investigation is reviewed.

**Context:** Written 2026-07-27, immediately after the Restaurant template's visual sign-off was
logged as Blocked by Environment Network Egress (`.claudedocs/reviews/
pilot-test-20260720-verification.md`) — Salman's explicit call to proceed to Store (step 2 of the
roadmap) with that item settled per his own stated closure criteria, not silently skipped.

---

## 1. What Already Exists — Store Is Not a Green Field

Store already has a **live, real tenant** exercising most of this today: `footlab` (per
`CLAUDE.md`'s tenant table, Live ✅ since Phase 62, 2026-05-15). This investigation is grounded in
that real, running code — `app/api/v1/public/store.py`, `app/api/v1/admin/store.py`,
`frontend/src/pages/footlab/normal/{StorePage,CartPage}.jsx`, and the real Prisma models
(`StoreCart`, `StoreCartItem`, `StoreOrder`, `StoreOrderItem`) — not a blank slate.

## 2. Entity-by-Entity — Real State, Confirmed by Reading the Code

### Products — real, mature, but inherits a live architecture bug

Products are `CatalogItem` rows with `moduleKey: "store"` — the **same** Catalog Capability
Restaurant already uses (Phase 54's unification), documented in
`.claudedocs/architecture/capabilities/catalog.md`. Store needs **no new Product entity** — this
part is genuinely done and proven by `footlab`'s real production use.

**But it inherits a real, already-confirmed bug directly**: `catalog.md`'s Open Findings
(Duplicate Architecture) — `app/api/v1/admin/store.py` performs `CatalogItem`/`CatalogCategory`
CRUD (`create_product`, `update_product`, `delete_product`, category CRUD) via `admin_catalog_repo`
**directly**, bypassing `catalog_service.py` entirely. This is not a hypothetical risk for the
Store Template specifically — `store.py` is one of the two route files (with `restaurant.py`) the
finding names by name. Any Store Template work touching product management inherits this bug
already, on day one, not as a new risk introduced by Store.

### Product Variants — real field, structurally unreachable, unused in production

`CatalogItem.metadata.variants` is a real key both `app/api/v1/admin/store.py` and
`app/api/v1/public/store.py` read/write (`meta.get("variants", [])`) — but it is a **raw, unshaped
JSON array**, no defined structure, no validation, no model. Three real gaps confirmed by reading
the actual code, not assumed:

1. **No admin UI exposes it.** `frontend/src/pages/generic-admin/tabs/CatalogTab.jsx` (the shared
   product editor every store/restaurant tenant's dashboard uses) has zero references to
   `variant` — a tenant cannot set a product's variants from the dashboard today, despite the field
   existing end-to-end in both APIs.
2. **No shopper-facing UI exposes it.** `footlab/normal/StorePage.jsx` — the one real live Store
   tenant — has zero variant-selection UI. Confirmed by direct grep, not assumed.
3. **A structural gap between Cart and Order**: `StoreOrderItem` (`prisma/schema.prisma:642`) has
   real `color`/`size` columns — someone already anticipated variant selection at the *order-line*
   level. But `StoreCartItem` (`prisma/schema.prisma:601`) has **no such fields**, and
   `POST /api/v1/public/store/cart`'s own request body (`AddToCartIn`: `session_id`,
   `catalog_item_id`, `quantity`) has no way to carry a variant selection either. A shopper cannot
   choose a color/size before adding to cart — even if the UI existed, the current Cart contract
   can't carry the choice through to the Order that already has columns waiting for it.

**Conclusion**: Product Variants are not "missing" in the sense of no field existing anywhere —
they're a genuinely half-built path: a raw metadata field with no schema on the Product side, and
real but disconnected `color`/`size` columns on the Order side, with the Cart step in between
unable to carry either. This is the single largest real gap in "Store" as it exists today.

### Cart — real, working, proven in production

`StoreCart`/`StoreCartItem`, session-based (a UUID kept in the shopper's `localStorage`, no login
required), 7-day expiry, full add/get/remove flow (`app/api/v1/public/store.py`). This is real,
already exercised by `footlab` in production. No new entity needed — the only real gap is the
variant-carrying gap named above, which is a schema/contract extension of Cart, not a rebuild.

### Checkout — real, working, but shares Orders' already-documented Missing Architecture finding

`POST /api/v1/public/store/orders` creates a real `StoreOrder` + `StoreOrderItem` rows, computes
the total from real cart contents, accepts `payment_method` (defaulting to cash, consistent with
this project's cash-only billing decision) and an optional `shipping_address` (`Json?`). This
already works end-to-end for `footlab`.

**But it directly inherits `capabilities/orders.md`'s already-confirmed Missing Architecture
finding**: no `store_order_service.py` exists — both the admin side (`store.py`'s order routes) and
the **public checkout flow itself** (`public/store.py`'s `checkout()`) call `store_repo` directly,
with zero Service layer in between. This is not a new problem the Store Template introduces; it's
an existing, already-named gap that any real Store Template work would need to close as part of
"reference quality," the same way Restaurant's own reference-quality bar required real, working
buttons — not just data reaching the database.

### Store Settings — no new work; already fully owned by the Site Configuration Capability

Currency, brand name, WhatsApp/contact, theme tokens (primary color, font, catalog layout) are
**already** Site Configuration Capability concerns, per its Ownership Matrix
(`.claudedocs/architecture/capabilities/site-configuration.md`) — this applies identically
regardless of module type (store/restaurant/booking). "Store Settings" is not a distinct entity
Store needs invented; it is the same Site Configuration Capability, already documented, already
carrying its own known Broken Architecture finding (`settings.py` bypassing `client_service.py`)
that a Store tenant would be exposed to exactly as much as any other tenant type — not a
Store-specific risk.

## 3. Summary Table

| Entity | Real state | New work needed for Store specifically |
|---|---|---|
| Products | Real, mature (shared Catalog Capability) | None — inherits Catalog's existing Duplicate Architecture finding, not a new one |
| Product Variants | Real field, structurally unreachable, unused in any live tenant | The one genuine gap — Cart contract extension + admin/shopper UI, none of which exists today |
| Cart | Real, proven in production (`footlab`) | None, except carrying variant selections (same gap as above) |
| Checkout/Orders | Real, working, but no Service layer | Inherits `capabilities/orders.md`'s already-named Missing Architecture finding |
| Store Settings | Fully covered by Site Configuration Capability | None — not a Store-specific concept |

## 4. Recommendation

Store is materially closer to reference-quality than Restaurant was at the same stage — most of
its real entities already exist and are proven in production by `footlab`, not newly designed here.
The actual scope of Store-specific work is narrow: (a) decide whether Product Variants are worth
building end-to-end now (schema for `metadata.variants`, `StoreCartItem` extension, admin UI,
shopper UI) or explicitly deferred as a named Gap the same way Restaurant deferred several of its
own; and (b) whether closing Catalog's Duplicate-Architecture finding and Orders' Missing-Service
finding happens as part of "Store reference quality" or is inherited as pre-existing debt the Store
Template doesn't have to fix to be considered done — that's the same kind of scope call Restaurant
made for its own inherited gaps (Customers' unmounted route, Team/Staff's missing Service).

**Decision needed from Salman**: which of (a)/(b) above are in-scope for calling Store
"reference-quality," versus explicitly deferred/named gaps the way Restaurant's own sign-off
handled its inherited findings? This investigation deliberately stops short of drafting an
Implementation Contract until that scope call is made — per this project's own workflow
(`documentation-policy.md`: Architecture Plan → Implementation Contract are separate steps, not
one document).
