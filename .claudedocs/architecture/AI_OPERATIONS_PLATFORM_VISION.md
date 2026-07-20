# AI Operations Platform — Vision (Not Designed, Not ADR'd)

**Status: captured, deliberately not designed.** This is not an Architecture Plan in the sense `TENANT_LIFECYCLE_PLAN.md` or `SUPER_ADMIN_DASHBOARD_PLAN.md` are — those describe systems actively being built. This file exists so a real idea isn't lost, and so a future session doesn't have to reconstruct why it was deferred.

## What the idea is

A standalone "Multi-Agent Server" — a real distributed system, not a documentation exercise:

```
Multi-Agent Server
├── Orchestrator
├── Planner
├── Dispatcher
├── Queue
├── State Store
├── Event Bus
├── Logger
├── Evidence Store
├── Skill Registry
├── Worker Pool
│
├── Architecture Worker
├── Backend Worker
├── Frontend Worker
├── Documentation Worker
├── Research Worker
├── Review Worker
├── Verification Worker
└── Media Worker
```

Workers wouldn't know about each other — only the Orchestrator would. Handoffs would be event-driven (a worker publishes e.g. `ArchitectureCompleted`; the Dispatcher alone reacts and routes the next worker), not direct calls between workers. Task execution would carry a formal Task Contract (ID, Owner, Input, Expected Output, Files allowed, Dependencies, Acceptance Criteria, Verification, Evidence Required, Next Worker) instead of a plain instruction. Review would split by discipline (Technical/Architecture/Documentation/Security/UX Review), each its own skill. Once mature, this is proposed as a separate product (team dashboard, live task execution, worker health, evidence tracking, cost/token monitoring, execution history) — not a SalmanSaaS feature.

## Why it's not being designed now

This requires infrastructure that doesn't exist in this environment: a persistent server process, a real message queue or event bus, and workers that outlive any single Claude Code conversation. Every "Service" in this project today only exists for the duration of one execution inside one session — there is no long-running process to attach a Queue or Event Bus to. This is a different category of thing than a Service Contract (a markdown file + disciplined execution), and building it now would mean designing a system with zero real usage data to design from.

## The gate — exactly as set by the user, 2026-07-20

- **Phase 1** (`.claude/plans/` — tenant-seeder extraction, this session): one independent Service, fully documented (Constitution + Contract + Context Investigation + Evidence), proven with one real run. No dispatcher, no orchestrator changes.
- **Phase 2** (future, gated): only after Phase 1 proves out, explicitly ask "do we actually need an Agent Dispatcher?" — build one only if the answer is genuinely yes. Not assumed.
- **Phase 3** (future, gated further): only once 3-4 independent Services exist (`tenant-seeder` + candidates like `asset-uploader`, `higgsfield-generator`, `catalog-importer`), the case for Queue/Dispatcher/Worker Pool/Event Bus/Execution Graph becomes real evidence rather than speculation — that's when an ADR for this Platform becomes justified, not before.

This mirrors ADR-0002's own established rule: build the first complete real use case, generalize only once generalization is earned, never design the abstraction first and retrofit a use case onto it.

## Pointer

Phase 1's record: `tenant-seeder`'s Service Contract (`.claude/agent/tenant-seeder.md`) and the Service Execution Constitution (`.claude/rules/service-execution-constitution.md`) it follows. When Phase 3's gate is actually met, this file is the starting point for the real ADR — not a spec to implement as-is, a record of what was proposed and why it waited.
