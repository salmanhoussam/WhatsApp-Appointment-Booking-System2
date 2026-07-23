# Implementation Contract — ADR-0003 (Architecture Documentation System Migration)

Governs implementation against `.claudedocs/adr/ADR-0003.md`. Built on real Inventory + Dependency
Analysis, not written as a first draft — see
`.claudedocs/work/adr-0003-migration/2026-07-23/INVESTIGATION.md` for the full evidence this
Contract is based on. Any decision during execution is measured against **this document**, not
improvised in the moment.

**Status: Contract only. Zero files moved, renamed, or deleted by this document.** Each Phase below
executes as its own separate commit, only after this Contract itself is reviewed and approved.
Each Phase produces its own `.claudedocs/verification/ADR-0003_PHASE_N.md` evidence file, exactly
the same convention already used for ADR-0001 (5 phases) and ADR-0002 (4 phases + a second
contract's 4 phases) — real before/after state per phase, not "moved the files."

## 1. Scope

Retire `TENANT_OS_PLAN.md` (1,432 lines, 26 sections) as a single file, redistributing its content
— unchanged in substance — across the six-layer structure ADR-0003 §4 establishes. Consolidate the
two orphan Architecture/Capability review files into the existing `reviews/` folder under a
consistent naming convention, and seed a general `tenant-verification-template.md` there for future
tenant builds (starting with the barber tenant). Fix every confirmed external reference so nothing
silently points at a retired file.

**One correction to the originally-approved folder tree, based on the Investigation's own §2.3
finding**: `reviews/`, `roadmap/`, and Tenant-OS-scoped ADRs (`TOS-XXX`) use the **existing
top-level** `.claudedocs/reviews/`, `.claudedocs/roadmap/`, `.claudedocs/adr/` folders — not new
nested `architecture/reviews/`, `architecture/roadmap/`, `architecture/adr/` duplicates. Only
`principles/` and `capabilities/` are genuinely new, nested under `architecture/` as designed (no
pre-existing top-level equivalent, no collision).

## 2. Files That Will Change (by Phase — see §3 for the full manifest)

| Category | Count | New / Moved / Fixed |
|---|---|---|
| New skeleton files | 3 | `architecture/README.md`, `architecture/INDEX.md`, stub `architecture/TENANT_OS.md` |
| Reviews consolidated | 3 | 2 renamed in place, 1 moved from `architecture/` into `reviews/` |
| New Tenant OS ADRs | 3 | `adr/TOS-001..003-*.md` |
| New Principles | ~4 | `architecture/principles/P-00X-*.md` — exact count decided during Phase 4 (see §3) |
| New Capability files | 8 | `architecture/capabilities/{catalog,category,media,content,site-configuration,theme,orders,customers}.md` |
| Retired | 1 | `architecture/TENANT_OS_PLAN.md` → moved to `archive/`, not deleted |
| External references fixed | 11 | `CLAUDE.md`, `bo-hussein.md`, `backend/architecture.md` (5 lines), 7 code comments, `todo_list.md`, `documentation-policy.md` |

## 3. Phases

### Phase 1 — Create Architecture Skeleton

**Preconditions:** None — this phase only creates new, empty structure.
**Files affected:** New only, nothing existing touched.
```
architecture/README.md          (new, ~30 lines — how to navigate this folder)
architecture/INDEX.md           (new, stub — Decision | Location | Status table, empty rows)
architecture/TENANT_OS.md        (new, stub — filled in Phase 6)
architecture/principles/         (new, empty dir)
architecture/capabilities/        (new, empty dir)
reviews/tenant-verification-template.md  (new — general template, first real use: barber tenant)
```
**Validation:** `find architecture/principles architecture/capabilities -type f` → empty.
`git status --short` shows only new files, zero modified/deleted.
**Acceptance Criteria:**
- ✓ Skeleton exists
- ✓ No existing file moved, renamed, or edited
- ✓ `tenant-verification-template.md` has a real, fillable structure (not a placeholder stub)

### Phase 2 — Reviews Consolidation

**Preconditions:** Phase 1 committed.
**Files affected:**
```
git mv .claudedocs/reviews/CONTENT_CAPABILITY_ARCHITECTURE_REVIEW.md  .claudedocs/reviews/content-capability-review.md
git mv .claudedocs/reviews/BEIT_AL_FAKHAR_STORE_EXPERIENCE_REVIEW.md  .claudedocs/reviews/store-experience-review.md
git mv .claudedocs/architecture/TENANT_OS_IMPLEMENTATION_REVIEW.md    .claudedocs/reviews/editing-engine-review.md
```
**Validation:** `git log --follow` on each new path shows the original file's full history preserved
(confirms `git mv`, not a delete+recreate). `grep -rln` for the 3 old filenames across the repo
(§2.2 of the Investigation) — the only real hits found were the 3 files' own historical citations
inside other historical docs (sessions/work), left as-is by design.
**Acceptance Criteria:**
- ✓ 3 files moved with history preserved
- ✓ Content byte-identical except filename (no rewriting during the move itself)
- ✓ No other file's functional behavior changes

### Phase 3 — Tenant OS ADRs

**Preconditions:** Phase 2 committed.
**Files affected:** New files, content extracted from `TENANT_OS_PLAN.md` (not yet deleted).
```
adr/TOS-001-tenant-os.md              ← §1 Positioning, §2 Problem, §3 Design Principles (index only — see Phase 4), §5 Anatomy
adr/TOS-002-editing-engine.md         ← §14 in full: the Capability→Operation→Schema→Renderer decision + its mechanism + the Admin/Public Contract split subsection + the ReplaceMedia Processing Pipeline Known Requirement
adr/TOS-003-capability-contract-model.md  ← §12 Capability Proposal gate + §13's own meta-decision (Capability Contracts exist, what they must contain) — NOT the individual Capability contents themselves (those go to Phase 5)
```
Each new ADR follows the same structure as ADR-0001/0002/0003 (Context, Decision Drivers, Options
Considered where real alternatives existed, Decision, Consequences) — not a copy-paste of the
original prose, a real ADR write-up grounded in it.
**Validation:** Each new ADR's content is checked against the corresponding original section(s) —
every real decision/rationale preserved, nothing silently dropped. `wc -l` each new file.
**Acceptance Criteria:**
- ✓ 3 ADRs created, `TOS-` prefix, in the existing `adr/` folder alongside `ADR-0001/2/3`
- ✓ Every Decision Driver/Option/Consequence traceable back to the original section
- ✓ `TENANT_OS_PLAN.md` itself untouched (still the fallback reference until Phase 7)

### Phase 4 — Principles

**Preconditions:** Phase 3 committed.
**Files affected:** New files, extracted from `TENANT_OS_PLAN.md` §3 (Design Principles), §4 (Three
Layers/Content-vs-Structure), §7 (Direct Manipulation), §9 (No API Thinking) — **only the
principles that have no existing home in `.claude/rules/`** (per ADR-0003 §4's confirmed
principles-vs-rules boundary; Single Source of Truth, Admin/Public Contract, and the Abstraction
Rule are NOT duplicated here — `INDEX.md` links to their real `.claude/rules/` location instead).
Exact filenames decided during this phase's execution (not fixed in advance, per ADR-0003 §6's own
scope boundary), expected to include something like:
```
architecture/principles/P-001-dashboard-first.md
architecture/principles/P-002-content-vs-structure.md
architecture/principles/P-003-no-api-thinking.md
architecture/principles/P-004-direct-manipulation.md
```
**Validation:** Each principle file under 200 lines. `INDEX.md` updated with a "Tenant OS
Principles" section listing each, plus a "Platform Principles" section pointing to the real
`.claude/rules/` files (SSOT, Admin/Public Contract, Abstraction Rule).
**Acceptance Criteria:**
- ✓ No principle duplicates content already in `.claude/rules/`
- ✓ Each file answers "what is permanently true," not "what's true this Sprint"
- ✓ `INDEX.md`'s two-section split is real and correct

