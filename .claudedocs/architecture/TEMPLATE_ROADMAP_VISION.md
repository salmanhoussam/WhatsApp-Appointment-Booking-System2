# Template Roadmap Vision — Restaurant → Store → Clinic

**Status:** captured, sequencing decided, not all steps designed. Recorded 2026-07-20 per
Salman's explicit roadmap so a future session doesn't have to reconstruct it.

## The roadmap, in order

1. **Restaurant (current, in progress)** — finish `pilot-test-20260720` (the real
   `tenant-seeder` run from earlier today) completely: working frontend, buttons wired to real
   actions, UX/UI polish, then document it as the final reference Template for `food-restaurant`
   and any other `module_key: restaurant` template.
2. **Store** — a complete e-commerce template, once step 1 is reference-quality.
3. **Clinic** — a dental-clinic booking template, once step 2 is reference-quality.

Each step is sequential, not parallel — per Salman's own words: "خلينا نبلش خطوة بخطوة"
(let's start step by step). Do not begin Store or Clinic work while Restaurant is still open.

## Why this file exists

The deeper goal Salman stated behind these three pilots is not "ship three demo tenants" — it's
producing a documented, proven **protocol**: how the agent team collaborates, in what order, and
how the system picks the right agent for a given request type (Restaurant vs Store vs Clinic).
That protocol is the real intellectual property here, not any one tenant. Concretely, each of the
three steps above must leave behind two things, not one:
- a working, reference-quality tenant of that type
- an updated, evidence-grounded handoff record between the Services/Agents involved (see
  `tenant-seeder.md`'s Service Contract → "Frontend Handoff Checklist", added 2026-07-20 as the
  first real instance of this)

## What this file deliberately does not do

It does not design Store's or Clinic's template schemas, sections, or catalog shape — that
happens when their turn arrives, grounded in whatever the Restaurant pass actually proves works
(same discipline as `AI_OPERATIONS_PLATFORM_VISION.md`'s 3-phase gate: generalize from proven
cases, not from prediction).

## Related

- `.claudedocs/decisions/2026-07-20-cash-only-billing.md` — billing decision, unblocks but does
  not schedule Super Admin Dashboard work (queued after Clinic, per Salman's sequencing).
- `.claudedocs/architecture/SUPER_ADMIN_DASHBOARD_PLAN.md` — already-written Dashboard design,
  waiting on this roadmap to reach its turn.
- `.claude/agent/tenant-seeder.md` — Service Contract, real execution record for step 1.
