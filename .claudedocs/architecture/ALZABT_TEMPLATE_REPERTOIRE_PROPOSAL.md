# Alzabt Template Repertoire — Architecture/Product Proposal

**Status:** Proposal for decision — options and trade-offs only, nothing below is decided. Answers
Salman's 5 named questions directly, in his own order. **No code, no DB, no tenant data touched.**
Reads after `ALZABT_PRODUCT_MODEL.md` (Round 1 — what Alzabt is) and
`ALZABT_TEMPLATE_REPERTOIRE_MECHANISM.md` (Round 2 — the 4-layer mechanism: Reservations engine →
Section Library → Vertical Template → Tenant Instance). This document is where the mechanism gets
turned into real choices, still pre-code.

**Correction on the way in**: Round 2 said "RK uses 6 of the 12 registered section types." Checked
the real config directly for this document — RK actually uses **10 of 12**:
`hero, story, story_experience, gallery, featured_items, video_story, testimonials, hours,
location, cta`. Only `categories_grid` and `offers` are unused by any real Reservations-type
tenant today. This is an even stronger existing proof point than Round 2 stated — worth
correcting rather than letting the undercount stand.

---

## The core risk this proposal is designed against

Salman's own framing, stated directly: *"We don't want to build an excellent Barber template and
discover afterward we designed the whole system around Barber."* Every option below is evaluated
against that risk specifically — not just "does this work for Barber," but "does the reasoning
that produced this choice generalize, or does it secretly assume Barber's shape."

---

## 1. What is the official Section Library?

Not every component that exists in code should automatically be "official" — Salman's own
framing. `SECTION_MAP` has 12 entries; real Reservations-tenant usage (RK + Ali combined) has only
ever exercised 8 of them (`hero, story, story_experience, gallery, featured_items, video_story,
testimonials, hours, location, cta` minus overlap — RK alone covers 10; Ali adds nothing new).
`categories_grid` and `offers` have **zero real usage in this domain** — they were very likely
built for `store`/`restaurant` (retail browsing, promo pricing), and it's genuinely unknown
whether they even make sense for a services/booking business.

### Option A — Adopt all 12 as official
Simplest. Risk: inherits retail/promo-shaped assumptions (`categories_grid`, `offers`) into the
"official" Reservations library without evidence they fit, diluting what "official" means.

### Option B — Curate now, based on a manual review of each component
Read each of the 12 components' actual code/props today, decide fit by inspection. Faster than
Option C, but is exactly the kind of judgment call this proposal is supposed to avoid making
unilaterally without Salman.

### Option C — Adopt only what's proven by real use; the rest stay "candidate"
Official library = the 8 already exercised by a real Reservations tenant (RK). `categories_grid`
and `offers` become **candidates** — usable, but not part of any vertical's default repertoire
until a real vertical need names them explicitly. New section types (e.g. a `staff`/`team` type,
named in Round 2 as plausible but not built) enter the same way: built for a real, named need,
never speculatively.

**Recommendation: Option C.** This is a direct, mechanical application of this project's own
existing Abstraction Rule (`rules/team-roles.md` — generalize only after independently proven
real cases, not predicted need) to the Section Library itself, not just to code abstractions.
It's also the option most directly aligned with the stated risk: it refuses to canonize components
whose fit for this domain is unverified, which is exactly how a system quietly ends up shaped
around whichever vertical happened to use it first.

**Decision needed from Salman:** confirm Option C, or pick A/B.

---

## 2. What are the repertoires per vertical?

This is the section where the "designed around Barber" risk is most concrete — so the proposal is
built by first asking what's **universal to any services/booking business**, independent of
vertical, and only then asking what differs. Presented as a starting proposal, explicitly not
final.

### Proposed universal core (every vertical, no exceptions)
`hero → story → featured_items (services) → hours → location → cta`

Reasoning: a services business that lacks a services list, hours, location, or a clear booking
CTA isn't really presenting itself as bookable at all, regardless of vertical. This is the
smallest set that makes *any* Reservations-type tenant functional as a real business page — chosen
for that reason, not because it happens to match what RK already has.

### Proposed vertical-specific layer — illustrative, not decided

