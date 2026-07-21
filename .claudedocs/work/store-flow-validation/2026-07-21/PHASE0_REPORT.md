# Phase 0 — Runtime Validation & Architecture Confirmation

**Trigger:** Before redesigning beit-al-fakhar's checkout, Salman correctly rejected proceeding on
assumptions — the previous investigations verified config/categories/items in isolation, never a
real end-to-end Collection → Category → Cart → Checkout submission. Ordered a full runtime
validation via Chrome DevTools Protocol (same method already proven this session) before any
redesign work starts.

**Raw evidence:** `p0_flow_1_store.png` → `p0_flow_4_after_submit.png` (screenshots at each real
step), `phase0_flow_requests.json` (every real network request/status), `store-order-traceback.txt`
(real backend traceback), this report.

## Confirmed Findings

- ✓ **Home page**: renders correctly with real content (hero video frame, real Arabic copy, nav).
  Took ~10-20s cold — consistent with the already-documented Supabase pooler flakiness re-
  triggered by restarting the dev server for this validation, not a new issue.
- ✓ **Collection (`/store`) page**: renders correctly — 4 real category pills, real plate items
  with real photos and captions, confirmed via a live screenshot after the items actually loaded
  (not assumed from a fixed timeout).
- ✓ **No Product Detail Page exists anywhere in this codebase** — checked directly:
  `CatalogItemCard.jsx`'s only interactive element is an "add to cart" button
  (`e.stopPropagation()` on click, no navigation); no `/store/:id` or equivalent route exists in
  any tenant's routes file or the generic router. This is real and applies to **every** store-
  module tenant (footlab, beit-al-fakhar, any future one) — not something broken, something never
  built.
- ✓ **Add to cart**: works correctly. Clicked a real item's "أضف للسلة" button via the actual DOM
  (not simulated data) — `localStorage['generic-cart']` updated with the real `catalogItemId`,
  `name_ar`, `image_url`, `quantity` immediately after.
- ✓ **Cart page**: renders the added item correctly, form fields present and fillable (verified by
  actually setting `Full Name`/`Phone` via the React-controlled-input native-setter pattern and
  reading the values back).
- ✓ **The order-submission pipeline is broken — a real, previously undiscovered, severe bug.**
  Submitting the form gets permanently stuck on "جارٍ الإرسال..." (Submitting...) — never resolves
  to success or error in the UI. The real backend traceback (`store-order-traceback.txt`) shows
  why: `app/repositories/store_repo.py`'s `create_store_order()` calls
  `prisma_client.storeorder.create(data={"clientId": client_id, ..., "items": {"create": [...]}})`
  — mixing a **scalar foreign key** (`clientId`) with a **nested relation write** (`items:
  {create: ...}`) in the same call. Prisma's generated client requires one input style or the
  other, not both: once any nested relation write is present, the whole `data` object is coerced
  to the "checked" input type, which expects `client: {connect: {id: ...}}`, not a bare `clientId`
  — hence `prisma.errors.MissingRequiredValueError: data.client: A value is required but not set`.
  **Every real order submission on the store module, for every tenant, currently fails this way.**
  The frontend never learns about it because the request never completes within any reasonable
  time from the UI's perspective in this trace (see Unknowns below for the precise mechanism).

## Side Findings

- **The identical bug pattern exists in the restaurant module too**: `app/repositories/
  restaurant_repo.py`'s `create_restaurant_order()` has the exact same shape — scalar
  `"restaurantId": restaurant_id` mixed with nested `"items": {"create": data["order_items"]}"`.
  Not directly triggered/confirmed live in this pass (this investigation only drove the store
  flow) — flagged as a side finding with high suspicion, not asserted as confirmed. See Unknowns.
- The cart page's store-specific fields (`عنوان التوصيل` / delivery address, `طريقة الدفع` /
  payment method) were briefly absent on first render and appeared moments later once `moduleKey`
  synced into the Zustand store — normal async loading, not a recurrence of the StrictMode
  `mountedRef` bug (the fields did appear; nothing stayed permanently blank).
- Cart items currently carry `price: 0` (matches the already-logged gap: these `CatalogItem` rows
  intentionally have `price: null`, not fabricated) — visible in the cart UI as "٠USD", a real but
  already-known/expected gap, not new.

## Unknowns

- **Exact frontend-visible failure mode not fully resolved.** The backend 500s confirmed twice now
  (`grep -c MissingRequiredValueError` → 4 log lines = 2 real triggering events, one per test run).
  First run: UI stayed stuck on "جارٍ الإرسال..." within the capture window. Second, more targeted
  run (isolating just the submit step): the backend log shows the same error fired again, but the
  page ended up showing the empty-cart state with no visible success or error message — this
  second run used a forced `localStorage` seed + `location.reload()` to isolate the submit step
  faster, which may have introduced its own artifact (e.g. reading state from before the async
  response actually landed). Not confident enough in that second reading to assert a second real
  UI behavior beyond "the backend 500 is real and repeatable" — a cleaner retest without the
  reload trick would be needed to state precisely what the user sees, if this isn't fixed first.
- **Restaurant module's identical-looking bug is not directly confirmed live** — same code shape,
  not yet triggered against a real restaurant tenant (caracas/arizona) in this session.
- **Whether other `create()` calls in this codebase share the same scalar+nested-relation mixing
  pattern** was not swept for — only `store_repo`/`restaurant_repo`'s order-creation functions were
  checked, because that's what this trace actually exercised.

## Architecture Decision — Product Detail Page & Checkout (per Salman's explicit ask)

No Product Detail Page exists anywhere to "reuse" — the real choice is build-generic vs. build-
tenant-specific from scratch, not reuse-vs-fork. Per this project's own Abstraction Rule (build the
first complete real use case, generalize only once a second real case proves the shared shape),
building a **beit-al-fakhar-specific Product Detail Page** now — not a generic one — is the
correct call; a shared/generic version should wait until a second real tenant needs one, same
discipline already applied to the Restaurant template and tenant-seeder this session.

For Checkout specifically, Salman's preferred shape (generic layout + tenant theme layer, not a
full fork) is the right instinct **once two tenants need premium checkouts** — right now only
beit-al-fakhar does. Recommend: build beit-al-fakhar's checkout now as a tenant-specific page, but
write it so the layout/data-plumbing (cart summary, form, submit handler) is cleanly separated from
the visual theme (colors, showroom panel, typography) inside that one file/folder — so that *if* a
second tenant needs the same premium treatment later, extracting a shared layout + theme layer is
a refactor of proven code, not a guess about what should be shared.

## Recommendation → Decision → Execution

- **Recommendation:** Fix the `create_store_order`/`create_restaurant_order` Prisma bug
  (`clientId`/`restaurantId` → `client`/`restaurant`: `{"connect": {"id": ...}}`) **before** wiring
  the new WhatsApp-plus-DB-order checkout flow — building the redesigned UI on top of a checkout
  that cannot currently create a single real order would ship a broken "Send Order" button no
  matter how the frontend looks. This is a backend fix, small and precise, not a redesign.
- **Decision:** Not made yet — this is exactly the kind of finding Salman's Phase 0 request exists
  to surface before implementation starts. Awaiting explicit direction: fix this bug as its own
  first step, then proceed with the redesign plan already written, or handle differently.
- **Execution:** None yet. Dev servers (`uvicorn`, `vite`) were restarted for this validation and
  are still running; headless Chrome instance used for the trace has been closed.
