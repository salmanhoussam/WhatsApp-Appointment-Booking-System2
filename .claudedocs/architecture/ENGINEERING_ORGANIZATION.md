# ENGINEERING_ORGANIZATION.md — SalmanSaaS Engineering Organization

**Status:** Descriptive, not prescriptive. This document names roles that are already real —
evidenced by two weeks of actual session work — it does not invent new ones. A standalone Domain
Plan, per `.claude/rules/documentation-policy.md`'s "other standalone Domain Plans" convention,
sibling to `TENANT_LIFECYCLE_PLAN.md`, not nested under any single Capability.

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

## Explicit non-goal

This pass does not write full Service Contracts (Mission / Context Investigation / Inputs / Outputs
/ Dependencies / Evidence format, per `.claudedocs/templates/SERVICE_CONTRACT_TEMPLATE.md`) for
every role on the chart. Only Browser Verification gets a real write-up alongside this document,
because it is the only role with today's date next to real, dated evidence. Documentation and
Architecture are named because they are real and already exercised — formalizing either into its own
full Agent Contract is real future work, done only once its own recurring need is separately
evidenced, not bundled into this pass just because the chart was already being written.
