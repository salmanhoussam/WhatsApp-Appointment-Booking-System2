# Dashboard Product Readiness Calibration — Phase 1+2

`/bo-hussein` Mission, tenant: `hr` (RK Barber Shop). Full admin walkthrough via real Browser
Verification (Playwright MCP against the live LAN dev server, `localhost:5173/dashboard/hr/units`),
evaluated per page. No redesign, no code — evaluation only, per the mission's own rules.

## Scorecard

| Page | Verdict | One-line reason |
|---|---|---|
| Overview | 🟡 Needs Improvement | Real live data, but shows sales stats first, not "today" |
| Reservations — List | 🔴 Needs Redesign | Default view shows a false-empty state |
| Reservations — Calendar | 🟡 Needs Improvement | Real week grid, but no service/duration on any block |
| Catalog — Services | 🔴 Needs Redesign | Flat list, no duration, structurally identical to a product |
| Catalog — Products | 🔴 Needs Redesign | Flat list, only 1 of 4 items has any image at all |
| Orders | 🟡 Needs Improvement | Filters + expand work, but real QA data is leaking into the UI |
| Settings | 🟡 Needs Improvement | Store info/branding/QR all clean, but zero Working Hours anywhere |
| QR (inside Settings) | ✅ Ready | Prominent, real link, copy button, live preview alongside it |

---

## Overview (نظرة عامة)
**What works well**: real live numbers (orders, revenue, section/product counts), a real recent-
activity feed with actual booking/order names, a real catalog preview, auto-refresh every 30s.
**What blocks usability**: this is a sales dashboard, not an owner's "today" view — nothing about who's
coming in, when, or a way to start a new booking. A few panels (stat cards, best-sellers) show empty
grey placeholders for the first second or two after load.
**What is missing**: today's appointments, a "new booking" action, any at-a-glance answer to "what do
I need to do right now."

## Reservations — List view (default)
**What works well**: status filter pills (الكل/معلّق/مؤكّد/وصل/ملغي/لم يحضر) are real and functional.
**What blocks usability**: opens defaulted to "اليوم" (today) — and shows "لا توجد حجوزات بتاريخ ٢
أغسطس ٢٠٢٦" (no reservations found) even though 3 real reservations exist that week. A real user has
no reason to know the fix is "switch to الكل or تقويم" — this reads as "the system is broken."
**What is missing**: a visible reason/hint for why the list is empty (e.g. "no bookings today — 3 this
week").

## Reservations — Calendar view
**What works well**: real week grid (Sat→Sun, 09:00–20:00), real customer names placed at their real
booking times, correctly reflects the same 3 real bookings the list view was hiding.
**What blocks usability**: each block shows only a name — the time text visible on the block is
visually clipped/cut off beneath the name. No visual difference noticed between a cancelled and an
active booking (all 3 in this data happened to be cancelled test bookings).
**What is missing**: service name and duration on the block itself — exactly the gap flagged
independently in yesterday's dashboard audit, still present today.

## Catalog — Services (الخدمات)
**What works well**: category structure exists (الخدمات vs منتجات العناية are cleanly separated),
Edit/Delete on every row.
**What blocks usability**: rendered as a flat list — name (AR/EN) + a single price, nothing else. All
3 services (Hair/Haircut/Keratin) are priced identically at 5 USD in the current seed data, with zero
duration shown anywhere.
**What is missing**: duration per service (Salman's own stated requirement — "30 min" next to
"Haircut"), and nothing on this screen distinguishes a service from a physical product.

## Catalog — Products (منتجات العناية)
**What works well**: real product names, real prices (8/10/7/22 USD), Edit/Delete on every row.
**What blocks usability**: only 1 of 4 products (Hair Fixing Spray) shows any image at all, and it's a
tiny, cropped thumbnail — the other 3 show nothing. This is a worse state than "no images at all
anywhere" — it looks inconsistent/broken rather than simply plain.
**What is missing**: a real image per product, and the card-grid layout Salman described (image top,
name below, price) instead of a row list.

## Orders (الطلبات)
**What works well**: status filter pills are real and functional (tested: clicking "معلّق(1)"
correctly filtered 5 orders down to 1); each row expands in place to show real line items and payment
method.
**What blocks usability**: the expanded panel showed a raw internal QA note verbatim — *"REAL E2E
TEST -- Store products (Catalog service/product split verification)"* — sitting in the notes field as
if it were a real customer note. 4 of the 5 visible orders are named "Pilot Verify" / "Proxy Pilot
Verify" / etc. with fake sequential phone numbers — leftover test data sitting in the real `hr`
tenant, not something the interface itself is doing wrong, but something a real barber would see and
be confused by. One real console error also present: a missing React `key` prop warning in
`OrdersTab`'s render — cosmetic, not functional, but real.
**What is missing**: nothing structurally — the underlying interaction (filter, expand) already works.

## Settings (الإعدادات)
**What works well**: store info (name AR/EN, WhatsApp number, brand color), homepage style pickers
(hero layout, catalog display, font), and homepage text fields all present, clean, and paired with a
live preview pane on the right showing the real public page.
**What blocks usability**: nothing observed — the page itself is clear and well laid out.
**What is missing**: confirmed by direct search of the page's own text — no "ساعات العمل" (Working
Hours) section exists anywhere on this page, or anywhere else in the admin. This matches and confirms,
via direct browser evidence rather than code-reading, the same gap already found in
`.claudedocs/work/capability-reference-extraction/2026-08-02/reservation.md`.

## QR (inside Settings)
**What works well**: everything. Positioned near the top of Settings (not buried in scrolling), real
QR image, the real store link (`http://192.168.16.100:5173/hr/store`) displayed as text, a working
copy button, and a live preview of the actual public page right next to it.
**What blocks usability**: nothing found.
**What is missing**: nothing found.
