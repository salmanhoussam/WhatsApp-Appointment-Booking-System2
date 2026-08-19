# TOS-005 Phase B — Canonical Section Schema — Evidence (2026-08-19)

Follows: `.claudedocs/implementation/TOS-005/CONTRACT.md` Phase B. Real browser (Playwright MCP,
direct in-session), real backend restart, real raw API calls (bypassing the Dashboard entirely),
real credentials for both real tenants (`mr-h` via `admin@ali-barber.local`, `rk` via
`rkbarber@dev.invalid`, both reset via the sanctioned `scripts/reset_hr_admin_password.py`).

## Code changes

- New `app/schemas/section_schemas.py` — `SECTION_SCHEMAS` (the single source of truth), plus
  `validate_fields`/`get_section_schema`. Covers all 14 real section types `SECTION_MAP`
  (`DynamicPage.jsx`) renders — a real scope finding made while executing, not assumed: RK's live
  config uses `story_experience`/`video_story`/`testimonials`, none of which were in
  `ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md`'s original 9-section inventory. Those 5 (plus
  `categories_grid`/`offers`) get `label_ar` only, `fields: {}` — deliberately preserving their
  exact current behavior rather than inventing new editable capability beyond this phase's scope.
- `app/api/v1/admin/content.py` — new `GET /sections/schema`; `update_section_fields` now calls
  `validate_fields` before writing, returns 422 on an undeclared field or a wrong-`kind` value.
- `frontend/src/pages/generic-admin/tabs/SettingsTab.jsx` — `SECTION_FIELDS`/`SECTION_LABELS`
  (hardcoded objects) removed entirely. `SectionSettingsArea` fetches `GET /content/sections/schema`
  once alongside `GET /content/sections`; `SectionRow` reads its field config from the fetched
  schema (`kind`→`type`, `label_ar`→`label`, `options[].label_ar`). Added `boolean` (checkbox)
  rendering, which the old hardcoded fields never needed.

## Verification

**Server-side validation, independent of the Dashboard** (raw `curl`, no browser):
- `PATCH .../hero/fields {"not_a_real_field":"x"}` → `422`.
- `PATCH .../featured_items/fields {"limit":"not-a-number"}` → `422`,
  `"Field 'limit' must be a number"`.
- `PATCH .../hero/fields {"title_ar":"..."}` (valid) → `200`, unchanged real behavior.

**Zero visible regression, Mister H (`mr-h`, 9 real sections)** — real browser, Settings tab:
all 9 rows render with the exact same Arabic labels and "تعديل" buttons as before (Hero, الخدمات,
ليش تختارنا, فريقنا, معرض الصور, قصتنا, ساعات العمل, الموقع, دعوة الحجز); Hero's expanded form shows
the same 3 original fields with real current values (`title_ar` = "صالون مستر إتش"), plus one new,
harmless, empty field (`framed_video_caption_ar`, not previously exposed) — additive, not a visible
behavior change to the current homepage (Mister H doesn't use framed-video mode). 0 console errors.

**Zero visible regression, RK (`rk`, 10 real sections, including the 5 not in the original
Contract)** — real browser, Settings tab: all 10 rows render with correct Arabic labels
(`تجربة القصة`, `فيديو القصة`, `آراء العملاء` included); critically, those 3 plus `categories_grid`/
`offers`'s label-only schema entries produce **zero** "تعديل" button, matching their exact
pre-Phase-B behavior (label shown, no edit surface, since `fields: {}`). 0 console errors.

## Result

Single source of truth confirmed structural, not conventional — the Dashboard has no independent
schema copy in its own source anymore. Server-side rejection proven independent of the Dashboard.
Zero visible regression on both real tenants, including 5 real RK section types outside the
original Contract's scope. Per the Contract's phase-gate: **Phase C (repeatable-group backend)
does not start automatically** — awaiting explicit go-ahead, same as Phase A → B.
