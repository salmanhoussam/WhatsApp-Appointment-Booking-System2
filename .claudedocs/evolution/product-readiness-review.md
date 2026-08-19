# Product Readiness Review — Evolution Log

## 2026-08-01

### Context

Same day the Browser Verification Capability was proven twice (tool-verification suite, then the
white-page investigation — see `evolution/frontend-verification-capability.md`), the obvious next
question came up: now that a real browser can prove a page works instead of guessing from a
screenshot, should every UI in the project get reviewed? Salman's answer, reasoning through it in
bo-hussein's own voice, was a qualified yes with corrections to the naive version of that idea —
this entry records his corrected shape, not the first draft.

### Discovery

Three corrections to the naive "review everything" instinct, each real and specific:

1. **Scope to pages that represent the product, not every page.** A 3-tier priority: customer-facing
   pages (Landing, Store, Restaurant, Booking, Barber, Clinic, Checkout, Login) first, admin surfaces
   second, secondary/static pages last.

2. **The name matters — this is not just "verification."** The first draft name, "Product UX
   Verification Pass," was rejected explicitly: Browser Verification is already doing three
   different things in practice — confirming a page *works*, judging its *UX quality*, and
   surfacing *improvement opportunities* — not just checking pass/fail. A name implying verification
   alone undersells what's actually being produced. Named **Product Readiness Review** instead,
   after the bottom-line question every page review should end on: *is this Ready for Customer?*

3. **The Dashboard review is a Calibration step, not one item in the priority list.** Original draft
   ranked Dashboard as tier 2 (Admin). Corrected: Salman's own words earlier this session — "أنا لسا
   ما فتت شفت الداشبورد" — mean his personal read on the Dashboard sets the evaluation bar the rest
   of the Review gets judged against. Reviewing customer-facing pages before that exists means
   judging them against a standard nobody has actually confirmed. Corrected execution order:

   ```
   0. Calibration — Salman personally opens /hr/dashboard (~15 min, creds + audit already exist:
      dashboard-ux-audit/2026-08-01/summary.md) — Gate, blocks everything below
   1. Extract UX Standards from that review — what "good" looks like, made explicit
   2. Execute — customer-facing pages (Store, Booking, Restaurant, Landing, ...), judged against
      those standards
   3. Execute — secondary/static pages
   ```

5. **Calibration output is capped at three decisions, in the same vocabulary the later per-page
   scorecard uses — not a free-form list of notes.** Added after the plan was otherwise approved:
   whatever Salman finds during the 15-minute Dashboard walkthrough gets sorted into exactly three
   buckets, applied per specific thing he reacts to (a card shape, the Calendar layout, whatever) —
   not twenty individual observations:
   - **Keep as-is** — no change needed
   - **Improve** — right direction, needs polish
   - **Redesign** — wrong shape, rebuild
   This is the same three-way vocabulary item 4's scorecard Decision column already uses
   (`✅ Ready` ≈ Keep as-is, `🟡 Needs Improvement` ≈ Improve, `🔴 Needs Redesign` ≈ Redesign) —
   deliberately unified so Calibration and every later page review speak the same language, and so
   Calibration itself can't spiral into an open-ended punch list.

4. **Output per page is one compact decision row, not a descriptive report.** Requested format:

   | Page | Works? | UX Score /10 | Decision | Note |
   |---|---|---|---|---|
   | Store | ✅ | 7/10 | 🟡 Needs Improvement | ... |
   | Checkout | ✅ | 9/10 | ✅ Ready | ... |
   | Products | ✅ | 4/10 | 🔴 Needs Redesign | ... |

   Decision is always one of exactly three: **✅ Ready / 🟡 Needs Improvement / 🔴 Needs Redesign** —
   never a paragraph standing in for a verdict. Goal stated explicitly: a full picture of product
   state inside one hour, not a pile of individual investigation reports to synthesize afterward.

### What's already covered vs. not, checked against real files (not assumed)

- **Secondary/static pages** — done: `.claudedocs/work/static-pages-validation/2026-08-01/summary.md`
  (4 pages, full evidence). Not yet reformatted into the new one-row scorecard shape.
- **Admin (Dashboard/Calendar/Products/Settings/QR)** — done as an *audit*, not yet as a scored
  Review: `.claudedocs/work/dashboard-ux-audit/2026-08-01/summary.md`. This is also the input for
  the Calibration step above — Salman's personal read on this same material is the actual Gate, not
  a re-run of the audit itself.
- **Customer-facing pages (Store, Booking, Restaurant, Landing, Barber, Clinic, Checkout, Login)** —
  zero Browser Verification coverage so far. This is the real next execution once the Calibration
  Gate clears.

### Current Understanding

Product Readiness Review is the right shape for all future UI review work in this project — not a
one-off task, a repeatable Mission this project's Browser Verification Capability should run against
new areas as they mature (Store today, Booking/Restaurant/Barber next as each gets real traction).
Salman's closing framing: if run well once, this becomes the seed of a standing UX review cycle that
every future Capability benefits from, not just Store or Dashboard.

### Open Questions

- Should a broader **Review Cycle** (Backend confirms APIs / Frontend confirms code / Browser
  Verification confirms the page / Documentation updates the session / bo-hussein calls Ready-or-Not)
  become a real recurring step before every Pilot/Release? Proposed, zero instances run.
- Does the Calibration step's "UX Standards" become its own written artifact (a short criteria doc). Or does it stay implicit, re-derived each time from Salman's stated preferences in session?
- Whether the existing Admin audit's raw findings (Calendar/Products) get reformatted into the new
  scorecard row shape once the Review actually executes, or whether the scorecard only applies going
  forward from here.

### Promoted?

No — a same-day proposal, zero executions under this framing yet. Per this project's Abstraction
Rule, stays as an Evolution entry until Product Readiness Review has actually been run at least once
for real. If it *is* run and produces the intended one-hour-full-picture result, this is a strong
candidate for the pattern-escalation rule in `.claude/rules/architecture-review-loop.md` (a second
independent confirming case would make it a candidate for a standing rule/command, not just a
one-off Mission) — noted here so that threshold is checkable later, not re-argued from scratch.

**Standing gate, unresolved as of this entry**: execution of the customer-facing tier is paused,
not scheduled, until Salman completes the Calibration step (his own personal Dashboard review).
Nothing below Calibration should start before that, even if Browser Verification Capability is
otherwise idle.
