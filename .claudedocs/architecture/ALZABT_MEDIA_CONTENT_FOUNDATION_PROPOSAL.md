# Media / Content Foundation — Proposal

**Status: Proposal only. No code, no DB migration, no Contract file edited.** Supersedes the
implicit assumption in the earlier `ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md` that new
sections could just be built directly — per your direction, the Media/Content foundation comes
first, homepage sections get built on top of it.

**Governing decision, restated and binding**: no hardcoded media URLs, filenames, or authored
testimonial arrays in the codebase. Every image/video is tenant data, stored as a DB reference to
object storage, editable from the Dashboard with zero developer/deploy involvement. Every
decorative image used in a new section is generic/abstract only — confirmed in the prior proposal,
still binding here.

---

## 1. The central finding — this isn't a green field

Investigated before proposing anything, per this project's own evidence discipline. Real result:
**a generic tenant media model already exists, half-wired.**

`prisma/schema.prisma:379-402`, `model GalleryImage`, already carries this exact comment on its own
`imageType` field:
```
imageType   String   @default("gallery") @map("image_type")
// image_type values: gallery | cover | catalog | page_hero | page_logo
```
`unitId` and `catalogItemId` are both **optional** — meaning a `GalleryImage` row scoped to just
`clientId` (no unit, no catalog item) is already structurally valid today. The schema's own author
already anticipated `page_hero`/`page_logo` as real, generic, page-level media types.

**But real usage never followed the schema's own design**: hero image writes go through
`app/api/v1/admin/media.py`'s `PATCH /admin/media/hero-image` → `media_service.py` →
`content_sections_repo.py`, which writes the URL into `Client.config.content.sections` (a JSON
blob) — **not** a `GalleryImage` row with `imageType: 'page_hero'`. A separate hero-*video* path
writes directly to a `hero_video_url`-shaped field again, independently. This is exactly what
`.claudedocs/maturity/media.md`'s own Review 1 (2026-07-29) already found and named: *"dual
write-path never unified... `PATCH /admin/media/hero-image` (JSON blob) vs. bespoke
`page_hero_video` context... remain two separate mechanisms for 'the tenant's hero media.'"* That
Review classified the Media Capability **Experimental (~38%)**, explicitly not promoted, with a
named Escalation Watch condition: *promote once a third real Media-specific case appears.*

**Mister H's real needs — hero video, per-service photos, staff portraits, a homepage gallery, and
brand assets — are that third case.** This proposal is that promotion, not a new invention.

**Recommendation: finish wiring `GalleryImage` as the real generic tenant media store it was
already designed to be — do not build a second, parallel media table.** Building a new table
alongside an existing, half-built one would recreate the exact dual-path problem this proposal
exists to close, and violates this project's own "build twice before abstracting" discipline in
the opposite direction — abstracting *before* the one real attempt was even finished.

---

## 2. What changes in the data model — additive, not a rewrite

`GalleryImage` gains two real fields it's currently missing (both additive, nullable/defaulted, no
existing row breaks):

| New field | Why |
|---|---|
| `mediaType` (`"image" \| "video"`, default `"image"`) | Closes the video-vs-image split that currently lives in two unrelated mechanisms. A hero video and a hero image become the same row shape, distinguished by this field, not by which endpoint wrote them. |
| `altText` (nullable string) | Real accessibility gap — `caption_ar`/`caption_en` already exist and stay (bilingual display captions), `altText` is a distinct, standard field neither one covers |

**`imageType` (rename candidate: `purpose`, not decided here) already carries the discriminator
this needs** — its existing declared vocabulary (`gallery | cover | catalog | page_hero |
page_logo`) is extended, not replaced, with the real values this build needs:

