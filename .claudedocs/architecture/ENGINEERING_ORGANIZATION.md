# ENGINEERING_ORGANIZATION.md — SalmanSaaS Engineering Organization

**Status: Stable (v1.0).** Do not extend this organization unless recurring evidence from real
product work demonstrates a missing responsibility or broken handoff. Declared 2026-08-02, after the
Capability Decisions Pipeline + Decision Gate + Three Layers were added — Salman's own call: this
structure is closed until reality proves otherwise, the same evidence bar every other abstraction in
this project already has to clear.

**Status (original, still true):** Descriptive, not prescriptive. This document names roles that are
already real — evidenced by two weeks of actual session work — it does not invent new ones. A
standalone Domain Plan, per `.claude/rules/documentation-policy.md`'s "other standalone Domain Plans"
convention, sibling to `TENANT_LIFECYCLE_PLAN.md`, not nested under any single Capability.

## Versioning — the organization is versioned like the product

Added 2026-08-02. This document, the Capability Pipeline, and Browser Verification each carry their
own version (`Engineering Organization v1.0`, `Capability Pipeline v1.0`, `Browser Verification
v1.0`). A version bump is never "we had a nicer idea" — it requires the same kind of evidence this
project already demands before extracting a code abstraction:

- a real gap surfaced during the Pilot that needed a role nothing here covers, or
- Frontend and Backend collided on the same handoff three separate times, or
- a specific Decision Gate proved insufficient in practice.

Only then does a new version get written (`v1.1`, ...) — never a full reorganization every session.
Same governing philosophy as **Evidence before Abstraction**, applied to the organization itself, not
just the code.

## Three Foundations

Named 2026-08-02: the project now rests on three relatively stable foundations, distinct from the
Capabilities/features that change constantly on top of them —

1. **Platform** — what gets built (Generic Store, Reservation schema, Restaurant, Dashboard, ...).
2. **Engineering Organization** (this document) — how decisions get made and executed.
3. **Verification + Evidence** (Browser Verification Capability, this project's whole Evidence
   Interrogation discipline) — how success is actually known, not assumed.

Capabilities and features are expected to keep changing. These three are not — until real evidence
says otherwise, per the Versioning rule above.

**Why this exists:** established 2026-08-01, at Salman's explicit direction, after the same session
that installed and proved a Browser Verification capability. His own framing: this project stopped
being just "a Backend Agent and a Frontend Agent" some time in the last two weeks, and the org chart
should say so — but only for roles real work has already proven, not roles that would look nice on
a chart. This document is that chart, checked against what's actually real today, one role at a
time.

**Governing principle — the same Abstraction Rule this project applies to code, applied to people
and roles**: a role gets a name here because real, dated work already needed it — never because the
chart looks incomplete without it (`.claude/rules/team-roles.md`'s Abstraction Rule; `bo-hussein.md`'s
own "Team Evolution" section states the identical rule for adding a new Service/Agent). Every entry
below states its real evidence, not an aspiration.

---

## The chart

```
                        bo-hussein
                            │
        ┌──────────┬────────┼────────┬──────────────┬─────────┐
        │          │        │        │              │         │
  Architecture  Frontend  Backend  Browser        Documentation  Memory
                                   Verification                        │
                                  (Capability,                    Product
                                   not yet Agent)              (Locked until Pilot)
```

---

## Roles — responsibility and current real status

### bo-hussein — Executive / Project Manager

Already fully specified: `.claude/agent/bo-hussein.md`. Does not write code. Owns: priority
ordering, Phase breakdown, Definition of Done, architecture decisions, stopping scope creep,
reviewing evidence before approving. Every other role below is accountable to bo-hussein per that
file's own "Accountability Principle" section.

### Frontend

Already real, existing agent files: `Frontend-Architect-Agent.md`, `frontend-architect.md`,
`generic-page-builder.md`, `dashboard-builder.md`. Owns React 19, UI, routing, animations,
component architecture.

### Backend

Already real: `backend-architect.md`. Owns FastAPI, Prisma, DB schema, API endpoints,
multi-tenancy, business logic.

### Browser Verification — a **Capability**, deliberately not named an Agent yet

