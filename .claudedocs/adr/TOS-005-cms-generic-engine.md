# TOS-005 — CMS Generic Engine: Section Schema, Repeatable Groups, Interface Unification

**Status:** Decided, approved by Salman 2026-08-19 with 4 binding conditions (§4.7). Follows:
`TOS-002-editing-engine.md` (Decided), matures `.claudedocs/evolution/capability-operations-model.md`
(not yet ratified) into a real decision.

**Scope note:** Tenant-OS-scoped (`TOS-XXX`), lives in `.claudedocs/adr/` alongside `ADR-000X` per
`ADR-0003.md` §4.

---

## 1. Context / Problem Statement

Homepage Phase 2 (2026-08-18, Mister H) built a real, working, browser-verified Dashboard section
editor: `enabled`/`order`/generic scalar-field editing across 9 real sections
(`ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md`). Salman's own review of that work (this session,
2026-08-19) named it correctly: a strong *foundation*, not yet a *CMS* — three things stand between
"Dashboard can edit some text" and "shop owner manages the whole page without code":

1. **Repository hygiene was blocking trust in the codebase** — resolved separately, Track 3,
   2026-08-19 (11 commits, see that day's session log).
2. **`stats[]`/`tags[]`/`items[]` (repeatable groups) have a documented shape but no editing UI** —
   `ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md` §4/§7.
3. **The section model itself needed to be one canonical shape** before more Dashboard surface gets
   built on top of it — Salman's explicit instruction, producing that Contract's §7.

Investigating §3 (this document) surfaced a fourth thing, not on the original list, found by
reading the real code rather than assuming the above is the whole picture:

### 1.1 Real finding: two Contracts already exist for the same two fields

`TOS-002` (Decided) already built a real Editing Engine — `EditableRegion.jsx` (a pure Contract
wrapper, not a UI), `discovery.js` (a Discovery registry), and `tenant-os/schemas/content.js` (a
real Schema) — wired into `HeroSection.jsx`/`StorySection.jsx` for exactly two fields:
`hero.title`, `story.heading`. This works today, inline, on the real rendered page.

It writes through its own dedicated backend routes: `PATCH /content/hero-title`,
`PATCH /content/story-heading` (`content.py:53-119`). Phase 2.6's later, separate
`PATCH /content/sections/{type}/fields` route can *also* update `title_ar`/`heading_ar` on the same
two sections, via the Dashboard's Section Settings form.

**Confirmed, not assumed** (`sectionFieldHelpers.js:14-28`): both routes ultimately write to the
exact same JSON path — `config.content.sections[type].data[field]`. The *data model* was never
duplicated. Only the *route* was — `hero.title` has two independent PATCH endpoints capable of
writing the same value, invented at two different points in time by two different pieces of work
that didn't know about each other's existence at write time (`content.py`'s own docstring names the
Phase 2.6 Dispatcher decision but doesn't mention `/hero-title`/`/story-heading` as fields it
overlaps with).

This is a small-scale, already-real instance of exactly the anti-pattern this whole CMS effort
exists to prevent (`section → its own endpoint → its own logic`) — just one generation earlier,
and at the *field* level via two competing Interfaces rather than at the *section* level via two
hand-built editors. It has to be resolved here, not left as a second exception the new CMS Contract
quietly steps around.

### 1.2 Why this isn't a contradiction of TOS-002 — it's a real second proof point

`.claudedocs/evolution/capability-operations-model.md` (2026-07-29, not yet ratified) already named
the correct shape: **the Editing Engine is an optional presentation layer over a Capability, not the
Capability itself** — a Capability's Operations can be exposed through more than one Interface
(Inline, Dashboard, Processing, API) while sharing one backend Contract. Salman's own note on that
entry: *"one of the most important ideas that will enter the Capability Architecture ADR later,
once it matures more"* — explicitly deferred pending a second real case.

Section 1.1's finding **is** that second real case: `hero.title` today has two real Interfaces
(Inline click-to-edit; Dashboard Section Settings form) that happen not to share one Contract yet.
Fixing that — not retiring either Interface, not rebuilding either one — is what finally proves the
Operations→Interfaces model for real, on a real conflict, not a hypothetical one.

## 2. Decision Drivers

- Salman's explicit instruction: the CMS must be a generic engine that sections describe via
  schema, never a per-section endpoint/form/logic triple.
- Section 1.1's finding: "one Operation, one Contract, many Interfaces" (already named, not yet
  enforced) must actually hold for every field the new engine touches, including the two that
  predate it.