```
gallery       (existing, unit/catalog galleries — untouched)
cover         (existing — untouched)
catalog       (existing — untouched)
page_hero     (existing in the schema comment, NEVER actually used this way yet — this proposal
              is what finally makes it real)
page_logo     (existing in the schema comment, same status — never real yet)
page_gallery  (NEW — the homepage "Latest Cuts"-style gallery, clientId-only rows, no unit/
              catalog link, ordered by sort_order — same shape GalleryImage already has)
experience    (NEW — a dedicated story/experience-style section, if/when built; named now so a
              video isn't forced into `gallery` just because no better slot exists yet, per your
              own explicit concern)
```

**This directly answers your "video vs. gallery" question**: a `GalleryImage` row's `imageType`
(`page_hero` / `page_gallery` / `experience`) decides *where it's used*; `mediaType`
(`image`/`video`) decides *what it is*. The same real uploaded video could be re-tagged from
`page_hero` to `page_gallery` by changing one field from the Dashboard — no schema fork, no
data migration, no re-upload, exactly the flexibility you asked for.

**`Barber.imageUrl` stays a direct field, not a `GalleryImage` row** — one photo per barber is a
1:1 relationship with no ordering need; `GalleryImage` is for ordered collections (galleries,
candidate hero media). Mixing the two patterns would be the wrong abstraction, not the right one.

---

## 3. Storage — no new system, same convention already established

`storage-tenant.md`'s existing `properties/{slug}/...` Supabase bucket convention is unchanged.
`GalleryImage.url` continues to store the real public Supabase URL, exactly as it does today for
unit/catalog galleries. No new storage mechanism, no new bucket, no new folder convention.

---

## 4. Dashboard editing boundary — finishing the Tenant OS Editing Engine, not inventing a new one

Real, decided architecture already exists here (`.claudedocs/adr/TOS-002-editing-engine.md`,
Status: **Decided**) — this proposal completes it, doesn't replace it.

**What's real today**: `EditableRegion` (`frontend/src/tenant-os/EditableRegion.jsx`) is a genuine,
working **Discovery/Contract layer** — wired into real production sections
(`HeroSection.jsx`, `StorySection.jsx`), registering *what* is editable (`capability`, `fieldKey`,
`schema`). It deliberately renders zero form/modal UI itself — TOS-002 explicitly assigns that to
"the Renderer," which **was never built**. `mediaSchema`/`contentSchema` today define exactly 3
editable fields total (`hero.bg_image`, `hero.title`, `story.heading`) — proof the pattern works,
not yet a real system.

**What this proposal actually needs to finish**:
1. Extend `mediaSchema`/`contentSchema` with real entries for every new editable field this
   build introduces (gallery items, staff photos already exist as a direct `Barber.imageUrl` field
   with its own admin route — confirm reuse, not duplicate; why_choose_us items; footer social
   link).
2. **Build the missing Renderer** — the actual Dashboard UI a real admin clicks to replace an
   image, reorder a gallery, or edit a text field. This is the single largest real piece of new
   frontend work in this whole proposal, and TOS-002 already names it as the deliberately-deferred
   next step, not something to design from scratch here.
3. Real admin routes: extend `/admin/media/hero-image`'s pattern to a generic
   `/admin/media/{context}` shape (or equivalent), backed by `GalleryImage` rows instead of the
   JSON-blob write path — this is the actual "unify the dual write-path" fix.

**Draft/Publish stays explicitly undecided**, per TOS-002 §4.6's own deferral — not re-litigated
here. Every write in this proposal is a direct, immediate publish, same as today's real hero-image
path.

---

## 5. What this means for the homepage sections proposal

`ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md` stands as the section-level plan (`why_choose_us`,
`cta` banner variant, `gallery` preview mode, `Footer`) — this document is the foundation it now
depends on. Revised sequencing:

```
1. GalleryImage schema extension (mediaType, altText, imageType vocabulary) -- small, additive
2. Unify hero media (image + video) onto GalleryImage rows, retire the JSON-blob/hero_video_url
   dual path -- closes the Maturity Review's own named gap
3. Build the Renderer (real Dashboard media-management UI) -- the biggest real piece
4. Wire the homepage "page_gallery" type through the existing `gallery` section (already supports
   placeholder tiles -- becomes real once real rows exist)
5. Only then: why_choose_us, cta banner variant, Footer (per the prior proposal's own §9)
```

