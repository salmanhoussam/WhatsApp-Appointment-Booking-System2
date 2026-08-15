# Ali 403 — `GET /admin/catalog/categories` Gate Fix — Evidence

Proposal: `.claudedocs/architecture/ALZABT_ALI_403_CATEGORIES_GATE_PROPOSAL.md` (approved 2026-08-16).
Classification: **Production blocker** — real Barber-vertical path, not an Ali/demo-only issue, per
Salman's explicit framing.

## What changed

`app/api/v1/admin/catalog.py` — one route (`GET /categories`, `list_categories()`) now depends on a
new, file-local `_require_catalog_or_reservations()` instead of `require_service("catalog")`. Every
other route in the file (`POST/PATCH/DELETE /categories`, `POST /seed-from-template`, all 4
`/items` routes) is byte-for-byte unchanged, still `catalog`-only.

## Live evidence — direct authenticated API calls, real backend, real DB rows

| Check | Tenant | Call | Result |
|---|---|---|---|
| Real password reset (sanctioned script, `scripts/reset_hr_admin_password.py --slug ali`) | Ali | — | `[OK] Password reset for admin@ali-barber.local` |
| Real login | Ali | `POST /auth/users/login` | `200`, real JWT, `role=TENANT_ADMIN` |
| **The fix itself** | Ali | `GET /admin/catalog/categories?include_inactive=true` | **`200`** — real row returned: `{"name_ar":"الخدمات", "name_en":"Services", ...}`. Re-confirmed 2× more, identical result each time (not a one-off) |
| Write still blocked | Ali | `POST /admin/catalog/categories` | `403` (unchanged) |
| Write still blocked | Ali | `DELETE /admin/catalog/categories/{fake-id}` | `403` — not `404`, confirms the gate itself still rejects, not just a missing-row coincidence |
| `/items` still blocked | Ali | `GET /admin/catalog/items` | `403` (unchanged) — confirms the fix did not spill into the Items routes |
| RK unaffected | RK | `GET /admin/catalog/categories?include_inactive=true` | `200` — same 2 real categories as always (خدمات + منتجات العناية), unchanged, still passing via `catalog` |

**Before the fix**: this exact call for Ali returned `403 Forbidden` — the original, confirmed bug
(2026-08-14 finding, re-confirmed at the top of this arc). **After**: `200`, real data, write paths
untouched.

## UI-level attempt — real, but degraded by a concurrent, unrelated incident

Logged into Ali's real dashboard (`/ali/dashboard/staff`) via Playwright to see the "add service"
form's category dropdown populate visually. The page loaded under **active, ongoing Supabase pooler
instability** (documented separately, still open) — `/ali/config`, `/admin/settings`, and
`/admin/catalog-services` all intermittently 500/503'd during this same window, degrading the page's
overall load (wrong nav shape from a failed config fetch, "جاري التحميل..." stalls). **None of these
failing endpoints are the one this fix touches** — confirmed by checking each failing URL individually,
`/admin/catalog/categories` was never among them in this session's network log.

Per Salman's own explicit instruction not to conflate this fix with the Supabase incident: **relying
on the direct API-level evidence above as the live verification of record** — real HTTP requests
against the real running backend with a real JWT and real DB data, not code-only inference, and not
contaminated by the unrelated failing endpoints. A full clean UI screenshot can be captured once the
concurrent Supabase incident clears, as a bonus confirmation, but is not required to consider this
fix verified — the exact mechanism the bug and the fix both live in (the HTTP request/response for
`GET /admin/catalog/categories`) was tested directly, repeatedly, with consistent results.

## No tenant data modified

Only Ali's admin password was reset (via the pre-existing, purpose-built `reset_hr_admin_password.py`
script, explicitly written for this exact verification need) — no `CatalogCategory`, `Barber`,
`CatalogService`, or any other tenant-content row was created, changed, or deleted, for Ali or RK.

## Result

Fix confirmed working exactly as scoped in the proposal: the one intended route now succeeds for
Ali; every write route and `/items` remain exactly as restrictive as before; RK is provably
unaffected.
