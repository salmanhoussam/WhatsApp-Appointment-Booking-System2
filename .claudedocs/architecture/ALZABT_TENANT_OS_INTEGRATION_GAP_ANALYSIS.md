# Alzabt SaaS × Tenant OS × Section System × Vertical Repertoires — Integration Gap Analysis

**Status:** Investigation only. No code, no DB, no tenant data, no redesign, no P0 work. Answers
Salman's explicit request: read `.claudedocs/architecture/` in full, determine how Alzabt SaaS
should integrate with Tenant OS + Capabilities + the Section System + Vertical Repertoires, and
name every gap/contradiction between the written design and the real, current code. **No document
was silently edited** — every conflict found is named below with a recommendation for which
document should become canonical; the decision stays Salman's.

**Method**: every claim below cites a real file/line or a real document section — nothing is
inferred from memory of prior sessions. Full list of what was read is in the Comparison section.

---

## Gap Analysis — the 10 questions, answered with evidence

### 1. هل Section System الحالي مبني فوق Tenant OS بالطريقة الصحيحة؟

**Partially, by accident, not by design.** The Section System's real storage
(`Client.config.content.sections[]`, rendered by `DynamicPage.jsx` → `SECTION_MAP`) **is** the
exact same field the Content Capability already claims ownership of
(`capabilities/content.md`: *"`Client.config.content.sections[]` — an ordered array; each entry
has a `type`... Rendered by `DynamicPage.jsx` → `SECTION_MAP`"*). So structurally, the Section
System already sits on top of a real Tenant OS Capability's schema — but:

- **It never passed the Capability Proposal Gate** (`TOS-003`) as its own thing. Is "the Tenant
  Website / Section System" the Content Capability itself, a new Capability, or an Interface
  (a rendering surface) over several Capabilities at once? None of the 6 `ALZABT_*.md` documents
  ask this question, and `content.md` doesn't mention vertical repertoires, `featured_items`
  reading live data, or any of the new work at all.
- **It quietly crosses a Capability ownership boundary the Content Capability itself declares.**
  `content.md`'s own Ownership line: *"Explicitly distinct from Catalog's product data."* But
  `featured_items` (a `content.sections[]` entry) fetches **live Catalog/Reservations data at
  render time** (`FeaturedItemsSection.jsx:51`, `fetchAllCategories(slug)`) — a Content-owned
  config object that embeds a live read from a different Capability, with no Capability Contract
  anywhere documenting that this is allowed, or which Capability actually owns the result once it
  renders. `categories_grid` does the same thing.
- **Site Configuration's own Known Boundary Debt (Hero fragmentation) is the same failure shape,
  smaller scale, already documented — but never cross-referenced from any `ALZABT_*.md` doc.**
  `site-configuration.md` already spent real effort correcting exactly this kind of "one concept
  split across capability boundaries" problem for Hero; the Section System repeats the same shape
  (a "Services" section that is neither fully Content, nor fully Catalog, nor fully Reservations)
  without anyone noticing the precedent.

**Verdict: not built "correctly" on Tenant OS — built on Tenant OS's real schema, without ever
being named as a Capability, Interface, or documented cross-Capability read, so nothing enforces
its Contract.**

---

### 2. هل الـSections تقرأ من الـCapabilities الصحيحة، أم عندنا coupling مخفي؟

**Real, hidden coupling confirmed in three places, not one:**

1. **`featured_items` ↔ retail `catalog` service key** (already known from the Work Sequence doc,
   re-confirmed against current code): `FeaturedItemsSection.jsx:10` still imports
   `fetchAllCategories`/`fetchItems` from `services/catalogApi.js`, which calls
   `/{slug}/catalog/categories` (`app/api/v1/public/__init__.py:227`), gated behind
   `require_service("catalog")`. A real, already-built, correct alternative exists and has since
   **2026-08-08 (Phase 3.7C)**: `GET /reservations/catalog-services`
   (`app/api/v1/public/reservations.py:150-167`), gated behind `require_service("reservations")`,
   whose own docstring literally says it *"replaces the old client-side pattern of walking every
   Category, fetching every CatalogItem, and filtering by `metadata.requires_booking`"* — exactly
   what `FeaturedItemsSection.jsx` is still doing. **This isn't a design gap, it's a real regression
   the frontend never picked up after the backend fixed it.**

   **Why it "works" for some tenants and not others — the coupling, precisely**: `catalog` and
   `reservations` are bundled together by convention in exactly two seeding paths —
   `demo_service.py`'s `_SERVICE_MAP["barbershop"]` and `registration_service.py`'s
   `_SERVICE_SEED_MAP["barbershop"]` (`["booking", "reservations", "catalog", "whatsapp_ordering"]`
   in both). A tenant seeded through either path happens to have `catalog` active, so the wrong
   endpoint accidentally returns *something* (real retail categories, if any exist, or nothing if
   not) instead of 403ing. Ali's real `403 Forbidden` (already confirmed this session) means Ali
   was **not** seeded with `catalog` active despite being a `barbershop`-type tenant — proving the
   correlation is a seeding-order accident, not a real capability relationship. Any tenant onboarded
   through a path that doesn't happen to also flip `catalog` will break the same way.

2. **`staff` (proposed, not yet built) ↔ `Barber`-only data.** The Section System Contract
   recommends `staff` *"read real `Barber` data"* without naming that **Barber and Clinic's staff
   equivalent are two different, deliberately un-merged models** (`prisma/schema.prisma`: `Barber`
   at line 845, `Resource` at line 807 — kept independent on purpose per
   `.claudedocs/evolution/reservation-capability.md`'s 2026-07-31/2026-08-05 entries, with two
   named, still-unfired extraction triggers). Their public endpoints differ in shape too:
   `GET /reservations/barbers` (no params) vs. `GET /reservations/resources?resource_type=` (needs
   a type filter). A single `staff` component that "just reads real Barber data" is Barber-only by
   construction — it cannot serve Clinic's "Doctors" without a real design decision this Contract
   never made. This is the single clearest instance of the exact risk Salman named directly in the
   Proposal round: *"designing the whole system around Barber."*

3. **`hours` ↔ free-authored text instead of real `working_hours`** — already named in the Contract
   and Work Sequence docs (P0.2), confirmed still true: `working_hours` is real, structured, and
   already read by `ReservationsTab.jsx` for the admin calendar and by
   `reservation_service.py:90-102` for the actual booking engine; the public `hours` section reads
   none of it.

**Pattern across all three: whenever a section needs real business data, its actual data-source
design has either broken (1), gone unresolved (2), or been left as a named-but-unfixed gap (3) —
never fully, correctly wired to the one real Capability that owns the data.**

---

### 3. كيف يجب أن يعرف النظام الـVertical؟

**Today: it doesn't, consistently.** Three separate, disconnected signals exist, and none of them
is "Barber vs. Clinic vs. Beauty" in the sense the Matrix/Contract documents need:

| Signal | Real values today | Owner |
|---|---|---|
| `Client.templateKey` | Maps into `frontend/src/config/template-registry.js`'s **20** templates (incl. `health-clinic`, `health-pharmacy`, `beauty-barber`, etc.) | Self-registration flow (`TenantRegisterPage.jsx`) |
| `Client.service_type` (`_VENUE_TYPE_MAP`'s output) | Only 4 real values: `restaurant`, `ecommerce`, `real_estate`, `barbershop` — **no `clinic`, `beauty`, or `spa` value exists anywhere in the backend** | Demo Builder (`demo_service.py`) |
| `client_services` active-services array | Plural capability membership (`hasCapability`) — answers "is `reservations` active," never "which vertical is this" | Everywhere (TOS-004) |

None of these three is the field the `ALZABT_VERTICAL_REPERTOIRE_MATRIX.md` assumes exists when it
says "Barber gets repertoire X, Clinic gets repertoire Y." **This is a real, undecided architecture
question, not a data-entry gap** — until it's resolved, P3 (curating `page_templates/{vertical}.json`
files) has nothing mechanical to key off at provisioning time beyond manual, one-off authoring
per tenant, which is exactly the "developer populates content by hand forever" problem Tenant OS
(`TOS-001` §4.2) exists to remove.

---

### 4. أين يعيش الـVertical repertoire: provisioning، tenant config، أم runtime؟

**The mechanism documents already answer this correctly, and it does not conflict with anything
real**: curated at provisioning time (a `page_templates/{vertical}.json` applied once, the same
mechanism `seed_page_content.py` already uses for `restaurant`/`store`/`booking`), stored in
tenant config (`Client.config.content.sections[]`), rendered at runtime
(`DynamicPage.jsx`/`SECTION_MAP`). No gap here in the abstract design.

**The gap is only that "provisioning" today has two disconnected real entry points** (see Q5/Q3),
and only one of them (`demo_service.py`'s barbershop path) has ever actually run a
`page_templates`-shaped seed for a Reservations-type tenant. `template-registry.js`'s
`health-clinic`/`beauty-barber`/etc. entries have **zero linkage** to `scripts/data/page_templates/`
at all (confirmed: no `page_content`/`seedPageContent`/`page_templates` reference anywhere in
`template-registry.js` or `TenantRegisterPage.jsx`) — a self-registered `health-clinic` tenant gets
real `CatalogCategory` rows seeded, but **no `Client.config.content.sections[]` populated at all**,
since only `store.json`/`booking.json`/`restaurant.json` exist and none matches `module_key:
"catalog"`. Its public page would render through whatever fallback `ConfigurableHero.jsx`'s legacy
`page_type: "showcase"` path does — the same "blank/unfinished tenant home" failure mode this
entire investigation arc started from, reachable through a second, older door nobody has looked at
yet.

---

### 5. كيف يدخل الـDemo Builder في هذا النموذج؟

**Cleanly, but only for one of two real onboarding doors, and only for Barber.**
`app/services/demo_service.py`'s `business_type: "barbershop"` branch is a real, working, minimal
instance of the whole mechanism: `_SERVICE_MAP`/`_VENUE_TYPE_MAP` → `_seed_demo_barbershop()` →
real `Barber` + `CatalogService` + `BarberService` rows → (separately, via the older
`scripts/data/ali`-style pipeline, not `demo_service.py` itself) an informal `barbershop_demo`
page-content template. No `clinic`/`beauty` `business_type` exists in `demo_service.py` yet — this
matches the Master Product Plan's own stated rollout priority (Barber now, Clinic gated, Real
Estate not now), so it is not, by itself, a bug.

**What none of the 6 `ALZABT_*.md` documents surface**: the Demo Builder's `business_type` map and
`template-registry.js`'s 20-template registry are **two independent, never-reconciled systems for
the same underlying question — "what kind of business is this tenant, and what should it get
seeded with."** Round 1's Open Question 4 (*"Where does vertical selection actually happen in the
product? Today only Barber exists as a real, working `business_type`..."*) is stated as an open
question, but it is actually **already answered twice, inconsistently, by two different real
systems** — not open for lack of an answer, open because there are two conflicting answers that
were never compared.

---

### 6. كيف نضمن أن Tenant جديد يحصل على موقع مناسب لنوع نشاطه بدون بناء website builder كامل؟

The architectural answer already proposed (curated Layer-2 preset + bounded Layer-3 customization,
"Configured Template," per the ratified Matrix decisions) is sound and reuses real, proven
infrastructure — this is not itself a gap. It is **blocked**, mechanically, by Q3 (no real Vertical
field) and Q5 (two disconnected provisioning paths): a "Configured Template" system needs a single,
reliable trigger to know which template to apply, and today there isn't one that covers both real
onboarding doors.

---

### 7. ما الذي يجب أن يكون Platform-level، وما الذي يجب أن يكون Tenant-level؟

**Already correctly answered — and not a gap.** `principles/P-002-content-vs-structure.md`'s
three-layer model (Platform/Template/Content) maps onto the Mechanism doc's own Layer
1/Layer 2/Layer 3 almost exactly (Section component code = Platform; which sections/order per
vertical = Template, developer-curated; real per-tenant content = Content, tenant-owned). This is
the one place the new `ALZABT_*.md` documents and the pre-existing Tenant OS principles already
agree, independently arrived at. **The only real gap here is a missed citation** — none of the 6
`ALZABT_*.md` documents reference `P-002-content-vs-structure.md`, `P-001-dashboard-first.md`, or
`theme.md`'s own Content/Template boundary table (which already documents "Section order," "Section
show/hide," and "Which section types exist at all" as exactly this same three tiers, for theming
specifically) — a second, independent Tenant OS document already modeling almost the same boundary
the new work re-derived from scratch.

