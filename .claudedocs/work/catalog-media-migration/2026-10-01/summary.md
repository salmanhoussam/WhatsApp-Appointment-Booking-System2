# Catalog media migration — Step 4 dry run

**Status: DRY RUN COMPLETE. Nothing copied, nothing written, nothing deployed. The production
gate is CLOSED and this step has no authorisation to execute.**

Script: `scripts/plan_catalog_media_migration.py` — read-only, no `--execute` flag exists.
Raw output: `dry-run-output.txt` (248 lines, the full 72-row plan).

---

## The contract — Salman's five decisions, 2026-10-01

```
① the destination is the BARE {SKU}.{ext} — deterministic, re-runnable, reconcilable
② {ext} = jpg, derived from the content-type the server serves, through the same map
   storage_service._ext_for_content_type uses
③ storage_service.py is NOT touched by this step — a deterministic REPLACEMENT upload
   (upsert) is a separate behaviour decision, deliberately deferred
④ the old files stay; they are the rollback
⑤ dry run first, and it must PROVE determinism and repeatability before any production write
```

The reason ① needed deciding at all: the plan's §2 proposed the bare form, and the code that
shipped the same day (`fb39636`, `storage_service.py:216-218`) produces `{SKU}-{6 hex}.{ext}` —
deliberately, because the bucket uploads with `upsert:"false"` and a year-long `cache-control`, so
a bare name fails the second time an owner replaces a photo. Both are correct for their own job;
③ is what keeps them from being resolved by accident inside a migration.

---

## Confirmed Findings

**The 72 reproduce exactly, and the selection proves itself.**

```
caracas holds 133 catalog_items rows
  −35  live, no image on the row
  −26  archived (is_active = false) — 25 of them carry an image
  = 72 SELECTED   ·  72 distinct SKUs  ·  72 distinct source keys  ·  module_key=restaurant for all
```

Controls, both directions:

| control | expected | measured |
|---|---|---|
| POSITIVE · `ZINGER-SANDWICH-01` | in | in |
| NEGATIVE · `BROASTED-CHICKEN-4PCS-01-ARCHIVED-1790868877`, archived WITH an image | out | out |
| NEGATIVE · `BUFFALO-WINGS-9PCS-01`, live without an image | out | out |
| NEGATIVE · 67 live image-carrying rows on other tenants | all out | 0 selected |

**Every source is alive.** 72/72 → HTTP 200, and all 72 are served `image/jpeg`.

**The extension changes on 71 of 72.** 71 files are stored `.jfif`; every one is served
`image/jpeg`; the contract's own map turns `image/jpeg` into `jpg`. So decision ② means 71
destinations carry a different extension from their source. The source bytes are unchanged and the
source file is untouched, so this costs nothing and is reversible.

**The destination is deterministic.** Computed twice independently → byte-identical plan; zero
destinations carry a random suffix. The test is controlled: the shape `storage_service.py` produces
today is computed twice in the same run and **differs**, proving the determinism test can fail.

**All 72 destinations are free, and freedom is said twice.** Absent from the folder enumeration AND
a settled HTTP 400. Zero collisions among the 72 destinations.

---

## 🔴 The defect this dry run found in itself

The first run reported `[400, 429]` on the destination probes, and the classifier counted a **429**
as `destination free`.

```
the branch as first written:   not in the listing  AND  status != 200   →  FREE
what a 429 actually means:     the probe was throttled and told us nothing
```

A throttled probe would have authorised a copy over a file nobody had looked at. This is the family
recorded on 2026-10-01 — *a check that fails for the wrong reason has measured nothing* — in its
most dangerous form: **the wrong reason happened to fall on the side the caller wanted.**

Closed three ways:

1. `ABSENT = 400` is now the **only** status that corroborates absence. Supabase answers 400, not
   404, for an object that is not there — measured, and the negative control at `[7]` is what
   caught it.
2. `classify_destination()` is a named predicate returning PRESENT / FREE / INCONCLUSIVE, so it can
   be exercised instead of trusted. FREE requires absence from the listing **and** a settled 400.
