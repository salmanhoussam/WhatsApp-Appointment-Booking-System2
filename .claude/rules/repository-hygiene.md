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
