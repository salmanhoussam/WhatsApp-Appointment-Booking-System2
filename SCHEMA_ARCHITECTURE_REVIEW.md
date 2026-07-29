# Schema Architecture Review — 2026-07-29

Investigation only — no code changes, no fixes, no commits touching production code. Per Salman's
explicit Schema Contract Investigation request: 6 Checks (Ownership, Duplication, Schema Drift,
Enum Audit, Dead Schemas, Capability Boundaries) plus one closing reflective question. Six Explore
passes gathered the evidence below. This document's two highest-stakes claims (unregistered admin
routes, `public.py`'s permanent shadowing) were independently re-verified directly against
`app/api/v1/admin/__init__.py` and a real Python `importlib.util.find_spec` check before publishing.

**Trend, honestly**: every Capability below is marked `— (first measurement)`. This is the first
Schema Contract Investigation ever run on this platform — there is no prior Health score to compare
against, so no directional arrow is claimed anywhere in this document. Trend becomes real starting
from the *second* time this review runs.

## Platform Health

| Capability | Health | One-line reason |
|---|---|---|
| Content | ★★★★☆ (4/5) | Live chain (Hero/Story) fully clean; pulled down by one dead validator + one known, deliberately-deferred duplicate |
| Media | ★★★☆☆ (3/5) | One Operation (`hero.bg_image`) fully proven clean; the rest of Media's surface (gallery) has real, unresolved gaps |
| Catalog | ★★☆☆☆ (2/5) | Canonical Admin/Public pair is genuinely good; a parallel, non-canonical implementation sits right next to it, unresolved |
| Booking | ★★☆☆☆ (2/5) | The 2 real, live models (Booking, Reservation) are solid; more dead/unreachable schema surface was found here than anywhere else |
| Site Configuration | ★★★★☆ (4/5) | Recently and thoroughly cleaned up this same session (Sprint 3); one real but modest gap remains |
| Shared Contracts (enums/cross-cutting) | ★★☆☆☆ (2/5) | 2 of 5 enum categories are genuinely fragmented; a 3-instance anti-pattern confirmed across Capabilities |

---

## Content — Health ★★★★☆ (4/5) — Trend: — (first measurement)

**Findings**
1. ✅ Hero/Story's full data-flow chain (Route → Service → Repo → DB → Public → Frontend) traced
   end to end — no drift found. *(Appendix A1)*
2. ❌ `app/schemas/page_content.py`'s `SectionType`/`PageContent` Pydantic validator is fully dead —
   `parse_page_content()` has zero real callers anywhere. *(Appendix A2)*
3. ⚠️ `config.hero.title_ar/subtitle_ar/cta_ar` — a known, already-documented legacy duplicate of
   `content.sections[hero]`, explicitly deferred out of Sprint 3's scope by Salman's own prior
   decision, not a new finding. *(Appendix A3)*

## Media — Health ★★★☆☆ (3/5) — Trend: — (first measurement)

**Findings**
1. ✅ `hero.bg_image`'s full chain traced — no drift; one apparent field-name difference confirmed
   deliberate and documented in a code comment. *(Appendix B1)*
2. ✅ The old `hero_video_url` pipeline (retired this session, Sprint 3 Phase 2) — confirmed zero
   references anywhere in `app/` or `frontend/src/`. *(Appendix B2)*
3. ⚠️ Generic Upload and Booking's unit-gallery CRUD remain fully repo-direct — no Service layer at
   all (already a named Open Finding, re-confirmed still true). *(Appendix B3)*
4. ❌ **New**: two independent, parallel write paths create the same `GalleryImage` concept with
   *different* payload shapes (`upload.py`'s context vs. `gallery.py`'s own endpoint) — neither
   behind a shared service. *(Appendix B4)*

## Catalog — Health ★★☆☆☆ (2/5) — Trend: — (first measurement)

**Findings**
1. ✅ The canonical Admin/Public pair (`catalog.py` × 2) is well-aligned — Featured and Ordering
   both real and consistently named on both sides. *(Appendix C1)*
2. ❌ Restaurant's parallel, non-canonical routes bypass `catalog_service.py` entirely (already
   known, re-confirmed), have **no Featured concept at all**, and use `is_available` where
   canonical Catalog uses `is_active` for the identical field. *(Appendix C2)*
