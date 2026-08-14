# Alzabt Vertical Repertoire Matrix

**Status:** Deliverable requested by Salman after reviewing `ALZABT_TEMPLATE_REPERTOIRE_PROPOSAL.md`
— per-vertical Required/Recommended/Optional classification, with a reason for each. **Still no
code, no DB, no tenant data.** This document also records the 5 decisions Salman actually made
(below), correcting the Proposal document's own open items rather than rewriting that document's
history.

**The governing principle this document is built on, Salman's own words, to be treated as
settled going forward:**

> **"Alzabt لا يبني 'قوالب صفحات'. Alzabt يبني مكتبة قدرات Sections، ومن هذه المكتبة كل Vertical
> يحصل على repertoire مناسب، ومن الـrepertoire كل Tenant يحصل على موقعه الخاص."**
> (Alzabt does not build "page templates." Alzabt builds a library of Section *capabilities* —
> from that library, each Vertical gets an appropriate repertoire; from that repertoire, each
> Tenant gets its own site.)

Every matrix below is built independently per vertical *because of* this principle, not despite
it — any place two verticals end up needing the same section is reported as an **empirical
observation**, never assumed in advance as a shared "core."

---

## Decisions actually made (supersedes the open items in `ALZABT_TEMPLATE_REPERTOIRE_PROPOSAL.md`)