---

### 8. ما الموجود حالياً ويمكن إعادة استخدامه، وما الذي يحتاج تغييراً جذرياً؟

**Reusable as-is, confirmed real:**
- `Client.config.content.sections[]` schema + `DynamicPage.jsx`/`SECTION_MAP` (10 of 12 components
  already exercised by a real Reservations tenant).
- `page_templates/*.json` + `seed_page_content.py` — proven mechanism, just never pointed at a
  Reservations vertical via the self-registration door.
- `GET /reservations/catalog-services`, `GET /reservations/barbers`, `GET
  /reservations/resources` — all real, public, already gated correctly by `reservations` — simply
  not yet consumed by the sections that should use them.
- The Content-vs-Structure boundary (`P-002`) — reusable as the exact governing principle for the
  Locked-vs-Customizable rule the Section System Contract already independently re-derived.

**Needs real, non-trivial decisions, not just code:**
- A single, real "Vertical" concept (Q3) — the biggest one.
- Reconciling `template-registry.js` vs. `demo_service.py`'s `business_type` map (Q5), or an
  explicit decision that only one of the two remains the real onboarding path for Reservations
  verticals going forward.
- A vertical-aware `staff` data source (Q2.2) — Barber-vs-Resource branching, not yet designed.
- Two new section components (`staff`, `credentials`) — already scoped in the Contract, unbuilt.
- A decision on whether "the Section System" is its own Tenant OS Capability, part of Content, or
  a cross-Capability Interface (Q1) — currently undecided by omission, not by a stated choice.

