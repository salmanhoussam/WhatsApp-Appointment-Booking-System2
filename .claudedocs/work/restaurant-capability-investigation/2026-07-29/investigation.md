# Restaurant Capability Investigation — 2026-07-29

Per Salman's explicit request: investigation only, no code. Follows
`.claude/rules/investigation-protocol.md` — Confirmed Findings / Side Findings / Unknowns per
area, Recommendation kept separate from Decision, no generalization beyond evidence. Four Explore
passes gathered real evidence in parallel (Booking/Reservations, Catalog vs Menu, Story
Experience/Caracas, Service Registration); this document synthesizes them.

## Scope

The 5 areas Salman named: Booking Capability, Catalog Capability, Story Experience, Service
Integration, Capability Map. Two real tenant types already exist in production on the newer
Tenant OS / Capability Contract architecture (Beit Al Fakhar — store, RK Barber — barbershop).
Two more tenants (Caracas, Arizona) are real, live restaurant tenants — but built on an older,
bespoke, pre-Tenant-OS architecture. This last fact reframes the whole investigation and is
reported first, before the 5 numbered areas.

---

## Facts (directly observed, no interpretation)

- `Reservation` (schema.prisma:661-705) and `Booking` (schema.prisma:295-326) are two separate,
  already-shipped Prisma models. `Reservation`'s own header comment: *"Generic slot-based
  reservation (table, appointment, viewing)... moduleKey → 'restaurant' (table_label, party_size)
  | 'services' (service_name, staff_id) | 'real_estate' (unit_id, guests, viewing_type) |
  'hotel'"*.
- `CatalogItem`/`CatalogCategory` (schema.prisma:428-458, 399-426) are the single unified model
  for both restaurant menu items and store products, discriminated only by `moduleKey`.
- `caracas` has real, seeded `client_services` rows including `serviceKey: "restaurant"`
  (`scripts/seed_unified_clients.py:23-33`), and `require_service("restaurant")` is a real,
  currently-implemented dependency (`app/core/services.py:24-30`) gating real routes
  (`app/api/v1/admin/restaurant.py`, `app/api/v1/public/restaurant.py`).
- `caracas`/`arizona` are routed via dedicated bespoke route files
  (`frontend/src/router/tenants/caracas.routes.jsx`, `arizona.routes.jsx`) with their own
  hand-built pages/hooks/admin dashboard — not `GenericAdminDashboard.jsx`/`DynamicPage.jsx`. `hr`
  (RK Barber) has no dedicated routes file and falls through to `_dynamic.routes.jsx`'s generic
  `DynamicPage` renderer.
- `.claude/rules/backend/service-system.md`'s "🔄 Pending migration" label on the `restaurant`
  service key is **stale** — the backend key is fully live. What's actually still true is that
  restaurant tenants haven't been migrated onto the generic frontend architecture.
- Caracas has two different, real, coexisting scroll-reel components — `CaracasStoryReel.jsx`
  (static image crossfade) on `/caracas/home`, and `CaracasSpecialReel.jsx` (independently-looping
  `<video>` elements crossfaded by opacity) on `/caracas/special` — neither matches Story
  Experience's two existing real techniques (frame-sequence canvas, or single-video
  scroll-scrubbed `currentTime`).

---

## Findings by Area

### 1. Booking Capability

**Confirmed Findings**
- `Reservation` is already a generalized, time-slot + duration + `moduleKey`-discriminated model,
  proven live today for `moduleKey: "services"` (RK Barber's real, working reservations —
  `.claudedocs/reviews/rk-barber-reservations-calendar-verification.md`, real DB row with
  `reservedAt`, `durationMin: 60`, working-hours enforcement).
- The restaurant shape is already designed, not hypothetical: the route docstring
  (`app/api/v1/public/reservations.py:33`) documents `{"table_label": "A4", "party_size": 4}`
  inside `metadata` for `moduleKey: "restaurant"`, and `reservation_service.py:84-109`'s conflict
  check already special-cases `table_label` as a bookable resource key.
- `Booking` (chalet/villa) is a genuinely different computation — nightly `Price`-calendar math
  over a date range, vs. `Reservation`'s single-timestamp + duration overlap check. These are not
  interchangeable; smar's `unit_type: "restaurant"` (a placeholder, WhatsApp-contact-only listing)
  still goes through the exact same `Booking.create()` path as a chalet, with zero branching on
  `unit_type` anywhere in `app/` — it is not evidence of a working restaurant booking flow, only a
  label.

**Side Findings**
- None beyond what's already captured in Confirmed Findings.

**Unknowns**
- No live restaurant tenant has ever exercised `Reservation`'s `moduleKey: "restaurant"` path — the
  schema/conflict-logic readiness is real, but unproven under real traffic (no real table-booking
  UI, no real customer has ever booked a table this way).

