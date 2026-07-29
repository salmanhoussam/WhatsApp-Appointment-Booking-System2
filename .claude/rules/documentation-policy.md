# Documentation Policy — Always Active

Governs how architectural/engineering decisions are documented for SalmanSaaS. Established 2026-07-18, first applied retroactively to ADR-0001 (Tenant Status Enforcement). Applies to every future ADR (Payment Gateway, Event Bus, etc.) and every large Domain design (Tenant Lifecycle, Super Admin Dashboard, etc.).

## Why this exists

Without a fixed place for each kind of document, "why was this built this way" gets buried inside dated session logs and is effectively lost within a year. This policy trades a small amount of upfront structure for permanent traceability: any future engineer (or agent) can find the decision, the design, the contract, the proof it works, and the reason it was declared done — each in its own place, not spread across whichever file happened to be open that day.

## The mandatory workflow

```
Session Reports  →  Evolution Documents  →  ADR  →  Architecture Plan  →  Implementation Contract
  →  Implementation  →  Verification  →  Architecture Review  →  Post-Implementation Review  →  Archive
```

Added 2026-07-29: **Architecture Review** here is a distinct, recurring stage — not the
Post-Implementation Review immediately after it in the chain (that one is a one-shot, ADR-scoped
gate; this one is a periodic maturity check on a Capability/Interface/System, repeated over its
life). Governed in full by `rules/architecture-review-loop.md`, cross-referenced below — this file
only places it in the sequence.

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

## Folder structure — per ADR-0003 (Architecture Documentation System)

