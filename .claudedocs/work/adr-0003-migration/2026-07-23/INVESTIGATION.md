# ADR-0003 Migration — Implementation Contract Investigation

Follows: `investigation-protocol.md` (evidence, Confirmed/Side Findings/Unknowns) and
`service-execution-constitution.md` (never execute before investigating), applied here to the
Implementation Contract itself, per Salman's explicit instruction that the Contract must be built
on real inventory + dependency analysis, not written as a first draft. **Zero files moved or
renamed as part of this document.**

---

## 1. Inventory — real, fresh (`find`/`wc -l`, 2026-07-23)

### `architecture/` (10 files + 1 mega-doc, 2,916 lines total excluding `TENANT_OS_PLAN.md`)

| File | Lines | Disposition |
|---|---|---|
| `TENANT_OS_PLAN.md` | 1,432 | **Split** — the actual migration target |
| `TENANT_OS_IMPLEMENTATION_REVIEW.md` | 349 | **Move** → `reviews/` (see §3 finding on flat reviews) |
| `database_report.md` | 296 | Unchanged — auto-generated, unrelated to Tenant OS |
| `routing_architecture.md` | 202 | Unchanged — unrelated domain |
| `SUPER_ADMIN_DASHBOARD_PLAN.md` | 237 | Unchanged — separate domain, heavily cross-referenced elsewhere (§2) |
| `TEMPLATE_ROADMAP_VISION.md` | 50 | Unchanged — separate domain |
| `TENANT_LIFECYCLE_PLAN.md` | 141 | Unchanged — separate domain, ADR-0002's own SSOT |
| `AGENT_DRIFT_AND_OBSERVABILITY_VISION.md` | 93 | Unchanged — unrelated |
| `AI_OPERATIONS_PLATFORM_VISION.md` | 54 | Unchanged — unrelated |
| `Storage_Architecture_Plan.md` | 44 | Unchanged — unrelated |
| `خطة المحتوى الديناميكي.md` (Arabic) | ~150 | Unchanged this pass — pre-dates the English docs; real triage deferred (Open Question, unchanged from the design phase) |

**Confirmed: only `TENANT_OS_PLAN.md` and `TENANT_OS_IMPLEMENTATION_REVIEW.md` are actually in
scope.** The other 9 files are separate domains ADR-0003 never proposed moving — re-confirmed here,
not assumed, so the Contract doesn't accidentally scope-creep into touching them.

### `adr/` (existing, 3 files, unchanged location)
`ADR-0001.md` (238), `ADR-0002.md` (145), `ADR-0003.md` (138) — stay exactly here.

### `reviews/` (existing, 5 files, 383 lines)
`ADR-0001_POST_IMPLEMENTATION_REVIEW.md`, `ADR-0002_POST_IMPLEMENTATION_REVIEW.md`,
`ADR-0002_CONTRACT02_POST_IMPLEMENTATION_REVIEW.md`, `BEIT_AL_FAKHAR_STORE_EXPERIENCE_REVIEW.md`,
`CONTENT_CAPABILITY_ARCHITECTURE_REVIEW.md` — all stay in this folder (see §3 finding); only
naming convention changes going forward.

### `roadmap/` (existing, 3 YAML files, 4,080 lines) — unchanged this pass; new markdown phase/sprint
files land here too (see §3 finding), YAML-vs-markdown coexistence question stays open (unchanged
from design phase).

### `work/`, `sessions/`, `implementation/`, `verification/`, `decisions/`, `plans/`, `templates/`,
`audits/`, `archive/`, root loose files — all unchanged, confirmed out of scope, matching the
already-approved design.

---

## 2. Dependency Analysis — real, grep-verified

### 2.1 — `TENANT_OS_PLAN.md`'s own internal structure

**177 internal `§NN`-style self-references** inside the file (`grep -c '§[0-9]'`). This is the
single biggest real risk in the whole migration: naively splitting the file without a stated
strategy for these would either take enormous manual effort to rewrite all 177, or silently leave
broken/misleading section references scattered across the new files.

