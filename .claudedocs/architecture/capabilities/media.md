# Media Capability

Per the Capability Contract model (`../adr/TOS-003-capability-contract-model.md`). Extracted from
`TENANT_OS_PLAN.md` §13 (Contract), §19/§20 (Open Findings/Maturity) during the ADR-0003 migration
(Phase 5).

## Ownership

File upload and its resulting URL's persistence, across every upload context (hero, logo, product
photo, unit gallery). Distinct from Site Configuration, which may *reference* a media URL (e.g.
`logo_url`) for rendering but does not own the upload/persistence mechanism itself (see
`site-configuration.md`'s Ownership Matrix).

## Contract

| Sub-capability | Status | Mechanism |
|---|---|---|
| Upload a file into a specific storage context (hero, logo, product, unit gallery) | ✅ Real | `upload.py`'s `FOLDER_MAP`/`IMAGE_TYPE_MAP`, `useImageUpload.js` — the file transfer itself always succeeds |
| Persist the uploaded URL somewhere queryable | ⚠️ **Per-context, not blanket** | Real for `page_hero_video` (writes `Client.hero_video_url` directly, bypassing any Service — itself a Broken-Architecture-adjacent concern) and for `catalog_item`/`unit_cover`/`unit_gallery` (via `GalleryImage`/catalog rows). **Not real for `page_logo`, `page_hero`, `page_story`, `page_demo`** — confirmed by reading `upload.py`'s full route body: none of those contexts match a persistence branch; the call falls through to `return {"url": ..., "image_id": None}` and the URL is never saved anywhere unless a caller separately PATCHes it (which the Content Capability now does for `page_hero` via `/media/hero-image` — `page_logo` has no equivalent route yet) |
| Reorder unit gallery photos | ✅ Real (booking module only) | `PUT /gallery/{unit_id}/reorder` |
| Delete a unit gallery photo | ✅ Real | `DELETE /gallery/images/{id}` |
| Browse/reuse previously uploaded media across contexts (a real Media Library) | ⚠️ Gap | No client-wide "list my media" endpoint exists — every upload is bound to one context, nothing is browsable/reusable across contexts today |
| Replace beit-al-fakhar's Hero video (frame-sequence Hero) | ⚠️ Gap, distinct from the generic `hero.bg_image` path | See "ReplaceMedia Processing Pipeline" below — frames are extracted offline by hand today (`ffmpeg`, then hardcoded into `walkthroughAssets.js`); a real `ReplaceMedia` for this Hero cannot reuse the simple file→URL shape without silently leaving stale frames on the page |

## Operations (Editing Engine, `TOS-002`)

`ReplaceMedia` is this Capability's primary Operation type. See
`../adr/TOS-002-editing-engine.md` §4.5 for the full "not always `file → URL`" principle and its
worked Asset/Pipeline table (Logo/Product photo: upload only; Hero video frame-sequence: upload +
frame extraction, today manual and unautomated; Gallery images/PDF: future pipeline needs, not
built).

## Schema

Upload contexts (`upload.py`'s `FOLDER_MAP`): `page_hero_video`, `catalog_item`, `unit_cover`,
`unit_gallery`, `page_logo`, `page_hero`, `page_story`, `page_demo`. Only the first three
categories persist a URL anywhere today (see Contract table above).

## Admin Projection

`app/api/v1/admin/upload.py` (generic file transfer) + `media_service.py` (the one real Editing
Engine path, `hero.bg_image` via `content_sections_repo.py`) + `gallery.py` (unit-gallery
CRUD/reorder, no Service layer — see Open Findings).

## Public Projection

Media URLs are read wherever the owning Capability's Public Contract exposes them (e.g.
`GET /public/{slug}/config` for `hero.bg_image`) — Media itself has no dedicated public read
endpoint; it is always read through whichever Capability references the URL.

## Maturity

**Experimental** — one new real Interface path (`hero.bg_image` via the Editing Engine) was added
2026-07-22, but Booking's unit-gallery context remains Missing Architecture (below) unchanged, and
this is one field on one section type, not yet a general cross-module Media Capability (no Media
Library, no browse/reuse). Stays Experimental until the broader Contract above is actually built,
not just one Operation type proven.

## Open Findings

**Missing Architecture — Gallery/Media (`gallery.py`).** No service exists for `GalleryImage`
CRUD/reorder at all; `storage_service.py` handles only upload/storage mechanics, not the CRUD
logic, which lives directly in `gallery.py`'s route handlers via `gallery_repo`. `media_service.py`
(built for the narrow `hero.bg_image` Editing Engine path via `content_sections_repo.py`) does not
touch, and does not close, this finding — Booking's unit-gallery CRUD/reorder still has no Service
layer.

**ReplaceMedia Processing Pipeline — Known Requirement, not yet built.** See
`../adr/TOS-002-editing-engine.md` §4.5 in full. Named here as this Capability's own open item, not
re-explained — the ADR is the Single Source of Truth for the principle itself.

## Related

- `../adr/TOS-002-editing-engine.md` — the `ReplaceMedia` Operation type and its Processing
  Pipeline Known Requirement.
- `content.md` — the one real Editing Engine Media path built so far (`hero.bg_image`) is a Content
  Capability field whose media is replaced via this Capability's Operation.