| # | Proposal item | Salman's decision |
|---|---|---|
| 1 | Official Section Library scope | ✅ **Confirmed** — real + proven-by-use = official. Added condition: each official section needs a defined function + usage rules + visual-quality standard, not just "the component exists" (folded into this document's own structure and into item 5). |
| 2 | Universal Core mandatory for every vertical | ❌ **Rejected.** No section is required "by rule" across all verticals. Each vertical gets its own independently-reasoned Required/Recommended/Optional classification — this document. |
| 3 | Vertical preset → tenant customizes | ✅ **Confirmed as stated.** No full website builder. |
| 4 | Configured Template (toggle + reorder) | ✅ **Confirmed, revised**: structural rules live at the **vertical** level (this matrix), not as one universal rule like "hero always first, core never removable." |
| 5 | Per-section visual quality standards | ✅ **Confirmed, strongly.** Named as the real lesson from RK: the problem was never "too few sections," it's that existing sections don't yet have a strong enough design system. This is Layer-1 investment — built once, every vertical benefits. |

---

## How to read each matrix

- **Required** — the vertical's site is not functioning as a real presence for that kind of
  business without this section.
- **Recommended** — a real, typical need for this vertical; a tenant can turn it off, but doing so
  is a deliberate trade-off the tenant is making, not the platform's default.
- **Optional** — genuinely elective; adds real value for some businesses in this vertical, not
  needed by all of them.
- **Reason** — the actual business logic, not "because RK/Ali happens to have it."

Section names use the **Layer-1 capability name** (from `SECTION_MAP`) where an existing component
already fits; a vertical-facing **label** (what the tenant/dashboard calls it) is noted separately
where it differs from the capability name — this distinction matters, see Cross-Vertical
Observations below.

---

## Barber

| Section (capability) | Vertical label | Tier | Reason |
|---|---|---|---|
| `hero` | Hero | **Required** | First impression; no barber business page functions without one |
| `featured_items` | Services | **Required** | The bookable catalog — the entire point of the page |
| `cta` | Book Now | **Required** | Booking is the conversion action; present, though exact placement/style is this vertical's own call, not inherited from another vertical |
| `story` | Our Story | Recommended | Personal, craft-driven trust — a barber's identity/history is a real, typical trust signal for this vertical |
| `gallery` | Work / Shop Gallery | Recommended | Grooming is visual — real photos of the space and finished cuts build confidence before booking |
| `staff` *(new, Section "Cross-Vertical")* | Our Barbers | Recommended | Many customers book a specific barber by name/reputation, not "the shop" abstractly |
| `hours` | Hours | Recommended | Practical necessity for a walk-in-adjacent business |
| `location` | Location | Recommended | Practical necessity — physical visit required |
| `testimonials` | Reviews | Optional | Useful, not load-bearing the way it is for Clinic (trust here is carried more by gallery + story) |
| `video_story` / `story_experience` | — | Optional | Real production cost (video); not proven necessary for this vertical yet |

---

## Clinic

| Section (capability) | Vertical label | Tier | Reason |
|---|---|---|---|
| `hero` | Hero | **Required** | Same baseline reasoning as Barber — independently true here, not inherited |
| `credentials` *(new — real gap, not yet built)* | Credentials / Qualifications | **Required** | For a clinic, this carries the trust weight gallery/story carry for Barber/Beauty — patients need to know who is treating them and their qualifications before anything else |
| `featured_items` | Services / Treatments | **Required** | Same reasoning as Barber — the bookable catalog |
| `cta` | Book an Appointment | **Required** | Same booking-is-the-point reasoning, independently true here |
| `staff` *(shared capability, see Cross-Vertical)* | Our Doctors / Specialists | Recommended | Patients often choose *who* they see, not just *where* — same underlying need as Barber's "Staff," different label/framing |
| `testimonials` | Patient Reviews | Recommended | Real trust signal for medical/health services — arguably stronger here than for Barber |
| `hours` | Hours | Recommended | Practical necessity |
| `location` | Location | Recommended | Practical necessity |
| `gallery` | — | **Not included / Optional at most** | Deliberately *not* gallery-forward — a waiting-room photo gallery does not build the trust a clinic needs the way it does for Barber/Beauty; including one is a real, deliberate choice a specific clinic could still make (Optional), never a default |
| `story` | — | Optional | Narrative "who we are" carries less weight here than Credentials does; not excluded, just not load-bearing |

**`credentials` is a real, confirmed Layer-1 gap** — no existing `SECTION_MAP` entry covers this.
Needed before a real Clinic reference can be built; named here, not built.

---

## Beauty / Makeup

| Section (capability) | Vertical label | Tier | Reason |
|---|---|---|---|
| `hero` | Hero | **Required** | Same baseline reasoning, independently true here |
| `featured_items` | Services | **Required** | Same bookable-catalog reasoning |
| `gallery` | Portfolio | **Required** *(not just Recommended)* | For this vertical specifically, visual portfolio (before/after, real work) is arguably the *primary* trust signal, stronger than for Barber — the work being sold is inherently visual |
| `cta` | Book Now | **Required** | Same booking-is-the-point reasoning, independently true here |
| `staff` *(shared capability, see Cross-Vertical)* | Our Artists | Recommended | Clients often follow/choose a specific artist's style — same underlying need as Barber's Staff / Clinic's Doctors |
| `testimonials` | Reviews | Recommended | Real social-proof signal for this vertical, similar weight to Clinic |
| `hours` | Hours | Recommended | Practical necessity |
| `location` | Location | Recommended | Practical necessity |
| `story` | — | Optional | Salman's own example list omitted this for Beauty — respected here; a personal artist-brand story *could* still matter for some businesses in this vertical, hence Optional rather than excluded entirely |

---

## Cross-Vertical Observations (empirical, not assumed in advance)

These patterns emerged *from* building the three matrices independently — they are findings, not
inputs, consistent with the governing principle:

1. **`hero`, `featured_items`, and `cta` land as Required in all three matrices** — but for each
   vertical's own, independently-stated reason, not because a rule mandated it. If a fourth
   vertical's matrix ever produces a different result for one of these, that's real signal, not an
   error to correct back toward consistency.
2. **One real, shared Layer-1 capability serves three different vertical labels**: Barber's
   "Staff," Clinic's "Doctors," Beauty's "Artists" are the same underlying need — a people/team
   showcase — with vertical-specific copy/framing. This is a genuine engineering efficiency
   finding: it argues for **one new `staff`/`team` component** (a real, confirmed gap — not yet in
   `SECTION_MAP`), built once, labeled per-vertical via tenant/vertical config — not three
   near-duplicate components. This is exactly the kind of shared-capability reuse the governing
   principle predicts should happen naturally, discovered by building the matrices, not designed
   in from a top-down "core" assumption.
3. **`testimonials`/"Reviews"/"Patient Reviews" is the same existing capability** (`testimonials`,
   already in `SECTION_MAP`) relabeled per vertical — no new component needed there, only
   per-vertical copy/label configuration.
4. **`gallery` genuinely changes tier by vertical**, not just presence/absence — Required for
   Beauty, Recommended for Barber, effectively excluded for Clinic. This is the clearest concrete
   evidence in this whole exercise that verticals need different *treatment*, not just different
   *decoration* — a repertoire, per Salman's own framing, not skins.
5. **Two real, confirmed Layer-1 gaps** exist and are named, not built: a `staff`/`team` component
   (serves 3 verticals) and a `credentials` component (Clinic-specific so far; may generalize to
   "Certifications" for a future Wellness/Spa vertical — unconfirmed, not assumed).

---

## What this document does not decide

- Exact section **order** within each vertical (Salman's own example orderings are reflected in
  the tables above but not re-argued section-by-section here — worth his explicit confirmation).
- The visual-quality-bar specification itself (Decision 5, confirmed in principle above) — a
  separate, dedicated document, not started here.
- Whether `staff`/`credentials` get built now or later — that's an implementation-sequencing
  question, explicitly deferred until Salman gives the go-ahead to write code at all.
- Any vertical beyond these three — the method (build each matrix independently, report
  cross-vertical patterns as findings) is meant to generalize, the specific matrices are not.
