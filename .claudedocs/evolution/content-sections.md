# Content Sections — Evolution Log

Accumulating understanding of the generic Editing Engine's section-type registry (`SectionType`
in `app/schemas/page_content.py`, `SECTION_MAP` in `DynamicPage.jsx`) as a *pattern surface* — which
section types turn out to be one-tenant one-offs vs. genuinely reusable shapes worth their own
Capability. See `.claude/rules/documentation-policy.md`'s "Architecture Evolution Log" section for
what this file is and isn't.

## 2026-07-23

### Context

RK Barber Shop (`hr`)'s Steps 4-5: building `video_story`, a new section type that renders a
sequence of videos as a narrative block (not a gallery) — see
`.claudedocs/reviews/rk-barbar-verification.md` and `.claudedocs/evolution/media-capability.md`'s
2026-07-23 entry for the technical build.

### Discovery

`video_story` is architecturally different from every other existing section type in one specific
way, per Salman's own framing: `hero`/`story`/`gallery`/`featured_items`/etc. all present *content*
— `video_story` is the first section type built to carry *narrative flow* (a video literally
leading the reader through the page), even though v1 deliberately doesn't render that flow as
navigation yet (§0/Phase 0.5 of the RK Barber review — no segment/category CTAs, real category
data doesn't exist yet).

### Current Understanding

Today `video_story` is exactly one Section, used by exactly one tenant (`hr`) — correctly scoped
as tenant-specific content inside a shared, developer-owned type registry (Section 2's existing
"Template-layer/developer-owned" rule, `TENANT_OS_PLAN.md §10`). It is **not** a Capability and
does not warrant one yet.

### Open Questions — explicit promotion criteria (Salman's own words, recorded verbatim)

Salman will watch, across future tenant builds, whether `video_story` (or a "narrative flow"
shape like it) is independently needed by:
- restaurants,
- real estate,
- showrooms/showcases.

**"إذا تكرر مرتين أو ثلاث، وقتها لا يعود مجرد Section، بل يصبح Capability أو Pattern يستحق ADR
خاصًا"** — if this repeats across 2-3 independently-motivated tenant types, `video_story` stops
being just a Section and becomes a real Capability/Pattern candidate, deserving its own ADR. This
is the same Abstraction Rule already governing this project (`rules/team-roles.md`), applied here
specifically to a Section type rather than a code abstraction — recorded explicitly so the
threshold is visible next time this file gets revisited, not something that has to be re-derived
from memory.

### Promoted?

No — exactly one real case (`hr`) exists. Revisit this file the next time any tenant build
considers a similar video-led or narrative-flow section.

---

## 2026-07-24

### Context

The very next day, Salman reviewed `video_story`'s output for `hr` and pushed it further: a simple
looping video (even framed as "narrative") still wasn't the real ask. He wanted the video to
literally *lead the page* — a scroll-driven frame-sequence canvas (real footage, no `<video>`
scrubbing) with "chapters" that fade overlay UI in/out as the user scrolls through it, reusing
beit-al-fakhar's existing frame-engine as a rendering layer. Built as a new section type,
`story_experience` — see `.claudedocs/reviews/rk-barbar-verification.md` for the full build record.

### Discovery

This is **not** the same idea repeating in a second tenant type (which would trigger the promotion
criteria below) — it's the *same* tenant (`hr`) and the *same* underlying content (Video 1) getting
a second, more ambitious iteration one day later. Real, useful signal came out of it anyway:

1. **The rendering engine really was shareable, not just theoretically.** `useFrameSequence.js` and
   `FrameSequenceCanvas.jsx` (beit-al-fakhar's) were extracted to
   `frontend/src/components/frame-sequence/` and reused as-is (zero logic changes) for `hr`'s
   `story_experience` — confirmed real via a beit-al-fakhar regression check (real headless-Chrome
   screenshot, zero console errors) after the move. This is the Abstraction Rule's "share what's
   proven identical" carve-out actually paying off, not just cited as theory.
2. **`video_story` and `story_experience` are now two distinct, coexisting section types on the
   same tenant** — `hr`'s Video 2 stayed a plain `video_story` block (explicitly not touched, no
   urgency); Video 1 became `story_experience`. This is a real signal that "a video section" isn't
   one shape — plain sequential display and scroll-driven narrative are genuinely different jobs,
   correctly modeled as two different `SectionType`s rather than one type trying to serve both.
3. **A real tuning finding, not a defect**: with `scroll_range_vh: 320` and a real device viewport
   noticeably shorter than the section's scroll height, the CSS `sticky` pin releases before
   `useScroll`'s progress reaches 1.0 (the last chapter, `booking`, can appear mid-unpin rather than
   fully pinned-centered — confirmed via real screenshot at progress≈0.9). This is inherent to the
   already-proven tall-container-plus-sticky-child pattern (beit-al-fakhar has the exact same
   property), not something `story_experience` introduced. Chapter boundaries and
   `scroll_range_vh` are tuning parameters meant to be eyeballed against real footage and a real
   device, same as beit-al-fakhar's own `contentFadeEnd`/`handoffStart` constants were — flagged
   here so a future session doesn't have to rediscover it.

