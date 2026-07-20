# Repository Drift Audit — 2026-07-20

**Trigger:** Deciding whether to start the Store template's Service Contract right after
committing the Restaurant-template frontend fix (`5656a12`). `git status` still showed 126 dirty
entries — building Store on an unreviewed tree risked assuming things about "Restaurant as golden
reference" that were never actually checked.

**Method:** Real, read-only investigation of every bucket — `git status --porcelain`, `git diff
--stat`, `readlink`, `file`, `git log --all -- <path>` — not guessed from filenames. Per
`.claude/rules/repository-hygiene.md`'s Audit Evidence requirement.

## Starting count

`git status --porcelain` → **126 entries**, immediately after `5656a12`.

## Classification (Repository Drift Categories)

| Category | Count | Disposition |
|---|---|---|
| External | ~90 | Left untouched — deferred to a future skills-section review |
| Forgotten | ~15 (first pass) + 2 more (closing sweep) = 17 | Committed, 9 scoped commits |
| Deferred | 2 | Left untouched, owner decision on record |
| Superseded | 1 | Marked Deprecated, removal deferred to a later commit |
| Personal/local config (new observation, not yet a standing category) | 1 | Left untouched |
| Experimental (first real instance) | 1 | Left untouched, flagged |

## External (~90 entries) — not resolved this pass

An external skills package manager, unrelated to SalmanSaaS. `skills-lock.json` (lockfile citing
GitHub sources like `emilkowalski/skill`, `leonxlnx/taste-skill`) installs skills into
`.agents/skills/{name}/` and symlinks `.claude/skills/{name}` to them. This explains the 62
"deleted" `impeccable` files (not gone — `.claude/skills/impeccable` used to be a real committed
directory, now a symlink to `.agents/skills/impeccable`, content verified intact via `readlink`
and `stat`) plus ~24 new symlinked `.claude/skills/{name}` entries. `.claude.zip` (12MB, verified
via `file` as a real zip archive) is very likely this same tool's cache/export.

**Decision (Salman):** leave untouched — wants it placed properly for a future skills-section
review, not resolved now.

## Forgotten — 9 commits, `acaf249` through `3b45eac`

1. `acaf249` — `docs(rules)`: `engineering-manager-mode.md` + `team-roles.md` (never in
   `git log --all` at all, despite governing the whole session)
2. `cded13e` — `fix(routing)`: `App.jsx` root redirect `/smar` → `/showcase`
3. `14e9ddd` — `docs(env)`: `.env.example`, 24 new lines for already-real env vars
4. `55c28a9` — `feat(caracas/arizona)`: Story Reel + Special page, 17 files (5 components, 2
   `HomePage.jsx` trims, 1 route file, 8 frame images, 2 reference videos)
5. `e7ccda2` — `feat(anas onboarding)`: 2 scripts + `wrangler.toml`
6. `1b6923a` — `docs(local-agent)`: Phase 1 docs restructure (24 files) + small code polish
7. `39a7866` — `docs(sessions)`: 4 backlog session logs, 2026-07-12 → 2026-07-15
8. `033a303` — `docs(local-agent)`: trim `phase1-plan.md` — **caught in the closing sweep, not
   the first pass** (see "Correction" below)
9. `3b45eac` — `chore`: `start_dev.sh` — **also caught in the closing sweep**

## Deferred — 2 items, left untouched

- `.agent.md` (root, "Security-First Backend & Cloud Architect" persona) — Salman knows its
  source, will explain separately.
- `.claudelocaldocs/MASTER_PLAN.md` (694 lines, whole-platform scope in the local-agent-only docs
  folder) — leave in place despite the mismatch, per Salman's explicit call.

## Superseded — 1 item

`.claudedocs/plans/Architecture_Design_Request.md` — same raw "AI Operations ERP" request already
captured in `AI_OPERATIONS_PLATFORM_VISION.md` this session. Commit `e5fb6df` added a Deprecated
header pointing to the superseding doc; actual `rm` deferred to a later commit per Salman's
explicit two-phase call (Deprecated → Archived → Removed, not a direct delete).

## Governance produced by this audit

Commit `6735733`: new `.claude/rules/repository-hygiene.md` (this file's own taxonomy + the
Reference Validation Rule + this Audit Evidence convention + Bo Hussein's standing Repository
Hygiene responsibility), registered in `CLAUDE.md`, cross-referenced from
`TEMPLATE_ROADMAP_VISION.md` and `bo-hussein.md`.

## Correction — closing sweep found what the first pass missed

Re-running `git status --porcelain` after commit `6735733` still showed 94 entries, not the
expected "only Deferred/External remain." Investigating the surplus (Constitution Principle 1:
real state over memory, not the plan's prediction) found 4 items the original investigation
missed:

- `.claudelocaldocs/local-agent-phase1-plan.md` — a real, already-tracked file with an uncommitted
  edit (92 deletions / 9 insertions, trimming it to a "moved to `local-agent/docs/`" stub). Real
  Forgotten-category work, missed because the first pass only looked at untracked (`??`) entries
  in this area and didn't check for modified-but-tracked files nearby. Committed as `033a303`.
- `start_dev.sh` — real, already in active use this session (used to diagnose the tenant-seeder
  port bug earlier today) — a genuine oversight, not previously classified at all. Committed as
  `3b45eac`.
- `.claude/settings.local.json` (modified, not untracked) — contains machine-specific absolute
  paths (a Windows path under `c:\Users\salma\...`) and a local Bash/PowerShell permission
  allow-list. This is personal/local tool configuration, not project content — a category this
  audit's original 4-category taxonomy didn't anticipate. **Left untouched**, not committed:
  committing it would version a specific machine's local paths. Not yet added to
  `repository-hygiene.md`'s taxonomy — one real case isn't enough to generalize from, same
  Abstraction-Rule discipline the taxonomy itself already states.
- `new-matirial/` (50MB — HTML mockups, images, videos, research docs) — this is a real instance
  of the **Experimental** category the taxonomy named in advance but had zero populated examples
  of. Verified via `find`/`du`, not assumed. **Left untouched, flagged, not resolved this pass** —
  its size alone (50MB of binary media) makes "just commit it" the wrong default without an
  explicit decision on whether it belongs in git at all.

This correction is itself the point of writing an audit file instead of just doing the work: the
plan's Verification section predicted "only Deferred/External remain" and reality briefly
disagreed. Fixed by investigating the actual `git status` output rather than trusting the plan's
prediction, then updating this record instead of quietly matching the plan to reality after the
fact.

## Final state

`git status --porcelain` → 92 entries: the ~90 External (skills-manager) entries +
`.claude/settings.local.json` (personal config, newly observed) + `new-matirial/` (Experimental,
newly populated) + `.agent.md` + `.claudelocaldocs/MASTER_PLAN.md` (both Deferred). Nothing else.

## Repository Hygiene gate answer (per `repository-hygiene.md`)

**Is the repository state trustworthy enough to start new work? YES** — every entry remaining
dirty is now classified, has an owner decision on record, and none of it is SalmanSaaS feature
work sitting silently uncommitted. Restaurant itself is not yet formally accepted as the Store
template's baseline (Reference Validation Rule) — that's a separate, still-open step (visual
browser confirmation, `todo_list.md`), not something this audit resolves.
