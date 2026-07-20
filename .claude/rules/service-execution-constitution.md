# Service Execution Constitution — Always Active

Governs how every independent Service (`tenant-seeder`, and whatever follows it — candidates like `asset-uploader`, `catalog-importer`, `higgsfield-generator`, `frontend-builder`, `qa-reviewer`) behaves before, during, and after it runs. Established 2026-07-20 while extracting `tenant-seeder` as the project's first documented Service — these principles came out of that one real case, not speculation, and every Service Contract from here on inherits them by reference instead of restating them.

## Why this exists

Without a shared constitution, every new Service Contract would re-derive and re-write the same "investigate before executing, prefer real files over memory, leave evidence" logic from scratch, drifting a little each time, and cost a full discussion cycle per service. This file exists so that discussion happens once.

## The Principles

1. **Never execute before investigating.** Every Service begins with a Context Investigation step. No exceptions.
2. **Real project state is the source of truth.** If a real examples folder exists, read it. If a registry/config file exists, read it. If a relevant ADR exists, read it. Never rely on memorized or assumed knowledge when the real thing is one read away.
3. **Prefer evidence over assumptions.** If a Service needs a schema/shape it doesn't have memorized, it finds a real example and follows that — it does not invent one.
4. **Every execution leaves evidence.** Every run writes `execution-context.md` (what the investigation found) and `evidence.md` (what actually happened) — concrete values, never "done" alone.
5. **Every output must be reproducible from logs alone.** A different agent, reading only the evidence files, should be able to understand what happened and redo it without needing to ask the original executor.
6. **Upstream first.** If a required input doesn't exist yet, the Service does not invent it — it stops and requests it from whichever upstream Service produces it.
7. **Services behave consistently.** Given the same real inputs, a Service should produce the same real-world effects (same DB state, same files) — not necessarily byte-identical prose in its evidence text, since execution is LLM-driven, but the same outcome.
8. **Context before Code.** No implementation work starts before Context Investigation is complete.
9. **Read before Write.** Rules, Skills, relevant ADRs, and real examples get read before anything gets written — in that order.

## How a Service Contract uses this

A Service's own contract (`.claudedocs/templates/SERVICE_CONTRACT_TEMPLATE.md`) does not restate these principles. It opens with `Follows: Service Execution Constitution (.claude/rules/service-execution-constitution.md)` and then documents only what's specific to that one Service — its own Mission, its own real files/examples to investigate, its own Inputs/Outputs/Dependencies, its own evidence paths.

## Service Lifecycle

No Service may execute before its Contract exists. Before a Service becomes active it must have: Mission, Contract, Inputs, Outputs, Context Investigation, Evidence format, Owner, Dependencies — all present in its `.claude/agent/{service}.md` file, following `SERVICE_CONTRACT_TEMPLATE.md`. This is the same requirement `tenant-seeder` satisfies as the first real instance — stated once, generically, so it doesn't need re-justifying per future Service.

## Note — separate from ADR-scoped evidence

`.claudedocs/work/{service}/{run-id}/` (this file's evidence convention, routine Service execution) and `.claudedocs/verification/*.md` (ADR-scoped, `documentation-policy.md` rule 6, permanent) are deliberately separate — different lifecycle, different trigger (every Service run vs. only ADR Implementation Contract phases). If a routine Service run ever gets folded into a future ADR, that ADR's verification doc should *link to* the `work/.../evidence.md` rather than duplicate it.