3. The predicate is controlled in the run itself, on five inputs including the two that must never
   say FREE — a 429 and a timeout. The run aborts if any control disagrees.

`head()` now retries 429/5xx with a backoff, and destination probes run at concurrency 4 instead of
10 — the throttling was self-inflicted.

---

## Side Findings

**One orphan file in the bucket.** `caracas/catalog/CARACAS-BEEF-BURGER-01-5539a2.png` exists in
storage while its row (`CARACAS-BEEF-BURGER-01`, live) carries `image_url = NULL`. Traced, not
guessed: the dashboard path is complete — `CatalogTab.jsx:292` patches `image_url` back after the
upload — so this is the previous session's own `curl` SKU smoke test, which bypassed that second
step. **A test artefact, not a defect.** An earlier draft of this report named it as an eighth
unreachable-capability instance; that claim was withdrawn after reading the frontend.

**39 live image-carrying rows across the platform have no SKU** and therefore cannot be named under
this contract at all: `beit-al-fakhar` 34, `footlab` 3, `rk` 2. Three of footlab's are
`images.unsplash.com` URLs that are not in the bucket — there is nothing to copy. Out of scope for
caracas; it is the gate any second tenant has to pass first.

**`arizona` holds 28 live image-carrying rows, all with SKUs** — the one tenant that could run this
same migration unchanged. Not authorised, not planned here.

---

## Unknowns

- **No row has been copied, so no destination has been verified at 200.** The whole of step `[2]`
  of the execution plan is unexercised by construction. The dry run proves the destinations are
  free and the sources are alive; it cannot prove a copy succeeds.
- **The frontend has not been re-verified against a migrated URL.** Nothing is migrated yet.
- `catalog_categories.image_url` is untouched by this step. All 10 caracas category images still
  point at the decommissioned `gdzthjcvzvhfpsvoxhbm` project and those files are gone, not moved —
  decision ③ of the plan's §6, still open.

---

## What execution would need, beyond a word

```
BEFORE   133 items · 72 selected · 72 to copy · 1 pre-existing file under catalog/
1 COPY   source (verified 200) → destination, content-type image/jpeg. Never move, never
         overwrite — an occupied destination stops the run.
2 VERIFY HEAD every new URL. Only 200 passes. 400/429/timeout retries 3×, then STOPS the run.
3 WRITE  one transaction, caracas only:
            UPDATE catalog_items SET image_url=$new, updated_at=now()
             WHERE id=$id AND client_id=$caracas AND image_url=$old
         the image_url=$old guard makes it idempotent and makes a concurrent dashboard edit
         lose rather than be silently overwritten; rowcount 0 on any statement → ROLLBACK
4 AFTER  re-read all 72: every image_url matches the template, every one 200, platform-wide
         StoreOrderItem count unchanged
ROLLBACK one UPDATE back to $old per row. No file operation at all — the old files are untouched.
```

---

# EXECUTED — 2026-10-01, authorised by Salman ("البوابة 🟢 OPEN. نفّذ ٤")

Script: `scripts/apply_catalog_media_migration.py` — requires `caracas --execute`; refuses any
other tenant and refuses without the flag (both refusals exercised before the run).
Raw output: `execute-output.txt`.

`destination()`, `classify_destination()`, `head()`, `EXT_BY_CONTENT_TYPE` and `ABSENT` are
**imported** from the planner, not re-implemented. A planner and an executor that each compute the
destination their own way are two matchers that agree until the day they do not.

## The order was the safety

```
copy all 72  →  verify ALL 72 new URLs at 200  →  THEN one transaction
```

Nothing reached the database until every new URL was proven alive. A failure before that point
would have left the database untouched, with copied-but-unreferenced files as the only residue.

## Before / after

| metric | before | after | |
|---|---:|---:|---|
| `store_order_items` **platform-wide** | 18 | 18 | ✅ |
| `catalog_items` for caracas | 133 | 133 | ✅ |
| rows at their new SKU url | 0 | 72 | ✅ |
| live urls matching `{SKU}.jpg` | — | 72 | |
| live urls still in the old `id/id/main` shape | — | 0 | ✅ |
| **old files still served at 200 (the rollback)** | 72 | 72 | ✅ |

