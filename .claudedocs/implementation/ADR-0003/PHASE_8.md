# ADR-0003 Implementation — Phase 8 Verification

Governs: `implementation/ADR-0003/CONTRACT.md` §3, Phase 8 (Fix External References).

## What Was Done

All 11 real references named in the Contract, fixed:

1. `.claude/CLAUDE.md:62` — the stale 7-folder blurb rewritten to name ADR-0003's real six-layer
   `architecture/` model instead of the old flat list.
2. `.claude/agent/bo-hussein.md:223` — `TENANT_OS_PLAN.md §19` → the general pattern
   `capabilities/<name>.md`'s own Open Findings section (this citation is a standing responsibility
   statement, not about one specific Capability, so it points at the pattern, not one file).
3. `.claude/rules/backend/architecture.md:115,135,149,152,157` — all 5 citations rewritten:
   §9's own citation → `capabilities/*.md` (SSOT) + `TENANT_OS.md` (taxonomy); §10's four citations
   → `TOS-002-editing-engine.md` (twice), the new Architecture Integrity Finding Taxonomy in
   `TENANT_OS.md` (added this phase — see Gap below), and `capabilities/content.md`/`media.md`.
4. `.claude/rules/documentation-policy.md` — "Fixed folder structure" section replaced in full
   with ADR-0003 §4's real six-layer tree (including the `implementation/ADR-000X/` vs.
   `implementation/ADR-000X_...` naming split already true for ADR-0003 vs. ADR-0001/2); added the
   4-rule standing cross-reference paragraph (this file, `investigation-protocol.md`,
   `service-execution-constitution.md`, `repository-hygiene.md`).
