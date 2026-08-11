# Item #9 — Store publish nudge banner — Evidence

Follows: `.claudedocs/implementation/DASHBOARD_UX_CORRECTIONS_CONTRACT.md`, Section B.9.

## What Was Implemented

`frontend/src/pages/generic-admin/tabs/StoreTab.jsx` — a warning banner renders at the top of the
Items list, gated on `items.every(i => !i.is_active)` (every product hidden — the "storefront looks
empty to customers" case specifically, not any partial hide). Purely derived from `items`, already
fetched — no new API call. The existing show/hide mechanism (`toggleItemActive`, "مخفي" badge,
إظهار/إخفاء buttons) is unchanged; the banner surfaces the same action, not a new one.

## Real Verification (nested Playwright, real TENANT_ADMIN)

Store → المنتجات: **4 real products** (سبراي تثبيت الشعر $8, واكس تصفيف الشعر $10, جل تصفيف الشعر
$7, عطر ريحة رجالي $22), **all 4 marked "مخفي."** Banner rendered exactly as specified: *"⚠️ كل
منتجاتك (4) غير ظاهرة للعملاء الآن — المتجر يبدو فارغًا لهم. اضغط 'إظهار' على أي منتج بالأسفل
لعرضه."* — count (4) correctly matches. Confirmed on mobile (390×844) too: text wraps correctly, no
horizontal overflow (`scrollWidth == innerWidth` = 390).

## Acceptance

✅ Ships clean — real data, correct count, correct gating condition, desktop + mobile confirmed, zero
console/network errors.
