# Media Capability — Evolution Log

Accumulating understanding of the Media Capability (part of the Tenant OS Editing Engine). See
`.claude/rules/documentation-policy.md`'s "Architecture Evolution Log" section for what this file
is and isn't — entries accumulate here across sessions; promotion to a real ADR only happens once
the understanding has stabilized through multiple independent real implementations.

## 2026-07-22

### Context

Reviewing Sprint 3 Phase 1 (beit-al-fakhar's Hero) while Sprint 2's generic `ReplaceMedia`
mechanism was fresh from having just been built for the generic `HeroSection.jsx` path.

### Discovery

beit-al-fakhar's Hero is not a `<video>` tag — it's a scroll-scrubbed frame-sequence canvas whose
frames are extracted offline, by hand, via ffmpeg, then hardcoded into `walkthroughAssets.js`
(confirmed by reading the file and the `frame-sequence-canvas` skill directly). If a future
`ReplaceMedia` only swapped a stored URL the way Sprint 2 does for the generic `HeroSection.jsx`
path, this page would silently keep rendering the old frames forever — a real, predictable
functional bug, not hypothetical.

### Current Understanding

`ReplaceMedia` is not always `file → URL`. Sometimes it's `file → Processing Pipeline → Derived
Assets → Published Result`, and which shape applies is entirely the owning Capability's own
decision, invisible to every Interface. Recorded as a Known Requirement in `TENANT_OS_PLAN.md §14`
(Editing Engine) before Sprint 3 proceeded, so it couldn't be silently rediscovered
mid-implementation.

### Open Questions

Whether a formal `MediaProcessingPipeline` abstraction is worth building, or whether each
Capability keeps handling its own derived-asset generation ad hoc, remains open — only one real
case (beit-al-fakhar) exists so far.

### Promoted?

No.

---

## 2026-07-23

### Context

RK Barber Shop (slug `hr`, a generic config-driven tenant) — Steps 4-5 of onboarding: wiring its
Hero to a real video (Video 3) using the existing Media Capability, "no bypasses."

### Discovery

Investigation found the Media Capability actually has **two independent, undocumented write
paths** for what looks like the same concept ("the tenant's hero video"):

1. `PATCH /api/v1/admin/media/hero-image` → `media_service.replace_hero_image()` →
   `content_sections_repo.update_section_field()` → patches
   `Client.config.content.sections[type=hero].data.bg_image_url`. Read by the generic
   `HeroSection.jsx` via a regex check on the URL's file extension (`.mp4|.webm|.mov` → `<video>`,
   else `<img>`/background). This is the path every generic tenant (including `hr`) actually uses.
2. A second, separate upload `context` (`page_hero_video`, in `app/api/v1/admin/upload.py`) writes
   directly to a top-level `Client.hero_video_url` DB column — a completely different storage
   location, read only by `TenantHero.jsx`, consumed only by bespoke hand-coded tenants
   (smar/beitsmar). Nothing routes between the two; a caller using the wrong one would silently
   have no effect on what a generic tenant's real Hero renders.

### Current Understanding

"Media Capability" is currently two parallel mechanisms that happen to serve similar-sounding
purposes for two different tenant architectures (generic config-driven vs. bespoke hand-coded),
not one unified Capability with two Interfaces. This mirrors, in a smaller way, the 2026-07-22
entry above: the Editing Engine's real behavior keeps turning out to have more shape than "swap a
URL" once a second real tenant/case exercises it.

### Open Questions

Whether this duplication should ever be unified (one Media Capability, one write path, with the
bespoke/bg-video case handled as just another Interface reading the same `config.content.sections`
data) is unresolved — doing so now would be premature: only two real cases exist (generic tenants
via `bg_image_url`, bespoke tenants via `hero_video_url`), and this project's Abstraction Rule
waits for a second independently-motivated case before generalizing.

### Promoted?

No.

### Escalation Watch (added 2026-07-23, per Salman's explicit direction)

This finding is not routine — it touches `rules/backend/architecture.md §9`'s "One Capability →
One Contract → One Service → One Source of Truth" principle directly: two independent write paths
for what's conceptually "the tenant's hero media" is exactly the shape that principle exists to
prevent. It is deliberately **not** promoted to an ADR yet — only two real cases exist
(generic/`bg_image_url`, bespoke/`hero_video_url`), and promoting on two cases would be the
premature-abstraction mistake the Abstraction Rule exists to prevent. But it must not go quiet
either: if a **third** real tenant case exercises Media in a way that either (a) needs a bespoke
tenant to use the generic path, (b) needs a generic tenant to need bespoke-style derived assets, or
(c) reveals a real bug caused by the two paths disagreeing — that is the confirming case this
needs, and it should be escalated straight to an Architecture Review (`.claudedocs/reviews/`) or a
real ADR at that point, not left to accumulate a fourth, fifth entry here indefinitely.

---

## 2026-07-24

### Context

Diagnosing RK Barber's Story Experience playback stutter. Real investigation (WebSearch + direct
`ffprobe` inspection of the source video + a real 3-density extraction benchmark) confirmed two
things: switching to native `video.currentTime` seeking would be a regression (this footage's own
~1 keyframe/second GOP structure means arbitrary seeks are exactly the case documented to stutter
across devices); and the real fix is raising extraction frame density — beit-al-fakhar's proven
3.2fps (71 frames/22s) is real evidence for *slow, smooth* camera movement, but RK Barber's Video 1
(fast pans, quick cuts, a moving person) visibly "teleports" between 3.2fps samples (demonstrated
directly: two adjacent 3.2fps frames jump from a shelf shot to a fully-revealed barber chair with
zero transition; the intermediate 9.5fps frame shows it emerging gradually).

### Discovery

Salman's explicit correction, given before any specific number was committed to production:
**"Don't hardcode 230 frames as the Story Experience standard. Treat this as a validation profile
for high-motion footage."** The generalizable insight isn't "230 frames is correct" — it's that
**extraction frame density is a property of the source footage's motion characteristics, not a
constant of the Story Experience section type, and it must be validated per real footage (as was
just done, via direct A/B frame comparison + real payload measurement), not assumed from a table.**

### Current Understanding

Two real, independently-motivated data points now exist for how footage motion affects the needed
extraction density:
- **Slow/smooth** (beit-al-fakhar's Hero — steady walk-through, gentle camera movement): 3.2fps
  (71 frames/22s) — visually sufficient, no complaints across this project's real usage.
- **Fast/high-motion** (RK Barber's Video 1 — quick pans, cuts, a moving person): needs materially
  higher density; 9.5fps (230 frames) confirmed via direct frame-by-frame comparison to resolve the
  worst jump. 6.25fps (151 frames) was extracted and measured (4.34MB) but not yet visually
  validated against the same worst-case jump.

A working vocabulary — "slow" / "medium" / "fast" extraction profiles — is useful to *talk about*
this going forward, but **is not yet a built system**: no config schema field, no picker UI, no
automatic motion classifier exists or should exist yet. What these two cases actually prove isn't a
shared VALUE (they disagree, on purpose) — it's the shared CONCEPT that density is a real parameter
of the pipeline, decided per real footage. Building a formal profile system now, on two data
points, would be exactly the premature-abstraction mistake the Abstraction Rule exists to prevent —
the same discipline already applied to the dual-write-path finding above.

### Open Questions

- What's the real right fps for genuinely "medium" motion? Only "slow" (3.2fps) and "fast" (9.5fps)
  are real, validated data points so far — "medium" is still a name with no evidence behind it.
- Should frame-density selection ever be automated (e.g. measuring real inter-frame pixel-delta
  from the source video to auto-suggest an fps), rather than a human judgment call plus a real A/B
  comparison per tenant, as was just done by hand? Not attempted — would need a third or fourth
  real case, with real cost/benefit evidence, to justify that investment.
- Whether "profile" ever becomes a literal field in the `story_experience` section's data schema
  (e.g. `extraction_profile: "fast"` alongside `frame_count`) is explicitly deferred — right now
  `frame_count` alone (already a plain, per-tenant JSON field, no hardcoded default in
  `StoryExperienceSection.jsx`) is sufficient; a named `extraction_profile` enum would be
  documentation for humans/agents choosing a number, not new runtime behavior, and isn't
  worth adding as a schema field until a third real footage type gives evidence for what values
  the enum should even contain.

### Promoted?

No — same reasoning as the entry above: two real cases establish that density-per-footage is real,
not yet what the actual profile boundaries/values should be. Stays in this log until a third real
footage type (a different motion profile, independently exercised) either confirms three named
tiers are enough or shows the axis is more continuous than discrete.