**Answer to Salman's question**: table reservations do **not** need Booking to generalize, and do
not need a new Capability either — `Reservation` already *is* the generalized thing `Booking`
would have had to become, and it already ships alongside `Booking` as a separate model/service for
exactly this reason (date-range stays vs. time-slot events are different problems). The real
question is narrower than originally framed: not "should reservations become a Booking mode," but
"is `Reservation`'s already-designed `moduleKey: 'restaurant'` shape ready to be the second real
proof of this pattern" (RK Barber's `"services"` moduleKey is the first).

---

### 2. Catalog Capability (Menu vs. Catalog)

**Confirmed Findings**
- At the **data model** level: Categories, Items, Prices, Availability, and Images are identical
  between a restaurant menu item and a store product — same `CatalogCategory`/`CatalogItem`
  tables, same fields, only `moduleKey` differs. Restaurant items already store `calories`/`spicy`
  inside the same generic `metadata` Json field store items use for `sku`/`weight` — a difference
  in which keys get used, not in the field or the model.
- One real, minor schema-level divergence exists at the **order** level, not the catalog level:
  `StoreOrderItem` has dedicated `color`/`size` variant columns (schema.prisma:649-650) with no
  restaurant equivalent.
- At the **implementation** level, Menu is currently a **separate, parallel system**, not a Catalog
  presentation: `app/api/v1/admin/restaurant.py` and `app/api/v1/public/restaurant.py` both bypass
  `catalog_service.py` entirely, calling `admin_catalog_repo`/`restaurant_repo` directly — this
  independently re-confirms `catalog.md`'s existing "Duplicate Architecture" finding is still real
  today (re-verified against current code, not assumed from the doc). The frontend mirrors this:
  Caracas/Arizona each have their own bespoke menu hooks/pages
  (`useCaracasMenu.js`, `MenuPage.jsx`), never importing the generic `useCatalog.js`/
  `CatalogPage.jsx` that RK Barber's real catalog page uses.

**Side Findings**
- `catalog.md`'s own documentation of what `metadata` is for ("SKU/weight/variants") is
  incomplete/stale — it doesn't mention the `calories`/`spicy` keys restaurant items actually use.
  Worth a small doc correction independent of any implementation work.

**Unknowns**
- The exact `/store/cart` endpoint's real code was not read this session (only inferred from
  schema) — not directly compared to `/restaurant/orders`.
- Arizona's menu hooks/pages were confirmed to exist in a parallel structure to Caracas's but not
  read line-by-line.

**Answer to Salman's specific hypothesis** ("Menu is a Presentation/Contract over Catalog, not a
new Capability") — **the evidence strongly supports the Contract-level claim, but does not yet
match the Implementation.** The data model already proves Menu and Catalog are one Capability
wearing two labels (`moduleKey`) — this is not a new finding invented for this investigation, it's
literally what Phase 54's unification already built and what `catalog.md`'s own header already
states. What the evidence does **not** yet support is treating this as already resolved:
`restaurant.py`'s bypass of `catalog_service.py` means today's real code has NOT caught up to what
the schema already allows — it's the same "second implementation grows unnoticed" pattern this
project has now found three times elsewhere (`evolution/capability-contracts.md`), a fourth
confirmed instance if counted. Salman's instinct about the Contract is right; the codebase hasn't
finished acting on it yet.

---

### 3. Story Experience (Caracas)

**Confirmed Findings**
- Caracas already has two different real scroll-reel techniques (image crossfade on `/home`,
  independently-looping video crossfade on `/special`) — neither is the frame-sequence-canvas
  technique Story Experience uses for Beit Al Fakhar, nor the newer single-video
  `currentTime`-scrub mode added for RK Barber. Adopting Story Experience for Caracas would be a
  **third distinct technique**, not a reuse of either existing mode.
- Caracas is not on the generic Tenant OS architecture at all (own dedicated route file, own
  bespoke pages) — the same bespoke pattern as `smar`/`beit-al-fakhar`, not RK Barber's
  config-driven pattern. Rebuilding Caracas on Story Experience would require migrating it onto the
  generic `DynamicPage`/`SECTION_MAP` architecture first — a materially bigger lift than swapping
  one section type on an already-generic tenant (which is all RK Barber's adoption required).

**Side Findings**
- None beyond the above.

**Unknowns**
- The actual motion characteristics (pan speed, cuts) of Caracas's real video clips were not
  directly inspected this session (would require downloading and `ffprobe`-ing the real Supabase
  assets) — whether they'd need a third frame-density profile beyond the two real data points
  already on record (3.2fps/slow, 9.5fps/fast) is genuinely unknown, not estimated.

**Recommendation-relevant observation (not a recommendation)**: forcing Caracas onto Story
Experience today would test the abstraction against a genuinely different technique (independent
looping clips, not a single continuous take) on top of a genuinely different tenant architecture —
this could either prove Story Experience generalizes further, or reveal it doesn't cover this case
without real new work. Evidence doesn't settle which; only a real attempt would.

---

### 4. Service Integration

**Confirmed Findings**
- "Restaurant support" already fully exists as a real, wired `client_services` key — not pending,
  contrary to `service-system.md`'s stale label. `require_service("restaurant")` gates real routes
  today, and `caracas` has real active rows for it.
- What Restaurant actually needs going forward is not a new service key and not new services to
  build from scratch — it's **composition of what already exists** (`booking`/`reservations` for
  the table-reservation path, `restaurant`/`catalog` for the menu path), the same composition
  pattern RK Barber already proves for a different combination (`booking` + `reservations` +
  `store`/`catalog`).

