# Tenant OS Section Editor — Phase 4 (Media Editor) — Evidence (2026-08-20)

Follows Phase 2 (`.claudedocs/implementation/TENANT_OS_SECTION_EDITOR/PHASE_2.md`), which
deliberately stopped short of live wiring to avoid a real duplicate-UI window. Phase 4 does the
actual wiring **and**, in the same change, removes the old placement — so the field is never
editable from two places at once, per §11's own Phase 4 scope and rollback note.

## Code changes

**`app/schemas/section_schemas.py`**:
- `hero.fields.bg_image_url` declared: `{"kind": "media", "pipeline": "singleton", ...}`.
- `gallery.fields.images` declared: `{"kind": "media", "pipeline": "collection", ...}`.
- `_validate_value`'s Phase 2 rejection of `kind: media` on write is unchanged and still applies to
  these two real fields now that they're declared — verified below, live, over real HTTP.

**`frontend/src/pages/generic-admin/tabs/SettingsTab.jsx`**:
- Removed `FieldInput`'s Phase 2 `kind === 'media'` placeholder branch — media never flows through
  `FieldInput`'s value/onChange contract, same as `repeatable` never did.
- New `MediaField({ pipeline, color })` dispatcher: `pipeline === 'singleton'` → `HeroMediaSection`,
  `'collection'` → `GalleryMediaSection`. Neither component's own internal logic changed at all —
  only where they're mounted.
- `SectionEditorPanel`: `fieldsConfig` now also filters out `kind === 'media'` (alongside
  `repeatable`); new `mediaFields` array + render block, mounted first in the panel (visual
  identity before text fields); empty-state check extended to `mediaFields.length === 0`.
- **General Settings' old `<HeroMediaSection>`/`<GalleryMediaSection>` placement removed** — the
  two lines that used to render them directly are gone, replaced with a comment pointing at their
  new home.

## Why this order (declare + relocate + remove, one change) — not gradual

Phase 2's own evidence file named the exact risk: declaring the field live without also relocating
the component creates a window where the same field is editable from two places. Phase 4 closes
that window in the same commit, per §11 Phase 4's stated scope and rollback plan ("revert to
hardcoded placement (Phase 1's state)") — a single atomic step, not two.

## Real verification — backend

Restarted the real uvicorn process (it runs without `--reload`; confirmed the previously-running
instance had not picked up Phase 2's code either, until restarted) — `venv/bin/python3 -c "from
app.main import app"` succeeds, then live over real HTTP with a real JWT from a real
`POST /api/v1/auth/users/login` (`mr-h`):

```
GET /content/sections/schema -> hero.fields.bg_image_url =
  {'kind': 'media', 'pipeline': 'singleton', 'label_ar': 'خلفية الصفحة الرئيسية (صورة أو فيديو)'}
GET /content/sections/schema -> gallery.fields.images =
  {'kind': 'media', 'pipeline': 'collection', 'label_ar': 'صور المعرض'}

PATCH /content/sections/hero/fields {"fields":{"bg_image_url":"https://evil.example/x.jpg"}}
  -> 422 {"success":false,"error":{"code":"UNPROCESSABLE","message":"Field 'bg_image_url' is a
      media field and cannot be set via section fields -- it is managed by its own dedicated
      media endpoint", ...}}
```

Confirms the field is discoverable **and** the write-path boundary from Phase 2 still holds after
declaring it live — real HTTP request, not a unit test.

Direct execution of `SECTION_SCHEMAS`/`validate_fields` (`venv/bin/python3`) additionally confirmed
existing scalar fields on both `hero` and `gallery` still validate correctly alongside the new
media field.

## Real verification — browser, both tenants (real Playwright MCP session, real login tokens)

**mr-h** (`/mr-h/dashboard/settings`): 0 console errors.
- General Settings: confirmed the "وسائط الصفحة الرئيسية (Hero)" / "معرض الصور" cards are gone —
  General Settings now goes straight from "التصميم والمظهر" to "ساعات العمل".
- Hero section editor panel: `HeroMediaSection` now renders **inside** the panel, first, showing
  the real existing state correctly ("الحالي: فيديو" — the tenant's real uploaded hero video,
  unchanged), followed by the 4 existing scalar fields, unchanged.
- Gallery section editor panel: `GalleryMediaSection` renders inside the panel, first ("لا توجد
  صور بعد" — mr-h's real, correct empty state), followed by the 3 existing scalar fields.
- **Real write-path zero-regression test**: edited Hero's `title_ar` to
  `"صالون مستر إتش [phase4-test]"`, saved, confirmed `✓ تم الحفظ` **and** that the media card above
  it stayed untouched (still "الحالي: فيديو" — proving the media field is correctly excluded from
  the generic save payload); reverted to `"صالون مستر إتش"`, saved again, confirmed success.

**rk** (`/rk/dashboard/settings`): 0 console errors (1 pre-existing, unrelated Framer Motion
warning, same as every prior phase). Real duplication check via `document.body.innerText`
occurrence counts:
- `"وسائط الصفحة الرئيسية"` → 1 occurrence with Hero selected (the panel's own card title only —
  no second copy anywhere).
- Selected Gallery: `"معرض الصور"` → 4 occurrences, all real and expected (public-page footer Quick
  Link, section list row, editor panel heading, media card's own inner title) — **not** duplication
  of the functional control itself.
- `"إضافة صورة"` (the upload button, unique to `GalleryMediaSection`) → exactly **1** occurrence,
  confirming the real component mounted exactly once, correctly relocated for `rk` too, not
  `mr-h`-specific.

## Acceptance criteria, checked explicitly

- ✅ Identical upload/replace/remove/reorder behavior as before — `HeroMediaSection`/
  `GalleryMediaSection`'s own internal code is byte-for-byte unchanged, only their mount location
  moved; both fetched and displayed each tenant's real existing state correctly after relocation.
- ✅ Schema-driven, not hardcoded — a new tenant/section needing a singleton or collection media
  field now gets it from a schema entry (`kind: media` + `pipeline`), not a new component file.
- ✅ No duplicate control anywhere — confirmed via real occurrence-counting on both tenants, not
  assumed from the diff alone.
- ✅ Zero regression on existing scalar save — real save round-trip on `mr-h`'s Hero `title_ar`.
- ✅ Zero `if slug === ...`/`if tenant === ...` — `MediaField` dispatches purely on the schema's
  declared `pipeline`, identical code path for both tenants.

## Result

Phase 4 done. Phase 3 (Repeatable Groups) was already done from TOS-005. Phases 1, 2, and 4 of the
6-phase structure are now complete. Remaining: Phase 5 (Capability Integration — Services/Staff/
Footer orchestration) and Phase 6 (Remove Legacy Settings — `page_type`/`catalog_layout`/`font`),
neither started, per the same one-phase-at-a-time discipline as every phase so far.
