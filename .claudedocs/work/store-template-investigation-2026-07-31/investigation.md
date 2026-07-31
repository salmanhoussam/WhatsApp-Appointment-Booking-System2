# Store Template — Investigation Round 2 (Phase 1)

**Follows:** `.claude/rules/investigation-protocol.md`. Written before any code change, per Salman's
explicit instruction to treat Store exactly like Clinic/Authorization Hardening: Investigation →
Verification Plan → Execution Plan → Risk Assessment, in that order, no coding in this pass.

**Builds on, does not replace:** `.claudedocs/architecture/STORE_TEMPLATE_PLAN.md` (2026-07-27) and
`STORE_TEMPLATE_CONTRACT.md` (same date), plus two earlier real investigations this project already
ran against Store: `.claudedocs/work/store-investigation/2026-07-21/` and
`.claudedocs/work/store-flow-validation/2026-07-21/` (a full CDP-driven Collection → Product →
Cart → Checkout → WhatsApp run against `beit-al-fakhar`). This document re-verifies those findings
against **today's** code and real data, and closes gaps those documents left open (the generic,
non-bespoke path was never fully checked end-to-end; the pilot-tenant blocker was never precisely
root-caused).

---

## Confirmed Findings

### 1. Backend Cart → Checkout works today, live-verified right now against real `footlab` data

Re-ran the exact flow, not assumed from the 2026-07-21 reports: `GET /public/store/categories` →
`GET /public/store/products` → `POST /public/store/cart` → `GET /public/store/cart/{id}` →
`POST /public/store/orders` (twice: once with no shipping address, once with a real one). All 200,
real rows created (`StoreOrder` ids `7d9dddc3-...` / `ce63650a-...`), correct totals (`90.0` =
2×45.0; `149.99` = 1×149.99), correctly cleaned up afterward (deleted directly, no admin DELETE
route exists for orders). Both test carts auto-deleted by `checkout()`'s own post-order cleanup —
confirmed 0 carts remain for `footlab`.