### Phase 5 — Capability Files (the largest phase)

**Preconditions:** Phase 4 committed.
**Files affected:** New files, extracted from §13 (Capability Contracts, including Site
Configuration's real Ownership Matrix + Known Boundary Debt from Sprint 3), §19 (Architecture
Integrity Findings — redistributed per-Capability, not centralized), §20 (Maturity — redistributed
per-Capability, not centralized).
```
architecture/capabilities/catalog.md
architecture/capabilities/category.md
architecture/capabilities/media.md            ← includes the ReplaceMedia Pipeline cross-reference to TOS-002
architecture/capabilities/content.md
architecture/capabilities/site-configuration.md  ← includes the real Ownership Matrix + 3 named Boundary Debt findings, verbatim content preserved
architecture/capabilities/theme.md
architecture/capabilities/orders.md
architecture/capabilities/customers.md
```
Each file's required sections, per ADR-0003 §4's confirmed Capability/projection model: Ownership,
Contract, Operations, Schema, Admin projection, Public projection, Maturity, Open Findings.
**Validation:** Every real finding/maturity value/ownership decision from §13/§19/§20 is present in
exactly one Capability file — a manual diff-style check per Capability, not just file existence.
Site Configuration's file specifically checked against
`.claudedocs/work/tenant-os-sprint3-phase0/2026-07-22/PHASE0_INVESTIGATION.md` for completeness.
**Acceptance Criteria:**
- ✓ 8 files, each ~100–200 lines
- ✓ No Capability's real finding/maturity data lost in the split
- ✓ `INDEX.md`'s Capability rollup table added, one row per Capability, linking here

