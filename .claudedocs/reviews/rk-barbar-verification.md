# RK Barber Shop — Tenant Verification

Copied from `tenant-verification-template.md`, this project's first real use. Real business name
found via investigation (below), not asked — confirmed **"RK Barber Shop"** (English) from the
logo watermark embedded in one of the tenant's own uploaded videos.

**Tenant:** slug `hr` (confirmed by Salman) — **WhatsApp:** `96176985477` (confirmed) —
**Date:** 2026-07-23 — **Status:** Phase 0 (Tenant Discovery) complete. Phase 0.5 (Architecture
Decision) next, below — no code/DB changes yet.

## 0. Phase 0 — Tenant Discovery (real investigation, per Salman's explicit instruction)

**Correction to this section's own first draft**: an earlier version of this section stated
decisions ("build tenant-specific," "seed services explicitly") as if they were investigation
outcomes. Salman's catch: *"هيدا قرار معماري، وليس نتيجة تحقيق... التحقيق لازم ينتهي عند [الحقائق]،
وبعدين يتوقف."* Investigation stops at facts; deciding what to do about them is a separate step
(Phase 0.5, below). Rewritten to keep that seam visible.

### Confirmed

- RK Barber Shop identified (real business name, found via the logo watermark in one of its own
  uploaded videos — not asked for).
- 3 real videos uploaded to `properties/RK Barbar/` (downloaded and frame-extracted directly, not
  guessed from filenames):
  - Video 1 (24.2s, 464×832): shop entrance + interior/product-shelf pan, casual phone-shot.
  - Video 2 (13.1s, 464×832): close-up product-shelf pan (Elegance-brand sprays/gels).
  - Video 3 (18.1s, 576×1024, higher-res): wide cinematic full-shop interior shots, carries the
    real "RK Barber Shop" logo watermark throughout.
- Video 3 fits the existing Hero mechanism exactly (Sprint 2's `ReplaceMedia`/`hero.bg_image` — one
  video, autoplay background) — confirmed by reading `HeroSection.jsx`'s real `isVideo` handling.
- `GallerySection.jsx`'s real data shape is `{ heading_ar, images: [{url, caption_ar}] }` — images
  only, confirmed by reading the component directly, zero `video`/`mp4`/`isVideo` reference found.
- No existing section or Capability in this codebase handles more than one video, or non-Hero
  video, today. This is the first real case that needs it.
- Booking (`app/api/v1/admin/reservations.py`) and Catalog (`catalog.py`/`catalog_service.py`) both
  work independently and are both real, usable modules.
- `SERVICE_TYPE_MAP` (`app/core/services.py`) has no preset combining `booking` + `catalog` — every
  existing `service_type` seeds one or the other, never both.
- `ReservationsTab.jsx` (552 lines, read directly) is a table/list view with status badges
  (`pending`/`confirmed`/`arrived`/`cancelled`/`no_show`) and pagination — **not** a calendar. No
  calendar rendering of reservations exists anywhere in the admin dashboard today (an earlier draft
  of this section wrongly assumed one existed — caught and corrected before it stood as fact).

### Unknowns

