# Capability-to-Section Audit — Products/Catalog, Clients, Notifications (2026-08-20)

Investigation-only, per `investigation-protocol.md`. No code changed. Follows Salman's exact
5-question structure per capability, opened explicitly as a separate track from the Tenant OS
Section Editor's own 6 phases (Phase 5 closed, Phase 6 not started). Real code read throughout —
no field/endpoint/behavior below is assumed or recalled from memory without a fresh check this
session.

---

## 1. Products / Catalog

### Q1 — Is it actually a Homepage Section?

**Partially, indirectly, and not by curation.** No dedicated "Products" section exists in
`SECTION_MAP`. Store Products (`CatalogItem`, `module_key='store'`) can appear **pooled inside
`featured_items`** — confirmed real for a tenant with both `reservations` and `catalog` active
(`FeaturedItemsSection.jsx:57-79`'s second branch fetches every real category via
`fetchAllCategories`/`fetchItems`, pooling items across *all* active catalog-bearing capabilities,
explicitly because "RK Barber's real Services + Store categories" must both be shown). `RK` is
exactly this tenant — confirmed live: `GET /rk/catalog/categories` returns two real categories,
`الخدمات` (`module_key: catalog`) and `منتجات العناية` / Grooming Products (`module_key: store`).
`categories_grid` (`CategoriesGridSection.jsx`) would show the same pooled categories as tiles if
enabled — **confirmed neither real tenant (`mr-h`, `rk`) has `categories_grid` or `offers` enabled
today** (checked both tenants' real `content.sections[]` this session — neither list includes
either type).

**Real, material finding**: `RK`'s "Grooming Products" Store category currently has **zero real
products** (`GET /store/products?category_id=...` → `[]`) — so today, RK's live `featured_items`
section shows Services only, in practice, even though the code pools both. **This means Phase 5's
Services `CapabilityLink` ("إدارة الخدمات ←") does not cover the Store-Products half of what the
same homepage section would show the moment RK's admin adds even one real product** — that
product would appear in `featured_items` with zero path to manage it from the Section Editor
(only reachable via the separate "المتجر" tab). Not a live bug today (the category is empty); a
real, named, latent gap for the moment it isn't.

### Q2 — What is the current real source of truth?

`CatalogItem`/`CatalogCategory` (Prisma, `prisma/schema.prisma:445,475`) — one real table pair,
shared across capabilities via a `module_key` discriminator (`'catalog'`, `'store'`, ...). Not two
separate models.

### Q3 — Does it already have real CRUD?

