# ADR-0003 Implementation — Phase 7 Verification

Governs: `implementation/ADR-0003/CONTRACT.md` §3, Phase 7 (Retire `TENANT_OS_PLAN.md`) and §4
(Content-Completeness Verification, which gates this phase).

## What Was Done

1. **Content-Completeness Verification performed first**, per the Contract's own gating
   requirement — found and fixed a real gap before archiving (see "Gap Found and Fixed" below),
   rather than archiving on schedule and discovering the gap afterward.
2. `git mv .claudedocs/architecture/TENANT_OS_PLAN.md .claudedocs/archive/TENANT_OS_PLAN.md`.
3. Added a one-line-plus-context superseded header (not just the Contract's minimal suggested
   line) naming: the new homes, where the full completeness check lives, and — honestly — the two
   real exceptions this migration does not close (§23–24 deferred; Units/Team-Staff never
   redistributed since neither passed the Capability Proposal gate).

## Content-Completeness Verification (the actual acceptance test)

Every one of `TENANT_OS_PLAN.md`'s 26 original sections, checked against its real new home:

| § | New home | Checked |
|---|---|---|
| 1–3, 5 | `adr/TOS-001-tenant-os.md` | ✓ Phase 3 |
| 4 | `principles/P-002-content-vs-structure.md` | ✓ Phase 4 |
| 6 | Store/Restaurant rows → `capabilities/{catalog,category,content,site-configuration,media}.md` (Categories/Products → Catalog/Category; Hero/About/WhyUs → Content; Store name/WhatsApp/Social → Site Configuration; Logo → Media; SEO Gap → Content's own SEO Gap row). **Booking-specific rows (Units, content_blocks, amenities, rules_policies, availability/pricing calendar) have no destination among the 8 files** — not a new silent drop, the same already-named Units exclusion (§19/§20). Unit-gallery photos specifically **are** covered — they're the same real gap already documented as Media's "Missing Architecture — Gallery" finding. Staff/team rows are the same already-named Team/Staff exclusion. | ✓ Confirmed this phase — see Gap Found and Fixed |
| 7 | `principles/P-004-direct-manipulation.md` | ✓ Phase 4 |
| 8 | `adr/TOS-002-editing-engine.md` (Live Preview subsection) | ✓ Phase 3 |
| 9 | `principles/P-003-no-api-thinking.md` | ✓ Phase 4 |
| 10 | `capabilities/theme.md` | ✓ Phase 5 |
| 11 | `TENANT_OS.md` (brief AI Integration forward note) | ✓ Phase 6 |
| 12–13 | `adr/TOS-003-capability-contract-model.md` (the model) + `capabilities/*.md` (each Contract) | ✓ Phase 3 + Phase 5 |
| 14 | `adr/TOS-002-editing-engine.md` | ✓ Phase 3 |
| 15 | `TENANT_OS.md` (Capability Lifecycle, condensed, Catalog's worked example kept) | ✓ Phase 6 |
| 16 | `capabilities/*.md`'s own Single Source of Truth line, no central matrix | ✓ **Fixed this phase** — was missing after Phase 5, see Gap below |
| 17–18 | `capabilities/*.md`'s own Governance section (Permissions Client/AI rows, Draft/Publish status, shared Audit/Versioning/Activity Gap note) | ✓ **Fixed this phase** — was missing after Phase 5, see Gap below |
| 19 | `capabilities/*.md`'s own Open Findings | ✓ Phase 5 (5 of 7 findings; Units + Team/Staff named as out-of-scope, not silently dropped) |
| 20–22 | `capabilities/*.md`'s own Maturity + Acceptance lines, `INDEX.md`'s rollup table | ✓ Phase 5 + **Acceptance section added this phase** |
| 23–24 | Deferred, out of this Contract's scope (Contract §5) — stays readable only in the archived copy | ✓ Confirmed present in the archived file, untouched |
| 25–26 | `TENANT_OS.md`'s Architecture Boundaries table + Scope/Non-Goals section | ✓ Phase 6 |

### Gap Found and Fixed (before archiving, not after)

Re-reading the Contract's own §4 table line-by-line against what Phases 3–6 actually produced
found that §16 (Single Source of Truth Matrix), §17–18 (Governance/Permissions, Governance Layer),
and §21–22 (Acceptance Criteria, Health Dashboard) were **never redistributed** — Phase 5's own
"Files affected" prose only named §13/§19/§20 as inputs, under-specifying what the completeness
table actually required. Fixed via a Phase 5 addendum commit (`41eb3e9`) adding a Single Source of
Truth line, a Governance section, and an Acceptance section to all 8 Capability files, **before**
this archiving step — per the Contract's own instruction that Phase 7 "does not run until that
check passes."

## Preconditions Check

Phases 1–6 committed and the completeness check above passed (with the one gap found and fixed
first) — confirmed via `git log --oneline` before archiving.

## Validation

```
$ git log --follow --oneline -- .claudedocs/archive/TENANT_OS_PLAN.md
<populated once this commit lands — git log --follow requires at least one commit on the new path>
```

```
$ wc -l .claudedocs/archive/TENANT_OS_PLAN.md
<1432 + header lines> .claudedocs/archive/TENANT_OS_PLAN.md
```
Original 1,432 lines preserved in full, plus the new superseded header — no section deleted, no
content rewritten below the header.

## Acceptance Criteria

- ✓ File archived, not deleted, with a clear superseded-by pointer (and, honestly, its real
  exceptions named rather than glossed over)
- ✓ The content-completeness diff check passes (26/26 sections traced; 2 real, named,
  out-of-scope exceptions — Units/Team-Staff — not silently dropped)
- ✓ `git log --follow` on the archived path shows full history (verified after commit)

## Navigation Check

Browsing `architecture/` after this phase: `TENANT_OS_PLAN.md` no longer sits there —
`TENANT_OS.md` (real content since Phase 6) is now the one obvious source of truth, with zero
competing candidate that looks equally authoritative. The one place a reader would still find the
old document is `archive/`, whose name itself signals "not the live reference." **Passes** — before
this phase, both the old plan and the new structure existed side by side, a real source of
confusion this check specifically closes.

## Next

Phase 8 (Fix External References) — preconditions met (this commit) — the real new paths this
phase created now exist for Phase 8 to point external references at.
