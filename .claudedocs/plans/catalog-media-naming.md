# Catalog media — naming, and why the folder tree lies

**Status: investigation + proposal. Nothing authorised, nothing executed.** Written 2026-10-01 at
Salman's request after he noticed items and categories with no image and remembered writing
`.claudedocs/architecture/Storage_Architecture_Plan.md` — that file is real, it is the origin of
`.claude/rules/storage-tenant.md`, and both are still the standing design.

---

## 1. What is actually true today — measured, 2026-10-01

### The path carries the category, so a moved item's path becomes a lie

```
upload.py:  catalog_item → catalog/{category_id}/{item_id}/<file>
```

Today's menu update moved 18 items between categories. **Six of them now have an image URL whose
folder names a category they no longer belong to**, measured:

```
[ساندويش] FRANCISCO-SANDWICH-01 → …/catalog/2ae64042…/c87faa40…/main.jfif
```

The URL still serves the file — it is stored on the row, not derived — so nothing is broken for a
customer. What is broken is the **browsability** the Storage Architecture Plan was written to
guarantee: opening `properties/caracas/catalog/` in Supabase no longer tells you what is where.

### The filename carries nothing at all

Every catalog file is named `main.jfif` inside two UUID folders. Page media is worse — the hero is
`23d364cb-d952-467d-904a-8df578e8ed37.png`. **This is exactly Salman's complaint**: you cannot tell
what an image is from its name, and you cannot find an item's image without a database lookup.

### Coverage

```
caracas · 107 live items · 72 carry an image · 35 do not
   the 35 are precisely today's new rows: جوانح 3 · برغر لحم 6 · تشكن برغر 4 ·
   ساندويش 7 · وجبات 10 · مازة 2 · مقبلات 3
4 of 12 categories have no usable image, so their circles show a letter
```

### And ten category images point at a dead project

