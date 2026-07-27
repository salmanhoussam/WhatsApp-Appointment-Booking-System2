# TENANT_OS_PLAN.md — Tenant Operating System: Architecture Plan

**Superseded 2026-07-27 by ADR-0003 — see `architecture/TENANT_OS.md`, `architecture/principles/`,
`adr/TOS-*`, `architecture/capabilities/*`.** Archived, not deleted, per `repository-hygiene.md`'s
precedent. Every real fact in this document was traced to a new home during the ADR-0003 migration
— see `implementation/ADR-0003/PHASE_7.md` for the section-by-section completeness check. Two real
exceptions, named honestly rather than silently carried: §23–24 (Rollout Phases, the Client
Journey Audit) were explicitly deferred, out of the migration's scope, and remain readable only
here; the Booking/Units-specific rows of §6 and the Team/Staff rows of §19/§20/§21/§22 were never
redistributed into `capabilities/*.md` because neither Units nor Team/Staff has passed the
Capability Proposal gate (`adr/TOS-003-capability-contract-model.md`) as a ratified Tenant OS
Capability — this document remains their only real record until one of them is proposed properly.

**Status:** Design only. No code, no UI design, no new API, no database migration — a strategic
architecture plan, per `.claude/rules/documentation-policy.md`. Follows the Service Execution
Constitution's "real project state is the source of truth" principle throughout: every claim
below about what exists was verified by reading the real files, not assumed.

**Revision note (this pass)**: a real investigation of the dashboard's two "page editor" tabs
(written up separately as `LIVE_PAGE_EDITOR_PLAN.md`) found both render a hand-built mockup
canvas — a live Duplicate Architecture violation of §8's Live Preview principle, confirmed by
reading the code, not assumed. Salman's review of that plan made the deeper point: the fix is not
"a better Page Editor" — it's a real architectural layer, the **Editing Engine** (new §15), that
sits between Capability Contracts and every Interface (Dashboard, AI, Mobile, API, eventually
Voice), so that adding a new Capability later never means touching each Interface's code
separately. Per Salman's explicit instruction, that standalone plan is now **merged into this
document rather than left independent** — `LIVE_PAGE_EDITOR_PLAN.md` is removed; its real findings
live in §15 below. §5, §8, §9, and §12 are updated to reference the Editing Engine where they
previously left "how an Interface actually reaches a Capability" implicit.