---

### 9. هل الـCapabilities الحالية كافية؟

**No — the single most important gap in this whole analysis.** Reservations is, by
`ALZABT_MASTER_PRODUCT_PLAN.md`'s own Section A, **the actual product**: *"عالزبط (Alzabt) is...
this platform's Reservations capability, built and packaged as one coherent, reusable booking-SaaS
product."* Yet:

- **There is no `capabilities/reservations.md`.** `INDEX.md`'s Capabilities table lists Content,
  Media, Site Configuration, Catalog, Category, Theme, Orders, Customers — Reservations is absent.
- **It never passed the Capability Proposal Gate** (`TOS-003`) — no Ownership Matrix, no Admin/
  Public Contract table, no Maturity/Open Findings tracking of the kind every other real Capability
  has, despite Reservations being architecturally *more* mature than most of them (a documented
  6-stage pipeline, live-verified across 2 independent Strategy cases, 3 feature-complete admin
  Views, per `.claudedocs/evolution/reservation-capability.md`).
- **`CatalogService` — Reservations' own bookable-item model — is invisible to the Capability
  system.** `capabilities/catalog.md`'s Ownership section names only `CatalogItem`/`CatalogCategory`
  as *"the single source of truth for any sellable item"* — `CatalogService` (a structurally
  different model, `prisma/schema.prisma:490`, with `durationMin` and a `BarberService` join table)
  is a materially different thing with no Capability file of its own and no mention in Catalog's.
