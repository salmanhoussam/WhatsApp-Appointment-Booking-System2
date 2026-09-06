# Reference Conversion — Frankfurt only (pre-Gate 6)

**Date:** 2026-09-06 · **Scope, per Salman:** convert storage references on the Frankfurt copy only.
**Not done, by instruction:** no cutover, no deploy, no Gate 6, no change to `DATABASE_URL` /
`DIRECT_URL` / `SUPABASE_URL`, and **Sydney not touched in any way**.

Old ref `wefjghagwpkotrrdiqyi` → new ref `qjocpqokwmlpzaftltiy`.

---

## 1. Inventory — scanned the WHOLE schema, not the columns we assumed

Every `text` / `varchar` / `json` / `jsonb` / `ARRAY` column in all 39 tables — **222 columns** —
was scanned rather than only the two named in the Contract.

**This mattered.** The Contract recorded 9 rows (`clients.config` 3, `gallery_images.url` 6). The
real figure is **173 rows / 176 occurrences** — the bulk lives in a table nobody had listed:

| table.column | rows | previously known? |
|---|---|---|
| **`catalog_items.image_url`** | **161** | ❌ **NO — 94 % of all references** |
| **`catalog_categories.image_url`** | **3** | ❌ no |
| `gallery_images.url` | 6 | ✅ yes |
| `clients.config` (jsonb) | 3 rows / 6 occurrences | ✅ yes |
| **TOTAL** | **173 rows / 176 occurrences** | |

Had the conversion trusted the Contract's list, **161 product images across every catalog tenant
would still have pointed at Sydney after cutover.**

### All URL host-forms found in media columns

| occurrences | host | classification |
|---|---|---|
| 176 | `wefjghagwpkotrrdiqyi.supabase.co` | **CONVERT** |
| 12 | `gdzthjcvzvhfpsvoxhbm.supabase.co` | ⚠️ **separate decision** — see §4 |
| 6 | `images.unsplash.com` | leave — external stock imagery |
| 1 | `wa.me` | leave — WhatsApp link, not storage |

---

## 2. Classification

### ✅ Must convert → done (Frankfurt only)
The 173 rows above. All are runtime storage URLs the application resolves to render tenant media.

### ⛔ Intentionally unchanged — inside the database
- **6** `images.unsplash.com` URLs — external stock images, correct as they are.
- **1** `wa.me` link — not storage.
- **12** dead third-project URLs — see §4.

### ⛔ Intentionally unchanged — outside the database (not "the Frankfurt copy")
These are **code and config**; changing them is part of cutover + deploy, which is explicitly out of
scope for this step:
- `frontend/src/` — 35 occurrences across ~15 files
- `scripts/` — 11 · `prisma/` — 1
- `.claude/` docs — 7 (documentation, non-runtime)
- `.env` production variables — explicitly forbidden this step

---

## 3. Execution and verification

Applied in a **single transaction**, behind a host guard (must contain `eu-central-1`, must not
contain `ap-southeast-2`).

| check | result |
|---|---|
| rows updated | 161 + 3 + 6 + 3 = **173** ✅ |
| old ref remaining, **whole-schema rescan** | **0** ✅ |
| new ref rows | 161 / 3 / 6 / 3 — exactly as expected ✅ |
| table row counts before → after | 238→238, 95→95, 6→6, 37→37 — **unchanged** ✅ |
| **value-level proof** | all 173 new values **byte-identical to the old value with only the ref substring swapped** ✅ |
| **Sydney rescan** | still **173** rows on the old ref, **0** contaminated with the new ref ✅ |

### Do the converted URLs resolve to real objects?

172 distinct converted URLs were fetched from Frankfurt: **171 returned HTTP 200**.

**The single "failure" was a false positive in the check, proven by a control test.** The value is
`frame_base_url` on tenant `rk` — a **base path**, not an object:
`…/properties/hr/pages/home/story/frames`. It holds **243 frame files**
(`frame_001.webp` …) which the frame-sequence-canvas hero appends to at runtime. Samples verified
HTTP 200 with byte-exact sizes on Frankfurt, and **the same base path returns HTTP 400 on Sydney
too** — identical, pre-existing behaviour that the migration neither caused nor changed.

### Paths / object keys unchanged
Every converted URL's object key was matched against the original Sydney storage manifest. The only
non-match was the base path above, explained. **No object key was altered.**

---

## 4. ⚠️ Needs a separate decision — 12 URLs on a third, dead project

Twelve category images point at **`gdzthjcvzvhfpsvoxhbm.supabase.co`** — neither the old project nor
the new one, in a bucket named `menu` (not `properties`):

| tenant | rows | bucket/path |
|---|---|---|
| `caracas` | 10 | `menu/carakas/…` |
| `arizona` | 2 | `menu/arizona/…` |

**They do not resolve — the host fails DNS entirely.** That project appears to be deleted.

**These images are already broken in production today**, were never part of Sydney's `properties`
bucket, and were therefore never copied. The migration neither caused nor fixes this. **Deliberately
left untouched** — converting them to Frankfurt would be wrong, since the files do not exist there
either. Fixing them means re-uploading the source images, which is a content task for Phase B/C.

---

## 5. Before / after tally

```
OLD references found (Frankfurt DB)   173 rows / 176 occurrences
        ↓
CONVERTED to Frankfurt                173 rows / 176 occurrences   (100 %)
        ↓
INTENTIONALLY UNCHANGED (in DB)        19 rows
                                        ├─  6  unsplash (external)
                                        ├─  1  wa.me (not storage)
                                        └─ 12  dead third project → §4
INTENTIONALLY UNCHANGED (outside DB)   54 occurrences
                                        ├─ 35  frontend/src   (cutover + deploy)
                                        ├─ 11  scripts/
                                        ├─  1  prisma/
                                        └─  7  .claude/ docs
        ↓
UNRESOLVED                              0
```

**Sydney: untouched and fully live.** `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL` unchanged. No
deploy. **Gate 6 remains PAUSED** pending review of this step and a chosen cutover window.

### Still open, carried into Gate 6
- The `Cache-Control: no-cache` defect survived the copy (Supabase ignored the header on upload).
- The 54 code/script references still point at Sydney and must be handled **as part of** cutover,
  or every tenant will render media from the old project after the switch.
