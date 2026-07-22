# TENANT_OS_IMPLEMENTATION_REVIEW.md — Review Before Implementation

**Status:** Review only, per Salman's explicit instruction ("لا تعدل. فقط سجل"). `TENANT_OS_PLAN.md`
was **not** edited while producing this document — every finding below is recorded here, not fixed
in the source. Answers Salman's 8 review questions, in the order asked, then closes with the
requested deliverables: Dependency Graph, Risks, Missing Pieces, Sprint 1 Plan, Success Criteria.

`TENANT_OS_PLAN.md` (all 26 sections) and `.claude/rules/backend/architecture.md` §9 were re-read
in full for this review, not recalled from memory — several of the findings below only surfaced
from that fresh reading.

---

## 1. Contradictions, incomplete Capabilities, unclear Layers

Four real issues found. None are fixed here.

### Finding 1 — Content, Site Configuration, and Theme have an unresolved boundary (the most important finding in this review)

§13 presents **Content**, **Site Configuration**, and (§10) **Theme** as three separate
Capabilities, each with its own Contract. But §16's Single Source of Truth Matrix merges Site
Configuration/Theme/Home-Sections into **one single row** — one model (`Client.config`), one
intended write path (`client_service.py`). Content's own real fields (Hero headline, About copy)
also live inside `Client.config.content` — the same JSON blob. As written, it is not resolvable
from the document alone which Capability owns which specific key inside `Client.config`, and the
SSoT Matrix's own merge implies they may not need to be three Capabilities with three separate
Contracts at all. This must be settled before Sprint 1, not discovered during it — Sprint 1 cannot
mark up `EditableRegion` contracts for a Capability whose boundary isn't fixed.

**A workable resolution, recorded here as a recommendation, not applied to the plan**: Content
owns keys inside `Client.config.content.sections[]` (page copy — Hero text, About text, etc.);
Site Configuration owns direct `Client.*` scalar fields (name, email, `whatsapp_number`, currency)
plus non-section `Client.config` keys; Theme (§10) stays the already-narrow visual-token subset of
Site Configuration it's already scoped as. Under this resolution, Hero Title is unambiguously
Content's.

### Finding 2 — Booking's real Capabilities were never given Contracts

§6's Content Ownership Matrix lists real Booking content (Units, `content_blocks`, `amenities`,
`rules_policies`, add-on Services, Staff/Team) as tenant-owned and mechanism-backed. None of these
received a Capability Contract in §13. §16's SSoT Matrix references "Units (Booking)" and "Team /
Staff" as if they were established Capabilities (assigning them Source-of-Truth rows and
Architecture Integrity findings), but §13 never defines either as a Capability, and §20's Maturity
table only picks up "Team / Staff" (correctly flagging its own pre-Contract status) — **"Units
(Booking)" appears in §16 but nowhere in §13 or §20 at all.** This is a real completeness gap in
the document itself, not a contradiction in meaning — but it means anyone reading §13 alone would
not know Booking's own capabilities exist as tracked entities elsewhere in the same document.

### Finding 3 — `EditableRegion`, as currently written, is not a pure Contract (see Q6 below for the full analysis)

§14's own text describes `EditableRegion` as rendering children "inertly" for a visitor and
"registering" for an editor — two different runtime behaviors baked into one component. This is a
real, if narrow, Layer-clarity issue: a Contract should be a declaration; deciding *how* to behave
differently for a visitor vs. an editor is Renderer-layer responsibility. Not fixed here — see Q6.

### Finding 4 — Draft/Publish is assumed live by §11 and §14 but is still explicitly unbuilt per §8

§11 (Future AI) says the AI "may draft changes ... into the same Governance-layer Draft/Publish
mechanism (§8)" as though that mechanism already exists to plug into. §8 itself is explicit that
the staging mechanism is "real schema work for a future Implementation Contract" — not decided,
not built. This isn't a logical contradiction (both sections correctly call it a Governance
mechanism, not a Content mechanism), but it is a real planning gap: nothing in the document says
what happens when Sprint 1 needs to save a real edit *before* Draft/Publish exists. See Sprint 1
Plan below for the explicit decision this review makes about that gap.