- **Staff/Team is a named, known gap already** (`TENANT_OS.md`: *"Team/Staff (`team.py`, Missing
  Architecture)... has passed the Capability Proposal gate... neither"*) — confirmed still true;
  `Barber`/`Resource` (the real, working staff-equivalent models for Reservations specifically)
  aren't even the same thing `team.py` was originally about, adding a second, undocumented
  staff-shaped concept alongside the first.

Site Configuration, Theme, Content, Media, Catalog, Category, Orders, Customers cover real, but
comparatively peripheral, parts of what a tenant needs. The capability the entire product is named
after has no Contract.

---

### 10. أكبر 5 فجوات معمارية

Ranked by blast radius — how much of the planned P0-P3 work each one actually blocks or silently
undermines, not by how easy each is to fix:

1. **Reservations has no Tenant OS Capability Contract.** The product's actual core sits entirely
   outside the model that's supposed to govern how a tenant's data/config is owned, contracted, and
   exposed (Admin/Public split). Every other finding below is a symptom of this one absence — there
   is no Ownership Matrix to catch "featured_items shouldn't call the retail catalog gate" the way
   `site-configuration.md`'s own Ownership Matrix already catches Hero-fragmentation-shaped
   mistakes for a different Capability.
2. **No single, real "Vertical" concept exists.** Three disconnected signals
   (`templateKey`/`service_type`/`client_services` membership), none of them usable as "this tenant
   is a Clinic" the way the Matrix and Contract documents assume. Blocks P3 mechanically, not just
   as a curation exercise.
