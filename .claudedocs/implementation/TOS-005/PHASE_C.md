# TOS-005 Phase C — Repeatable-Group Backend Engine — Evidence (2026-08-19)

Follows: `.claudedocs/implementation/TOS-005/CONTRACT.md` Phase C. Real backend restart, real
authenticated API calls (curl, no mock), real public config reads, real browser sanity checks on
both tenants.

## Code changes

- `app/schemas/section_schemas.py` — new `get_repeatable_field_schema`/`validate_repeatable_item`,
  reusing the existing `_validate_value` helper (no duplicated validation logic).
- `app/repositories/content_sections_repo.py` — new `list_repeatable_items`/`add_repeatable_item`/
  `update_repeatable_item`/`delete_repeatable_item`/`reorder_repeatable_items`, same read-merge-
  write shape as the existing scalar-field functions, applied to one `data[field]` array.
- `app/services/content_service.py` — thin wrappers, no new logic.
- `app/api/v1/admin/content.py` — 5 new routes (`GET/POST .../repeatable/{field}`,
  `PATCH/DELETE .../repeatable/{field}/{index}`, `PATCH .../repeatable/{field}/reorder`) — one
  generic family for every repeatable field on every section, `{field}` and item shape validated
  against the schema before any write. `/reorder` registered before the `/{index}` route to avoid
  path-matching ambiguity.

## Acceptance Test — all 3 real repeatable fields, real evidence

**`why_choose_us.items` (object-shaped, Mister H)** — added a real item (curl `POST`), confirmed via
`GET /public/mr-h/config` it landed in the real public config (5 items, correct content); edited
it (`PATCH .../4`); confirmed a request with an undeclared sub-field → `422`
(`"Field 'not_a_real_field' is not declared..."`); confirmed a request with an `icon_key` outside
the declared `options` → `422` (`"Field 'icon_key' must be one of [...]"`); deleted it — back to
the original real 4 items.

**`location.tags` (bare-string repeatable, Mister H)** — started empty (real); added two tags;
confirmed an object payload where a string is required → `422`
(`"Field 'tags' must be a string"`); reordered them (`PATCH .../reorder {"ordered_indices":[1,0]}`)
→ confirmed via public config the order actually swapped; confirmed a non-permutation reorder
request → `400`; deleted both — back to empty.

**`story.stats` (object-shaped, Mister H)** — added a real stat; confirmed via public config;
deleted it — back to the original real 3 stats.

**Field-gate confirmed** — `GET .../hero/repeatable/title_ar` (a real scalar field, not
repeatable) → `404`; `GET .../hero/repeatable/not_a_field` (undeclared) → `404`. `{field}` is
never trusted as arbitrary input.

## Real tenant data hygiene

Every add/edit/reorder made during verification was undone by the end of the same sequence (via
the same generic routes, not a manual DB fix) — confirmed by re-reading each field's real state
after cleanup and finding it identical to before the test started.

## Side finding, not a regression

One real, transient Supabase pooler `DataError` (`Can't reach database server at
aws-1-ap-southeast-2.pooler.supabase.com:6543`) surfaced as a single `500` on
`GET /public/mr-h/config` mid-verification — confirmed via the real backend log to be the same
already-documented recurring infra flakiness this project has hit repeatedly all session, not
caused by this phase's changes: the very next identical request succeeded (`200`), and the page
rendered correctly (real hero title, 0 console errors) on retry.

## RK reconfirmed unaffected

Real page load, `http://localhost:5173/rk/home` — 0 console errors, no behavior change. RK's data
was never touched by this phase's testing (all real API calls scoped to `client_slug=mr-h`).

## Result

All 3 real repeatable fields are fully backend-editable (add/edit/delete/reorder) through the one
generic route family, with real schema-backed validation enforced independent of any client. Zero
section-specific repeatable route exists anywhere. Per the Contract's phase-gate: **Phase D
(repeatable-group Dashboard UI) does not start automatically** — awaiting explicit go-ahead.
