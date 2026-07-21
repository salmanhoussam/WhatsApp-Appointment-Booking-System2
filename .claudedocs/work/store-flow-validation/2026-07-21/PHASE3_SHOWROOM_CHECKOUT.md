# Phase 3 — Showroom Checkout Experience

Follows: Investigation Protocol (`.claude/rules/investigation-protocol.md`), same evidence
discipline as PHASE0/PHASE1/PHASE2 in this folder. Renamed from "Premium Checkout" per Salman's
explicit direction: "لأن الصفحة لم تعد مجرد Checkout. هي آخر غرفة داخل معرض بيت الفخار."

## Scope

Final build phase before the post-Phase-3 Store Experience Review. Covers the `/cart` route for
`beit-al-fakhar`, replacing the shared `generic/normal/CartPage.jsx` with a tenant-specific
Showroom Checkout — left showroom panel (60%) + right form panel (40%).

## Files

- `frontend/src/pages/beit-al-fakhar/checkout/ShowroomPanel.jsx` (new) — reserved showroom-image
  slot (gradient today, accepts `imageUrl` prop for later), "اختياراتك من بيت الفخار" heading,
  real cart rows from `useGenericStore` (image / name / price-or-"السعر يُحدد حسب الطلب" / qty
  stepper / remove), totals row with the same price-upon-request fallback, "← متابعة التسوق" link.
- `frontend/src/pages/beit-al-fakhar/checkout/CheckoutForm.jsx` (new) — right panel, cream theme.
  Opens with "أكمل طلبك" + "سنرسل طلبك مباشرة عبر واتساب للتأكيد." before any field. Grouped
  sections (بيانات التواصل / عنوان التوصيل / طريقة الدفع / ملاحظات). Submit button uses the
  tenant's own accent color (never WhatsApp green), spinner state driven by `submitting` prop.
- `frontend/src/pages/beit-al-fakhar/checkout/CheckoutPage.jsx` (new) — orchestrator:
  `buildWhatsAppMessage()` (full Arabic order message — name, phone, optional email, address,
  payment method, notes, itemized list with the same price-upon-request phrasing per line, total,
  order id) and `handleSubmit()` (sync cart to server → `POST /store/orders` → build + open the
  `wa.me` deep link → toast → clear cart). Toast/banner instead of a separate success screen, per
  requirement 6. `.baf-checkout-grid` CSS class drives the 60/40 → stacked-on-mobile layout.
- `frontend/src/router/tenants/beit-al-fakhar.routes.jsx` — `/cart` route's component changed
  from `CartPage` (shared) to `CheckoutPage` (tenant-specific).
- Real DB update (not a file — a live data change): `Client.whatsapp_number` for `beit-al-fakhar`
  set to `+201002856632`, confirmed via direct query. Source of truth stays the DB field per
  Salman's requirement 5 — never hardcoded in JSX.

## The 9 requirements — how each was addressed

1. Journey stays `Collection → Product → Showroom Checkout → WhatsApp` — no generic-form jump;
   the page keeps the same breadcrumb style and dark theme as the Product Page.