**Nothing in these four findings blocks Sprint 1 outright** — Finding 1 must be resolved as
Sprint 1's own first step (cheap: it's a naming/ownership decision, not new code); Findings 2 and 4
are named risks/scope decisions Sprint 1 works around explicitly (see below), not defects that
need fixing first.

---

## 2. Dependency Graph

Salman's own sketch put `Editing Engine` at the top with `EditableRegion → Discovery Engine →
Schema Renderer → Interfaces` beneath it. After review, the real build-order dependencies are
slightly different — `EditableRegion` doesn't actually depend on `Discovery` existing to be
*written*; it depends on a Capability's *Schema* existing, so the key it names is valid. Discovery
depends on `EditableRegion` markup already being *present in real code* to walk. The Dispatcher
depends on the Capability's one real canonical Service existing — independent of Discovery
entirely, and testable on its own before any UI exists:

```
1. Capability Schema
   (per-Capability: which keys exist, which Operation types apply to each)
        │
        ├──────────────────────────────┐
        ▼                              ▼
2. Operation Dispatcher          3. EditableRegion markup
   (resolves {capability,key,       (declares capability+key on
    operation} → the Capability's    real, already-existing JSX —
    one real canonical Service —     depends only on the Schema
    can be built/tested standalone,  above existing, not on anything
    e.g. via a direct test call,     built in steps 2 or 4)
    before any UI exists)
        │                              │
        │                              ▼
        │                       4. Discovery
        │                          (walks EditableRegion markup into
        │                           a Page → Region → Field →
        │                           Operations tree)
        │                              │
        └──────────────┬───────────────┘
                        ▼
              5. Dashboard Schema-Renderer
                 (reads Discovery's tree + the Schema to draw
                  inline-editable regions on the REAL rendered
                  page; calls the Dispatcher on save)
                        │
                        ▼
              6. AI / API / Mobile
                 (consume the same Discovery tree + the same
                  Dispatcher directly — zero new per-Interface
                  implementation, which is the entire point)