- `TOS-002` §6 explicitly deferred "no Schema file format... specified here — real Implementation
  Contract work for whichever Capability builds this first." This is that Capability.
- Reuse over reinvention: `EditableRegion.jsx`, `discovery.js`, and the Inline mechanism are real,
  working code — not touched or duplicated, only re-pointed at the unified route.

## 3. Options Considered

**Option A — Leave `/hero-title`/`/story-heading` as a permanent, named exception.** Rejected:
this is precisely the coexistence pattern §1.1 found and the whole CMS effort exists to close. Every
future field added to Inline editing would inherit the same ambiguity about which route is
canonical.

**Option B — Retire the generic `/sections/{type}/fields` route; keep only per-field routes like
`/hero-title`/`/story-heading`, one per Inline-editable field.** Rejected: this is exactly the "one
endpoint per field" pattern Salman is asking the CMS to prevent, and directly contradicts the
Dispatcher justification `content.py`'s own docstring already recorded (9 real sections proved the
generic shape repeats).

**Option C — Unify: the generic `PATCH /sections/{type}/fields` route becomes the one real Contract
for every scalar field, including `hero.title`/`story.heading`; `/hero-title`/`/story-heading` are
retired; `EditableRegion`'s Inline Interface is repointed to call the generic route instead of its
own dedicated one. Chosen.** Both Interfaces (Inline, Dashboard) keep working, unchanged from a
user's perspective — only the backend call target changes for the Inline path.

## 4. Decision

Adopt Option C, plus the generic engine design below (extends
`ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md` §7, unchanged in substance, restated here as the
ratified Decision rather than a proposal).

### 4.1 The canonical Section Schema — declarative, one format, section-owned

Every section type declares its own schema once, in one place, in exactly this shape (Salman's own
sketch, adopted verbatim as the canonical declarative format):

```yaml
type: why_choose_us
fields:
  heading_ar:  { kind: text }
  items:
    kind: repeatable
    fields:
      icon_key: { kind: select, options: [classic, quick_booking, pro_stylists, luxury, trusted] }
      title_ar: { kind: text }
      body_ar:  { kind: textarea }
```

This is `ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md` §2's table, made machine-readable — not a
new source of truth alongside it, a formalization of it. A section's own Renderer component
(`WhyChooseUsSection.jsx`, `GallerySection.jsx`, ...) never declares or duplicates its own schema —
it only reads `data` matching whatever the schema says exists, same as today.

**Single source of truth — mechanical, not a convention to remember (Salman's condition 2,
2026-08-19).** Exactly one real file holds this declaration: the backend's
`app/schemas/section_schemas.py` (Implementation Contract Phase B). It is not mirrored by hand
anywhere:

- **Backend consumption**: `content_service.py`/`content.py` import it directly — the same process,
  same file, no serialization boundary to drift across.
- **Frontend consumption**: the Dashboard has **no independent copy of the schema in source
  control**. It fetches the declaration at runtime from a new `GET /admin/content/schema` route
  (added in Phase B, not deferred to Phase D) and drives both the scalar-field form and the
  repeatable-group editor (§4.5) from the fetched response. `SettingsTab.jsx`'s current
  `SECTION_FIELDS`/`SECTION_LABELS` objects — a hand-kept mirror of `ALZABT_HOMEPAGE_
  SECTION_SETTINGS_CONTRACT.md` §2, written before this ADR — are **replaced** by this fetch in
  Phase B, not left running alongside it. Divergence becomes structurally impossible, not merely
  discouraged: there is only one place the schema is *written* (the backend file) and one *path*
  by which any Interface learns it (fetch), so a second, silently-drifting description can't form
  the way `contentSchema`'s own header comment already recorded once happening in this exact
  codebase (`CONTENT_FIELDS` inside `GenericAdminDashboard.jsx`, merged away for the same reason).
- **Server-side validation is mandatory, independent of any client (Salman's condition 4,
  2026-08-19).** `update_section_fields`/the new repeatable routes (§4.5) validate every request's
  field names and, for repeatable items, sub-field shape against this same file — *before* any
  write — regardless of whether the caller is the Dashboard, a future AI action, or a raw API call
  with no UI in front of it at all. A request naming a field the schema doesn't declare for that
  `section_type`, or a repeatable item missing a declared sub-field, is rejected with a real 400/
  422. Without this, §4.1's schema is documentation of intent, not an enforced Contract — Salman's
  own framing, adopted verbatim as the requirement.

