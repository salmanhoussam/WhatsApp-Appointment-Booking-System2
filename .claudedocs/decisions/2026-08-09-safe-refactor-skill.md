# Decision — Add a `safe-refactor` skill, deliberately narrow

**Date:** 2026-08-09 · **Owner:** Salman

## Decision

Added `.claude/skills/general/safe-refactor/SKILL.md` — a behavior-preserving structural cleanup
skill (dedup, simplify oversized functions, split responsibilities, move business logic out of
Routes into Services, unify repeated patterns, retire confirmed-dead legacy code, improve
naming/structure). Named "safe-refactor," not "refactor," on purpose.

## Context

Triggered by a `/bo-hussein` check against a Claude Code "5 skills" video
(MCP Builder/Playwright/Frontend Design/Code Review/Refactor). Real audit found 4/5 already
covered, several with a stronger project-specific equivalent than the generic version (Playwright:
a real, already-proven MCP tool, most recently used to catch the Jaafar Calendar bug; Code Review:
a project-specific `code-reviewer` agent aware of multi-tenancy/catalog rules, not a generic
checklist). The one real gap: `refactoring-ui` exists but is UI-visual-only (hierarchy/spacing/
color) — no general-purpose code-structure refactor tool existed.

## Why this fits `decisions/`, not a new ADR

Adds a new tool, but changes no existing file's runtime behavior and creates no new backend
enforcement mechanism — this is an assistant-behavior addition, not a system change.

## The guardrail — why "narrow" was the explicit requirement

Salman's own instruction, verbatim in spirit: don't add a general "clean up the code" skill that
decides on its own when something needs restructuring. The skill's own operating definition:
"Refactoring means changing the internal structure without intentionally changing externally
observable behavior." Anything that would change behavior, authorization, data models, or
architecture must stop and escalate to a real Implementation Contract/ADR
(`documentation-policy.md`'s existing workflow) instead of happening under the "refactor" label.
The skill file itself carries this gate, the multi-tenancy `clientId`-preservation rule, and a
verification requirement (real before/after evidence, not "looks equivalent") — not left to be
re-derived per invocation.

## Consequence

A real, already-identified candidate exists for this skill's first use:
`app/api/v1/admin/store.py`/`app/api/v1/public/store.py` call repositories directly with no Service
layer at all (found during the 2026-08-09 Orders capability investigation,
`.claudedocs/work/orders-capability-investigation/2026-08-09/summary.md`) — a real deviation from
this project's own Routes → Services → Repositories → DB rule. Not scheduled or actioned by this
decision; named here as the natural first real case, per this project's own "evidence over
invented examples" discipline.
