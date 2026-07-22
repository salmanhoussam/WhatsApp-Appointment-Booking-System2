# Sprint 3, Phase 0 — Site Configuration Re-Investigation

Follows: `investigation-protocol.md` (evidence files, Confirmed/Side Findings/Unknowns,
Recommendation ≠ Decision ≠ Execution) and `service-execution-constitution.md` (never execute
before investigating). Salman's explicit mandate: update the Site Configuration Broken
Architecture finding against the *current* code, not what was true several commits ago, before any
Contract or implementation work starts.

All six of Salman's questions answered below with the real file/line evidence, not memory.

---

## Q1 — What fields currently exist in `Client.config`?

Read `prisma/schema.prisma:15-75` directly. Two layers:

**Root columns** ("merged from TenantConfig" per the schema's own comment): `name`, `name_ar`,
`name_en`, `slug`, `phone`, `email`, `primary_color`, `hero_video_url`, `whatsapp_number`,
`instagram_url`, `maps_url`, `currency` (default `"SAR"`), `features` (`Json?`), `unit_types`
(`String[]`), `payment_methods` (`String[]`).

**`config` (`Json?`, default `"{}"`)** — no fixed schema in Prisma; real shape confirmed by reading
actual consumers (below): `config.hero` (legacy — `{title_ar, subtitle_ar, cta_ar}`),
`config.catalog_layout`, `config.font`, `config.content.sections[]` (Sprint 1/2's real Content/
Media Capability data), `config.pageType`/`config.templateKey` (camelCase, read via `getattr`
fallback in `settings.py`).

**`email` is a real Client column with no Contract at all** — not in `SettingsUpdateRequest`
(`settings.py`), not in the `GET /settings` response, not in `_record_to_dict` (public config).
It exists in the DB and is set once at tenant creation, but neither Admin nor Public Contract
touches it today. A real Gap, not previously named this precisely.

## Q2 — What does `settings.py` manage?

Read `app/api/v1/admin/settings.py` in full. `GET /settings` returns 14 fields (all root columns
above except `email`/`phone`/`password_hash`, plus the full `config` blob). `PATCH /settings`
accepts the same 14 via `SettingsUpdateRequest`, camelCases `page_type`→`pageType` and
`template_key`→`templateKey`, wraps `config`/`features` in `Json(...)`, then calls
`_client_repo.update_client(tenant["id"], update_data)` — `_client_repo` is
`admin_client_repo`, a Repository, imported directly at the top of the route file (line 18).
**No Service is called anywhere in this file.** Unchanged from what §19 already recorded.

## Q3 — What goes through `client_service.py`?

Read `app/services/client_service.py` in full, then `grep -rn "client_service\." app/`.
**Zero real callers anywhere in the codebase** — the only other match is a comment in
`content_service.py` referencing it by name. `client_service.py` is not bypassed by an active
competing path so much as **entirely unused**, which is a materially different, more precise
finding than "a Route bypasses an existing Service": there is no live path exercising it at all
today.

A second real problem found while reading it: its own `update_client(client_id, data:
ClientUpdate)` takes the Pydantic `ClientUpdate` schema (`app/schemas/client.py:15-21`), which only
has `name`, `slug`, `phone`, `email`, `isActive`, `password`. **It has no fields for
`primary_color`, `config`, `whatsapp_number`, `hero_video_url`, `currency`, or any other
Site-Configuration field `settings.py` actually manages.** Wiring `settings.py` to call
`client_service.update_client()` as it exists today would not work — the schema would need
extending first. This is new, concrete evidence Phase 2's "fix" is not a one-line import swap.

Also confirmed: `client_service.py` itself calls `prisma_client` directly (line 1, 8, 16, 22) —
zero Repository calls — a second real defect in the same file, unchanged from §19's prior note.

## Q4 — Where does a Route bypass a Service and go straight to a Repository?

`grep -rln "admin_client_repo" app/` → 5 files. Read each:

- **`settings.py`** — direct Route → Repository (Q2, unchanged).
- **`upload.py`** (`app/api/v1/admin/upload.py:99-101`) — a **second, independent** direct write:
  when `context == "page_hero_video"`, the route calls `_client_repo.update_client(tenant["id"],
  {"hero_video_url": public_url})` directly, no Service, immediately after the real file upload
  succeeds. This means `hero_video_url` has **two independent Admin write paths today**:
  `PATCH /settings` (via `SettingsTab.jsx`'s form) and `POST /upload/` with
  `context=page_hero_video` (via `SettingsTab.jsx`'s own separate video-upload button, line 52) —
  both bypass any Service, both happen to land on the same Repository function, reached from two
  entirely separate route handlers with no coordination between them. Not previously documented at
  this level of detail.
- **`auth.py`** — uses `find_client_by_identifier`/read-only lookups for login; not a Site
  Configuration write concern.
- **`content_sections_repo.py`** (Sprint 1/2's own code) — the one *correct* path: reached only via
  `content_service.py`/`media_service.py`, i.e. through a real Service, not directly from a Route.

## Q5 — What does the Public API actually read?

Read `app/api/v1/public/__init__.py:38-46` → `app/services/public_service.py:234-263`
(`get_tenant_config`) → `_record_to_dict` (lines 211-231). Confirmed exact field set returned by
`GET /public/{slug}/config`: `slug`, `name_ar`, `name_en`, `primary_color`, `hero_video_url`,
`whatsapp_number`, `instagram_url`, `maps_url`, `currency`, `features`, `config`, `unit_types`,
`payment_methods`, `service_type`, `active_services`, `page_type`, `template_key`. `email` is
correctly never exposed publicly (expected — but see Q1, it's not exposed *anywhere*, not even
Admin, which is the actual gap).

**A real finding independent of what Sprint 3 is being asked to fix, but real and worth recording
per this project's habit of not silently omitting side findings**: `get_tenant_config` calls
`db.client.find_first(...)`/`db.client.create(...)`/`db.client.update(...)` directly on the raw
`Prisma` client passed into it (`app/services/public_service.py:241,248,252`) — **zero Repository
calls**, a direct violation of `backend/architecture.md` §2's "Zero Prisma calls outside
Repositories," on the *Public* Contract side rather than the Admin side this Sprint is scoped to.
Named here because it was seen while answering Q5, not chased further — out of scope for Site
Configuration specifically.

## Q6 — What does the Dashboard use today?

Read `frontend/src/pages/generic-admin/tabs/SettingsTab.jsx` in full. Confirmed real fields edited
via its form: `name_ar`, `name_en`, `primary_color`, `whatsapp_number`, `hero_video_url`,
`page_type`, `catalog_layout`, `font`, plus three legacy hero-text fields
(`hero_title_ar`/`hero_subtitle_ar`/`hero_cta_ar`, written into `config.hero`). Saved via a single
`adminApi.patch('/settings', payload)` (line 222) that **reconstructs the entire `config` object
client-side**: `{ ...existingConfig, catalog_layout, font, hero: {...} }` (lines 211-220).

**The most significant new finding of this investigation**: those three legacy hero-text fields
(`config.hero.title_ar` etc.) are a **second, completely independent "Hero Title" storage
location**, unrelated to Sprint 1's real Content Capability field
(`config.content.sections[type=hero].data.title_ar`, edited via `/content/hero-title`, rendered by
`HeroSection.jsx` through `DynamicPage.jsx`'s `SECTION_MAP`). Confirmed by reading
`ConfigurableHero.jsx:55` (`const hero = config?.config?.hero ?? {}`) — this legacy field is read
by `ConfigurableHero.jsx`, which `DynamicPage.jsx`'s own docstring already names as the fallback
renderer for `page_type: "showcase"` tenants with `sections: []`. **Two unrelated "Hero Title"
Capabilities exist side-by-side in this codebase today, depending on which rendering path a tenant
uses** — one is Sprint 1's real, Engine-integrated Content Capability; the other is a pre-existing
`SettingsTab.jsx` form field with no relationship to the Editing Engine at all. This was not
knowable from `TENANT_OS_PLAN.md`'s prior text — it only surfaced from actually re-reading
`ConfigurableHero.jsx` and `ConfigurableHero`'s consumers, which this Phase 0 pass did and no
earlier pass had reason to.

**Also confirmed, not previously documented at the field level**: `SettingsTab.jsx`'s
`onFormChange` callback (line 190) feeds `GenericAdminDashboard.jsx`'s existing `previewForm`
state, which the already-real `PREVIEW_UPDATE` bridge (§8) carries exactly 3 of these fields into
the live iframe today: `page_type`→`heroType`, `catalog_layout`→`catalogLayout`,
`primary_color`→`accent` (`GenericAdminDashboard.jsx:256-258`). This is real, working Live Preview
infrastructure for Site-Configuration-ish fields that already predates the Editing Engine —
relevant context for Phase 3, not something to rebuild.

**Logo — confirmed a complete Gap, evidenced precisely**: `grep -in "logo" prisma/schema.prisma`
returns only a comment; no `logo_url` field exists on `Client`. `upload.py`'s `FOLDER_MAP`/
`IMAGE_TYPE_MAP` do have a real `"page_logo"` context (uploads correctly to
`{slug}/pages/home/logo/`), but reading the route's full body (`upload.py:119-133`) confirms
`page_logo` matches none of the `if`/`elif` branches that persist a URL anywhere — it falls through
to `return {"url": public_url, "image_id": None}`, same as `page_hero`/`page_story`/`page_demo`.
The file uploads successfully; the resulting URL is never saved anywhere. No frontend code
references `logo_url`/`logoUrl` anywhere either (confirmed via grep across
`frontend/src/pages/generic-admin/`). Logo is real infrastructure-for-upload with **zero** Contract
on either side.

**Primary Language — confirmed not to exist at all**: `grep -in "language\|locale\|primary_language"
prisma/schema.prisma` returns nothing. Not a partial Gap like Logo — genuinely unbuilt, no schema,
no route, no Dashboard field.

---

## Confirmed Findings

- `settings.py` bypasses any Service, writing directly to `admin_client_repo` — real, unchanged.
- `client_service.py` has zero real callers anywhere in the codebase, and its own `ClientUpdate`
  schema doesn't even cover the fields Site Configuration needs — a materially different, more
  precise finding than §19's original text implied.
- `client_service.py` itself calls `prisma_client` directly, no Repository — real, unchanged.
- A second independent bypass write path exists for `hero_video_url` specifically
  (`upload.py`'s `page_hero_video` branch), separate from `settings.py`'s bypass of the same field.
- Two unrelated "Hero Title" storage locations/Capabilities coexist today depending on rendering
  path (`config.hero.title_ar` via legacy `SettingsTab.jsx`+`ConfigurableHero.jsx`, vs.
  `config.content.sections[type=hero].data.title_ar` via Sprint 1's real Content Capability) — a
  new finding, not previously documented, with direct implications for Site Configuration's
  Contract (must explicitly exclude hero text from its scope) and for `SettingsTab.jsx`'s own
  eventual fate.
- `email` exists as a real Client column with literally no Admin or Public Contract touching it.
- `Logo` has real upload-storage plumbing (`page_logo` context) but zero persistence/read Contract
  anywhere — a complete Gap, evidenced precisely rather than assumed.
- `Primary Language` does not exist in any form — schema, route, or Dashboard field.
- The live-preview `PREVIEW_UPDATE` bridge already carries 3 Site-Configuration-ish fields
  (`page_type`, `catalog_layout`, `primary_color`) today, predating the Editing Engine — real,
  working infrastructure Phase 3 should build on, not replace.

## Side Findings

- `public_service.get_tenant_config` calls `prisma_client` directly with zero Repository calls — a
  Public-Contract-side violation of the same "Zero Prisma calls outside Repositories" rule, out of
  this Sprint's scope but real and worth a future look.

## Unknowns

- Whether any *other* tenant besides ones using the legacy `page_type: "showcase"` +
  `sections: []` fallback actually renders through `ConfigurableHero.jsx` in production today —
  not checked; would require a real DB query across all `Client` rows' `config.content.sections`
  state, out of scope for this Phase 0 pass.
- Whether `SettingsTab.jsx`'s reconstruct-and-PATCH pattern has ever actually clobbered
  `config.content` in practice — reasoned through above as structurally safe today (both
  `existingConfig` and `handleSave` are recomputed fresh each render, so the spread always carries
  the latest `content` key forward), but never empirically tested under a real concurrent-edit
  race; no incident found in logs, none searched for specifically.