2. Left/right is 60/40 (`gridTemplateColumns: '3fr 2fr'`), not the reference mockup's ~50/50.
3. Right panel opens with "أكمل طلبك" + one sentence before the first field.
4. Order-summary heading is "اختياراتك من بيت الفخار", not "Your Selection".
5. WhatsApp button uses `accent` (the tenant's own color), not WhatsApp green; sequence is
   Spinner → real order created → then `window.open` — confirmed in the exact order below.
6. No full-page success screen — a top toast/banner (`AnimatePresence`, auto-dismisses after 6s),
   since the customer is leaving for WhatsApp regardless.
7. Left panel shows only image, name, quantity, and price/price-upon-request — no repeated
   long description.
8. Price-upon-request uses the exact same string as the Product Page: "السعر يُحدد حسب الطلب" —
   same phrasing reused, not reworded, per the explicit consistency requirement.
9. Post-Phase-3 Store Experience Review — not yet started; see Pending below.

## Runtime Validation — real findings, not assumed

Three real CDP-driven test runs against the live dev stack (`localhost:5173` / `localhost:8000`,
real Supabase-backed `beit-al-fakhar` tenant), each seeding a real cart item via `localStorage`,
filling the form via the native-setter-bypass technique, clicking the real submit button, and
watching state actively rather than waiting once.

**Run 1** (`phase3_checkout.py`, less rigorous, single wait): `POST /store/orders` observed firing
with the correct payload; cart was later found empty (implying success ran) — but `window.open`
was never directly observed in that run's shorter watch window.

**Run 2** (`phase3_checkout2.py`, 20s active watch): button stayed on "جارٍ إرسال طلبك..." for the
full 20s, `window.open` never fired inside that window. This looked like a hang and was flagged as
unresolved going into this continuation.

**Run 3** (`phase3_checkout3.py`, 60s active watch, correlated against live `uvicorn` log line
counts): resolved the discrepancy with real timing data —

```
t=+3.2s   OPTIONS /store/cart   200   (preflight)
t=+12.3s  POST    /store/cart   200   (cart sync — ~9s)
t=+12.3s  OPTIONS /store/orders 200   (preflight)
t=+24.7s  POST    /store/orders 200   (order create — ~12.4s)
t=+24.7s  button text reverts to normal (finally block ran)
t=+30.9s  submit button disappears — cart is empty, isEmpty guard renders
```

Total real backend round-trip: ~25 seconds, entirely inside the two sequential
Supabase-pooler-backed POST calls — not a frontend bug, not an infinite hang. Consistent with this
session's already-documented Supabase pooler latency/cold-start variability (`aws-1-ap-southeast-
2.pooler.supabase.com:6543`), which has shown multi-second delays repeatedly all session.

**Run 4** (`phase3_checkout4.py`, 60s active watch, with a temporary `console.log` added to
`handleSubmit` to inspect the real `config.whatsapp_number`/`phone` values, then removed
immediately after): confirmed cleanly end-to-end —

```
t=+42.9s  window.open called with:
  https://wa.me/201002856632?text=...
  (decoded) طلب جديد من بيت الفخار 🏺
  الاسم: Phase3 CDP Test 4
  الهاتف: +96170000444
  العنوان: Fourth Test Address
  طريقة الدفع: الدفع عند الاستلام — نقداً
  القطع المطلوبة: - طبق فخار مرسوم يدوياً رقم 1 × 1 — السعر يُحدد حسب الطلب
  الإجمالي: السعر يُحدد حسب الطلب
  رقم الطلب: c6618c0d
console: phone: '201002856632'  (correctly resolved from the real DB value, not empty)
```

`curl http://localhost:8000/api/v1/public/beit-al-fakhar/config` confirmed independently that the
backend returns `"whatsapp_number": "+201002856632"` — the DB update from earlier in this session
is live and correctly wired through `useTenantConfig` → `CheckoutPage`'s closure.

## Confirmed Findings

- The full submit sequence (spinner → cart sync → order create → WhatsApp message built → real
  `window.open` with correct phone + fully-formatted Arabic message → toast → cart cleared) works
  correctly end-to-end against the real dev backend and real DB.
- Requirement 5's exact sequence (Spinner → Create real Order → THEN open WhatsApp) is real,
  verified via server-log correlation, not assumed from the code reading alone.
- Requirement 8's price-upon-request consistency holds in the real generated WhatsApp message
  text, not just in the JSX.
- Run 2's apparent "hang" was a real Unknown at the time it was reported in this session's earlier
  turn — it is now resolved: it was real backend latency exceeding a 20s observation window, not a
  frontend defect. No code change was needed or made to fix it.

## Side Findings

- **Real UX risk, not a code bug**: two sequential Supabase-backed round-trips (~25-40s total in
  this dev environment) with only a static spinner and no progress indication is a long silent
  wait for a real customer. This is worth Salman's attention as a product decision (e.g., a
  reassuring intermediate message, or parallelizing the cart-sync loop instead of sequential
  per-item awaits) — flagged here as a recommendation, not applied unilaterally, since Phase 3's
  brief was UI/UX polish already scoped to the 9 numbered requirements above, not backend
  performance work.
- The cart-sync step loops `await publicApi.post('/store/cart', ...)` once per distinct cart line
  — every test run in this investigation used a single-item cart, so a multi-item cart's real
  behavior (whether items sync in acceptable time, whether any race exists) was not exercised.
  Listed as an Unknown below, not assumed safe.

## Unknowns

- Real multi-item cart behavior through this same submit path is unverified — every CDP run here
  used exactly one cart line.
- The actual `wa.me` link was never opened in a real WhatsApp client (mobile app or WhatsApp Web)
  — verified only that the URL and its encoded message are correctly formed, per this session's
  `window.open` interception pattern. Whether WhatsApp itself renders the Arabic text and emoji
  correctly on the receiving end was not and cannot be checked from this environment.
- Production-scale Supabase latency (a properly warmed connection pool, not this dev instance's
  intermittent cold starts) was not measured — the ~25-40s figures above are dev-environment
  numbers, not necessarily representative of production.

## Pending

- Requirement 9 — the post-Phase-3 **Store Experience Review** (Landing → Collection → Product →
  Cart → Checkout → WhatsApp, "بعين المستخدم لا المبرمج") has not yet been conducted. This is the
  explicit gate before beit-al-fakhar can be declared the first reference Store Template.
