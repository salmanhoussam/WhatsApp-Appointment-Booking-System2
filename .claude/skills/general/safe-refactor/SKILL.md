---
name: safe-refactor
description: Behavior-preserving internal code cleanup for SalmanSaaS's FastAPI + React codebase — remove duplication, simplify oversized functions, split responsibilities, move business logic out of Routes into Services, unify repeated patterns, retire confirmed-dead legacy paths, improve naming/structure. Use when the user asks to "refactor", "clean up", "simplify", "deduplicate", or "move this logic to the right layer" for existing working code. Does NOT decide architecture, change behavior/authorization/data models, or redesign anything from scratch — those get escalated to an Implementation Contract/ADR instead of happening under this skill's cover. Established 2026-08-09 after Salman explicitly rejected a naive "Refactor" skill and required this gate.
user-invocable: true
---

# Safe Refactor

Added deliberately narrow, not as a "clean up whatever you think needs it" tool. Salman's own
framing, verbatim, is the operating definition:

> Refactoring means changing the internal structure without intentionally changing externally
> observable behavior.

This skill is a scalpel for structure, not a mandate to redesign. If a change would alter what the
system *does* — not just how the code that does it is organized — that change does not happen here.
It gets named, and routed to this project's own real process instead
(`.claude/rules/documentation-policy.md`): Session Report → Evolution Document → ADR → Architecture
Plan → Implementation Contract → Implementation → Verification.

## The one question every candidate change must answer

**"Am I changing what the code does, or only how it's organized?"**

If the honest answer is "only how it's organized" — proceed. If the answer is "well, also..." —
stop. That "also" is not a refactor, it's a decision, and this skill does not make decisions on
Salman's behalf.

## In scope (behavior-preserving structural changes)

- **Remove duplication** — three copies of the same logic become one, called from three places.
  The one copy must do exactly what all three did, for every case, not "roughly what they did."
- **Simplify oversized functions** — split by responsibility, not by arbitrary line count. Each
  extracted piece keeps the exact same inputs/outputs/side effects as the code it replaced.
- **Separate responsibilities** — e.g. validation vs. persistence vs. formatting, when they're
  tangled in one function today.
- **Move business logic out of Routes into Services** — this project's own stated architecture
  (`rules/backend/architecture.md §2`, `rules/backend/api-rules.md §1`: "Routes = HTTP transport
  only... Zero business logic in Routes") is not always followed in practice. A real, already-found
  example: `app/api/v1/admin/store.py` / `app/api/v1/public/store.py` call repositories directly
  with no Service layer at all (`.claudedocs/work/orders-capability-investigation/2026-08-09/
  summary.md`). Moving that logic into a real `store_service.py`, unchanged in behavior, is exactly
  what this skill is for — a candidate already on record, not a hypothetical.
- **Unify repeated patterns** — e.g. the same three-line "fetch, check exists, 404 if not" block
  copy-pasted across a dozen routes becomes one small shared helper, if and only if every call site
  genuinely does the same thing today.
- **Retire confirmed-dead legacy paths** — only when provably unreachable (no route/import/caller
  anywhere — verified by grep, not assumed). This project's own Repository Hygiene rule
  (`rules/repository-hygiene.md`) already has a Drift Category for this ("Forgotten") — use that
  vocabulary when reporting what was removed and why it was safe to.
- **Improve naming/structure** — renames, file moves, folder reorganization — as long as every
  caller is updated and nothing observable changes.

## Out of scope — escalate instead, never absorb quietly

Any of the following means STOP and hand off to this project's real process
(`documentation-policy.md`) instead of proceeding as a "refactor":

- **Behavior changes** — different response shape, different status codes, different validation
  rules, different edge-case handling than before.
- **Authorization changes** — new roles, new scoping, new `require_roles`/`require_service` gates.
  (See `.claudedocs/implementation/STAFF_SCOPED_ACCESS_CONTRACT.md` for what this project's real
  authorization work looks like when it *is* warranted — a full Implementation Contract, not a
  refactor.)
- **Data model changes** — new/removed/renamed Prisma fields, new migrations, new relations.
- **Architecture decisions** — introducing a new abstraction, a new shared base class, a new
  cross-cutting pattern not already proven by ≥2 independent real cases (this project's own
  Abstraction Rule, `rules/team-roles.md`). "This would be cleaner as a generic X" is a proposal for
  Salman, not something to just build.
- **Merging or splitting Capabilities** — e.g. unifying the Restaurant/Store dual order systems
  found in the Orders investigation is exactly the kind of change that *sounds* like refactoring but
  isn't — it changes what's true about the system's structure at the architecture level, not just
  tidies existing code. Name it as a candidate (per the Abstraction Rule/pattern-escalation rule),
  don't just do it.

When something out-of-scope is found mid-refactor, stop that specific change, keep whatever
in-scope cleanup is already done and verified, and report the out-of-scope finding separately —
same discipline this project already uses everywhere else (`investigation-protocol.md`'s Side
Findings, never silently folded into the main narrative).

## Multi-tenancy — the one rule that overrides everything else in this skill

Every refactor touching a DB query must preserve `clientId` scoping exactly as it exists today
(`rules/global.md`). A "simplification" that drops a `clientId` filter, even accidentally, is not a
refactor — it's a critical multi-tenant data leak. Verify this explicitly, every time, not just
when the diff looks database-related at first glance.

## Verification (never skip)

Refactoring without proof of unchanged behavior is just editing and hoping. Before calling a
refactor done:

- Read the exact real callers of anything touched — every one, not a sample.
- For backend changes: real request/response evidence before and after (same input, same output),
  not "the code looks equivalent."
- For anything with existing tests, run them. For anything without, that gap is itself worth
  naming — don't add new test infrastructure as a silent side effect of a refactor either, unless
  asked.
- State explicitly what was verified and how — this project's own Evidence Interrogation standard
  (`investigation-protocol.md`) applies here too: "Verified." alone is not evidence.

## Output shape

1. **Candidate found**: what's duplicated/tangled/misplaced, with file:line evidence.
2. **In-scope confirmation**: explicit answer to the one question above.
3. **The change**: minimal diff, same behavior.
4. **Verification**: what was checked, concretely.
5. **Anything out-of-scope noticed along the way**: named separately, not actioned, per this
   project's own Side Findings discipline.
