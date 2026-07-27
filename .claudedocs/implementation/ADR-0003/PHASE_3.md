# ADR-0003 Implementation — Phase 3 Verification

Governs: `implementation/ADR-0003/CONTRACT.md` §3, Phase 3 (Tenant OS ADRs).

## What Was Done

Three new files created in the existing top-level `.claudedocs/adr/` folder, alongside
`ADR-0001/2/3`, distinguished by the `TOS-` prefix per `ADR-0003.md` §4:

- `adr/TOS-001-tenant-os.md` (133 lines) — extracted from `TENANT_OS_PLAN.md` §1 (Positioning),
  §2 (Problem), §3 (Design Principles — index only, full text deferred to Phase 4's
  `principles/*.md`), §5 (Anatomy).
- `adr/TOS-002-editing-engine.md` (220 lines) — extracted from §14 in full (the Capability →
  Operation → Schema → Renderer decision, `EditableRegion`, the concrete Testimonials test, the
  two real tracks, the `ReplaceMedia` Processing Pipeline Known Requirement) plus §8 (Live Preview
  — folded in here since it is the Editing Engine's own Draft/Publish mechanism, per the Contract's
  Content-Completeness table) and the Admin/Public Contract split subsection.
- `adr/TOS-003-capability-contract-model.md` (141 lines) — extracted from §12 (Capability
  Proposal gate, in full, including the Catalog retroactive sanity check) and only §13's own
  meta-decision (that Capability Contracts exist, the third disambiguated sense of
  "Capability"/"Service," and the required Ownership/Contract/Operations/Schema/Admin
  projection/Public projection/Maturity/Open Findings shape) — explicitly **not** the 7 individual
  Capability tables (Catalog, Category, Media, Site Configuration, Content, Orders, Customers),
  which are live Sprint-by-Sprint data reserved for Phase 5's `capabilities/*.md`, not decision
  content.

Each follows the same ADR structure as `ADR-0001/2/3` (Context, Decision Drivers, Options
Considered, Decision, Single Source of Truth, Scope/Non-Goals, Consequences) — written fresh
against the original sections' real content, not copy-pasted prose.

## Preconditions Check

Phase 2 committed (`fa40734`, `78a0e5d`) — confirmed via `git log --oneline` before starting.

## Validation

```
$ wc -l .claudedocs/adr/TOS-00{1,2,3}-*.md
  133 TOS-001-tenant-os.md
  220 TOS-002-editing-engine.md
  141 TOS-003-capability-contract-model.md
  494 total
```

Traceability check — every real Decision Driver/Option/Consequence in each new ADR checked against
its source section(s) in `TENANT_OS_PLAN.md` (still live, untouched — confirmed by `wc -l` on it
still reading 1432 lines at this point in the migration):

- `TOS-001` ← §1 (Positioning, the three-document backbone framing, the
  `SUPER_ADMIN_DASHBOARD_PLAN.md`/`AI_OPERATIONS_PLATFORM_VISION.md` disambiguation), §2 (the
  Beit Al-Fakhar Store Experience Review motivation, the "building the product every client will
  use" reframing), §3 (all 5 principles listed, with principle 5 correctly marked as *not* owned
  here), §5 (the full anatomy tree, the Capability Proposal / Editing Engine "outside the tree"
  notes) — nothing dropped.
- `TOS-002` ← §14 in full (the fake-canvas investigation, the core Capability→Operation→Schema→
  Renderer correction, `EditableRegion`, the Testimonials test, both real tracks, the
  `ReplaceMedia` Known Requirement table, the "what this section deliberately does not do"
  boundary) + §8 (Live Preview's real `<iframe>`/`postMessage` precedent, the draft/live staging
  question left undecided) + the Admin/Public Contract split subsection (the real file citations,
  the Draft Storage diagram) — nothing dropped.
- `TOS-003` ← §12 in full (all 5 gate questions, the full Catalog retroactive table) + §13's
  opening meta-decision paragraph (the three-senses-of-"Service" disambiguation) and its Capability
  file required-shape list — deliberately excludes every one of §13's 7 real Capability tables,
  confirmed by re-reading `TOS-003-capability-contract-model.md`'s own §6 Scope/Non-Goals section,
  which names this exclusion explicitly.

## Acceptance Criteria

- ✓ 3 ADRs created, `TOS-` prefix, in the existing `adr/` folder alongside `ADR-0001/2/3`
- ✓ Every Decision Driver/Option/Consequence traceable back to the original section(s) (checked
  above, not assumed)
- ✓ `TENANT_OS_PLAN.md` itself untouched — still the fallback reference until Phase 7 (confirmed:
  this phase only read it, `git status` shows zero modification to it)

## Navigation Check (real, performed, not assumed)

Task: "why does the Editing Engine work as Capability→Operation→Schema→Renderer instead of a
click-to-edit UI." `ls .claudedocs/adr/` shows `TOS-002-editing-engine.md` sitting directly
alongside `ADR-0001.md`/`ADR-0002.md`/`ADR-0003.md` — the `TOS-` prefix alone (no need to open the
file) tells a reader this is a Tenant-OS-scoped decision, distinct in kind from the three
platform-wide ADRs beside it. **Passes**, under 30 seconds, prefix alone sufficient.

## Next

Phase 4 (Principles) — preconditions met (this commit). Note for Phase 4: `TOS-001`'s §4.4 lists
the 4 expected principle files (`P-001-dashboard-first`, `P-002-content-vs-structure`,
`P-003-no-api-thinking`, `P-004-direct-manipulation`) by name already, so Phase 4's exact filenames
are no longer an open question — confirmed by this phase's own extraction.
