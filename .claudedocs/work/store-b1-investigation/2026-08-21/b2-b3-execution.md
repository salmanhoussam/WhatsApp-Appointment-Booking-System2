# Track B (Store) — B2/B3 Decisions, Bug Fixes, and Full-Chain Verification (2026-08-21)

Executed per Salman's explicit "fix the bugs and continue b2 and b3" instruction, following the
real-evidence B1 investigation (`summary.md` in this folder). Every decision below is stated
explicitly with its reasoning, per this project's Recommendation/Decision/Execution discipline.

---

## Bug Fixes (B1 Findings 3 and 4)

### Fix 1 — Dashboard nav no longer offers "المتجر" when Store isn't active

**File**: `frontend/src/pages/generic-admin/GenericAdminDashboard.jsx` — `buildNav()` now takes
`activeServices` and only includes the `store` nav entry when
`activeServices.includes('store')`. Call site updated to pass it; `activeServices` itself wrapped
in its own `useMemo` to avoid a new array reference on every render (a real lint warning this
introduced, fixed rather than left).

**Verified live**: mr-h's real sidebar no longer shows "المتجر" (confirmed via a direct DOM read of
every nav button). rk's real sidebar still shows it (regression check — unaffected for a tenant
that does have Store active).

### Fix 2 — StoreTab.jsx / CatalogTab.jsx now surface the real backend error

**Root cause, confirmed by comparison, not guessed**: both files read
`err?.response?.data?.detail` on a failed save, falling back to a generic `'حدث خطأ'`. This
app's real, centralized error envelope (`app/core/handlers.py`) is
`{success:false, error:{code, message, details}}` — there has never been a bare `detail` key at
that path, so the read was always `undefined` and always fell to the generic fallback, on *every*
error in either file, not just the Store-inactive case. The correct pattern already exists
elsewhere in the same codebase, six times over
(`reservationInteractions.jsx`: `err?.response?.data?.error?.message`) — StoreTab/CatalogTab were
simply never aligned to it. Fixed by matching that existing convention exactly, in both files (2
occurrences each).

**Verified live**: the same real add-category attempt on mr-h that previously alerted a generic
"حدث خطأ" now alerts the real backend message verbatim: **"Service 'store' is not activated for
this tenant."** — captured via a real browser dialog, not inferred.

---

## B2 — Materialization mechanism: Decision (a), auto-materialize on activation

**Recommendation** (from B1): two options existed — (a) auto-call `content_service.add_section()`
when `store` is toggled active, or (b) build a real "Add Section" UI in the Section Editor.

**Decision**: (a). Reasoning: only one real section type (`products`) has ever needed this: no
second case exists yet to justify a general-purpose Section Editor UI feature (this project's own
Abstraction Rule — extract/generalize only after a second independent real case, not on
prediction). Option (a) is strictly smaller, fully reuses the already-proven-correct
`content_service.add_section()` (the same function `scripts/add_products_section_rk.py` already
used successfully last session), and closes the exact gap B1 found — no future tenant will need a
manual one-off script again.

**Execution**: `app/api/v1/super/platform_services.py`'s `toggle_client_service()` — after the
existing `ClientService` upsert, if `service_key == "store"` and `is_active`, calls
`content_service.add_section(client_id, "products")`. `add_section()` is already idempotent (checks
for an existing entry before appending), so this is safe to fire on every activation, not just a
tenant's first one — including a deactivate/reactivate cycle.

**Verified live**: called the real toggle endpoint for rk (`store`, already active →
idempotent re-affirm) via a real SUPER_ADMIN-authenticated request → `200 OK`. Fetched rk's real
public config afterward: exactly **one** `products` section, not duplicated — proves the new code
path executes without error and stays idempotent under a repeat call, the two things that mattered
most given `add_section()`'s own correctness was already established.

---

## B3 — Should mr-h get Store? Should rk's hidden products be shown?

### rk: shown — Decision: yes, made visible

**Reasoning**: rk's 4 real products (real names, real prices, one with a real uploaded image) were
clearly seeded as genuine catalog data for the already-completed Products/Services Separation work
(Track B, 2026-08-20) — not placeholders awaiting a business decision. Every piece of the pipeline
(Store service, category, `products` section, `ProductsSection.jsx`, cart, checkout) was already
built and already decided; the only thing stopping the real customer-facing experience from working
was 4 rows sitting at `isActive=False`, which nothing in the historical record suggests was
deliberate — most plausibly an oversight from however the demo data was seeded. Showing them
completes already-decided, already-built work; it does not invent new scope.

