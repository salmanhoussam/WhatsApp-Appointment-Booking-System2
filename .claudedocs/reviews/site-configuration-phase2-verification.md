# Site Configuration Capability — Sprint 3, Phase 2 Verification

**Date:** 2026-07-29. Executes the plan Salman approved with corrections (Decision 0: create
`site_configuration_service.py`, delete `client_service.py`, don't revive it; Decision 1: delete
the Hero Video pipeline, don't migrate it).

## What Changed

- **New `app/services/site_configuration_service.py`** — `get_client`/`update_settings`, the
  latter owning the camelCase mapping + Prisma `Json()` wrapping that used to live inline in
  `settings.py`'s route (real business logic moved out of the Route per `rules/backend/
  api-rules.md` §1). Both delegate to `admin_client_repo`, never `prisma_client` directly.
- **Deleted `app/services/client_service.py`** — confirmed zero real callers before deletion (only
  a historical comment in `content_service.py` referenced it, left as-is — accurate history, not a
  real dependency).
- **`settings.py`** — both `GET`/`PATCH /settings` now go through `site_configuration_service`
  instead of calling `admin_client_repo` directly. Removed the now-unused `_client_repo` import.
- **Hero Video pipeline deleted entirely** (Decision 1 — delete, not migrate, since
  `TenantHero.jsx` had zero real importers):
  - Backend: `upload.py`'s `page_hero_video` FOLDER_MAP/IMAGE_TYPE_MAP entries and its write
    branch; `settings.py`'s `hero_video_url` field (request + response); `public_service.py`'s
    `_SMAR_STYLING` default value and `_record_to_dict`'s response field.
  - Frontend: `TenantHero.jsx` and its barrel export (`design-system/organisms/index.js`);
    `VideoUploadField` component and its one usage in `generic-admin/tabs/SettingsTab.jsx`; the
    equivalent field + form control in **smar's own bespoke** `pages/smar/admin/components/
    SettingsTab.jsx` (found live during verification — a second, separate consumer of the same
    `/settings` endpoint, not caught by the plan's original file list); `page_hero_video` from
    `useImageUpload.js`'s `VALID_CONTEXTS`; the `hero_video_url: null` default placeholders in
    `TenantConfigContext.jsx` and `useTenantConfig.js`.
  - **Deliberately not touched**: `Client.hero_video_url`'s actual DB column. Dropping a live
    schema column is a real migration this project's migration-staging-discipline caution (no
    staging/snapshot process exists yet) says not to do casually — the column is now a fully inert
    leftover with zero code anywhere reading or writing it, which is a safe, complete stopping
    point for this Phase.

## Evidence (per Evidence Interrogation — file/line + real command output, not "Verified")

**Zero remaining direct write-path bypass** — re-ran after all edits:
```
grep -rn "admin_client_repo\.update_client\|_client_repo\.update_client" app/ --include=*.py
  app/services/site_configuration_service.py:38   (Site Configuration's own field)
  app/repositories/content_sections_repo.py:62     (Content's own `config` sub-key — a different
                                                     Capability's own data, not a bypass of Site
                                                     Configuration's write path)
```
No third caller exists. `app/api/v1/admin/auth.py`'s 3 `admin_client_repo` calls are all reads
(`find_client_by_identifier`, `find_client_by_slug`) for login — unrelated to any write path.

**Zero remaining `client_service`/Hero Video references**:
```
grep -rln "hero_video_url|page_hero_video|TenantHero\b" app frontend/src --include=*.py --include=*.js --include=*.jsx
  (no output — fully clean)
grep -rn "\bclient_service\b" app/ --include=*.py | grep -v "client_services|site_configuration_service"
  app/services/content_service.py:8   (the one intentional historical comment, left as-is)
```

**Backend starts clean on the new code** — killed the running dev server (PID 28352, was serving
stale pre-edit code with no `--reload`), restarted it, confirmed `Application startup complete`
with zero import errors — proves `site_configuration_service.py` and every edited file are valid
Python, not just `py_compile`-clean in isolation.

**Real end-to-end PATCH, via a real login, not a hand-crafted token**:
1. `python -m scripts.reset_hr_admin_password --password verify_phase2_2026` → `[OK] Password
   reset for rkbarber@dev.invalid (hr / 7ef5c8c9-...)`.
2. `POST /api/v1/auth/users/login` with those real credentials → real JWT, `role: TENANT_ADMIN`,
   `slug: hr`.
3. `GET /api/v1/admin/settings` (before) → 200, real `whatsapp_number: "96176985477"`, full real
   `config.content.sections` payload captured for the isolation check below.
4. `PATCH /api/v1/admin/settings` with `{"whatsapp_number":"96176985999"}` → `{"success": true,
   "updated_fields": ["whatsapp_number"]}`.
5. **Direct DB read, bypassing the HTTP layer entirely** (`prisma_client.client.find_unique`) →
   `whatsapp_number: 96176985999` — proves the write through the new Service genuinely persisted,
   not just a 200 response.
6. Reverted via the same PATCH path with the original value → direct DB read confirms
   `whatsapp_number: 96176985477` — RK Barber's real data left exactly as found.
7. `hero_video_url` DB column confirmed still present (no migration run) and `None` for `hr`.

**Capability Isolation (Salman's explicit addition)** — after the `whatsapp_number` edit, real
`GET /settings` re-fetch confirmed byte-identical to the pre-edit snapshot for:
- `config.content.sections[hero].data.title_ar` — unchanged (`"RK Barber Shop"`)
- `config.content.sections[hero].data.bg_image_url` — unchanged (same real Supabase video URL)
- `config.content.sections[story].data.body_ar` — unchanged (same real Arabic text)

No cross-capability contamination — editing a Site Configuration field did not touch Content's or
Media's data.

**Frontend**: no syntax errors introduced. `npx eslint` on all 6 touched frontend files found only
one pre-existing, unrelated issue (`motion` unused-var in `smar/admin/components/SettingsTab.jsx`)
— confirmed pre-existing by stashing the edit and re-linting the original file, same error present
before any change.

## Side Findings

- **`SettingsUpdateRequest` was already comprehensive** — contrary to the original Capability
  doc's framing (which implied `ClientUpdate`'s narrow schema needed extending), `settings.py`'s
  actual live schema already covered every Site-Config field via its explicit fields plus a
  catch-all `config` dict. No schema extension was actually needed — only the missing Service
  layer underneath it.
- **`client_service.py`'s old `create_client` was not ported** — it was dead code with no real
  caller, and Client creation is registration's concern, not Site Configuration's Contract. Ported
  only `get_client`/`update_settings`, the two responsibilities this Capability actually owns.
- **Second Hero Video consumer found only during verification, not planning**: smar's own bespoke
  `pages/smar/admin/components/SettingsTab.jsx` had its own live `hero_video_url` field/form
  control, calling the same `/settings` endpoint. Not in the original plan's file list — found by
  grepping the whole repo rather than trusting the plan's enumerated scope, and fixed in the same
  pass rather than left as a silently-broken form control on a real, live tenant's admin dashboard.

## Unknowns

- Whether `Client.hero_video_url`'s DB column should eventually be dropped via a real migration —
  deliberately deferred, not decided here (see "Deliberately not touched" above).
- Phase 3 (Editing Engine integration for Brand/Contact/Currency/Theme) is not started — this
  verification covers Phase 2 only.

## Related

- `.claudedocs/architecture/capabilities/site-configuration.md` — the Capability Contract this
  phase implements against.
- `.claude/rules/investigation-protocol.md`'s Evidence Interrogation section — the standard this
  verification is held to.
