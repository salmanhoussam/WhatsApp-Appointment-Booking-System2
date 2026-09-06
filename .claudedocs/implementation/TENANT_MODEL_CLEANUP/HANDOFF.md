# Phase B + Phase C — Handoff

**Created 2026-09-06.** Deliberately **separate from the Supabase EU migration**, which is closed
except for Gate 8. Nothing here was decided, changed, or fixed — this is the evidence gathered
along the way, written down so the next session starts from facts instead of re-deriving them.

> **Do not fold any of this into the migration.** It was kept out on purpose: mixing a data
> migration with a schema redesign destroys row-count parity, the clean attribution experiment, and
> the ability to roll back.

---

# PHASE B — Cleanup: real tenants, their files, their pages

## B1. The tenant ledger (37 rows)

Full detail: `.claudedocs/implementation/SUPABASE_EU_MIGRATION/TENANT_INVENTORY.md`

| class | count | disposition |
|---|---|---|
| **REAL** | **9** | keep — `smar` `caracas` `footlab` `roz` `olivello` `arizona` `beit-al-fakhar` `rk` `mr-h` |
| DEMO | 14 | `alzabt-demo` + 13 `demo-*` — cleanup candidates |
| EXPERIMENTAL | 9 | `test-*`, `*-pilot-*`, `magic-test`, `bohussein-*`, `barberlab-test` |
| **NEEDS-DECISION** | **5** | `cafe` `tastybites` `sneakers-lb` `sneakers-beirut` `assi` — **Salman's call** |

The 5 undecided all carry **zero items, zero orders, zero reservations** — only empty categories and
one user each. `sneakers-lb`/`sneakers-beirut` exist as routing stubs with no `pages/` folder;
`cafe`/`tastybites`/`assi` have no code anywhere.

**Provenance rule learned:** absence of a `pages/` folder does **not** mean a tenant is fake — `rk`
and `mr-h` have none because they are config-driven (ADR-0006), which is the *newer* architecture.
Conversely `olivello` has 6 bespoke directories and 23 items and is **not** disposable.

## B2. Storage folders — real inconsistencies (729 objects, 190.56 MB)

| finding | detail |
|---|---|
| **`hr/` holds 329 files (41.15 MB)** | `hr` is `rk`'s **old slug**. The bulk of RK's media still lives under the historical name; `rk/` holds only 2 files |
| **`mister-h/` and `mr-h/` both exist** | 2 files and 4 files — two folders, one tenant |
| **`RK Barbar/`** | contains a space; holds the two homepage videos (10.97 MB) |
| `beitsmar/` | `smar`'s folder is `beitsmar` — a documented historical exception |
| dead-tenant folders | ~20 folders of 4 × `.keep` files each, 0 bytes, belonging to demo/test tenants |

Videos are **18 files = 107 MB, 56 % of the whole bucket**. Largest single object:
`hr/pages/home/try3/Storyboard 1.mp4` at **29.15 MB**.

## B3. Dead code — 10 files, all still carrying storage URLs

Traced file → importer → router. Each has **no importer**, or only a dead one:

`SmarPage.jsx` (unrouted, imported nowhere) → and with it `CollageScene.jsx` ·
`SmarUnitModal` · `FloatingRings` · `VillaSection` · `ShowcaseCards` · `AmenitiesSection` ·
`SmarWebGLHero` · `SmarHero` · `plateAssets.js` · `UnitCard.jsx` (exported from an index,
rendered in **0** files)

8 of 10 are smar components — consistent with CLAUDE.md's own Phase 7.3/7.4 notes. **Deleting the
files is cleaner than updating URLs inside code nobody runs.**

## B4. Two live defects, deliberately untouched

1. **12 category images point at a dead third Supabase project** (`gdzthjcvzvhfpsvoxhbm`, bucket
   `menu`): `caracas` ×10, `arizona` ×2. **The host fails DNS — already broken in production.**
   Never in Sydney's bucket, so never migrated. Fixing means re-uploading the source images.
2. **`Cache-Control: no-cache` on every storage object.** The migration attempted to set a long
   cache on upload; **Supabase ignored the header on that path**, so ~6.13 MB of RK video is still
   revalidated on every visit. Not fixed, not to be assumed fixed.

## B5. A trap with a deadline

**`scripts/data/hr/page_content.json` still contains 3 Sydney URLs.** It is live seed data — **running
the seeder would write Sydney URLs back into the freshly-cleaned Frankfurt database.** Also
`.claude/rules/storage-tenant.md` documents the old project as the canonical storage pattern, so
future agent work will generate Sydney URLs until it is updated.

---

# PHASE C — The tenant-type / capability model

## C1. Salman's question: how many keys describe one tenant?

**Answer: at least eight columns plus a table — and they disagree with each other.**

Real values for the 9 REAL tenants, read 2026-09-06:

| slug | service_type | vertical | page_type | template_key | tier | lifecycle |
|---|---|---|---|---|---|---|
| `smar` | real_estate | — | normal | real-estate-l… | regular | evergreen |
| `caracas` | restaurant | — | showcase | — | regular | trial |
| `arizona` | restaurant | — | normal | — | regular | trial |
| `footlab` | ecommerce | — | normal | — | regular | trial |
| `olivello` | ecommerce | — | landing | — | regular | trial |
| `beit-al-fakhar` | ecommerce | — | normal | — | regular | trial |
| `roz` | services | — | landing | — | regular | trial |
| `rk` | barbershop | **barber** | normal | — | regular | trial |
| `mr-h` | **services** | **barber** | normal | — | regular | trial |