3. ❌ **New**: a legacy `Service` model (per-property add-ons) is structurally identical to
   `CatalogItem` but was never folded into the Phase-54 unification — undocumented anywhere.
   *(Appendix C3)*

## Booking — Health ★★☆☆☆ (2/5) — Trend: — (first measurement)

**Findings**
1. ✅ `Booking` (chalet/villa) and `Reservation` (time-slot) — both clean, both proven live today
   (smar, RK Barber respectively). *(Appendix D1)*
2. ❌ **New, most significant finding of this whole review**: `Unit` carries a second,
   undocumented Content storage location — `content_blocks`, `amenities`, `rules_policies`,
   `description_ar/en` — entirely outside `Client.config.content.sections[]`, the only place
   `content.md` documents as Content's real Ownership. Same shape as the already-named Hero
   fragmentation debt, never named before now. *(Appendix D2)*
3. ❌ **New**: an entire module, `app/api/v1/public.py`, is permanently unreachable — a same-named
   package (`app/api/v1/public/`) shadows it; confirmed directly via Python's own `find_spec`
   (`app.api.v1.public` resolves to the package, not the file). Every schema whose only consumer
   was `public.py` (`BookingBase`, `ServiceSelection`, `PublicBookingRequest`) is dead as a direct
   result. *(Appendix D3)*
4. ❌ **New**: 4 real admin route files exist but are never registered anywhere — confirmed
   directly against `admin/__init__.py`'s real import list: `customers.py`, `prices.py`,
   `booking_services.py`, `listings.py`. `listings.py` additionally imports classes that don't
   exist anywhere in the repo. *(Appendix D4)*
5. 💡 `Reservation`'s case-conversion (snake_case ↔ Prisma's camelCase) is hand-written twice, not
   a shared layer; its create-schema also lives outside `app/schemas/`, unlike every other
   Capability's pattern. *(Appendix D5)*

## Site Configuration — Health ★★★★☆ (4/5) — Trend: — (first measurement)

**Findings**
1. ✅ `ClientUpdate` — confirmed clean, matches `site-configuration.md`'s own documented scope
   exactly. *(Appendix E1)*
2. ✅ Broken Architecture (the old `client_service.py`/`settings.py` bypass) and the Hero Video
   pipeline — both resolved this same session, Sprint 3 Phases 2-3. *(Appendix E2)*
3. ⚠️ `SettingsUpdateRequest.config: Dict[str, Any]` is an unguarded passthrough into the same JSON
   blob Content owns — structurally possible to cross the boundary, not proven exploited.
   *(Appendix E3)*

## Shared Contracts (enums, cross-cutting patterns) — Health ★★☆☆☆ (2/5) — Trend: — (first measurement)

**Findings**
1. ❌ **Service-type taxonomy — the single most fragmented finding in this whole review**: 4
   independent lists that actively disagree today (`SERVICE_TYPE_MAP` in code, `service-system.md`'s
   doc table, `ACTIVATABLE_KEYS`, `registration_service.py`'s own mapping). This *reconfirms*, with
   much sharper precision, the already-logged `evolution/platform-services-catalog.md` finding from
   2026-07-27 — not a new discovery. *(Appendix F1)*
2. ❌ OperationType has no canonical list at all — 2 real values in code, 1 docs-only, 1 not even a
   named constant anywhere. *(Appendix F2)*
3. ⚠️ Module keys: `CatalogCategory.moduleKey` (4 values) vs. `PlatformService.moduleKey` (3
   values, missing `catalog`) — two different tables, same field name, drifted, undocumented
   whether intentional. *(Appendix F3)*
4. ✅ SectionType — one canonical source (`SECTION_MAP`), no drift found repo-wide across every
   real tenant's stored data. *(Appendix F4)*
5. ✅ Capability-name keys — clean 1:1 correspondence today, though only because just 2 of 8
   documented Capabilities have a frontend key so far. *(Appendix F5)*
6. ❌ **A 3-instance cross-cutting anti-pattern, now confirmed**: an admin route defining its own
   local schema instead of importing the real shared one — `client_service.py`/`ClientUpdate`
   (found earlier this session), `admin/units.py`'s own `UnitCreate`/`UnitUpdate`, and
   `admin/services.py`'s own `ServiceCreate`/`ServiceUpdate` (both found this pass). Same failure
   mode `evolution/capability-contracts.md` already tracks under a different shape (parallel write
   paths) — this is the schema-definition version of the identical pattern. *(Appendix F6)*

## Closing Reflective Question

*"If we were rebuilding the schemas from zero today, which ones would we keep exactly as they
are, and which ones would we redesign?"*

**Keep as-is**: Content's `content.sections[]` conceptual model — Media's `hero.bg_image` chain —
Catalog's `CatalogItem`/`CatalogCategory` Phase-54 unification (for the canonical route pair).

**Redesign or retire deliberately**: the dead admin CRUD scaffolding for Customer/Price/
BookingService/Listing (finish wiring or delete — currently neither) — `public.py` specifically,
once confirmed nothing depends on it — Unit's own `content_blocks` (should migrate into Content's
real model eventually) — the legacy `Service` model (retire in favor of `CatalogItem`) — the
Service-type taxonomy (single canonical source, already called for) — Reservation's ad hoc
case-conversion (fine today, formalize only once a second Capability needs the identical shape).

