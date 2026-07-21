# TENANT_OS_PLAN.md — Tenant Operating System: Architecture Plan

**Status:** Design only. No code, no UI design, no new API, no database migration — a strategic
architecture plan, per `.claude/rules/documentation-policy.md`. Follows the Service Execution
Constitution's "real project state is the source of truth" principle throughout: every claim
below about what exists was verified by reading the real files, not assumed.

**Revision note (this pass)**: Salman added three missing pieces — a **Capability Lifecycle**
(§13: the stages every Capability moves through, Idea → Contract → Implementation → Interface →
Governance → AI Access → Review), a **Capability Maturity** table (§18: not every Capability is
equally done, and saying "X exists" without a maturity label is misleading), and **Capability
Acceptance Criteria** (§19: a 9-item checklist that turns "finished" into a real, computed
percentage — worked honestly for Catalog, this project's most built-out Capability, it comes out
to roughly 50%, not "done"). He also elevated Design Principle 5 — "One Capability. One Contract.
One Service. One Source of Truth. Many Interfaces." — to a platform-wide rule in
`rules/backend/architecture.md` §9, since it applies to Booking/Restaurant/Store/AI/any future
Plugin, not just this document's domain; §3 below now references that rule rather than owning the
text. Finally, his closing review verdict reframed the Rollout Phases (§20): this document is
ready to be formally **adopted as Reference Architecture** before implementation begins, and the
Client Journey Audit only happens after a first real batch of Capabilities is built against it —
not immediately after this document is reviewed.

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
  gap this plan names (§6) but does not close (no API design in this document).

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

Five standing principles every future Content/Template/Platform decision gets measured against.

