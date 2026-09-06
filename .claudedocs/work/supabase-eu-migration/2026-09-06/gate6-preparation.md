# Gate 6 — PREPARATION ONLY (cutover NOT executed)

**Date:** 2026-09-06 · **Status: Gate 6 remains PAUSED.**
Executed: the code half of the cutover. **Not executed:** any environment change, deploy, restart,
or cutover. Sydney untouched and still serving production.

---

## 1. Code conversion — done and verified

The 25 **category-A runtime** references across **13 files**, ref substring only.

| verification | result |
|---|---|
| old refs remaining in the 13 files | **0** ✅ |
| new refs now present | **25** ✅ |
| diff shape | **25 removed / 25 added lines** ✅ |
| **character-level proof** | every added line is **byte-identical to the removed line with only the ref swapped** ✅ |
| the 10 category-E dead files | **untouched** ✅ |
| `app/`, `prisma/`, `scripts/`, `.env` | **untouched** ✅ |
| `npx vite build` | **clean** ✅ |
| sampled converted URLs fetched from Frankfurt | **8 / 8 → HTTP 200**, byte-exact ✅ |

Paths, buckets, filenames and object keys are unchanged — only the 20-character project ref moved.
No refactor, no behaviour change.

### Files changed (13)

```
frontend/src/pages/caracas/spatial/CaracasSpecialReel.jsx      7
frontend/src/pages/arizona/spatial/ArizonaStoryReel.jsx        4
frontend/src/templates/ShowcaseTemplate.jsx                    2
frontend/src/pages/smar/gallery/SmarGalleryPage.jsx            2
frontend/src/pages/smar/showcase/SmarLiquidRing.jsx            2
frontend/src/pages/smar/spatial/SpatialPropertyDetails.jsx     1
frontend/src/pages/olivello/sections/OlivelloStory.jsx         1
frontend/src/pages/olivello/canvas/OlivelloScene3D.jsx         1
frontend/src/pages/olivello/sections/TreeSection.jsx           1
frontend/src/pages/beit-al-fakhar/sections/GallerySection.jsx  1
frontend/src/pages/beit-al-fakhar/sections/AboutSection.jsx    1
frontend/src/pages/beit-al-fakhar/sections/hero/walkthroughAssets.js  1
frontend/src/design-system/atoms/SEO.jsx                       1
                                                        TOTAL 25
```

---

## 2. Environment changes — PREPARED, NOT APPLIED

Production still points at Sydney; verified after the code change:
`.env` shows 2 × `ap-southeast-2` and 3 × the old ref. **Nothing was switched.**

**No secret is duplicated into this document.** The Frankfurt values already exist, verified, in
`.env` as `EU_*` variables. The cutover is a copy of those into the production names:

| production variable | source | notes |
|---|---|---|
| `DATABASE_URL` | value of `EU_DATABASE_URL` | Frankfurt pooler **6543**, `?pgbouncer=true` **retained** (proven load-bearing) |
| `DIRECT_URL` | value of `EU_DIRECT_URL` | Frankfurt **5432**, session mode |
| `SUPABASE_URL` | value of `EU_SUPABASE_URL` | `https://qjocpqokwmlpzaftltiy.supabase.co` |
| `SUPABASE_KEY` | value of `EU_SUPABASE_SERVICE_KEY` | contains no project ref, so it does not appear in any grep — **easy to forget, do not** |

Apply in **both** places: local `.env` and the Railway service variables.

**Rollback:** restore the four previous values. Sydney is untouched and current, so rollback is
complete for anything written before cutover — and lossy only for writes that land on Frankfurt
afterwards, which is why the window matters.

---

## 3. 🔐 Security finding — Sydney credential exposure

**Recorded as required.** While generating the reference inventory on 2026-09-06, a masking regex
in a shell command failed to cover two lines, and the **Sydney database password was printed in
cleartext** into the working transcript.

- **Affected:** the Sydney project's Postgres password (the retiring project).
- **Not affected:** the Frankfurt password — it was never printed unmasked.
- **Why it still matters:** Sydney is the designated **rollback target** and stays live. A rollback
  path with a leaked credential is not a safe rollback path.

**Required: rotate the Sydney database credential before the rollback infrastructure is considered
secure.** Note that rotating it invalidates the current `DATABASE_URL` / `DIRECT_URL` values, so if
rotation happens before cutover, those must be refreshed to keep rollback viable.

---

## 4. Explicitly NOT done, per instruction

- ❌ No environment variable changed · no deploy · no restart · no cutover
- ❌ Sydney not touched, not deleted
- ❌ `Cache-Control` defect not fixed
- ❌ The 12 broken third-project images not fixed
- ❌ Dead files not cleaned up
- ❌ `scripts/data/hr/page_content.json` not fixed *(still a real risk: re-running the seeder after
  cutover would write Sydney URLs back into the cleaned Frankfurt database)*
- ❌ Historical evidence not modified
- ❌ `.claude/rules/storage-tenant.md` not updated *(due after cutover, so future agent work stops
  generating Sydney URLs)*

---

## 5. State at the end of preparation

```
Gate 0-5              ✅ CLOSED and verified
DB references         ✅ 173/173 converted on Frankfurt
Storage               ✅ 729 objects / 199,818,368 bytes
Code (category A)     ✅ 25/25 converted, build clean, URLs resolve
Environment (cat. B)  ⏸ PREPARED, NOT APPLIED
Gate 6                ⏸ PAUSED — awaiting diff review and a chosen quiet window
```

**Split-brain warning stands:** the code change now in the working tree and the environment change
must ship **together**. With the code deployed but the env still on Sydney, five tenants would read
media from Frankfurt while the database answers from Sydney. Both halves land in one cutover, or
neither.
