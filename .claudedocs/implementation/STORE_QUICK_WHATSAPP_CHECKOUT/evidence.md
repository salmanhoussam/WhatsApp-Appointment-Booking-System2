# Store: Quick WhatsApp Checkout — Evidence (2026-08-22)

Real feature request from Salman: customers don't have time to fill the full checkout form, so add
a fast "continue order via WhatsApp" path that needs no typing. Reuses an already-proven,
already-shipped pattern in this exact codebase rather than inventing a new one — closely mirrors
`useReservationBooking.js`'s own `confirmViaWhatsApp()` (ReservePage's "متابعة الحجز عبر واتساب"
button), the same real, load-bearing sequencing rule this project already established for any
WhatsApp-first confirm flow: **a real record is always created server-side first, WhatsApp opens
second, never the other way around.**

## Change

One file, `frontend/src/pages/generic/normal/CartPage.jsx`, additive only:

- `WHATSAPP_PLACEHOLDER_NAME`/`WHATSAPP_PLACEHOLDER_PHONE` — the exact same literal strings
  (`"زبون واتساب"` / `"عبر واتساب"`) `useReservationBooking.js` already uses, not reinvented —
  keeps real data consistent for any admin looking at either capability's orders/reservations list
  (confirmed this exact string already appears in real production data via an earlier live API
  check this session).
- `confirmViaWhatsApp()` — a new handler, store-only (`moduleKey === 'store'`), that: opens a blank
  tab synchronously before any `await` (the same real popup-blocker fix
  `useReservationBooking.js`'s own comment documents, Browser Verification 2026-08-03); syncs the
  cart and creates a real `StoreOrder` via the same two endpoints `handleSubmit` already calls
  (`POST /store/cart`, `POST /store/orders`), using whatever the customer already typed in
  name/phone if anything, falling back to the placeholders otherwise; builds the WhatsApp message
  via the existing `buildStoreWhatsAppMessage()` (no new message-building logic); navigates the
  pre-opened tab to the real `wa.me` URL; clears the cart on success, matching `handleSubmit`'s own
  behavior.
- A new button, "متابعة الطلب عبر واتساب" (WhatsApp green, `#25D366`), rendered above the existing
  checkout form — enabled immediately, with no name/phone typed, exactly matching the ask. Gated on
  `moduleKey === 'store' && config?.whatsapp_number` — never renders for a restaurant order or a
  tenant with no real WhatsApp number configured.
- `handleSubmit` (the existing full-form flow) — completely untouched, still available for a
  customer who prefers to type real details.

## Real browser verification — rk, a genuine order created and cleaned up

Same locally-minted admin JWT + real dev-server technique already established this session.

- Confirmed the new button renders, enabled, with the checkout form's name/phone fields still
  empty — the point of the feature.
- Clicked it: `POST /store/cart` → 200, `POST /store/orders` → 200. Real order created:
  `id: 56b67648-4898-461d-8347-b880216dc4e6`, `customer_name: "زبون واتساب"`,
  `customer_phone: "عبر واتساب"` — confirmed via a direct, read-only DB query.
- Real success screen shown: "تم استلام طلبك!" / "جارٍ فتح واتساب لإرسال تفاصيل الطلب..." / "رقم
  الطلب: 56b67648".
- A real new tab opened to a real `wa.me`/`api.whatsapp.com` URL. Decoded message content matched
  exactly: real product name (سبراي تثبيت الشعر), real price (٨), real total (٨ USD), the real
  order ID — built entirely from `buildStoreWhatsAppMessage()`, no new message logic.
- Cart correctly cleared after the real order was created.
- Console: 0 errors, 0 warnings.
- **Cleanup**: the real test order was cancelled via the real admin API
  (`PATCH /admin/store/orders/{id}/status`, `{"status":"cancelled"}`) — confirmed `status:
  "cancelled"` in the response, matching this project's soft-cancel convention (never a raw DB
  delete).

## Real finding surfaced during testing — registered, not fixed

The first verification attempt hit a real 404 because rk's persisted test cart (accumulated from
earlier, unrelated passes this session) contained 2 non-store items — real `CatalogItem` rows
whose category `module_key` isn't `'store'` (services like شعر/شعر ودقن). This is the **same
already-known, already-parked finding** this project has on record ("`/rk/store` and `/rk/catalog`'s
الخدمات tab shows '0 USD'"): `/rk/store`'s own default tab ("الخدمات") shows real services with a
real "+ أضف للسلة" button, letting a real customer add a non-store item into this exact shared cart.
**Newly confirmed today**: doing so breaks checkout entirely — both the pre-existing "تأكيد الطلب"
button (which already loops the same `/store/cart` POST for every cart item, unchanged, not part of
this feature) and the new WhatsApp button fail with an unhelpful 404 for the ENTIRE cart, not just
the offending item, if that tab's "+" button is ever used. This elevates that finding's real
severity — not fixed here, per Salman's standing instruction not to open parked findings without
explicit authorization; registered clearly so the connection isn't lost.

A second, minor, unrelated cosmetic finding: the WhatsApp message's emoji (🛍️) renders as a stray
`�` in the decoded message text — a pre-existing encoding quirk in `buildStoreWhatsAppMessage()`,
not introduced by this change, not fixed here.

## Acceptance

- ✅ Zero typing required — button is enabled immediately.
- ✅ Real order created server-side before WhatsApp opens, same sequencing rule as the reservation
  flow.
- ✅ Reused the existing message builder and mutation endpoints — no new backend surface.
- ✅ Existing full-form flow completely untouched.
- ✅ Real end-to-end verification, real order cancelled afterward (not deleted).
- ✅ 0 console errors.

## Result

**DONE.** The pre-existing "0 USD"/services-addable-to-cart parked finding remains parked, now with
a stronger, newly-confirmed reason to prioritize it whenever Salman authorizes opening it.
