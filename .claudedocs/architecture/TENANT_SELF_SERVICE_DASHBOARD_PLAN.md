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

## 13. Next Step — the Client Journey Audit (recommended gate before implementation begins)

Salman's explicit recommendation for the single task that should happen before any implementation
starts, and this plan adopts it as the recommended gate — mirroring the role the Store Experience
Review played for Phase 3 (`.claudedocs/reviews/BEIT_AL_FAKHAR_STORE_EXPERIENCE_REVIEW.md`), but
for a different journey entirely: not the shopper's journey, the **store owner's** journey.

**Scope**: walk and document, step by step, real-account-to-first-published-product:

```
Create the store account → choose a Template → upload the logo → set brand colors →
create the first Category → create the first Product → upload its photos →
preview the live site → Publish
```

**Success bar, stated as a concrete, falsifiable number, not a vague "should feel easy"**: a
non-technical person should be able to complete this entire journey in **15-20 minutes**. If they
can, this is a real SaaS product a client runs themselves. If they can't, no amount of individual
feature polish changes that verdict — this number is the standard every future Content OS addition
should be measured against, the same way the Dashboard First Principle (§3) measures every single
feature.

**Status of this audit**: not yet conducted. This document recommends it as the immediate next
step, in the same real-CDP-walkthrough style already used for the Store Experience Review, but
does not execute it here — creating a real test tenant/account touches live registration flow and
real data, which is a deliberate action to take with explicit go-ahead, not a silent side-effect of
an architecture-planning document.

---

## 14. What this plan deliberately does not do

- No new API endpoints designed (the `CatalogItem`/`CatalogCategory` reorder gap, the Live Preview
  draft/publish mechanism, and the future AI action-vocabulary are all named, not designed).
- No new Prisma models or migrations proposed — every Content item in §5 maps to a field that
  already exists, except the SEO gap explicitly marked as such.
- No UI components, wireframes, or visual design.
- No decision on unifying `GenericAdminDashboard.jsx` and `SmarAdminDashboard.jsx` into one
  codebase — that is a real Implementation Contract's job, informed by this plan's boundaries.
- No resolution of the `client_services`-vs-role tab-gating conflict named in §12.
- No cleanup of the orphaned `PageBuilderTab.jsx` — flagged for a separate repository-hygiene pass.
- No Client Journey Audit conducted yet — recommended in §13 as the next real step, not performed
  in this document.