## Forward Reference (not executed now)

Salman's own next-phase idea, recorded here so it isn't lost: a persistent **Platform Health
Dashboard** — `Content`/`Media`/`Catalog`/`Booking`/`Site Configuration`/`Shared Contracts`, each
with `Current Health`/`Findings`/`Evolution`/`ADRs`/`Open Decisions`, replacing "read a whole report
every time" with "check a live view, drill in only when needed." Not built this session — his own
words frame it as "the only thing I'll ask for in the next phase," not part of this Contract.

---

## Appendix — Full Evidence

### A1 — Content/Hero data-flow trace
`Client.config` (`prisma/schema.prisma:33`, opaque `Json`) → `GET /{slug}/config`
(`app/api/v1/public/__init__.py:38-49`) → `public_service.get_tenant_config` →
`_record_to_dict` (`app/services/public_service.py:210-229`, passthrough of `config`, computes
`active_services` separately from the `ClientService` join) → `useTenantConfig.js` (passthrough,
adds derived `navItems`) → `DynamicPage.jsx` reads `tenantConfig.config?.content?.sections` (line
274-276), maps `type` → `SECTION_MAP` (lines 55-68), injects full `sectionProps = { slug, accent,
currency, config: tenantConfig, onAddToCart }` into every section (lines 285-291, 315-318) →
`HeroSection.jsx` destructures only `{ data, accent }` (line 14), reads `data.bg_image_url/
title_ar/subtitle_ar/cta_text_ar` — no reach into `config`, `slug`, `currency`, or
`onAddToCart` despite receiving all of them.

### A2 — `page_content.py` dead validator
`app/schemas/page_content.py`'s `SectionType`/`PageSection`/`PageContent`/`PageContentConfig`
classes; `parse_page_content()` (line 134) has zero callers anywhere in `app/` — only referenced
in its own docstring example.

### A3 — Hero Copy legacy duplicate
`config.hero.title_ar/subtitle_ar/cta_ar` — written by `SettingsTab.jsx`, read by
`ConfigurableHero.jsx:55-58,148-151` — vs. the real Content field
`config.content.sections[type=hero].data.title_ar`, edited via `/content/hero-title`. Documented in
`site-configuration.md`'s Known Boundary Debt; explicitly out of Sprint 3's scope per Salman's own
Decision 2.

### B1 — Media/hero.bg_image chain
`admin/media.py:24-25` (`HeroImageUpdate.image_url`) → `media_service.py:24-25`
(`replace_hero_image(client_id, image_url)`, called with `bg_image_url=image_url`) →
`content_sections_repo.py:35` (`update_section_field`, writes JSON key `bg_image_url`) → matches
`scripts/data/hr/page_content.json`'s real hero section key `bg_image_url` → `_record_to_dict`
passes `config` through untouched → `media.js:27-30`'s `apiField:'image_url'` vs.
`dataField:'bg_image_url'` difference is explicit and commented in the schema file itself — the one
rename hop is `media_service.py:25`, confirmed intentional.

### B2 — `hero_video_url` retirement
`grep -rn "hero_video_url" app/ frontend/src/` → zero matches, confirmed this pass. Retired in
Sprint 3 Phase 2 (`.claudedocs/reviews/site-configuration-phase2-verification.md`); DB column
deliberately left in place (no migration run).