3. **Two independent, never-reconciled onboarding/vertical-selection systems.**
   `template-registry.js` (20 templates, real, live, self-registration-facing, already includes
   `health-clinic`) vs. `demo_service.py`'s `business_type` map (Barber-only, Demo-Builder-facing).
   Confirmed, concrete, functional consequence: a self-registered `health-clinic` tenant today gets
   `reservations` activated with **zero `Resource`/`Barber` rows ever seeded** (no reference to
   either model anywhere in `TenantRegisterPage.jsx` or `registration_service.py`) and **zero
   `Client.config.content.sections[]` populated** (no `page_templates/*.json` file matches
   `module_key: "catalog"`) — a tenant that can neither take a real booking nor render a real home
   page, through a door none of the 6 `ALZABT_*.md` documents ever looked at.
4. **The proposed `staff` section silently assumes Barber.** The one new section every vertical
   wants (Matrix: Recommended for all three), recommended to read "real Barber data," without
   resolving that Clinic's real staff-equivalent is a structurally different model and endpoint.
   Exactly the risk Salman named directly and asked every round to guard against — the one place it
   slipped through anyway.
5. **`CatalogService` (Reservations' bookable-item model) is absent from the Capability
   documentation system entirely**, even though it's precisely the data every vertical's Required
   `featured_items` section needs to read correctly (P0.1's whole subject) — a second, concrete
   instance of Gap #1, specific enough to name on its own.

---

## Comparison against the named documents

| Document | Consistent with this analysis? | Note |
|---|---|---|
| `ALZABT_PRODUCT_MODEL.md` | Mostly — its Open Question 4 (*"where does vertical selection happen"*) should be corrected: not open for lack of an answer, but because two real, disconnected systems already answer it differently (Gap #3 above). |
| `ALZABT_TEMPLATE_REPERTOIRE_MECHANISM.md` | Consistent, and its Layer 0/1/2/3 model is real and correctly separates Reservations engine from presentation. Its own claim "Layer 1 is Alzabt's shared capability, in the SaaS-architecture sense" is true in spirit but was never checked against whether Layer 1 (the Section System) is itself a *documented* Tenant OS Capability — it isn't (Gap #1). |
| `ALZABT_VERTICAL_REPERTOIRE_MATRIX.md` | Consistent and well-evidenced for what it covers (which sections, per vertical). Silently assumes the Vertical concept (Gap #2) already exists as a mechanical trigger — it doesn't yet. |
| `ALZABT_SECTION_SYSTEM_CONTRACT.md` | Mostly consistent. Its `staff` entry is the one place Gap #4 (Barber-only data-source assumption) lives, undetected until this analysis. |
| `ALZABT_SECTION_SYSTEM_WORK_SEQUENCE.md` | P0.1/P0.2 evidence re-confirmed accurate against current code (P0.1's endpoint mismatch still real; the correct `/reservations/catalog-services` endpoint now has an exact confirmed date, 2026-08-08, strengthening the finding). P1.1 (`staff`) needs a new prerequisite this document didn't have: resolving Gap #2/#4 before building, not just before Clinic's phase of P3. |
| `TENANT_OS.md` | Fully consistent — already names Team/Staff as an unproposed Capability; this analysis adds that Reservations itself belongs on that same "never passed the gate" list, more urgently. |
| `CAPABILITY_RESOLUTION_PLAN.md` | Consistent and, notably, already proves the *pattern* for fixing Gap #1-style problems (`hasCapability`, not a collapsed single value) — the same discipline should extend to how a section decides its own data source, not just how a page decides what module it's showing. |
| Capability docs (`capabilities/*.md`) | Confirmed: none of the 8 mention Reservations, `CatalogService`, `Barber`, or `Resource` at all — the absence is total, not partial. |
| Routing / Lifecycle / existing template architecture | See Contradictions below — `routing_architecture.md` is stale and should not be treated as current. `TEMPLATE_ROADMAP_VISION.md` and `TENANT_LIFECYCLE_PLAN.md` are both explicitly out of scope for this system per `README.md` and remain internally consistent with themselves; no real conflict with the Alzabt work, just no overlap. |

### Named contradictions and canonical recommendation

1. **`template-registry.js` vs. every `ALZABT_*.md` document's framing that vertical selection has
   only ever happened via the Demo Builder.** Not a stale-vs-fresh conflict — both are real and
   live today. **Recommendation**: neither is automatically canonical; this needs an explicit
   decision (see Workstream W0 below) about whether `template-registry.js`'s Reservations-tagged
   templates get retired/merged into the new Vertical Repertoire model, or the two systems are
   deliberately kept separate for different tenant classes (self-registered vs. demo). Naming this
   is enough for this round — deciding it is not this document's job.
2. **`routing_architecture.md` (dated 2026-05-05) vs. `.claude/rules/frontend/routing.md` (actively
   maintained, dated corrections through 2026-08-08).** Real, checkable conflict: the old file's
   root-redirect table (`/` on localhost → `/smar`) and Trial/Production routing split
   (`GenericAdminDashboard` for trial, `SmarAdminDashboard` for active) are both now wrong per the
   ratified `routing.md` §0b Canonical Admin URL Rule and the 2026-08-12 Product Showcase Home
   checkpoint. **Recommendation: `.claude/rules/frontend/routing.md` is canonical; `
   routing_architecture.md` should be marked superseded/archived** — it already sits outside the
   Tenant OS documentation system per `README.md`, so this is a housekeeping note, not a live
   architectural risk.
3. **No real contradiction found** between `TEMPLATE_ROADMAP_VISION.md`'s Restaurant→Store→Clinic
   sequencing (2026-07-20, module-type templates) and `ALZABT_MASTER_PRODUCT_PLAN.md`'s Rollout
   Priority (2026-08-12, Reservations verticals) — different scope, both internally consistent,
   worth noting only because a future reader could conflate "Clinic" in one document with "Clinic"
   in the other without realizing they're two different initiatives.

---

## A. Current Architecture Reality

- Tenant OS is a real, documented Capability/Interface/Governance model covering 8 Capabilities
  (Content, Media, Site Configuration, Catalog, Category, Theme, Orders, Customers) — none of which
  is Reservations, the product's actual core.
- The Section System (`Client.config.content.sections[]` → `DynamicPage.jsx` → `SECTION_MAP`) is
  real, more capable than assumed (10 of 12 registered types already proven by RK), and technically
  sits on the Content Capability's own schema — but was never named as a Capability, Interface, or
  documented cross-Capability consumer, so no Contract governs it.
- Two independent, real, live onboarding/vertical-selection systems exist side by side
  (`template-registry.js`'s 20 templates; `demo_service.py`'s 4-entry `business_type` map) —
  neither aware of the other, both real, only one connected to any real page-content template.
- Reservations (Barber + Clinic Strategies) is architecturally mature — a proven 6-stage pipeline,
  three feature-complete admin Views, two independently-built, live-verified Strategy cases — but
  entirely undocumented in the Capability system that governs everything else a tenant can do.
- `featured_items` is confirmed broken today for any Reservations tenant not accidentally seeded
  with the retail `catalog` service key; a correct, already-built replacement endpoint
  (`/reservations/catalog-services`) has existed, unused, since 2026-08-08.

## B. Target Alzabt SaaS Architecture

```
Alzabt SaaS
│
├── Tenant OS Capabilities (Layer 0 — shared engine, one Contract each)
│    ├── Reservations   ← MUST become a real Capability Contract (currently missing entirely)
│    ├── Catalog / CatalogService  ← ownership split needs explicit documentation
│    ├── Content, Media, Site Configuration, Theme, Orders, Customers, Category  ← already real
│    └── Staff/Team  ← MUST resolve Barber vs. Resource, then become a real Capability
│
├── Section Component Library (Layer 1 — Content Capability's rendering surface,
│    but should be explicitly documented as such, or split out as its own Capability
│    if it keeps reading live data from other Capabilities)
│
├── Vertical Concept (NEW — a real, single field/mapping deciding "this tenant is a Barber/
│    Clinic/Beauty business," consumed identically by every onboarding door)
│
├── Vertical Template (Layer 2 — curated `page_templates/{vertical}.json`, applied at
│    provisioning by whichever door creates the tenant, keyed by the Vertical Concept above)
│
├── Provisioning Doors (must converge on the same Vertical Concept + the same page_templates
│    mechanism)
│    ├── Demo Builder (`/demo-builder`) — real, Barber-only today
│    └── Self-Registration (`/register?template=X`) — real, 20 templates, disconnected today
│
└── Tenant Instance (Layer 3 — real content, unchanged from today's design)
```

The target state does not discard anything real and working — it closes the specific place where
"shared capability" and "vertical-specific presentation" (the original mechanism question) turn
out to have a third, missing layer underneath both: a documented Reservations Capability and a
single Vertical Concept that every door and every section can rely on.

## C. Gaps / Contradictions

Restated from the numbered analysis above, for reference:

1. Reservations has no Tenant OS Capability Contract.
2. No single, real "Vertical" concept exists (3 disconnected signals).
3. Two independent, unreconciled onboarding/vertical-selection systems — with a confirmed real
   functional consequence (a self-registered Clinic-type tenant gets neither bookable staff nor
   page content).
4. The proposed `staff` section silently assumes Barber-only data.
5. `CatalogService` is invisible to the Capability documentation system.
6. `featured_items` is confirmed broken today (already known, re-confirmed, now better evidenced).
7. `hours` re-authors free text instead of reading real `working_hours` (already known, unchanged).
8. `routing_architecture.md` is stale and contradicts the ratified `routing.md` — housekeeping, not
   a live risk, named for completeness.

## D. Recommended Workstreams (sequencing only, no execution)

**W0 — Foundational decisions (documentation/architecture, not code):**
- Retroactively run Reservations through the Capability Proposal Gate (`TOS-003`) and write
  `capabilities/reservations.md` — or explicitly decide it stays outside the model, and say why.
  Given Reservations' real maturity, this is mostly a documentation exercise, not new design.
- Decide the single Vertical Concept: which existing field (or a new one) is "the" answer to "what
  kind of business is this tenant," consumed identically by the Demo Builder, self-registration,
  and the Vertical Repertoire Matrix.
- Decide `template-registry.js`'s relationship to the new Vertical Repertoire model — retire its
  Reservations-tagged entries, merge them, or keep both for different tenant classes on purpose.
- Document `CatalogService`'s real ownership (as its own Capability, or as an explicit second model
  inside Catalog's existing file) so P0.1's fix has a real Capability Contract behind it, not just a
  file-level patch.

**W1 — P0 as already sequenced** (`ALZABT_SECTION_SYSTEM_WORK_SEQUENCE.md`), unaffected by W0:
P0.1 (`featured_items` endpoint), P0.2 (`hours` real data), P0.4 (spacing investigation). None of
these depend on W0 — they are real bugs regardless of how the Vertical Concept question resolves.

**W2 — Shared capabilities, revised**: `credentials` (P1.2) is unaffected by W0 and can proceed as
already scoped. `staff` (P1.1) gets a new, real prerequisite this analysis adds: its data-source
design must account for Barber vs. Resource *before* being built, not discovered mid-build — this
either waits for W0's Vertical Concept decision, or is scoped v1 as Barber-only explicitly (a real,
smaller, honest choice, not a silent assumption).

**W3 — P2 visual quality**, unchanged, independent of everything above.

**W4 — P3 vertical repertoires**: Barber can proceed once W1/W2 land, same as already sequenced.
Clinic is blocked on more than P1.2's `credentials` section alone — it needs W0's Vertical Concept,
and, if self-registration remains a real path to a Clinic tenant, the confirmed gap in Gap #3 (zero
Resource rows, zero page content) needs its own fix before a real Clinic reference tenant could ever
take an actual booking.

## E. Start Here

**Two independent, non-conflicting starting points, both immediately actionable without waiting on
the other:**

1. **P0.1 stays Start Here for code** — unchanged from the existing Work Sequence document. It does
   not depend on anything found in this analysis; it is a confirmed, isolated, wrong-endpoint bug.
2. **W0's Vertical Concept decision is Start Here for architecture** — a real, undecided question
   this analysis surfaced that blocks P3 and P1.1 mechanically, not just as a nice-to-have. It is a
   decision, not an implementation — a short, explicit choice from Salman among the options named in
   W0, before any further planning round assumes an answer that doesn't exist yet.

Both can proceed in parallel once approved — one is code, one is a decision. Neither requires
touching Reservations, Demo Builder, or any real tenant's data.

---

Stopping here, per instruction. Waiting for approval before any code, template, or document change.
