# TENANT_SELF_SERVICE_DASHBOARD_PLAN.md — Tenant Self-Service Dashboard: Architecture Plan

**Status:** Design only. No code, no UI design, no new API, no database migration — a strategic
architecture plan, per `.claude/rules/documentation-policy.md`. Follows the Service Execution
Constitution's "real project state is the source of truth" principle throughout: every claim
below about what exists was verified by reading the real files, not assumed.

---

## 1. Positioning — how this relates to what already exists

This is **not** a green-field design. Two real, live admin dashboards already exist in this
codebase, and a real Content-vs-Structure content-authoring mechanism is already partially built
and in production use. This plan's job is to decide how they converge into one coherent tenant
product — not to invent a dashboard from nothing.

- **`SUPER_ADMIN_DASHBOARD_PLAN.md`** is the operator-facing mirror of this document — it governs
  Salman's own Operations Center (`/api/v1/super/*`, `require_super_admin` only). This document is
  the **tenant-facing** counterpart: what the *client* (a restaurant/store/booking owner) can do
  for themselves, not what Salman does to manage the platform. The two should never be confused;
  a feature belongs in one or the other, never both, and this document does not redefine anything
  `SUPER_ADMIN_DASHBOARD_PLAN.md` or `TENANT_LIFECYCLE_PLAN.md` already own (subscription/billing/
  lifecycle state stay exactly where those two docs put them).
- **`AI_OPERATIONS_PLATFORM_VISION.md`** is unrelated — an internal multi-agent orchestration
  vision for this project's own Claude Code tooling, not a tenant-facing feature. Not to be
  confused with §9's "AI assistant inside the tenant dashboard," which is a completely different,
  much smaller, tenant-facing idea.
- Two real dashboards already exist and are the starting evidence base for everything below:
  - `frontend/src/pages/generic-admin/GenericAdminDashboard.jsx` — genuinely tenant-agnostic,
    shared by every store/restaurant/catalog tenant (footlab, caracas, olivello, etc.). Derives its
    module (`restaurant`/`store`/`catalog`) at runtime from `config.active_services`, not from a
    hardcoded tenant check.
  - `frontend/src/pages/smar/admin/SmarAdminDashboard.jsx` — the booking module's own dashboard,
    older, tenant-specific, with a second, independent, **role-based** tab-gating layer
    (`useAdminRole.js`'s `ROLE_TABS`: `SUPER_ADMIN`/`TENANT_ADMIN` see everything,
    `MANAGER_RESERVATIONS`/`MANAGER_UNITS` see restricted subsets).
- A real Content-vs-Structure mechanism already exists and is populated for real tenants:
  `scripts/data/page_templates/{restaurant,store,booking}.json` define ordered section templates
  (`hero, story, gallery, featured_items, testimonials, hours, location, cta`, etc.); real tenants
  (`footlab`, `caracas`, `olivello`, and others) have their own populated
  `scripts/data/{slug}/page_content.json` seeded from those templates via
  `scripts/seed_page_content.py`, ultimately living in `Client.config.content` — edited today
  through `GenericAdminDashboard.jsx`'s `CanvasPageEditor.jsx` tab (a real, shipped, Canva-style
  3-panel section editor, not a mockup).
- A real reorder precedent exists: `PUT /gallery/{unit_id}/reorder` (`app/api/v1/admin/gallery.py`)
  takes `[{id, sort_order}]`. No equivalent exists yet for `CatalogItem`/`CatalogCategory` — a real
  gap this plan names (§4) but does not close (no API design in this document).
- One piece of real technical debt surfaced by this investigation, noted so it isn't silently
  duplicated: `frontend/src/pages/generic-admin/tabs/PageBuilderTab.jsx` is a ~1300-line
  near-duplicate of `CanvasPageEditor.jsx`, not imported anywhere — dead code, a `Superseded`
  repository-drift item per `.claude/rules/repository-hygiene.md`'s taxonomy, worth a cleanup
  commit separately from this plan.

---

## 2. What problem this plan actually solves