1. **Content vs Structure stays a real, enforced boundary** — never a hope, always a mechanism
   (see §4's three layers).
2. **Prefer existing capability over new infrastructure** — this plan builds on two real
   dashboards and a real Content-vs-Structure mechanism (§1), not a rewrite.
3. **The tenant never sees the platform's internals** — no PUT/PATCH/POST vocabulary, no schema
   language, ever (§9).
4. **Dashboard First Principle**: every future feature, before it is considered finished, must
   answer one question — **"how will the client edit this a month from now, without a
   developer?"** If there is no answer, the feature is incomplete, regardless of how well it works
   or how good it looks.

   Concretely, for a new Hero: it is not enough that it renders. Before it ships, it must be clear
   where the client changes the image, the headline, the video, the button, and the Hero's order
   relative to other sections. For a new Product Page: the real test is never "is this page
   beautiful?" — it is **"can the client create a new product from the dashboard and have it
   appear on this exact page, with zero developer involvement?"** If yes, the architecture is
   correct. If no, the Product Page — however polished — is not actually done.

   The name "how will the client edit this" no longer implicitly means "...from the Dashboard." It
   means "...from *any* Capability consumer" — the Dashboard today, an AI assistant or the public
   API tomorrow. A feature whose only answer is "there's a button in the Dashboard" has coupled a
   Capability to one Interface, which §5 says not to do.

5. **One Capability. One Contract. One Service. One Source of Truth. Many Interfaces.** — this
   line is **no longer owned by this document**. Salman elevated it to a platform-wide rule,
   since it applies equally to Booking, Restaurant, Store/Catalog, AI, and any future Plugin, not
   just to the Tenant OS's own scope. Its canonical home is now
   `.claude/rules/backend/architecture.md` §9 — restated here only for local context; if the two
   ever seem to disagree, the rule file wins. §14's Single Source of Truth Matrix and §17's
   Architecture Integrity Findings are this document's own act of *applying* that platform-wide
   rule to the Tenant OS's specific Capabilities — not a second copy of the rule itself.

---

## 4. The Three Layers — Platform / Template / Content

This is a different three-part model than §5's Capability/Interface/Governance anatomy — the two
are not competing descriptions of the same thing and shouldn't be read as such. This section
answers **"who owns a given piece of data or design"** (a Content-ownership question); §5 answers
**"how is the system itself organized internally"** (a system-anatomy question). The same Content
item (say, a Product's price) is simultaneously Content-layer-owned (§4, the tenant may edit it)
and reached through the Catalog Capability (§5, via its one Contract/Service/Repository chain) —
the two axes are orthogonal, not redundant.

### Layer 1 — Platform (المنصة). Owned by the developer only. Never touched by any tenant, ever.

How the Store mechanism itself works; routing; checkout logic; WhatsApp integration; the (future)
AI layer; the overall architecture; performance; the database structure. This maps directly to
this project's existing 4-layer backend rule (`rules/backend/architecture.md`), the multi-tenancy
rule (`rules/global.md`), and the Service Execution Constitution. Nothing in this plan proposes any
tenant-facing surface for this layer — it doesn't exist in any interface at all, not even in
read-only form, except where the Platform's own behavior (e.g. `require_service()` gating) quietly
determines which Content-layer Capabilities a tenant even sees.

### Layer 2 — Template (القالب). Owned by the developer by default; narrow, curated exceptions only.

The shape of the Product Page; the shape of the Checkout page; where sections are placed;
animation; card design. This is `CanvasPageEditor.jsx`'s `SECTION_TYPES` registry, the page
component tree, the Framer Motion presets in `rules/frontend/animations.md` — real Structure. The
Template layer is not automatically drag-and-drop-everything from day one. A tenant may be allowed
to pick a theme, a color, a font, or a bounded reordering of a small number of pre-defined slots —
never arbitrary layout freedom, never a new section type, never CSS access. Exactly which of those
narrow exceptions are granted (§10) is itself a Template-layer design decision the developer makes
once per Template, not something the tenant negotiates per-instance.

### Layer 3 — Content (المحتوى). Owned by the tenant, fully, forever, with zero technical knowledge required.

Everything Structure/Template was built to hold: Categories, Products, Images, Videos, Hero text,
About, Contact info, WhatsApp number, Social Media links, SEO metadata, Home section content, all
copy, all prices, product ordering, category ordering, publish/hide state for any item, and the
broader Site Configuration surface (§12). §6 maps every one of these to a real existing field;
where none exists yet, it's marked as a Gap, not silently assumed.

### The layer test

For any future feature request, ask in order:

1. **Does answering "yes" require touching a `.py`/`.jsx` file that isn't a data value?** → Platform
   or Template. Stop — this needs a developer, and if it's a new domain capability it needs its own
   ADR/Implementation Contract per `documentation-policy.md`.
2. **Does it require picking from a developer-curated set of options (a theme, a font, a slot
   order) rather than writing free content?** → Template, and only if that specific exception was
   already designed into this Template (§10) — not created ad hoc per tenant request.
3. **Otherwise — is it a value (text, image, price, order, visibility) that a real field or model
   already holds, or reasonably could?** → Content. It belongs in the Tenant OS, full stop.

---

## 5. Tenant OS Anatomy — Capability / Interface / Governance

**Capability is not the top of the system — it's one of three siblings.** The shape:

```
Tenant OS
  │
  ├── Capability
  │      ├── Contract        (§12 — what the capability can do)
  │      ├── Service          (the one canonical write path, §14)
  │      ├── Repository       (Prisma queries only, no logic)
  │      └── Database         (the real Prisma model — the actual source of truth)
  │      [ one branch per domain: Catalog, Category, Media, Site Configuration,
  │        Content, Orders, Customers — see §12 ]
  │
  ├── Interface
  │      ├── Dashboard   — real, two implementations exist today (§1, §7)
  │      ├── AI           — reserved, not built (§11)
  │      ├── Mobile       — not built, a real Gap, not designed here
  │      └── API          — a *tenant-authoring* API (distinct from the existing
  │                         shopper-facing `/api/v1/public/*`, which already exists
  │                         but serves customers, not tenants managing their own
  │                         data) — not built, a real Gap, not designed here
  │
  └── Governance
         ├── Permissions    — who may invoke a Capability (§15's Capability Matrix)
         ├── Draft/Publish  — staged edits before going live (§8's Live Preview)
         ├── Audit          — who changed what, when (real Gap, §16)
         ├── Versioning     — content history / undo (real Gap, §16)
         └── Activity       — a human-readable feed of recent changes (real Gap, §16)
```

**Why this correction matters, concretely**: Draft/Publish, Audit, Versioning, and Activity are
not properties of any one Capability. Catalog does not get its own separate audit log; Content does
not get its own separate draft/publish mechanism. These are cross-cutting concerns, built **once**
at the Governance layer, and every Capability inherits them automatically. §16 is where this is
made concrete.

**What this means for the rest of the document**: every section from here on is one of three
things — Capability content (§6, §12, §13, §14), Interface content (§7, §11), or Governance
content (§8, §15, §16). None of them is "the top level" of anything; all three are children of the
same Tenant OS, exactly as drawn above.

---

## 6. Content Ownership Matrix (per module, grounded in real fields)

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
evidence that a single unified Tenant OS is justified by the Abstraction Rule (two independent real
implementations — Store/Restaurant's `CatalogItem` pattern and Booking's `Unit` pattern — already
share this same stable shape), even though the two *current* dashboards (`GenericAdminDashboard` vs
`SmarAdminDashboard`) don't yet share one codebase.

---

## 7. Interface Design Philosophy — Direct Manipulation, Not Forms

This section is about how the **Dashboard interface specifically** should feel — one of four
Interface siblings (§5); an AI Chat interface or a future Mobile app will have their own natural
interaction modes over the same Capabilities, not this one's.

Salman's explicit framing: the deliverable is not "an admin panel with fewer forms." The Dashboard
should feel the way Notion, Shopify, or Framer feel (named here as the *felt experience* to aim
for, not as products to integrate with or copy pixel-for-pixel): direct manipulation of the real
thing, not filling out a form that describes the real thing somewhere else.

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
Content item with no visual home at all (e.g., a payment-method toggle). Where §6's "gap" items
(reorder for `CatalogItem`/`CatalogCategory`) get closed by a future Implementation Contract, they
should be closed in this same direct-manipulation spirit (drag the card, not "edit sort_order in a
number field"), continuing the real pattern `GalleryImage`'s reorder endpoint already proves works.

---

## 8. Live Preview — the Governance layer's Draft/Publish mechanism

Requirement, not optional, per the brief, and — per §5's anatomy — this is the **Draft/Publish**
piece of the Governance layer, not a Catalog-specific or Content-specific feature. Built once here,
every Capability inherits it identically; no Capability designs its own.

The architecturally sound approach, given what already exists: **the preview must render using the
exact same public-facing components a real customer sees** — the same `CatalogPage.jsx`/
`ProductPage.jsx`/tenant home components already built and validated this session — not a second,
parallel "preview renderer" that could drift from the real page. This mirrors the exact lesson
beit-al-fakhar's Product Page already proved: reuse (`CatalogGrid`, `useGenericStore`) beats
reimplementation. Concretely, at the architecture level (no component design here): the dashboard's
editing surface and the tenant's real public page render from the **same content source**
(`Client.config.content`, the same `CatalogItem` rows), with the *only* difference being a
`draft`/`live` distinction at the data layer (edits are staged, not written straight to what the
public page reads, until the tenant hits Save/Publish) — not two different rendering codepaths.
Whether that staging is a `draft_config` column, a separate `is_published` flag, or something else
is deliberately **not decided here** — it's real schema work for a future Implementation Contract,
gated by whichever Capability needs Live Preview first proving the shape (Abstraction Rule).

---

## 9. "No API Thinking" — the principle, and how much of it is already true

The brief's requirement — a tenant "changes a photo / writes text / drags an item / hits Save,"
never sees PUT/PATCH/POST — is **already mostly real**, not aspirational: `SettingsTab.jsx`
already collapses an entire branding form into one `PATCH /settings` call the tenant never sees;
`CatalogTab.jsx`'s image-upload flow already hides the two-step upload-then-attach sequence behind
a single "choose photo" interaction. The architectural rule going forward is simply to hold this
line as new Content types are added: **every interface interaction maps to exactly one save action
from the tenant's point of view**, however many requests it takes underneath, and regardless of
which Interface (Dashboard, AI, Mobile) originated it. This is a constraint on future
Implementation Contracts, not new design work — the pattern to keep replicating already exists in
two real files.

---

## 10. Theme Editing — Template-layer boundaries, not a Theme Builder

Explicitly not a full Theme Builder, per the brief, and explicitly **not** everything-drag-and-drop
from day one, per §4's Template-layer correction. Note this section is deliberately narrower than
§12's Site Configuration Capability — Theme is specifically the *visual* tokens; Site Configuration
is everything else about how the tenant's business itself is set up. The boundary, using real
existing fields:

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
drag-and-drop interaction pattern exists elsewhere in the Tenant OS.

---

## 11. Future AI Integration — where it plugs in, not how it works yet

Explicitly **not built now**, per the brief. AI is an **Interface** sibling (§5), not a Capability —
the architectural placeholder this plan leaves:

- An AI assistant is simply **another Interface onto the Tenant OS's Capabilities** (§5) — it must
  act **through the same Capability a human uses**, never a separate privileged codepath. "Create a
  new category" from a chat prompt must resolve to the exact same Category Capability the "+ Add
  Category" button already triggers — never a shortcut that bypasses whatever validation/
  `require_service` gate protects that Capability normally.
- The trust boundary stays exactly where §9 already puts it for humans: the AI may **draft**
  changes (new copy, a reordered list, a suggested category) into the same Governance-layer
  Draft/Publish mechanism (§8) — the tenant still reviews in Live Preview and hits Save before
  anything goes live. This isn't a new concept invented for AI; it's the same staging mechanism §8
  already requires for humans, reused.
- Its permission ceiling is not a new decision — it's §15's Capability Matrix (Governance:
  Permissions), read directly: the AI may invoke exactly the Capabilities marked ✅ for AI there,
  no more, no negotiation per feature.
- Concretely reserved, not designed: a chat-style Interface surface, and a narrow, explicit
  action-vocabulary the assistant is allowed to call (the same vocabulary every other Interface
  already exposes — nothing more). No model choice, no prompt design, no new endpoint is decided
  here.

---

## 12. Capability Contracts (Phase 2)

**A third meaning of "Service"/"Capability" in this codebase, disambiguated on purpose**: this
project already uses "Service" for two different things — the Service Execution Constitution's
autonomous-agent "Service" (`tenant-seeder` and its siblings, `.claude/rules/service-execution-
constitution.md`), and `service-system.md`'s per-tenant feature-flag "Service"
(`client_services.serviceKey`, e.g. the real flag literally named `catalog`). What follows is a
**third, different sense again** — a **Tenant OS Capability** (§5): a named, interface-agnostic
unit of what a tenant can do (Catalog, Category, Media, Site Configuration, Content, Orders,
Customers). Deliberately not called a "Service" at all — that word is reserved for the one
canonical write-path module each Capability owns internally (§5's tree: Contract → **Service** →
Repository → Database).

Each Capability lists its real sub-capabilities, marked against what this investigation actually
verified — not proposed features. **Gap** means the sub-capability is a real, intended piece of the
Content layer (§4) that has no mechanism yet; it is not a suggestion to build it now.

### Catalog Capability (Products)

| Sub-capability | Status | Mechanism |
|---|---|---|
| Create Product | ✅ Real | `CatalogItem` CRUD (`catalog.py`, `CatalogTab.jsx`) |
| Edit Product (name/description/price/currency) | ✅ Real | same |
| Delete Product | ✅ Real | same |
| Duplicate Product | ⚠️ Gap | No clone/duplicate endpoint found |
| Reorder Products | ⚠️ Gap | `sortOrder` field exists; no reorder endpoint (§6) |
| Archive / Hide Product | ✅ Real | `CatalogItem.isActive` |
| Publish / Unpublish | ✅ Real today, provisional | Currently equivalent to `isActive`; will become a distinct action once §8's draft/publish mechanism exists |
| Product-type extras (SKU, weight, variants) | ✅ Real | `CatalogItem.metadata` (`Json?`) |

### Category Capability

| Sub-capability | Status | Mechanism |
|---|---|---|
| Create / Rename Category | ✅ Real | `CatalogCategory` CRUD |
| Delete Category | ✅ Real | same |
| Reorder Categories | ⚠️ Gap | same gap as Product reorder |
| Show / Hide Category | ✅ Real | `CatalogCategory.isActive` |

### Media Capability

| Sub-capability | Status | Mechanism |
|---|---|---|
| Upload image/video into a specific context (hero, logo, product, unit gallery) | ✅ Real | `upload.py`'s `FOLDER_MAP`/`IMAGE_TYPE_MAP`, `useImageUpload.js` |
| Reorder unit gallery photos | ✅ Real (booking module only) | `PUT /gallery/{unit_id}/reorder` |
| Delete a unit gallery photo | ✅ Real | `DELETE /gallery/images/{id}` |
| Browse/reuse previously uploaded media across contexts (a real Media Library) | ⚠️ Gap | No client-wide "list my media" endpoint exists — every upload is bound to one context, nothing is browsable/reusable across contexts today |

### Site Configuration Capability (broader than Theme)

Salman's explicit addition: not Theme (§10, narrowly visual), but everything about how the
tenant's business itself is configured.

| Sub-capability | Status | Mechanism |
|---|---|---|
| Brand name | ✅ Real | `Client.name_ar/name_en` |
| Logo | ✅ Real | `page_logo` upload context |
| WhatsApp number | ✅ Real | `Client.whatsapp_number` |
| Email | ✅ Real | `Client.email` |
| Social links | ⚠️ Real but narrow | `Client.instagram_url`, `maps_url` only — not a generic social-links list |
| Currency | ✅ Real | `Client.currency` |
| Business hours | ⚠️ Real where the Template includes it | The `hours` section type exists in `page_templates` (confirmed for booking's template; presence in store/restaurant templates not independently verified in this pass) |
| Languages supported | ⚠️ Gap | No real field found |
| Custom domain | ⚠️ Gap | No real field found — tenants are subdomain/slug-routed today |
| Timezone | ⚠️ Gap | No real field found |
| Tax settings | ⚠️ Gap | No real field found |
| Delivery zones/fees | ⚠️ Gap, already on the roadmap | `service-system.md` already lists `delivery_zones` as a 📋 Planned serviceKey — this Capability's Gap and that Planned service are the same future work, not two separate ideas |
| SEO metadata | ⚠️ Gap | Same Gap already named under the Content Capability below — not duplicated, just reachable from both |
| Analytics | ⚠️ Gap, already on the roadmap | `service-system.md` already lists `analytics` as a 📋 Planned serviceKey — same cross-reference as Delivery |
| Integrations (payment gateways, WhatsApp Business API, etc.) | ⚠️ Gap | No real mechanism found; generic placeholder for future work, not a specific commitment |

### Content Capability (page copy, distinct from Catalog's product data)

| Sub-capability | Status | Mechanism |
|---|---|---|
| Edit Hero headline/subtitle/CTA text | ✅ Real | `config.content` hero section |
| Edit About/Story/Why-Us copy | ✅ Real | `config.content` story/testimonials sections |
| Edit SEO metadata (title/description) | ⚠️ Gap | No real field found (§6) |

### Orders Capability

| Sub-capability | Status | Mechanism |
|---|---|---|
| View orders | ✅ Real | `GET /{moduleKey}/orders` (`OrdersTab.jsx`) |
| Update order status | ✅ Real | `PATCH /{moduleKey}/orders/{id}/status` |
| Create an order manually (phone order) | ✅ Real for Booking only; ⚠️ Gap for Store/Restaurant | Booking's `AdminBookingModal` does this (`POST /bookings/`); no equivalent found for Store/Restaurant orders |
| Export orders | ⚠️ Gap | Not found |
| Cancel / refund distinct from a status change | ⚠️ Gap | Only status-transition exists today; no distinct refund/reversal action |

### Customers Capability

| Sub-capability | Status | Mechanism |
|---|---|---|
| View customer list | ⚠️ Real code exists, but **not live** | `app/api/v1/admin/customers.py` defines full CRUD, but is never `include_router`'d in `app/api/v1/admin/__init__.py` — confirmed by reading that file's router list directly; this endpoint is unreachable today |
| Edit / delete a customer | ⚠️ Same as above | same file, same unmounted status |

See §17 for why this Capability's gap is treated as a formally-classified Architecture Integrity
Finding, not an ordinary Gap.

---

## 13. Capability Lifecycle

Salman's addition: this plan defined *what* a Capability is, but not the stages it moves through
to get there. Every Capability — the seven above, or any future one (Coupons, Inventory, CRM,
...) — passes through the same sequence, never invented per case:

```
Idea → Contract → Implementation → Interface → Governance → AI Access → Review
```

- **Idea** — a Capability is named as real, distinct work, even before anything is written down.
- **Contract** — its sub-capabilities are listed, real vs Gap, per §12's format.
- **Implementation** — a single canonical Service owns its writes (§14) — clean, not merely present.
- **Interface** — at least one Interface (typically Dashboard) can invoke it end-to-end.
- **Governance** — Permissions, Draft/Publish, and ideally Audit/Activity are wired in (§16).
- **AI Access** — the Capability is reachable from the AI Interface, within the Client's own
  permission ceiling (§15).
- **Review** — a real, deliberate check that the Capability behaves as intended — not implied by
  the earlier stages being done, a distinct closing step.

**Applied honestly to Catalog — this project's single most built-out Capability**:

| Stage | Status |
|---|---|
| Idea | ✅ |
| Contract | ✅ (§12) |
| Implementation | ⚠️ Reached, but not clean — `catalog_service.py` is a real, correct single path, but `store.py`/`restaurant.py` independently write the same tables (§17's Duplicate Architecture finding) |
| Interface | ⚠️ Partial — Dashboard ✅ real; Mobile ❌; tenant-authoring API ❌ |
| Governance | ⚠️ Partial — Permissions ✅ (§15); Draft/Publish ⚠️ provisional only (§8); Audit ❌; Activity ❌ |
| AI Access | ❌ Not built |
| Review | ❌ No formal Capability-level review has been conducted |

**The honest conclusion this table forces**: even Catalog — the most built Capability in the
project — is roughly a third of the way through this pipeline. Every other Capability in §18's
Maturity table is earlier still. This is the entire point of naming the Lifecycle explicitly: it
replaces a vague "is Catalog done?" with a specific, checkable answer.

---

## 14. Single Source of Truth Matrix — the most important table in this plan

This table is this document's own applied instance of the platform-wide principle now owned by
`.claude/rules/backend/architecture.md` §9 (§3, Principle 5) — not a second copy of that rule.
Its point is structural, not informational: **every Capability's data has exactly one model that
owns it, and exactly one code path that may write to that model.** No Interface — Dashboard, AI,
public API, a future Import Tool — may ever write to the database directly; every write goes
through that Capability's one canonical path.

| Capability | Source of Truth (model) | Intended single write path | Current reality |
|---|---|---|---|
| Products | `CatalogItem` | `catalog_service.py` | ⚠️ **Violated today** — §17, Duplicate Architecture |
| Categories | `CatalogCategory` | `catalog_service.py` | ⚠️ **Violated today** — §17, Duplicate Architecture |
| Units (Booking) | `Unit` | `unit_service.py` (exists) | ⚠️ **Violated today** — §17, Broken Architecture |
| Site Configuration / Theme / Home Sections | `Client.config` (Json) | `client_service.py` (exists) | ⚠️ **Violated today** — §17, Broken Architecture |
| Orders (Store/Restaurant) | `StoreOrder` / restaurant order model | No dedicated service exists | ⚠️ §17, Missing Architecture |
| Customers | `Customer` | `customer_service.py` (exists, correctly used) | ⚠️ Route unreachable — §17, Missing Architecture |
| Gallery / Media | `GalleryImage` | No dedicated service exists | ⚠️ §17, Missing Architecture |
| Team / Staff | `User` | No dedicated service exists | ⚠️ §17, Missing Architecture |

**Reading this table honestly, not optimistically**: almost no admin-side Capability has a clean
single write path *today*. `catalog.py` is the one file in this entire codebase that does it
correctly — Route → `catalog_service.py` → Repository. This is exactly the risk Salman named:
without this fixed first, an AI assistant, a Mobile app, or an Import Tool arriving "after a year"
would each face the same choice `store.py` and `restaurant.py` already made once — reimplement the
write logic directly against a repository — and each would make it independently, compounding the
exact problem this matrix exists to prevent. Closing this is real Implementation Contract work,
not performed in this document; §17 classifies each violation formally so none of it is lost among
smaller notes.

---

## 15. Capability Matrix — Governance: Permissions

One table, all Capabilities, answering exactly the question Salman posed: not "does this feature
exist" but "**who is allowed to invoke it**." Per §5's anatomy, this table *is* the Permissions
piece of the Governance layer — not a Capability-specific artifact. The AI column is populated
now, before any AI work begins, precisely so that when a future assistant is added it inherits this
boundary automatically instead of needing its permissions re-litigated capability-by-capability.

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
| Brand name / logo / WhatsApp / email / currency (Site Configuration) | ✅ | ✅ |
| Custom domain / timezone / tax / languages (Site Configuration) | 🔜 | 🔜 |
| Edit SEO metadata | 🔜 | 🔜 |
| View / update order status | ✅ | ✅ |
| Export orders | 🔜 | 🔜 |
| View / edit customer info | 🔜 (blocked on §17's Customers finding) | 🔜 |
| **Activate/deactivate a paid module (`client_services`)** | ❌ | ❌ |
| **Anything Platform-layer** (routing, checkout logic, WhatsApp integration, DB structure) | ❌ | ❌ |

This table is the artifact Salman asked for explicitly as a "golden reference": the day a Tenant OS
assistant is designed, its permission scope is "every ✅ row above, exactly, no more" — nothing
about AI trust needs to be re-decided at that point, only which ✅ rows to build a conversational
front-end for first.

---

## 16. Governance Layer — Permissions, Draft/Publish, Audit, Versioning, Activity

Per §5's anatomy, Governance is the third sibling alongside Capability and Interface —
cross-cutting concerns built **once** and inherited by every Capability, never re-implemented per
domain. Two of its five pieces already have real content elsewhere in this plan; three are named
here for the first time as real Gaps.

- **Permissions** — already designed: §15's Capability Matrix, read directly. Not repeated here.
- **Draft/Publish** — already designed: §8's Live Preview mechanism. Not repeated here.
- **Audit** (who changed what, when) — ⚠️ **Gap, but with a real, structurally-suitable start**:
  `SecurityAuditLog` (`prisma/schema.prisma`) already exists with exactly the right shape for this
  — `clientId`, an extensible `eventType` string, `detail` (`Json?`), `actor` — but it is used
  today only for **security/system events** (`tenant_suspended`, `authorization_denied`,
  `login_failed`, `policy_violation`, per its own schema comment), never for tenant content-editing
  activity (e.g., "tenant X changed Product Y's price from $10 to $12"). Extending its use to cover
  Capability writes is a real, low-cost option for a future Implementation Contract — not decided
  here, but named precisely so nobody re-derives "do we need a new audit table" from scratch.
- **Versioning** (content history / undo) — ⚠️ **Gap**. No mechanism for reverting a Product,
  Category, or Content edit to a prior state was found anywhere in this investigation.
- **Activity** (a human-readable feed of recent changes, for the tenant themselves to see) — ⚠️
  **Gap**, closely related to Audit above — if `SecurityAuditLog`'s use is ever extended to cover
  tenant content edits, a tenant-facing Activity feed becomes a read view over the same data,
  not a second mechanism.

**Why this section exists as its own thing, not folded into §12's Capability Contracts**: none of
these five concerns belongs to Catalog, or Orders, or any single Capability. A Draft/Publish
mechanism built inside the Catalog Capability and a separate one built inside the Content Capability
would themselves become a Duplicate Architecture finding (§17) the moment a second Capability
needed it — exactly the mistake naming Governance as its own branch is meant to prevent before it
happens once, let alone twice.

---

## 17. Architecture Integrity Findings

Salman's explicit instruction: code that exists but isn't wired into the system, or that routes
around tenant boundaries, is **not** ordinary technical debt to note in passing — it's an
architecture integrity concern, and every finding must be classified into exactly one of three
named types, so the result reads as a real assessment of the architecture's own health, not an
undifferentiated TODO list:

- **Broken Architecture** — a Service exists for this exact write path, and the Route bypasses it
  anyway, going straight to a Repository. A clear, unambiguous break of an existing rule.
- **Missing Architecture** — no Service exists for this Capability's writes at all. Not a bug;
  a real, un-built piece of the architecture.
- **Duplicate Architecture** — the same data is written by more than one independent code path,
  each implemented differently, with no single canonical one.

Every finding below was verified by reading the real file during this investigation, per this
project's Zero Hallucination rule — none are inferred, and each was re-checked individually against
the three definitions above rather than left in one undifferentiated bucket.

### Broken Architecture

**Finding — Site Configuration (`settings.py`).** `app/services/client_service.py` exists and
already implements `create_client`/`get_client`/`update_client` — a real Service for exactly this
write path. `settings.py` bypasses it entirely, calling `admin_client_repo` directly. (A second,
smaller defect in the same file: `client_service.py` itself calls `prisma_client` directly rather
than delegating to a repository, itself a break of "Zero Prisma calls outside Repositories" — it
would need that fixed before being wired in as-is, not just imported.)

**Finding — Units (`units.py`, admin write side).** `app/services/unit_service.py` exists and is
correctly used by public-facing read routes (`public/units.py`, `public_service.py`). The admin
write routes (`units.py`) bypass it entirely, importing `UnitRepository`/`BookingRepository`/
`CustomerRepository`/`price_repo` directly.

### Missing Architecture

**Finding — Gallery/Media (`gallery.py`).** No service exists for `GalleryImage` CRUD/reorder at
all; `storage_service.py` handles only upload/storage mechanics, not the CRUD logic, which lives
directly in `gallery.py`'s route handlers via `gallery_repo`.

**Finding — Team/Staff (`team.py`).** No service file exists for `User`/team management at all
(confirmed against the full `app/services/` listing); `team.py` calls `user_repo` directly.

**Finding — Orders, Store/Restaurant (`store.py`, `restaurant.py`).** No dedicated order service
exists for either module (confirmed against the full `app/services/` listing — note Booking's
own order-equivalent, Bookings, *does* have `booking_service.py`; this Gap is specific to
Store/Restaurant); both route files call `store_admin_repo`/`restaurant_admin_repo` directly for
all order reads and status updates.

**Finding — Customers (`customers.py`).** The Service itself is correctly built (`customer_service.
py`, real full CRUD) — the missing piece is one layer up: the route is never `include_router`'d in
`app/api/v1/admin/__init__.py` (confirmed by reading that file's include list directly), so the
Capability is unreachable end-to-end despite being internally correct. Once mounted, its endpoints
also need a tenant-auth dependency added — they currently take `client_id` as an **unguarded query
parameter** with no `get_current_tenant`/`get_current_admin_user`/`require_service` dependency
anywhere in the file, unlike every other admin route this investigation read.

### Duplicate Architecture

**Finding — Products/Categories (`catalog.py` vs `store.py` + `restaurant.py`).** `catalog.py`
correctly routes all `CatalogItem`/`CatalogCategory` CRUD through `catalog_service.py`. `store.py`
and `restaurant.py` **independently perform the exact same CRUD on the exact same tables**
(confirmed: `create_item`, `update_item`, `delete_item_by_filter`, `create_category`,
`update_category`, `delete_category_by_filter` all called straight from both files via
`admin_catalog_repo`) — completely bypassing `catalog_service.py`. Three route files, two
different patterns, one shared pair of tables — Salman's own example of this category, confirmed
real in this codebase, not hypothetical.

**Finding — `PageBuilderTab.jsx` vs `CanvasPageEditor.jsx`.** `frontend/src/pages/generic-admin/
tabs/PageBuilderTab.jsx` (~1300 lines) is a near-duplicate implementation of the same
page/section-editing capability `CanvasPageEditor.jsx` provides — never imported anywhere, an
abandoned parallel implementation rather than the canonical one.

**None of these seven findings are fixed in this document.** Each is named, evidenced, and
classified — left for a future Implementation Contract to resolve, one category at a time.

---

## 18. Capability Maturity

Salman's addition: not every Capability is at the same stage of §13's Lifecycle, and saying "X
exists" without a maturity label is misleading — this is exactly what prevents a sentence like
"Customers is done" from hiding the fact that its route isn't even mounted.

**The five stages, defined against §13's Lifecycle**:

- **Reserved** — an Idea only; no real code yet.
- **Experimental** — real code exists, but is unreliable, unreachable, unguarded, or usable within
  only one module rather than as a general Capability.
- **Developing** — Contract and at least one working Interface exist, but Implementation carries a
  known Architecture Integrity Finding (§17) and/or Governance is largely absent.
- **Stable** — Implementation is clean (no open Integrity Finding) and at least one Interface works
  correctly; Governance and AI Access are still incomplete.
- **Mature** — Contract, clean Implementation, Interface, and Governance are all real; only AI
  Access/Review may remain.

**Applied honestly to every real Capability in this codebase**:

| Capability | Stage | Why |
|---|---|---|
| Catalog | Developing | Contract + Dashboard real; Implementation carries the live Duplicate-Architecture finding (§17) |
| Category | Developing | Shares `catalog_service.py` and the same Duplicate finding as Catalog |
| Site Configuration | Developing | Contract + partial Dashboard real; Implementation carries the live Broken-Architecture finding (§17) |
| Content | Developing | Rides the same `Client.config` mechanism and finding as Site Configuration |
| Theme | Developing | A narrower slice of Site Configuration (§10), same underlying finding |
| Orders | Developing | Dashboard works in production today; Implementation is Missing Architecture (§17) |
| Media | Experimental | Only real within Booking's unit-gallery context; no cross-module capability; Implementation is Missing Architecture |
| Customers | Experimental | Service correctly built, but its route is unmounted and unguarded — unreachable end-to-end |
| Team / Staff | Experimental, pre-Contract | Real, working code exists (`team.py`) but was never elevated to its own §12 Contract — skipped straight past the Idea/Contract stages; Implementation is Missing Architecture |
| AI | Reserved | Not built — an Interface sibling (§11), not a Capability |

**Why this table matters as much as Salman says it does**: "the Customers Capability exists" is
not a safe sentence on its own. It exists at **Experimental**, not Mature — a distinction that
matters the moment more than one person is touching this code.

---

## 19. Capability Acceptance Criteria

Salman's addition, and the piece he considers most important: not "when is the code finished," but
**when is a Capability actually considered complete.**

**The checklist, one Capability is measured against, in full**:

```
Dashboard · AI · API · Validation · Audit · Activity · Permissions ·
Draft/Publish (if applicable) · Documentation
```

If even one of these is missing, the Capability is **not Finished** — it is at some percentage
against this list. This reframes "we finished Catalog" into "Catalog is at N%," which is
considerably more precise.

**Worked honestly for Catalog — this project's most built-out Capability**:

| Criterion | Status | Score |
|---|---|---|
| Dashboard | ✅ Real (`CatalogTab.jsx`) | 1 |
| AI | ❌ Not built (§11) | 0 |
| API (tenant-authoring) | ❌ Not built (§5) — distinct from the existing shopper-facing public API | 0 |
| Validation | ✅ Likely — Pydantic input validation is this project's mandatory convention (`rules/backend/api-rules.md`) and `catalog.py` is the one route file already confirmed clean; not independently re-verified field-by-field in this pass | 1 |
| Audit | ❌ Gap (§16) | 0 |
| Activity | ❌ Gap (§16) | 0 |
| Permissions | ✅ Real rows exist in the Capability Matrix (§15) | 1 |
| Draft/Publish (applicable here) | ⚠️ Provisional only — Publish today ≈ `isActive`, not the staged mechanism §8 describes | 0.5 |
| Documentation | ✅ Real — `catalog-contract.md`, `service-system.md`'s table entry, this plan's own §12 contract | 1 |

**Total: 4.5 / 9 ≈ 50%.**

This is a real, computed number, not an illustrative one — included specifically because it's
honest: even the single most built-out Capability in this project is roughly halfway to complete by
this standard. Every other Capability in §18's Maturity table would score lower still. This is the
entire value of naming Acceptance Criteria explicitly: it replaces a feeling ("Catalog seems done")
with an auditable number anyone can recompute.

---

## 20. Rollout Phases

Salman's sequencing, including his closing review verdict on when the Client Journey Audit
actually belongs in this sequence:

- **Phase 1 — Fix the vision.** ✅ Done: the three layers (§4), the Tenant OS anatomy (§5), the
  Dashboard First Principle and constitution reference (§3), the Content Ownership Matrix (§6),
  the Theme boundaries (§10).
- **Phase 2 — Write the contract.** ✅ Done: Capability Contracts (§12), the Capability Lifecycle
  (§13), the Single Source of Truth Matrix (§14), the Capability Matrix (§15), the Governance
  Layer (§16), the classified Architecture Integrity Findings (§17), Capability Maturity (§18),
  and Capability Acceptance Criteria (§19).
- **Phase 2.5 — Adopt as Reference Architecture.** Salman's explicit closing verdict: reviewing
  this document is not the same as implementing anything, and once accepted, this document itself
  becomes the standing reference every future Capability is built against and reviewed against —
  a formal adoption decision, distinct from and prior to any implementation work. **Not yet
  adopted** — this revision is what would be adopted.
- **Phase 3 — Build the first group of Capabilities against this reference.** Real implementation
  work: closing §17's Broken/Missing/Duplicate findings, moving at least one Capability
  meaningfully forward on §13's Lifecycle and §18/§19's Maturity/Acceptance scales. Outside this
  document's scope — a future Implementation Contract's job.
- **Phase 4 — Client Journey Audit.** Deferred until **after** Phase 3 produces real, working
  Capabilities, not immediately after this document is reviewed (§21). Measures the real owner
  experience against a genuinely built product, not a freshly-written contract.

---

## 21. Next Step — the Client Journey Audit (Phase 4, gated on real implementation)

Salman's explicit direction, sharpened by his closing verdict: the Client Journey Audit — the
store owner's own onboarding-to-first-published-product journey, mirroring the role the Store
Experience Review played for the shopper's journey
(`.claudedocs/reviews/BEIT_AL_FAKHAR_STORE_EXPERIENCE_REVIEW.md`) — is real and still the right
eventual step, but is now explicitly gated on **both** Phase 2.5 (this document being formally
adopted as Reference Architecture) **and** Phase 3 (a first real group of Capabilities actually
built against it) — not on review alone. Reviewing a contract and living inside a built product are
different experiences; the Audit measures the second one.

**When it does run, it is explicitly not a checklist.** Not "does every button work" — a real,
qualitative first-time-user observation: hand a genuinely non-technical person an empty account
and ask them to publish a real store, then record, honestly:

- Where did they stop?
- What did they not understand?
- Where did they need help?
- Where did they feel like they needed a developer?

**Scope, to be executed once Phase 3 has produced real Capabilities to test**:

```
Create the store account → choose a Template → upload the logo → set brand colors →
create the first Category → create the first Product → upload its photos →
preview the live site → Publish
```

Each step maps to a named Capability from §12, scored against §18's Maturity and §19's Acceptance
Criteria — so the audit measures a real, bounded, *already-built* product against a real, bounded
contract, not a moving target or a document that was only just approved.

**Success bar**: a non-technical person completing this journey in **15-20 minutes**, with the
qualitative observations above showing no point where they felt they needed a developer, is the
standard every future Tenant OS addition is measured against — and, per Salman's closing framing,
the real test of whether the Tenant OS is ready for genuine use, not just whether its screens work.

**Status**: not yet conducted, and explicitly not started in this revision — gated on Phase 2.5 and
Phase 3, per Salman's direction.

---

## 22. Architecture Boundaries — Generic / Tenant-specific / Plugin / Never

This table answers a different question than §4's three layers — §4 is about *who owns* a given
piece of content or design; this table is about *where the code that renders it lives*. The two
are orthogonal: e.g. Content-layer data can be rendered by Generic code (`CatalogItemCard.jsx`)
or by Tenant-specific code (beit-al-fakhar's `ProductPage.jsx`).

| Boundary | What it means here | Real example |
|---|---|---|
| **Generic** | Lives in shared frontend/backend code, used by every tenant identically | `CanvasPageEditor.jsx`'s `SECTION_TYPES`, `CatalogItemCard.jsx`, `upload.py`'s `FOLDER_MAP`, the Tenant OS interface shell itself once unified |
| **Tenant-specific** | Lives under a tenant's own `pages/{slug}/` folder, per `rules/frontend/scaffolding.md` | beit-al-fakhar's `ProductPage.jsx`/`CheckoutPage.jsx` — these are Template a developer built for one tenant's brief; no interface ever touches these files, only the data they render |
| **Plugin** | A future serviceKey's self-contained Capability, activated only when that `client_services` row is active — the same pattern `require_service()` already enforces at the API layer, extended to "which Capability is even reachable" | `ReservationsTab` already does exactly this today (`activeServices.includes('reservations')`) |
| **Never in the Tenant OS** | Anything that is Platform or Template by §4's test, plus anything already explicitly owned by `SUPER_ADMIN_DASHBOARD_PLAN.md`/`TENANT_LIFECYCLE_PLAN.md` (billing, lifecycle state, cross-tenant data, service activation/deactivation itself — a tenant enabling their *own* new paid module is a billing/lifecycle decision, not a Content edit, and stays out of this scope even though `client_services.py`'s activate/deactivate endpoints technically live under `/admin/`) | Tenant status, trial/expiry, service-key activation, anything cross-tenant |

**A real open decision this plan surfaces but does not resolve**: `GenericAdminDashboard.jsx`
gates tabs by `client_services`/`active_services`; `SmarAdminDashboard.jsx` gates tabs by JWT
role (`ROLE_TABS`). A single unified interface needs **one** answer, not both bolted together —
per the Abstraction Rule, this should be resolved by whichever future Implementation Contract
does the actual unification, informed by which of the two mechanisms both real cases can express
without loss (role-gating is a strict superset of what service-gating expresses, since a role can
be scoped per-service too, but this is a judgment call for that future contract, not this one).

---

## 23. What this plan deliberately does not do

- No new API endpoints designed (the `CatalogItem`/`CatalogCategory` reorder gap, the Media
  Library, the Live Preview draft/publish mechanism, and the future AI action-vocabulary are all
  named, not designed).
- No new Prisma models or migrations proposed — every Content item in §6/§12 maps to a field that
  already exists, except the Gaps explicitly marked as such (Audit's extension of
  `SecurityAuditLog`, §16, is named as an option, not decided).
- No UI components, wireframes, or visual design.
- No decision on unifying `GenericAdminDashboard.jsx` and `SmarAdminDashboard.jsx` into one
  codebase — that is a real Implementation Contract's job, informed by this plan's boundaries.
- No resolution of the `client_services`-vs-role tab-gating conflict named in §22.
- No fix to any of §17's seven classified Architecture Integrity Findings — all seven are named,
  evidenced, and categorized, none are fixed here; all are code changes outside this document's
  declared scope.
- No formal adoption of this document as Reference Architecture — that is Phase 2.5 (§20), a
  decision for Salman to make, not something this document can grant itself.
- No Client Journey Audit conducted — explicitly deferred to Phase 4 (§21), gated on Phase 2.5's
  adoption and Phase 3's real implementation, per Salman's direction.