- Arabic business name — no real artifact confirms one; not guessed.
- What happens to Videos 1 & 2 (see Phase 0.5, below — this is a decision, not an unknown fact, but
  listed here because it's not yet resolved).

### Phase 0.5 — Architecture Decisions (Salman, 2026-07-23)

**Decision 1 — Videos 1 & 2: tenant-specific section, confirmed.** Hero = Video 3 (the
professional one). A new section (name TBD — "Our Shop" / "Inside RK") shows Videos 1 & 2.
Salman's reasoning goes beyond the Abstraction Rule: the real question was never "how do we
display videos," it's "how does this Hero tell *this* shop's story" — beit-al-fakhar needed a
frame-sequence Hero because of *its* story; this tenant may need a different section because of
*its* story. UX and architecture agree here, not just architecture alone.

**Decision 2 — a new Tenant Type: Barbershop, confirmed — reframed from how it was first proposed.**
Salman's correction: this is not "add a `SERVICE_TYPE_MAP` key" — that's the *implementation*.
The real decision is that a new Tenant Type ("Barbershop") now exists in this platform's product
taxonomy; `SERVICE_TYPE_MAP` is merely where that decision gets executed. Recorded this way
specifically so implementation details don't end up quietly driving architecture.

**Decision 3 — Reservations calendar: explicitly REJECTED for v1, and the reasoning matters more
than the answer.** My recommendation was wrong, and Salman named exactly why: *"وجود Gap لا يعني
أن نسده"* — a Gap found during Discovery does not automatically become a Requirement. He asked for
"simple booking," full stop; Discovery separately found no calendar view exists; I incorrectly
treated "a gap exists" as "therefore build it." The real question — does the owner even need a
calendar at ~10 bookings/day, or only once volume grows toward ~80/day — was never asked. **First
version ships without a calendar. The Gap stays a named, known Gap — explicitly deferred, not
in v1 scope, not silently dropped either.**

---

## 1. What Made This Tenant Different

A real combination not previously exercised in this codebase: simple appointment **Booking** +
a service/product **Catalog** display + **WhatsApp** contact, all in one tenant, plus 3 real
uploaded videos (only 1 of which is actually a Hero problem — see §0). beit-al-fakhar was a pure
showroom/store (Catalog + WhatsApp, no Booking); this is the first tenant needing Booking and
Catalog together.

## 2. Architecture Questions Raised During the Build

| Question asked | Finding (fact only — decision lives in §0's "Decisions Required" or Phase 0.5) |
|---|---|
| Does `SERVICE_TYPE_MAP` have a preset combining `booking` + `catalog`? | No such preset exists. |
| Is the 3-video Hero Sprint 2's plain `ReplaceMedia`, or something new? | Video 3 alone fits plain `ReplaceMedia`. Videos 1 & 2 fit no existing mechanism. |
| Does a reservations calendar view already exist? | No — confirmed by reading `ReservationsTab.jsx` directly; it's a table/list. |
| Did we need to modify an existing ADR or Principle? | Not observed — everything found so far fits within existing Capability boundaries. |
| Was a file's planned location wrong, or was the Implementation Contract incomplete for this case? | Not yet observed — too early, still Phase 0. Will be re-checked once real development starts. |

## 3. Navigation Check (real, timed)

Per the same discipline added to every ADR-0003 migration phase — not "was the right file
technically reachable," but "how long did it actually take, for real, during this build":

- Time to find the relevant Capability's Contract: ___
- Time to find the relevant Principle (if any applied): ___
- Any point where you gave up searching and re-read the whole old plan/mega-doc out of habit
  instead of the new structure? (If yes, that's a real finding, not a personal failure — name it.)

## 4. Confirmed Findings

Real, evidenced things this build proved or disproved about the architecture — grounded in what
actually happened, not what should have happened.

## 5. Side Findings

Real things noticed along the way that aren't the point of this review (dead code, a naming
collision, tech debt) — named as side findings explicitly, not folded into the main narrative.

## 6. Unknowns

- **Arabic business name** — the video's logo watermark only confirms the English name ("RK Barber
  Shop"); no Arabic name found in any real artifact. Not guessed.
- Real service list + prices — per Salman, the owner adds these via the Dashboard directly; no
  real data seeded now beyond a minimal empty/starter catalog structure.

(The 3 open Decisions Required — Videos 1&2's fate, service-seeding mechanism, calendar timing —
are tracked in §0, not repeated here; those are decisions pending Phase 0.5, not unresolved facts.)

## 7. Verdict — Does the Architecture Need to Change?

- [ ] No — the architecture held, as-is, for this real case.
- [ ] Yes — Capability Contract(s) affected: ___
- [ ] Yes — ADR(s) affected: ___
- [ ] Yes — Principle(s) affected: ___
- [ ] Yes — the Implementation Contract's own template/structure needs a change: ___

If any "Yes" is checked, the actual edit happens as its own follow-up, referencing this Review as
the evidence — this document itself is never edited afterward to reflect the fix (same immutability
rule as every other Review).