| Vertical | Additions to the core | Why (real reasoning, not assumption) |
|---|---|---|
| **Barber** | `gallery`, (candidate: `staff`) | Grooming/aesthetic trust is visual — real work photos and knowing which barber you're booking both matter |
| **Beauty / Makeup** | `gallery`, `testimonials`, (candidate: `staff`) | Same visual-trust logic as Barber, arguably stronger (before/after, portfolio); social proof matters more here than in Barber |
| **Clinic** | `testimonials`, (candidate: a not-yet-built `credentials`/`policies` section) | **Deliberately *not* `gallery`-forward** — a waiting room photo gallery doesn't build the trust a clinic needs the way a barbershop's interior does; patients trust credentials, reviews, and clear policies more than photography. This is the concrete proof point that verticals should diverge, not just accumulate more sections. |

**Two real, honest gaps this surfaces**: a `staff`/`team` section and a `credentials`/`policies`
section do not exist in the Section Library today (Section 1's list). If Clinic or a
staff-forward vertical gets prioritized, that's real, scoped, small new Layer-1 work — named now
so it isn't discovered mid-build.

**Recommendation:** adopt the universal core as stated (low-risk, structurally justified);
treat the vertical-specific table as a discussion draft, not a decision — Salman may weight
Barber/Beauty/Clinic differently once he actually reviews real reference sites per vertical the
way he did for Barber via Booksy.

**Decision needed from Salman:** confirm or revise the universal core; confirm, revise, or defer
the vertical-specific table (Clinic's is the one most worth his own real-world judgment, since
it's the one this proposal is least confident about without a real clinic reference to look at).

---

## 3. Who decides the sections for a tenant?

### Option A — Fully automatic, tenant never changes it
Vertical template applied at provisioning, locked. Fastest to build. **Directly contradicts** the
entire premise of this multi-round exercise — "unique and special pages," not identical-within-
vertical pages. Named only to be ruled out explicitly, not as a real contender.

### Option B — Preset at provisioning, tenant edits afterward via the dashboard
The vertical's repertoire seeds the tenant's starting sections; the business (or Salman, during
onboarding) then edits real content, and can toggle which of the vertical's sections are actually
shown. Matches the already-real mechanism (`Client.config.content`, editable via the existing
page-content pipeline) — no new system, an extension of what exists.

### Option C — Full onboarding-driven customization (a real "website builder")
Tenant picks from the *entire* Section Library (all 12+, not just their vertical's repertoire),
freely, at onboarding or anytime after. Maximum flexibility. Real cost: this is a materially
larger, different product than a curated template system — closer to Wix/Squarespace than to what
exists today — and directly threatens the thing Salman explicitly said to protect (Reservations,
Demo Builder, multi-tenancy) by turning a frontend-presentation improvement into a much bigger,
open-ended build.

### Option D — Hybrid: guided onboarding questions narrow the vertical's optional sections
A few real business-shape questions during onboarding ("do you want to show a photo gallery?" "do
you have staff to feature?") determine which of the vertical's *optional* sections get included;
the *universal core* (Section 2) is never optional. A natural, incremental evolution of Option B,
not a different system.

**Recommendation: Option B now, Option D as a deliberate later step once Option B is proven** —
same "prove it before generalizing it further" logic as Section 1. Option C is not recommended at
this stage; it's a different, bigger product decision that deserves its own explicit conversation
if Salman ever wants it, not something to back into via this proposal.

**Decision needed from Salman:** confirm B (with D as a named future step), or explicitly choose
differently.

---

## 4. What's the level of freedom? (Template vs. website-builder)

Framed as a spectrum, since "how much freedom" is really the same question as #3 asked from the
tenant's own editing experience rather than the provisioning moment:

```
Fixed Template          Configured Template           Guided Builder          Full Website Builder
(no changes)         →  (toggle sections on/off,   →  (+ reorder, within   →  (any component, any
                         edit content within            structural rules,       order, custom layout/
                         each section)                   e.g. hero always       CSS — Wix/Squarespace-
                                                          first)                 shaped)
```

**Recommendation: land on "Configured Template," lean toward allowing reorder within real
structural constraints** (hero always first; cta/booking always last or always present; universal
core sections from Section 2 cannot be removed, only optional/vertical-specific ones can be
toggled). This is the same reasoning as Option B/D above, restated for the editing axis
specifically: real per-business distinctiveness (content, photography, which optional sections
appear) without opening into full free-form layout risk, which is where quality becomes
ungovernable (Section 5) and where scope stops being "improve the frontend" and starts being "build
a website builder."

**Decision needed from Salman:** confirm this landing point, or state a different tolerance for
reordering/structural change.

---

## 5. What's the visual quality bar?

Booksy (and the other references) set a *felt* bar — real photography, confident typography,
generous spacing, a clear booking affordance. This section proposes turning that feeling into a
**checkable standard per section type**, so any new vertical inherits real, verifiable quality
instead of a vague aspiration — and so "does this meet the bar" stops being a subjective per-tenant
argument each time.

### Proposed per-type checklist (draft, not exhaustive — a starting shape)

| Section type | What "excellent" checkably means |
|---|---|
| **Hero** | Real photography (not stock-feeling); a confident headline visible without scrolling; exactly one primary CTA; sufficient text/background contrast |
| **Gallery** | A real minimum photo count (e.g. ≥4-6, exact number TBD); consistent aspect ratio/grid; verified reflow at real mobile width |
| **Featured items (services)** | Name + price + duration always visible; consistent card sizing; no orphaned/empty cards when the count is odd |
| **Testimonials** | Real (or clearly-labeled demo, per Round 1's honesty principle) attribution; not more than a small number shown at once (avoid a wall of text) |
| **Typography** | One consistent type scale across every section (already exists structurally — `frontend/src/theme.js`'s `FONT`/token pattern — worth confirming the dynamic-sections library actually draws from it, not verified in this proposal) |
| **Spacing** | A defined vertical-rhythm scale between sections — **this is the literal, real bug found in today's RK audit**: unstyled, inconsistent gaps between sections are a spacing-*system* gap, not a one-off CSS bug, and are probably the single largest contributor to the "feels blank" complaint that started this whole review |
| **Mobile** | Every section independently verified at real mobile width (390px class), no horizontal overflow, tap targets at or above this project's own already-established minimum (28px, per `DatePicker.jsx`'s precedent) |

**Recommendation:** this checklist becomes a real, standalone reference doc (`.claudedocs/
architecture/capabilities/` or similar, once matured) that every Section Library component —
existing 12 and any future ones — is audited against before being called "official" per Section 1.
Not written today; named here as the next concrete artifact this proposal implies, not started
without approval.

**Decision needed from Salman:** confirm this is the right shape for a quality bar, and whether
he wants specific numeric thresholds (e.g. exact minimum gallery photo count) decided by him or
left to a later pass once real verticals are being built.

---

## How this proposal protects the risk Salman named

- Section 2's universal core was derived from "what makes any booking business functional,"
  built before looking at Barber specifically — not extracted from RK's page after the fact.
- Section 2's Clinic example is deliberately a case where a vertical needs **less**/**different**
  content than Barber (no gallery-forward identity), not just Barber-plus-more — direct evidence
  the proposal isn't just Barber with extra optional sections bolted on.
- Section 1 and Section 3/4's recommendations both apply the same "prove before generalizing"
  logic Salman's own project already uses elsewhere (Abstraction Rule) — consistent, not
  Barber-specific reasoning.
- Nothing here proposes touching the Reservations engine, Demo Builder, or multi-tenancy — every
  option stays inside the presentation layer (`Client.config.content` + `DynamicPage.jsx`), per
  Round 2's Layer 0/1 boundary.

## Open decisions, summarized (Salman's, not made here)

1. Section Library scope — Option A/B/**C (recommended)**.
2. Universal core — confirm or revise; vertical-specific table — confirm, revise, or defer
   (Clinic especially).
3. Who decides sections — Option A/B/C/**D as a later step on top of B (recommended)**.
4. Freedom level — confirm "Configured Template, constrained reorder" or state a different
   tolerance.
5. Quality bar shape — confirm the checklist approach; decide who sets numeric thresholds and
   when.

No implementation until these are resolved, per instruction.
