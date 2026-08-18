# Media/Content Foundation — Phase 1 — Evidence

Proposal: `.claudedocs/architecture/ALZABT_MEDIA_CONTENT_FOUNDATION_PROPOSAL.md` (ratified
2026-08-17, §6-7). Implements Phase 1 exactly: finish wiring `GalleryImage` as the real generic
tenant media store it was already designed to be (per its own `image_type` doc comment), unify the
hero image/video dual write-path, build the real Dashboard Renderer, migrate Mister H's real hero
video off the JSON blob.

## What changed

**Schema** (`prisma/migrations/add_gallery_image_media_type.sql`, additive): `GalleryImage` gains
`mediaType` (`image`/`video`, default `image`) and `altText` (nullable). Applied directly via
Prisma raw query (no `psql` CLI available in this environment) — verified every existing row kept
`media_type='image'`, `alt_text=NULL` immediately after.

**Backend**:
- `app/repositories/gallery_repo.py` — two new functions: `find_active_page_media` (singleton
  lookup by clientId+imageType) and `replace_page_media` (delete-then-create, real "Replace"
  semantics, not a gallery append).
- `app/services/media_service.py` — `replace_page_media`/`get_page_media`, thin wrappers over the
  repo, image OR video handled by the same function (`media_type` param decides which).
- `app/api/v1/admin/media.py` — `PATCH /admin/media/hero-image` now writes a real `GalleryImage`
  row (`imageType='page_hero'`) instead of the JSON-blob field; `GET` reads from there too, with a
  fallback to the old JSON-blob field for any tenant not yet migrated (backward compatible, no
  existing tenant's admin UI breaks).
- `app/services/public_service.py` — new `_inject_page_hero_media()`, called from
  `get_tenant_config()`: if a real `page_hero` `GalleryImage` row exists, its URL overrides
  whatever's in `content.sections[hero].data` before the response is returned. **`HeroSection.jsx`
  needed zero changes** — it already reads `bg_image_url`/`framed_video_url` from this exact
  section data, regardless of where the value actually came from.

**Frontend**: `frontend/src/pages/generic-admin/tabs/SettingsTab.jsx` — new `HeroMediaSection`, the
first real Renderer for the Tenant OS Editing Engine's `media.hero.bg_image` Contract (previously
only `EditableRegion`, a discovery/registration wrapper, existed — nothing rendered an actual
upload UI). Two-step: `POST /admin/upload/` (context=`page_hero`) → `PATCH /admin/media/hero-image`
with the resulting URL + detected media type.

## Live verification

| Check | Result |
|---|---|
| Injection actually overrides the JSON blob (not coincidentally the same value) | Set a `page_hero` row to a deliberately fake URL (`TEST-INJECTION-PROOF.example`) — public config immediately reflected it. Restored the real video afterward. |
| Real end-to-end Dashboard test (not a script) | Logged in as Mister H's real admin, navigated to Settings, used the actual "استبدال الملف" file control to upload a real test image through the browser's file chooser. Confirmed via direct DB read: a genuinely new `GalleryImage` row was created (`imageType=page_hero`, `mediaType=image`, real Supabase URL under `properties/mister-h/pages/home/hero/`) — proof the full chain (browser upload → Supabase Storage → DB row) works with zero script involvement, zero code edit, zero deploy. |
| Mister H's real hero video restored after the test | Confirmed live: `<video>` `currentSrc` = the real `hero-video.mp4` URL, 0 console errors |
| RK regression check | Confirmed live: RK's hero video unchanged (`RK%20Barbar/WhatsApp%20Video...mp4`, its own original JSON-blob value) — RK has no `page_hero` `GalleryImage` row, so the injection correctly finds nothing and leaves it untouched. 0 console errors |
| Backend/frontend syntax | `python3 -c "import ast; ast.parse(...)"` clean on all 4 changed Python files; `eslint` on `SettingsTab.jsx` — 0 errors, 1 pre-existing-style warning (unnecessary `eslint-disable` comment, not a real issue) |

## Side finding, not fixed (out of scope)

`GET /api/v1/admin/catalog/items?client_slug=mister-h` returns `403` when the Mister H admin
dashboard's Calendar/Settings pages load — same class of bug as the earlier-fixed Ali-403
(`categories`, commit `6a08dec`), now observed on the sibling `items` endpoint. Not fixed here —
noted for a future, separately-scoped fix.

## Data impact

Real, intentional writes to Mister H only (the one target tenant, per the ratified proposal's §6.5
binding rule) — one real `GalleryImage` row (the migrated video reference) plus one throwaway test
row (created live through the UI, then superseded when the real video was restored — the test row
itself was never deleted, but is `isActive=False`-equivalent in effect since `replace_page_media`
deletes all prior rows for that `(clientId, imageType)` before inserting the real one, so it no
longer exists). RK and every other tenant: zero writes, zero rendering change, confirmed live.
