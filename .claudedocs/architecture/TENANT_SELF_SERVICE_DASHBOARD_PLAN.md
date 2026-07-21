# TENANT_SELF_SERVICE_DASHBOARD_PLAN.md — Tenant Self-Service Dashboard: Architecture Plan

**Status:** Design only. No code, no UI design, no new API, no database migration — a strategic
architecture plan, per `.claude/rules/documentation-policy.md`. Follows the Service Execution
Constitution's "real project state is the source of truth" principle throughout: every claim
below about what exists was verified by reading the real files, not assumed.

**Revision note:** this plan's first draft used a two-way Content-vs-Structure split. Salman's
review correctly identified that this collapses two very different things into one "Structure"
bucket — untouchable platform engineering, and developer-owned-but-tenant-configurable template
design. This revision replaces that with an explicit three-layer model (§3) and adds two things
the first draft lacked entirely: a stated Dashboard First Principle (§3) and an explicit
"Content OS, not a Dashboard" identity (§6). Nothing else about the first draft's factual findings
changed — this is a structural correction, not a re-investigation.

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
  confused with §11's "AI assistant inside the tenant dashboard," which is a completely different,
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
  gap this plan names (§5) but does not close (no API design in this document).
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
That is the concrete cost this plan exists to remove. But the deeper reframing, stated plainly
because it changes what "done" means for every future feature: **from this point on, the project
is not building a Store — it is building the product every client will use to run their own
store.** That is a different job than shipping a beautiful Product Page. A Product Page that only
a developer can populate is not finished, no matter how it looks.

---

## 3. Design Principles

Four standing principles every future Content/Template/Platform decision gets measured against.
The first three were implicit in the first draft; the fourth was missing entirely and is added
here at Salman's explicit direction.