### B3 — Gallery/Upload no Service layer
`app/api/v1/admin/gallery.py` imports `gallery_repo`/`storage_service` directly (lines 14-19),
calls them inline for list (`:58-65`), upload (`:68-99`), caption/active update (`:102-122`),
reorder (`:125-138`), delete (`:141-152`) — no service file at all.

### B4 — Two parallel GalleryImage write paths
`upload.py:118-126` (context `unit_gallery`: includes `caption_ar/en`, no `sort_order`/
`span_size`) vs. `gallery.py:91-98` (`POST /gallery/{unit_id}`: includes `sort_order`/`span_size`,
no captions) — same concept, two call sites, neither behind `media_service` or any gallery
service.

### C1 — Canonical Catalog Admin/Public alignment
Both `admin/catalog.py` and `public/catalog.py` route entirely through `catalog_service.py`.
Featured: admin `is_featured` (`catalog.py:41,53`) vs. public serializer
`"is_featured": item.isFeatured` (`catalog_service.py:32,64`) plus a dedicated public
`GET /featured` (`public/catalog.py:54-64`). Ordering: `sort_order`/`sortOrder` identical on both
sides (`catalog_service.py:44,79,162,227,269,315`).

### C2 — Restaurant's non-canonical divergence
`admin/restaurant.py:15-16`, `public/restaurant.py:13` call `admin_catalog_repo`/
`restaurant_admin_repo`/`restaurant_repo` directly, bypassing `catalog_service.py`. `grep -in
"featured"` on both files → zero matches (no Featured concept at all). `is_available`
(`admin/restaurant.py:46,181`, mapped from `isActive`) where canonical Catalog uses `is_active` for
the identical underlying field.

### C3 — Legacy `Service` model duplicates `CatalogItem`
`app/schemas/service.py`'s `Service*` classes (`name_ar/en`, `base_price`, `currency`,
`image_url`) — structurally identical to `CatalogItem` (`catalog.md:48`) but reference a
standalone `Service`/`BookingService` table, never folded into the Phase-54 Catalog unification.
No capability file names this seam.

### D1 — Booking/Reservation real, live, separate models
`Booking` (`prisma/schema.prisma:295-326`: `checkIn/checkOut/guests/totalPrice/...`, date-range) —
proven live for `smar`. `Reservation` (`prisma/schema.prisma:673-705`: `moduleKey/reservedAt/
durationMin/...`, time-slot) — proven live for `hr` under `moduleKey: "services"`
(`.claudedocs/reviews/rk-barber-reservations-calendar-verification.md`), with the restaurant shape
(`table_label`, `party_size`) already designed in `public/reservations.py:33`'s route docstring and
`reservation_service.py:84-109`'s conflict-check logic, unexercised by any live tenant yet.

### D2 — Unit's second Content storage location
`app/schemas/unit.py` + `app/api/v1/admin/units.py:58-60,100-102,181-183,243-248`:
`description_ar/en`, `content_blocks`, `amenities`, `rules_policies` — editorial/content-shaped
fields on the Booking-owned `Unit` model, written/read via `public_service.py:346-348` too —
entirely outside `Client.config.content.sections[]`.

### D3 — `public.py` permanently shadowed
`app/api/v1/public.py` (file) and `app/api/v1/public/` (package) coexist. `app/main.py:16`:
`from app.api.v1.public import router`. Independently verified via
`importlib.util.find_spec('app.api.v1.public')` → resolves to
`app/api/v1/public/__init__.py`, `submodule_search_locations` confirms it's the package — `public.py`
can never execute. Its only schemas (`BookingBase`, `ServiceSelection`, `PublicBookingRequest`,
`booking.py`) are dead as a direct consequence.

### D4 — 4 unregistered admin route files
`app/api/v1/admin/__init__.py:2` real import line: `properties, bookings, dashboard, units,
settings, team, services, gallery, restaurant, store, catalog, upload, reservations,
client_services, fleet, content, media` — independently re-verified by reading the file directly.
`customers.py`, `prices.py`, `booking_services.py`, `listings.py` are absent from this list, and
from every `router.include_router(...)` call below it. `admin/listings.py` additionally imports
`ListingCreate`, `ListingResponse`, `ListingRepository`, `ListingService` — none exist anywhere in
the repo; registering it as-is would raise `ImportError`.