The order-line invariant is counted **platform-wide on purpose**: caracas holds zero order lines,
so a tenant-scoped check would read 0 → 0 and could never fail. It was also re-counted *inside*
the transaction, before `COMMIT`, with a rollback on any change.

## Gates that actually fired

```
[2] sources      72/72 settled 200 · all image/jpeg
[3] destinations 72/72 FREE — absent from the folder enumeration AND a settled 400, both required
[4] copy         72 copied · 0 failed · upsert="false" throughout, so an overwrite was impossible
[5] gate         72/72 new URLs at 200, BEFORE any DB write
                 ✅ negative control: a key deliberately never copied → 400, so the gate can fail
[6] transaction  rowcount == 1 on all 72 statements · guard `AND image_url = $old`
[7] after        re-read from the database, not inferred from the write
```

## Runtime verification — past the database

`investigation-protocol.md`'s Runtime Before Assumption: a committed transaction is one link, not
the feature. Verified against the **Public Contract the menu actually reads**, on production:

```
GET /api/v1/public/restaurant/menu?client_slug=caracas
   11 categories · 107 items · 72 carrying an image
   72 on the new {SKU}.jpg shape · 0 still on the old id/id shape
   72/72 served images return 200
   سجق → caracas/catalog/SUJUK-SANDWICH-01.jpg
```

## Two self-inflicted measurement failures, both recorded

1. **A parallel HEAD pass reported one `URLError` out of 72.** Under this run's own rule that is
   not a pass. Re-verified **serially with 4 retries → 72/72 at 200.** The error was my own
   concurrency, exactly the same class as the 429 the dry run caught: *the instrument failed, and
   the instrument's failure is not a finding about the thing measured.*
2. **A bare `python-urllib` user-agent gets `403` from the production API.** The first verification
   attempt failed this way and it says nothing about the API — a browser UA returns 200. Recorded
   because reading that 403 as an API fault would have been a false alarm about live production.

## Still open after this step

```
🟡 step 5 — the hide/show asymmetry (plan §5). NOT started. A blanket reactivate would resurrect
   13 deliberately-retired items including the 3 فول rows.
🟡 the old files are untouched by design (decision ④). Deleting them is a separate authorisation
   and should wait until caracas has run visibly correct for a period.
🟡 the 10 caracas CATEGORY images still point at the decommissioned project. Untouched by this
   step; the item-photo fallback carries the UI.
🟡 35 live caracas items still have no photo at all.
🔴 39 live image-carrying rows platform-wide have NO SKU (beit-al-fakhar 34, footlab 3, rk 2) and
   cannot migrate until a SKU backfill runs for them — Salman's own note. `arizona` (28 rows, all
   with SKUs) is the one tenant that could run this script unchanged, and is NOT authorised.
```

---

# arizona + step 5 + the cascade repair — 2026-10-01, same day

## arizona — and a premise of mine that was wrong

The authorisation rested on "arizona is clean and 100% identical". True about SKUs (28/28 carry
one), **not true about formats**: arizona serves one `image/webp` and one `image/png`. Running the
dry run instead of trusting my own earlier report found two real defects in the executor:

1. **It hardcoded `content-type: image/jpeg` on every upload.** Harmless on caracas — all 72
   sources really are jpeg and the gate measured it — and on arizona it would have served a PNG as
   a JPEG: a file whose name, extension and header all disagree with its bytes. It now carries the
   **source's** content-type, and the gate verifies the content-type **survived the copy**, not
   just that the status is 200. A status-only gate passes a mislabelled file silently.
2. **The guard refused any extension that was not literally `jpg`.** But decision ② says the
   extension comes from the **served content-type** through the map — `jpg` was the *measured
   outcome* for caracas, never a constant. The rule gives arizona `.webp` and `.png`: the contract
   honoured, not widened. The guard that stays is the one that matters — a content-type **outside
   the map** has no name and is never guessed.

Also hardened: the authorised tenants are an explicit dated allowlist in the source, and the
**expected row count is part of the authorisation**, so a tenant presenting a different number of
rows than the plan measured stops the run. It fired on the first try (28 ≠ 72).

