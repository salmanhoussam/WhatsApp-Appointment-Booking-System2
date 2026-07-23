# Documentation Policy — Always Active

Governs how architectural/engineering decisions are documented for SalmanSaaS. Established 2026-07-18, first applied retroactively to ADR-0001 (Tenant Status Enforcement). Applies to every future ADR (Payment Gateway, Event Bus, etc.) and every large Domain design (Tenant Lifecycle, Super Admin Dashboard, etc.).

## Why this exists

Without a fixed place for each kind of document, "why was this built this way" gets buried inside dated session logs and is effectively lost within a year. This policy trades a small amount of upfront structure for permanent traceability: any future engineer (or agent) can find the decision, the design, the contract, the proof it works, and the reason it was declared done — each in its own place, not spread across whichever file happened to be open that day.

## The mandatory workflow

```
Session Reports  →  Evolution Documents  →  ADR  →  Architecture Plan  →  Implementation Contract
  →  Implementation  →  Verification  →  Post-Implementation Review  →  Archive
```

Added 2026-07-23 (Salman's own correction, applied verbatim): each of the first three stages
answers a genuinely different question, and collapsing them is exactly what causes ADRs to turn
into design journals and forces anyone reconstructing a decision to dig through dozens of session
reports:

```
Session Reports        →  "What happened today?"
Evolution Documents     →  "What have we learned over multiple sessions?"
ADR                     →  "What decision have we now ratified?"
Implementation Contract →  "How do we execute that decision?"
```

- No architectural decision is implemented without an ADR first.
- No large Domain gets coded without its own Architecture Plan (design-only, no code) reviewed and approved first.
- No code is written without an Implementation Contract — a one-page gate listing exactly which files change, what tests are required, success criteria, and a rollback plan.
- Implementation proceeds one step at a time; each step needs its own evidence before the next one starts (real HTTP codes, real DB row counts, real before/after state — not "tests passed").
- Before an ADR is archived, a read-only Post-Implementation Review checks the finished work against the original ADR. If it finds a gap between "decided" and "implemented," that gap is fixed and re-verified before archiving — never silently patched or left undocumented.

This is exactly the process ADR-0001 was executed under; this file makes it the standing default instead of something re-explained each time.

## Architecture Evolution Log

A new stage, sitting between raw session logs and a ratified ADR — for insight that is real but
hasn't stabilized yet. Established 2026-07-23, first real entries seeded during RK Barber Shop's
Hero-wiring work (`.claudedocs/evolution/media-capability.md`) and a same-session tangent about
prompts becoming architecture (`.claudedocs/evolution/prompt-system.md`).

- **Location**: `.claudedocs/evolution/<topic>.md` — top-level, sibling to `adr/`, `reviews/`,
  `sessions/`, NOT nested under `architecture/` (nesting it there would repeat the same
  duplicated-folder mistake ADR-0003's own Investigation caught and corrected for `reviews/`/
  `roadmap/`). One file per recurring topic — `editing-engine.md`, `media-capability.md`,
  `prompt-system.md`, `capability-contracts.md`, `tenant-lifecycle.md` — not one file per session,
  not one giant file. The file name is the topic itself; the folder name already says "evolution."
- **When to append**: any session producing a real architectural insight — not routine work —
  appends a new dated entry to the relevant topic file. Sessions stay the raw historical record
  (rule 1, unaffected); the evolution file is where *understanding accumulates* across sessions on
  one topic.
- **Entry template**:
  ```markdown
  ## YYYY-MM-DD

  ### Context
  [what were we doing when this came up]

  ### Discovery
  [the real, concrete thing found]

  ### Current Understanding
  [the working model so far — may be revised by a later entry, never deleted]

  ### Open Questions
  [what's still unresolved]

  ### Promoted?
  No — or, once stabilized: Yes → ADR-000X
  ```
- **Promotion rule**: an evolution file gets promoted into a real ADR only once its understanding
  has stabilized through multiple independent real implementations (this project's existing
  Abstraction Rule, `rules/team-roles.md`, applied here to documentation itself) — never on a
  single session's insight alone.

## Fixed folder structure

```
.claudedocs/
├── adr/            ADR-000X.md               — the architectural decision itself, nothing else
├── evolution/       <topic>.md                — accumulating insight, pre-ADR (see above)
├── architecture/    DOMAIN_NAME_PLAN.md        — design docs for large domains (no code, pre-ADR-implementation or standalone)
├── implementation/  ADR-000X_IMPLEMENTATION_CONTRACT.md
├── verification/    ADR-000X_PHASE_N.md (one per implementation step) + ADR-000X_FINAL.md
├── reviews/         ADR-000X_POST_IMPLEMENTATION_REVIEW.md — never deleted, explains why the ADR was considered complete
├── decisions/       short-lived / minor decisions that don't warrant a full ADR
└── sessions/        daily session logs — unaffected by this policy, kept as-is
```

## Naming

- ADRs: `ADR-000X.md` — sequential number, no slug in the filename (the slug/title lives inside the document).
- Everything else that's ADR-scoped is prefixed with the same `ADR-000X_` to make the relationship obvious from the filename alone.
- Architecture Plans use a descriptive `SCREAMING_SNAKE_CASE.md` name (e.g. `TENANT_LIFECYCLE_PLAN.md`), since they may exist before an ADR number is assigned or may span multiple future ADRs.

## Rules

1. `sessions/*.md` stays the raw daily log — never rewritten to "clean it up." The organized `verification/`/`reviews/` docs are an *extraction*, not a replacement.
2. `reviews/ADR-000X_POST_IMPLEMENTATION_REVIEW.md` is never deleted, even after archiving — it is the record of why the ADR was trusted enough to close.
3. `decisions/` is for things genuinely too small for a full ADR (a naming call, a minor config default) — if it changes multiple files' behavior or creates a new enforcement mechanism, it's an ADR, not a `decisions/` note.
4. A big change (new ADR archived, new Domain plan approved) gets one line in that day's session log when it closes — no separate CHANGELOG.md exists yet; revisit this only if the project explicitly asks for one.
5. `bo-hussein` (`.claude/agent/bo-hussein.md`) reads this file before routing any strategic/architectural request, so the workflow above is applied automatically rather than re-explained per request.
6. When a single Implementation Contract is executed by more than one role/skill/agent (routine — `bo-hussein` routes work across multiple agents/skills per its routing tables), each phase's `verification/*.md` document must name which role/skill/agent executed that phase and the evidence it produced, attributed per phase rather than folded into one undifferentiated account. A phase executed by a single role needs no extra attribution beyond what rule 3's evidence standard already requires; this only applies once execution is split across more than one contributor.
7. An `evolution/<topic>.md` entry is never deleted or rewritten to "clean it up" — same immutability as `reviews/`. A later entry may revise or supersede an earlier one's Current Understanding, but the earlier entry stays, so the accumulation itself stays honest history, not a single edited snapshot.