**Real evidence, dated 2026-08-01**: a standalone Claude CLI + official Playwright MCP browser,
installed and verified twice the same day — first a 7-step capability suite (launch, navigate, DOM,
console, network, screenshot; interaction correctly logged as untestable rather than assumed), then
a real investigation that found and fixed 3 independent root causes of a white-page bug in one
pass, something the project's prior screenshot-relay method had not managed to do in the same amount
of time.

**Why not "Agent" yet**: Salman's explicit correction — "Agent" already carries real meaning in this
project's own vocabulary (lifecycle, Contract, independence, per `bo-hussein.md`'s Team Evolution
section). Today's evidence proves a real, repeatable *method* — it does not yet prove the
independent, multi-mission track record that would earn the fuller name. Full write-up:
`.claude/skills/frontend/browser-verification-capability.md` — including the explicit, checkable
**promotion criterion**: it graduates to a named Agent once it has been the executing method across
multiple independent real missions spanning different parts of the app (Store, Booking, Restaurant,
static pages, ...), not on a felt sense that "it's proven now."

### Documentation

**Already operating in practice, not yet a named Contract.** Real evidence spans the whole project:
`evolution/`, `sessions/`, `investigation/` work, `CLAUDE.md` rules maintenance — every session this
project has run leans on this discipline. Deliberately **not** formalized into its own Agent file in
this pass — per the same Abstraction Rule, acknowledging a role is real is not the same decision as
writing its Contract; that formalization is real future work, not done here without its own
evidence-gathering pass first.

### Memory

**Already real**: `.claude/agent/memory-keeper.md`. Owns preventing re-litigation of settled
decisions, keeping cross-session continuity. No new file needed — this role already has a name;
this document just maps it onto the chart Salman gave rather than inventing a second thing beside
it.

### Architecture

The responsibility already exercised by `code-reviewer.md` and this project's own Abstraction Rule
discipline (`.claude/rules/team-roles.md`) — protecting the current architecture, rejecting
unnecessary abstraction, deciding when (and when not) to extract shared code. Not a new file today;
named on the chart because the responsibility is real and already exercised, same as Documentation
and Memory above.

### Product — **Locked until Pilot**

Named on the chart, explicitly not active. Salman's own stated timing, unchanged from earlier this
project: real Product work — reading feedback, triaging Critical/Important/Ideas, proposing the
smallest high-value change — starts once real feedback exists, i.e. after the Store Pilot's first
real customer interaction. Building this role before that feedback exists would be exactly the
premature-abstraction mistake this whole document is trying to avoid at the org level.

---

## Capability Decisions Pipeline (added 2026-08-02)

Established the day Capability Reference Extraction finished
(`.claudedocs/work/capability-reference-extraction/2026-08-02/`) — Salman's own concern: once real
Capability-decision work starts, each role needs to know its role *in that specific pipeline*, not
just its general project responsibility, or the team drifts into "let's open reservation.md and
start migrating" instead of a real decide → design → build → verify → document sequence. Every role
named below already exists on the chart above — this section sequences them for one specific kind of
work, it does not add anyone new.

```
Capability Extraction (transitional — done, see below)
        │
        ▼
   bo-hussein  (decision)
        │
        ▼
  Architecture  (design)
        │
        ▼
 Backend ───── Frontend   (parallel build)
        │          │
        └────┬─────┘
             ▼
  Browser Verification
             │
             ▼
      Documentation
             │
             ▼
         Memory
```

- **Capability Extraction** — not a standing role, a **transitional Mission** that already finished
  its job (the four `capability-reference-extraction/` files). Per this document's own Abstraction
  Rule, it does not get a permanent slot on the chart above; it only reactivates if a genuinely new
  Legacy/reference product shows up later.
- **bo-hussein** — takes the four extraction files and decides what enters the platform, what stays
  tenant-specific, and the priority order. No code, no UI, no file migration. Output:
  a **Platform Capability Roadmap** (Current / Target / Migration Strategy per Capability) — see
  [[project_capability_layer_three_phases]] in memory for why this hasn't been written yet.