All ten stored category `image_url`s are on `gdzthjcvzvhfpsvoxhbm.supabase.co` — decommissioned.
Every one fails to connect; the live project is `qjocpqokwmlpzaftltiy`. The menu already works
around this (`fallback_image_url`, the category's first item photo), but the stored values are
**unrecoverable** — those files are gone, not moved.

---

## 2. The proposal — the SKU is the name we have been looking for

```
now       properties/{slug}/catalog/{category_id}/{item_id}/main.jfif
proposed  properties/{slug}/catalog/{SKU}.{ext}
          properties/caracas/catalog/CARACAS-BEEF-BURGER-01.jpg
```

Why the SKU and not the product name:

- **It is already unique per tenant**, guaranteed by `@@unique([clientId, sku])` in the database —
  a product name is not (caracas held five duplicate names before the backfill).
- **It is stable across a category move**, which is the defect above. No category in the path.
- **It survives a rename**: editing `name_ar` does not touch the SKU (A-Q3), so the image does not
  need renaming every time the owner fixes a typo.
- **It is already the join key** for a menu update, so the image and the row are found the same way.
- **A retired item's image is visibly retired**: `archive()` stamps `-ARCHIVED-<epoch>`, so a
  retired SKU and its file read as retired in the bucket listing.
- `app/core/sku.py` already guarantees the characters are safe for a path: `A-Z 0-9 -` only.

**Category images get the same treatment**: `properties/{slug}/catalog/_categories/{slug-of-name}.ext`
— categories have no SKU, so this is the one place a name-derived slug is used, and it is the one
place a collision is impossible (category names are unique within a tenant in practice; the plan
should verify that before building).

---

## 3. Migration — copy, verify, then stop

Non-destructive by construction, in the shape the catalog work of 2026-09-30 established:

```
1. COPY each existing file to its new SKU path. Never move, never delete.
2. UPDATE image_url to the new path, one tenant at a time, inside a transaction.
3. VERIFY every new URL returns 200 before committing — a renamed image that 404s is worse
   than an ugly path.
4. The old files STAY. They cost nothing and they are the rollback.
5. Only after a tenant has run visibly correct for a period does deleting the old tree become
   a separate decision, with its own authorisation.
```

`upload.py` changes in one place: `FOLDER_MAP["catalog_item"]` stops interpolating ids and the
handler names the file from the item's SKU. The endpoint keeps its contract; only the destination
changes.

---

## 4. The separate question Salman raised — page images in the database

His words: *"كل شي صور للصفحة لازم تكون بالداتابيز مشان نوفر في بناء الفيت تفتح أسرع"*.

`REPO FACT` `frontend/public` is **2.5 MB**, and the heaviest files are tenant-specific:
`rooms/floor-contact.webp` 0.5 MB, `pool.png` 0.4 MB, `rooms/floor-services.webp` 0.4 MB — smar's
assets, living in the repository and shipping in every build for every tenant.

The instinct is right and the mechanism already exists: `GalleryImage` + `imageType` is exactly the
"logical layer over the physical bucket" the Storage Architecture Plan described, and `page_hero`,
`page_gallery` and now `page_logo` all use it. **But this is a different job from the naming
migration** and should not be bundled with it — it changes what the frontend renders, not where a
file sits.

---

## 5. 🔴 A side finding, unrelated to naming and worth its own decision

Hiding a category **cascades to its items; showing it back does not.**

```
admin_catalog_repo.soft_delete_category   → sets isActive=false on the CATEGORY **and every item**
catalog_service.admin_update_category     → is_active=true patches the CATEGORY ROW ONLY
```

So «إخفاء» then «إظهار» returns an **empty category**. Observed live today: Salman hid كوشينيا from
the dashboard at 15:58 (deliberately, at Mahmoud's request) and its 8 items went with it — correct
behaviour. The asymmetry is the problem: the undo button does not undo. Nothing here proposes a fix;
it is recorded so the decision is made on purpose.

---

## 6. What needs a decision before anything is built

```
① SKU as the filename — yes or a different scheme
② category images: a name-derived slug under _categories/, or upload-time ids
③ the ten dead category images: re-upload, or keep relying on the item-photo fallback
④ the 35 new items have no photos — who takes them, and when
⑤ the hide/show asymmetry — fix, or document as intended
```

**No code is written and no file is moved until ① is answered.**

---

## 7. RATIFIED — 2026-10-01, Salman, five decisions

① and ② are answered, and one thing this plan did not foresee had to be answered with them.

```
①  the destination is the BARE {SKU}.{ext}        — deterministic, re-runnable, reconcilable
②  {ext} = jpg, from the SERVED content-type      — so 71 of 72 .jfif become .jpg
③  storage_service.py is NOT touched by step 4    — see below, this is the new one
④  the old files stay — they are the rollback
⑤  dry run first, and it must PROVE determinism and repeatability before any production write
```

**Why ③ exists.** §2 above proposed the bare `{SKU}.{ext}`, and the code that shipped the same day
(`fb39636`, `storage_service.py:216-218`) produces `{SKU}-{6 hex}.{ext}` — deliberately, because
this bucket uploads with `upsert:"false"` and a year-long `cache-control`, so a bare name **fails
the second time an owner replaces a dish photo**. §2 did not know that constraint when it was
written. So the plan and the shipped code disagreed on the one thing step 4 is about, and the
disagreement is real on both sides.

Salman's split, verbatim in effect: the migration takes the bare deterministic form **now**, and
whether a REPLACEMENT upload should also become deterministic (an `upsert` on the catalog path) is
**a separate behaviour decision, later, on its own evidence**. The rule it protects: *a migration
does not get to refactor the upload service on its way past.*

**Dry run executed, gate 🟢** — `scripts/plan_catalog_media_migration.py` (no `--execute` exists),
evidence in `.claudedocs/work/catalog-media-migration/2026-10-01/`. 72 selected with controls both
directions, 72/72 sources at 200, 72 destinations free, 0 collisions, determinism proven with a
negative control that the test can fail.

**Execution is NOT authorised by this entry.** Decisions ③–⑤ of §6 (the dead category images, the
35 missing photos, the hide/show asymmetry) remain open and untouched.