### Phase 6 — `TENANT_OS.md` + Finalize `INDEX.md`/`README.md`

**Preconditions:** Phases 3–5 committed (everything they'd link to now exists).
**Files affected:** `architecture/TENANT_OS.md` (rewritten from stub), `architecture/INDEX.md`
(finalized), `architecture/README.md` (finalized).
**Content of `TENANT_OS.md`** (100–200 lines max, per ADR-0003 §4): what Tenant OS is (a few
paragraphs from §1–2), the Platform/Capability/Interface/Governance model (brief, links to
`principles/` for depth), the Capability Lifecycle stages (brief — `Idea → Contract →
Implementation → Interface → Governance → AI Access → Review`), links to every `principles/`,
`adr/TOS-*`, and `capabilities/*` file. Nothing else.
**Validation:** `wc -l architecture/TENANT_OS.md` — must be under 200. Every link in it resolves to
a real file (no broken links — checked by actually following each one).
**Acceptance Criteria:**
- ✓ `TENANT_OS.md` under 200 lines
- ✓ `INDEX.md` has both a Decision table and a Capability rollup table, complete
- ✓ A reader following only `README.md` → `INDEX.md` can find any real fact in ≤2 links

### Phase 7 — Retire `TENANT_OS_PLAN.md`

**Preconditions:** Phases 1–6 committed AND verified (§4 below) — every real fact traced to its new
home. This phase does not run until that check passes.
**Files affected:**
```
git mv .claudedocs/architecture/TENANT_OS_PLAN.md .claudedocs/archive/TENANT_OS_PLAN.md
```
**Not deleted** — moved to `archive/`, matching this project's own established precedent
(`Architecture_Design_Request.md` was marked Deprecated and archived, not hard-deleted, per
`repository-hygiene.md`). A one-line header is added: `**Superseded 2026-07-23 by ADR-0003 — see
architecture/TENANT_OS.md, principles/, adr/TOS-*, capabilities/*.**`
**Validation:** Full content diff between the original 1,432 lines and everything written across
Phases 3–6 — every real sentence accounted for somewhere, nothing silently dropped, nothing
duplicated as a live (non-historical) copy.
**Acceptance Criteria:**
- ✓ File archived, not deleted, with a clear superseded-by pointer
- ✓ The content-completeness diff check passes
- ✓ `git log --follow` on the archived path still shows full history

### Phase 8 — Fix External References

**Preconditions:** Phase 7 committed (so the real new paths exist to point to).
**Files affected (exact lines, from the Investigation §2.2):**
```
.claude/CLAUDE.md:62                          — rewrite the fixed-folder-structure blurb to match ADR-0003 §4
.claude/agent/bo-hussein.md:223               — TENANT_OS_PLAN.md §19 → the specific Capability file's Open Findings section
.claude/rules/backend/architecture.md:115,135,149,152,157  — 5 citations → specific new files (TOS-002, capabilities/*.md)
.claude/rules/documentation-policy.md         — "Fixed folder structure" section replaced with ADR-0003 §4's tree; add the 4-rule cross-reference paragraph (documentation-policy.md, investigation-protocol.md, service-execution-constitution.md, repository-hygiene.md)
app/services/content_service.py:4             — comment only
app/services/media_service.py:5               — comment only
frontend/src/tenant-os/schemas/content.js:4   — comment only
frontend/src/tenant-os/schemas/media.js:4     — comment only
frontend/src/tenant-os/discovery.js:17        — comment only
frontend/src/tenant-os/EditableRegion.jsx:15  — comment only
frontend/src/pages/generic/normal/DynamicPage.jsx:236  — comment only
.claudedocs/todo_list.md                      — update its TENANT_OS_PLAN.md references (living doc, not historical)
```
**Explicitly left stale, by design** (per Investigation §2.2 and `documentation-policy.md` rule 1):
`.claudedocs/sessions/2026-07-21.md`, `.claudedocs/sessions/2026-07-22.md`, all `.claudedocs/work/
tenant-os-sprint*/` evidence files — historical raw record, never rewritten.
**Validation:** `grep -rn "TENANT_OS_PLAN"` across the repo returns zero hits outside the explicitly
accepted historical files above.
**Acceptance Criteria:**
- ✓ All 11 live references fixed
- ✓ Historical files' stale references confirmed intentional, not missed
- ✓ `documentation-policy.md` now correctly describes the real folder structure

## 4. Content-Completeness Verification (gates Phase 7)

Before `TENANT_OS_PLAN.md` is archived, every one of its 26 original sections must be traced to
exactly one destination:

| Original section | New home |
|---|---|
| §1–3, §5 | `TOS-001-tenant-os.md` |
| §4 | `principles/P-002-content-vs-structure.md` |
| §6 | `capabilities/*.md` (redistributed per module, not centralized) |
| §7 | `principles/P-004-direct-manipulation.md` |
| §8 | `TOS-002-editing-engine.md` (Live Preview is part of the Editing Engine decision) |
| §9 | `principles/P-003-no-api-thinking.md` |
| §10 | `capabilities/theme.md` |
| §11 | `TENANT_OS.md` (a brief forward-looking note, not a full section — AI Integration has no real implementation yet) |
| §12–13 | `TOS-003-capability-contract-model.md` (the model) + `capabilities/*.md` (each Capability's own real contract) |
| §14 | `TOS-002-editing-engine.md` |
| §15 | `TENANT_OS.md` (briefly) — the Lifecycle stages themselves are simple enough not to need their own file |
| §16 | Redistributed: each Capability file's own Admin/Public projection + SSOT note replaces a central matrix |
| §17–18 | `capabilities/*.md`'s own Governance/Permissions notes, per-Capability — no central matrix file (per ADR-0003 §4) |
| §19 | Redistributed into each Capability's own Open Findings section |
| §20–22 | Redistributed into each Capability's own Maturity line + `INDEX.md`'s rollup table |
| §23–24 | Deferred — out of this Contract's scope (see §5 below), stays in `TENANT_OS_PLAN.md`'s archived copy until a real Roadmap phase addresses it |
| §25–26 | `principles/` (Architecture Boundaries reads like a permanent rule) or folded into `TENANT_OS.md`'s own scope note — exact call made during Phase 6 |

This table is the actual acceptance test for Phase 7 — not "the file was split," but "every one of
these 26 rows has a real, checked destination."

## 5. Explicitly NOT in This Contract

- `roadmap/phase-N.md`/`sprint-N.md` markdown files (§23–24's content) — the existing
  `roadmap/*.yaml` files stay as they are; narrative roadmap markdown is a smaller, separate,
  lower-priority follow-up, not required to retire `TENANT_OS_PLAN.md`.
- Triage of `plans/`'s 19 files, the Arabic-named `خطة المحتوى الديناميكي.md`, and root loose files
  (`todo_list.md`'s own long-term fate, `roadmap_audit_may.md`, etc.) — unchanged Open Questions
  from the design phase, not resolved here.
- Any change to `SUPER_ADMIN_DASHBOARD_PLAN.md`, `TENANT_LIFECYCLE_PLAN.md`, or the other 7
  unrelated `architecture/` domain-plan files — confirmed out of scope by the Investigation.

## 6. Rollback Plan

Every phase is an independent commit; any single phase can be reverted with `git revert` without
touching the others, since later phases only ever *add* new files or *fix references* — none of
Phases 1–6 delete anything. Phase 7 (archiving `TENANT_OS_PLAN.md`) is the only phase touching an
existing file's location, and only after Phase 4's completeness check passes; reverting it is a
single `git mv` back. Phase 8's reference fixes are individually revertible per file if any single
rewritten reference turns out wrong.