- **Architecture** — turns one Capability's decision into a real design: Services, Models, APIs,
  Boundaries, Dependencies. Answers "how do we build this without breaking the platform," not "how do
  we write the code." Same responsibility already named above (`code-reviewer.md`/Abstraction Rule
  discipline), applied here with a sharper, pipeline-specific output shape.
- **Backend / Frontend** — take the Target Architecture, not a tenant, as the unit of work. Backend
  ships APIs/Services/Prisma/Events/Validation/WhatsApp flow; Frontend ships
  Calendar/Wizard/Availability-Picker/Customer-flow/Admin-flow — both built Capability-generic, then
  made tenant-customizable, never built tenant-first.
- **Browser Verification** — same Capability already on the chart, same `✅ Ready / 🟡 Needs
  Improvement / 🔴 Needs Redesign` vocabulary already standardized in
  [[feedback_ux_review_decision_vocabulary]] — every new Capability build passes through it before
  being called done. Judges whether it actually works, not whether the code reads well.
- **Documentation** — in this pipeline specifically, its job is narrower than "keep everything
  current": record the *decision and its rejected alternative*, not explain the code. E.g. "Reservation
  v2 ended up shaped like X, and here's why the Store-cart approach was rejected" — so the same
  argument doesn't reopen three months later.
- **Memory** — saves only what must never be re-litigated: why Reservation didn't reuse Store's cart,
  why Restaurant was promoted to the generic layer, why smar was not ported as-is. Same scope
  `memory-keeper.md` already has, applied to this pipeline's decisions specifically.

### Decision Gate — the rule that makes the pipeline actually hold

Added same day, Salman's own framing: this is the single most important rule in the whole cycle. A
stage does not start on "I understood the idea" or "I'm motivated to start" — it starts only when it
has received one specific, named Artifact from the stage before it:

| Stage | Starts only when it has received |
|---|---|
| bo-hussein | Capability Extraction |
| Architecture | Platform Capability Roadmap |
| Backend | Architecture Plan |
| Frontend | Architecture Plan |
| Browser Verification | a Running Feature |
| Documentation | a Verified Result |
| Memory | an Accepted Decision |

Concretely: Backend cannot start on "got it, I understand the idea" — it starts on "Platform
Capability Roadmap v1 arrived." Frontend cannot start because it's eager to build the Calendar — it
starts because it received the Architecture Plan. This is what keeps the pipeline above from
degrading into everyone working from their own private understanding of what was decided.

## Three Layers — Knowledge, Decision, Execution

Named explicitly the same day, because keeping these separate is what the Decision Gate above is
actually protecting:

```
1. Knowledge   — Legacy Extraction, Investigations, Evidence
2. Decision    — bo-hussein, Capability Decisions, the Roadmap
3. Execution   — Architecture, Backend, Frontend, Browser Verification, Documentation, Memory
```

Salman's own framing: the biggest failure mode in large projects is letting these layers blur into
each other — someone starts building (Execution) off a half-formed idea (Knowledge) without a real
Decision in between, or a Decision gets made without real Knowledge backing it. Every Decision Gate
row above exists to keep exactly one layer from leaking into the next without a named Artifact
crossing the boundary.

**A likely future 4th layer, explicitly not added now**: *Operations* (Deployment, Monitoring,
Analytics, Pilot Feedback, Customer Success) — Salman expects this to become real "in a few months,"
once the platform is running at scale rather than still being built. Named here only so a future
session recognizes it when the real evidence shows up, per this document's own Abstraction Rule —
not stubbed, not scaffolded, not given a section of its own until real, dated work actually needs it.

---

## Explicit non-goal

This pass does not write full Service Contracts (Mission / Context Investigation / Inputs / Outputs
/ Dependencies / Evidence format, per `.claudedocs/templates/SERVICE_CONTRACT_TEMPLATE.md`) for
every role on the chart. Only Browser Verification gets a real write-up alongside this document,
because it is the only role with today's date next to real, dated evidence. Documentation and
Architecture are named because they are real and already exercised — formalizing either into its own
full Agent Contract is real future work, done only once its own recurring need is separately
evidenced, not bundled into this pass just because the chart was already being written.
