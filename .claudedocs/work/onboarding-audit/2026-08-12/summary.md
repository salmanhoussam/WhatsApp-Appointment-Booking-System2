# Onboarding Audit — `TenantRegisterPage.jsx` — Alzabt Master Product Plan, Section K step 9

Follows `investigation-protocol.md`'s Confirmed/Side Findings/Unknowns discipline.

## Confirmed Findings

### A real Men's Barbershop template already exists — but self-registering through it does not produce a working Reservations tenant

**Evidence chain, file:line cited:**

1. `frontend/src/config/template-registry.js:212-224` — a real, complete "حلاقة رجالي" (Men's
   Barbershop) template exists: `industry: 'beauty'`, `module_key: 'catalog'`,
   `services: ['reservations']`, with real seed categories (قص شعر / حلاقة لحية / علاجات شعر /
   باقات). My first read of this file missed it (initially concluded, wrongly, that no barbershop
   template existed at all) — corrected before reporting, not after.

2. `TenantRegisterPage.jsx:135-136`:
   ```js
   const MODULE_TO_VENUE = { store: 'store', restaurant: 'restaurant', catalog: 'services' }
   const venueType = MODULE_TO_VENUE[template?.module_key] ?? 'real_estate'
   ```
   The barbershop template's `module_key: 'catalog'` maps to `venue_type: 'services'`.

3. `app/services/registration_service.py:49-56` — `_SERVICE_SEED_MAP`'s real keys are `store`,
   `restaurant`, `barbershop`, `real_estate`, `hotel`, `sports`. **`'services'` is not one of
   them.** `barbershop` itself IS correctly mapped: `["booking", "reservations", "catalog",
   "whatsapp_ordering"]` — the right client-services, if it were ever actually sent.

4. `registration_service.py:147`: `map_services = set(_SERVICE_SEED_MAP.get(venue_type,
   ["catalog"]))` — for `venue_type='services'` (not a real key), this silently falls through to
   the default `["catalog"]` only.

**Result**: a real visitor self-registering through the existing "حلاقة رجالي" template today gets
**zero** `booking`/`reservations` client-services activated — the exact class of bug
`service-system.md` already documents (seeding only `catalog` leaves Reservations silently
unreachable), reached via a different code path than the one that file originally documented.

5. Independently, even if `venue_type` were corrected: `TenantRegisterPage.jsx`'s Step 3
   (`POST /catalog/seed-from-template` → `app/services/catalog_service.py:213-232`,
   `admin_seed_from_template`) **only creates `CatalogCategory` rows** — it never creates
   `CatalogService` or `Barber` rows. A fresh barbershop tenant would have real category *names*
   ("قص شعر") but zero real bookable services and zero staff — landing the same way the
   `/demo/create` gap does: `ReservePage.jsx`'s `mode: 'legacy'` (the old generic dark form), not
   the real booking-mode UI.

**Two independent, confirmed root causes, not one** (per this project's own "Independent Causes Are
Allowed" rule, `investigation-protocol.md`) — fixing only the venue-type mapping would still leave a
tenant with no real services/staff; fixing only the seeding would still leave Reservations
unreachable because the client-service key was never activated.

## Side Findings

- The men's barbershop template's own seed category "علاجات شعر" (Hair Treatments) and "باقات"
  (Packages) don't map to anything in the current `CatalogService` model (which has no "package"
  concept) — a real, smaller design question for whenever this gets built, not investigated further
  here.
- `MODULE_TO_VENUE`'s fallback (`?? 'real_estate'`) matches the exact same wrong-default shape
  already found and documented in `app/services/demo_service.py`'s `_VENUE_TYPE_MAP` (Alzabt Master
  Product Plan, Section B5) — the same class of bug, in a second, independent file.

## Unknowns

- Whether any OTHER template (beauty/health/services industries, several also use `module_key:
  'catalog'` + `services: ['reservations']` — spa, clinic, gym, nutrition, photography, home
  services, design) hits the exact same `venueType: 'services'` fallthrough. Not individually
  traced — the root cause (the `MODULE_TO_VENUE` map itself) is shared by all of them, so the fix,
  if made, would need to cover all of them, not just the barbershop one.
- Whether RK itself was ever onboarded through this exact flow. Project history (memory:
  `project_rk_ali_shared_system_rollout`) indicates RK was seeded directly, not self-registered —
  this flow may never have been exercised for a Reservations-type tenant at all, for any tenant,
  ever.

## Recommendation vs. Decision

**Recommendation**: this is real, load-bearing, confirmed — and it's exactly the blocker Section F
names ("the next real tenant is a clinic — it must onboard through `TenantRegisterPage.jsx` +
dashboard configuration alone, zero new product code"). As it stands today, that's not possible for
any Reservations-type business. A real fix needs: (1) add `barbershop` (and probably a generalized
services-venue key) to `MODULE_TO_VENUE`, (2) extend the seed-from-template step (or a sibling one)
to create real `Barber` + `CatalogService` rows for `reservations`-type templates, matching the same
shape `scripts/seed_alzabt_demo_tenant.py` already proved.

**Decision (per this same reasoning already applied once this session to the `/demo/create` gap,
same class of issue, same precedent)**: **not fixed now.** RK (manually seeded) and `alzabt-demo`
(manually seeded, Step 7) both already prove the Barber/Reservations product works end-to-end
without this path. Per Section G, self-service registration was never part of what "Alzabt ready
for 2026-08-31" requires. Left explicitly open here, named for whenever a real Clinic (or any
genuinely new, non-manually-seeded Barber tenant) actually needs to self-register — matching Section
K step 10's own framing ("apply/adjust visual system to onboarding only if step 9 actually finds it
needs it") extended to this real functional finding, not just a visual one.

## Visual/UX audit (the original scope of this step)

Separately from the functional gap above: the page itself (dark glass, template-preview split
layout, mobile-collapses-to-single-column at 680px per its own inline `@media` block) is internally
consistent and not obviously broken. Not deeply re-styled or touched — per Section K's own
resolved order, visual-system application to onboarding only happens after this audit names a real
need, and the real need found here is functional (service/data seeding), not visual.