Beit Al Fakhar's Store Experience Review (`.claudedocs/reviews/BEIT_AL_FAKHAR_STORE_EXPERIENCE_
REVIEW.md`) closed with two real, named content gaps — generic numbered product titles, an
unfilled hero — that a developer would otherwise have to fix by hand, tenant by tenant, forever.
That is the concrete cost this plan exists to remove: the line between "a developer builds a
tenant's Template" and "the tenant runs their own store" has to be a real, enforced architecture
boundary, not a hope. Every section below answers one part of "where exactly is that line."

---

## 3. Content vs Structure — the boundary, defined once

This is the single most important distinction in this plan; every other section is downstream of
it.

- **Structure** = the Template. Which section *types* exist and what data shape each one expects
  (`CanvasPageEditor.jsx`'s `SECTION_TYPES` registry), the page's component tree, the layout
  engine, the routing, the 4-layer backend architecture, which Prisma models exist. **The tenant
  can never edit Structure.** Only a developer, through a real code change and (per
  `documentation-policy.md`) its own ADR/Implementation Contract if it's a new section type or
  domain change.
- **Content** = everything Structure was built to hold. Text, images, prices, ordering, visibility
  toggles, which pre-defined sections are turned on/off, which pre-defined theme tokens (color,
  font, hero media) are set. **The tenant owns Content fully**, without a developer, forever, for
  any tenant already scaffolded with a Template.
- **The mechanism that already enforces this split is real, not proposed**: every "Structure"
  concept (section types, their data shape) lives in code
  (`CanvasPageEditor.jsx`'s `SECTION_TYPES`/`DEFAULT_DATA`, `scripts/data/page_templates/*.json`'s
  section-type vocabulary); every "Content" value lives in data (`Client.config.content`,
  `CatalogItem`/`CatalogCategory` rows, `Unit.content_blocks`/`amenities`/`rules_policies`,
  `GalleryImage` rows). A tenant dashboard, no matter how it's rebuilt, must preserve exactly this
  split: it may only ever write to the data side, never to the code side. This is the same
  discipline `catalog-contract.md` already enforces for field *naming* (`catalogItemId` not
  `menuItemId`/`productId`), extended here to cover the content-authoring surface as a whole.
- A useful test for any future dashboard feature request: **"does saying yes require touching a
  `.jsx`/`.py` file, or only a database row?"** If the former, it's Structure and belongs to a
  developer (and probably a new section type in `SECTION_TYPES`, following the Abstraction Rule —
  extracted as a reusable section type only once two independent tenants prove they need the same
  shape, exactly as this project already does for everything else). If the latter, it's Content
  and belongs in this dashboard.

---

## 4. Content Ownership Matrix (per module, grounded in real fields)

Every row below maps to a real, already-existing field or model — no new schema is proposed here.
Where no real mechanism exists yet, it's marked **Gap** (a future Implementation Contract's job,
not this document's).

### Store (`store` / `catalog` service keys)

| Content item | Owned by tenant? | Real mechanism today |
|---|---|---|
| Store name, logo | ✅ | `Client.name_ar/name_en`, upload via `page_logo` context (`upload.py`) |
| Hero (image/video, headline) | ✅ | `Client.hero_video_url` + `Client.config.content` hero section (`CanvasPageEditor`) |
| About / Why Us copy | ✅ | `Client.config.content` `story`/`testimonials` sections |
| WhatsApp number | ✅ | `Client.whatsapp_number` (`PATCH /settings`) |
| Social links | ✅ | `Client.instagram_url`, `maps_url` |
| Categories (create/rename/reorder/hide) | ✅ (create/rename/hide today; reorder = **Gap**) | `CatalogCategory` CRUD (`catalog.py`); `sortOrder` field exists but no reorder endpoint yet |
| Products (create/edit/price/photos) | ✅ | `CatalogItem` CRUD + `useImageUpload` flow (`CatalogTab.jsx`) |
| Product order within category | ⚠️ Gap | `CatalogItem.sortOrder` field exists; no reorder endpoint (unlike `GalleryImage`'s real one) |
| Show/Hide product or category | ✅ | `CatalogItem.isActive` / `CatalogCategory.isActive` |
| Product-type-specific extras (SKU, weight, variants) | ✅ | `CatalogItem.metadata` (`Json?`) — already the established per-module extensibility field |

### Restaurant (`restaurant` service key)

Same `CatalogCategory`/`CatalogItem` mechanism as Store (post-Phase-54 unification, per
`.claude/rules/frontend/catalog-contract.md`) — Menu = Categories/Items with `moduleKey:
"restaurant"`. Ownership table is identical to Store's above; "Availability" (86'd / sold-out
items) maps to the same `isActive` toggle, not a separate concept.

### Booking (`booking` service key)

| Content item | Owned by tenant? | Real mechanism today |
|---|---|---|
| Units/villas/chalets (create/edit) | ✅ | `Unit` CRUD (`units.py`, `UnitFormModal.jsx`) |
| Unit content blocks (rich descriptive sections) | ✅ | `Unit.content_blocks` (`Json?`) — the Block Builder |
| Amenities | ✅ | `Unit.amenities` (`Json?`) |
| Rules/policies (check-in/out, cancellation) | ✅ | `Unit.rules_policies` (`Json?`) |
| Unit photos (upload/reorder/caption/hide) | ✅ | `GalleryImage` CRUD + the **real, already-working** `PUT /gallery/{unit_id}/reorder` |
| Add-on services (price, active toggle) | ✅ | `Service` CRUD (`services.py`, `ServicesTab.jsx`) |
| Staff/team | ✅ | `User`/team CRUD (`team.py`, `TeamTab.jsx`) |
| Availability/pricing calendar, block-dates | ✅ | `POST /units/{id}/block-dates`, `/date-overrides` |

**Reading across all three modules**: the ownership boundary is never "which module" — it's
always the same underlying pattern (a CRUD-able row + an `isActive` flag + a `sortOrder`/reorder
mechanism + a `Json?` extensibility field for anything module-specific). This is real, existing
evidence that a single unified dashboard shell is justified by the Abstraction Rule (two
independent real implementations — Store/Restaurant's `CatalogItem` pattern and Booking's `Unit`
pattern — already share this same stable shape), even though the two *current* dashboards
(`GenericAdminDashboard` vs `SmarAdminDashboard`) don't yet share one codebase.

---

## 5. Editing Philosophy — mapped onto real building blocks, not invented

The brief explicitly rejects a phpMyAdmin-style form dump. The good news, grounded in fact: this
project already has real, shipped, non-form-dump UI for most of this:

- **Drag & Drop / Reorder** — `CanvasPageEditor.jsx`'s section list already supports this for page
  sections; `PUT /gallery/{unit_id}/reorder` already supports it for unit photos. The **Gap** is
  narrow and specific: `CatalogItem`/`CatalogCategory` have no reorder endpoint yet. This plan's
  recommendation is to close that gap by extending the *same pattern* `gallery.py` already proved
  works (`[{id, sort_order}]` bulk-patch), not by inventing a new reorder mechanism — a future
  Implementation Contract's job, not this document's.
- **Inline Editing** — real precedent in `CanvasPageEditor.jsx`'s section-data editors (edit text
  directly where it will render, not in a separate form far from the preview).
- **Upload Images** — real, shared mechanism already exists: `upload.py`'s `FOLDER_MAP`/
  `IMAGE_TYPE_MAP` per `context`, and `useImageUpload.js` on the frontend. Every module already
  uses the same upload flow; a unified dashboard keeps using it as-is.
- **Live Preview** — see §6, its own section since the brief calls it out as a hard requirement.
- **Minimizing forms** — the real anti-pattern to avoid is what `admin-dashboard-builder`'s Form
  Input pattern currently defaults to (a plain labeled `<input>` grid). The unified dashboard
  should default every field to **inline-editable-in-context** (edit the price by clicking the
  price where it's shown in the live preview, not in a sidebar form) wherever the Content item has
  a natural visual home — reserving traditional forms only for content with no visual analogue
  (WhatsApp number, payment method toggle).

---

## 6. Live Preview — architectural approach, not a UI design

Requirement, not optional, per the brief. The architecturally sound approach, given what already
exists: **the preview must render using the exact same public-facing components a real customer
sees** — the same `CatalogPage.jsx`/`ProductPage.jsx`/tenant home components already built and
validated this session — not a second, parallel "preview renderer" that could drift from the real
page. This mirrors the exact lesson beit-al-fakhar's Product Page already proved: reuse
(`CatalogGrid`, `useGenericStore`) beats reimplementation. Concretely, at the architecture level
(no component design here): the dashboard's editing surface and the tenant's real public page
render from the **same content source** (`Client.config.content`, the same `CatalogItem` rows),
with the *only* difference being a `draft`/`live` distinction at the data layer (edits are staged,
not written straight to what the public page reads, until the tenant hits Save/Publish) — not two
different rendering codepaths. Whether that staging is a `draft_config` column, a separate
`is_published` flag, or something else is deliberately **not decided here** — it's real schema
work for a future Implementation Contract, gated by whichever module needs Live Preview first
proving the shape (Abstraction Rule).

---

## 7. "No API Thinking" — the principle, and how much of it is already true

The brief's requirement — a tenant "changes a photo / writes text / drags an item / hits Save,"
never sees PUT/PATCH/POST — is **already mostly real**, not aspirational: `SettingsTab.jsx`
already collapses an entire branding form into one `PATCH /settings` call the tenant never sees;
`CatalogTab.jsx`'s image-upload flow already hides the two-step upload-then-attach sequence behind
a single "choose photo" interaction. The architectural rule going forward is simply to hold this
line as new Content types are added: **every dashboard interaction maps to exactly one save
action from the tenant's point of view**, however many requests it takes underneath. This is a
constraint on future Implementation Contracts, not new design work — the pattern to keep
replicating already exists in two real files.

---

## 8. Theme Editing — boundaries, not a Theme Builder

Explicitly not a full Theme Builder, per the brief. The boundary, using real existing fields:

| Editable (Content) | Real mechanism | Protected (Structure) |
|---|---|---|
| Primary color | `Client.primary_color` | The color token *system* itself (GS MAR Glassmorphism tokens, spring physics presets in `rules/frontend/animations.md`) |
| Font | `Client.config.font` | Which fonts are available to choose from (a curated list, not open text entry) |
| Hero media (image/video) | `Client.hero_video_url` / `config.content.hero` | The Hero *section's* layout/animation code |
| Section order | `Client.config.content.sections[].order` | Which section *types* exist at all (`SECTION_TYPES` registry) |
| Section show/hide | A per-section `enabled`/visibility flag within `config.content` | Deleting a section type from the Template's vocabulary |

The line is exactly the Content-vs-Structure boundary from §3, applied specifically to theming:
the tenant picks *values* from a developer-defined *menu* of tokens/sections: never free-form CSS,
never a new section type, never a new component.

---

## 9. Service Contracts — "Client Self-Management" as a required section

**Disambiguation, stated explicitly because this codebase uses the word "Service" for two
different things**: `.claude/rules/service-execution-constitution.md`'s "Service" (`tenant-seeder`
and its siblings) is an autonomous execution agent with its own Contract template
(`SERVICE_CONTRACT_TEMPLATE.md`). `.claude/rules/backend/service-system.md`'s "Service" (`booking`,
`restaurant`, `store`, `gallery`, `whatsapp_ordering`, etc. — the `client_services` bridge table's
`serviceKey`) is a per-tenant feature flag. The brief's request for a "Client Self-Management"
section belongs to the **second** meaning — it's about what each *feature flag* lets a tenant
self-manage, not about execution agents.

**Recommendation**: extend `service-system.md`'s existing "Valid Service Keys" table (§2) with a
required three-way breakdown for every serviceKey, using exactly the vocabulary this plan already
established:

```
serviceKey: store
  Client Self-Management (Content, no developer needed):
    - Categories, Products, prices, photos, ordering, visibility (§4 above)
  Requires Developer (Structure, needs a code change):
    - New section types, new product-metadata shapes not yet in CatalogItem.metadata
  Template Architecture (never exposed to any dashboard, ever):
    - The CatalogItem/CatalogCategory schema itself, the 4-layer routing, require_service() gating
```

The Store/Restaurant/Booking breakdowns in §4 of this document are the first three real instances
of this table — future serviceKeys (`loyalty`, `analytics`, `ai_bot`, etc., currently 📋 Planned
per `service-system.md`) inherit the same three-way template the moment they're built, rather than
each needing this distinction re-derived from scratch.

---

## 10. Future AI Integration — where it plugs in, not how it works yet

Explicitly **not built now**, per the brief. The architectural placeholder this plan leaves:

- An AI assistant inside this dashboard must act **through the same Content-writing surface a
  human uses**, never a separate privileged codepath. "Create a new category" from a chat prompt
  must resolve to the exact same `CatalogCategory`-create action the "+ Add Category" button
  already triggers — never a shortcut that bypasses whatever validation/`require_service` gate
  protects that action normally.
- The trust boundary stays exactly where §7 already puts it for humans: the AI may **draft**
  changes (new copy, a reordered list, a suggested category) into the same `draft`/staged layer
  §6's Live Preview already needs to exist — the tenant still reviews in Live Preview and hits Save
  before anything goes live. This isn't a new concept invented for AI; it's the same Live-Preview
  staging mechanism §6 already requires for humans, reused.
- Concretely reserved, not designed: a chat-style panel surface within the dashboard shell, and a
  narrow, explicit action-vocabulary the assistant is allowed to call (the same vocabulary the
  manual UI already exposes — nothing more). No model choice, no prompt design, no new endpoint is
  decided here.

---

## 11. Architecture Boundaries — Generic / Tenant-specific / Plugin / Never

| Boundary | What it means here | Real example |
|---|---|---|
| **Generic** | Lives in shared frontend/backend code, used by every tenant identically | `CanvasPageEditor.jsx`'s `SECTION_TYPES`, `CatalogItemCard.jsx`, `upload.py`'s `FOLDER_MAP`, the dashboard shell itself once unified |
| **Tenant-specific** | Lives under a tenant's own `pages/{slug}/` folder, per `rules/frontend/scaffolding.md` | beit-al-fakhar's `ProductPage.jsx`/`CheckoutPage.jsx` — these are Structure a developer built for one tenant's brief; a dashboard never touches these files, only the data they render |
| **Plugin** | A future serviceKey's self-contained editing surface, activated only when that `client_services` row is active — the same pattern `require_service()` already enforces at the API layer, extended to "which dashboard tab renders at all" | `ReservationsTab` already does exactly this today (`activeServices.includes('reservations')`) |
| **Never in the Dashboard** | Anything that is Structure by §3's test, plus anything already explicitly owned by `SUPER_ADMIN_DASHBOARD_PLAN.md`/`TENANT_LIFECYCLE_PLAN.md` (billing, lifecycle state, cross-tenant data, service activation/deactivation itself — a tenant enabling their *own* new paid module is a billing/lifecycle decision, not a Content edit, and stays out of this dashboard's scope even though `client_services.py`'s activate/deactivate endpoints technically live under `/admin/`) | Tenant status, trial/expiry, service-key activation, anything cross-tenant |

**A real open decision this plan surfaces but does not resolve**: `GenericAdminDashboard.jsx`
gates tabs by `client_services`/`active_services`; `SmarAdminDashboard.jsx` gates tabs by JWT
role (`ROLE_TABS`). A single unified dashboard needs **one** answer, not both bolted together —
per the Abstraction Rule, this should be resolved by whichever future Implementation Contract
does the actual unification, informed by which of the two mechanisms both real cases can express
without loss (role-gating is a strict superset of what service-gating expresses, since a role can
be scoped per-service too, but this is a judgment call for that future contract, not this one).

---

## 12. What this plan deliberately does not do

- No new API endpoints designed (the `CatalogItem`/`CatalogCategory` reorder gap, the Live Preview
  draft/publish mechanism, and the future AI action-vocabulary are all named, not designed).
- No new Prisma models or migrations proposed — every Content item in §4 maps to a field that
  already exists.
- No UI components, wireframes, or visual design.
- No decision on unifying `GenericAdminDashboard.jsx` and `SmarAdminDashboard.jsx` into one
  codebase — that is a real Implementation Contract's job, informed by this plan's boundaries.
- No resolution of the `client_services`-vs-role tab-gating conflict named in §11.
- No cleanup of the orphaned `PageBuilderTab.jsx` — flagged for a separate repository-hygiene pass.