### D5 — Reservation's ad hoc case-conversion
`ReservationIn` is defined locally in `app/api/v1/public/reservations.py:24-36` (not in
`app/schemas/`, unlike every other Capability's pattern). `reservation_service.py:111-121`
hand-builds a `create_data` dict (snake_case → Prisma camelCase); `_fmt()` (lines 25-39) hand-maps
the reverse direction — both complete and consistent today, neither using a shared alias-generator.

### E1 — `ClientUpdate` clean
`app/schemas/client.py:15-21`: `name, slug, phone, email, isActive, password` — matches
`site-configuration.md:89`'s own documented statement of this schema's narrow, correct scope
verbatim.

### E2 — Sprint 3 resolutions
`.claudedocs/reviews/site-configuration-phase2-verification.md`,
`.claudedocs/reviews/site-configuration-phase3-verification.md` — the old `client_service.py`
(dead) → `site_configuration_service.py` consolidation, and the Hero Video pipeline's full
retirement, both this session.

### E3 — `SettingsUpdateRequest.config` passthrough
`app/api/v1/admin/settings.py:39`: `config: Optional[Dict[str, Any]]`, merged directly into
`Client.config` — the same JSON blob holding `content.sections[]`. No Pydantic model stops a
caller from writing Content-owned keys through this route. Not proven exploited.

### F1 — Service-type taxonomy, 4 disagreeing lists
`app/core/services.py:24-30` `SERVICE_TYPE_MAP` (9 values: `booking, gallery, whatsapp_ordering,
restaurant, restaurant.menu, store, store.products, store.cart, catalog`) vs.
`.claude/rules/backend/service-system.md:28-36` (7 values, missing 4 real ones, adds 2 not in
code) vs. `app/api/v1/admin/client_services.py:36-43` `ACTIVATABLE_KEYS` (6 values) vs.
`registration_service.py:52`'s own per-business-type mapping (a 4th independent shape). Reconfirms
`evolution/platform-services-catalog.md` (2026-07-27).

### F2 — OperationType, no canonical list
`content.js:30,43` (`UpdateField` only), `media.js:25` (`ReplaceMedia` only). `TOS-002-editing
-engine.md:69-126` names `UpdateField`/`ReplaceMedia`/`ReorderList` (aspirational).
`capability-operations-model.md:26-29,39,52-56` adds `UpdateConfiguration` — zero real code
references anywhere in `frontend/src/tenant-os/`, confirmed by grep.

### F3 — Module-key drift across two tables
`prisma/schema.prisma:402` `CatalogCategory.moduleKey` comment: 4 values (`catalog|booking|
restaurant|store`) — matches frontend `MODULE_KEY_META` (`CatalogTab.jsx:78-83`) exactly.
`prisma/schema.prisma:377` `PlatformService.moduleKey` comment: 3 values, `catalog` absent.

### F4 — SectionType, clean
`DynamicPage.jsx:55-68` `SECTION_MAP`, 12 keys: `hero, story, featured_items, categories_grid,
gallery, location, cta, offers, testimonials, hours, video_story, story_experience`. All 12 appear
in real stored data repo-wide across tenant `page_content.json`/`page_templates/*.json` files — no
dead entries, no orphan stored types. The file's own comment (lines 48-53) documents a real
2026-07-20 incident where 3 types were silently dropped before being added — a fragile, hand-synced
contract, not currently broken.

### F5 — Capability-name keys, clean but young
`GenericAdminDashboard.jsx:262`: `SCHEMAS_BY_CAPABILITY = { content: contentSchema, media:
mediaSchema }` — 2 keys, both matching `content.md`/`media.md` exactly. 6 of 8 documented
Capabilities (`catalog, category, customers, orders, site-configuration, theme`) have no frontend
key yet — by design, not drift.

### F6 — 3-instance schema-shadowing anti-pattern
`client_service.py` (dead, built but never wired — earlier this session) / `admin/units.py:37,84`
(own local `UnitCreate`/`UnitUpdate` instead of `app/schemas/unit.py`'s) / `admin/services.py:20,31`
(own local `ServiceCreate`/`ServiceUpdate` instead of `app/schemas/service.py`'s) — three
independent instances of an admin route defining its own schema instead of importing the real
shared one.