The 2026-07-21 bug (`store_repo.py`'s `create_store_order()` rejecting `shippingAddress: None`) is
still fixed in the current code (`app/repositories/store_repo.py:151-152`) — read directly, not
assumed carried forward.

### 2. `footlab` — "Live ✅" since 2026-05-15, but zero real orders or carts ever existed

`SELECT count(*) FROM store_orders/store_carts WHERE client_id = footlab` → **0, 0**, before this
investigation's own test rows. "Live" accurately describes the storefront (browsing) being
reachable; it does not mean a real customer has ever completed a cart or checkout on this tenant.
All prior real validation (2026-07-21) was run against `beit-al-fakhar`, a separately-built,
bespoke tenant — not `footlab`. This investigation is the first time the generic, shared code path
has been checked end-to-end against real `footlab` data.

### 3. The generic (shared) checkout path has **no WhatsApp integration at all** — a real, confirmed gap

`frontend/src/pages/generic/normal/CartPage.jsx` (used by `footlab` and any new template-based
tenant) calls `POST /store/orders`, then shows an **in-page success screen** — no `wa.me` link, no
`window.open`, no message construction anywhere in this file. Confirmed by full read, not grep-only.
Backend-side: `app/services/whatsapp_notifications.py` has exactly two functions,
`send_booking_confirmation`/`send_booking_cancellation` — nothing for Store orders. **The only real
WhatsApp-order integration in this entire codebase is `beit-al-fakhar`'s bespoke
`checkout/CheckoutPage.jsx`** (built and CDP-verified 2026-07-21, Phase 3) — a one-off,
tenant-specific build, not shared code. A new pilot Store tenant using the standard `fashion-grid`
template gets **zero** WhatsApp order notification, contradicting the flow Salman described
(`... ↓ WhatsApp Order ↓ ...`) unless this gets built as shared/generic work in this round.

### 4. No QR-code generation feature exists anywhere in this codebase

Repo-wide grep for `QR`/`qrcode`/`QRCode` matches exactly one file:
`frontend/src/pages/marketing/components/home/ServicesSection.jsx` — marketing copy on the
platform's own landing page ("منيو رقمي بـ QR Code"), not a real feature. There is no QR-image
generation, no admin UI to produce one, nowhere in `app/` or `frontend/src/`. "QR entry point" in
the requested flow is, today, nothing more than "the tenant's existing public URL" — a real QR
code image encoding that URL would need to be built (or generated externally and is out of this
codebase's scope) if a literal scannable image is expected as a deliverable.

### 5. No generic Product Detail Page exists — confirmed still true today, not just in 2026-07-21

`frontend/src/pages/generic/normal/CatalogPage.jsx`'s cards only support "add to cart" — clicking
a card does not navigate anywhere in the generic path (confirmed: `beit-al-fakhar`'s Product Page
from Phase 2 is bespoke JSX in its own tenant folder, not a shared component; `footlab`'s routes
file registers no `/store/:id`-shaped route at all). A shopper on a new pilot tenant sees products
only as grid cards with an "add to cart" button — no dedicated detail view, no larger image, no
description shown beyond what fits on the card.

### 6. Product Variants — real metadata exists on live `footlab` products, contradicting the 2026-07-27 plan's "unused in production" framing

`GET /public/store/products` against `footlab` right now returns real `variants` arrays on 2 of 3
products (e.g. `[{"size":"42","color":"Red","stock":10}, ...]`) — this data is NOT empty in
production, correcting `STORE_TEMPLATE_PLAN.md §2`'s claim. What that plan got right and remains
true: no admin UI writes this data (confirmed: `CatalogTab.jsx`, still zero `variant` references),
no shopper UI reads/selects it (confirmed: `CatalogItemCard.jsx`, generic path), and `StoreCartItem`
still has no `color`/`size` columns to carry a selection through — so this real data sits in
`footlab`'s products, fully inert, presumably hand-seeded directly rather than entered through any
built UI. The structural gap (Cart can't carry a variant choice) is confirmed unchanged.

### 7. The pilot tenant's exact block, root-caused precisely — more precise than the existing todo_list.md entry

`store-pilot-test-20260727`'s real DB row: `service_type = "ecommerce"`, only `catalog` active.
Traced the actual code path, not assumed: `registration_service.py`'s `_SERVICE_SEED_MAP` **does**
have a correct `"store": ["store", "catalog"]` entry — the fixture file's own
`client.service_type: "store"` value would have worked correctly if it had actually reached this
map. Since `client.service_type` is set directly from whatever `venue_type` the registration call
received (lines 126/168, `"service_type": venue_type`), and the real row shows `"ecommerce"`, the
actual registration call that created this tenant was made with **`venue_type="ecommerce"`, not
`"store"`** — an execution-time slip (the wrong value was actually submitted), not a bug in the
fixture file or in `_SERVICE_SEED_MAP` itself. A **separate, unrelated, disagreeing** map
(`app/core/services.py`'s `SERVICE_TYPE_MAP`) has no `"store"` key at all and would have produced a
different wrong result had it been used instead — confirming this project's already-logged
"Service-type taxonomy consolidation" gap (`todo_list.md`, 4 disagreeing lists) is not theoretical;
it's the exact reason the first pilot attempt is currently stuck. **Practical consequence**: a
super-admin `PATCH` activating `store` fixes this one tenant's block immediately (as already
planned); it does not fix the taxonomy confusion that could cause the same slip on the next tenant
onboarded the same way.

### 8. Admin experience is real and wired, not stubbed — checked two different implementations

`generic-admin/tabs/OrdersTab.jsx` (the shared component every template-based tenant's dashboard
uses, confirmed wired in `GenericAdminDashboard.jsx`) is a real, complete implementation: search,
status filter, sort, pagination, per-row status transitions matching `admin/store.py`'s own
`STORE_TRANSITIONS`, calling `GET/PATCH /{store|restaurant}/orders...` correctly. Live-verified: the
two test orders created in Finding #1 appeared correctly via `GET /admin/store/orders` with an admin
JWT. `generic-admin/tabs/CatalogTab.jsx` (product management) also correctly maps `is_active` →
`isActive` on create (unlike `properties.py`'s bug fixed 2026-07-31 earlier this session) — checked
directly, not assumed safe by association. `footlab` additionally has its own bespoke
`FootlabAdminDashboard.jsx` (separate from the generic one) with an equivalent, independently-built
Orders/Products/Stats tab set — both real, neither stubbed.

### 9. `admin/store.py` still bypasses `catalog_service.py` — confirmed unchanged from the 2026-07-27 plan

`grep admin_catalog_repo app/api/v1/admin/store.py` still matches — the Catalog Duplicate
Architecture finding (`capabilities/catalog.md`) is exactly as before, inherited debt, not
introduced or worsened by this investigation.

### 10. `StoreCustomer` — real schema model, zero implementation anywhere

Repo-wide grep for `storecustomer`/`StoreCustomer` outside `schema.prisma` returns nothing — no
repo function, no service, no route reads or writes this table. The model exists purely as unused
schema. Every real order today is guest-checkout (`StoreOrder.customerId` always null in practice).
Not a blocker — Cart/Checkout never required a customer account — but worth naming as dead schema,
consistent with this project's existing pattern of flagging unused models rather than assuming they
back a real feature.

### 11. Response format is consistent — Store's public API does NOT share the camelCase/snake_case bug found in `bookings.py`/`properties.py` earlier today

`app/api/v1/public/store.py` uses hand-written `_fmt_*()` dict builders throughout (`_fmt_product`,
`_fmt_cart`, `_fmt_order`) — never `response_model=` directly on a raw Prisma object. Checked
specifically because of today's earlier finding; Store's public API is not part of that pattern.

---

## Side Findings

- `SERVICE_TYPE_MAP` (`app/core/services.py`) and `_SERVICE_SEED_MAP` (`registration_service.py`)
  are two independently-maintained, disagreeing venue-type→service-key maps — already logged as a
  known gap (`todo_list.md`, "Service-type taxonomy consolidation"), now directly implicated as the
  real mechanism behind Finding #7. Not fixed here — out of scope for an investigation.
- `client_services` rows `store.products`/`store.cart` (seeded for `venue_type="ecommerce"` via
  `SERVICE_TYPE_MAP`) are never checked by any `require_service(...)` call anywhere in `app/` —
  confirmed by grep. Dead/decorative rows, not a functional gate.
- `dating_service.py:91`'s narrower `payload.get("config", {})` risk (logged 2026-07-21) — unrelated
  module, still unfixed, not touched.

## Unknowns

- Whether a real customer has ever completed a Store checkout on **any** tenant besides the
  synthetic CDP test runs against `beit-al-fakhar` (2026-07-21) — not checked for tenants other than
  `footlab` (confirmed zero) and `beit-al-fakhar` (test-only). No production analytics/logging was
  reviewed.
- Whether the generic admin dashboard's `OrdersTab`/`CatalogTab` have ever been exercised through
  an actual browser for a Store-type tenant — this investigation confirmed them via code read +
  direct API calls, not a live browser session (no CDP/browser tool used this pass, unlike the
  2026-07-21 investigations).
- Real multi-item cart checkout timing/behavior at the generic path — the 2026-07-21 Phase 3 report
  already flagged this as unverified for `beit-al-fakhar`'s bespoke flow; this investigation did not
  re-test it either (both live test orders used a single line item).
- Supabase pooler latency/intermittent connectivity (documented repeatedly across this project,
  hit twice again during this very investigation's own live-testing) — real, recurring, environment-
  level risk; not something this investigation can resolve, only flag as expected friction.

---

## Decisions (Salman, 2026-07-31, after reviewing the full 4-phase report)

Both open scope calls from Phase 3 Step 2/3 are resolved — not left open:

1. **WhatsApp order notification: build now, generic (not bespoke).** Salman's reasoning: this
   platform's identity is built on WhatsApp — a Store tenant that doesn't send a WhatsApp order is
   "a plain e-commerce site," not SalmanSaaS. Treated as part of Definition of Done for this
   milestone, not a deferrable nice-to-have.
2. **QR entry point: build now, simple version only.** Salman's explicit scope limit: no complex QR
   system — generating a QR code image for the tenant's existing public store URL is sufficient.
   QR is the named entry point of the whole flow, not a feature to defer.

## Revised Milestone Definition — "First Production Store," not "Working Store"

Salman's correction: a milestone measured by API/backend success ("Working Store") is a technical
finish line, not a product one. The actual finish line is a full real-user journey:

```
Tenant created → services enabled → products added → QR generated
  → customer scans QR → browses catalog → cart → checkout
  → WhatsApp message sent → merchant receives it → merchant confirms
  → order completed → verified end-to-end → documented → phase closed
```

## Revised Phase Structure

```
Phase 1 — Investigation     ✅ done (this document)
Phase 2 — Verification Plan ✅ done (Phase 2 above)
Phase 3 — Execution         WhatsApp + QR now IN scope, not optional (see below)
Phase 4 — Pilot             NEW — a real first tenant exercises the whole flow; first customer
                              use always breaks an assumption the plan didn't anticipate
Phase 5 — Documentation     NEW — close the milestone properly, same discipline as every other
                              closed phase this project has produced
```

## Phase 3 Execution — revised scope (WhatsApp + QR no longer optional)

Steps 0/1/4/5 from the original Phase 3 above are unchanged. Step 2/3 replaced with:

- **WhatsApp**: generalize `beit-al-fakhar`'s already-proven message-building logic
  (`buildWhatsAppMessage()` + `wa.me` deep link) into the generic `CartPage.jsx` checkout path —
  this is the *second* real case for that logic (the first real case that justifies generalizing
  it, per this project's own Abstraction Rule, since a single bespoke build isn't evidence a shared
  shape is correct — this is exactly that second proof point).
- **QR**: generate a QR code image encoding the tenant's real public store URL (e.g.
  `demo.salmansaas.com/{slug}/store`) — a static image, shown/downloadable from the admin dashboard.
  No dynamic QR-session tracking, no per-product QR, no scan-analytics — deliberately the minimum
  Salman specified.

## Phase 4 — Pilot (new)

A real tenant (the fixed/re-registered pilot from Step 0) walks the entire journey above in order,
once, for real — not simulated. Confirms the whole chain, including the two genuinely new pieces
(WhatsApp send, QR scan) that Phase 2's original matrix never covered because they didn't exist in
scope until this decision. Real assumption-breaking is expected here, per Salman's own reasoning
("أول عميل دائماً يكسر افتراضاتك") — this phase exists specifically to surface it before calling
the milestone closed.

## Phase 5 — Documentation (new)

Same discipline as every other closed phase this project has produced: evidence file, `todo_list.md`
update, session report — nothing new to invent, just don't skip it once Phase 4 passes.

## Business Risks (new category, alongside the Technical risks already in the original Phase 4)

Named explicitly by Salman as a distinct, sometimes more dangerous category than a code bug —
carried forward as open questions for the Pilot phase to actually answer, not guessed at here:

- Does the merchant understand the admin dashboard well enough to add a product unassisted?
- Does the merchant understand what the QR code is for and how to display/print it?
- Does a real customer understand the Cart/Checkout flow without guidance?
- Is the generated WhatsApp message's wording actually clear to a real merchant receiving it cold?

These are Pilot-phase questions, not something to design an answer to in advance — the Pilot's job
is to observe and report what actually happens, the same "runtime before assumption" discipline
already governing this whole investigation.

---

## Gating Question (Salman, 2026-07-31): "Are we sure the first Pilot Store will resemble a real first customer?"

Answered directly, with evidence, not assumed yes. **Not yet — four concrete gaps, three of which
need Salman's own input to close, found by checking the *existing* pilot setup against his own new
Definition of Done, not by re-deriving requirements from scratch:**

1. **Products would currently be seeded via `seed_catalog.py` from a JSON fixture, not entered
   through the real admin dashboard.** `STORE_TEMPLATE_CONTRACT.md`'s existing plan (Step 1 of the
   revised Execution Plan, unchanged until now) does exactly this. Salman's own new checklist item
   — "✅ إضافة منتجات من لوحة التحكم" — requires the opposite: a human actually using
   `CatalogTab.jsx`'s real create-product form. **This changes Step 1**: products for this Pilot
   must be added through the real dashboard UI, not the seed script. The seed script stays useful
   for categories/settings scaffolding, not for the products themselves.

2. **The fixture's WhatsApp number is fake and cannot receive a real message.**
   `store-pilot-test-20260727.json`'s `owner.whatsapp: "+10000000001"` is explicitly marked as an
   obviously-fake placeholder in the fixture's own description. Salman's checklist item "✅ استلام
   التاجر للرسالة" (the merchant *receives* the message) cannot be checked off against this number —
   there is no real device on the other end. **Needs Salman's input**: a real WhatsApp-capable
   number to use as this Pilot's merchant contact — his own, or another real number he controls.

3. **"✅ مسح QR بالموبايل الحقيقي" (scan with a real phone) is not something this investigation, or
   any CDP/headless run, can perform or verify.** This step requires a real human with a real
   device, at Pilot time — not a blocker to starting Phase 3, but a real dependency on Salman (or
   whoever he delegates) to physically do at the Pilot step, named here so it isn't silently assumed
   automatable.

4. **"✅ إنشاء Tenant جديد بالطريقة الرسمية" (created via the official method) is cleaner satisfied
   by registering a fresh tenant correctly than by patching the existing broken one.** The existing
   `store-pilot-test-20260727` row carries a real execution slip in its history (`service_type`
   permanently recorded as `"ecommerce"`, per Finding #7) — a super-admin PATCH activating `store`
   fixes its *function* but not its *record*, which would still show an irregular creation path if
   anyone audits it later. **Recommend**: register a fresh pilot tenant for this round specifically
   (Phase 3 Step 0, Option b from the original plan), confirming `venue_type="store"` is what
   actually reaches the registration endpoint this time — not reusing the already-patched one.

**One operating constraint for Pilot execution itself, not a gap**: Salman's checklist item "✅ عدم
وجود بيانات يدوية أو SQL أو تعديل مباشر لقاعدة البيانات بعد إنشاء الـ Tenant" means once the fresh
Pilot tenant is created, every subsequent step (services, products, QR, cart, checkout) must go
through real APIs/UI only — no direct Prisma/SQL shortcuts, unlike this investigation's own
verification work (which used direct DB reads/writes deliberately, for a different purpose:
confirming current backend behavior against `footlab`, not building the Pilot itself).

**Conclusion**: once gaps #1/#2/#4 above are resolved (one methodology correction on my side, two
real inputs needed from Salman), the Pilot setup would genuinely resemble a real first customer —
not just a technically-passing test fixture. Not yet confirmed "yes" until those three are closed.

## Definition of Done — First Production Store Checklist (Salman, 2026-07-31)

Phase 3/4 is not considered closed until every item below is checked, with real evidence per item
(matching this project's Evidence Interrogation standard — a checkmark alone is not evidence):

- [ ] Tenant created via the official registration method
- [ ] `store` + `catalog` services activated
- [ ] Products added from the real admin dashboard (not a seed script)
- [ ] Products appear correctly on the real public storefront
- [ ] QR code generated and shown in the admin dashboard
- [ ] QR code scanned with a real physical phone
- [ ] Products added to cart
- [ ] Checkout completed
- [ ] WhatsApp message sent
- [ ] Merchant actually receives the message (real device, real number)
- [ ] Order data verified correct (products, quantities, price) against what was actually ordered
- [ ] No manual data/SQL/direct DB edits after tenant creation
- [ ] Test data cleaned up, or explicitly kept if this tenant is promoted to a real official demo

## Success Metrics (Salman, 2026-07-31) — measured during Pilot, not estimated in advance

- Time to create a new tenant
- Time to add the first product
- Time to reach the first real order
- Number of errors encountered during the Pilot
- Any step that required developer intervention (named specifically, not just counted)

## Pilot Retrospective (Salman, 2026-07-31) — immediately after Pilot, before Documentation

Five fixed questions, answered from what actually happened during the Pilot, not predicted now:
1. What surprised us?
2. What was harder than expected?
3. What did the customer never use at all?
4. What did the customer ask for immediately?
5. What can be confidently deferred?

Per Salman's own framing, this session is likely more valuable than any refactor, because it's the
first real point in this milestone where a genuine customer's behavior — not an architectural
guess — drives the next decision.

---

## Phase 3 Execution — Status (2026-07-31)

Executed per Salman's explicit go-ahead ("ابدأ Phase 3 مباشرة بعد إنشاء الـ Tenant الجديد"). No
code was touched until this point; everything below is real, live-verified work, each piece its
own commit.

### Real bugs found and fixed, squarely blocking this phase's own critical path

1. **`frontend/src/pages/auth/TenantRegisterPage.jsx`'s `venue_type` mapping** — `store` was mapped
   to `"ecommerce"`, which has no entry in `registration_service.py`'s `_SERVICE_SEED_MAP`. This is
   the real root cause of the original pilot tenant's stuck state (Finding #7 above) — not a
   one-off execution slip as first assumed, but a live bug in the only real self-registration path
   every future Store merchant would hit. Fixed to map `store → "store"`. Commit `1b7f7e5`.
2. **`admin/store.py`'s `create_product`/`update_product`** — same root-cause *pattern* as today's
   earlier `bookings.py`/`properties.py` fixes: a bare `None` passed for the `metadata` `Json?`
   field, 500ing on every product with no optional fields set (i.e. every simple product). Fixed to
   omit the key when empty. Confirmed the identical bug in `admin/restaurant.py` (2 places) —
   logged, not fixed (different module, out of scope). Commit `b4e4730`.

### A hidden risk found and resolved (not a bug — a missing scaffolding step)

3. **A freshly self-registered tenant has no purchasable public page at all.** `/demo/{slug}/catalog`
   (what any new, non-`tenantRegistry` tenant gets) is confirmed read-only — zero cart code. The
   real Cart/Checkout pages only exist for tenants registered in `tenantRegistry` with their own
   routes file (`footlab`, `beit-al-fakhar`, `sneakers-lb`). Followed the existing, documented
   3-step scaffolding process for `store-pilot-20260731` — not a new pattern. Commit `c8e0c11`.

### New features built, per Salman's explicit decision to build both now

4. **QR generation** — `GET /admin/settings/qr` + a `StoreQRSection` in the admin dashboard's
   Settings tab. Live-verified: real QR PNG generated, decoded, and visually confirmed as a genuine
   scannable code encoding `https://demo.salmansaas.com/store-pilot-20260731/store`. Commit
   `bad2f78`.
5. **Generalized WhatsApp order notification** — `buildStoreWhatsAppMessage()` in the shared
   `CartPage.jsx`, generalized from `beit-al-fakhar`'s already-proven (2026-07-21, CDP-verified)
   message logic — the 2nd real case that earns generalizing it. Commit `f533de3`.

### Fresh tenant registered and built up through real APIs only

`store-pilot-20260731` — registered via `POST /api/v1/auth/register` with `venue_type: "store"`
(the corrected value), settings applied, 5 categories seeded from the `fashion-grid` template, 3
real products created through the real admin API (`POST /admin/store/products` — the same endpoint
`CatalogTab.jsx`'s create-product form calls, not a seed script). All verified live:
`client_services` shows `["store", "catalog"]` correctly active; products appear on the real public
`GET /public/store/products`; a real cart add + checkout succeeded (order `fe904aa6-...`, cancelled
afterward as cleanup via the real `PATCH /orders/{id}/status` API — no direct DB writes after tenant
creation, per Salman's own constraint).

### What is and isn't verified

**Verified, live, today**: tenant registration (corrected), service activation, category seeding,
product creation via the real admin API, products appearing publicly, cart add, checkout/order
creation, QR image generation and visual correctness.

**Not verified — genuinely requires a real browser, none available in this environment**: the
`wa.me` `window.open()` call itself firing correctly from the UI, the admin dashboard's Settings/
Orders/Catalog tabs actually rendering in a browser for this tenant, and the full click-through
journey a real shopper would experience. All 5 new/modified frontend files were confirmed to parse
and transform cleanly through Vite's real dev pipeline (no build errors) — this is real evidence of
syntactic correctness, explicitly not the same claim as "verified working in a browser."

**Deliberately not done yet (Pilot-closing gates, not Phase 3 gates, per Salman's own explicit
sequencing)**: a real WhatsApp-capable number (the fixture's `+10000000002` is a placeholder, same
convention as the original fixture), and the physical QR-scan-with-a-real-phone step.

### Ready for Pilot

Everything else on the Definition of Done checklist is either complete or waiting specifically on
Salman's two inputs. Next step is his: provide a real WhatsApp number to swap in for this tenant,
and perform the physical QR scan — at which point the Pilot phase (and the Retrospective after it)
can close this milestone for real.
