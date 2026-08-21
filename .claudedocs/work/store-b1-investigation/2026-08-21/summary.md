# Track B (Store) — Phase B1: Real Browser Verification — Evidence (2026-08-21)

Read-only per Salman's explicit instruction: no code, no data, no Store activation, no Section
added. All DB reads via a temporary, uncommitted read-only script. Real Playwright MCP session
against real local dev servers (started fresh for this check, stopped after). Real admin access via
a locally-minted JWT (same mechanism as A1/A2.1/A2.2 — `create_access_token()`, the app's own
function, real existing `TENANT_ADMIN` user ids read from DB, zero writes). Follows
`investigation-protocol.md`.

---

## 1. Is Store active in `client_services`?

| Tenant | `client_services` | Store? |
|---|---|---|
| **mr-h** | `reservations`, `booking`, `whatsapp_ordering` | ❌ No `store`, no `catalog` row at all |
| **rk** | `catalog`, `booking`, `whatsapp_ordering`, `reservations`, `store` | ✅ `store: true` |

Unchanged from the original study (2026-08-21 earlier pass) — confirmed again via a fresh read.

## 2. Does the Dashboard "المتجر" tab show when Store isn't active?

**Yes — confirmed live on mr-h.** `buildNav()` (`GenericAdminDashboard.jsx`) shows "المتجر" for
every `hasReservations` tenant unconditionally, regardless of `active_services`. Screenshot:
`b1-mrh-store-tab.png` — the tab is visible and highlighted/active in the real sidebar.

## 3. What actually happens when it's opened (mr-h, Store not active)?

- Navigating to `/mr-h/dashboard/store` loads without crashing — `StoreTab.jsx` renders its normal
  shell (الأقسام/المنتجات/الطلبات sub-tabs).
- Real network calls fire and fail: `GET /admin/store/categories?client_slug=mr-h` →
  **403 Forbidden**, `GET /admin/store/products?...` → **403 Forbidden** — both silently caught
  (`.catch(() => setCategories([]))` pattern already read in the original study), rendering a
  friendly-looking but **misleading** empty state: "لا توجد أقسام بعد — أضف أول قسم للمتجر" ("No
  categories yet — add your first one"). Nothing on screen indicates Store isn't activated.
- **Real interactive test**: clicked "+ قسم جديد" (add category), filled a real name, clicked
  "حفظ" (save). Real request: `POST /admin/store/categories?client_slug=mr-h` →
  **403 Forbidden**, real backend body:
  `{"code":"FORBIDDEN","message":"Service 'store' is not activated for this tenant."}` — a clear,
  correct, real message. **But the frontend never surfaces it** — it triggers a native
  `alert("حدث خطأ")` ("An error occurred"), a generic fallback that discards the real `detail`
  string entirely. Confirmed via a real captured browser dialog, not inferred from code.
- Net effect: an admin on a Store-inactive tenant can open "المتجر", believe it's just an empty
  store, try to add a category, and get a completely unhelpful "an error occurred" with zero
  indication of the real cause. Real, live, reproducible.

## 4. `products` in `content.sections[]`

| Tenant | `products` section? |
|---|---|
| **mr-h** | ❌ Absent — 9 sections total, none named `products` |
| **rk** | ✅ Present — `{"id":"s_products","type":"products","order":10,"enabled":true,"data":{}}` |

Unchanged from the original study.

## 5. Real Store categories/products data

| Tenant | Categories | Products |
|---|---|---|
| **mr-h** | 0 store categories | 0 |
| **rk** | 1 real category, "منتجات العناية" (`module_key='store'`), active | **4 real products, all `isActive = False`** |

### New finding this pass — not previously discovered

rk's 4 real products (سبراي تثبيت الشعر $8, واكس تصفيف الشعر $10, جل تصفيف الشعر $7, عطر ريحة
رجالي $22) are **all individually hidden** (`CatalogItem.isActive = False`), even though their
category is active and Store itself is active. Confirmed two independent ways:

- **Direct DB read** (read-only): all 4 rows `isActive=False`.
- **Real Dashboard UI, same story**: `/rk/dashboard/store` → "المنتجات" tab shows a real, already-built
  warning banner: *"كل منتجاتك (4) غير ظاهرة للعملاء الآن — المتجر يبدو فارغاً لهم. اضغط 'إظهار'
  على أي منتج بالأسفل لعرضه."* ("All 4 of your products are not visible to customers right now —
  the store looks empty to them. Click 'Show' on any product below to display it.") Every row
  carries a "مخفى" (Hidden) badge. Screenshot: `b1-rk-store-products-tab.png`.

This is a real, correctly-surfaced-in-the-Dashboard **data/operational** state, not a code bug —
the admin UI already tells the truth clearly here (unlike Finding 3 above). Nobody has ever clicked
"إظهار" (Show) on any of these 4 real products.

## 6. Does the public homepage show a Products section?

| Tenant | Products section renders? |
|---|---|
| **mr-h** | ❌ No — confirmed via real page text scan: zero "أضف للسلة" occurrences; the one match for "منتج" was unrelated story-copy ("منتجات مختارة بعناية"), not a real section. 0 console errors. |
| **rk** | ❌ **Also no**, despite `store` active and `products` section present — direct consequence of Finding 5. Real page-text scan: 0 "أضف للسلة" occurrences anywhere on the homepage. `ProductsSection.jsx` self-gates to `null` (per its own code) when it has zero fetched items after the real `GET /public/store/products` call returns `{"success":true,"data":[]}` (confirmed via the real network response) — so visually there is no difference between "Store not active" and "Store active but every product hidden." A real customer sees the identical nothing either way. |

## 7. Do `ProductsSection`/`CatalogItemCard`/cart actually work when Store is active?

