# Sprint 2 Evidence — Media Capability (`media.hero.bg_image`, `ReplaceMedia`)

Follows: `investigation-protocol.md`'s evidence discipline (raw evidence + Confirmed/Side
Findings/Unknowns), applied here to a Service execution rather than a bug investigation, same as
`.claudedocs/work/tenant-os-sprint1/2026-07-22/SPRINT1_EVIDENCE.md`.

**Mandate** (Salman, closing Sprint 1): *"أوافق مع الترتيب الذي استقر عليه التقرير: Media
Capability... هل الـ Editing Engine يعمم على نوع Operation مختلف مثل ReplaceMedia؟"* — prove the
Editing Engine generalizes to a second Operation type (`ReplaceMedia`, a real file upload), not
just a second Capability with another text field.

---

## What was built

- `app/repositories/content_sections_repo.py` — extracted shared repo-layer helper
  (`get_section_field`/`update_section_field`), used by both `content_service.py` and the new
  `media_service.py`. Authorized in the Content Capability Architecture Review as the point where
  the Abstraction Rule's "≥2 independent cases" bar was actually met.
- `app/services/media_service.py` — `replace_hero_image`/`get_hero_image`, both delegating to the
  shared repo.
- `app/api/v1/admin/media.py` — `GET`/`PATCH /media/hero-image`, `HeroImageUpdate` Pydantic model
  (`image_url: str`), `require_roles("SUPER_ADMIN", "TENANT_ADMIN")` on the write.
- `frontend/src/tenant-os/schemas/media.js` — `mediaSchema['hero.bg_image']`
  (`type: 'image'`, `operations: ['ReplaceMedia']`, `uploadContext: 'page_hero'`).
- `frontend/src/components/dynamic-sections/HeroSection.jsx` — wrapped the background layer
  (video/image/gradient) in `<EditableRegion capability="media" fieldKey="hero.bg_image">`.
- `frontend/src/pages/generic-admin/GenericAdminDashboard.jsx` — generalized the
  `TENANT_OS_FIELD_CLICK` handler to branch on `field.type` (`'text'` → `window.prompt`, same as
  Sprint 1; `'image'` → trigger a real hidden `<input type="file">`), added
  `handleImageFileSelected` (real upload via the existing `useImageUpload.js`/`upload.py`
  `page_hero` context, then `PATCH` the returned URL).

**Zero changes** to `EditableRegion.jsx`, `discovery.js`, or `DynamicPage.jsx`'s click-capture
effect — the same claim Sprint 1 made for a second field, now extended to a second Operation type.

---

## Real bug found and fixed during verification

