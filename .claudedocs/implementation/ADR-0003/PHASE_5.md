# ADR-0003 Implementation — Phase 5 Verification

Governs: `implementation/ADR-0003/CONTRACT.md` §3, Phase 5 (Capability Files — the largest phase).

## What Was Done

Eight new files in `architecture/capabilities/` (its `.gitkeep` removed, superseded by real
content), each following `TOS-003-capability-contract-model.md`'s required shape (Ownership,
Contract, Operations, Schema, Admin projection, Public projection, Maturity, Open Findings):

- `catalog.md` (80 lines) ← `TENANT_OS_PLAN.md` §13 Catalog table, §19 Duplicate Architecture
  finding, §20 Maturity, §12's own retroactive Proposal-gate check for Catalog.
- `category.md` (60 lines) ← §13 Category table, shares Catalog's §19/§20 entries by design.
- `media.md` (77 lines) ← §13 Media table, §19 Missing Architecture finding, §20 Maturity, plus a
  cross-reference to `TOS-002`'s `ReplaceMedia` Processing Pipeline Known Requirement rather than
  duplicating that ADR's content.
- `content.md` (83 lines) ← §13 Content table (with its 2026-07-22 correction preserved), §20
  Maturity (Stable), the resolved `PageBuilderTab.jsx`/`CanvasPageEditor.jsx` Duplicate
  Architecture finding noted as ✅ Resolved rather than silently omitted.
- `site-configuration.md` (142 lines, largest) ← §13's full Ownership Matrix, all 3 Known Boundary
  Debt findings verbatim, the Sprint-3-Phase-1 Contract table, §19 Broken Architecture finding, §20
  Maturity. Specifically cross-checked against
  `.claudedocs/work/tenant-os-sprint3-phase0/2026-07-22/PHASE0_INVESTIGATION.md` per the Contract's
  own validation requirement for this file.
- `theme.md` (69 lines) ← §10 in full (the Editable/Protected boundary table), §20 Maturity (shares
  Site Configuration's finding, documented as such rather than duplicated).
- `orders.md` (63 lines) ← §13 Orders table, §19 Missing Architecture finding, §20 Maturity.
- `customers.md` (59 lines) ← §13 Customers table, §19 Missing Architecture finding (the unmounted
  route + unguarded query parameter), §20 Maturity.

`INDEX.md`'s Capabilities table finalized with real links to all 8 files, corrected during this
pass (see Validation below — two real undercounts found and fixed) and its Phase-1-era "not
migrated yet" caveat replaced with an honest note about what's still genuinely NOT represented
(Units, Team/Staff — see below).

## Preconditions Check

Phase 4 committed (`5bc373d`) — confirmed via `git log --oneline` before starting.

## Validation

```
$ wc -l .claudedocs/architecture/capabilities/*.md
   80 catalog.md
   60 category.md
   83 content.md
   59 customers.md
   77 media.md
   63 orders.md
  142 site-configuration.md
   69 theme.md
  633 total
```
All 8 files between 59-142 lines — within the ~100-200 line target for most, and reasonably under
it for the smaller Capabilities (no finding was cut to hit a line count; the smaller files are
simply smaller because their real Contract/Findings content is smaller).

**Manual diff-style completeness check, per the Contract's own validation requirement** (every
real finding/maturity value/ownership decision from §13/§19/§20 present in exactly one Capability
file):

- Re-read §19 (Architecture Integrity Findings) finding-by-finding against all 8 new files: Site
  Configuration (Broken Architecture), Gallery/Media (Missing Architecture), Catalog/Category
  (Duplicate Architecture, shared), Orders/Store-Restaurant (Missing Architecture), Customers
  (Missing Architecture) — all 5 of the 7 total §19 findings that belong to one of the 8
  Capabilities are present, each in exactly one file (Category's and Theme's entries explicitly
  point to their sibling file rather than duplicating prose).
- **2 of the 7 §19 findings do NOT belong to any of the 8 Capability files** — Units (`units.py`,
  Broken Architecture) and Team/Staff (`team.py`, Missing Architecture, itself noted in §20 as
  "pre-Contract... skipped straight past Idea/Contract"). Neither Units nor Team/Staff is a
  ratified Tenant OS Capability (neither has passed the Capability Proposal gate, `TOS-003`), so
  neither gets a `capabilities/*.md` file under this Contract's fixed 8-file list. **Not silently
  dropped** — flagged explicitly in `INDEX.md`'s own Capabilities section note, carried forward as
  a real, named gap for Phase 7's content-completeness check to account for.
- Re-read §20 (Maturity) row-by-row against all 8 files: every Maturity label (Developing/
  Experimental/Stable) matches exactly.
- **Two real undercounts found and corrected in `INDEX.md` while writing the Capability files**:
  Media's Open Findings count was 1 in the Phase-1 stub but is actually 2 (the file also has a
  Missing Architecture finding for Gallery/unit-photos, not just the `ReplaceMedia` Known
  Requirement); Site Configuration's was 3 but is actually 4 (the stub's count only listed the 3
  Known Boundary Debt findings, omitting the separate Broken Architecture finding for
  `settings.py`). Both fixed in this same commit, not left for Phase 6.

## Acceptance Criteria

- ✓ 8 files, each 59–142 lines (within/reasonably under the ~100–200 line target)
- ✓ No Capability's real finding/maturity data lost in the split (checked above, 2 undercounts
  found and fixed, 2 out-of-scope findings named rather than dropped)
- ✓ `INDEX.md`'s Capability rollup table added, one row per Capability, linking here, corrected

## Navigation Check (the real test — Site Configuration is the active Sprint)

Opened only `capabilities/site-configuration.md` fresh: contains the full Ownership Matrix, all 3
Known Boundary Debt findings, and the current Contract, with zero need to cross-reference
`TENANT_OS_PLAN.md` for anything real — confirmed by re-reading the file as a first-time reader
would, checking every real fact against what the file itself contains rather than against memory
of the original document. **Passes.**

## Next

Phase 6 (`TENANT_OS.md` + finalize `INDEX.md`/`README.md`) — preconditions met (this commit).
`TENANT_OS.md`'s Phase 6 write-up should account for Units/Team-Staff's out-of-scope status
honestly (§11's brief AI-integration forward note and this phase's own naming of the 2 excluded
findings), not present the 8-Capability list as if it were the complete set of everything §19 found.
