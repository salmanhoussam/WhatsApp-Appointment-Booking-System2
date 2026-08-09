# Staff/Store IA Separation — Commit 1 Evidence

Follows: `.claudedocs/implementation/STAFF_STORE_IA_SEPARATION_CONTRACT.md`. Commit 1: Staff gains
an internal الموظفون/الخدمات toggle; الخدمات is real `CatalogService` CRUD.

## Changes

- `app/api/v1/admin/upload.py` — added `catalog_service` context (`catalog-services/{service_id}`
  folder, plain-field pattern matching `barber`'s own context from Phase 3.7A — falls through
  unchanged, no `GalleryImage` relation).
- `frontend/src/hooks/useImageUpload.js` — added `catalog_service` to `VALID_CONTEXTS` +
  `service_id` form field.
- `frontend/src/pages/generic-admin/tabs/StaffTab.jsx` — internal `subView` toggle
  (`'employees' | 'services'`). الخدمات: full `CatalogService` CRUD (create/edit, category dropdown
  filtered to `module_key='catalog'`, price/currency/duration, image upload, reorder ↑/↓, hide/show)
  reusing this file's own existing local `Modal`/`Field`. الموظفون: existing content, unchanged.

## Real bug found via required Browser Verification, fixed, whole pass restarted

**First pass**: a newly created service did not appear in the existing "الخدمات التي يقدمها"
assignment checklist without a full page reload. **Root cause, confirmed by code, not guessed**:
the checklist's `services` list was fetched once in a mount-only `useEffect(..., [])` — since
`StaffTab` never unmounts when switching `subView`, that list never refreshed after a mutation in
the new الخدمات sub-view.

**Fix**: extracted the fetch into a reusable `loadServices()` callback, called it after
`saveService()` and `toggleServiceActive()` (not `moveService()` — reordering doesn't change what
the checklist needs to show). Per the Browser Verification Restart Rule, the entire verification
pass was re-run on the fixed code, not just the failed step.

## Real Verification (restarted pass, post-fix)

- الموظفون sub-view: unchanged — حسين (09:00–21:00), جعفر (09:00–18:00), plus 3 pre-existing hidden
  test entries, all rendering exactly as before.
- الخدمات sub-view: all 6 real services render correctly (شعر/شعر ودقن/كرياتين/دقن/تمشيط أو
  تسريح/حنة أو صبغة), plus one leftover test row from the first (bug-finding) pass — expected, not
  a new issue.
- Created a new real service ("خدمة تحقق نهائي", 12 USD, 18 min) → appeared in the grid immediately.
- **Critical check, confirmed**: switched to الموظفون (no reload), opened حسين's edit modal — the
  new service **is** a selectable option in "الخدمات التي يقدمها", confirmed via
  `browser_snapshot`.
- **Network evidence**, chronological, confirms the fix mechanically: `POST /catalog-services/` →
  `201` → immediately followed by two fresh `GET /catalog-services/` calls (one
  `include_inactive=true` for the management grid, one plain for the checklist) — both `200`. No
  stale cache, no reload needed.
- Console: 0 errors during the actual Staff/Services workflow. 3 errors logged, all from a single
  transient `500` on the very first login attempt (`POST /auth/users/login`, `/auth/login`) —
  resolved immediately on retry, matches this session's known recurring Supabase-pooler flakiness,
  unrelated to this change.

## Regression

الموظفون content (list, edit modal, working hours, image upload) confirmed byte-identical in
behavior across both verification passes.