| arizona | before | after | |
|---|---:|---:|---|
| `store_order_items` platform-wide | 18 | 18 | ✅ |
| `catalog_items` | 28 | 28 | ✅ |
| rows at their new SKU url | 0 | 28 | ✅ |
| old shape left | — | 0 | ✅ |
| old files still served | 28 | 28 | ✅ |

Live public menu: **caracas 72/72 · arizona 28/28**, every image 200, and arizona's webp and png
still served as webp and png. **100 images migrated in total.**

## Step 5 — hiding a section no longer swallows its dishes

The cascade in `soft_delete_category` **bought nothing it claimed to**: `list_menu_categories` and
`find_menu_category_with_items` already filter `isActive` on the CATEGORY, so a hidden category and
everything under it was already gone from the public menu whether or not its items were touched.
The cascade could not make anything more hidden; it only destroyed the ability to come back.

`find_catalog_items_by_ids` gains `category.isActive` in the same change, because it is the direct
consequence: while the cascade existed, a hidden category's items were unorderable **by accident**,
through a side effect nobody chose. Prevention now sits at the read, deliberately.

The new guard **parses** the code rather than searching it, and proves it must: the docstring
**names the removed call on purpose**, so a `grep` for it matches the sentence and reports the
cascade alive. CH-1d shows the trap is real, CH-1e shows the AST walk is not caught by it, CH-1f is
a positive control on a function that genuinely still cascades.
`test_category_hide_symmetry.py` PASS=11 FAIL=0 · `test_catalog_soft_delete.py` PASS=52 FAIL=0.

## The كوشينيا repair — 8 rows, and not one more

Removing the cascade stops the recurrence; it does not undo what happened. The two groups are
separated by a **real stamp**, not a date range: a deliberate retirement rewrites the SKU to
`-ARCHIVED-<epoch>`, the cascade never touched the SKU.

| | before | after | |
|---|---:|---:|---|
| `store_order_items` platform-wide | 18 | 18 | ✅ |
| caracas live items | 107 | 115 | ✅ +8 |
| **deliberately-retired (stamped) rows** | **17** | **17** | ✅ not one resurrected |
| live items inside كوشينيا | 0 | 8 | ✅ |
| the category itself | hidden | **hidden** | ✅ unchanged |

**The repair is invisible to customers, which is the point.** The public menu reads 11 categories
and 107 items before and after; كوشينيا is still hidden exactly as Mahmoud asked, no كوشينيا dish
leaked, no فول row resurrected. The 8 now sit live underneath a hidden category, so the owner's
"show" button finally works.

### 🔴 And a fake control of my own, caught before it shipped

The first version of the repair's control printed `selected = 0` from
`… if False else 0` — **a control that always passes.** It was corrected to count the real overlap
between the stamped rows and the selection, and then given a control of its own: the same predicate
run against a selection deliberately seeded with one stamped row must return **> 0**. It does.

Third member of the family this file has now recorded in one day — the 429 read as "free", the
status-only gate that would have passed a mislabelled PNG, and a control hardcoded to pass.

---

# The SKU backfill — the platform is now uniform

Salman ran `scripts/backfill_catalog_skus.py beit-al-fakhar footlab rk smar barberlab-test
--execute` (the `--execute` was refused to me by the harness permission layer, `[Modify Shared
Resources]`; the preceding `name_en` write was not). **54 rows written.** Verified afterwards by an
independent sealed read, not taken from the run's own report:

| | |
|---|---:|
| **live rows anywhere on the platform without a SKU** | **0** (was 54) |
| keys that are not normalised — asserted through `app/core/sku.py` itself, not a regex | **0** of 215 |
| opaque `ITEM-xx` keys | **0** |
| duplicates **within** a tenant (the real uniqueness scope, `@@unique([clientId, sku])`) | **0**, checked per tenant |
| `store_order_items` platform-wide | 18 → **18** |
| **live image-carrying rows still ineligible for the media migration** | **0** (was 39) |

