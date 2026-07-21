# Phase 2 — Premium Product Experience: Design, Implementation, Validation

**Trigger:** Salman approved the Phase 0→1→2→3 reordering (Backend Integrity → Product Experience
→ Premium Checkout), named this phase "Premium Product Experience" (not just "a detail page"), and
required an identity study + journey study + ASCII wireframe *before* any JSX, with 9 specific
refinements after reviewing that wireframe.

## Identity study (from real, already-live code, not invented)

Pulled from `AboutSection.jsx`/`WhyUsSection.jsx`: warm clay palette (`--baf-cream`,
`--baf-terracotta`, `--baf-dark`), storytelling voice ("كل قطعة، حكاية مرسومة بإيد"), explicit
imperfection-as-value framing ("ما في قطعتين متطابقتين تماماً"). Real answer to "how is a piece
shown inside a premium gallery, not a webshop": as a unique object with a story, not a SKU.

## The 9 refinements, each incorporated

1. **Price never hidden** — "السعر يُحدد حسب الطلب" (Price upon request) shown when no real price
   is set, instead of an empty/missing price area. Required a real backend fix first (see below).
2. **Story line above description** — `item.story_ar`, with an honest beit-al-fakhar-specific
   default kept in the *frontend*, not the shared backend endpoint (see architecture note below).
3. **Add to Cart de-emphasized** — outlined/secondary button style, not a filled loud CTA; visual
   order is Image → Badges → Name → Story → Description → Price → Quantity → Add to Cart.
4. **"قد يعجبك أيضاً"** instead of "Related Products" — same-category query underneath, gallery
   language on top.
5. **Breadcrumb** — "بيت الفخار — [الفئة] — [اسم القطعة]", no Home/Collection/Category words.
6. **Hero image never cropped** — `object-fit: contain`, not `cover`; a vertical piece shows whole,
   real empty space preferred over losing part of the piece.
7. **Works with `metadata: {}`, extends automatically once filled** — `story_ar`/`story_en` read
   from `CatalogItem.metadata` via the same established `meta.get(key)` pattern already used for
   `compare_at_price`/`images`/`discount`/`variants`/`brand` in `_fmt_product` — no schema change.
8. **Three small badges** under the image — 🖐 صناعة يدوية / 🎨 مرسومة يدوياً / 🏺 قطعة فريدة.
9. **Broken-image placeholder** — `ProductImage.jsx` catches `onError`, shows a warm on-brand
   gradient panel with "صورة القطعة غير متوفرة حالياً" instead of a broken-image icon.

## A real architecture mistake caught before it shipped

First draft hardcoded beit-al-fakhar-specific story text ("...داخل بيت الفخار...") as the default
inside `app/api/v1/public/store.py`'s `_fmt_product()` — the **shared** endpoint every store-module
tenant uses (footlab included). Caught immediately: fixed to return `story_ar: meta.get("story_ar")`
(plain `None` when absent, no tenant-specific text), with the actual Beit Al Fakhar fallback
sentence living in `ProductPage.jsx` instead. This is the same shared-vs-tenant-specific boundary
already established for `CatalogPage.jsx`/`TenantModuleNav.jsx` earlier this session.

## A real, necessary backend fix: price null was already being lost

Found while implementing refinement #1: `_fmt_product()` was coercing `price: None` → `0.0`,
which made it *impossible* for any consumer (this new page, the Collection grid, the cart) to
tell "genuinely free" from "no price set." Fixed to preserve `None`. Verified this doesn't break
the cart total: `useGenericStore.addItem()` already defensively does `Number(item.price) || 0`,
so passing `null` through is strictly safer than the previous silent `0.0`.

## Reused, not reinvented

- Product image navigation: one small, additive, backward-compatible prop
  (`CatalogItemCard`'s `onItemClick`, `CatalogPage`'s `productLinkBase`) — `undefined` by default,
  so every other store tenant's cards behave exactly as before. Only beit-al-fakhar's `/store`
  route passes it.
- Add-to-cart: calls the same `useGenericStore().addItem()` every other page already uses — zero
  new cart state.
- Related pieces: reuses `CatalogGrid`/`CatalogItemCard` directly, not a new grid component.

## Real, live runtime validation (Chrome + CDP, same method as Phase 0/1)

Full journey: `Collection → click a real card → Product Page → Add to Cart → Cart page`.
Screenshots in `phase2/`:

- `1-collection.png` — Collection page, cards now clickable (cursor: pointer).
- `2-product-page.png` — real Product Page for "طبق فخار مرسوم يدوياً رقم 1": breadcrumb
  "بيت الفخار — أطباق — طبق فخار مرسوم يدوياً رقم 1", 3 badges, story line, "السعر يُحدد حسب الطلب",
  quantity stepper, secondary Add-to-Cart button, "قد يعجبك أيضاً" with 4 real sibling products.
  Image shown whole via `object-fit: contain` — visibly not cropped.
- `3-cart-with-item.png` — the item added from the Product Page appears correctly in the real
  Cart page with its real thumbnail, name, and quantity controls.

One real test-harness false positive along the way, corrected: an early readiness check
(`document.querySelector("button[type='button']")`) matched the nav's mobile-menu button before
the product data had actually loaded, producing a misleading "add to cart button not found"
result. Fixed the check to look for real product-specific content (`"قد يعجبك أيضاً"` appearing)
before proceeding — re-ran clean, full success.

## What's still open (Phase 3's scope, not this one)

Checkout → Order → WhatsApp was explicitly deferred to Phase 3. This phase validates through
"item in cart," not further — consistent with Salman's own phase ordering.