```

**Why this differs from the sketch**: putting `EditableRegion` and `Discovery` in one straight
line hides that they can be built and even partially tested in parallel with the Dispatcher, and
that both genuinely depend on the Schema (step 1) existing first — a dependency the original sketch
left implicit. Step 6 requiring *zero* new work per Interface is the actual test from Q4/Q8 of the
brief, made visible directly in the graph rather than asserted separately.

---

## 3. The real Tenant OS MVP (not a Dashboard MVP)

The least possible thing that lets anyone honestly say **"the Tenant OS is alive"**:

**One real Capability. One real field. Every layer of the anatomy genuinely exercised, none
mocked.** Concretely: Content Capability's Hero Title, with a real Schema entry, a real
`EditableRegion` contract wrapping the real `HeroSection.jsx`, a real Discovery response
enumerating exactly that one field, a real Dispatcher call resolving to Content's one real
canonical Service, that Service writing to the real `Client.config.content` row, and the Dashboard
showing that edit reflected on the real live page. If every one of those steps is real rather than
stubbed, the Tenant OS is alive for one field — proof the *architecture* works, independent of how
much *content* it currently covers. This is deliberately not "a nicer page editor is live" — it is
"Capability → Operation → Schema → Renderer is a real, working path," which is the actual claim
this whole document has been building toward.

---

## 4. First Capability: Content

**Content**, starting with the Hero Title field specifically. Reasoning, grounded in the plan
itself, not preference:

- **Runs cleanly through §12's Proposal gate** (not previously done explicitly for Content — done
  here as part of this review, since Sprint 1 is about to build against it):

  | Question | Content's answer |
  |---|---|
  | Problem, for whom? | Tenants need to change their own page copy (Hero, About) without a developer |
  | New or extension? | Extension of the already-real `Client.config.content` mechanism — not new storage |
  | More than one Interface? | Yes — same reasoning as Catalog's (§12): Dashboard real today, AI/API reserved |
  | Source of Truth? | `Client.config` — real, if currently reached through a Broken write path (below) |
  | Client's own success measure? | "I can change my Hero's headline and see it live on my real site" |

  Content passes cleanly, the same way Catalog did.

- **Every real Capability in §16's Matrix carries an open Architecture Integrity Finding — there
  is no clean one to start from.** This is itself a real finding worth naming: Products/Categories
  is Duplicate (fixing it means migrating two live route files, `store.py`/`restaurant.py`, off a
  direct-repo path — real risk to three live tenants); Units is Broken; Orders/Customers/Gallery/
  Team are Missing (writing a Service from nothing is more work than rerouting an existing call).
  **Content/Site Configuration's Broken-Architecture finding is the cheapest to close**: a real
  Service (`client_service.py`) already exists and only needs (a) `settings.py` rerouted to call it
  instead of `admin_client_repo`, and (b) its own small internal defect fixed (it currently calls
  `prisma_client` directly instead of through a repository) — two contained changes in one small
  file pair, touching no other live route file. This is why Content, not Catalog, is Sprint 1's
  first Capability, even though Catalog is more built-out overall (§20) — Sprint 1 is optimizing
  for the safest real fix, not the most mature Capability.

---

## 5. Is Discovery sufficient?

**Not fully — two real gaps found, both worth naming now rather than after AI/Mobile arrive.**

1. **Discovery has no stated relationship to Permissions (§17).** As written, Discovery either
   exposes every declared field to any caller, or the document is silent on whether it filters by
   the caller's own permission ceiling. For Sprint 1 (Dashboard-only, TENANT_ADMIN-only) this is a
   low-risk gap — but the moment AI or a lower-privileged role exists, Discovery must filter its own
   tree by §17's Capability Matrix, or a caller could discover fields it has no right to invoke,
   only failing at the Operation-execution step. Not a Sprint 1 blocker; a real gap to close before
   Phase where AI/roles beyond TENANT_ADMIN are added.
2. **Discovery's handling of repeatable/list fields is underspecified.** §14's own Testimonials
   example uses `items[].quote` — a schema-level notation for a repeatable field — but the document
   never states whether Discovery enumerates each *existing* real item on a page (Region → Field →
   *actual item 1, item 2, item 3* → Operations) or only the *shape* a list field takes. This
   matters concretely the moment a second Capability with a real list (Testimonials, or Category's
   product list) is built — not a Sprint 1 blocker, since Hero Title is a scalar field, but a real
   gap Sprint 2 (whichever Capability has a list) will hit immediately.

---

## 6. Is `EditableRegion` really just a Contract?

**No — as currently described, it carries one real Renderer-level responsibility it shouldn't.**

§14's text: *"for a real visitor it renders its children inertly ... for any editing context, it
registers ... into a Discovery registry."* That is two distinct behaviors — (a) a declaration
(`{capability, key}`, pure data) and (b) a runtime decision about *how to render differently*
depending on visitor-vs-editor context. (b) is Renderer responsibility per §14's own stated
division of labor ("None of them contain field-level business logic; all of it lives once, in the
Capability's Schema") — a Contract that also decides its own rendering behavior is a small amount
of exactly the kind of logic §14 says shouldn't live outside the Schema/Renderer split.

**Recorded, not fixed**: the cleaner shape is a `EditableRegion` that is *purely* a registration —
it always renders its children plainly, with zero conditional behavior of its own — and a
*separate*, thin mechanism (a wrapping component or a build-time/runtime scan, decided at
implementation time) that reads the same registrations to overlay editing affordances only when a
Dashboard/editor context is active. This keeps the "Contract" genuinely inert and declaration-only,
which is what Salman's own question was checking for.

---

## 7. Does the Editing Engine need a Dispatcher / Registry / Capability Manager / Schema Registry / Operations Registry?

Reviewed against what Sprint 1 (one Capability, one field) actually requires — **two of these are
real and needed now; the other three would be premature**:

- **Operation Dispatcher — needed.** Real, required by the graph above: something has to resolve
  `{capability, key, operation, value}` to the right Capability's Service call. This is the one
  piece of new runtime logic Sprint 1 cannot avoid building.
- **Discovery registry — needed.** Real, required to walk `EditableRegion` markup into the
  Page/Region/Field/Operations tree Q5 describes.
- **A separate "Schema Registry" service — not needed yet.** A Capability's Schema can be a plain,
  static exported definition per Capability module, read directly by the Dispatcher and Discovery.
  Standing up a dedicated registry *service* for something one real Capability currently needs
  would be exactly the premature abstraction the project's own Abstraction Rule (`rules/team-
  roles.md`) warns against — earned only once a second real Capability proves the same shape is
  actually reused, not assumed in advance.
- **A separate "Capability Manager" — not needed yet**, for the same reason. Its job (knowing which
  Capabilities exist, which Service each owns) is exactly what the Dispatcher's own internal lookup
  table already does for one Capability; splitting it into its own component now would be
  architecture built ahead of a second real case that would justify it.
- **A separate "Operations Registry"** — not needed as a distinct thing from the fixed, small
  Operation-type vocabulary (`UpdateField`, `ReplaceMedia`, `ReorderList`, `ToggleVisibility`)
  §14 already names. These are a closed, small set, not a growing collection that needs its own
  registry to manage.

**Net answer**: build the Dispatcher and Discovery for real; do not build the other three now.

---

## 8. Sprint 1 Plan

Scope, narrow and explicit about what it excludes:

**In scope**:
1. Resolve Finding 1 (Content vs. Site Configuration vs. Theme boundary) — a naming/ownership
   decision, not code; blocks nothing once decided.
2. Fix Content/Site Configuration's Broken-Architecture finding: reroute `settings.py` to call
   `client_service.py`; fix `client_service.py`'s own internal Prisma-direct-call defect. This is
   real Implementation-stage work per §15's Lifecycle — not scope creep, the necessary precondition
   for a genuinely clean canonical Service to dispatch to.
3. Define Content's real Schema for exactly one field: Hero Title.
4. Build the Operation Dispatcher, scoped to the one Operation type Hero Title needs
   (`UpdateField`) and the one Capability (Content).
5. Add one real `EditableRegion` contract around `HeroSection.jsx`'s real title field.
6. Build Discovery, scoped to walking exactly this one registration.
7. Build the Dashboard's Schema-Renderer for exactly this one field — inline-editable on the real
   rendered page, not a mockup canvas.
8. **Explicit decision on Draft/Publish (Finding 4)**: Sprint 1 writes directly to `Client.config`
   on save — no staging, no separate draft state. This is a deliberate, named simplification, not a
   silent omission; real Draft/Publish (§8) is Sprint 2+ work, once a second Capability's real need
   for it proves the shape (Abstraction Rule), same reasoning §8 itself already gives.

**Explicitly out of scope, not started even partially**: AI Interface, Mobile, Public API, Voice,
Draft/Publish staging, Versioning, Activity, Audit, any second field, any second Capability,
`CanvasPageEditor.jsx`/`PageBuilderTab.jsx` deletion (real, correct future work, but not required
for Sprint 1's own success and safer to do once the new path is proven).

---

## Success Criteria

Sprint 1 is done when, and only when, all of the following are true with real data, not a demo
stub:

1. A real admin, in the real Dashboard, sees beit-al-fakhar's (or any real tenant's) actual live
   Hero Title rendered inline and editable, on the real page — not a separate canvas.
2. Editing it and saving calls the real Dispatcher, which calls the real (now-fixed)
   `client_service.py`, which writes the real `Client.config.content.hero.title` field.
3. Reloading the tenant's real public page shows the new title — the same real rendering pipeline
   a visitor uses, per §8's principle, not a parallel one.
4. `settings.py` no longer bypasses `client_service.py` for this path, and `client_service.py` no
   longer calls Prisma directly — Finding 1 (Content/Site-Config boundary) resolved and one real
   line of §19's Architecture Integrity Findings closed, not just worked around.
5. A new developer reading this review plus `TENANT_OS_PLAN.md` can, without asking anyone,
   correctly answer: *what Capability are we building on, what does "done" mean for it this
   sprint, and why isn't AI/Mobile/Draft-Publish/Versioning part of it yet.*

If Testimonials or any second Capability is added later using the exact same Dispatcher/Discovery
without new Interface-specific code, that is the real confirmation the architecture — not just one
field — is what actually shipped in Sprint 1.