5. `app/services/content_service.py:4` — comment updated.
6. `app/services/media_service.py:5` — comment updated. **Also fixed in the same edit**: a second
   stale reference on the same line to the old `TENANT_OS_IMPLEMENTATION_REVIEW.md` name (not in
   the Contract's original list — found while reading the file, see Gap below).
7. `frontend/src/tenant-os/schemas/content.js:4` — comment updated (2 citations: Capability
   contract → `capabilities/content.md`; Schema/Operation model → `TOS-002-editing-engine.md`).
   **Also fixed**: a third stale reference to `CONTENT_CAPABILITY_ARCHITECTURE_REVIEW.md`'s old
   name, same file.
8. `frontend/src/tenant-os/schemas/media.js:4` — comment updated, same two-citation split.
9. `frontend/src/tenant-os/discovery.js:17` — comment updated. **Also fixed**: two more stale
   references on lines 7 and 9 to the old review filenames, found while reading the file.
10. `frontend/src/tenant-os/EditableRegion.jsx:15` — comment updated. **Also fixed**: one more
    stale reference on line 9 to the old `TENANT_OS_IMPLEMENTATION_REVIEW.md` name.
11. `frontend/src/pages/generic/normal/DynamicPage.jsx:240` (line shifted from the Contract's
    `:236` since the file grew — found by re-grepping rather than trusting the stale line number)
    — comment updated, both citations (`TOS-002-editing-engine.md`,
    `reviews/editing-engine-review.md`).
12. `.claudedocs/todo_list.md` — 3 references fixed (site-configuration.md citation, the
    `ReplaceMedia` Gap's citation), and the "Architecture Documentation System — Implementation
    Contract" todo item itself marked `[x]` Done 2026-07-27 with a real summary, since it was
    stale in a bigger way than just its filename (it described the migration as not yet started).

**Gap found and fixed, beyond the Contract's original 11**: a full repo grep after fixing the
listed 11 found **6 more live, non-historical code references** to the two files Phase 2 renamed
(`TENANT_OS_IMPLEMENTATION_REVIEW.md` → `reviews/editing-engine-review.md`,
`CONTENT_CAPABILITY_ARCHITECTURE_REVIEW.md` → `reviews/content-capability-review.md`) that the
Contract's Investigation never caught, since it was scoped to `TENANT_OS_PLAN.md` citations
specifically, not the two renamed review files: `app/api/v1/admin/content.py` (2 citations),
`app/api/v1/admin/media.py` (1), `app/repositories/content_sections_repo.py` (1),
`frontend/src/pages/generic-admin/GenericAdminDashboard.jsx` (1), plus the extra lines in
`discovery.js`/`EditableRegion.jsx`/`media.js` noted above. All fixed in this same phase rather
than left for a future pass, since they're the same category of live-reference staleness this
phase exists to close.

## Preconditions Check

Phase 7 committed (`0065da4`) — confirmed via `git log --oneline` before starting; the real new
paths (`capabilities/*.md`, `adr/TOS-*.md`, `TENANT_OS.md`, `archive/TENANT_OS_PLAN.md`) all exist.

## Validation

```
$ grep -rln "TENANT_OS_PLAN\|TENANT_OS_IMPLEMENTATION_REVIEW\|CONTENT_CAPABILITY_ARCHITECTURE_REVIEW\|BEIT_AL_FAKHAR_STORE_EXPERIENCE_REVIEW" \
  --include="*.py" --include="*.js" --include="*.jsx" .
(zero output)
```
Zero live code references remain to any of the retired/renamed filenames.

```
$ grep -n "TENANT_OS_PLAN" .claude/CLAUDE.md .claude/agent/bo-hussein.md \
  .claude/rules/backend/architecture.md .claude/rules/documentation-policy.md
(zero output)
```
All 4 rule/config files clean.

**Remaining `.md` hits** (checked individually, all confirmed intentional): historical
`sessions/*.md` and `work/*.md` files (explicitly left stale by design, Contract's own list); the
archived `archive/TENANT_OS_PLAN.md` itself (self-referencing its own former name/content — the
document, not a dangling pointer); `reviews/editing-engine-review.md` and
`reviews/content-capability-review.md`'s own historical prose (point-in-time review records,
immutable per `documentation-policy.md` rule 1's reviews-are-not-rewritten precedent); this
project's own new documentation (`adr/TOS-*.md`, `principles/*.md`, `capabilities/*.md`,
`ADR-0003.md`, `INDEX.md`, `implementation/ADR-0003/PHASE_*.md`) citing `TENANT_OS_PLAN.md §N` as
honest *provenance* ("extracted from §N") — not a live pointer expecting the file at its old path,
the same distinction the Contract itself draws for `ADR-0003.md`'s own text.

## Gap Also Fixed: Architecture Integrity Finding Taxonomy

Discovered while rewriting `backend/architecture.md`'s §10 citation (originally
`TENANT_OS_PLAN.md §19's existing taxonomy`): the three finding-type *definitions* (Broken/
Missing/Duplicate Architecture) were never given a real new home during Phases 3–5 — only their
*labels* were reused inside each Capability file's Open Findings section, never their meanings.
Fixed by adding an "Architecture Integrity Finding Taxonomy" section to `TENANT_OS.md` (between
"Capability Lifecycle" and "Capabilities") defining all three once, which `backend/architecture.md`
§10 now cites directly.

## Acceptance Criteria

- ✓ All 11 live references fixed (plus 6 more found and fixed in the same pass, same category)
- ✓ Historical files' stale references confirmed intentional, not missed (checked individually
  above, not assumed)
- ✓ `documentation-policy.md` now correctly describes the real folder structure

## Navigation Check

Followed the rewritten reference in `bo-hussein.md` and in `CLAUDE.md`: `bo-hussein.md`'s
`capabilities/<name>.md` pattern correctly describes where any future Broken/Missing/Duplicate
Architecture finding should be logged (verified against `capabilities/catalog.md`'s own Open
Findings section, which follows exactly this pattern). `CLAUDE.md`'s rewritten line correctly
names every real folder now under `architecture/` (`principles/`, `capabilities/`, `TENANT_OS.md`,
`README.md`, `INDEX.md`) — no detour through a stale path. **Passes.**

## Migration Status

All 8 phases of `implementation/ADR-0003/CONTRACT.md` complete. `TENANT_OS_PLAN.md` retired to
`archive/`, replaced by the six-layer `architecture/` structure ADR-0003 §4 decided. Two real,
named exceptions remain open, not silently closed: §23–24 (deferred, out of Contract scope) and
Units/Team-Staff (no `capabilities/*.md` file yet, since neither has passed the Capability
Proposal gate) — both readable only in the archived copy until a future ADR/Implementation
Contract picks them up.
