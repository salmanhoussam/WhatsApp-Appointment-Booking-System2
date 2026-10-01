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