**Resolution adopted for the Contract**: do not attempt to rewrite all 177 references file-by-file
in one pass. Each new split-out file gets a one-line header noting it was extracted from the
retired `TENANT_OS_PLAN.md` and that any bare `§NN` reference *inside that new file* now refers to
that file's own local numbering, not the old monolith's. Cross-file references (a principle citing
a Capability's finding, a Capability citing the Editing Engine ADR) are rewritten to real file paths
at split time, verified by a final `grep` sweep (see §4).

### 2.2 — External files with hard references that break on split/move

**Confirmed via grep, exact lines:**

| File | Reference | Fix required |
|---|---|---|
| `.claude/CLAUDE.md:62` | Restates the old 7-folder list inline | Rewrite to match ADR-0003 §4's tree |
| `.claude/agent/bo-hussein.md:223` | `TENANT_OS_PLAN.md §19` | Point to the new Findings location (per-Capability Open Findings section) |
| `.claude/rules/backend/architecture.md:115,135,149,152,157` | 5 separate `TENANT_OS_PLAN.md §NN` citations (§8, §14, §19) | Rewrite each to the specific new file (`capabilities/media.md`, the Editing Engine ADR, etc.) |
| `app/services/content_service.py:4` | `TENANT_OS_PLAN.md §1a` | Comment update, mechanical, low-risk |
| `app/services/media_service.py:5` | `TENANT_OS_PLAN.md §13` | Comment update, mechanical, low-risk |
| `frontend/src/tenant-os/schemas/content.js:4` | `TENANT_OS_PLAN.md §13, §14` | Comment update, mechanical, low-risk |
| `frontend/src/tenant-os/schemas/media.js:4` | `TENANT_OS_PLAN.md §13` | Comment update, mechanical, low-risk |
| `frontend/src/tenant-os/discovery.js:17` | `TENANT_OS_PLAN.md §14` | Comment update, mechanical, low-risk |
| `frontend/src/tenant-os/EditableRegion.jsx:15` | `TENANT_OS_PLAN.md §14` | Comment update, mechanical, low-risk |
| `frontend/src/pages/generic/normal/DynamicPage.jsx:236` | `TENANT_OS_PLAN.md §14; TENANT_OS_IMPLEMENTATION_REVIEW.md` | Comment update, mechanical, low-risk |

**Confirmed safe to leave untouched (historical raw record, per `documentation-policy.md` rule 1 —
sessions/work files are never rewritten):** `.claudedocs/sessions/2026-07-21.md`,
`.claudedocs/sessions/2026-07-22.md`, `.claudedocs/work/tenant-os-sprint1/.../SPRINT1_EVIDENCE.md`,
`.claudedocs/work/tenant-os-sprint2/.../SPRINT2_EVIDENCE.md`,
`.claudedocs/work/tenant-os-sprint3-phase0/.../PHASE0_INVESTIGATION.md`,
`.claudedocs/reviews/CONTENT_CAPABILITY_ARCHITECTURE_REVIEW.md`'s own historical citations. These
become "stale by design" once the split happens — a reader following a 2026-07-22 session log to
`TENANT_OS_PLAN.md §19` won't find that file anymore, and that's accepted, matching how session
logs already reference plenty of retired/superseded state. **One exception**: `.claudedocs/
todo_list.md` is a *living* document (updated constantly, not a historical log) and does reference
`TENANT_OS_PLAN.md` by path — this needs updating, unlike the frozen session/work files.

### 2.3 — Real finding: the approved folder tree has an unnecessary nesting duplication

**This is exactly the kind of thing Salman's own Dependency Analysis question ("هل هناك ملفات
مكانها الحالي منطقي أصلاً؟") asks to surface, so it's reported here rather than silently
corrected or silently kept.**

The design approved via `ExitPlanMode` nests `reviews/`, `roadmap/`, and a Tenant-OS-scoped `adr/`
*inside* `architecture/` (`architecture/reviews/`, `architecture/roadmap/`, `architecture/adr/`) —
alongside the **already-existing, separate, top-level** `.claudedocs/reviews/`,
`.claudedocs/roadmap/`, `.claudedocs/adr/` folders. That produces two folders with the same name at
different depths, distinguished only by nesting — exactly the kind of ambiguity the whole redesign
exists to eliminate.

Today's new guidance (the `tenant-verification-template.md` request) confirms this concretely:
Salman's own original review-file examples (`editing-engine-review.md`, `content-capability-
review.md`, **`store-experience-review.md`**, `tenant-os-implementation-review.md`) already mix an
architecture-level review with a tenant-level one (beit-al-fakhar's Store Experience Review) in one
flat list, with no architecture-vs-tenant folder split implied. A `tenant-verification-template.md`
generalizing that same pattern for future tenants (barber, footlab, ...) is not a Tenant-OS-specific
artifact — it's a general Reviews concept. Splitting it into a nested
`architecture/reviews/` would separate it from exactly the sibling reviews it's meant to sit
alongside.

**Recommendation (not yet executed, flagged for confirmation in the Contract below)**: collapse
the three nested folders back into their existing top-level counterparts —
- `architecture/reviews/` → use the existing top-level `.claudedocs/reviews/` (already holds 5 real
  files; extend it with the new flat `<name>-review.md`/`<name>-verification.md` naming going
  forward, no new folder).
- `architecture/roadmap/` → use the existing top-level `.claudedocs/roadmap/` (the new
  `phase-N.md`/`sprint-N.md` markdown files sit alongside the existing YAML files).
- `architecture/adr/` (Tenant-OS-scoped `TOS-XXX`) → use the existing top-level `.claudedocs/adr/`,
  distinguished from platform ADRs by filename prefix only (`ADR-0001`/`TOS-001` side by side in one
  folder), not by nested location. This still fully honors the "keep the sequences separate"
  decision — separate *numbering*, not necessarily separate *folders*.

`principles/` and `capabilities/` have no pre-existing top-level equivalent — no collision, stay
nested under `architecture/` exactly as designed.

---

## 3. Real Migration Scope, Narrowed by This Investigation

Given §1/§2's findings, the actual migration is smaller than the original folder tree implied:

**Moves/creates:**
1. New: `architecture/README.md`, `architecture/INDEX.md`, `architecture/TENANT_OS.md` (tiny),
   `architecture/principles/*.md`, `architecture/capabilities/*.md` (8 files).
2. New (into the *existing* top-level folders, per §2.3's recommendation): a handful of
   `adr/TOS-00X-*.md` files, `reviews/<name>-review.md` renames of the 2 orphan reviews +
   `reviews/tenant-verification-template.md`, `roadmap/phase-N.md`/`sprint-N.md`.
3. Retire: `TENANT_OS_PLAN.md` (content fully redistributed, file removed at the end, not before
   every destination is verified to contain its content).
4. Retire/move: `architecture/TENANT_OS_IMPLEMENTATION_REVIEW.md` → `reviews/editing-engine-review.md`.
5. Rename in place: `reviews/CONTENT_CAPABILITY_ARCHITECTURE_REVIEW.md` →
   `reviews/content-capability-review.md`, `reviews/BEIT_AL_FAKHAR_STORE_EXPERIENCE_REVIEW.md` →
   `reviews/store-experience-review.md` (per the naming convention going forward).
6. Fix references: `CLAUDE.md:62`, `bo-hussein.md:223`, `backend/architecture.md` (5 lines), 7 code
   comment lines, `todo_list.md`.
7. Update: `.claude/rules/documentation-policy.md`'s "Fixed folder structure" section to match.

**Confirmed untouched**: the other 9 `architecture/` domain-plan files, `adr/` (ADR-0001/0002
content unchanged, only new siblings added), `work/`, `sessions/`, `implementation/`,
`verification/`, `decisions/`, `plans/`, `templates/`, `audits/`, `archive/`, root loose files.

---

## Confirmed Findings

- Only 2 of 11 files in `architecture/` are actually part of this migration; the rest were already
  correctly out of scope, now re-confirmed rather than assumed.
- 177 internal cross-references inside `TENANT_OS_PLAN.md` are the largest real risk; handled by a
  stated per-file convention rather than an attempt to rewrite all of them individually.
- 10 external hard references confirmed (3 rule/agent files, 7 code comments, 1 living doc) — each
  with an exact line number and required fix, not a vague "update references" note.
- The approved folder tree has one real design flaw — needless nested duplicate folders for
  reviews/roadmap/adr — caught by exactly the Dependency Analysis question Salman asked for
  ("is a file's current/planned location actually correct?"), not discovered after the fact.

## Side Findings

- `SUPER_ADMIN_DASHBOARD_PLAN.md`, `TENANT_LIFECYCLE_PLAN.md` are each cross-referenced by 8–13
  other files (session logs, verification docs, `.claude/memory.md`) — confirms they're correctly
  load-bearing, separate domains, not incidentally movable without a much larger investigation of
  their own.

## Unknowns

- Whether any *other* file outside `.claude/` and `.claudedocs/` (e.g. a README, a wiki, external
  documentation) references `TENANT_OS_PLAN.md` by path — not checked; out of scope for this
  repo-internal investigation.
