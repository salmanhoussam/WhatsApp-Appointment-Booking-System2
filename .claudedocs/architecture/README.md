# `architecture/` — Navigation

Per `.claudedocs/adr/ADR-0003.md`. Six layers, each answering one question, each with its own rate
of change. Start at `INDEX.md` if you're looking for a specific fact; this file is only for "what
kind of thing am I even looking for."

| Folder / File | Answers | Changes |
|---|---|---|
| `TENANT_OS.md` | What is Tenant OS, at a glance, with links to everything else | Rarely |
| `principles/` | What is permanently true, regardless of which Capability you're touching | Rarely — years |
| `../adr/` (top-level `.claudedocs/adr/`) | What irreversible/cross-cutting decision was made, and why. Platform-wide decisions (`ADR-000X`) and Tenant-OS-scoped decisions (`TOS-XXX`) live in this one folder, side by side, distinguished by prefix, not by nesting | Occasionally, append-only |
| `capabilities/` | What is true, right now, about ONE Capability — its ownership, contract, operations, schema, Admin/Public projections, maturity, open findings | Every Sprint |
| `../reviews/` (top-level `.claudedocs/reviews/`) | Independent, point-in-time evidence that something worked or didn't — architecture reviews and tenant verifications alike | At defined gates, immutable once written |
| `../todo_list.md` + `../sessions/*.md` | What's next, in what order | Constantly — supersedes `../roadmap/*.yaml`, archived 2026-08-16 (stale since 2026-07-04) to `../archive/roadmap/` |

**Not part of this system** (unrelated domains, confirmed by the ADR-0003 migration's own
Investigation): `TENANT_LIFECYCLE_PLAN.md`, `SUPER_ADMIN_DASHBOARD_PLAN.md`,
`routing_architecture.md`, `Storage_Architecture_Plan.md`, `database_report.md`,
`AI_OPERATIONS_PLATFORM_VISION.md`, `AGENT_DRIFT_AND_OBSERVABILITY_VISION.md`,
`TEMPLATE_ROADMAP_VISION.md` — these stay exactly where they are, in this folder, as their own
independent Domain Plans.

**One idea, one home.** If you already know a specific principle by name (Single Source of Truth,
Admin/Public Contract, the Abstraction Rule), check `INDEX.md`'s Platform Principles section first
— those live in `.claude/rules/`, not here, and are never duplicated into `principles/`.
