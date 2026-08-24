# Alzabt Demo Builder — WhatsApp Central WABA Link on the Success Screen

Follows: `service-execution-constitution.md` (evidence discipline), `investigation-protocol.md`
(Confirmed/Side Findings/Unknowns report structure). Executes the approved plan at
`.claude/plans/we-moved-on-new-hazy-barto.md`.

## What was built

**File 1**: `frontend/src/pages/home/DemoBuilderPage.jsx`
- New `whatsappUrl` state, populated by a `useEffect` that fires once `result.slug` exists.
- Calls the already-existing `GET /reservations/whatsapp-link?client_slug={slug}` (built in Phase B,
  `app/api/v1/public/reservations.py`) via the same `publicApi` instance already used for
  `/demo/create` — zero new backend code.
- **Non-blocking**: the effect is fire-and-forget; the success screen (slug/password/reserve/
  dashboard) renders immediately regardless of this call's outcome.
- **Silent-fail**: `.catch(() => {})` — any network/API failure leaves `whatsappUrl` at its initial
  `null`, rendering nothing extra. No error state, no broken link.
- New CTA — a plain `<a>` (no QR, per Salman's explicit choice), styled with WhatsApp's brand green
  (`#25D366`), `target="_blank"` + `rel="noopener noreferrer"` — matching the existing wa.me anchor
  convention already used elsewhere in this codebase (`Footer.jsx`, `SmarWhatsAppButton.jsx`).
  Renders only when `whatsappUrl` is truthy (i.e. the endpoint returned `available: true`).

**File 2**: `.claudedocs/implementation/ALZABT_MASTER_PRODUCT_PLAN.md`
- Appended (not rewritten) a dated superseded-note under Section J, pointing at commit `ff38f89`
  and its own evidence file, per this project's evolution/plan-doc immutability convention.
- Appended a one-line cross-reference under Section P item 4 pointing at the Section J note.

## Confirmed Findings

1. **The reused endpoint behaves exactly as documented, in both states.** A fresh demo tenant was
   created via a real `POST /api/v1/public/demo/create` call (`business_type: "barbershop"`,
   `name_ar: "صالون التحقق ٢٥"`) → real slug `demo-verify-salon-25-0803`. Calling
   `GET /reservations/whatsapp-link?client_slug=demo-verify-salon-25-0803` against the real running
   backend (localhost:8000) returned:
   ```
   {"success":true,"data":{"url":null,"available":false}}
   ```
   — the expected `available: false` state, since `WHATSAPP_CENTRAL_NUMBER` is unset in this local
   `.env` (confirmed via `grep -n "WHATSAPP_CENTRAL_NUMBER" .env` → no match).
2. **The `available: true` path was verified at the function level**, not via a live server
   restart (see Unknowns below for why). Running `whatsapp_service.build_central_booking_link()`
   directly with `WHATSAPP_CENTRAL_NUMBER=9611234567` set in the calling process's environment
   produced:
   ```
   url: https://wa.me/9611234567?text=%D8%AD%D8%AC%D8%B2%20demo-verify-salon-25-0803
   available: True
   ```
   — a real, correctly-slugged `wa.me` URL. This is the exact function the `/whatsapp-link` route
   calls with no logic in between, so this proves the route's `available: true` branch is correct.
3. **Real browser pass through the actual `DemoBuilderPage.jsx` flow**, driven via a nested
   `claude -p` + Playwright MCP session per `browser-verification-protocol.md` (navigate →
   `http://localhost:5173/showcase/demo-builder` → fill Arabic name field → submit → wait for
   success screen → inspect DOM/network/console):
   - Success screen rendered correctly: slug (`demo-barber-6970`), password, reserve CTA, and
     dashboard link (`https://demo.salmansaas.com/demo-barber-6970/dashboard`) all present —
     confirming the new `useEffect` did not block or break the existing success screen.
   - Real network request fired and succeeded: `GET .../reservations/whatsapp-link?client_slug=
     demo-barber-6970 => 200 OK`.
   - The WhatsApp CTA correctly did **not** render (`hasWhatsapp: false` in the evaluated DOM
     check) — the graceful-hide path is real, not just claimed, because the real backend returned
     `available: false` for this environment (confirmed independently in Finding 1).
   - Zero console errors, zero console warnings across the entire flow.
4. **Timing note (unrelated to this change)**: the demo tenant creation itself
   (`POST /demo/create`) took ~18.5s to complete in the browser test, not the 3s originally
   estimated — this is the pre-existing `/demo/create` backend seeding work (Barber + 6
   CatalogService rows + client-service activation), not the new WhatsApp-link fetch, which is a
   separate, later, non-blocking call that fires only after `result.slug` is set.

## Side Findings

- The nested verification agent initially flagged `hasWhatsapp: false` as a "discrepancy" against
  its own (stale, pre-session) memory recall that the WhatsApp link was "not yet built." This was a
  false alarm from working off cached context rather than the real backend state — `available:
  false` is the correct, by-design response in this environment (no `WHATSAPP_CENTRAL_NUMBER`
  configured), and the frontend's graceful-hide is exactly what the approved plan specified. Logged
  here as a reminder that a sub-agent's own memory can lag behind changes made earlier in the same
  session.

## Unknowns

- **The `available: true` path was not exercised as a full live browser round-trip** — only at the
  function level (Finding 2) and via the real API's documented `available: false` branch (Finding
  1, 3). Doing a full browser proof would require setting `WHATSAPP_CENTRAL_NUMBER` on the actual
  running dev backend process and restarting it — deliberately not done here to avoid disrupting
  the user's own live local dev environment mid-session for a one-off test. The route itself has
  zero logic beyond calling `build_central_booking_link()` and wrapping its result
  (`app/api/v1/public/reservations.py:219-232`), so the function-level proof plus the real
  `available: false` browser proof together cover both real code paths without requiring a live
  restart. If Salman wants a full browser proof of the `available: true` render, it requires a
  short-lived local `.env` change + backend restart, not attempted in this pass.

## Verification checklist (per the approved plan)

- [x] Real `curl`/API call against a freshly created demo tenant's own slug.
- [x] Real nested-Playwright pass through the actual flow, confirming the graceful-hide path.
- [x] Zero console errors throughout.
- [x] Evidence written here.
