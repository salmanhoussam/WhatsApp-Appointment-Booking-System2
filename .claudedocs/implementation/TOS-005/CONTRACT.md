# Implementation Contract — CMS Generic Engine (TOS-005)

Per `documentation-policy.md`: "No code is written without an Implementation Contract — a one-page
gate listing exactly which files change, what tests are required, success criteria, and a rollback
plan." Follows `TOS-005-cms-generic-engine.md` (Decided, pending Salman's review).

**Approved by Salman 2026-08-19, with 4 binding conditions folded into this Contract (see each
phase's own callouts, and `TOS-005` §4.7 for the mapping). Execution authorized for Phase A only —
Phase B/C/D do not start until Phase A's Acceptance Test passes in full, with real evidence.**

## Scope

Builds the generic CMS engine per `TOS-005` §4: unifies `hero.title`/`story.heading` onto the one
scalar-field route, formalizes the Section Schema into one real declarative file, and adds
repeatable-group editing (backend + Dashboard UI). Explicitly does **not** build: a new-section-type
creation UI (`TOS-005` §6), Draft/Publish, a validation-rule engine beyond field `kind`, or any
change to Media's own dedicated Renderers (Hero/Gallery — untouched).

## Phase A — Interface Unification (`hero.title`/`story.heading` → the generic route)

Smallest, safest phase — proves the "one Contract, many Interfaces" model on a real conflict before
any new surface is built on top of it. No schema file yet; this phase only removes duplication.

**Binding constraint (Salman's condition 1, 2026-08-19): this is a migration of the editing path,
not a redesign of the editor.** `hero.title`/`story.heading` must look and behave identically to a
user before and after — same Inline click-to-edit prompt, same save flow, same live preview. The
only permitted change is the network call target:
```
Old: Inline → /content/hero-title
New: Inline → /content/sections/hero/fields
```
Anything beyond that in this phase is scope creep, not Phase A.

**Gate: Phase B does not start automatically. Phase A must pass every item in this phase's
Acceptance Test, verified with real evidence, before Phase B begins.**

**Files:**
- `app/api/v1/admin/content.py` — remove `GET/PATCH /hero-title`, `GET/PATCH /story-heading`
  (`:53-119`) and their two Pydantic models (`HeroTitleUpdate`, `StoryHeadingUpdate`). Update the
  module docstring (`:1-16`) — the "kept as-is, unchanged" framing for these two routes becomes
  historical, replaced with the `TOS-005` reference.
- `app/services/content_service.py` — remove `get_hero_title`/`update_hero_title`/
  `get_story_heading`/`update_story_heading` if they exist only to back the retired routes and
  nothing else calls them (confirm via grep before deleting — do not assume).
- `frontend/src/tenant-os/schemas/content.js` — both entries' `apiPath`/`apiField` stop pointing at
  `/content/hero-title`/`/content/story-heading`; the schema entry instead carries `sectionType` +
  `dataField` only (already present) and a fixed `apiPath: '/admin/content/sections/{sectionType}/fields'`
  pattern, with the PATCH body built as `{ fields: { [dataField]: newValue } }`. `GET`-side current
  value read switches from the retired `GET /hero-title`/`GET /story-heading` to `GET
  /admin/content/sections` (already returns every section's `data`).
- `frontend/src/tenant-os/schemas/sectionFieldHelpers.js` — **no change expected** — it already
  reads/writes `config.content.sections[type].data[field]` directly from local state, independent
  of which route saved it.
- Whatever call site invokes `saveFieldValue`/the schema's `apiPath` (`GenericAdminDashboard.jsx`,
  per `content.js`'s own header comment) — update only if it hardcodes the two old paths anywhere
  beyond reading `field.apiPath`.

**Acceptance Test (Salman's own list, 2026-08-19 — binding, verbatim):**
1. Edit `hero.title` from the Inline editor.
2. Save.
3. Confirm the generic section route (`PATCH /admin/content/sections/hero/fields`) received the
   change (Network tab, real request).
4. Confirm the DB/config value actually changed (`GET /admin/content/sections`, or a real DB read —
   not inferred from a 200 response alone).
5. Confirm the public homepage reflects the change (real page load, not the live-preview iframe
   alone).
6. Repeat steps 1-5 for `story.heading`.
7. Confirm the Dashboard's Section Settings form (Phase 2.6) still edits both fields correctly —
   unbroken by this migration.
8. Confirm no remaining caller anywhere in the codebase depends on the legacy routes — grep for
   `hero-title`/`story-heading` returns zero real call sites (docs referencing the migration itself,
   past tense, don't count); `GET/PATCH /content/hero-title` and `/content/story-heading` return 404
   (routes removed).
9. Confirm RK is untouched — real page load, 0 console errors, no behavior change, same as every
   Phase 2.3 commit this session already re-verified against.

**Success criteria:** all 9 items above pass with real evidence (network captures, DB/config reads,
screenshots) — not asserted from code review alone, per this project's own Browser Verification
Protocol. This proves the core TOS-005 hypothesis: the editing engine can be unified without
breaking the existing editing surface.

**Rollback:** revert the commit. No data migration in this phase — the underlying JSON path
(`config.content.sections[type].data[field]`) is unchanged throughout, so rollback is pure code
revert, zero DB risk.

## Phase B — Canonical Section Schema file (the single-source-of-truth phase)

**This is the sensitive phase (Salman's own framing, 2026-08-19).** Per `TOS-005` §4.1's binding
mechanics: one backend file, one fetch path, zero hand-kept frontend mirror. Not "the Contract table
and the frontend schema and the backend validation schema, each drifting independently" — one real
file, everything else reads it.

**Files:**
- New: `app/schemas/section_schemas.py` — one real, machine-readable declaration per section type,
  transcribed from `ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md` §2's table into `TOS-005` §4.1's
  format (`type`, `fields: {name: {kind, ...}}`, `kind: repeatable` nesting its own `fields`). Covers
  all 9 sections already in that Contract, including `hero`/`story`'s now-unified fields from
  Phase A. **This file is the single source of truth — no other file redeclares this information.**
- New: `app/api/v1/admin/content.py` — `GET /sections/schema` (or `/content/schema`, decided at
  execution time), returning `section_schemas.py`'s declaration as JSON. This is the only path any
  frontend Interface uses to learn the schema.
- `app/api/v1/admin/content.py`'s `update_section_fields` — validates `body.fields` keys, and their
  values' basic type per declared `kind`, against `section_schemas.py` for the given `section_type`
  before writing. A field name not declared for that section, or a value that doesn't match its
  declared `kind`, is rejected with a real 400/422 — **enforced here, at the API boundary, not only
  in the Dashboard form** (Salman's condition 4) — a raw API call bypassing the Dashboard entirely
  is rejected exactly the same way a Dashboard-originated one would be.
- `SettingsTab.jsx`'s `SECTION_FIELDS`/`SECTION_LABELS` objects (the current hand-kept mirror of
  `ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md` §2, written before this ADR) — **removed**, not
  left running alongside the new mechanism. `SectionRow`/`SectionSettingsArea` fetch the schema from
  the new `GET /sections/schema` route once, at mount, and render the same form they do today from
  that response instead of the hardcoded objects.

**Tests:**
- For every one of the 9 sections, a real `PATCH /sections/{type}/fields` call with a correct field
  succeeds (unchanged behavior) and a call with a field name **not** in that section's schema
  returns a real 400/422, not a silent no-op or a 500 — verified via a raw API call (e.g. `curl`),
  not only through the Dashboard, to prove the validation isn't merely UI-side.
- Real browser: confirm the Dashboard's Section Settings form still renders identically for all 9
  sections after switching from the hardcoded objects to the fetched schema — zero visible
  regression, same as Phase A's own constraint.

**Success criteria:** one file is the single real source of truth for "which fields exist on which
section, and what kind are they." `ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md` §2 becomes
documentation of that file's content. The Dashboard has no independent copy of the schema anywhere
in its own source — divergence is structurally impossible, not merely discouraged. Server-side
rejection of an undeclared field is proven via a raw API call, independent of the Dashboard.

**Rollback:** revert the commit; the added validation is the only behavior change, safe to drop.

## Phase C — Repeatable-group backend engine

**Files:**
- `app/api/v1/admin/content.py` — new routes per `TOS-005` §4.5 (`GET/POST /sections/{type}/
  repeatable/{field}`, `PATCH/DELETE .../{field}/{index}`, `PATCH .../{field}/reorder`).
- `app/services/content_service.py` — new functions backing the above; `{field}` and item shape
  validated against Phase B's schema file (`section_schemas.py`) before any write — a request for a
  `{field}` not declared `kind: repeatable` on that `section_type`, or an item missing a declared
  sub-field, is rejected, not silently accepted.
- `app/repositories/content_sections_repo.py` — list-append/list-item-update/list-item-delete/
  list-reorder helpers operating on `sections[type].data[field]` (an array), mirroring
  `gallery_repo.py`'s existing `list_page_media`/`add_page_media`/`reorder_page_media` pattern
  (same shape, different array location — reuse the pattern, not the code, since one operates on
  `GalleryImage` rows and this operates on a JSON array inside `Client.config`).

**Tests:** for each of the 3 real repeatable fields (`story.stats`, `location.tags`,
`why_choose_us.items`) — add an item, confirm it persists and appears in the public config; edit one
item's sub-field; delete one item; reorder two items; confirm a malformed item (missing a required
declared sub-field) is rejected with a real 400, not written.

**Success criteria:** all 3 real repeatable fields are fully backend-editable (add/edit/delete/
reorder), through the one generic route family, with real schema-backed validation — zero
section-specific repeatable route exists anywhere.

**Rollback:** revert the commit; new routes only, no change to existing scalar/media paths.

## Phase D — Repeatable-group Dashboard UI

**Files:**
- New: `frontend/src/pages/generic-admin/tabs/RepeatableGroupEditor.jsx` (or co-located inside
  `SettingsTab.jsx` near `SectionRow`, matching that component's existing placement pattern) — one
  generic component taking `{sectionType, field}`, reading the item shape from the same schema
  response Phase B's `GET /sections/schema` already provides (fetched once at mount, same as
  `SectionRow` now does per Phase B), rendering add/edit/delete/reorder rows generically per
  `TOS-005` §4.5's own description (`tags[]` = single-input row; `stats[]`/`items[]` = small
  per-row form). No second schema fetch mechanism — reuses Phase B's.
- `SettingsTab.jsx`'s `SectionRow` — mounts one `RepeatableGroupEditor` per `kind: repeatable` field
  the section's schema declares, inside its existing expandable field-editor area (same place
  scalar fields already render).

**Tests:** real browser, real data — for Mister H, add a Why Choose Us item via the Dashboard,
confirm it appears on the real public homepage in the right position; delete a Story stat, confirm
it disappears; reorder two Location tags, confirm the new order renders. RK reconfirmed unaffected
throughout (has none of these three sections configured with real repeatable data yet, but the
generic mechanism must not regress its existing scalar/enabled/order behavior).

**Success criteria:** the Contract's own binding acceptance test (`ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md`
§6) is met for repeatable content too — hide, reorder, edit text, edit repeatable groups, replace
media, see it live, all from the Dashboard, zero code/deploy.

**Rollback:** revert the commit; new UI only, additive to `SettingsTab.jsx`.

## Overall Success Criteria (all four phases)

Salman's own binding list from this session, verified end-to-end, real browser, real tenant data:
show/hide a section; reorder sections; edit its text; replace its media; add/edit/delete/reorder
items inside a repeatable group; edit section-specific settings — all without touching code or
deploying. Adding a **new field to an existing section type** touches only the schema file (Phase
B) plus, if it needs Inline editing too, one `EditableRegion` wrap — never a new route, never a new
Dashboard form file. Adding a **new section type** remains explicitly out of scope (`TOS-005` §6).

## Overall Rollback Plan

Each phase is its own commit, independently revertible, in dependency order (A has no dependency on
B/C/D; B is required before C; C is required before D). A failure discovered during Phase C/D does
not require unwinding Phase A/B — the schema file and the unified scalar route are correct and
useful on their own even if repeatable-group work pauses.