Two rows remain without a key and both are correct: an inactive `مشط خشب` duplicate on
`barberlab-test` and an inactive row on `mr-h`. The backfill skips inactive rows **by design** — a
retired item's key belongs to `sku_tool.archive()`, and giving it a clean key would occupy one the
next menu wants (A-Q6).

## No new script was needed, and that is worth saying

`scripts/backfill_catalog_skus.py` has existed since 2026-09-30 with dry-run as its default, full
idempotence, and an explicit refusal to touch a row that already has a key or a row that is
inactive. It had simply never been **run** for these tenants. A pleasing inversion of the day's
other theme: here the capability had an entry point all along — nobody had walked through it.

## The one decision it forced

Four `barberlab-test` rows had no `name_en`, and `app/core/sku.py` refuses to romanise Arabic on
purpose, so they would have become `ITEM-01…ITEM-04`. **A-Q5 makes that permanent**: adding
`name_en` later does not change an assigned key. Salman chose option أ — write the English names
first — which is the same sequence caracas used when `name_en` was added for all 65 rows rather
than accept `ITEM-01…ITEM-35`.

It mattered more than "test tenant" suggests: `مشط خشب` is the row Lia's duplicate-detection
scenarios (L-11…L-15) are written around, and it is now `WOODEN-COMB-01` rather than `ITEM-02`.

## Where the catalog file now stands

```
🟢 every live catalog item on the platform carries a stable, tenant-unique, normalised key
🟢 100 images renamed after the dish they picture (caracas 72 · arizona 28)
🟢 delete is deactivate · hide is reversible · re-seeding archives instead of erasing
🟡 beit-al-fakhar (34) · footlab (3) · rk (2) are now ELIGIBLE for the media migration —
   eligible is not authorised; each needs its own dated line in the executor's AUTHORISED map
🟡 the old image files stay until a separate decision retires them
🟡 10 dead caracas category images · 35 caracas items with no photo
🔴 order notification still unbuilt ⇒ StoreOrder stays 0, so revenue and best-sellers cannot fill
```

---

# ① ② ③ executed — and a gap my own sequencing created

`beit-al-fakhar` 34 · `rk` 2, within one gate on Salman's explicit word. `footlab` deliberately
out: its three live images are `images.unsplash.com` URLs that were never in our bucket.

## The authorisation now names rows, not a count

Salman's requirement: the map must name *"الصفوف/المصادر المحددة بالضبط، وليس wildcard"*. A tenant
plus a count is not that — **34 stays 34 if one row appears and another disappears**, so a row that
showed up after the plan could ride along unseen. `AUTHORISED` now holds the exact SKU set and the
run refuses unless the selection equals it **in both directions**, printing every extra with `+`
and every missing with `−`. The comparison carries its own control: the same check against the set
plus one invented SKU must report exactly 1 extra. Both runs printed it.

`caracas` and `arizona` are recorded `None`/EXECUTED, which makes re-running them through this tool
**impossible** rather than merely pointless.

## ③ is a named exception, not a loosened guard

The rule refusing any image outside the tenant's own folder is untouched. `HISTORICAL_PREFIXES`
adds exactly one entry, `{"rk": ("hr/",)}`, with the measurement beside it: **there is no `clients`
row with slug `hr` at all**, and the repository's own record says `hr` was renamed to `rk`. The
guard was right to flag it and the reason is benign; migrating it brings the file under the correct
prefix and fixes a rename artefact for free.

| | before | after | |
|---|---:|---:|---|
| beit-al-fakhar — rows at their new url | 0 | 34 | ✅ |
| rk — rows at their new url | 0 | 2 | ✅ |
| `store_order_items` platform-wide | 18 | 18 | ✅ both runs |
| old files still served | 36 | 36 | ✅ |

rk exercised the arizona fix for real: its two rows are one **webp** and one **jpeg**, both copied
under their source's content-type and both verified to have kept it. A status-only gate would have
passed a mislabelled file silently.

## 🔴 The gap: 8 caracas rows are still on the old shape, and I caused it

```
المصدر: الكوشينيا الثمانية
  they were INACTIVE when caracas migrated, so `is_active` correctly excluded them
  the cascade repair reactivated them AFTERWARDS
  ⇒ they came back live carrying their original id/id/main URLs
```

