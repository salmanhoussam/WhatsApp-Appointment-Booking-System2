# 35 stock photos for caracas — reviewed, then written

**Executed 2026-10-02 on Salman's word.** Every live caracas item now carries an image; so does
every visible category, through the existing item-photo fallback.

## The decision came before the write, deliberately

Salman's own correction to my proposed order: *"لا أرفع الـ35 صورة مباشرة — الأفضل: ورقة معاينة
→ موافقة → الرفع"*. Two review rounds, as artifacts, with three candidates per dish:

```
round 1   35 items × 3 candidates   → 21 chosen · 14 rejected
round 2   14 items × 3 NEW candidates (none repeated — measured, 0 overlap) → 7 chosen
then      the 7 meals got a dedicated search on Salman's instruction:
          "7awel hol el ota3 l 7 ota3 + ykono djej b2aleb box"  → a CHICKEN_BOX family
```

The decision itself lives in `scripts/data/caracas/stock-photos.json`, keyed by **SKU** — so
renaming a dish can never silently re-point its photo at a different one.

## Licence, enforced rather than assumed

Salman's constraint: free-licence images only, and avoid photos carrying people, logos or
third-party artwork. Rejected during review, each for a named reason:

```
🔴 a KFC bucket with the brand visible
🔴 a gloved hand with tongs · a person holding a tray · a street stall with people
🔴 and one photo Salman picked that turned out to be Unsplash+ (plus.unsplash.com) — NOT the
   free licence. He asked for a free equivalent and chose one from six alternatives.
```

The script checks this mechanically too: a `premium_photo` or `plus.` id aborts the run.

One other correction worth keeping: a photo he picked for escalope was described by Unsplash as
*"LikeMeat Like Nuggets — Soya based"*, i.e. vegan soya rather than chicken. Raised, and he chose
a real breaded chicken cutlet instead.

## The file becomes ours

Downloaded from Unsplash once, re-uploaded to `properties/caracas/catalog/{SKU}.jpg` — the same
place the 2026-10-01 migration put the other 144. The row stores **our** URL, so nothing on the
menu depends on a third party staying up. `.jpg` not `.png`: these are photographs, where PNG is
several times larger for no visible gain.

**Every row is marked `metadata.photo_source = "stock"`** — Salman's framing is that these stand
in until Mahmoud photographs his real dishes, and without a mark there would later be no way to
tell a borrowed photo from his own.

## Counted

| | before | after | |
|---|---:|---:|---|
| `store_order_items` platform-wide | 18 | 18 | ✅ |
| caracas live items **with** an image | 80 | 115 | ✅ +35 |
| caracas live items with **no** image | 35 | **0** | ✅ |
| rows marked `photo_source=stock` | 0 | 35 | ✅ |

Gates: licence check · selection equal to the decision file in both directions, with a control
that the comparison can fail · 0 destination collisions · 0 destinations occupied · 35 uploaded
with `upsert=false` · **all 35 verified at 200 and `image/jpeg` BEFORE any DB write**, with a
negative control on a key never uploaded (400) · `rowcount == 1` on all 35 under an
`image_url IS NULL` guard · order lines re-counted inside the transaction.

Customer-facing, measured after: **11 categories · 107 items · 107 images · every one 200**, and
11/11 categories now show a thumbnail. Rollback is `image_url = NULL` plus dropping the metadata
key — no file operation, since the rows started empty.

## Deliberate reuse, not an accident

Four photos sit on more than one dish, each at Salman's explicit direction: carbonara/boneless,
chicken supreme/chicken sandwich, crispy 3 and 7 pieces, and one photo across all four zinger
meals ("al pivs kelon"). Each dish still gets **its own file** under its own SKU, so replacing one
later never disturbs the others.

## Open

```
🟡 these are stock. The real goal is Mahmoud's own photos — the mark is what makes that
   replacement findable, one dish at a time, from his own dashboard.
🟡 the 10 category images still point at the decommissioned project; the menu renders from the
   item-photo fallback, which is why all 11 categories read as ✅ above.
```
