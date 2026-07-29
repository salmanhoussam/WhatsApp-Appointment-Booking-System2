# Media — Architecture (Maturity) Review Ledger

Recurring maturity review for the Media Capability. Governed by
`.claude/rules/architecture-review-loop.md`. Never rewritten or deleted — only appended to. See
`.claudedocs/architecture/capabilities/media.md`'s `## Maturity` section for the current-state
summary this ledger produces.

## Review 1 — 2026-07-29

### Original Goal

Build Media as a real, cross-module Capability (upload + persist + browse/reuse) serving the
Editing Engine's `ReplaceMedia` Operation type across every upload context (hero, logo, product
photo, unit gallery) — per `evolution/media-capability.md`'s 2026-07-22 entry.

### Current State

Per `architecture/capabilities/media.md`: **Experimental**, ~38% Acceptance. Only `hero.bg_image`
has a real end-to-end Editing Engine path (`media_service.py` → `content_sections_repo.py`).
Booking's unit-gallery CRUD/reorder still has no Service layer at all (`gallery.py`'s route
handlers call `gallery_repo` directly). No cross-module Media Library (browse/reuse across
contexts) exists.

### What Worked

- The frame-sequence discovery (`evolution/media-capability.md`, 2026-07-22): beit-al-fakhar's Hero
  turned out not to be a simple `<video>` tag but a scroll-scrubbed frame-sequence canvas with
  offline-extracted frames. This was correctly generalized into "`ReplaceMedia` is not always
  `file → URL` — sometimes it's `file → Processing Pipeline → Derived Assets`" and recorded as a
  Known Requirement in `TOS-002` §4.5 *before* a caller could silently rediscover it mid-
  implementation as a bug.
- The frame-density-per-footage insight (2026-07-24): RK Barber's Story Experience stutter was
  root-caused via real `ffprobe` inspection + a real 3-density extraction benchmark, not assumed.
  Salman's explicit correction ("don't hardcode 230 frames as the standard — treat it as a
  validation profile") was applied correctly: two real data points (beit-al-fakhar 3.2fps/slow,
  RK Barber 9.5fps/fast) were kept as two disagreeing facts, not prematurely averaged into one
  constant.

### What Didn't

- The dual write-path finding (2026-07-23) has never been unified: `PATCH
  /admin/media/hero-image` (generic tenants, writes `Client.config.content.sections[hero].data.
  bg_image_url`) and the separate `page_hero_video` upload context (bespoke tenants, writes
  `Client.hero_video_url` directly) remain two independent mechanisms for what reads as one concept
  ("the tenant's hero media"). This is a live tension with `rules/backend/architecture.md §9`'s
  "One Capability, One Service, One Source of Truth" principle.
- Booking's `gallery.py` CRUD/reorder still has zero Service layer — unchanged since first flagged.

### Unexpected Discoveries

The 2026-07-23 dual-write-path finding turned out to be the **first real instance** of a pattern
`evolution/capability-contracts.md` now tracks across three independent cases (Media's hero
write-paths, public-catalog-routes duplication, and this session's three duplicate
`deriveModuleKey()` functions closed by `TOS-004`) — a second implementation growing unnoticed next
to a first one, in three unrelated parts of the codebase. Media's own case was the leading
indicator, not an isolated one-off, even though it wasn't recognized as a pattern until later.

### Architecture Impact

None ratified yet. The 2026-07-23 Escalation Watch explicitly named its own promotion trigger: a
**third real Media-specific case** (a bespoke tenant needing the generic path, a generic tenant
needing bespoke-style derived assets, or a real bug from the two paths disagreeing) — not a
different Capability's case. That third Media-specific case has not occurred. The pattern's third
instance that *did* occur this session belongs to a different topic (Capability Resolution,
`TOS-004`) and does not, by the Escalation Watch's own stated criterion, count as Media's trigger.

### Promote?

No — reviewed, no change. Stays Experimental. The Escalation Watch's specific trigger condition for
Media's dual write-path has not been met; promoting now on the general "we've now seen this pattern
3 times across the codebase" observation would conflate a platform-wide pattern with this
Capability's own specific open question, which is exactly the kind of collapsing this project's
Abstraction Rule and Evolution Log discipline exist to prevent.

### Next Actions

- Booking gallery Service-layer gap (`gallery.py`) remains open and unowned — no next scheduled
  work.
- If any future case exercises the hero-media dual-path question a third time, escalate
  immediately per the existing Escalation Watch in `evolution/media-capability.md` rather than
  re-logging it here.
- `evolution/media-capability.md`'s "medium motion" extraction-density tier remains unvalidated —
  needs a third real footage type with different motion characteristics before any profile system
  is even considered.

## Related

- `.claudedocs/evolution/media-capability.md` — the full accumulating history this Review draws on.
- `.claudedocs/architecture/capabilities/media.md` — the current-state Contract/Maturity summary.
- `.claudedocs/evolution/capability-contracts.md` — the cross-cutting "second implementation grows
  unnoticed" pattern this Review's Unexpected Discoveries section references.