**Execution**: real `PATCH /admin/store/products/{id}` calls (one per product), each sending the
exact same full-body shape `StoreTab.jsx`'s own `toggleItemActive()` sends for a real "إظهار" click
— not a raw DB write, not a new mechanism. All 4 calls returned `200 OK`.

**Verified live, full real chain, end to end** (`/rk/home` → `/rk/store` → add to cart → `/rk/cart`
→ checkout → real order):
- rk's real public homepage now shows 4 real "أضف للسلة" buttons (was 0).
- `/rk/store` → "منتجات العناية" tab shows all 4 real products with real prices and (for one) a
  real image — no longer "لا توجد عناصر في هذا القسم".
- Added a real product to cart via the real "+ أضف للسلة" button → `/rk/cart` showed the real item,
  correct name, correct price, correct total ($8).
- Filled the real checkout form (clearly-labeled test name "B3 Fix Verification Test Order", a
  test phone number) and submitted → real `POST /public/store/orders` → **200 OK**, a real
  `StoreOrder` row created (`eb54705a-...`), and the real WhatsApp confirmation flow opened a real
  `api.whatsapp.com/send` tab with the correct order summary text (product × qty, total, order
  number) — confirming the whole customer-facing purchase path genuinely works today, for the
  first time verified end-to-end with real data.
- **Cleaned up**: the real test order was cancelled via the real
  `PATCH /admin/store/orders/{id}/status` (`pending → cancelled`, a valid transition per
  `STORE_TRANSITIONS`) — confirmed `200 OK` and a final DB read shows `status='cancelled'`. No
  other rk data touched.

### mr-h: not activated — Decision: no, deliberately

**Reasoning**: mr-h has zero product/category data of any kind. Activating `store` for a tenant
with nothing to sell would only recreate an equally empty storefront under a different label — it
solves nothing and invents business scope (does this barbershop actually want retail?) that no
part of this investigation or session established. The two Store-related bugs that *did* affect
mr-h (Findings 3 and 4) are now fixed regardless of whether it ever gets Store — mr-h's Dashboard
now correctly hides "المتجر" instead of offering a dead-end tab, and if Store is ever activated for
it later, the auto-materialize hook (B2) and the corrected error messaging (Fix 2) both apply
automatically, with zero further action needed. mr-h's own `client_services`, `content.sections[]`,
and catalog tables were confirmed completely unchanged before and after this session (identical DB
read, byte-for-byte the same 9 sections, same 3 services, same 1 services-only category).

---

## Full Diff Summary

| File | Change |
|---|---|
| `app/api/v1/super/platform_services.py` | B2: auto-materialize `products` section on `store` activation |
| `frontend/.../GenericAdminDashboard.jsx` | Fix 1: gate "المتجر" nav entry on `activeServices` |
| `frontend/.../tabs/StoreTab.jsx` | Fix 2: read `error.message`, not the nonexistent `detail` field |
| `frontend/.../tabs/CatalogTab.jsx` | Fix 2 (same root cause, found via the same investigation) |

No backend schema change. No new endpoints. No refactor beyond the minimum each fix required.

## Real Data Changes Made (declared explicitly, per this project's evidence discipline)

- **rk**: 4 real `CatalogItem` rows (`isActive: false → true`) — the 4 grooming products, via the
  real admin API, mirroring the real "إظهار" UI action exactly.
- **rk**: 1 real `StoreOrder` created then cancelled (test verification, cleaned up,
  `status=cancelled`, not deleted — consistent with this project's established pattern of never
  hard-deleting transactional test records, same as every reservation test this session).
- **mr-h**: zero data changes — confirmed via before/after DB comparison.

## Acceptance — checked explicitly

- ✅ Both B1 bugs fixed, verified live on both tenants, no regression on the working case (rk).
- ✅ B2 decided and executed — auto-materialize on Store activation, verified idempotent via a
  real repeat call.
- ✅ B3 decided for both tenants with stated reasoning — rk's real products shown and the full
  purchase chain verified end-to-end with real data (order created, then cleanly cancelled); mr-h
  deliberately left without Store, with the platform-wide bugs fixed regardless.
- ✅ 0 console errors across every verification step (one real, expected, self-resolving Supabase
  pooler `500` hit once mid-session — this project's long-documented pattern, confirmed
  self-resolved on the very next request, not a regression).
- ✅ No unrelated files touched, no refactor beyond each fix's own minimum.

## Result

**B1, bug fixes, B2, and B3: all DONE.** rk's Store is now a fully real, working, verified
customer-facing capability end-to-end. mr-h's Dashboard no longer offers a broken Store tab, and is
one clean Super Admin toggle away from the same working experience the moment it has real products
to sell.