---

## 6. Ratified Decisions (2026-08-17, Salman's review)

Resolves this document's own §6 open items — this section is now the record of what's actually
approved, not a re-opened discussion:

1. **No new media table.** `GalleryImage` stays, gains `mediaType` (`image`/`video`) and
   `altText`. Confirmed, not revisited.
2. **File binary vs. reference, stated precisely**: the file itself is never stored in Postgres —
   only in Supabase Storage (unchanged, existing `storage-tenant.md` convention). The DB row
   (`GalleryImage`) holds only the reference (`url`) and metadata (`mediaType`, `imageType`,
   `altText`, `caption_ar/en`, `sort_order`, `isActive`). This distinction is the actual point of
   the whole proposal and is restated here explicitly so it's never ambiguous later.
3. **Naming: Option A confirmed** — `GalleryImage` keeps its current name for now, even once it
   also holds hero image/video, logo, homepage gallery, and experience media. No rename now. A
   rename to something like `MediaAsset`/`TenantMedia` is a real future option once real usage
   (not just this one tenant) proves the model out — not decided or scheduled here.
4. **`Barber.imageUrl` stays a direct field, unchanged.** No migration to `GalleryImage` for staff
   photos — confirmed, not revisited.
5. **Mister H is the one and only target tenant for this build, from here forward.** Binding rule,
   stated explicitly because it wasn't followed cleanly before this review: **no tenant-conditional
   logic anywhere** (`if slug == "ali"` / `if slug == "mister-h"` or equivalent), and **no fixed
   media URLs written into component code or into `Client.config.content.sections[]` JSON**. The
   real hero video already uploaded to Supabase Storage this session (`properties/mister-h/pages/
   home/hero/hero-video.mp4`) was wired directly into the JSON blob (`content.sections[0].data.
   framed_video_url`) *before* this Media Foundation existed — that was correct given what existed
   at the time, but it is now exactly the pattern this proposal replaces. **Migrating that one real
   file's reference out of the JSON blob and into a real `GalleryImage` row is Phase 1's own
   concrete proof-of-work**, not a separate cleanup task.
6. **The Renderer (real Dashboard media-management UI) is a required, non-optional part of Phase 1
   implementation**, not a deferred nice-to-have — the whole point is proven only once Mister H's
   owner (or Salman, standing in for him) can actually replace the hero video from the Dashboard
   with zero code/deploy involvement.

## 7. Phase Order (ratified)

```
Phase 1 — Media Foundation (this is what gets implemented next)
  1. GalleryImage: add mediaType, altText (additive migration)
  2. Real imageType usage: page_hero becomes real (image AND video use the same row shape)
  3. Backend: one real write path for hero media (image or video), replacing the JSON-blob path
     AND the separate hero-video mechanism — the actual "dual write-path" fix
  4. Minimal real Dashboard Renderer: upload/replace the hero media, calling the real endpoint
  5. Migrate Mister H's existing real hero video reference out of the JSON blob into a real
     GalleryImage row — proof this actually works end-to-end, not just in theory
  6. Verify: Mister H's owner can replace the hero video from the Dashboard, zero code/deploy

Phase 2 — Homepage content (sections)
  7. page_gallery wired through the existing `gallery` section
  8. why_choose_us
  9. cta banner variant
  10. Footer
  11. Refine hero/story/services/testimonials/location once real material exists

Phase 3 — Content population (Mister H's real material)
  12. Real service photos, gallery photos, logo, brand data, testimonials (only if real reviews
      exist and reuse is permitted) — content work, gated on material being provided, not on
      engineering effort
```

**Approved. Proceeding to Phase 1.**
