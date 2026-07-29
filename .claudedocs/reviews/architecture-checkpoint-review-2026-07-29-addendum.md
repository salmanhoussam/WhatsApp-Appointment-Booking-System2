# Architecture Checkpoint Review — Addendum — 2026-07-29

Per this project's own `reviews/` convention (`.claude/rules/architecture-review-loop.md`:
revisiting a subject creates a new file, never appends to an old one) — three corrections from
Salman's read of `architecture-checkpoint-review-2026-07-29.md`, recorded here rather than editing
that file in place.

## Correction 1 — Q1's finding is a Bug Class, not five bugs

Salman's sharper framing, adopted: the five instances named in Q1 aren't five separate findings —
they're one repeating shape:

```
Capability
    ↓
Canonical Service
    ↓
❌ Someone bypassed it
```

`client_service.py`/`settings.py`, `admin/units.py`, `admin/services.py`, `admin/restaurant.py`/
`admin/store.py`, and the two parallel `GalleryImage` paths are five *instances* of one *class* of
violation, not five unrelated bugs that happen to look similar. This raises the finding's own
weight beyond what the original review stated — Salman: "this is no longer just Evolution, this has
become almost an ADR or at least a strong Principle." Recorded as elevated, not yet executed — see
Open Decision below.

## Correction 2 — Sequence: swap steps 2 and 3

Original Q5 order: Catalog bypass → Service-type taxonomy → decide the dead scaffolding's fate.
**Corrected order**: Catalog bypass → **decide the dead scaffolding's fate** → Service-type
taxonomy. Reasoning: consolidating a canonical Service-Key taxonomy on top of code that might be
deleted (Customer/Price/BookingService/Listing routes) risks building the new canonical list around
service keys tied to features that won't exist. Decide what lives and what dies first; only then
does "what's the one true list" become a question with a stable answer.

## Addition — Verification has become a Capability in itself

The one thing Salman expected the original review to name and it didn't: this project's own
working shape has shifted from *Build → Test* to:

```
Build
  ↓
Verification
  ↓
Architecture Findings
```

Concretely, this entire session: Site Configuration Sprint 3's own Phase 2/3 verifications
surfaced two real, previously-unplanned findings (smar's own duplicate `SettingsTab.jsx`; Brand
Name having no rendered surface) that reshaped the work *while verifying it*, not before. The
Restaurant Capability Investigation, the Schema Architecture Review, and this Checkpoint Review
itself are all downstream of the same shift — Verification is no longer a step that closes a
Feature, it is where new Architecture Findings actually originate. Salman's own words: "this is
exactly the thinking we were trying to get this project to from the start."

## Open Decision (not resolved here)

Whether Correction 1's Bug Class finding gets written as a real Principle/ADR now, or stays a
strongly-elevated Evolution entry pending Salman's explicit go-ahead — consistent with this
project's Recommendation ≠ Decision discipline, this addendum records the elevation, not the
execution.

## Related

- `.claudedocs/reviews/architecture-checkpoint-review-2026-07-29.md` — the review this corrects.
- `.claude/rules/architecture-review-loop.md` — the immutability convention this addendum follows.
