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
(new insight, not yet stable), or — on a second independent confirming case — becomes a **candidate**
for a brand-new ADR.

**"Candidate" is not "created."** A Review flagging `Promote? Yes` names the candidate — it does
not by itself write the ADR. The actual ADR still requires the same explicit approval this project
uses for every one so far (see `TOS-004`'s own history this session: Module Resolution Review →
Salman's explicit approval → only then was the ADR written). A Review's job ends at flagging the
candidate and stating the evidence for why; the decision to actually promote stays Salman's, same
as every other ADR.

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

**Mechanical gate — what actually keeps this from becoming a second Evolution log:** a
`maturity/<topic>.md` file may only be opened for a topic that already has at least one real
Implementation + Verification on record (a real `.claudedocs/verification/*.md` or
`.claudedocs/reviews/*.md` file naming it, or a ratified ADR). A topic still being reasoned about
*before* anything concrete has been built and verified belongs in `evolution/<topic>.md` only — it
earns a `maturity/<topic>.md` file the moment it graduates out of that pre-decision state, not
before. This is a checkable precondition, not a narrative distinction: if someone tries to open a
`maturity/` file for a topic with zero real Verification evidence anywhere, that is itself a sign
this rule is being misapplied.

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
trigger across sessions), so the trigger must be checkable by reading real files, not a felt sense
of "it's been a while." A topic is due for a Review when either:

- it has **never** had a Review yet and already satisfies the Mechanical Gate above (at least one
  real Verification/ADR exists for it) — due immediately, no waiting period; or
- since its last `## Review N` entry's date, it has been the real subject of work in **at least 2**
  of the last 14 session reports (`ls -t .claudedocs/sessions/ | head -n 14`, grep for the topic) —
  the same window the `/architecture-review` command itself reads, so "is it due" and "what would
  the Review find" are answered from the same evidence, not two different heuristics.

Per `repository-hygiene.md`'s equivalent pattern: before starting significant new work on a
Capability/Interface/System, bo-hussein checks the above and says so explicitly — "Is `<topic>` due
for a Review? YES/NO — Evidence: ..." — the same standing-responsibility shape already established
there for repository drift, now with a checkable condition instead of a vague one.