Superseded 2026-07-27 (this migration's Phase 8) — the six-layer model below is ADR-0003 §4's real
decision, not a restatement invented here; see `.claudedocs/adr/ADR-0003.md` for the full rationale
and `.claudedocs/architecture/TENANT_OS.md` for a worked example of every layer populated for one
real Domain (Tenant OS).

```
.claudedocs/
├── adr/                 ADR-000X.md (platform-wide) and TOS-XXX-*.md (Tenant-OS-scoped, same
│                        folder, distinguished by prefix, not nesting) — the decision itself,
│                        nothing else
├── evolution/           <topic>.md — accumulating insight, pre-ADR (see above)
├── maturity/            <topic>.md — recurring Architecture (Maturity) Review ledger, one per
│                        Capability/Interface/System, appended to over time — see
│                        `rules/architecture-review-loop.md`. Sibling to `evolution/`, not nested
│                        under it: different question (post-implementation "did it hold up?" vs.
│                        pre-ADR "what are we learning?"), same living-document mechanic.
├── architecture/        Six layers, each answering one question, each its own rate of change:
│   ├── README.md         entry point — what kind of thing am I even looking for
│   ├── INDEX.md           the one navigation rollup — Decisions/Principles/Capabilities tables
│   ├── <DOMAIN>.md        e.g. TENANT_OS.md — what a Domain is, at a glance, linking to the rest
│   ├── principles/        P-XXX-*.md — what is permanently true, regardless of Capability
│   │                      (rarely — years). Platform-wide principles stay in `.claude/rules/`
│   │                      instead — never duplicated here; `INDEX.md` links to both explicitly.
│   ├── capabilities/       <name>.md — Ownership/Contract/Operations/Schema/Admin projection/
│   │                      Public projection/Single Source of Truth/Governance/Acceptance/
│   │                      Maturity/Open Findings for ONE Capability, self-sufficient — no central
│   │                      cross-cutting matrix file
│   └── (other standalone Domain Plans — SUPER_ADMIN_DASHBOARD_PLAN.md, TENANT_LIFECYCLE_PLAN.md,
│        etc. — unrelated to a given Domain's own six layers, confirmed no overlap per-Domain)
├── implementation/      ADR-000X_IMPLEMENTATION_CONTRACT.md (ADR-0001/0002) or, from ADR-0003
│                        onward, `implementation/ADR-000X/CONTRACT.md` + `PHASE_N.md` per phase —
│                        the nested form distinguishes a decision's *implementation* from the
│                        decision itself once many ADRs exist, per the Contract's own revision note
├── verification/        ADR-000X_PHASE_N.md (ADR-0001/0002's flat form, left exactly as-is —
│                        this split applies going forward, not retroactively) + ADR-000X_FINAL.md
├── reviews/              flat, one file per architecture review or tenant verification — no
│                        `architecture/`-nested duplicate (the mistake ADR-0003's own Investigation
│                        caught and corrected)
├── decisions/           short-lived / minor decisions that don't warrant a full ADR
├── archive/              superseded documents, `git mv`'d not deleted, with a superseded-by header
└── sessions/            daily session logs — unaffected by this policy, kept as-is
```

**Standing cross-reference** — this file, `investigation-protocol.md`,
`service-execution-constitution.md`, `repository-hygiene.md`, and `architecture-review-loop.md`
together define this project's whole evidence/documentation discipline: this file for *where* a
document lives and in what sequence it's produced; `service-execution-constitution.md` for how a
Service investigates and leaves evidence before executing; `investigation-protocol.md` for how a
real bug/root-cause investigation is reported (Confirmed/Side Findings/Unknowns);
`repository-hygiene.md` for drift categories and reference validation;
`architecture-review-loop.md` for how a Capability/Interface/System gets periodically
re-assessed after it's already implemented and verified once. Each governs a different moment in
the same lifecycle rather than restating the others.

## Naming

- ADRs: `ADR-000X.md` — sequential number, no slug in the filename (the slug/title lives inside the document). Tenant-OS-scoped decisions use `TOS-XXX-<slug>.md` instead, in the same `adr/` folder.
- Everything else that's ADR-scoped is prefixed with the same `ADR-000X_` (or, from ADR-0003 onward, nested under `implementation/ADR-000X/`) to make the relationship obvious from the filename alone.
- A Domain's own six-layer `architecture/` content (its `<DOMAIN>.md`, `principles/*.md`, `capabilities/*.md`) uses descriptive kebab-case/PascalCase per ADR-0003 §4 — a legacy standalone Architecture Plan not yet migrated to this model may still use `SCREAMING_SNAKE_CASE.md` (e.g. `TENANT_LIFECYCLE_PLAN.md`) until it is.

## Rules

1. `sessions/*.md` stays the raw daily log — never rewritten to "clean it up." The organized `verification/`/`reviews/` docs are an *extraction*, not a replacement.
2. `reviews/ADR-000X_POST_IMPLEMENTATION_REVIEW.md` is never deleted, even after archiving — it is the record of why the ADR was trusted enough to close.
3. `decisions/` is for things genuinely too small for a full ADR (a naming call, a minor config default) — if it changes multiple files' behavior or creates a new enforcement mechanism, it's an ADR, not a `decisions/` note.
4. A big change (new ADR archived, new Domain plan approved) gets one line in that day's session log when it closes — no separate CHANGELOG.md exists yet; revisit this only if the project explicitly asks for one.
5. `bo-hussein` (`.claude/agent/bo-hussein.md`) reads this file before routing any strategic/architectural request, so the workflow above is applied automatically rather than re-explained per request.
6. When a single Implementation Contract is executed by more than one role/skill/agent (routine — `bo-hussein` routes work across multiple agents/skills per its routing tables), each phase's `verification/*.md` document must name which role/skill/agent executed that phase and the evidence it produced, attributed per phase rather than folded into one undifferentiated account. A phase executed by a single role needs no extra attribution beyond what rule 3's evidence standard already requires; this only applies once execution is split across more than one contributor.
7. An `evolution/<topic>.md` entry is never deleted or rewritten to "clean it up" — same immutability as `reviews/`. A later entry may revise or supersede an earlier one's Current Understanding, but the earlier entry stays, so the accumulation itself stays honest history, not a single edited snapshot.
8. A `maturity/<topic>.md` entry follows the same immutability rule as rule 7 — never deleted or rewritten, only appended to. Full governance in `rules/architecture-review-loop.md`.
