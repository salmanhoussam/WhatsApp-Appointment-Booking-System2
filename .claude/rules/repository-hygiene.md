# Repository Hygiene — Always Active

Established 2026-07-20, from the project's first real repository drift audit (126 dirty `git
status` entries found while deciding whether to start the Store template). This file exists so
that audit's findings don't stay a one-time favor — future large work inherits the same
discipline instead of re-deriving it.

## Repository Drift Categories

```
Forgotten    — completed work that accidentally never entered Git.
Deferred     — known work intentionally postponed, with an owner decision on record.
Experimental — research or temporary artifacts awaiting a decision.
External     — managed by another tool or package manager, not this project's own history.
```

A 5th category may emerge from a real audit (first observed: "Superseded" — a doc whose content
was fully captured elsewhere, `.claudedocs/plans/Architecture_Design_Request.md` vs
`.claudedocs/architecture/AI_OPERATIONS_PLATFORM_VISION.md`, 2026-07-20). Per this project's
Abstraction Rule (`rules/team-roles.md`), don't add it to the standing list above until a second
independent real case confirms it's a stable category, not a one-off.

## Reference Validation Rule

No template or implementation becomes a "reference"/baseline for others to build on simply
because it was built first. Before another Service or template adopts it as a starting point, its
Contract, architecture, and repository state must be explicitly audited and accepted — first-mover
is not the same as best/correct. First applied to the Restaurant template, see
`.claudedocs/architecture/TEMPLATE_ROADMAP_VISION.md`.

## Audit Evidence

A repository drift audit writes `.claudedocs/work/repo-audit/{date}/audit.md` — the same evidence
discipline the Service Execution Constitution (`service-execution-constitution.md`) requires of
every Service run, applied to the repo itself: real `git status` counts, real per-file
classification, real decisions made — not "cleaned up" alone.

## Bo Hussein's Repository Hygiene Responsibility

Before starting significant new work (a new template, a new Service), Bo Hussein answers: "Is the
repository state trustworthy enough to start new work? YES/NO — Evidence: ..." This is a standing
responsibility, not a one-time favor — see `.claude/agent/bo-hussein.md`'s Team Leadership section.

## Bo Hussein's Architecture Review Responsibility

Established 2026-07-29, parallel to the responsibility above: before starting significant new work
on a Capability/Interface/System, or after roughly two weeks of real activity on one, Bo Hussein
checks whether that topic is due for a Maturity Review and says so explicitly — "Is `<topic>` due
for a Review? YES/NO — last Review: ... / no Review yet." Full governance of what that Review
contains and how it's run lives in `rules/architecture-review-loop.md`; this is only the trigger
check, same shape as the repository-trustworthiness check above.

## Persona & Prompt Drift

`.claude/agent/*.md` and `.claude/rules/*.md` files are prompts, not ordinary project files —
editing one changes agent behavior directly. Real research on prompt governance (see
`.claudedocs/architecture/AGENT_DRIFT_AND_OBSERVABILITY_VISION.md`) converges on one practice
regardless of team size: a change to one of these files needs a stated reason on the record at
the moment of the edit — not just "what changed" but "why." In practice: any commit touching
`.claude/agent/*.md` or `.claude/rules/*.md` states its Intent in the commit body — already this
project's habit, made explicit here for these two paths specifically. No separate changelog file,
no approval workflow, no version-pinning — those belong to Observability/canary-rollout tooling
this project doesn't run yet; at this project's current scale (one owner, git as the review
trail) the commit message already is that record.