`kind: repeatable` is the only structural field kind; every other `kind` (`text`, `textarea`,
`select`, `url`, `number`, `enum`) is scalar. Media is deliberately **not** a `kind` in this
schema — see §4.4.

### 4.2 The generic engine — one dispatcher, sections only supply schema

```
CMS Engine
├── Section discovery      — GET  /admin/content/sections                        (real, Phase 2.6)
├── enabled                — PATCH /admin/content/sections/{type}/enabled        (real, Phase 2.1)
├── order                  — PATCH /admin/content/sections/reorder               (real, Phase 2.1)
├── scalar fields           — PATCH /admin/content/sections/{type}/fields        (real, Phase 2.6 —
│                              becomes the ONE route for hero.title/story.heading too, §4.3)
├── media fields            — dedicated Renderer per media field (real: Hero, Gallery — §4.4,
│                              unchanged, this is TOS-002's own ReplaceMedia Processing Pipeline
│                              precedent, not a gap to close here)
├── repeatable groups        — new, §4.5
│   ├── add
│   ├── edit
│   ├── delete
│   └── reorder
└── section-specific settings — mechanically the same route as scalar fields (§4.1's schema doesn't
                                distinguish them; ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md §2's
                                own column split is a UI/documentation grouping, not a second
                                backend mechanism)
```

No section-specific backend model, route, or Dashboard form file. A new section type is added to
the engine by adding one schema entry (§4.1) plus, if it needs an Inline Interface, one
`EditableRegion` wrap in its Renderer — never a new route, never a new Dashboard form component.

### 4.3 Interface unification — `hero.title`/`story.heading` move onto the generic route

