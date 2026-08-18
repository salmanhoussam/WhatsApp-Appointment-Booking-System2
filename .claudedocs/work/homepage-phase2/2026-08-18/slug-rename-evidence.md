# Slug Rename — `mister-h` → `mr-h` — Evidence

Requested by Salman mid-Phase-2.3-approval: `.` isn't URL-safe, so the routing slug needed to be
`mr-h` rather than a literal "Mr.H". Brand name (`Client.name_en = "Salon, Mister H"`) unchanged —
only the routing identifier.

## Pre-checks

- Grepped `app/` and `frontend/src/` for any hardcoded `mister-h` reference — **zero found**.
  Mister H is a generic/DB-driven tenant (renders via `DynamicPage.jsx`, not a custom
  `pages/{slug}/` folder or a `frontend/src/router/tenants/` registry entry), so a slug change is a
  pure DB update, not a code change.
- Confirmed no existing `Client` already has `slug = 'mr-h'` (no rename conflict).

## Change

Direct `Client.update(where={id}, data={slug: 'mr-h'})` against `id =
fd53e0e1-684c-4a14-a41e-31dfe5d39f45` — same one-off DB-script method as the earlier `ali` →
`mister-h` rename this session.

## Live verification

| Check | Result |
|---|---|
| `GET /api/v1/public/mr-h/config` | Resolves — `slug: "mr-h"`, all 8 sections present |
| `GET /api/v1/public/mister-h/config` (old slug) | `404`, clean failure, no crash |
| `GET /api/v1/public/rk/config` | Unaffected — `slug: "rk"` unchanged |
| Real browser, `localhost:5173/mr-h/home` | Full render (`root` innerHTML 18545 chars), `s_hero` present, staff heading text present, 0 console errors |

## Known consequence, not a bug

Any admin JWT issued before the rename carries `slug: "mister-h"` in its payload.
`get_current_tenant()` (`app/core/tenant.py:214-236`) resolves tenant by the JWT's own `slug`
claim, not by re-deriving it from `client_id` — so a stale token will `404` on tenant-resolving
routes until the admin logs in again (a fresh login re-issues the JWT with the current slug). Same
behavior as the project's earlier `hr` → `rk` rename. The cached test token from Phase 2.1's
verification (`/tmp/mh_token.txt`) is now stale as a result — any further Phase 2 testing needs a
fresh `/auth/users/login` call.

## Data impact

One real field (`Client.slug`) on Mister H only. No other tenant touched, confirmed live (RK
checked). No Supabase storage objects moved — existing `GalleryImage.url` values are absolute URLs
under `properties/mister-h/...` and remain valid; any *future* upload will build its path from the
new slug (`properties/mr-h/...`), the same slug-folder-mismatch pattern already established and
accepted for `smar`/`beitsmar`.