Plus three array/JSON columns, mostly empty, and `provisioning_status` NULL for all 9.

## C2. The contradictions, with evidence

**1. `vertical` is NULL for 7 of 9.** Populated only for `rk` and `mr-h`. "The vertical determines
the service" is a **target model, not the current data**.

**2. `service_type` is inconsistent for the same concept:**
- `ecommerce` (real tenants) vs `store` (test tenants) — two values, one meaning
- `rk` = `barbershop` but `mr-h` = `services` — **two values for the same vertical**, on the two
  tenants that are otherwise most alike

**3. `selected_services` disagrees with `client_services` — the actual gate.** Six of nine have it
NULL while holding real capabilities. Where populated it can be wrong:
`footlab.selected_services = ['store','catalog']` but its real capabilities are
`catalog, store, store.cart, store.products`.

**4. `features` is a legacy flag set that contradicts reality.** `rk` carries
`features.booking = True` — but **`rk` has no `booking` capability at all** (it has `reservations`).

**5. `roz` carries `unit_types = ['chalet']` and `features.booking = True`** while its only real
capability is `catalog`. Template residue, meaningless today.

**6. `arizona` has only the `restaurant` capability — no `catalog`** — yet holds **28 catalog items**.
Worth checking whether those items are reachable at all through the capability gate.

## C3. `booking` ≠ `reservations` — settled, with a systemic defect behind it

| capability | meaning | correct example |
|---|---|---|
| **`reservations`** | **appointments** — calendar, pick a slot | **`rk`** (24 reservations, 3 barbers) |
| **`booking`** | **unit booking** — pick a room/chalet, not an appointment | **`smar`** (16 units) |

Neither implies the other. **But the provisioning code grants `booking` to every barbershop**, in
two duplicated lines:

```python
app/services/registration_service.py:54  "barbershop": ["booking","reservations","catalog","whatsapp_ordering"]
app/services/demo_service.py:49          "barbershop": ["booking","reservations","catalog","whatsapp_ordering"]
```

**13 of 14 barber tenants carry `booking` and none of them use it** (0 units, 0 `bookings` rows).
Only `rk` does not — so **`rk` is the correct configuration and the outlier.**

Note also that the same list is **duplicated across two files** — a second write path for one rule,
the pattern `rules/backend/architecture.md` §9 warns about.

## C4. Catalog vs Services vs Items — the duplication

**The same bookable services are stored twice, in two parallel models:**

| tenant | `catalog_items` with `metadata.requires_booking` | `catalog_services` table |
|---|---|---|
| `rk` | 6 | **7** |
| `mr-h` | 6 | **6** |

Two models, one truth — a textbook "one capability, two write paths" violation.

**Also:** 68 of the 81 `catalog_services` rows (**84 %**) belong to demo tenants, so the table's
apparent size is mostly test data.

## C5. The `catalog` key is dual-purpose — and it leaks into the UI

`catalog` is granted to **every** store/restaurant tenant deliberately, as a **backend admin gate**
(`registration_service.py:49-52`, whose own comment says so). But
`frontend/src/config/service-catalog.js:97-103` maps that same key to a **public nav item labelled
"Services"**.

Result: **Footlab — a store with no services — renders a "Services" tab**, and on `footlab` it is
also a **dead link** (`/footlab/catalog` is not defined, so the `*` route bounces to the homepage).

**Systemic, not Footlab-specific:** every store/restaurant tenant is affected — `olivello`,
`caracas`, `sneakers-*`, every demo store/restaurant.

**The correct precedent already exists in the same file:** `whatsapp_ordering` maps to `null`
(`service-catalog.js:34`) precisely because it is a backend-only key with no public nav entry.

**Nothing else is wrong with the mechanism.** Both public headers are already 100 % driven by
`active_services`, and the backend already returns that field (`public_service.py:227`). **No backend
contract change is needed** — the defect is one line of static data.

## C6. One more open thread

`mr-h`'s site renders a products section (verified 2026-08-20) but **`mr-h` has no `store`
capability**. Either that section is not capability-gated, or the capability is missing. Same class
as the Footlab nav bug.

---

# Suggested order (not decided)

```
Gate 8            finish the migration first — one real write verified on Frankfurt
   ↓
PHASE B           cleanup: the 5 undecided tenants, demo/experimental rows, dead files,
                  storage folder consolidation (hr/ → rk/, mister-h/ + mr-h/)
   ↓
PHASE C           the tenant-type / capability model — its own investigation and ADR
```

**Why B before C:** deleting demo tenants removes 84 % of `catalog_services` rows and most of the
noise, so Phase C would then be reasoning about 9 real tenants instead of 37 mixed ones.

**Cheapest real win, independent of both:** the `catalog` → "Services" nav mapping (C5). One line of
static data, fixes every store/restaurant tenant, needs no backend change. It could ship on its own
at any time.