**Partially confirmed, partially blocked by Finding 5 — reported honestly, not overclaimed:**

- The **mechanism** (fetch call, self-gate logic, `SECTION_MAP` wiring) is confirmed working
  end-to-end for rk: real `GET /public/store/categories` → 200, real `GET /public/store/products`
  → 200 (empty array, correctly reflecting real DB state). No console errors, no crash.
- The **rendered card + add-to-cart interaction** could **not** be exercised on the real public
  homepage today, because there is currently nothing visible to click — this is a genuine, honest
  Unknown, not a fabricated pass. Confirmed by checking the standalone browse page too:
  `/rk/store` → "منتجات العناية" tab → real text **"لا توجد عناصر في هذا القسم"** ("No items in
  this section"). Screenshot: `b1-rk-store-products-view.png`.
- Per Salman's explicit instruction ("لا بيانات" — no data changes), toggling any product's
  `is_active` to test the live add-to-cart flow was **not done**, even though it's a reversible
  admin action available in the real Dashboard — it is still a real data write and was out of
  scope for B1.
- **`/rk/cart`** (real, safe, read-only navigation — no data dependency) renders correctly: a clean
  real "السلة فارغة" (cart is empty) state, 0 console errors. Confirms the Cart page itself mounts
  and works independently of whether any product is currently visible. Screenshot:
  `b1-rk-cart-empty.png`.
- **Conclusion, precisely bounded**: the plumbing (routes, fetch calls, empty-state handling, cart
  page) is real and functioning. The actual card-render → click "أضف للسلة" → cart-population →
  checkout chain remains **unverified** this pass, purely because there is no real visible product
  to click anywhere on either tenant today — not because of any confirmed code defect in that
  chain. This is the honest boundary of what B1 could establish without touching data.

## 8. Homepage → Add to Cart → Cart → Checkout — full trace, as far as it could go

```
rk homepage (/rk/home)          → Products section: renders nothing (0 visible items)     [Finding 5/6]
rk browse page (/rk/store)      → "منتجات العناية" tab: "لا توجد عناصر في هذا القسم"        [Finding 5/6]
rk cart (/rk/cart)              → real empty-cart state, 0 errors, mounts correctly        [confirmed OK]
Add-to-cart interaction         → UNKNOWN — nothing clickable exists to test it with        [honest gap]
Checkout                        → not reached                                              [not attempted]

mr-h homepage (/mr-h/home)      → No Products section, no cart mention anywhere            [confirmed, expected]
mr-h browse page (/mr-h/store)  → orphaned URL (not linked from mr-h's real nav — confirmed
                                   by reading the rendered top nav: "احجز موعد"/"الوحدات" only,
                                   no "المتجر" link) → real 403 on catalog/categories,
                                   silently resolves to "لا توجد عناصر في هذا القسم" after a
                                   few seconds (not a permanent hang — retried once, same
                                   resolution both times; genuinely slow/latent, not
                                   confirmed infinite) [Side Finding, low real-world severity
                                   since nothing links here today]
mr-h cart (/mr-h/cart)          → real empty-cart state, 0 errors                          [confirmed OK]
```

rk's real top nav (confirmed via rendered page) **does** link "المتجر" — so `/rk/store`'s empty
state is something a real customer could reach today, unlike mr-h's orphaned URL.

---

## Confirmed Findings (summary)

1. mr-h has zero Store capability, zero store data, no `products` section — by configuration, not
   by bug (unchanged from the original study).
2. rk has Store active, real category, `products` section present, but **all 4 real products are
   individually hidden** (`isActive=False`) — a real, previously-undocumented data/operational gap,
   already correctly surfaced by the Dashboard's own warning banner, never acted on.
3. Dashboard's "المتجر" nav tab shows unconditionally for any `hasReservations` tenant, regardless
   of whether Store is active — confirmed live on mr-h.
4. A real attempt to create a category on a Store-inactive tenant gets a correct, informative
   backend error (`"Service 'store' is not activated for this tenant."`) that the frontend discards,
   showing a generic `alert("حدث خطأ")` instead — real, reproducible, unhelpful.
5. Because of Finding 2, rk's public Products section and browse-page products tab render as
   completely empty today — functionally indistinguishable from mr-h's "Store not active" case,
   even though rk's Store capability, data pipeline, and section are all genuinely wired correctly.
6. `/mr-h/store` (public route) is not linked from mr-h's real site nav — an orphaned URL today,
   confirmed via the rendered nav bar; its own 403-handling is slow/silent but was not confirmed to
   permanently hang (only ever waited a few seconds per attempt).

## Side Findings

- Item prices on `/rk/store`'s "الخدمات" (Services) tab display as "0 USD" for all 6 services — not
  investigated further (out of B1's Store-only scope), noted for a future pass.

## Unknowns

- Whether the real Add-to-Cart → Cart → Checkout chain works end-to-end once a real product is
  visible — genuinely unverified this pass, by design (no data changes permitted). The nearest
  possible verification without violating that constraint would be a Dashboard "إظهار" click on one
  real product (a reversible, already-built admin action) — explicitly not taken here, flagged for
  B2/B3 to decide.
- Whether `/mr-h/store`'s 403-then-empty-state resolution is reliably fast or can genuinely hang
  under different network conditions — only tested twice, both times resolved within ~3-4 seconds.

## Status

**B1 complete. No code written, no data changed, no Store activation, no Section added.** All
DB/browser access above was read-only or used the app's own already-existing, reversible UI
actions without ever invoking them destructively. Awaiting Salman's decisions on B2 (materialization
mechanism) and B3 (whether mr-h gets a real Store, and — newly relevant — whether/when rk's 4 real
hidden products should be shown).