1. **Content vs Structure stays a real, enforced boundary** — never a hope, always a mechanism
   (see §4's three layers).
2. **Prefer existing capability over new infrastructure** — this plan builds on two real
   dashboards and a real Content-vs-Structure mechanism (§1), not a rewrite.
3. **The tenant never sees the platform's internals** — no PUT/PATCH/POST vocabulary, no schema
   language, ever (§8).
4. **Dashboard First Principle** (new, the standard this plan adds): every future feature, before
   it is considered finished, must answer one question — **"how will the client edit this a month
   from now, without a developer?"** If there is no answer, the feature is incomplete, regardless
   of how well it works or how good it looks.

   Concretely, for a new Hero: it is not enough that it renders. Before it ships, it must be clear
   where the client changes the image, the headline, the video, the button, and the Hero's order
   relative to other sections. For a new Product Page: the real test is never "is this page
   beautiful?" — it is **"can the client create a new product from the dashboard and have it
   appear on this exact page, with zero developer involvement?"** If yes, the architecture is
   correct. If no, the Product Page — however polished — is not actually done.

   This principle applies retroactively as a lens, not just prospectively: it is exactly the gap
   the Store Experience Review found in beit-al-fakhar (§2) — the Product Page itself passes this
   test today (real products created via the dashboard's `CatalogTab` do appear on it), but the
   generic numbered titles and the empty hero exist because *authoring good content* through that
   same real mechanism hasn't happened yet. The mechanism existing is necessary; it is not
   sufficient on its own without someone actually using it.

---

## 4. The Three Layers — Platform / Template / Content

This is the single most important structural correction in this revision, and every other section
is downstream of it. The first draft's "Structure" bucket conflated two things that must be kept
separate, because they have different owners and different rules for who may ever change them.

### Layer 1 — Platform (المنصة). Owned by the developer only. Never touched by any tenant, ever.

How the Store mechanism itself works; routing; checkout logic; WhatsApp integration; the (future)
AI layer; the overall architecture; performance; the database structure. This maps directly to
this project's existing 4-layer backend rule (`rules/backend/architecture.md`), the multi-tenancy
rule (`rules/global.md`), and the Service Execution Constitution. Nothing in this plan proposes any
tenant-facing surface for this layer — it doesn't exist in the dashboard at all, not even in
read-only form, except where the Platform's own behavior (e.g. `require_service()` gating) quietly
determines which Content-layer tools a tenant even sees.

### Layer 2 — Template (القالب). Owned by the developer by default; narrow, curated exceptions only.

The shape of the Product Page; the shape of the Checkout page; where sections are placed;
animation; card design. This is `CanvasPageEditor.jsx`'s `SECTION_TYPES` registry, the page
component tree, the Framer Motion presets in `rules/frontend/animations.md` — real Structure, in
the first draft's sense. The correction this revision makes explicit: **the Template layer is not
automatically drag-and-drop-everything from day one.** A tenant may be allowed to pick a theme, a
color, a font, or a bounded reordering of a small number of pre-defined slots — never arbitrary
layout freedom, never a new section type, never CSS access. Exactly which of those narrow
exceptions are granted (§9) is itself a Template-layer design decision the developer makes once
per Template, not something the tenant negotiates per-instance.

### Layer 3 — Content (المحتوى). Owned by the tenant, fully, forever, with zero technical knowledge required.

Everything Structure/Template was built to hold: Categories, Products, Images, Videos, Hero text,
About, Contact info, WhatsApp number, Social Media links, SEO metadata, Home section content, all
copy, all prices, product ordering, category ordering, publish/hide state for any item. This is
where the real dashboard — the **Content OS** (§6) — lives. §5 maps every one of these to a real
existing field; where none exists yet, it's marked as a Gap, not silently assumed.

### The layer test

For any future feature request, ask in order:

1. **Does answering "yes" require touching a `.py`/`.jsx` file that isn't a data value?** → Platform
   or Template. Stop — this needs a developer, and if it's a new domain capability it needs its own
   ADR/Implementation Contract per `documentation-policy.md`.
2. **Does it require picking from a developer-curated set of options (a theme, a font, a slot
   order) rather than writing free content?** → Template, and only if that specific exception was
   already designed into this Template (§9) — not created ad hoc per tenant request.
3. **Otherwise — is it a value (text, image, price, order, visibility) that a real field or model
   already holds, or reasonably could?** → Content. It belongs in the Content OS, full stop.

---

## 5. Content Ownership Matrix (per module, grounded in real fields)

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
| SEO metadata (title/description) | ⚠️ Gap | No real field found for this yet — not present in `Client` today |
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

## 6. Not a Dashboard — a Content OS

Salman's explicit framing, and a correction to the first draft's language: the deliverable is not
"an admin panel with fewer forms." It's a **Content OS** — the tenant should feel the way they feel
inside Notion, Shopify, or Framer (named here as the *felt experience* to aim for, not as products
to integrate with or copy pixel-for-pixel): direct manipulation of the real thing, not filling out
a form that describes the real thing somewhere else.

Concretely, the difference this framing demands:

- **Not**: a form with labeled fields — Product Name / Description / Image / Category — submitted
  to save.
- **Instead**: open the product itself. Click the name, it's editable in place, it saves. Drag a
  photo onto the image area, it uploads and appears. Drag a product up in the list, the order
  changes. Drop a video in, it plays. Every action is direct manipulation of the thing itself, not
  a proxy form describing it.

This project already has the real building blocks this identity needs (§1): `CanvasPageEditor.jsx`
already edits page sections in place rather than through a distant form; the shared upload flow
(`upload.py`, `useImageUpload.js`) already collapses upload into a single drop-target interaction.
The correction going forward is to make **inline-in-context editing the default posture for every
Content item**, not an occasional nicety — reserving a traditional form field only for the rare
Content item with no visual home at all (e.g., a payment-method toggle). Where §5's "gap" items
(reorder for `CatalogItem`/`CatalogCategory`) get closed by a future Implementation Contract, they
should be closed in this same direct-manipulation spirit (drag the card, not "edit sort_order in a
number field"), continuing the real pattern `GalleryImage`'s reorder endpoint already proves works.

---

## 7. Live Preview — architectural approach, not a UI design

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

## 8. "No API Thinking" — the principle, and how much of it is already true

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

## 9. Theme Editing — Template-layer boundaries, not a Theme Builder

Explicitly not a full Theme Builder, per the brief, and explicitly **not** everything-drag-and-drop
from day one, per §4's Template-layer correction. The boundary, using real existing fields:

| Editable (Content, tenant picks a value) | Real mechanism | Protected (Template, developer-owned) |
|---|---|---|
| Primary color | `Client.primary_color` | The color token *system* itself (GS MAR Glassmorphism tokens, spring physics presets in `rules/frontend/animations.md`) |
| Font | `Client.config.font` | Which fonts are available to choose from (a curated list, not open text entry) |
| Hero media (image/video) | `Client.hero_video_url` / `config.content.hero` | The Hero *section's* layout/animation code |
| Section order (of an already-fixed set) | `Client.config.content.sections[].order` | Which section *types* exist at all (`SECTION_TYPES` registry) |
| Section show/hide | A per-section `enabled`/visibility flag within `config.content` | Deleting a section type from the Template's vocabulary |

The line is exactly the Content-vs-Template boundary from §4, applied specifically to theming: the
tenant picks *values* from a developer-defined *menu* of tokens/sections — never free-form CSS,
never a new section type, never a new component, and never full layout freedom just because a
drag-and-drop interaction pattern exists elsewhere in the Content OS.

---

## 10. Service Contracts — "Client Self-Management" as a required section

**Disambiguation, stated explicitly because this codebase uses the word "Service" for two
different things**: `.claude/rules/service-execution-constitution.md`'s "Service" (`tenant-seeder`
and its siblings) is an autonomous execution agent with its own Contract template
(`SERVICE_CONTRACT_TEMPLATE.md`). `.claude/rules/backend/service-system.md`'s "Service" (`booking`,
`restaurant`, `store`, `gallery`, `whatsapp_ordering`, etc. — the `client_services` bridge table's
`serviceKey`) is a per-tenant feature flag. The brief's request for a "Client Self-Management"
section belongs to the **second** meaning — it's about what each *feature flag* lets a tenant
self-manage, not about execution agents.

**Recommendation**: extend `service-system.md`'s existing "Valid Service Keys" table (§2) with a
required three-way breakdown for every serviceKey, using exactly this plan's three-layer
vocabulary (§4):

```
serviceKey: store
  Client Self-Management (Content layer, no developer needed):
    - Categories, Products, prices, photos, ordering, visibility (§5 above)
  Requires Developer (Template/Platform layer, needs a code change):
    - New section types, new product-metadata shapes not yet in CatalogItem.metadata
  Template Architecture (Platform layer — never exposed to any dashboard, ever):
    - The CatalogItem/CatalogCategory schema itself, the 4-layer routing, require_service() gating
```

The Store/Restaurant/Booking breakdowns in §5 of this document are the first three real instances
of this table — future serviceKeys (`loyalty`, `analytics`, `ai_bot`, etc., currently 📋 Planned
per `service-system.md`) inherit the same three-way template the moment they're built, rather than
each needing this distinction re-derived from scratch.

---

## 11. Future AI Integration — where it plugs in, not how it works yet

Explicitly **not built now**, per the brief. The architectural placeholder this plan leaves:

- An AI assistant inside this dashboard must act **through the same Content-writing surface a
  human uses**, never a separate privileged codepath. "Create a new category" from a chat prompt
  must resolve to the exact same `CatalogCategory`-create action the "+ Add Category" button
  already triggers — never a shortcut that bypasses whatever validation/`require_service` gate
  protects that action normally.
- The trust boundary stays exactly where §8 already puts it for humans: the AI may **draft**
  changes (new copy, a reordered list, a suggested category) into the same `draft`/staged layer
  §7's Live Preview already needs to exist — the tenant still reviews in Live Preview and hits Save
  before anything goes live. This isn't a new concept invented for AI; it's the same Live-Preview
  staging mechanism §7 already requires for humans, reused.
- Concretely reserved, not designed: a chat-style panel surface within the dashboard shell, and a
  narrow, explicit action-vocabulary the assistant is allowed to call (the same vocabulary the
  manual UI already exposes — nothing more). No model choice, no prompt design, no new endpoint is
  decided here.

---

## 12. Architecture Boundaries — Generic / Tenant-specific / Plugin / Never

This table answers a different question than §4's three layers — §4 is about *who owns* a given
piece of content or design; this table is about *where the code that renders it lives*. The two
are orthogonal: e.g. Content-layer data can be rendered by Generic code (`CatalogItemCard.jsx`)
or by Tenant-specific code (beit-al-fakhar's `ProductPage.jsx`).

| Boundary | What it means here | Real example |
|---|---|---|
| **Generic** | Lives in shared frontend/backend code, used by every tenant identically | `CanvasPageEditor.jsx`'s `SECTION_TYPES`, `CatalogItemCard.jsx`, `upload.py`'s `FOLDER_MAP`, the dashboard shell itself once unified |
| **Tenant-specific** | Lives under a tenant's own `pages/{slug}/` folder, per `rules/frontend/scaffolding.md` | beit-al-fakhar's `ProductPage.jsx`/`CheckoutPage.jsx` — these are Template a developer built for one tenant's brief; a dashboard never touches these files, only the data they render |
| **Plugin** | A future serviceKey's self-contained editing surface, activated only when that `client_services` row is active — the same pattern `require_service()` already enforces at the API layer, extended to "which dashboard tab renders at all" | `ReservationsTab` already does exactly this today (`activeServices.includes('reservations')`) |
| **Never in the Dashboard** | Anything that is Platform or Template by §4's test, plus anything already explicitly owned by `SUPER_ADMIN_DASHBOARD_PLAN.md`/`TENANT_LIFECYCLE_PLAN.md` (billing, lifecycle state, cross-tenant data, service activation/deactivation itself — a tenant enabling their *own* new paid module is a billing/lifecycle decision, not a Content edit, and stays out of this dashboard's scope even though `client_services.py`'s activate/deactivate endpoints technically live under `/admin/`) | Tenant status, trial/expiry, service-key activation, anything cross-tenant |

**A real open decision this plan surfaces but does not resolve**: `GenericAdminDashboard.jsx`
gates tabs by `client_services`/`active_services`; `SmarAdminDashboard.jsx` gates tabs by JWT
role (`ROLE_TABS`). A single unified dashboard needs **one** answer, not both bolted together —
per the Abstraction Rule, this should be resolved by whichever future Implementation Contract
does the actual unification, informed by which of the two mechanisms both real cases can express
without loss (role-gating is a strict superset of what service-gating expresses, since a role can
be scoped per-service too, but this is a judgment call for that future contract, not this one).

---

## 13. Rollout Phases

Salman's explicit sequencing, adopted here as this plan's own gating structure — starting the
Client Journey Audit before the dashboard's own capability boundaries are written down would
produce a list of "this doesn't exist yet" rather than a real audit of a defined product:

- **Phase 1 — Fix the vision.** ✅ Done, this document: the three layers (§4), the Content OS
  identity (§6), the Dashboard First Principle (§3), the Content Ownership Matrix (§5), the Theme
  boundaries (§9).
- **Phase 2 — Write the contract.** This revision: treat the dashboard not as one large admin
  screen but as a set of independent capability domains, each with an explicit list of what it can
  do (§14), plus a single Capability Matrix stating who may invoke each capability — Client, AI, or
  Developer-only (§15).
- **Phase 3 — Client Journey Audit.** Deferred, explicitly gated on Phase 2 being written and
  reviewed (§16). Only once every step of the owner's journey maps to a named, bounded capability
  from §14 does walking that journey measure a real, defined product rather than "what's missing."

---

## 14. Dashboard Service Contracts (Phase 2)

**A fourth meaning of "Service" in this codebase, disambiguated on purpose**: §10 already
distinguishes the Service Execution Constitution's autonomous-agent "Service" from
`service-system.md`'s per-tenant feature-flag "Service" (`client_services.serviceKey`, e.g. the
real flag literally named `catalog`). What follows is a **third, different sense again** — a
**Dashboard Capability Domain**, Salman's proposed unit for organizing the Content OS itself
(Catalog, Category, Media, Theme, Content, Orders, Customers). To avoid a naming collision with
the real `catalog`/`store`/`restaurant` service **keys**, each domain below is written as
"`<Name>` Capability Domain," not "`<Name>` Service" — same grouping Salman asked for, a name that
doesn't collide with three already-overloaded uses of the word "Service" in this project.

Each domain lists its real capabilities, marked against what this investigation actually verified
(§1, §5, and fresh verification below) — not proposed features. **Gap** means the capability is a
real, intended piece of the Content layer (§4) that has no mechanism yet; it is not a suggestion to
build it now.

### Catalog Capability Domain (Products)

| Capability | Status | Mechanism |
|---|---|---|
| Create Product | ✅ Real | `CatalogItem` CRUD (`catalog.py`, `CatalogTab.jsx`) |
| Edit Product (name/description/price/currency) | ✅ Real | same |
| Delete Product | ✅ Real | same |
| Duplicate Product | ⚠️ Gap | No clone/duplicate endpoint found |
| Reorder Products | ⚠️ Gap | `sortOrder` field exists; no reorder endpoint (§5) |
| Archive / Hide Product | ✅ Real | `CatalogItem.isActive` |
| Publish / Unpublish | ✅ Real today, provisional | Currently equivalent to `isActive`; will become a distinct action once §7's draft/publish mechanism exists |
| Product-type extras (SKU, weight, variants) | ✅ Real | `CatalogItem.metadata` (`Json?`) |

### Category Capability Domain

| Capability | Status | Mechanism |
|---|---|---|
| Create / Rename Category | ✅ Real | `CatalogCategory` CRUD |
| Delete Category | ✅ Real | same |
| Reorder Categories | ⚠️ Gap | same gap as Product reorder |
| Show / Hide Category | ✅ Real | `CatalogCategory.isActive` |

### Media Capability Domain

| Capability | Status | Mechanism |
|---|---|---|
| Upload image/video into a specific context (hero, logo, product, unit gallery) | ✅ Real | `upload.py`'s `FOLDER_MAP`/`IMAGE_TYPE_MAP`, `useImageUpload.js` |
| Reorder unit gallery photos | ✅ Real (booking module only) | `PUT /gallery/{unit_id}/reorder` |
| Delete a unit gallery photo | ✅ Real | `DELETE /gallery/images/{id}` |
| Browse/reuse previously uploaded media across contexts (a real Media Library) | ⚠️ Gap, freshly verified | Confirmed by re-reading `gallery.py`/`upload.py` route lists directly: no client-wide "list my media" endpoint exists — every upload is bound to one context, nothing is browsable/reusable across contexts today |

### Theme Capability Domain

| Capability | Status | Mechanism |
|---|---|---|
| Change primary color | ✅ Real | `Client.primary_color` |
| Change font (from a curated list) | ✅ Real | `Client.config.font` |
| Change hero media | ✅ Real | `Client.hero_video_url` / `config.content.hero` |
| Reorder page sections (of an already-fixed set) | ✅ Real | `CanvasPageEditor.jsx` |
| Show/hide a section | ✅ Real | per-section visibility flag in `config.content` |
| Create a new section type / new layout | ❌ Never (Template/Platform) | Explicitly excluded, §9 |

### Content Capability Domain (page copy, distinct from Catalog's product data)

| Capability | Status | Mechanism |
|---|---|---|
| Edit Hero headline/subtitle/CTA text | ✅ Real | `config.content` hero section |
| Edit About/Story/Why-Us copy | ✅ Real | `config.content` story/testimonials sections |
| Edit WhatsApp number, social links, maps link | ✅ Real | `Client.whatsapp_number`/`instagram_url`/`maps_url` |
| Edit SEO metadata (title/description) | ⚠️ Gap | No real field found (§5) |

### Orders Capability Domain

| Capability | Status | Mechanism |
|---|---|---|
| View orders | ✅ Real | `GET /{moduleKey}/orders` (`OrdersTab.jsx`) |
| Update order status | ✅ Real | `PATCH /{moduleKey}/orders/{id}/status` |
| Create an order manually (phone order) | ✅ Real for Booking only; ⚠️ Gap for Store/Restaurant | Booking's `AdminBookingModal` does this (`POST /bookings/`); no equivalent found for Store/Restaurant orders |
| Export orders | ⚠️ Gap | Not found |
| Cancel / refund distinct from a status change | ⚠️ Gap | Only status-transition exists today; no distinct refund/reversal action |

### Customers Capability Domain

| Capability | Status | Mechanism |
|---|---|---|
| View customer list | ⚠️ Real code exists, but **not live** | `app/api/v1/admin/customers.py` defines full CRUD, but is never `include_router`'d in `app/api/v1/admin/__init__.py` — confirmed by reading that file's router list directly; this endpoint is unreachable today |
| Edit / delete a customer | ⚠️ Same as above | same file, same unmounted status |

**Side finding, flagged per this project's evidence discipline, not fixed here**: even setting the
unmounted status aside, `customers.py`'s own endpoints take `client_id` as a **query parameter**
with no `get_current_tenant`/`get_current_admin_user`/`require_service` dependency anywhere in the
file — unlike every other admin route this investigation read. If this file is ever wired back in,
it needs the same JWT-tenant-resolution and role/service gating every other admin route already
follows (`rules/backend/api-rules.md`'s mandatory dependency chain), not a client-supplied
`client_id` — a real, code-level finding, not a hypothetical risk, and explicitly not something
this design-only document fixes.

---

## 15. Capability Matrix — the golden reference

One table, all domains, answering exactly the question Salman posed: not "does this feature exist"
but "**who is allowed to invoke it**." The AI column is populated now, before any AI work begins,
precisely so that when a future assistant is added it inherits this boundary automatically instead
of needing its permissions re-litigated capability-by-capability.

**Legend**: ✅ allowed today · 🔜 intended for Client/AI once the Gap above is closed (still Content
layer, just not built) · ❌ deliberately excluded, Platform/Template-owned, not a roadmap item for
Client or AI regardless of future work. **Developer is omitted as its own column** — a developer
has code-level access to everything by construction, so marking it ✅ on every row would add no
information; the signal this matrix exists to carry is entirely in the Client/AI columns, and
those two columns are identical on every row below **by design** (§11's rule: the AI always
operates inside the Client's own ceiling, never above it).

| Capability | Client | AI |
|---|---|---|
| Create / Edit / Delete Product | ✅ | ✅ |
| Duplicate Product | 🔜 | 🔜 |
| Reorder Products / Categories | 🔜 | 🔜 |
| Archive / Publish Product | ✅ | ✅ |
| Create / Rename / Delete Category | ✅ | ✅ |
| Upload images/video (contextual) | ✅ | ✅ |
| Browse/reuse a shared Media Library | 🔜 | 🔜 |
| Change primary color / font (curated) | ✅ | ✅ |
| Reorder / show-hide page sections | ✅ | ✅ |
| **Create a new section type or layout** | ❌ | ❌ |
| **Change Checkout page layout** | ❌ | ❌ |
| Edit Hero/About/Contact copy | ✅ | ✅ |
| Edit SEO metadata | 🔜 | 🔜 |
| View / update order status | ✅ | ✅ |
| Export orders | 🔜 | 🔜 |
| View / edit customer info | 🔜 (blocked on §14's unmounted-route finding) | 🔜 |
| **Activate/deactivate a paid module (`client_services`)** | ❌ | ❌ |
| **Anything Platform-layer** (routing, checkout logic, WhatsApp integration, DB structure) | ❌ | ❌ |

This table is the artifact Salman asked for explicitly as a "golden reference": the day a Content
OS assistant is designed, its permission scope is "every ✅ row above, exactly, no more" — nothing
about AI trust needs to be re-decided at that point, only which ✅ rows to build a conversational
front-end for first.

---

## 16. Next Step — the Client Journey Audit (Phase 3, gated)

Salman's explicit direction: **not yet**. The Client Journey Audit — reviewing the store owner's
own onboarding-to-first-published-product journey, mirroring the role the Store Experience Review
played for the shopper's journey
(`.claudedocs/reviews/BEIT_AL_FAKHAR_STORE_EXPERIENCE_REVIEW.md`) — is real and still the right
Phase 3, but is explicitly **blocked on §14/§15 being written and reviewed first**. Starting the
audit before the capability domains were named would have produced a list of "this doesn't exist
yet," not a real audit of a defined product — exactly the risk Salman flagged.

**Scope, unchanged from the first draft, to be executed once Phase 2 is accepted**:

```
Create the store account → choose a Template → upload the logo → set brand colors →
create the first Category → create the first Product → upload its photos →
preview the live site → Publish
```

Each step now maps to a named capability from §14 (e.g. "create the first Product" = the Catalog
Capability Domain's `Create Product` row, already ✅ real) — so the audit, once run, will measure a
real, bounded product against a real, bounded contract, not a moving target.

**Success bar, unchanged**: a non-technical person completing this journey in **15-20 minutes** is
the standard every future Content OS addition is measured against, same as the Dashboard First
Principle (§3) measures every individual feature.

**Status**: not yet conducted, and explicitly not started in this revision — gated on Phase 2's
review, per Salman's direction.

---

## 17. What this plan deliberately does not do

- No new API endpoints designed (the `CatalogItem`/`CatalogCategory` reorder gap, the Media
  Library, the Live Preview draft/publish mechanism, and the future AI action-vocabulary are all
  named, not designed).
- No new Prisma models or migrations proposed — every Content item in §5/§14 maps to a field that
  already exists, except the Gaps explicitly marked as such.
- No UI components, wireframes, or visual design.
- No decision on unifying `GenericAdminDashboard.jsx` and `SmarAdminDashboard.jsx` into one
  codebase — that is a real Implementation Contract's job, informed by this plan's boundaries.
- No resolution of the `client_services`-vs-role tab-gating conflict named in §12.
- No cleanup of the orphaned `PageBuilderTab.jsx`, and no fix to `customers.py`'s unmounted status
  or its missing tenant-auth dependency (§14) — both flagged, neither fixed here; both are code
  changes outside this document's declared scope.
- No Client Journey Audit conducted — explicitly deferred to Phase 3 (§16), gated on this
  revision's §14/§15 being reviewed first, per Salman's direction.
