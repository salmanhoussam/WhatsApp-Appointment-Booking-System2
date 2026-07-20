# Agent Drift & Observability Vision

**Status:** captured, deliberately not designed. Recorded 2026-07-20 after Salman reviewed the
Repository Hygiene work and asked whether the same Forgotten/Deferred/External/Experimental
taxonomy should also cover AI agent behavior drift, not just repo file drift — and asked for real
research, not a reaction to pasted AI-generated text.

## The two framings Salman surfaced

Two AI-generated analyses proposed applying the Drift taxonomy to agent behavior, from two
angles:

1. **Agent Observability** — monitoring an individual agent's outputs over time for hallucination,
   quality decay, and behavioral drift.
2. **Multi-Agent Orchestration / State Governance** — a supervisor agent preventing state/context
   contamination between multiple agents running concurrently.

Both are real, active 2026 practice areas — confirmed by real research below, not dismissed as
buzzword noise. But both assume infrastructure SalmanSaaS does not have yet.

## What real research found

**Agent Observability** — the real 2026 stack (MLflow, Braintrust, Confident AI, Galileo, Arize
Phoenix) centers on drift detection via embedding clustering over *sampled production traces*,
automated LLM judges scoring semantic drift, and persona-drift detection against a baseline. Every
one of these tools assumes a **live, continuously-running agent serving real traffic at volume** —
there have to be traces to sample and embeddings to cluster. SalmanSaaS's agents (`bo-hussein` and
the rest of `.claude/agent/`) are not that: they are personas adopted inside Claude Code chat
sessions, human-in-the-loop, no autonomous always-on process handling live user requests. There is
nothing this stack could point at today.

**Multi-Agent State Governance** — the research (e.g. the Dynamic Attentional Context Scoping
paper on context pollution) addresses contamination between **concurrently executing** agents
sharing one context window — a flat-context orchestrator's steering accuracy was measured
collapsing from 60% at 3 concurrent agents to 21% at 10. This session already established (during
the `tenant-seeder` Service extraction) that `bo-hussein`'s "routing" to named agents is narrative
persona-adoption *within one conversation*, not concurrent execution — real subagent dispatch
exists in the harness (the `Agent` tool) but isn't wired into `bo-hussein`. Concurrent-agent
context pollution isn't a problem this project has, because it doesn't run agents concurrently.
This is exactly the still-open "do we actually need an Agent Dispatcher?" question already gated
as **Phase 2** in `AI_OPERATIONS_PLATFORM_VISION.md` — this document does not resolve that
question, deliberately; it belongs to that existing gate, not a new one.

**What IS applicable today**: prompt/persona version governance. Independent sources (Maxim,
Kore.ai, AWS Prescriptive Guidance) converge on one practice regardless of scale — "every prompt
needs an owner, peer review before deployment, and a short changelog"; "ad-hoc prompt editing
accumulates technical debt and introduces unpredictable agent behavior." This is not hypothetical
for SalmanSaaS: `.claude/agent/*.md` and `.claude/rules/*.md` have been hand-edited repeatedly
this session (`bo-hussein.md` three times, `tenant-seeder.md` three times) with no record beyond
git commit messages of *why*. `repository-hygiene.md`'s existing taxonomy classifies whether a
file *entered git* — it doesn't address whether a change to an agent's actual instructions was
deliberate and reviewed. That gap is real and small enough to close now without building anything.

## Decision

Do **not** build Observability tooling or a State-Governor/dispatcher now — both require
infrastructure (live traffic, concurrent execution) this project doesn't have, and building
governance ahead of the problem is exactly what the Abstraction Rule and the existing 3-phase gate
in `AI_OPERATIONS_PLATFORM_VISION.md` exist to prevent.

Do add one small, real practice now: a "Persona & Prompt Drift" addition to
`.claude/rules/repository-hygiene.md` requiring an `Intent` line in any commit touching
`.claude/agent/*.md` or `.claude/rules/*.md` — the smallest real version of prompt-change
governance that fits a one-owner, git-reviewed project, with no new infrastructure.

## When to revisit

- **Observability** — once an agent runs continuously against live traffic (a real deployed
  service, not a chat session), point to `AI_OPERATIONS_PLATFORM_VISION.md`'s Phase 3 gate.
- **State Governance / dispatcher** — once `bo-hussein` actually dispatches to concurrent
  subagents (Phase 2 of the same gate), re-open this document and design against real dispatch
  traces, not predicted ones.

## Sources

- [AI Agent Observability: The Complete Enterprise Guide for 2026](https://vitaloralife.com/ai-agent-observability/)
- [AI observability tools: A buyer's guide (2026) — Braintrust](https://www.braintrust.dev/articles/best-ai-observability-tools-2026)
- [Monitoring Agentic AI in Production: 2026 Guide — MLflow](https://mlflow.org/articles/monitoring-agentic-ai-in-production-2026-guide/)
- [Top 6 AI Agent Observability Platforms for 2026 — Confident AI](https://www.confident-ai.com/knowledge-base/compare/best-ai-agent-observability-tools-2026)
- [9 Best LLM Drift Monitoring Platforms in 2026 — Galileo](https://galileo.ai/blog/best-llm-output-drift-monitoring-platforms)
- [Dynamic Attentional Context Scoping (DACS) — arXiv 2604.07911](https://arxiv.org/pdf/2604.07911)
- [The Orchestration of Multi-Agent Systems — arXiv 2601.13671](https://arxiv.org/html/2601.13671v1)
- [A Comprehensive Guide to Preventing AI Agent Drift Over Time — Maxim](https://www.getmaxim.ai/articles/a-comprehensive-guide-to-preventing-ai-agent-drift-over-time/)
- [Prompt Versioning: Best Practices for AI Engineering Teams — Maxim](https://www.getmaxim.ai/articles/prompt-versioning-best-practices-for-ai-engineering-teams/)
- [Prompt Version Control — Why It Matters — Kore.ai](https://www.kore.ai/blog/why-prompt-version-control-matters-in-agent-development)
- [Prompt, agent, and model lifecycle management — AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-serverless/prompt-agent-and-model.html)

## Related

- `.claudedocs/architecture/AI_OPERATIONS_PLATFORM_VISION.md` — the 3-phase gate this document's
  "when to revisit" section inherits, rather than duplicating.
- `.claude/rules/repository-hygiene.md` — where the one applicable finding (Persona & Prompt
  Drift) actually lives.
