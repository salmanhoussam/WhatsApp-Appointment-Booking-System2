# P0.1 — `featured_items` wrong-endpoint fix — Evidence

**Scope**: `frontend/src/components/dynamic-sections/FeaturedItemsSection.jsx` only. No backend, no
schema, no `DynamicPage.jsx`, no `catalogApi.js`, no Section System. Per
`ALZABT_SECTION_SYSTEM_WORK_SEQUENCE.md`'s P0.1 item, approved this session for implementation
after a fresh context-reload readback.

## The fix

Branch on the *actual gate* the old endpoint depends on (`"catalog"` in `active_services`), not
merely on whether `"reservations"` is present — a tenant can genuinely have both (RK: real Services
+ real Store categories). When `reservations` is active and `catalog` is NOT, call the already-real,
already-public `GET /reservations/catalog-services` instead of the old `catalogApi.js` path. Every
other tenant's behavior is byte-identical to before.

## A real correctness bug caught before verification, not after

The first draft of this fix branched on `includes('reservations')` alone. RK's real
`active_services` (`catalog`, `booking`, `whatsapp_ordering`, `reservations`, `store` — checked via
live `GET /api/v1/public/rk/config`) has **both** `catalog` and `reservations`. That first draft
would have silently switched RK off its current, working, multi-category walk (Services + Store)
onto the narrower reservations-only endpoint — exactly the "RK must not break" regression the task
explicitly guarded against. Caught and corrected before any live test ran, by checking the branch
condition against RK's real data first. Final condition: `reservations` active AND `catalog` NOT
active.

## Live verification (real Playwright browser, this session, dev server)

| Tenant | Real `active_services` | Expected path | Result |
|---|---|---|---|
| **Ali** (`/ali/home`) | `reservations, booking, whatsapp_ordering` — no `catalog` | New reservations endpoint | ✅ `GET /reservations/catalog-services?client_slug=ali` → `200 OK`. 6 real services rendered (شعر, شعر ودقن, كرياتين, دقن, تمشيط أو تسريح, حنة أو صبغة). 0 console errors, 0 warnings. **The 403 is gone.** |
| **RK** (`/rk/home`) | `catalog, booking, whatsapp_ordering, reservations, store` — both | Old path, unchanged | ✅ `GET /rk/catalog/categories?client_slug=rk` → `200 OK`, same as before the fix. Same 6 real services render alongside RK's other real sections. 0 console errors. 1 pre-existing Framer Motion scroll-container warning (unrelated to this change — same warning, same file/line, present on `caracas` too, a page this fix never touches). |
| **alzabt-demo** (`/alzabt-demo/home`) | `reservations, booking, whatsapp_ordering, catalog` (has `catalog` too — inherited from `demo_service.py`'s own `_SERVICE_MAP["barbershop"]`) | Old path, but moot | ✅ Zero catalog/reservations requests at all — `config.content.sections` is still `[]` (pre-existing, unrelated to this fix), so `FeaturedItemsSection` never mounts. 0 console errors/warnings. No regression, nothing to regress. |
| **A genuine retail tenant** | No real tenant currently renders through `FeaturedItemsSection` with `catalog`/`store` active and no `reservations` — `caracas`/`footlab` are bespoke `tenantRegistry` pages (`HomePage.jsx`, not `DynamicPage.jsx`/`SECTION_MAP`), confirmed live (`caracas`'s own network log shows zero calls to `DynamicPage`'s any component file). Built a throwaway `business_type: "store"` demo tenant (`demo-p01teststore-06ff`) via the real `/demo/create` endpoint to get a real `catalog`+`store`-only tenant, temporarily injected a `featured_items` section into its `config.content.sections` (the only way to exercise this component at all, since `/demo/create` doesn't seed page content) | Old path, unchanged | ✅ `GET /demo-p01teststore-06ff/catalog/categories?client_slug=...` → `200 OK`. 6 real store items rendered (منتج تجريبي 1-6). 0 console errors/warnings. **Tenant deleted immediately after verification** (Client + User + ClientService + CatalogCategory/Item rows) — not RK/Ali/alzabt-demo, created and destroyed solely for this check. |

**Console/network discipline, checked explicitly**: the exact same 2x-request pattern (StrictMode's
known dev-only double-effect-invoke, already documented at the top of this same file re:
`mountedRef`) appears on both the new and the old path equally — pre-existing behavior of this
component, not introduced by this change. No extra request, no unexpected fallback, on any of the
four tenants tested.

## What was NOT touched, confirmed by the diff itself

`git diff` shows exactly one file, three logical changes: one new import (`publicApi`), one new
prop (`config`) threaded through from `DynamicPage.jsx`'s existing `sectionProps` spread (no change
needed there — `config` was already being passed, just not read), and one new branch inside the
existing effect. `catalogApi.js`, `DynamicPage.jsx`, the backend, and the schema are all byte-for-byte
unchanged.

## Result

All 5 requested checks pass with real evidence, not inference. Ali's Services section works for
the first time; RK's existing path is provably untouched; alzabt-demo shows no regression (nothing
to regress); the retail/no-reservations path was proven correct against a real, if temporary, tenant.

**Not committed yet — holding at the checkpoint per instruction, pending review.**
