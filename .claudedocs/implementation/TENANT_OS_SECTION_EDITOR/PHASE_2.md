# Tenant OS Section Editor — Phase 2 (Schema-Driven Field Editor) — Evidence (2026-08-20)

Follows `ALZABT_CMS_SECTION_EDITOR_IMPLEMENTATION_PLAN.md` §8/§11 Phase 2. Scope narrowed by
Salman's explicit decision (2026-08-20, before execution): **schema kind vocabulary + backend
validation for `media`/`group` only** — no live wiring of `hero.bg_image_url`/`gallery.images`
into `SECTION_SCHEMAS`, no relocation/removal of `HeroMediaSection`/`GalleryMediaSection`, no
change to any existing media flow. That live wiring (and removing the old General Settings
placement so nothing is ever duplicated) stays Phase 4's job, per §11.

## Why scoped this way — real, confirmed risk avoided

Read the real code before implementing (`SettingsTab.jsx:161-361`): `HeroMediaSection`/
`GalleryMediaSection` are self-contained components (their own state, their own dedicated
endpoints — `/media/hero-image`, `/media/gallery-images`), rendered today inside **General
Settings** (`:895,898`), not the Section Editor. §8.1's own text and §11's Phase 4 both describe
"the Dashboard's generic `MediaField` renderer mounts the correct existing upload flow... replacing
the current hardcoded placement" as the same piece of work — meaning doing it under Phase 2 would
create a real window (Phase 2 → Phase 4) where the same field is editable from **two places** on
the live `mr-h`/`rk` dashboards. Raised to Salman directly (AskUserQuestion) rather than guessed;
he chose the narrower scope explicitly.

## Code changes

**`app/schemas/section_schemas.py`**:
- Module docstring's `kind` vocabulary extended: `group` (single nested object, `fields` sub-shape)
  and `media` (discovery-only, rejected on write) documented, with the narrowed-scope decision
  recorded inline.
- `_validate_value` gets two new branches:
  - `kind == "group"`: value must be a `dict`; each key must be declared in the field's own
    `fields` sub-schema; each sub-value recurses through `_validate_value` again (so a group's
    sub-fields get identical type-checking to any top-level or repeatable-item field).
  - `kind == "media"`: unconditionally returns an error — a media-kind field can never be set via
    `update_section_fields`, only through its own dedicated media endpoint. This is what actually
    enforces the reconciliation (schema declares it for discovery; a second write path never
    exists), not just documentation.
- No entry added to `SECTION_SCHEMAS` itself — `hero`/`gallery` dicts byte-identical to before.

**`frontend/src/pages/generic-admin/tabs/SettingsTab.jsx`**:
- `FieldInput` gets `kind === 'media'` (renders a disabled "حقل وسائط — يُدار من قسم مخصص" label)
  and `kind === 'group'` (recursively renders each declared sub-field via `FieldInput` itself, new
  `fields` prop) branches. Neither is reachable by any live schema field yet — `SectionEditorPanel`
  was not touched, so nothing routes a real field into these branches until a future phase declares
  one.

## Real verification — backend

Direct execution of the real `_validate_value`/`validate_fields` functions (`venv/bin/python3`, not
guessed):

```
OK: no live media wiring in SECTION_SCHEMAS (hero, gallery unchanged)
OK: media kind rejected on write -> "Field 'bg_image_url' is a media field and cannot be set via
    section fields -- it is managed by its own dedicated media endpoint"
OK: group kind accepts a valid nested object
OK: group kind rejects non-object -> "Field 'cta' must be an object with fields: ['label', 'url']"
OK: group kind rejects undeclared sub-field -> "Field 'unknown_key' is not declared for group
    field 'cta'"
OK: group kind recurses type-checking into sub-fields -> "Field 'cta.url' must be a string"
OK: None (clear) allowed for both media and group, consistent with existing kinds
OK: existing scalar validation (hero.title_ar, cta.variant) unchanged
```

## Real verification — API, both tenants

`GET /content/sections/schema` called with real JWTs obtained via a real
`POST /api/v1/auth/users/login` for both `mr-h` (`admin@ali-barber.local`) and `rk`
(`rkbarber@dev.invalid`):
- `diff` of both responses: **identical** (schema is global, not tenant-scoped — expected).
- `grep -c '"kind": "media"'` / `'"kind": "group"'` / `'bg_image_url'` on the response: **0, 0, 0**
  — confirms no live schema entry declares either new kind, matching the narrowed scope exactly.

## Real verification — browser, both tenants (real Playwright MCP session, real login tokens)

**mr-h** (`/mr-h/dashboard/settings`): 0 console errors. Hero section editor panel shows exactly
its 4 existing fields (`title_ar`, `subtitle_ar`, `cta_text_ar`, `framed_video_caption_ar`) — no
"حقل وسائط" text, no duplicate media control anywhere in the Section Editor.
`HeroMediaSection`/`GalleryMediaSection` still render exactly once each, only in General Settings,
unchanged. **Real write-path zero-regression test**: edited `title_ar` to
`"صالون مستر إتش [phase2-test]"`, clicked حفظ, confirmed `✓ تم الحفظ` and the persisted value in the
DOM; reverted to the original `"صالون مستر إتش"`, saved again, confirmed the same success state —
proves `update_section_fields`/`validate_fields` still works correctly for existing scalar kinds
after this change.

**rk** (`/rk/dashboard/settings`): 0 console errors (1 pre-existing, unrelated Framer Motion
positioning warning, confirmed unrelated — no positioning code touched by this diff).
`document.body.innerText.includes('حقل وسائط')` → `false` — confirms the new branches are correctly
unreachable here too, not `mr-h`-specific.

## Acceptance criteria, checked explicitly

- ✅ Existing scalar/repeatable fields render and save identically — real save round-trip tested on
  `mr-h`, zero errors on `rk`.
- ✅ `media`/`group` kinds exist in the real validation vocabulary, independently unit-verified.
- ✅ No live schema entry declares either new kind — confirmed via a real API diff on both tenants.
- ✅ No duplicate media control appeared anywhere — confirmed via real browser evidence, both
  tenants.
- ✅ Zero `if slug === ...`/`if tenant === ...` — the two files touched contain no tenant branching
  (schema is global; `FieldInput` is a pure function of `kind`).

## Result

Phase 2 done, exactly as narrowed. Ready to stop here per Salman's explicit instruction — Phase 3
(Repeatable Groups) is already done from TOS-005; Phase 4 (Media Editor, the real
`hero.bg_image_url`/`gallery.images` wiring + General Settings cleanup) is the next real
deliverable, not started.