**Earlier revision note**: Salman's closing observation was that Architecture is now sufficiently
covered, but **Product Governance** — deciding whether a new idea deserves to become a Capability
at all, before any Architecture applies to it — was still missing. Adds §12, **Capability
Proposal**, a five-question gate every future Capability must answer before a Contract is even
written (deliberately not a fourth branch of §5's anatomy — it's the admission process that
precedes the anatomy, not part of it). Adds a **Capability Health Dashboard** — a single-glance,
progress-bar-style view for the team itself, built from detailed derivations rather than replacing
them. Also records two things Salman raised without asking for immediate action: a future rename
once this document is formally adopted (Phase 2.5), since "Plan" undersells what this has become;
and the three documents Salman now considers this project's architectural backbone (§1) — the
Service Execution Constitution, the Backend Architecture Rules, and this document.

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
- **Salman's closing framing, recorded here rather than presumed elsewhere**: three documents now
  form this project's architectural backbone — `.claude/rules/service-execution-constitution.md`
  (how Services and Agents operate), `.claude/rules/backend/architecture.md` (how the system is
  technically written, including the platform-wide principle in its §9), and this document (how
  any idea becomes a Capability usable across Dashboard, AI, API, and Mobile). Keeping these three
  as the standing references is what lets the team or tenant count grow without the architecture
  branching or the same logic getting re-derived in more than one place. This is recorded as
  context here; it does not change `CLAUDE.md`'s own structure, which is a separate, more
  deliberately curated file outside this document's scope to edit unprompted.
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
   ever seem to disagree, the rule file wins. §16's Single Source of Truth Matrix and §19's
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
broader Site Configuration surface (§13). §6 maps every one of these to a real existing field;
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
  │      ├── Contract        (§13 — what the capability can do)
  │      ├── Service          (the one canonical write path, §16)
  │      ├── Repository       (Prisma queries only, no logic)
  │      └── Database         (the real Prisma model — the actual source of truth)
  │      [ one branch per domain: Catalog, Category, Media, Site Configuration,
  │        Content, Orders, Customers — see §13 ]
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
         ├── Permissions    — who may invoke a Capability (§17's Capability Matrix)
         ├── Draft/Publish  — staged edits before going live (§8's Live Preview)
         ├── Audit          — who changed what, when (real Gap, §18)
         ├── Versioning     — content history / undo (real Gap, §18)
         └── Activity       — a human-readable feed of recent changes (real Gap, §18)
```

**One admission gate sits above this whole anatomy, not inside it**: §12's Capability Proposal
decides whether an idea is even allowed to become a Capability with a Contract in the first place.
It is Product Governance, not Architecture — a different question than anything this anatomy
describes, which is why it isn't drawn as a fourth branch above.

**One connective mechanism sits between Capability and Interface, not inside either**: §15's
**Editing Engine** is how an Interface actually reaches a Capability's editable fields —
Capability → Operation → Schema → Renderer, never Interface → hardcoded per-field UI logic. It is
not drawn as a fourth branch either; it is the literal implementation of the arrow between
Capability and Interface that this diagram already implies but previously left unspecified.

**Why the Capability/Interface/Governance split matters, concretely**: Draft/Publish, Audit,
Versioning, and Activity are not properties of any one Capability. Catalog does not get its own
separate audit log; Content does not get its own separate draft/publish mechanism. These are
cross-cutting concerns, built **once** at the Governance layer, and every Capability inherits them
automatically. §18 is where this is made concrete.

**What this means for the rest of the document**: every section from here on is one of four
things — the Product Governance gate (§12), Capability content (§6, §13, §15, §16), Interface
content (§7, §11), or Governance content (§8, §17, §18). None of them is "the top level" of
anything except the gate, which precedes all three anatomy branches by design.

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

This project already has real building blocks this identity needs (§1): the shared upload flow
(`upload.py`, `useImageUpload.js`) already collapses upload into a single drop-target interaction.
`CanvasPageEditor.jsx`, however, does **not** — a real investigation (§15) found its "canvas" is a
separate, hand-rolled mockup that never renders the real page, exactly the anti-pattern this
section and §8 both warn against. §15's Editing Engine is the real fix: inline-in-context editing
becomes the default posture for every Content item not because each Interface hand-builds it, but
because the Editing Engine's Discovery mechanism makes every editable field clickable-in-place
automatically, on the real rendered page, for any Interface that chooses to surface it that way.
Where §6's "gap" items (reorder for `CatalogItem`/`CatalogCategory`) get closed by a future
Implementation Contract, they should be closed in this same direct-manipulation spirit (drag the
card, not "edit sort_order in a number field"), continuing the real pattern `GalleryImage`'s
reorder endpoint already proves works.

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

**A real, working precedent for this exact principle was found in §15's investigation, on a tab
this document had not previously examined**: the Settings tab already renders a real
`<iframe src="/demo/{slug}">` — the actual production page, live, inside the dashboard — with a
working `postMessage` bridge that pushes edited field values into it instantly, no save/reload
required (`GenericAdminDashboard.jsx:260-269`, `DynamicPage.jsx:216-233`). It only carries 3
primitive fields today (accent color, hero type, catalog layout), but the plumbing itself is
exactly this section's principle, already real, not proposed. §15's Editing Engine generalizes
this real foundation to every Capability's editable fields, rather than inventing a second
mechanism beside it. By contrast, `CanvasPageEditor.jsx` and the orphaned `PageBuilderTab.jsx` —
the dashboard's actual "page editor" tabs — do the opposite of this principle: both render a
separate, hand-built mockup canvas that imports zero real components (`CanvasPageEditor.jsx:
1002-1224`, confirmed importing nothing from `components/dynamic-sections/`) — a live Duplicate
Architecture finding (§20) this document's own principle would have caught, had this investigation
happened sooner.

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
§13's Site Configuration Capability — Theme is specifically the *visual* tokens; Site Configuration
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
- Its permission ceiling is not a new decision — it's §17's Capability Matrix (Governance:
  Permissions), read directly: the AI may invoke exactly the Capabilities marked ✅ for AI there,
  no more, no negotiation per feature.
- Concretely reserved, not designed: a chat-style Interface surface, and a narrow, explicit
  action-vocabulary the assistant is allowed to call (the same vocabulary every other Interface
  already exposes — nothing more). No model choice, no prompt design, no new endpoint is decided
  here.
- **That "action-vocabulary" is not a separate thing to design for AI specifically — it is §15's
  Editing Engine, read directly.** The set of Operations the Editing Engine's Discovery mechanism
  exposes for a given page (§15) *is* the AI's action-vocabulary, verbatim — an AI reads the same
  Schema a human's Dashboard renders as a form, and calls the same Operation-execution endpoint a
  click resolves to. This is what makes the earlier bullet ("never a separate privileged codepath")
  concrete rather than aspirational: there is no second implementation for AI to drift from,
  because there is only one Operation per field, discovered the same way regardless of which
  Interface is asking.

---

## 12. Capability Proposal — the Product Governance Gate

Salman's closing addition, and — in his own words — likely the last piece of this puzzle:
Architecture is now well covered; what was still missing is **Product Governance** — who decides a
new idea deserves to become a Capability at all, before any Architecture (§5's anatomy, §13's
Contracts) ever applies to it. This is deliberately not part of §5's anatomy diagram — it's the
admission gate that precedes it, a Product question, not an Architecture one.

**Every future Capability — Coupons, Inventory, CRM, Loyalty (already 📋 Planned per
`service-system.md`), or anything else — must answer five questions before a Contract (§13) is
written**:

1. **What problem does this solve, and for whom?** Not "what does it do" — whose real need does it
   answer.
2. **Is this a new Capability, or the extension of an existing one?** Most ideas are the latter; a
   genuinely new Capability is the exception, not the default.
3. **Will more than one Interface need it?** Dashboard, AI, API, Mobile. If only one Interface will
   ever call it, it is probably not a Capability at all — more likely Interface-specific UI logic
   that doesn't need its own Contract/Service/Repository chain.
4. **What is the Source of Truth?** If this cannot be named clearly, implementation does not start
   — this is §16's Single Source of Truth Matrix's own admission requirement, applied at proposal
   time rather than discovered after the fact.
5. **How will the client — not the developer — measure whether it succeeded?** A technical
   definition of done is not sufficient on its own.

**If these five cannot be answered, the Capability is not ready**, regardless of how good the idea
is otherwise.

**Applying the gate retroactively to Catalog, as a sanity check that it actually filters
something**:

| Question | Catalog's answer |
|---|---|
| Problem, for whom? | Tenants need to list distinct sellable items with prices and photos, for their own customers to browse and order |
| New or extension? | Was genuinely new (the Phase 54 unification that replaced separate Menu/Store models) |
| More than one Interface? | Yes — Dashboard is real today; AI and a tenant-authoring API are named, reserved future consumers (§11, §5) |
| Source of Truth? | `CatalogItem`/`CatalogCategory` — unambiguous (§16) |
| Client's own success measure? | "I can list a real product, and a real customer can find and buy it" — non-technical, checkable |

Catalog passes cleanly — a real confirmation the gate isn't purely theoretical. This is the
concrete content of §15's Lifecycle "Idea" stage: an Idea only becomes eligible to move to
"Contract" once these five questions are answered, for every future Capability, not only this
worked example.

---

## 13. Capability Contracts (Phase 2)

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
| Upload a file into a specific storage context (hero, logo, product, unit gallery) | ✅ Real | `upload.py`'s `FOLDER_MAP`/`IMAGE_TYPE_MAP`, `useImageUpload.js` — the file transfer itself always succeeds |
| Persist the uploaded URL somewhere queryable | ⚠️ **Per-context, not blanket** — corrected 2026-07-22 (Phase 0) | Real for `page_hero_video` (writes `Client.hero_video_url` directly, bypassing any Service — itself a Broken-Architecture-adjacent finding, §19) and for `catalog_item`/`unit_cover`/`unit_gallery` (via `GalleryImage`/catalog rows). **Not real for `page_logo`, `page_hero`, `page_story`, `page_demo`** — confirmed by reading `upload.py`'s full route body: none of those contexts match a persistence branch; the call falls through to `return {"url": ..., "image_id": None}` and the URL is never saved anywhere unless a caller separately PATCHes it (which Sprint 2 now does for `page_hero` via `/media/hero-image` — `page_logo` has no equivalent route yet, see §13's Site Configuration Ownership Matrix) |
| Reorder unit gallery photos | ✅ Real (booking module only) | `PUT /gallery/{unit_id}/reorder` |
| Delete a unit gallery photo | ✅ Real | `DELETE /gallery/images/{id}` |
| Browse/reuse previously uploaded media across contexts (a real Media Library) | ⚠️ Gap | No client-wide "list my media" endpoint exists — every upload is bound to one context, nothing is browsable/reusable across contexts today |
| Replace beit-al-fakhar's Hero video (frame-sequence Hero) | ⚠️ Gap, distinct from Sprint 2's `hero.bg_image` | See §14's "`ReplaceMedia` may need a Processing Pipeline" — frames are extracted offline by hand today (`ffmpeg`, then hardcoded into `walkthroughAssets.js`); a real `ReplaceMedia` for this Hero cannot reuse Sprint 2's simple file→URL shape without silently leaving stale frames on the page |

### Site Configuration Capability (broader than Theme) — Ownership Matrix (Sprint 3, Phase 1)

Salman's explicit addition, twice now: first (Phase 1's original pass) that Site Configuration is
not Theme (§10, narrowly visual) but everything about how the tenant's business itself is
configured; second, after Sprint 3's Phase 0 re-investigation
(`.claudedocs/work/tenant-os-sprint3-phase0/2026-07-22/PHASE0_INVESTIGATION.md`), that the Contract
must be written from **Ownership first, fields second** — Phase 0 found the real risk isn't the
API shape, it's that one concept ("Hero") is currently split across more than one Capability's
storage. His words: *"أكبر مشكلة ليست الـ API. بل أن مفهومًا واحدًا ('Hero') موزع على
Capabilityين... إذا لم نحل هذا أولًا، فسنبني Contract فوق حدود غير مستقرة."*

**Ownership Matrix** — every concept touching `Client`/`config` today, assigned to exactly one
Capability:

| Concept | Capability | Why |
|---|---|---|
| Brand (`name_ar`, `name_en`) | Site Configuration | Identity metadata, not editorial text |
| Contact (`whatsapp_number`, `email`, `instagram_url`, `maps_url`) | Site Configuration | Business facts |
| Currency | Site Configuration | Business fact |
| Theme Tokens (`primary_color`, `font`, `catalog_layout`, `page_type`/`template_key`) | Site Configuration | Display configuration — the "Theme" slice §20 already named as narrower than Site Configuration |
| Logo | **Media**, not Site Configuration | Same reasoning as Hero Image below — it is an image needing a `ReplaceMedia` Operation, not configuration data. Site Configuration may *reference* `logo_url` for rendering but does not own writing it. **Judgment call, not explicitly given by Salman** — his own example list didn't cover Logo; flagged here for confirmation rather than assumed, precisely because Phase 0 found its current status ("✅ Real") was itself wrong (see correction below) |
| Hero Copy (title/subtitle/CTA text) | **Content**, not Site Configuration | Editorial text — regardless of where it is stored today. Salman's explicit new rule: *"Site Configuration لا يملك أي نصوص تحريرية. أي شيء يمثل Content يبقى داخل Content Capability، حتى لو كان موجودًا تاريخيًا داخل `config.hero`."* |
| Story Copy | Content | Editorial text |
| Hero Image/Video (`bg_image_url`, matched for video by file extension) | Media | `ReplaceMedia` Operation — Sprint 2's real, proven mechanism |

**Correction to this table's prior text, made honest by Phase 0's more rigorous evidence**: Logo
was previously listed "✅ Real" here, evidenced only by `upload.py`'s `page_logo` `FOLDER_MAP` entry
existing. Phase 0 read the route's full body: `page_logo` matches none of its `if`/`elif` branches
that persist a URL anywhere (only `page_hero_video` does) — the file uploads correctly, the
resulting URL is never saved. No `logo_url` field exists on `Client`; no frontend code references
`logo_url`/`logoUrl` anywhere (confirmed by grep). Logo is a **complete Gap**, not partial —
upload-storage plumbing exists, nothing else does.

#### Known Boundary Debt (Phase 0 findings — named, not resolved, not silently inherited)

Three real, independently-confirmed instances of the same "Hero" concept fragmenting across
storage locations, each a different failure shape — not one bug repeated three times:

1. **Hero Copy — a live duplicate.** `config.hero.title_ar/subtitle_ar/cta_ar` (legacy, written
   only via `SettingsTab.jsx`'s own hero-text fields, read only by `ConfigurableHero.jsx:55` for
   the `page_type: "showcase"` + `sections: []` fallback) is a second, fully independent "Hero
   Title" storage location, unrelated to Sprint 1's real Content Capability field
   (`config.content.sections[type=hero].data.title_ar`, edited via `/content/hero-title`, rendered
   by `HeroSection.jsx` through `DynamicPage.jsx`'s real `SECTION_MAP`). Both are live and
   consumed today, depending on which rendering path a given tenant uses.
2. **Hero Video — a dead pipeline.** `Client.hero_video_url` (root column) has two real Admin
   write paths (`PATCH /settings` via `SettingsTab.jsx`'s form; `POST /upload/` with
   `context=page_hero_video` via `upload.py`'s direct bypass write) but its only real frontend
   *read* consumer, `frontend/src/design-system/organisms/TenantHero.jsx`, has **zero importers
   anywhere in the codebase** (confirmed by grep) — nothing ever renders it. Unlike Hero Copy, this
   isn't two live competing writers; it's a fully-wired write path with no live reader at the end
   of it. Sprint 2's real Media Capability already covers the *conceptually* equivalent slot
   (`content.sections[hero].data.bg_image_url`, which already matches video file extensions in
   `HeroSection.jsx`) — `Client.hero_video_url` is redundant with it, not complementary.
3. **Hero Cover Image — a phantom reference.** `ConfigurableHero.jsx` (lines 59, 152) reads
   `config?.hero_image_url || config?.cover_url` — **neither field exists anywhere in
   `prisma/schema.prisma`**, confirmed by grep. For any tenant rendering through this fallback
   path, the hero cover image has never actually worked; this is a latent bug, not a duplication.

None of these three are fixed in Phase 1 — named here so Phase 2/3 inherit them as explicit,
evidenced decisions to make (migrate `config.hero.*` into `content.sections`? delete
`TenantHero.jsx` and both its write paths since nothing renders it? wire a real field for
`ConfigurableHero.jsx`'s cover image, or retire that fallback path entirely?), not silently
rediscovered later.

#### Site Configuration — Capability Contract (Phase 1, Sprint 3)

Only the concepts the Ownership Matrix above actually assigns to Site Configuration. Each row:
Source of Truth (today's real storage), Admin Contract (write), Public Contract (read), Operation.

| Field | Source of Truth | Admin Contract | Public Contract | Operation |
|---|---|---|---|---|
| Brand name (ar/en) | `Client.name_ar`, `Client.name_en` | `PATCH /admin/site-config/brand` (new — Phase 2) | `GET /public/{slug}/config` → `name_ar`/`name_en` (already real, unchanged) | `UpdateField` |
| WhatsApp number | `Client.whatsapp_number` | `PATCH /admin/site-config/contact` (new — Phase 2) | `GET /public/{slug}/config` → `whatsapp_number` (already real) | `UpdateField` |
| Email | `Client.email` | `PATCH /admin/site-config/contact` (new — Phase 2) | **Gap, confirmed by Phase 0** — not exposed today; stays un-exposed unless a real reason to make it public surfaces | `UpdateField` |
| Instagram / Maps URL | `Client.instagram_url`, `Client.maps_url` | `PATCH /admin/site-config/contact` (new — Phase 2) | `GET /public/{slug}/config` → same keys (already real) | `UpdateField` |
| Currency | `Client.currency` | `PATCH /admin/site-config/business` (new — Phase 2) | `GET /public/{slug}/config` → `currency` (already real) | `UpdateField` |
| Primary color / font / catalog layout / page type | `Client.primary_color`, `config.font`, `config.catalog_layout`, `Client.pageType`/`templateKey` | `PATCH /admin/site-config/theme` (new — Phase 2) | `GET /public/{slug}/config` → same keys (already real) | `UpdateField` |

**Source of Truth for the Service layer itself (not yet built — Phase 2's job)**: per Salman's
explicit decision this Sprint — *"لن أحاول 'إعادة توصيل' `settings.py` بهذا الـ Service. بل سأتعامل
مع `client_service.py` نفسه كجزء من Sprint 3"* — the target Service is `client_service.py` itself,
**extended** (its `ClientUpdate` schema currently only covers `name`/`slug`/`phone`/`email`/
`isActive`/`password` — Phase 0 confirmed it cannot carry `primary_color`/`config`/
`whatsapp_number` etc. as-is) and **fixed** to call `admin_client_repo` instead of `prisma_client`
directly, not a fresh Service written from scratch. Route names above (`/site-config/brand` etc.)
are illustrative groupings for Phase 2 to size, not a final API surface commitment.

**Why this Contract is deliberately narrower than the table that used to sit here**: Business
hours, Languages, Custom domain, Timezone, Tax settings, Delivery zones/fees, SEO metadata,
Analytics, and Integrations remain real Gaps (unchanged from the prior pass — no new evidence
found or claimed for any of them this Sprint) and are not part of Phase 1's Contract; they stay
named as future work, not re-scored here.

**Reframing Sprint 3's actual target, per Salman's own correction**: this is not "wire `settings.py`
into the Editing Engine." It is establishing **one canonical write path per field** — the same
`upload.py` finding that surfaced a second bypass writer for `hero_video_url` is itself evidence
that the real problem was never one Route; it's that Site-Configuration-owned fields have had more
than one Writer. Phase 2 must fix `settings.py` **and** `upload.py`'s `page_hero_video` branch
together, not `settings.py` alone — anything less leaves a second, uncoordinated writer standing.

### Content Capability (page copy, distinct from Catalog's product data)

**Corrected 2026-07-22, Phase 0 re-investigation** — this table previously overstated what Sprint 1
actually built. Only `hero.title` and `story.heading` are real, Engine-editable fields
(`content_service.py`, verified end-to-end via CDP). Subtitle/CTA text and About/Why-Us/
Testimonials copy exist as real data in `config.content.sections[].data` and do render (via
`HeroSection.jsx`/`StorySection.jsx`/`TestimonialsSection.jsx`), but have **no Admin route and no
`EditableRegion`** yet — "the data field exists and renders" and "is editable through the Engine"
are different claims, and the prior text conflated them.

| Sub-capability | Status | Mechanism |
|---|---|---|
| Edit Hero title | ✅ Real, Engine-editable | `content_service.py` → `/content/hero-title`, Sprint 1 |
| Edit Story heading | ✅ Real, Engine-editable | `content_service.py` → `/content/story-heading`, Sprint 1 |
| Edit Hero subtitle/CTA text | ⚠️ Data exists, not yet Engine-editable | Renders from `config.content.sections[hero].data.subtitle_ar`/`cta_text_ar`; no Admin route, no `EditableRegion` |
| Edit About/Why-Us/Testimonials copy | ⚠️ Data exists, not yet Engine-editable | Renders from their respective `config.content.sections[].data`; no Admin route, no `EditableRegion` |
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

See §19 for why this Capability's gap is treated as a formally-classified Architecture Integrity
Finding, not an ordinary Gap.

---

## 14. Editing Engine — Capability → Operation → Schema → Renderer

### Why this section exists

A real investigation of the dashboard's two "page editor" tabs (originally written up as its own
document, `LIVE_PAGE_EDITOR_PLAN.md`, now merged here per Salman's explicit direction) found both
render a hand-built mockup: `CanvasPageEditor.jsx`'s center canvas (`CanvasPageEditor.jsx:
1002-1224`) and the orphaned `PageBuilderTab.jsx`'s equivalent both import **zero** components from
`components/dynamic-sections/` — confirmed by their full import lists. Two section types
(`featured_items`, `categories_grid`) render nothing but placeholder text, forever, regardless of
real data. The real production page (`DynamicPage.jsx` → `SECTION_MAP` → 10 real components under
`components/dynamic-sections/`) is a completely separate, richer, working system these editors
never touch — a live Duplicate Architecture finding (§19) and a direct violation of §8's own Live
Preview principle, written before this investigation happened.

Salman's review of the first fix proposed for this (an iframe + click-to-select, still tied to one
specific UI mechanism) made the deeper point: **the fix is not a better Page Editor — it's a real
architectural layer.** Today there is a Dashboard. Tomorrow there will be an AI Assistant, a Mobile
app, a Public API, possibly Voice. All of them must reach the exact same editable data through the
exact same mechanism, or each new Interface will reinvent its own — exactly the coupling Design
Principle 5 (§3) and the Single Source of Truth Matrix (§16) already exist to prevent, now applied
to the *editing* side of Capabilities, not just their storage.

### The core correction: Capability → Operation → UI, never the reverse

Today's real interaction in `CanvasPageEditor.jsx` is `Click Section → Open HeroEditor` — a direct
UI-to-UI mapping, with business logic about what fields a Hero has living inside `HeroEditor.jsx`
itself. This looks reasonable until a second Interface arrives: when an AI Assistant is told "غيّر
عنوان الهيرو" (change the hero title), there is no click, and `HeroEditor.jsx`'s logic is
unreachable from that instruction. The direction must be reversed. Every future feature decision
here starts from the Capability side, never the page side:

```
Capability  →  Operation  →  Schema  →  Renderer
```

- **Operation** — a small, fixed vocabulary of generic action *types*, not one bespoke action per
  field: `UpdateField` (text/richtext/number/boolean), `ReplaceMedia` (image/video), `ReorderList`,
  `ToggleVisibility`. An Operation is always addressed by `{capability, key}` —
  e.g. `{capability: "content", key: "hero.title", operation: "UpdateField", value: "..."}` — never
  by a page name or a component name. This is the literal content of Salman's
  `<EditableRegion capability="content" key="hero.title" />` example (below).
- **Schema** — each Capability (§13) declares, once, which keys exist and which Operation types
  apply to each (a text field takes `UpdateField`; an image takes `ReplaceMedia`; a list takes
  `ReorderList` and `ToggleVisibility` per item). This Schema is what a generic form-renderer draws
  from — **not** a bespoke `HeroEditor.jsx`/`OffersEditor.jsx` per section type, which is exactly
  what today's two fake canvases both do, and exactly what would need to be re-duplicated for
  Mobile and re-parsed for AI if it stayed that way.
- **Renderer** — each Interface is *only* a renderer of, or caller into, the same Schema and
  Operations — never an owner of business logic about what fields exist. The Dashboard draws the
  Schema as inline-editable regions on the real rendered page. The AI reads the same Schema to know
  what an instruction like "change the hero title" needs as input, then calls the identical
  Operation-execution endpoint a click would have called. The API exposes Operation execution
  directly. A future Mobile app renders the same Schema natively. None of them contain field-level
  business logic; all of it lives once, in the Capability's Schema.

**The Editing Engine's own execution must still obey §16's Single Source of Truth rule.** It is a
dispatcher, not a second writer: given `{capability, key, operation, value}`, it resolves which
Capability owns that key and calls **that Capability's one existing canonical Service** — the same
`catalog_service.py`, the same (once §19's Broken-Architecture finding for Site Configuration is
closed) real `client_service.py` — never a parallel write path of its own. If the Editing Engine
ever wrote directly to a Repository or DB, it would itself become an eighth Duplicate Architecture
finding, exactly the failure this whole document exists to prevent.

### Discoverability: nobody should have to know where "Hero Title" lives

`Page → Regions → Fields → Operations` — any editable page, whether section-driven
(`DynamicPage.jsx`) or bespoke (beit-al-fakhar's hand-built `HomePage.jsx`), exposes this same tree
to any Interface that asks. A developer marks a real piece of a page once, declaratively:

```jsx
<EditableRegion capability="content" key="hero.title">
  {children}
</EditableRegion>
```

This is a **Contract**, not merely a clickable wrapper: for a real visitor it renders its children
inertly, zero behavior change. For any editing context, it registers `{capability: "content", key:
"hero.title"}` into a Discovery registry — the same registration a Dashboard, an AI planning step,
or a Mobile client all read to build the exact same "what can I edit here" tree, without any of
them needing a developer to have separately told them where a Hero Title physically lives. This
directly answers Salman's own worry about repeating the fake-canvas mistake in a new guise: an
`EditableRegion` never contains a form, a modal, or field-specific rendering logic — those are the
Renderer's job, driven entirely by the Capability's Schema.

### The concrete test: adding Testimonials or FAQs tomorrow

Salman's own proposed test for whether this is real architecture or still coupled: *if a new
Capability is added tomorrow, how many files change?* Worked through honestly for a hypothetical
**Testimonials** Capability:

1. **Define its Contract/Schema** (§13-style — one real definition: which keys exist, e.g.
   `items[].quote`, `items[].author`; which Operation types apply to each).
2. **Mark up wherever testimonials already render** — `TestimonialsSection.jsx`, the real,
   already-existing component — with `EditableRegion` contracts around its real fields. No new
   editor form file is written.
3. **Its data still needs exactly one real canonical Service**, per §16's rule — the same
   requirement every Capability already has regardless of the Editing Engine's existence, not new
   work created by it.

That's it. The Dashboard's generic Schema-renderer, the AI's Schema-reader, the API's Operation
endpoint, and a future Mobile renderer all pick up Testimonials automatically — **zero** of them
need new Testimonials-specific code. If a real future Capability instead required touching four or
five separate places (a new Dashboard form, new AI intent-handling code, a new API route, a new
Mobile screen), that would be direct, measurable evidence the Editing Engine has not actually
decoupled Interfaces from Capabilities — this test is the standing way to check that going forward,
not a one-time exercise.

### Applying it to the two real tracks already identified

- **Section-driven tenants (footlab, caracas, olivello)**: `DynamicPage.jsx`'s real `SECTION_MAP`
  components (`HeroSection.jsx` and its 9 siblings) get `EditableRegion` contracts added around
  their real fields. The Dashboard's chosen visual style for surfacing them — reusing the Settings
  tab's already-real `<iframe>` + `postMessage` foundation (§8), extended to carry full Schema-
  driven content instead of 3 primitive fields, plus one new message type so a click inside the
  iframe reports the clicked `{capability, key}` back to the parent — is one Interface's rendering
  choice, not the Editing Engine's design. `CanvasPageEditor.jsx`'s per-section-type editor forms
  (`HeroEditor`, `OffersEditor`, etc.) are retired in favor of one generic Schema-driven form
  renderer; both fake canvases are deleted entirely, including the orphaned `PageBuilderTab.jsx`
  (its one worth-keeping idea, real `@dnd-kit` drag-reorder, is folded into the `ReorderList`
  Operation's Dashboard renderer).
- **Bespoke tenants (beit-al-fakhar)**: the exact same `EditableRegion` Contract, the exact same
  Discovery tree, the exact same Operation-execution endpoint — placed directly around real Content
  in hand-built JSX (`HomePage.jsx`'s hero headline first) rather than around a `SECTION_MAP` entry.
  **This is the second independent real case the Abstraction Rule asks for**: the same Editing
  Engine machinery serving a data-driven page and a hand-built page proves the abstraction is
  earned, not premature — a stronger justification than the first draft of this idea had, which
  only had one real case (Track 1) to point to.

### Known Requirement — `ReplaceMedia` may need a Processing Pipeline, not just a URL swap

Raised by Salman while reviewing Sprint 3's Phase 1, prompted by beit-al-fakhar's own real Hero —
confirmed exactly as he described, not assumed: beit-al-fakhar's Hero is not a `<video>` tag.
`frontend/src/pages/beit-al-fakhar/sections/hero/` (the reference implementation for the
`frame-sequence-canvas` skill, `rules/frontend/animations.md` §5) scroll-scrubs real, pre-extracted
video frames painted onto a `<canvas>`. The frame set is prepared entirely **offline and by
hand** — the skill's own words: *"The frame sequence is prepared once, offline, from a real source
video"* via a documented `ffmpeg` recipe, uploaded manually, with the exact frame count and base
URL then **hardcoded** into `walkthroughAssets.js` (`FRAME_COUNT = 71`, a literal Supabase URL,
both edited directly in source by whoever ran the extraction on 2026-07-19). There is no field, no
Service, no endpoint, no automation connecting "a new video was uploaded" to "the frames get
regenerated" — today that connection is a developer re-running the `ffmpeg` recipe and hand-editing
this file. If a future `ReplaceMedia` Operation on this Hero only swapped a stored URL (Sprint 2's
`hero.bg_image` shape), the page would keep silently rendering the **old** 71 frames forever — a
real, predictable functional bug, not a hypothetical one.

**The generalized principle, stated now so it isn't rediscovered mid-Sprint**: `ReplaceMedia` is
not always `file → URL`. For some fields it is `file → Processing Pipeline → Derived Assets →
Published Result` — upload, then some transformation, then the actual thing a page renders is the
*derived* asset, not the uploaded file itself. The Interface's job stays exactly what §14 already
established: say "replace the hero video." Whether that requires a pipeline afterward, and what
that pipeline does, is entirely the owning Capability's decision, invisible to every Interface —
the same Capability → Operation boundary this whole section exists to protect, now shown to apply
to an Operation's *own* internal complexity, not just which Interface calls it.

Salman's own worked examples, recorded as the standing frame for future Media-adjacent work (none
built now — Reserved/Gap, per §15/§20, until a real case needs it):

| Asset | Pipeline after Upload? |
|---|---|
| Logo | Upload only |
| Product photo | Upload only |
| Hero video (frame-sequence Hero) | Upload **+ frame extraction** (today: manual `ffmpeg`, unautomated) |
| Gallery images (future) | Upload **+ thumbnail generation** |
| PDF/Catalog (future) | Upload **+ preview generation** |

**Not built now — a named Gap, not a Sprint 3 deliverable**: no Processing Pipeline abstraction, no
job queue, no automated frame-extraction trigger. Sprint 2's real `ReplaceMedia` (`hero.bg_image`)
remains exactly what it is — a direct file→URL swap for the *generic* `HeroSection.jsx` path — and
is explicitly **not** the same mechanism as beit-al-fakhar's bespoke frame-sequence Hero, which has
no Editing Engine integration of any kind today. Wiring beit-al-fakhar's Hero into the Engine
later must account for this Known Requirement from the start, rather than copying Sprint 2's
simpler shape and silently reintroducing the stale-frames bug this section exists to prevent.

### The Admin/Public Contract split — why the live preview is a real proof, not a mock

Raised by Salman after Sprint 2 (Media Capability): the Editing Engine's write path and the
Dashboard's live preview are not the same API surface, and that separation is architecture, not
incidental plumbing. Elevated to its own platform-wide rule at
`.claude/rules/backend/architecture.md` §10 (canonical statement — not restated here); what
follows is how that rule is already true in this Engine specifically, today:

```
Dashboard
   │  PATCH
   ▼
Admin API   (auth, validation, permissions — content.py, media.py)
   │
   ▼
Database
   │
   ▼
Public API   (GET /public/{slug}/config — published state, no auth)
   │
   ▼
iframe Preview   (DynamicPage.jsx — the exact same component a real visitor renders)
```

Confirmed real by reading the actual files, not assumed: `content.py`/`media.py` sit under
`app/api/v1/admin/`, gated by `require_roles`; `DynamicPage.jsx` — which both the live-preview
`<iframe>` and every real visitor render — imports only `publicApi`, never `adminApi`. The editor
and a real future visitor are provably reading through the identical Public Contract, which is
what makes Sprint 1/2's live-preview verification a genuine end-to-end proof of "what the editor
sees is what gets published," not a mock that could quietly drift from production.

This is also why Draft/Publish (§8) will not require rearchitecting the Engine when it's built:
Admin Contract writes move to Draft Storage, a Publish step promotes Draft → Published, and the
Public Contract only ever reads Published — the write path's shape and the Engine's own code are
unaffected either way.

```
Dashboard → Admin API → Draft Storage → (Publish) → Published Content → Public API → Visitors
```

Any Interface found reading/writing a Repository directly, or crossing this boundary (a write via
the Public Contract, a Draft read via it), is a **Broken Architecture** finding under §19's
existing taxonomy — not a new category, the same one already defined there for a Route bypassing
its Service.

### What this section deliberately does not do

No message-payload shapes, no Schema file format, no Discovery-registry implementation, and no
decision on how `EditableRegion` technically registers itself (React Context, a build-time static
scan, a runtime call) are specified here — all real Implementation Contract work for whichever
Capability builds this first. `LIVE_PAGE_EDITOR_PLAN.md`, the standalone document this section
supersedes, has been removed; its confirmed investigation findings are preserved above and in §8,
§19.

---

## 15. Capability Lifecycle

Every Capability — the seven above, or any future one that passes §12's Proposal gate — moves
through the same sequence, never invented per case:

```
Idea → Contract → Implementation → Interface → Governance → AI Access → Review
```

- **Idea** — has passed §12's Capability Proposal gate; the five questions are answered.
- **Contract** — its sub-capabilities are listed, real vs Gap, per §13's format.
- **Implementation** — a single canonical Service owns its writes (§16) — clean, not merely present.
- **Interface** — at least one Interface (typically Dashboard) can invoke it end-to-end, through
  the Editing Engine (§14) — never through Interface-specific field logic of its own.
- **Governance** — Permissions, Draft/Publish, and ideally Audit/Activity are wired in (§18).
- **AI Access** — the Capability is reachable from the AI Interface, within the Client's own
  permission ceiling (§17).
- **Review** — a real, deliberate check that the Capability behaves as intended — not implied by
  the earlier stages being done, a distinct closing step.

**Applied honestly to Catalog — this project's single most built-out Capability**:

| Stage | Status |
|---|---|
| Idea | ✅ (§12 confirms it passes the Proposal gate) |
| Contract | ✅ (§13) |
| Implementation | ⚠️ Reached, but not clean — `catalog_service.py` is a real, correct single path, but `store.py`/`restaurant.py` independently write the same tables (§19's Duplicate Architecture finding) |
| Interface | ⚠️ Partial — Dashboard ✅ real; Mobile ❌; tenant-authoring API ❌ |
| Governance | ⚠️ Partial — Permissions ✅ (§17); Draft/Publish ⚠️ provisional only (§8); Audit ❌; Activity ❌ |
| AI Access | ❌ Not built |
| Review | ❌ No formal Capability-level review has been conducted |

**The honest conclusion this table forces**: even Catalog — the most built Capability in the
project — is roughly a third of the way through this pipeline. Every other Capability in §20's
Maturity table is earlier still. This is the entire point of naming the Lifecycle explicitly: it
replaces a vague "is Catalog done?" with a specific, checkable answer.

---

## 16. Single Source of Truth Matrix — the most important table in this plan

This table is this document's own applied instance of the platform-wide principle now owned by
`.claude/rules/backend/architecture.md` §9 (§3, Principle 5) — not a second copy of that rule.
Its point is structural, not informational: **every Capability's data has exactly one model that
owns it, and exactly one code path that may write to that model.** No Interface — Dashboard, AI,
public API, a future Import Tool — may ever write to the database directly; every write goes
through that Capability's one canonical path.

| Capability | Source of Truth (model) | Intended single write path | Current reality |
|---|---|---|---|
| Products | `CatalogItem` | `catalog_service.py` | ⚠️ **Violated today** — §19, Duplicate Architecture |
| Categories | `CatalogCategory` | `catalog_service.py` | ⚠️ **Violated today** — §19, Duplicate Architecture |
| Units (Booking) | `Unit` | `unit_service.py` (exists) | ⚠️ **Violated today** — §19, Broken Architecture |
| Site Configuration / Theme / Home Sections | `Client.config` (Json) | `client_service.py` (exists) | ⚠️ **Violated today** — §19, Broken Architecture |
| Orders (Store/Restaurant) | `StoreOrder` / restaurant order model | No dedicated service exists | ⚠️ §19, Missing Architecture |
| Customers | `Customer` | `customer_service.py` (exists, correctly used) | ⚠️ Route unreachable — §19, Missing Architecture |
| Gallery / Media | `GalleryImage` | No dedicated service exists | ⚠️ §19, Missing Architecture |
| Team / Staff | `User` | No dedicated service exists | ⚠️ §19, Missing Architecture |

**Reading this table honestly, not optimistically**: almost no admin-side Capability has a clean
single write path *today*. `catalog.py` is the one file in this entire codebase that does it
correctly — Route → `catalog_service.py` → Repository. This is exactly the risk Salman named:
without this fixed first, an AI assistant, a Mobile app, or an Import Tool arriving "after a year"
would each face the same choice `store.py` and `restaurant.py` already made once — reimplement the
write logic directly against a repository — and each would make it independently, compounding the
exact problem this matrix exists to prevent. Closing this is real Implementation Contract work,
not performed in this document; §19 classifies each violation formally so none of it is lost among
smaller notes.

---

## 17. Capability Matrix — Governance: Permissions

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
| View / edit customer info | 🔜 (blocked on §19's Customers finding) | 🔜 |
| **Activate/deactivate a paid module (`client_services`)** | ❌ | ❌ |
| **Anything Platform-layer** (routing, checkout logic, WhatsApp integration, DB structure) | ❌ | ❌ |

This table is the artifact Salman asked for explicitly as a "golden reference": the day a Tenant OS
assistant is designed, its permission scope is "every ✅ row above, exactly, no more" — nothing
about AI trust needs to be re-decided at that point, only which ✅ rows to build a conversational
front-end for first.

---

## 18. Governance Layer — Permissions, Draft/Publish, Audit, Versioning, Activity

Per §5's anatomy, Governance is the third sibling alongside Capability and Interface —
cross-cutting concerns built **once** and inherited by every Capability, never re-implemented per
domain. Two of its five pieces already have real content elsewhere in this plan; three are named
here for the first time as real Gaps.

- **Permissions** — already designed: §17's Capability Matrix, read directly. Not repeated here.
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

**Why this section exists as its own thing, not folded into §13's Capability Contracts**: none of
these five concerns belongs to Catalog, or Orders, or any single Capability. A Draft/Publish
mechanism built inside the Catalog Capability and a separate one built inside the Content Capability
would themselves become a Duplicate Architecture finding (§19) the moment a second Capability
needed it — exactly the mistake naming Governance as its own branch is meant to prevent before it
happens once, let alone twice.

---

## 19. Architecture Integrity Findings

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
directly in `gallery.py`'s route handlers via `gallery_repo`. **Still open as of Sprint 2
(2026-07-22)** — Sprint 2 built `media_service.py` for one narrow, different path
(`hero.bg_image` via the Editing Engine's `ReplaceMedia` Operation, going through
`content_sections_repo.py`, not `gallery_repo`) — it does not touch, and does not close, this
finding. Booking's unit-gallery CRUD/reorder still has no Service layer.

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

**Finding — `PageBuilderTab.jsx` vs `CanvasPageEditor.jsx` — ✅ RESOLVED (2026-07-22).** Both files
deleted, along with the "محرر الصفحة" nav tab that mounted `CanvasPageEditor`, once Sprint 1
(`.claudedocs/work/tenant-os-sprint1/2026-07-22/`) proved the real replacement — the Editing
Engine (§14) editing the real rendered page through `EditableRegion` + Discovery + the Settings
tab's already-real iframe/`postMessage` bridge — across **two independent real fields**
(`content.hero.title`, `content.story.heading`), on two different real section components
(`HeroSection.jsx`, `StorySection.jsx`), with zero changes to `EditableRegion.jsx`, `discovery.js`,
or the click-capture/live-preview plumbing between the two. Per Salman's own words: *"في Sprint 1
كنت سأرفض [الحذف]. أما الآن... البديل لم يعد Prototype. بل أصبح المسار الحقيقي."* Real, verified
via CDP that the Dashboard's remaining tabs and console are clean after deletion — not just
assumed safe.

**Six of these seven findings remain unfixed in this document** — each still named, evidenced, and
classified, left for a future Implementation Contract to resolve, one category at a time.

---

## 20. Capability Maturity

Salman's addition: not every Capability is at the same stage of §15's Lifecycle, and saying "X
exists" without a maturity label is misleading — this is exactly what prevents a sentence like
"Customers is done" from hiding the fact that its route isn't even mounted.

**The five stages, defined against §15's Lifecycle**:

- **Reserved** — an Idea only; no real code yet.
- **Experimental** — real code exists, but is unreliable, unreachable, unguarded, or usable within
  only one module rather than as a general Capability.
- **Developing** — Contract and at least one working Interface exist, but Implementation carries a
  known Architecture Integrity Finding (§19) and/or Governance is largely absent.
- **Stable** — Implementation is clean (no open Integrity Finding) and at least one Interface works
  correctly; Governance and AI Access are still incomplete.
- **Mature** — Contract, clean Implementation, Interface, and Governance are all real; only AI
  Access/Review may remain.

**Applied honestly to every real Capability in this codebase**:

| Capability | Stage | Why |
|---|---|---|
| Catalog | Developing | Contract + Dashboard real; Implementation carries the live Duplicate-Architecture finding (§19) |
| Category | Developing | Shares `catalog_service.py` and the same Duplicate finding as Catalog |
| Site Configuration | Developing | Contract + partial Dashboard real; Implementation carries the live Broken-Architecture finding (§19) |
| Content | **Stable** (2026-07-22, up from Developing) | Its own clean `content_service.py` (no shared Broken-Architecture finding with Site Configuration anymore — separated per §1a's ratified decision), a real Dashboard Interface proven across 2 independent fields/components (Sprint 1 evidence, `.claudedocs/work/tenant-os-sprint1/2026-07-22/`). Governance (Draft/Publish, Audit) and AI Access still incomplete, per §20's own definition of Stable |
| Theme | Developing | A narrower slice of Site Configuration (§10), same underlying finding |
| Orders | Developing | Dashboard works in production today; Implementation is Missing Architecture (§19) |
| Media | Experimental (2026-07-22: one new real Interface path added, still Experimental overall) | Booking's unit-gallery context remains Missing Architecture (§19) unchanged. Separately, `hero.bg_image` now has a real, clean, verified end-to-end path through the Editing Engine (`media_service.py` → `content_sections_repo.py`, Sprint 2 evidence: `.claudedocs/work/tenant-os-sprint2/2026-07-22/`) — but it is one field on one section type, not a general cross-module Media Capability (no Media Library, no browse/reuse). Stays Experimental until the broader Contract (§13) is actually built, not just one Operation type proven |
| Customers | Experimental | Service correctly built, but its route is unmounted and unguarded — unreachable end-to-end |
| Team / Staff | Experimental, pre-Contract | Real, working code exists (`team.py`) but was never elevated to its own §13 Contract, and never passed §12's Proposal gate — skipped straight past Idea/Contract; Implementation is Missing Architecture |
| AI | Reserved | Not built — an Interface sibling (§11), not a Capability |

**Why this table matters as much as Salman says it does**: "the Customers Capability exists" is
not a safe sentence on its own. It exists at **Experimental**, not Mature — a distinction that
matters the moment more than one person is touching this code.

---

## 21. Capability Acceptance Criteria

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
| Audit | ❌ Gap (§18) | 0 |
| Activity | ❌ Gap (§18) | 0 |
| Permissions | ✅ Real rows exist in the Capability Matrix (§17) | 1 |
| Draft/Publish (applicable here) | ⚠️ Provisional only — Publish today ≈ `isActive`, not the staged mechanism §8 describes | 0.5 |
| Documentation | ✅ Real — `catalog-contract.md`, `service-system.md`'s table entry, this plan's own §13 contract | 1 |

**Total: 4.5 / 9 ≈ 50%.**

This is a real, computed number, not an illustrative one — included specifically because it's
honest: even the single most built-out Capability in this project is roughly halfway to complete by
this standard. Every other Capability in §20's Maturity table would score lower still. This is the
entire value of naming Acceptance Criteria explicitly: it replaces a feeling ("Catalog seems done")
with an auditable number anyone can recompute.

---

## 22. Capability Health Dashboard — team-facing view

Salman's addition: turn §21's number into a progress bar, and pair it with §15's per-stage
readout — together, a single-glance status view the team itself can use, rather than a sentence in
a report. This section is a **summary view built from §15/§19/§20/§21's detailed derivations
above** — it does not re-derive anything independently.

**Editing Engine Gate — ratified 2026-07-22, per Sprint 1's real evidence
(`.claudedocs/work/tenant-os-sprint1/2026-07-22/`)**, in Salman's own words:

```
Editing Engine Status: PROVEN (2 independent production paths)

Engine Core:               ✅ Stable
Discovery:                 ✅ Stable
EditableRegion Contract:   ✅ Stable
Live Preview:              ✅ Stable
Content Capability:        ✅ Proven

Next architectural watchpoint: when CONTENT_FIELDS (the small local field-config
map in GenericAdminDashboard.jsx, §14) becomes difficult to maintain — not before —
introduce a Schema Registry. Not a prediction; an objective trigger to watch for.
```

This is the real gate that authorized deleting `CanvasPageEditor.jsx`/`PageBuilderTab.jsx` (§19) —
before Sprint 1's second field, this would have been refused; after two independent real cases
proved the Engine itself doesn't change per field, the replacement stopped being a prototype and
became the real path.

**Sprint 2 update — Operation-type generalization, verified 2026-07-22
(`.claudedocs/work/tenant-os-sprint2/2026-07-22/SPRINT2_EVIDENCE.md`)**:

```
Editing Engine Status: PROVEN across 2 Capabilities AND 2 Operation types

Engine Core:               ✅ Stable  (zero changes for ReplaceMedia, same as the 2nd field)
Discovery:                 ✅ Stable  (unchanged, still unwired — see §14's own note)
EditableRegion Contract:   ✅ Stable  (zero changes for the image/file case)
Live Preview:              ✅ Stable  (same PREVIEW_UPDATE bridge re-renders a new image URL)
Content Capability:        ✅ Proven  (Sprint 1)
Media Capability:          ⚠️ Partial (one field, hero.bg_image, proven — NOT the full
                                       Media Contract; Booking's unit-gallery Missing
                                       Architecture finding, §19, is untouched)

Real bug found this sprint: schema entries conflated dataField (the section.data key)
with the API's own body key. Content's two fields happened to share the same name for
both, hiding the gap; Media's route didn't, and exposed it as a real 422. Fixed by
adding an explicit apiField to every schema entry — the correct general shape going
forward, not a one-off patch.
```

**Catalog** — the only Capability scored at full, per-criterion rigor (§21):

```
Catalog
█████░░░░░ 50%

Contract        ✅
Implementation  ⚠️
Interface       ⚠️
Governance      ⚠️
AI Access       ❌
Review          ❌
```

**Every other real Capability** — approximate order-of-magnitude bars only, derived from their
already-established Architecture Integrity Findings (§19) and Maturity stage (§20), **not
independently re-scored criterion-by-criterion the way Catalog was** — flagged here explicitly so
this reads as honestly approximate, not false precision:

```
Category              █████░░░░░ ~50%   (same profile as Catalog, §20)
Site Configuration     ████░░░░░░ ~44%   (Developing — Broken Architecture, §19)
Content                ████░░░░░░ ~44%   (rides Site Configuration's mechanism)
Theme                  ████░░░░░░ ~44%   (narrower slice of Site Configuration)
Orders                 ███░░░░░░░ ~38%   (Developing — Missing Architecture, §19)
Media                  ███░░░░░░░ ~38%   (Experimental — single-module only)
Team / Staff           ██░░░░░░░░ ~25%   (Experimental, pre-Contract, §20)
Customers              █░░░░░░░░░ ~13%   (Experimental — unreachable route, §19)
```

**A future Implementation Contract that wants exact figures for these** would repeat §21's
per-criterion table for each — a reasonable, bounded piece of future work, not performed here to
avoid presenting invented precision for Capabilities this pass didn't score at that depth.

---

## 23. Rollout Phases

Salman's sequencing, including his closing review verdict on when the Client Journey Audit
actually belongs in this sequence:

- **Phase 1 — Fix the vision.** ✅ Done: the three layers (§4), the Tenant OS anatomy (§5), the
  Dashboard First Principle and constitution reference (§3), the Content Ownership Matrix (§6),
  the Theme boundaries (§10).
- **Phase 2 — Write the contract.** ✅ Done: the Capability Proposal gate (§12), Capability
  Contracts (§13), the Editing Engine (§14), the Capability Lifecycle (§15), the Single Source of
  Truth Matrix (§16), the Capability Matrix (§17), the Governance Layer (§18), the classified
  Architecture Integrity Findings (§19), Capability Maturity (§20), Capability Acceptance Criteria
  (§21), and the Capability Health Dashboard (§22).
- **Phase 2.5 — Adopt as Reference Architecture.** Salman's explicit closing verdict: reviewing
  this document is not the same as implementing anything, and once accepted, this document itself
  becomes the standing reference every future Capability is built against and reviewed against —
  a formal adoption decision, distinct from and prior to any implementation work. **Not yet
  adopted** — this revision is what would be adopted. Salman separately noted that once adoption
  happens, the document's own name should likely change — "Plan" undersells something that is no
  longer describing *what will be done* but *how the system is built* — with `TENANT_OS_
  ARCHITECTURE.md` or `TENANT_OS_REFERENCE_ARCHITECTURE.md` as candidates. Recorded here as an
  intention tied to adoption, not executed in this revision.
- **Phase 3 — Build the first group of Capabilities against this reference.** Real implementation
  work: closing §19's Broken/Missing/Duplicate findings, moving at least one Capability
  meaningfully forward on §15's Lifecycle and §20/§21's Maturity/Acceptance scales. Outside this
  document's scope — a future Implementation Contract's job.
- **Phase 4 — Client Journey Audit.** Deferred until **after** Phase 3 produces real, working
  Capabilities, not immediately after this document is reviewed (§24). Measures the real owner
  experience against a genuinely built product, not a freshly-written contract.

---

## 24. Next Step — the Client Journey Audit (Phase 4, gated on real implementation)

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

Each step maps to a named Capability from §13, scored against §20's Maturity and §21's Acceptance
Criteria — so the audit measures a real, bounded, *already-built* product against a real, bounded
contract, not a moving target or a document that was only just approved.

**Success bar**: a non-technical person completing this journey in **15-20 minutes**, with the
qualitative observations above showing no point where they felt they needed a developer, is the
standard every future Tenant OS addition is measured against — and, per Salman's closing framing,
the real test of whether the Tenant OS is ready for genuine use, not just whether its screens work.

**Status**: not yet conducted, and explicitly not started in this revision — gated on Phase 2.5 and
Phase 3, per Salman's direction.

---

## 25. Architecture Boundaries — Generic / Tenant-specific / Plugin / Never

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

## 26. What this plan deliberately does not do

- No new API endpoints designed (the `CatalogItem`/`CatalogCategory` reorder gap, the Media
  Library, the Live Preview draft/publish mechanism, and the future AI action-vocabulary are all
  named, not designed).
- No new Prisma models or migrations proposed — every Content item in §6/§13 maps to a field that
  already exists, except the Gaps explicitly marked as such (Audit's extension of
  `SecurityAuditLog`, §18, is named as an option, not decided).
- No UI components, wireframes, or visual design.
- No decision on unifying `GenericAdminDashboard.jsx` and `SmarAdminDashboard.jsx` into one
  codebase — that is a real Implementation Contract's job, informed by this plan's boundaries.
- No resolution of the `client_services`-vs-role tab-gating conflict named in §25.
- No fix to any of §19's seven classified Architecture Integrity Findings — all seven are named,
  evidenced, and categorized, none are fixed here; all are code changes outside this document's
  declared scope.
- No formal adoption of this document as Reference Architecture, and no rename — both are Phase
  2.5 (§23), a decision for Salman to make, not something this document can grant itself.
- No independent per-criterion Acceptance scoring for any Capability besides Catalog (§22) —
  approximate bars only, explicitly flagged as such.
- No Editing Engine implementation (§14) — no Schema file format, no Discovery-registry mechanism,
  no `EditableRegion` registration technique, no message-payload shapes for the Dashboard's
  Interface-specific rendering choice. Named as the correct layer, not built.
- No Client Journey Audit conducted — explicitly deferred to Phase 4 (§24), gated on Phase 2.5's
  adoption and Phase 3's real implementation, per Salman's direction.
