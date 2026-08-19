# TOS-005 Phase A — Interface Unification — Evidence (2026-08-19)

Follows: `.claudedocs/implementation/TOS-005/CONTRACT.md` Phase A. All 9 items of the Contract's own
Acceptance Test, verified with real evidence — real browser (Playwright MCP, direct in-session per
`browser-verification-protocol.md`), real backend restart, real DB/config reads, real credentials
(`admin@ali-barber.local`, reset via the sanctioned `scripts/reset_hr_admin_password.py --slug mr-h`
after the previously-recorded password had gone stale).

## Code changes

- `app/api/v1/admin/content.py` — removed `GET/PATCH /hero-title`, `GET/PATCH /story-heading` and
  their two Pydantic models; module docstring rewritten to point at `TOS-005`.
- `app/services/content_service.py` — removed `update_hero_title`/`get_hero_title`/
  `update_story_heading`/`get_story_heading` (confirmed via grep, no other caller existed).
- `frontend/src/tenant-os/schemas/content.js` — both entries' `apiPath` repointed to
  `/content/sections/{hero,story}/fields`; `buildPatchBody` hook added.
- `frontend/src/tenant-os/schemas/sectionFieldHelpers.js` — new `buildSectionFieldPatchBody`
  helper.
- `frontend/src/pages/generic-admin/GenericAdminDashboard.jsx` — `saveFieldValue` uses
  `field.buildPatchBody` when present, else the existing flat body (Media's `hero.bg_image`
  unaffected, confirmed by inspection — no `buildPatchBody` on that entry).

## Acceptance Test — all 9 items, real evidence

1-3. **Edit `hero.title` via Inline editor, save, confirm the generic route received it** — real
   click dispatched on the iframe's `[data-capability="content"][data-field-key="hero.title"]`
   element, real `window.prompt` dialog handled via `browser_handle_dialog`, real network capture:
   `PATCH http://localhost:5173/api/v1/admin/content/sections/hero/fields?client_slug=mr-h => 200 OK`.

4. **Confirm DB/config value changed** — real read of `GET /api/v1/public/mr-h/config`:
   `config.content.sections[hero].data.title_ar` = `"صالون مستر إتش — TOS-005 Phase A test"`
   (the exact test string entered).

5. **Confirm the public homepage reflects it** — real navigation to `http://localhost:5173/mr-h/home`
   (not the preview iframe), `document.getElementById('root').innerText` starts with the exact
   test-string title, 0 console errors.

6. **Repeat 1-5 for `story.heading`** — same pattern: real click on
   `[data-field-key="story.heading"]`, prompt handled, network capture:
   `PATCH .../content/sections/story/fields?client_slug=mr-h => 200 OK`; config read confirmed
   `sections[story].data.heading_ar` = the test string.

7. **Confirm the Dashboard Section Settings form still edits both fields** — real click on Hero's
   "تعديل" (Edit) row expanded the scalar-field form, which already showed the Inline-set test
   value (proving both Interfaces read identical underlying data); typed a second, distinct test
   string into the form's own input, clicked "حفظ" (Save), network capture confirmed the same
   `PATCH .../content/sections/hero/fields => 200 OK` route, config read confirmed the new value —
   both Interfaces demonstrably share one backend Contract, not two.

8. **Confirm no remaining production caller depends on the legacy routes** — `grep -rn "hero-title|
   story-heading" app/ frontend/src/` returns only historical comments (the migration note itself
   in 3 files), zero real call sites. `curl GET /api/v1/admin/content/hero-title` and
   `/story-heading` both return `404` after backend restart (routes genuinely removed, not just
   unreferenced).

9. **Confirm RK is untouched** — real navigation to `http://localhost:5173/rk/home`, 0 console
   errors, 0 warnings-that-matter (1 unrelated warning, pre-existing), real page content rendered
   (`"RK Barber Shop\n\nحلاقة رجالية احترافية..."`) — no behavior change.

## Side finding (not part of this phase, not fixed here)

Mister H's Settings tab shows 2 pre-existing console errors on load
(`GET /admin/catalog/categories`/`items?client_slug=mr-h` → 500/403) — matches the already-known,
already-documented open item in `todo_list.md` ("`GET /admin/catalog/items?client_slug=mister-h`
returns 403"). Confirmed unrelated to this phase's changes (present before and after); out of
scope for TOS-005, left as the pre-existing tracked item it already was.

## Real tenant data hygiene

Both fields were temporarily set to test strings during verification (steps 1-7 above) and
restored to their real original values afterward via a direct authenticated `PATCH` call (the same
route, same mechanism the Contract verifies) — `hero.title_ar` = `"صالون مستر إتش"`,
`story.heading_ar` = `"قصتنا"`, confirmed via a final `GET /public/mr-h/config` read. Mister H's
real content is unchanged from before this phase started.

## Result

All 9 Acceptance Test items pass with real evidence. Per `TOS-005-cms-generic-engine.md` §4.7 and
the Contract's own gate: **Phase B may now begin** — this phase does not start it automatically;
that remains a separate, explicit decision.