**Yes — twice, over the same model.** `StoreTab.jsx` → `/store/categories`, `/store/products`
(full CRUD, image upload, reorder) and `CatalogTab.jsx` → `/catalog/categories`, `/catalog/items`
(full CRUD, delete, image upload, reorder) — confirmed via `app/api/v1/admin/store.py` and
`app/api/v1/admin/catalog.py`, both operating on `CatalogCategory`/`CatalogItem` directly (`store.py`'s
own docstring: "stored in CatalogCategory/CatalogItem (module_key='store')"). This is the same
dual-write-path pattern already flagged once before this session
(`project_reservation_and_staff_state_20260809` memory: "store.py/catalog_service.py dual-write-path
confirmed 2nd time — ADR/Review candidate") — a real, pre-existing, independently-recurring finding,
not new to this audit, but directly relevant to it: which tab a Products `CapabilityLink` should
deep-link to is genuinely ambiguous without resolving this first.

**Which tab is reachable depends on `hasReservations`, a real capability flag** (`buildNav()`,
`GenericAdminDashboard.jsx:169-196`) — `!hasReservations` tenants get `catalog` id (→ `CatalogTab.jsx`);
`hasReservations` tenants (mr-h, rk) get `store` id (→ `StoreTab.jsx`). Both real tenants tested
this session are `hasReservations`, so `store` is the real, live tab for both today.

### Q4 — What should the user select/edit from the Section Editor?

Genuinely unresolved, not just unbuilt. `featured_items`' pooling is automatic/capability-driven
(every active category's items, capped at `limit`) — there is no existing "which products appear"
curation UI for Services either (Services aren't curated, just capped) — so a Products
`CapabilityLink` would follow the exact same shape Phase 5 already built for Services: a deep-link
button next to the existing `heading_ar`/`limit` fields, not a new picker. The open question is
narrower than "what UI" — it's "which tab do we link to, given the dual-write-path above."

### Q5 — Orchestration only, new schema, or new capability?

**Orchestration only, in shape** — same `CapabilityLink` pattern as Phase 5, extended to be
`hasReservations`-aware (`store` vs `catalog` tab id) rather than hardcoded, which is a real,
legitimate capability-driven branch, not a `if slug === ...` violation. **Not executable cleanly
today** without first deciding whether the dual `store.py`/`catalog.py` write-path itself needs
resolving (per the already-open ADR/Review candidate) — building a Products `CapabilityLink` on
top of an already-flagged dual-write-path doesn't create a new problem, but doesn't fix the
standing one either, and picking which tab to link to is itself a small instance of that same
unresolved question.

---

## 2. Clients

### Q1 — Is it actually a Homepage Section?

**No — not a candidate at all.** Not in `SECTION_MAP`, no public-facing renderer of customer data
anywhere (correctly — customer data should never be public). This is a pure Dashboard-management
capability question, structurally unrelated to the Tenant OS Section Editor.

### Q2 — What is the current real source of truth?

**Split, and genuinely different per booking model:**
- Legacy `Property`/`Unit`/`Booking` tenants (smar-style): a real `Customer` model
  (`prisma/schema.prisma:313`, `clientId`+`phone`+`name`+`email`, unique per `(clientId, phone)`) —
  actively used (`app/services/customer_service.py`, `booking_service.py`, `whatsapp_flow.py`,
  `units.py`).
- `Reservation`-based tenants (`mr-h`, `rk` — the real Barber vertical this whole session's work
  concerns): **no separate Customer table at all.** `Reservation` stores `customerName`/
  `customerPhone`/`customerEmail` as plain inline strings (`prisma/schema.prisma:768-`, confirmed
  no FK to `Customer`). Customer identity for these tenants only exists as an aggregation *over*
  Reservation rows, not a real row of its own.

### Q3 — Does it already have real CRUD?

**Split by role, not by design.** STAFF role gets a real, working, **read-only** aggregation view:
`MyClientsTab.jsx` → `GET /reservations/my-clients` (confirmed real endpoint, staff-scoped —
`myclients`/`عملائي` in `STAFF_NAV`). TENANT_ADMIN gets **nothing** — `case 'customers':` in
`GenericAdminDashboard.jsx:575` renders `<ComingSoonTab label="العملاء" .../>`, a real, literal
placeholder. No tenant-wide (not staff-scoped) customer view exists for the actual account owner.

### Q4 — What should the user select/edit from the Section Editor?

**N/A — this question doesn't apply.** There is no Homepage Section for Clients to connect to; the
real gap here is a missing Capability (a tenant-wide Customers view for TENANT_ADMIN), not a
missing Section Editor integration.

### Q5 — Orchestration only, new schema, or new capability?

**New capability — and it's outside the Tenant OS Section Editor track entirely.** The real,
concrete gap is: extend the same aggregation pattern `GET /reservations/my-clients` already proves
works (real, live, staff-scoped) into a tenant-wide equivalent for TENANT_ADMIN, replacing
`ComingSoonTab`. This is a genuine, independent product gap — not a Section Editor question at
all, and not something this audit recommends folding into that track.

---

## 3. Notifications

### Q1 — Is it actually a Homepage Section?

**No, not conceptually close.** "Notifications"/"الإشعارات" (nav label) implies an admin-facing
view of system events or message history — never a public homepage concept under any
interpretation checked.

### Q2 — What is the current real source of truth?

**None exists.** No `Notification`/`NotificationLog`/equivalent Prisma model anywhere in
`prisma/schema.prisma` (confirmed via a full model listing, 39 real models, none named
Notification-anything). The only real "notification" code in the backend,
`app/services/whatsapp_notifications.py`, is a fire-and-forget **outbound** WhatsApp message
sender (booking confirmations *to customers*, e.g. `send_booking_confirmation`) — it sends and
logs to the application log only; nothing is persisted to a real table, so there is nothing for an
admin-facing tab to even read today.

### Q3 — Does it already have real CRUD?

**No.** `case 'notifications':` in `GenericAdminDashboard.jsx:577` renders the same
`<ComingSoonTab label="الإشعارات" .../>` placeholder. No frontend file matching `*notif*` exists
anywhere under `frontend/src` (confirmed via a real search).

### Q4 — What should the user select/edit from the Section Editor?

**N/A**, same reasoning as Clients — not a Homepage Section concept.

### Q5 — Orchestration only, new schema, or new capability?

**New capability, and the capability itself isn't even defined yet.** Before any Section Editor
question is answerable, a real product decision is needed: does "Notifications" mean a persisted
log of outbound WhatsApp sends (would need a new model + persistence added to
`whatsapp_notifications.py`'s fire-and-forget calls), in-app alerts for the admin (a different
capability entirely), or admin-configurable notification preferences (different again)? This is
the least-formed of the three — genuinely nothing real to orchestrate into yet.

---

## Cross-cutting Confirmed Findings

- Only **Products/Catalog** has any real relationship to a Homepage Section today (via pooling
  into `featured_items`/`categories_grid`) — Clients and Notifications are pure Dashboard-capability
  questions, unrelated to the Tenant OS Section Editor track by their own real, current shape.
- Products/Catalog's own dual-write-path (`store.py` vs `catalog.py` over one real
  `CatalogItem`/`CatalogCategory` model) is a **second, independent confirmation** of a pattern
  already named once before (`project_reservation_and_staff_state_20260809`) — per this project's
  own pattern-escalation rule (`architecture-review-loop.md`), a second independent finding is
  itself worth naming as an ADR/Review candidate, not just re-logging.
- Clients and Notifications share the same real shape: a STAFF-scoped or zero real capability
  exists today; the actual gap is a missing tenant-wide Capability, not a missing Section Editor
  integration.

## Side Findings (real, noticed along the way, not the point of this audit)

- `StoreCustomer` (Prisma model, `prisma/schema.prisma:653`) — named as dead code in prior memory
  (`project_reservation_and_staff_state_20260809`); not re-investigated this pass, only re-noticed
  as present in the same model listing gathered for the Clients question above.
- RK's real "Grooming Products" Store category (real, admin-created, currently empty) is itself
  evidence that the `store`/`catalog` dual-write-path is not merely theoretical — a real tenant is
  actively using the `store.py` side of it today.

## Unknowns

- Whether any tenant *other* than `mr-h`/`rk` currently relies on `categories_grid`/`offers` or on
  the legacy `Customer` model in a way this audit's two-tenant scope wouldn't surface — not
  checked, out of this audit's real scope (only the two real production tenants this whole
  session's work concerns).
- What "Notifications" is actually meant to become as a product — genuinely unknown, not
  inferable from any real code, named above as the actual blocking question rather than guessed.

## Recommendation (not a decision)

None of the three is ready to "enter the Tenant OS Section Editor" as currently understood:
Products/Catalog has a real but partial, latent-risk relationship to one existing section and a
standing dual-write-path question to resolve first; Clients and Notifications aren't Section
Editor questions at all — they're separate, real Capability gaps (one a missing tenant-wide view
over already-real data, one a not-yet-defined capability). Decision on how/whether to proceed with
each is Salman's, per this audit's own framing.
