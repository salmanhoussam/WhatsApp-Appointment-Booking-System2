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

## Review 2 — 2026-08-18

### Original Goal

Close Review 1's own named Escalation Watch trigger — build/finish the Media Capability once a
third real Media-specific case appeared (a bespoke tenant needing the generic path, a generic
tenant needing bespoke-style derived assets, or a real bug from the two paths disagreeing) —
per `ALZABT_MEDIA_CONTENT_FOUNDATION_PROPOSAL.md`, ratified by Salman 2026-08-17.

### Current State

**The trigger was met for real.** Mister H's hero video was wired directly into
`Client.config.content.sections[hero].data.framed_video_url` (the JSON-blob path) during an
earlier round of this same session, before this Foundation existed — then, once the Foundation
was built, that exact tenant needed migrating off the JSON-blob path onto the generic
`GalleryImage`-backed one. This is precisely Review 1's third case: a real, concrete instance of
the two write-paths' disagreement, not a hypothetical one.

Real, verified change: `GalleryImage` gained `mediaType` (`image`/`video`) and `altText`
(additive migration, zero existing rows touched). `PATCH /admin/media/hero-image` now writes a
real `GalleryImage` row (`imageType='page_hero'`) instead of the JSON blob.
`public_service.get_tenant_config()` injects that real row's URL into the hero section's response
data before `HeroSection.jsx` ever sees it — the frontend component needed zero changes.
**The dual write-path is closed for the hero-media case specifically** — image and video both go
through one real function (`media_service.replace_page_media`) now, not two independent
mechanisms.

### What Worked

- Investigating before proposing, per this project's own standing discipline, found something
  neither the original proposal draft nor Review 1 had explicitly named: `GalleryImage`'s own
  `image_type` column comment *already declared* `page_hero`/`page_logo` as valid values —
  meaning the schema was designed for this generic role from early on, just never wired up. This
  turned "should we build a new Media table" into "finish what was already started," a
  meaningfully different (and lower-risk) question, only visible by reading the real schema
  comment rather than the Capability doc's own prose summary alone.
- The Renderer gap Review 1 implicitly left open (TOS-002 always deferred it, `EditableRegion` was
  only ever a discovery/registration wrapper) is now real: `SettingsTab.jsx`'s new
  `HeroMediaSection` is the first actual Dashboard UI for a Media Operation. Proven end-to-end via
  a real browser file upload through the real admin UI (not a script) — confirmed by a fresh
  `GalleryImage` row appearing in the database.
- RK, which has no `page_hero` row yet, was confirmed live to be completely unaffected — the
  injection is additive by construction, not just by intent.

### What Didn't

- This Review closes the **hero-media** instance of the dual-path problem specifically. It does
  **not** close the broader, still-real gap Review 1 also named: booking's `gallery.py` CRUD/
  reorder still has zero Service layer, unchanged.
- Page-level `logo`/`page_gallery`/`experience` `imageType` values are specified in the ratified
  proposal but **not yet implemented** — only `page_hero` has a real write path today. Phase 2 of
  the same proposal covers these; not done in this Review.
- Naming (`GalleryImage` vs. a more accurate name like `MediaAsset`/`TenantMedia`) was explicitly
  deferred again, Salman's own call (Option A) — not revisited here, still real future work if a
  second tenant's real usage ever makes the current name feel genuinely misleading.

### Unexpected Discoveries

None beyond what's already folded into "What Worked" above — this Review's evidence was unusually
clean because the investigation (schema comment, real file reads) happened *before* any code was
written, not discovered mid-implementation as a correction.

### Architecture Impact

**Real, ratified change**, not just a finding: `GalleryImage` is now the Capability's actual
Single Source of Truth for page-level tenant media (starting with `page_hero`), superseding the
JSON-blob field for any tenant with a real row. This directly resolves the specific tension
`rules/backend/architecture.md §9` ("One Capability, One Service, One Source of Truth") flagged as
live in Review 1.

### Promote?

**Yes → this Capability moves from Experimental toward a real, in-use pattern for hero media
specifically.** Not a full promotion to "Mature" — `page_logo`/`page_gallery`/`experience` remain
unbuilt, and booking's `gallery.py` Service-layer gap is untouched — but the specific Escalation
Watch trigger Review 1 named is closed, with real evidence, for the one case it was about (hero
media dual-path). `architecture/capabilities/media.md`'s own `## Maturity` summary should be
updated to reflect this the next time that file is touched (not done as part of this ledger entry,
per this project's own scoped-update convention — only this ledger's own append happens now).

### Next Actions

- Phase 2 of `ALZABT_MEDIA_CONTENT_FOUNDATION_PROPOSAL.md`: wire `page_gallery` through the
  existing `gallery` dynamic-section (real rows, not placeholder tiles), then `page_logo`.