**Pure migration, not a redesign (Salman's condition 1, 2026-08-19).** The visible behavior of
both fields — Inline click-to-edit on the real page, exactly as it works today — does not change
at all. The only change is which backend route the Inline Interface's schema entry calls:

```
Old:  Inline click-to-edit → PATCH /content/hero-title
New:  Inline click-to-edit → PATCH /content/sections/hero/fields
```

Same prompt, same save behavior, same live-preview update, same Dashboard Section Settings form
continuing to work on the identical field — only the network call target changes, inside the
schema entry, invisible to every component in the tree.

- `PATCH /content/hero-title`, `PATCH /content/story-heading` — **retired**. Both fields become
  ordinary entries in `why_choose_us`... no — in `hero`'s and `story`'s own schema entries (§4.1),
  editable via `PATCH /admin/content/sections/{type}/fields` like every other scalar field.
- `tenant-os/schemas/content.js`'s two entries keep their `apiPath` key conceptually, but it now
  resolves to the generic route with `{fields: {[dataField]: newValue}}` as the body, not a
  field-specific payload shape. `EditableRegion.jsx`, `discovery.js`, `HeroSection.jsx`/
  `StorySection.jsx`'s `<EditableRegion>` wrapping — **all unchanged**. Only the network call target
  changes, inside the schema entry, invisible to the component tree.
- `GET /content/hero-title`, `GET /content/story-heading` — retired the same way; current value
  reads through `GET /admin/content/sections` (already returns every section's `data`, per Phase
  2.6) instead.
- This is the real, concrete resolution of `evolution/capability-operations-model.md`'s open
  question — the Inline Interface and the Dashboard Interface now demonstrably **share one backend
  Contract**, per real code, not per description. That evolution entry should be marked Promoted
  once this ADR is approved (housekeeping, not part of this ADR's own scope).

### 4.4 Media fields — unchanged, not folded into the generic scalar route

Per `TOS-002` §4.5 (Known Requirement: `ReplaceMedia` may need a Processing Pipeline) — Hero and
Gallery keep their own dedicated Renderers (`HeroMediaSection`, `GalleryMediaSection`) and their own
backend paths (`GalleryImage` rows), unchanged. The generic engine's `media fields` bucket names
this as its own Operation type, distinct from `scalar`/`repeatable`, exactly as TOS-002 already
decided — this ADR does not reopen that decision, only places it correctly inside the fuller engine
diagram in §4.2.

### 4.5 Repeatable groups — as designed in the Contract's §7.3, ratified here

```
GET    /admin/content/sections/{type}/repeatable/{field}
POST   /admin/content/sections/{type}/repeatable/{field}
PATCH  /admin/content/sections/{type}/repeatable/{field}/{index}
DELETE /admin/content/sections/{type}/repeatable/{field}/{index}
PATCH  /admin/content/sections/{type}/repeatable/{field}/reorder
```

`{field}` and its item shape are validated server-side against §4.1's schema — never an arbitrary
client-supplied key or shape. One generic Dashboard component (`RepeatableGroupEditor`) reads
`{sectionType, field}`, looks up the item shape from the same schema §4.1 declares, and renders
add/edit/delete/reorder generically. `tags[]`'s bare-string shape and `stats[]`/`items[]`'s
sub-object shape are both just schema-declared field kinds under `repeatable`, not two different
mechanisms.

### 4.6 `EditableRegion`/`discovery.js` — stay exactly as they are

Real, working, intentionally dormant infrastructure (`discovery.js`'s own comment: "waiting for an
Interface that actually needs to ask 'what can I edit here' up front"). This ADR does not activate,
extend, or retire them — only repoints two existing entries' network call (§4.3). Wiring a real
consumer of `discoverRegions()` (a future "what's editable on this page" overview, or an AI planning
step) remains out of scope, same as `TOS-002` already left it.

### 4.7 Salman's 4 approval conditions (2026-08-19) — where each is satisfied

Approved with 4 binding conditions, each mapped to where this ADR/its Contract actually enforces
it — not restated as a separate checklist disconnected from the design:

1. **Phase A must not change visible behavior** — §4.3 above, restated as a pure migration; the
   Implementation Contract's Phase A acceptance test (§Phase A there) verifies this directly.
2. **One single source of truth for the schema, structurally, not by convention** — §4.1's "Single
   source of truth" subsection: one backend file, one fetch path, no hand-kept frontend mirror.
3. **The repeatable-group editor must be genuinely generic** (`RepeatableGroupEditor` reading
   `{sectionType, field}` from schema, never `StoryEditor`/`LocationEditor`/`WhyChooseUsEditor`) —
   already this ADR's own design, §4.5, confirmed unchanged, not a new condition to design around.
4. **Server-side validation, independent of the Dashboard** — §4.1's "Server-side validation is
   mandatory" subsection, enforced in Phase B/C of the Implementation Contract before any write.

## 5. Single Source of Truth

This ADR for the unified Section Schema format, the generic engine's six buckets, and the Inline/
Dashboard Interface unification. `ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md` §2 for the current
real per-section field inventory (unchanged in content, now formalized into §4.1's schema format by
the Implementation Contract). `TOS-002-editing-engine.md` for the Operation-type vocabulary
(`UpdateField`, `ReplaceMedia`) and the Admin/Public split, both inherited unchanged.

## 6. Scope / Non-Goals

- **Adding a brand-new section *type* from the Dashboard (a section-type registry/creation UI) is
  explicitly out of scope for this CMS (v1).** Salman's own instruction: don't conflate "edit an
  existing section's content" with "invent a new kind of section" unless a future decision says
  otherwise. Every section type this ADR covers is declared in code (§4.1's schema file), not
  created at runtime.
- No decision here on whether `SECTION_SCHEMAS` lives in Python, JSON, or is generated from one
  format into the other for frontend/backend parity — Implementation Contract work.
- No Draft/Publish — inherited, unbuilt, per `TOS-002` §4.6, unchanged by this ADR.
- No validation-rule *engine* (e.g. regex/length constraints) — `kind` alone (text/textarea/select/
  number/url) is the only validation this ADR specifies; richer per-field validation is a future
  extension of §4.1's schema format, not blocked by this decision, not built by it either.

## 7. What the CMS controls, once this ships (Salman's own list, ratified)

Show/hide a section; reorder sections; edit its text; replace its media/video; manage repeatable
content (add/edit/delete/reorder items inside a group); edit section-specific settings; all without
touching code. Explicitly **not** included: adding a new section type (§6).

## 8. Consequences

- `content.py` loses two routes (`/hero-title`, `/story-heading`); `content_service.py` loses their
  two backing functions (or they become thin wrappers over `update_section_fields` — Implementation
  Contract's call). `tenant-os/schemas/content.js` gains a data-shape change to its two entries, not
  a rewrite.
- Every section added after this ADR is added via schema entry only — a real, checkable test
  (`TOS-002`'s own "concrete test," now inherited): adding Testimonials touches one schema entry and
  its Renderer's own `EditableRegion`/data reads, never a new route or new Dashboard form file.
- `evolution/capability-operations-model.md` should be marked Promoted once this ADR is approved —
  its own open question (do Operations need multiple Interfaces sharing one Contract) is answered
  here, concretely, not hypothetically.