**Neither step is defective. The ORDER was.** Migrating on `is_active` and then changing
`is_active` in a later step leaves exactly this residue, and nothing in either script could have
noticed — each was correct about the state it saw.

It is not currently visible to anyone: the category is still hidden, and the old URLs still serve
200, so even un-hiding it would render correctly. It is a **consistency gap, not a breakage** — but
it means "every live image is named after its dish" is false by 8 until it is closed, and
`caracas` is recorded EXECUTED so the executor will refuse to run it. Closing it needs a new dated
authorisation line naming those 8 SKUs.

## Platform-wide, measured after both runs

```
live image-carrying rows        147
  on the new {SKU}.{ext} shape  136   ✅  every one served at 200
                                      133 jpeg · 2 webp · 1 png, each matching its source
  external (footlab, unsplash)    3   ⚪  nothing to migrate, correctly
  still on the old id/id shape    8   🔴  the كوشينيا rows above
live rows without a SKU           0
store_order_items platform-wide  18   unchanged all day
```

---

# ④ executed — the migration file is CLOSED

The eight كوشينيا rows, on Salman's explicit word. They were never a failure: INACTIVE when caracas
migrated, so `is_active` excluded them correctly, then reactivated by the cascade repair — **newly
eligible, not failed**.

## The design problem ④ forced, and how it was answered

caracas now holds **80 eligible rows**: 72 already migrated plus these 8. The existing check
`selected == authorised` would have failed with 72 "extras", and the easy fix — dropping the
other-direction check — would have opened exactly the door Salman closed when he required
row-level authorisation.

So the check now admits an extra row for **one reason, proven per row**:

```
a row outside the authorisation is admissible ONLY if it is already at its destination
a row outside the authorisation that is NOT already migrated STOPS the run
    — because that is a row nobody authorised and nobody has handled
```

Each of the 72 was fetched and compared against the destination its own SKU and served
content-type imply. The run printed `✅ every row outside the authorisation is already at its
destination`, and the missing-check kept its own control: the same comparison against the set plus
one invented SKU reported exactly 1 missing.

`AUTHORISED` is now keyed by the **authorisation's name**, with the tenant inside the entry. That
is what let ④ reopen eight rows without reopening caracas: `"caracas"` stays `None`/EXECUTED and
the executor still refuses it outright (verified by running it).

| ④ | before | after | |
|---|---:|---:|---|
| `store_order_items` platform-wide | 18 | 18 | ✅ |
| `catalog_items` for caracas | 133 | 133 | ✅ |
| rows at their new url | 0 | 8 | ✅ |
| live urls still on the old shape | — | 0 | ✅ |
| old files still served | 8 | 8 | ✅ |

## The platform, measured after everything

```
live image-carrying rows        147
  on the new {SKU}.{ext} shape  144   ✅  arizona 28 · beit-al-fakhar 34 · caracas 80 · rk 2
  external (footlab, unsplash)    3   ⚪  never ours, nothing to migrate
  still on the old id/id shape    0   ✅
images in OUR bucket            144/144 → 100%
live rows without a SKU           0
two rows sharing one storage key  0
store_order_items platform-wide  18   unchanged across every write today
```

Customer-facing, on production: **caracas 11 categories / 107 items / 72 images, all 200, all new
shape**; **arizona 2 / 28 / 28, all 200, all new shape**. كوشينيا still hidden as Mahmoud asked, no
فول row resurrected.

## What closing this file did and did not do

```
🟢 every live catalog image in our bucket is named after the thing it pictures
🟢 every live catalog item on the platform carries a stable, normalised, tenant-unique key
🟢 delete is deactivate · hide is reversible · re-seeding archives instead of erasing
🟢 every old file is still served, so every step today rolls back with one UPDATE per row
   and zero file operations
🟡 retiring the old tree is a separate decision, deliberately not taken
🟡 10 dead caracas category images · 35 caracas items with no photo
🔴 order notification remains unbuilt — StoreOrder stays 0, so the owner's Orders, Revenue and
   Best-Sellers panels cannot fill. FROZEN by agreement until this file closed. It is now closed.
```
