# Architecture Review Loop — Always Active

Governs the recurring **maturity review** stage of this project's documentation lifecycle.
Established 2026-07-29 at Salman's explicit request, from a real, named gap: this project is
disciplined at Investigate → Implement → Verify (`investigation-protocol.md`,
`service-execution-constitution.md`'s evidence rules), but nothing ever came back later and asked
"did the decision hold up?" Editing Engine, Dashboard, Media, Story Experience, Catalog, Admin/
Public each got a rigorous one-time verification and then no further re-assessment. Its own track
record starts with the two real pilot reviews seeded alongside this file
(`.claudedocs/maturity/media.md`, `.claudedocs/maturity/catalog.md`) — this file states principles,
it does not claim to be battle-tested beyond that.

## Why this is a different "Review" than the one already in `documentation-policy.md`

`documentation-policy.md`'s workflow chain already has a **Post-Implementation Review** — a
one-shot, ADR-scoped gate that checks one finished ADR against what was decided, right before that
ADR is archived. This file's Review is a **different, recurring thing**:

| | Post-Implementation Review | Architecture (Maturity) Review |
|---|---|---|
| Scope | One ADR, once | One Capability/Interface/System, repeated over time |
| Trigger | Before archiving that ADR | Periodic — before starting significant new work on the topic, or roughly every 2 weeks of activity on it |
| Question | Did we build what the ADR decided? | Is the original decision still correct *today*? Has a second case appeared? Did we over-generalize? Is there new debt? Should this promote to an ADR, or roll back? |
| Home | `.claudedocs/reviews/ADR-000X_POST_IMPLEMENTATION_REVIEW.md` (one-shot, immutable) | `.claudedocs/maturity/<topic>.md` (living, appended to) |

Never conflate the two. A topic can go through many Maturity Reviews across its life without ever
having its own ADR yet (still Experimental); an ADR only ever gets one Post-Implementation Review.

## Where this fits in the documentation lifecycle

```
Session Reports → Evolution Documents → ADR → Architecture Plan → Implementation Contract
  → Implementation → Verification → Architecture (Maturity) Review → Post-Implementation Review → Archive
```

The Maturity Review sits after Verification and loops back into Evolution/ADR: a Review's own
"Promote?" answer either closes with no change, feeds a new dated entry into `evolution/<topic>.md`
(new insight, not yet stable), or — on a second independent confirming case — becomes a candidate
for a brand-new ADR.

## The folder: `.claudedocs/maturity/<topic>.md`

A new top-level sibling to `reviews/`, `evolution/`, `adr/`, `sessions/` — not nested under any of
them. Kept separate from `reviews/` deliberately: `reviews/` is flat and **immutable by
convention** (revisiting a subject creates a new file there, never appends to an old one — the same
invariant ADR-0003's own Investigation fixed once already for that folder). A recurring, appended-to
document does not belong there; it gets its own folder instead, the same way `evolution/` was kept
a sibling of `architecture/` rather than nested inside it.

`<topic>` names a Capability (`catalog`, `media`, ...), an Interface (`dashboard`), or a
cross-cutting System (`editing-engine`) as appropriate — not forced to 1:1 match
`architecture/capabilities/*.md`, since not every review topic is a Capability in this codebase's
own vocabulary (`rules/backend/architecture.md` §10 names Dashboard an Interface, not a Capability).

## Entry template (fixed — every Review uses exactly these fields)

```markdown
## Review N — YYYY-MM-DD

### Original Goal
[what this Capability/Interface/System originally set out to do]

### Current State
[what is real and working today, evidenced]

### What Worked
[real, evidenced]

### What Didn't
[real, evidenced]

### Unexpected Discoveries
[found along the way, not the point of the review]

### Architecture Impact
[does this change any existing Contract, Principle, or ADR]

### Promote?
Yes → ADR-000X (name it) / No — reviewed, no change / Roll back — see [[topic]]

### Next Actions
[concrete, owned]
```

Never rewritten or deleted — same immutability rule as `evolution/`'s entries. A later Review may
revise an earlier one's conclusion, but the earlier entry stays as history.

## Relationship to `architecture/capabilities/<name>.md`'s existing `## Maturity` section

That section stays the **current-state summary** — updated after each Review to reflect its latest
conclusion. `maturity/<topic>.md` is the **full dated ledger** of every Review that produced that
summary. Same relationship an ADR has to its own `evolution/` file: settled current fact vs.
accumulating history. Only `## Maturity` (and, per the running command's own scoped update rule,
whichever other sections actually changed) gets touched in the capability file — never a rewrite of
unrelated sections.

## How a Review actually gets produced

Via the `/architecture-review` command (`.claude/commands/architecture-review.md`) — this rule file
is the constitution, that command is its operational instance, the same relationship
`service-execution-constitution.md` has to a real Service Contract. The command is evidence-only
(reads real session reports, never summarizes from memory) and ends with the same three-part
Confirmed/Side/Unknowns discipline as `investigation-protocol.md` where relevant.

## The pattern-escalation rule

If a finding appears for the second independent time across Reviews (this project's own Abstraction
Rule threshold, `rules/team-roles.md`), it must be called out explicitly as a candidate for ADR
promotion or a full Architecture Review — never just logged and left sitting. This is what turns
the Review Loop into a place patterns get *noticed*, not just a place events get recorded.

## Cadence — bo-hussein's standing responsibility

No automated scheduler exists for this (none of this project's tooling runs a durable calendar
trigger across sessions). Instead, per `repository-hygiene.md`'s equivalent pattern: before
starting significant new work on a Capability/Interface/System, or after roughly two weeks of real
activity on one, bo-hussein checks whether it is due for a Review and says so explicitly — the same
standing-responsibility shape already established there for repository drift.
