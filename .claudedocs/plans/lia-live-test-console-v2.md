# Lia Live Test Console v2 — a real page to run tests from the phone

**Status:** PLAN ONLY — written 2026-09-19 at session close, from Salman's request. No code yet.
**Requested (Salman, verbatim intent):** make `https://alzabt.salmansaas.com/barberlab-test/dashboard/lia-live-test`
a real page: you can **write the test messages in it**, each with a **link to the central WhatsApp number** so it is
pressed straight from the phone, and it should be **easy to use for rk or any tenant**.

## What exists today (read, not recalled)
- `frontend/src/pages/generic-admin/LiaLiveTest.jsx` — 498 lines, shipped in 49013f4.
  - `ALLOWED_SLUG = 'barberlab-test'` (:34) — the page refuses every other tenant (:246).
  - `LIA_BUILD = '06f9a5b'` (:41) — a hardcoded build label, stale since then.
  - 28 fixed scenarios; results kept in `localStorage` (:134/:142), per device.
  - Evidence fields the owner cannot fill (state / DB / record / log) — a design error already acknowledged
    2026-09-18.
  - Reads `/admin/reservations/`, `/customers/`, `/store/products` for a light evidence view.
- Route: `/{slug}/dashboard/lia-live-test` via `GenericAdminDashboard.jsx` (`case 'lia-live-test'`), behind
  `ProtectedRoute`. No new backend route was added, and none is needed here either.
- **The central number already has a public source:** `GET /api/v1/public/reservations/whatsapp-link?client_slug=…`
  (used by `useReservationBooking.js:150`) → `{available, url}` built from `WHATSAPP_CENTRAL_NUMBER`.
  `available:false` = not configured → the button must be hidden, not dead. The number itself is never
  hardcoded in the frontend.
  ⚠️ The `wa.me/96178727986` links elsewhere in the frontend (marketing, caracas, showcase) are Salman's
  PERSONAL number, not the bot. Do not copy them.

## What v2 does
1. **One tap per test from the phone.** Each scenario shows its exact message and a green button
   `wa.me/<central>?text=<encodeURIComponent(message)>`. The number comes from the whatsapp-link endpoint:
   take its `url`, keep the number, and replace the text. Tapping opens WhatsApp with the message ready to send.
   The owner still presses Send, which is right: the test is his real message.
2. **Write your own tests.** A small form adds a scenario: title, message, what you expect. It is stored per
   device (`localStorage`, try/catch, with an export/copy button). A starter list covers what we verified today:
   past appointment with no number (R1), default service/barber «(تلقائي)», edit at the preview
   («خليه مع زياد», «خليها الساعة 5»), cancel wording, and a product entry.
3. **Any tenant.** The page follows the dashboard's own `slug`; `ALLOWED_SLUG` is removed. Access stays exactly
   the dashboard's (`ProtectedRoute` + the logged-in account's tenant). There is no auth bypass and no new route.
4. **The owner records only what he can see:** «زبطت متل المتوقع / طلعت غير شي» plus a free note. The DB/log
   evidence stays with Claude (the `lia_live_evidence.py` reads + Railway logs). The page is a launcher and a
   notebook, not the source of truth (the 2026-09-18 amendment still holds).
5. **The build label** is removed or read from the deploy (never hardcoded again).

## Decisions needed from Salman before code
- **D-1 · real tenants.** Opening the page on `rk` means tests there create REAL data on a live shop. The
  standing rule since 2026-09-18 is «لا تعمل الاختبار على RK». Proposal: allowed, but with a red banner on any
  tenant other than barberlab-test, and starter scenarios end at the preview (❌, not ✅) unless the owner edits
  them. **This lifts a standing rule. It needs his explicit yes.**
- **D-2 · where written tests live.** Per device (`localStorage`, simplest, no backend) vs shared across devices
  (needs storage). Proposal: per device plus export, for now.
- **D-3 · button titles/texts on the page** are dashboard copy (Arabic), not Lia texts, and are shown at review.

## Out of scope
Any Lia behaviour change · a new backend route · Step 3 (account↔barber links, Ali's phone) · R2/R3/R4.

## Verification when built
Real browser (Playwright, per `browser-verification-protocol.md`) on `alzabt.salmansaas.com/barberlab-test/…`:
page renders, the central link resolves to the bot number (not 96178727986), `href` text is URL-encoded Arabic,
the button is hidden when `available:false`, a written test survives reload, and another tenant's slug renders
(behind D-1).