### Current Understanding

`story_experience` is exactly one Section, used by exactly one tenant (`hr`), same as
`video_story`'s own status a day ago. The reusable PART (frame-sequence rendering engine) has
already proven itself across 2 real tenants (`beit-al-fakhar`, `hr`) and is genuinely shared code
today — but the Chapters/Overlay-Blocks *pattern* (the declarative chapter-timing system) still has
exactly one real implementation. These are tracked separately on purpose: the rendering engine's
sharing is already a settled fact, not a future promotion question; the Chapters pattern's
promotion still waits on a second tenant *type*, per Salman's own explicit instruction not to
generalize yet ("الهدف في هذه المرحلة ليس التعميم").

### Open Questions — promotion criteria for the Chapters/Overlay-Blocks pattern (unchanged bar)

Same threshold as `video_story`'s entry above, now applied to `story_experience`'s chapters system
specifically: if a *different* tenant type (restaurant, real estate, car showroom, furniture store —
Salman's own examples) independently needs "a video that leads the story with scroll-timed overlay
content," that's the second real case this needs before the Chapters/Overlay-Blocks shape
(Background/Timeline/Chapters/Overlay Blocks, Salman's own sketch) gets extracted into a real
Capability/Pattern with its own ADR. One tenant reusing it twice for two different videos (as `hr`
just did) does not count — it has to be a second, independently-motivated tenant type.

### Promoted?

No — the rendering engine is confirmed shared (2 real cases); the Chapters/Overlay-Blocks pattern
itself still has exactly one real case (`hr`). Revisit this file the next time any tenant build
considers a similar scroll-driven, chapter-overlay narrative.

---

## 2026-07-24 (later same day) — Reverted, and why that's still real signal

### Context

Same day, after the play/hold pacing fix. Salman gave direct negative feedback on the tuned
result and, separately, on a standalone rendering-technique lab
(`experiments/rk-barber-story-lab/`) built to answer whether canvas frames, native video, or a
hybrid play/pause approach was the right engine. None of the 4 techniques satisfied him. Asked
directly: motion/pacing felt uncomfortable, and video quality itself felt weak.

### Discovery

Both complaints traced to one real cause: **Video 1's footage is a casual, undeliberate phone
pan** — motion blur, a shelf-to-chair jump covering most of the room in 0.3s of scroll. No
rendering technique changes the pixels in the source video. The lab's own real measurements
(zero functional defects across all 4 techniques, real 60fps throughout) confirm the ceiling was
the footage, not the engineering.

### Current Understanding — corrected from the entry above

The earlier framing ("the Chapters/Overlay-Blocks pattern needs a second tenant *type* to
promote") is still correct as far as it goes, but this real second data point adds a precondition
the first entry didn't have evidence for yet: **the pattern also needs footage actually shot with
deliberate, slow camera movement — matching beit-al-fakhar's own real precedent — not just "any
video a tenant happens to have."** `hr`'s Video 1 is exactly the counter-case that proves this:
same tenant, same section type, real chapters, real tuning — and it still didn't work, because the
footage itself wasn't suited to the treatment. This is genuinely useful: it means the promotion
question isn't only "how many tenant types," it's "how many tenant types *with suitable footage*."

Salman's decision: revert `hr`'s Video 1 from `story_experience` back to a plain `video_story`
section (matching Video 2's existing treatment) — keep the current footage, scale back ambition,
rather than keep tuning a technique that was never the limiting factor.

### What stays vs. what doesn't

- `story_experience`'s SectionType, component, and the shared frame-sequence engine are **not
  removed** — real, working, validated code, just not applicable to this footage. Available for a
  future tenant whose footage is actually shot with the right camera intent.
  `experiments/rk-barber-story-lab/` and the Design Laboratory Protocol
  (`.claude/agent/frontend-architect.md`) stay as standing, reusable process — independent of this
  one application's outcome.
- `hr` itself is back to two plain `video_story` sections (Video 1 and Video 2), identical in
  treatment, pending better footage if the ambition is revisited later.

### Open Questions — promotion criteria, revised

Unchanged bar (still needs a second, independently-motivated tenant *type*), plus the new
precondition above (suitable footage, not just any footage). A future case that satisfies both —
different tenant type *and* footage shot with deliberate camera movement — is the real second data
point this pattern needs before promotion. A case with the right tenant type but unsuitable
footage (like this one) doesn't count toward that threshold, and shouldn't be miscounted as if it
did.

### Promoted?

No — if anything, this entry *lowers* confidence that two data points are close, since the second
real attempt didn't survive contact with real footage. Revisit this file only once a tenant with
both a different type and deliberately-shot footage attempts a similar treatment.