`saveFieldValue` originally built the PATCH body as `{ [field.dataField]: newValue }`.
`dataField` is the key inside `section.data` (`bg_image_url` for Media, `title_ar`/`heading_ar`
for Content) — a different concern from the API's own body key. Content's two routes happen to
accept a body key identical to their `dataField` (`title_ar`, `heading_ar`), so Sprint 1 never
exposed the gap. Media's route (`media.py`'s `HeroImageUpdate.image_url`) does not — first real
PATCH attempt returned **422 Unprocessable Entity** (confirmed via the backend's own log, not
guessed). Fixed by adding an explicit `apiField` to every schema entry (`content.js`'s two fields
and `media.js`'s one), decoupling "key inside `section.data`" from "key the route's Pydantic model
expects," and changing `saveFieldValue` to send `{ [field.apiField]: newValue }`. Real,
independently-verified bug — not cosmetic; the previous behavior returned a 4xx for every future
Capability whose API body key doesn't coincidentally match its `dataField`.

A second, purely test-side bug was found and fixed along the way (documented for the record, not
an application defect): the CDP test's click coordinates were computed as a hardcoded
`iframe.getBoundingClientRect().left + 40` offset, assuming the hero sat at the iframe's own
top-left corner. `elementFromPoint` at that computed point resolved to an `<A>` tag (a nav link)
and then to `<html>` (after adjusting), not the hero background — the live-preview iframe's
internal layout has a nav bar above the hero, and the coordinate math never accounted for it.
Fixed by measuring the `EditableRegion`'s actual rendered child (`wrapper.firstElementChild.
getBoundingClientRect()`) and driving the click via a direct synthetic `dispatchEvent(new
MouseEvent(...))` on that node rather than CDP's page-level `Input.dispatchMouseEvent`, which
requires correct iframe-to-parent coordinate translation this preview pane's layout was breaking.

---

## Confirmed Findings

- **Real upload → real PATCH → real DB write, full chain, verified three independent ways:**
  1. Backend log (`/tmp/uvicorn-media3.log`): `POST /api/v1/admin/upload/?client_slug=pilot-test-20260720 HTTP/1.1" 200 OK` followed by `PATCH /api/v1/admin/media/hero-image?client_slug=pilot-test-20260720 HTTP/1.1" 200 OK`.
  2. Real DB read via the public config endpoint (source of truth, not the browser's own state):
     `GET /api/v1/public/pilot-test-20260720/config` → `content.sections[0].data.bg_image_url` =
     `https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/pilot-test-20260720/pages/home/hero/090b28c5-afaa-4f06-b377-8a988918a455.jpg`
     — a real Supabase Storage URL for the file actually uploaded during the test, in the correct
     `{slug}/pages/home/hero/` path per `storage-tenant.md`.
  3. Screenshot (`screenshots/2_after_upload_real_photo.png`): the live preview's hero background
     visibly changed from the gradient placeholder (`screenshots/1_before_upload_gradient_placeholder.png`)
     to the real uploaded photo, without a manual page reload — confirming the same
     `PREVIEW_UPDATE` postMessage re-render mechanism Sprint 1 already proved for text fields also
     works for the `ReplaceMedia` Operation's image URL.
- **The Editing Engine's own code required zero changes** for the second Operation type — same
  claim already made for the second Capability/field, now independently confirmed for a
  structurally different Operation (`ReplaceMedia`, a file upload with an intermediate `POST
  /upload/` step) rather than another `UpdateField` (a direct value prompt).
- **The `apiField`/`dataField` split is now the correct general shape** for any future
  Capability's schema entry — confirmed necessary, not speculative, by a real 422 this session.

## Side Findings

- `content_sections_repo.py`'s extraction (authorized in the prior Architecture Review) held up
  under a second real caller (`media_service.py`) without modification — the shape proved general
  on the first attempt.
- The live-preview iframe pane in `GenericAdminDashboard.jsx` has its own internal nav bar above
  the rendered page content, which any future CDP-based test clicking into that pane must account
  for (measure the real target element's rect, don't assume iframe-origin-relative offsets).

## Unknowns

- Media Capability's broader Contract (§13 of `TENANT_OS_PLAN.md`: browse/reuse previously
  uploaded media across contexts, a real Media Library) remains entirely unbuilt — this sprint
  proved the Engine generalizes to `ReplaceMedia` for one field (`hero.bg_image`), not the full
  Media Capability. `TENANT_OS_PLAN.md` §19's "Missing Architecture — Gallery/Media" finding is
  about the Booking-module unit-gallery path (`gallery.py`) specifically, which this sprint did
  not touch — that finding stays open, distinct from what Sprint 2 closed.
- No test was run for a video upload (`isVideo` branch in `HeroSection.jsx`) — only a static JPEG
  was verified end-to-end.

---

## Recommendation → Decision → Execution (per `investigation-protocol.md`)

- **Recommendation**: the `apiField` fix is small, isolated, and needed by every future
  Capability's schema — apply it now rather than let each new Capability rediscover the same 422.
- **Decision**: executed directly (low-risk, isolated schema/handler fix, consistent with
  established standing authorization for this class of change within an already-approved Sprint).
- **Execution**: `content.js`, `media.js`, `GenericAdminDashboard.jsx`'s `saveFieldValue` — see
  diff in the commit this evidence file accompanies.
