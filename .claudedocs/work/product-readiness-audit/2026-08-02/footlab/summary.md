# Product Readiness Audit — footlab (Store)

Investigation + real Browser Verification only (Playwright MCP against the local dev server,
`localhost:5173`). No code changes, no redesigns, no fixes applied.

## Scorecard

| Page/Step | Verdict | One-line reason |
|---|---|---|
| Landing / Store (`/footlab/store`) | 🟡 Needs Improvement | Loads clean, zero console errors, but each of the 3 categories shows exactly 1 product |
| Add to cart | 🟡 Needs Improvement | Works (verified via JS-fired click), but the real button may be hover-gated — not confirmed reachable by a plain mouse click |
| Cart / Checkout (`/footlab/cart`) | 🔴 Needs Redesign | Confirmed real bug: Payment Method dropdown has zero options — a customer cannot complete checkout |
| Admin Dashboard (`/footlab/admin`) | ✅ Ready | Real data, zero console errors, zero failed API calls once loaded — password reset with explicit approval, verified live |

## What was verified

- **Store page**: navigated with a 5s wait (steady state, not a loading snapshot). Zero console
  errors, zero failed network requests across 87 captured requests. Category pills (Shoes/Clothing/
  Accessories) all switch correctly and each shows real seeded data — real product name, real price,
  real "مميز" (Featured) badge.
- **Add to cart**: clicking "+ أضف للسلة" via a direct JS-fired click (see Unknown below) added the
  item — confirmed by a "عرض السلة" (View Cart) pill appearing with a real count badge ("1").
- **Cart page**: item persisted across a full page navigation (not just client-side state) — real
  line item, real quantity controls, real total ("١٤٩٫٩٩ USD"), a real order form (Name*, Phone*,
  Delivery Address, Payment Method, Notes), and a "تأكيد الطلب" (Confirm Order) button, correctly
  `disabled` while required fields are empty.
- **Checkout button was never clicked**, per the mission's own "no redesigns, no new features" scope
  and to avoid triggering a real external `wa.me` link during an audit.

## Admin dashboard — verified after credential reset

`admin@footlab.com`'s password was reset (with your explicit approval) via the same legitimate
`create-user` endpoint used for `hr` earlier this session, then verified live: real numbers (0 orders
today, 3 sections, 3 products), zero console errors, zero failed API calls once fully loaded (an
initial screenshot caught the stat cards/best-sellers/catalog-preview panels still on loading
skeletons — same lag pattern already documented on `hr`'s dashboard, not a new bug; a longer wait
confirmed they resolve correctly). Real catalog preview matches the storefront exactly: 3 products,
one per category (Air Max 2026/Shoes, هودي كلاسيكي/Clothing, حقيبة ظهر عصرية/Accessories) — this
resolves the earlier Unknown about only 1 product per category: **it's real current seed data, not a
display bug.**

**Confirmed cross-tenant side finding, worth flagging clearly**: right after logging into
`/footlab/admin`, two requests fired for `client_slug=hr` — the *previous* tenant's admin session
tested in this same browser earlier — before the page corrected itself to `client_slug=footlab` for
every subsequent call. Both returned 401 (blocked, not a leak — the JWT in use didn't match `hr`), but
the *request itself* being scoped to the wrong tenant right after switching sessions is exactly the
shape of issue `rules/global.md`'s multi-tenancy rule exists to prevent. **The same pattern repeated
independently when testing `smar`'s admin right after this one** (see `smar/summary.md`) — a second,
independent instance of the identical shape, worth escalating rather than treated as a one-off. Not
traced to a specific file/line (would require reading `ActionInbox.jsx`/`admin.config.js`, out of
scope for this investigation-only pass).

## Confirmed real bug

**The Payment Method dropdown on the cart page has zero `<option>` elements** — verified directly via
`select.options.length === 0` / `select.innerHTML === ""`, not assumed from the screenshot alone. A
real customer has no way to choose a payment method. Whether the submit handler actually requires a
payment-method value (which would mean checkout is fully blocked) or treats it as optional was not
traced into the code — this is Browser Verification evidence, not a code read.

## Unknowns

- Whether "+ أضف للسلة" is reachable by a real mouse hover-then-click. `browser_click` timed out with
  "image intercepts pointer events" — root-caused to `opacity: 0; pointer-events: none` on the
  button's wrapper, consistent with a hover-reveal pattern, but the `browser_hover` tool wasn't
  available this session to confirm a real hover resolves it. Worked around with a direct JS
  `.click()` call (fires the same React handler, but isn't proof a real cursor succeeds the same way).
- Root cause of the cross-tenant `client_slug=hr` request right after login — not traced to a
  specific file/line, flagged as a real finding above, not investigated further (out of scope).

**Resolved during this session, no longer Unknown**: catalog depth (confirmed real — 3 products, one
per category, not a display bug) and admin dashboard access (verified live after an approved
credential reset).

## Current strengths

- Zero console errors, zero failed network requests across the entire verified customer journey,
  including the admin dashboard once fully loaded.
- Cart state persists correctly across a real page navigation, not just in-memory.
- The checkout form's required-field gating on the Confirm button works correctly.
- Admin dashboard shows real, accurate data matching the storefront exactly.

## Biggest weaknesses

- A real, confirmed checkout blocker: no payment method can be selected.
- A confirmed cross-tenant stale-request pattern right after login — second independent instance of
  the same shape found on `smar` too — worth escalating as a real multi-tenancy hygiene concern.

## Top three improvements

1. Fix the empty Payment Method dropdown — this may be blocking every real checkout on this tenant.
2. Investigate the cross-tenant `client_slug` request firing right after an admin login switches
   tenants — same pattern confirmed twice independently (footlab and smar) in this one session.
3. Confirm (via a real hover test) whether the add-to-cart button is reliably clickable for a real
   mouse user, not just via a JS-fired click.