- Booking `gallery.py` Service-layer gap: still open, still unowned, still no scheduled work —
  carried forward unchanged from Review 1.
- Update `architecture/capabilities/media.md`'s `## Maturity` section to reflect this Review's
  real outcome, next time that file is otherwise touched.

## Review 3 — 2026-08-18 (same day, later segment — Homepage Phase 2.4)

### Original Goal

Review 2's own named Next Action: "Phase 2 of `ALZABT_MEDIA_CONTENT_FOUNDATION_PROPOSAL.md`: wire
`page_gallery` through the existing `gallery` dynamic-section (real rows, not placeholder tiles)."

### Current State

**Done, real, verified.** `page_gallery` now has the same real write path `page_hero` proved in
Review 2 — but as a genuine **collection** (add/remove/reorder), not a singleton replace, since a
gallery is inherently a list. New: `gallery_repo.py`'s `list_page_media`/`add_page_media`/
`remove_page_media`/`reorder_page_media`; `media_service.py` wrappers; 4 new admin routes; a real
Dashboard Renderer (`GalleryMediaSection`, mirroring `HeroMediaSection`'s established pattern);
`public_service.py`'s `_inject_page_gallery_media()`, same additive-override pattern as hero's own
injection. `GallerySection.jsx` needed zero changes.

### What Worked

- The exact same investigation discipline Review 2 credited paid off again: `GalleryImage.
  imageType`'s own schema comment already named `page_gallery` as a valid value (from the original
  Phase 1 migration) — confirmed real before writing any code, not assumed.
- Proven end-to-end via a real browser upload (not a script), same rigor as Review 2's hero proof:
  logged into Mister H's real admin, used the actual file-chooser, confirmed a real Supabase URL
  under the new `pages/home/gallery/` path, confirmed the identical URL live on the public
  homepage, then deleted it via the real "حذف" button and confirmed full revert.
- RK reconfirmed unaffected via both direct API and browser at every step — no `page_gallery` rows
  exist for RK, the injection correctly no-ops.

### What Didn't

- `page_logo` — still named in the Proposal, still not built. No tenant has any real logo asset or
  even a nav/header component to display one in yet (see Unexpected Discoveries below) — building
  the media plumbing ahead of a place to render it would be premature.
- Booking's `gallery.py` Service-layer gap — still open, still unowned, unchanged since Review 1.

### Unexpected Discoveries

While investigating the remaining named media surfaces (Services photos, Story media, Logo/brand
media) for the same Homepage Phase 2.4 pass, found something Review 2 never had reason to look
for: `Client.logo_url` is **not a real database column at all**, and `DynamicPage.jsx` — what
Mister H's real homepage actually renders — mounts **no nav/header component whatsoever** today.
There is no logo placement anywhere on the page to wire media into. This isn't a Media Capability
gap in the sense Review 1/2 meant (a write-path problem) — it's that the consuming UI doesn't exist
yet, a different, more structural kind of gap, explicitly out of this Capability's own scope.

### Architecture Impact

Confirms and extends Review 2's real finding: `GalleryImage` is proving out as the Capability's
actual Single Source of Truth for page-level tenant media, now across two real shapes (singleton
`page_hero`, collection `page_gallery`) with the identical underlying model, just different
Repository/Service functions. No architecture change — the design decided in Review 2 (imageType =
WHERE, mediaType = WHAT) held without modification for a genuinely different media shape.

### Promote?

**Yes, further** — `page_gallery` joins `page_hero` as a real, in-use, Dashboard-manageable pattern.
Still not "Mature" for the Capability as a whole: `page_logo` unbuilt (now understood to be blocked
on a real UI decision, not just unstarted), booking's `gallery.py` gap untouched.

### Next Actions

- `page_logo`: blocked on the Logo/Nav structural decision (see the Unexpected Discoveries finding
  above) — not schedulable as pure media-plumbing work until that decision exists.
- Booking `gallery.py` Service-layer gap: still open, still unowned, carried forward unchanged.
- `architecture/capabilities/media.md`'s `## Maturity` section still needs updating to reflect
  Reviews 2 and 3 both — still deferred to the next time that file is otherwise touched, per this
  project's own scoped-update convention (now two Reviews deep without that sync happening; worth
  doing the next time anyone is in that file for any reason).

## Related

- `.claudedocs/evolution/media-capability.md` — the full accumulating history this Review draws on.
- `.claudedocs/architecture/capabilities/media.md` — the current-state Contract/Maturity summary.
- `.claudedocs/evolution/capability-contracts.md` — the cross-cutting "second implementation grows
  unnoticed" pattern this Review's Unexpected Discoveries section references.
- `.claudedocs/architecture/ALZABT_MISTER_H_HOMEPAGE_PHASE2_IMPLEMENTATION_CONTRACT.md` §"Phase
  2.4" — the real investigation table naming Logo/Nav's actual current state, cited rather than
  restated here.