**Side Findings**
- The `service-system.md` doc itself needs correcting (its "Pending migration" label for
  `restaurant`/`store` describes a frontend-architecture reality, not a backend service-key state,
  and doesn't say so).

**Unknowns**
- Arizona's exact `client_services` row set was not directly confirmed (no seed script entry found
  for it specifically) — assumed consistent with Caracas based on both being documented Live
  restaurant tenants in `CLAUDE.md`, not independently verified.

---

## Recommendations (separate from any Decision — Salman's call, not proposed as settled)

1. **Table reservations**: the lowest-risk path to proving `Reservation`'s `moduleKey:
   "restaurant"` design is a second real tenant exercising it — mirroring exactly how RK Barber
   was the second real case that justified `TOS-004`. No schema change is indicated by this
   investigation's evidence.
2. **Menu vs. Catalog**: the Contract-level unification is already real; the Implementation-level
   bypass (`restaurant.py` skipping `catalog_service.py`) is the actual gap, already named in
   `catalog.md`'s own Open Findings before this investigation started. Closing it would be a
   natural, well-evidenced next Implementation Contract — same shape as Phase 2's `settings.py`
   fix this session, applied to `restaurant.py`/`store.py` instead.
3. **Story Experience for Caracas**: evidence suggests this is **not** a low-risk or small change
   — it combines a new rendering technique with a frontend-architecture migration. Recommend
   treating it as its own Architecture Plan if pursued, not a quick swap, and validating on the
   real video assets' motion characteristics first (the one real Unknown that's cheap to close).
4. **Service Integration**: no new service key or new Service file is indicated. Restaurant
   composes what exists.

---

## Draft Capability Map — Restaurant

```
Restaurant

Capabilities (existing, composed — none new):
  Booking      → via Reservation, moduleKey="restaurant" (table_label, party_size) — schema-ready,
                 unexercised by any live tenant yet
  Catalog      → via CatalogItem/CatalogCategory, moduleKey="restaurant" — already live (Caracas,
                 Arizona), but through a parallel route/service path, not catalog_service.py
  Media        → same mechanism as every other tenant (hero video, gallery)
  Content      → same mechanism as every other tenant (hero/story copy)
  Site Configuration → same mechanism as every other tenant (brand/contact/currency/theme)
  Story Experience (optional) → not proven for this tenant shape; requires a frontend-architecture
                 migration first if the tenant is bespoke (Caracas/Arizona today are)

Restaurant-specific extensions (real, already shipped, not new work):
  - metadata.calories / metadata.spicy on CatalogItem (menu-specific sub-keys, same field as store)
  - RestaurantOrder / RestaurantOrderItem (separate order/checkout tables from Store's)
  - Reservation.metadata.table_label / party_size (schema-ready, unexercised)
```

This map is a draft reflecting what the evidence shows exists or is schema-ready — not a ratified
architecture decision.

---

## Risks

- **Implementing Menu-as-Catalog-presentation without first closing `restaurant.py`'s bypass**
  would add a fourth confirmed instance of the "second implementation grows unnoticed" pattern
  rather than resolving an existing one — any real Restaurant work should account for this
  ordering.
- **Adopting Story Experience for Caracas before migrating it onto the generic architecture**
  risks conflating two independent changes (new rendering technique + architecture migration) in
  one effort, making it hard to isolate which change caused which result if something breaks.
- **Assuming Arizona mirrors Caracas's `client_services` state** without direct confirmation is a
  real, named Unknown — any decision resting on Arizona specifically should verify this first.

## Decisions Required from Salman

1. Should closing `restaurant.py`'s bypass of `catalog_service.py` (Recommendation 2) be scheduled
   as the next real Implementation Contract, given it's already a named, pre-existing finding this
   investigation re-confirmed rather than discovered new?
2. Is a real table-reservation pilot (proving `Reservation`'s `moduleKey: "restaurant"` shape,
   Recommendation 1) wanted as a second real Capability-generalization proof, and on which tenant —
   a new pilot, or retrofitted onto Caracas/Arizona?
3. Should Story Experience for Caracas be pursued at all right now, given the evidence that it
   would require both a new rendering technique and a frontend-architecture migration — or does
   this stay parked, consistent with your own instruction this session to leave Story Experience
   in UX-tuning mode until a second tenant clearly demonstrates the same need?
4. Should `service-system.md`'s stale "Pending migration" label be corrected now (a small,
   low-risk doc fix), independent of any of the above?
