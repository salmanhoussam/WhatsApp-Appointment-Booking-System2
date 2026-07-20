# Root Cause Report — beit-al-fakhar `/store` missing products

**Trigger:** Salman rejected the earlier investigation for chasing the wrong question — the
Supabase 500 was already documented, but it doesn't by itself prove the catalog pipeline is
correct. Ordered a full pipeline audit: source of truth → backend → catalog generation →
frontend, no stopping at the first failure. Raw evidence: `step1-source-of-truth.txt`,
`step2-backend-evidence.txt`, `step3-catalog-generation.txt`, `step4-frontend-chain.txt`
(this folder).

## Source of Truth

beit-al-fakhar has **no** `scripts/data/{slug}/` files and **no** `Client.config` JSON — it never
goes through the generic tenant-seeder/page_content pipeline at all. It's a custom-coded tenant
whose catalog lives directly in the `CatalogCategory`/`CatalogItem` tables, written once by three
scripts already read this session (`onboard_anas.py`, `import_beit_al_fakhar_plates.py`,
`import_beit_al_fakhar_bowls_vases.py`). Real counts, queried directly: **25 Plates + 9 Bowls &
Vases + 0 Mugs + 0 Decorative Figurines = 34 real products across 4 categories.** Mugs/Figurines
being empty is a known, already-logged gap (no photos ever supplied), not part of this bug.

## Backend Evidence

Every earlier backend check this session (including my own) tested `/api/v1/public/catalog/*` —
the **wrong endpoint family** for this tenant (see Root Cause below). Re-tested against the real
one: `GET /api/v1/public/store/categories?client_slug=beit-al-fakhar` → 4 categories, exact DB
match. `GET /api/v1/public/store/products?client_slug=beit-al-fakhar&category_id=...` → 25 items
for Plates, 9 for Bowls & Vases, both exact matches with real Supabase image URLs. One real, minor
side-issue: `price: 0.0` is returned for items with `price: null` in the DB (cosmetic — items are
present, just priceless).

## Catalog Generation Evidence

No `getCatalog.py` or any catalog-generator module exists anywhere in this repository (grepped the
whole tree; the only match was an unrelated route handler function named `get_catalog_item`).
Nothing regenerates beit-al-fakhar's catalog automatically — the three one-off scripts above are
the entire mechanism, already run, already confirmed to match the DB.

## Frontend Evidence

Traced the real chain: Tenant Config → `deriveModuleKey()` → Catalog Hook → API → transform →
render (full detail in `step4-frontend-chain.txt`). The pivotal fact: beit-al-fakhar's
`active_services` includes both `"store"` and `"catalog"`, but `deriveModuleKey()` checks
`'restaurant'`, then `'store'`, then `'catalog'` — **`moduleKey` resolves to `'store'`**, which
routes every catalog fetch through `/api/v1/public/store/*`, not `/api/v1/public/catalog/*`. Every
link in this chain was verified with real captured values and matched exactly, whenever the config
fetch itself succeeds.

## Root Cause

**There is no broken pipeline, no stale catalog, no missing data, and no getCatalog.py to rerun.**
The 34 real products exist, are correctly seeded, and are correctly served by the actual endpoint
the frontend calls. The only real, confirmed failure mode in this entire chain is the already-
documented one: `GET /.../config` intermittently 500s under concurrent load because Supabase's
pooled connection endpoint is intermittently unreachable
(`.claudedocs/work/store-investigation/2026-07-21/uvicorn-traceback.txt`). When that single
request fails, `moduleKey` never gets set, and the categories/products fetch never even starts —
which is what produces the empty "لا توجد عناصر في هذا القسم" page. This investigation's real
contribution is closing the gap the earlier one left open: proving the *data and pipeline* are
fine via the endpoint actually in use, not the one I'd been testing by habit.

## Minimal Fix

None required beyond what's already shipped: the React Query `retry` bump (1→2, commit `86523dd`)
already mitigates the one real failure mode found. No catalog rebuild, no re-run of any import
script, no frontend rewrite — there is nothing wrong with any of those to fix.

## Why This Happened

Two separate things looked like the same bug and weren't: (1) a real but external, intermittent
backend connectivity issue, and (2) an assumption — never actually tested — that the generic
`/catalog/*` endpoints were the ones in play for this tenant, when `deriveModuleKey()`'s priority
order actually routes it through `/store/*`. The first investigation correctly diagnosed (1) but
never checked (2), so it couldn't rule out a real pipeline defect — it just hadn't found one
because it was looking at the wrong endpoint the whole time.

## How to Prevent This Again

- When investigating a tenant's catalog, check `deriveModuleKey()`'s actual output for that
  tenant's `active_services` first — don't assume which endpoint family (`/catalog/*`,
  `/store/*`, `/restaurant/menu/*`) applies. This is now written down here so the next
  investigation doesn't silently repeat it.
- Per `.claude/rules/investigation-protocol.md`, this report itself is the artifact that makes
  that mistake visible and correctable — it wouldn't have surfaced from a chat reply alone.
