# Code Reference Classification — what belongs in Gate 6, and what does not

**Date:** 2026-09-06 · **Read-only.** No file edited, no replace, no deploy, no env change, no cutover.
**Purpose:** determine exactly which of the remaining `wefjghagwpkotrrdiqyi` references must be part
of the cutover, and which are unrelated to it.

**Reachability method:** each frontend file was traced to its importer, and each importer to the
router, so "runtime" means *provably rendered for a routed tenant* — not assumed from the filename.

**Totals: 68 occurrences** (the earlier "54" omitted `.env` and `.claudedocs`).

| | category | occurrences | in Gate 6? |
|---|---|---|---|
| **A** | Runtime production | **25** | ✅ **YES — must ship with cutover** |
| **B** | Build/deploy/config | **3** | ✅ **YES — this *is* the cutover** |
| **C** | Scripts / tooling | **12** | ❌ no — follow-up |
| **D** | Documentation | **18** | ❌ no — historical record |
| **E** | Dead / unreachable | **10** | ❌ no — no runtime effect |

---

## A. Runtime production references — 25 occurrences, 13 files ✅ MUST CHANGE IN GATE 6

Every one is a hardcoded storage URL inside a component that is **provably reachable** from a routed
tenant. If these ship unchanged, those tenants keep loading media from the old Sydney project after
cutover — working, but at the old latency, and tethered to a project we intend to retire.

**Change in all cases:** the ref substring only — `wefjghagwpkotrrdiqyi` → `qjocpqokwmlpzaftltiy`.
Paths, buckets and filenames stay byte-identical.

| file | lines | occ | reachability chain | tenant |
|---|---|---|---|---|
| `pages/caracas/spatial/CaracasSpecialReel.jsx` | 27,35,42,49,56,63,70 | **7** | `caracas.routes` → `SpecialPage` → this | caracas |
| `pages/arizona/spatial/ArizonaStoryReel.jsx` | 35,42,49,56 | **4** | `arizona.routes` → `HomePage` → this | arizona |
| `templates/ShowcaseTemplate.jsx` | 31,32 | 2 | `smar.routes` → this | smar |
| `pages/smar/gallery/SmarGalleryPage.jsx` | 22,145 | 2 | `smar.routes` → this | smar |
| `pages/smar/showcase/SmarLiquidRing.jsx` | 19,22 | 2 | `smar.routes` → this | smar |
| `pages/smar/spatial/SpatialPropertyDetails.jsx` | 32 | 1 | `smar.routes` → this | smar |
| `pages/olivello/sections/OlivelloStory.jsx` | 23 | 1 | `olivello.routes` → this | olivello |
| `pages/olivello/canvas/OlivelloScene3D.jsx` | 58 | 1 | ← `OlivelloStory` (routed) | olivello |
| `pages/olivello/sections/TreeSection.jsx` | 15 | 1 | ← `OlivelloShowcase` (routed) | olivello |
| `pages/beit-al-fakhar/sections/GallerySection.jsx` | 3 | 1 | `beit-al-fakhar.routes` → `HomePage` → this | beit-al-fakhar |
| `pages/beit-al-fakhar/sections/AboutSection.jsx` | 3 | 1 | same chain | beit-al-fakhar |
| `pages/beit-al-fakhar/sections/hero/walkthroughAssets.js` | 14 | 1 | → `HeroExperience` → `HomePage` (routed) | beit-al-fakhar |
| `design-system/atoms/SEO.jsx` | 23 | 1 | used by `SmarGalleryPage`, `ListingsTemplate`, `ShowcaseTemplate` | shared |

**Note on impact:** 5 of the 9 REAL tenants are affected — `caracas`, `arizona`, `smar`, `olivello`,
`beit-al-fakhar`. These are precisely the tenants with bespoke frontends. `rk` and `mr-h` are
config-driven (ADR-0006) and appear **nowhere** in this list — their media comes from the database,
which is already converted.

---

## B. Build / deployment / config — 3 occurrences ✅ THIS IS THE CUTOVER

`.env` (and the matching Railway variables):

| line | variable | change to |
|---|---|---|
| 9 | `DATABASE_URL` | EU pooler, port 6543, **keep `?pgbouncer=true`** |
| 10 | `DIRECT_URL` | EU pooler, port 5432 |
| 12 | `SUPABASE_URL` | `https://qjocpqokwmlpzaftltiy.supabase.co` |

Plus `SUPABASE_KEY` → the EU service key (its value contains no project ref, so it does not appear
in the grep, but it must change too).

**These are Gate 6 itself.** Values already exist and are verified as `EU_DATABASE_URL` /
`EU_DIRECT_URL` / `EU_SUPABASE_URL` / `EU_SUPABASE_SERVICE_KEY`.

> ⚠️ **Security note:** while producing this inventory, a masking regex failed and the **Sydney
> database password was printed in cleartext** into the working transcript. It belongs to the
> project being retired, but Sydney stays live as the rollback target — **rotating it is advisable**,
> and it must be rotated before Sydney is ever made public or shared.

---

## C. Scripts / tooling — 12 occurrences ❌ NOT IN GATE 6

No runtime effect; none of these execute during a request.

| file | occ | what it is | should change? |
|---|---|---|---|
| `scripts/onboard_anas.py` | 4 | one-off onboarding for the `anas` tenant | eventually — it would write old refs if re-run |
| `scripts/migrate_images.py` | 3 | one-off image migration utility | eventually |
| `scripts/data/hr/page_content.json` | 3 | **seed data** for `hr`/`rk`'s page content | **yes, soon** — re-seeding would reintroduce old refs into the DB we just cleaned |
| `scripts/migrate_smar_config.py` | 1 | one-off smar config migration | eventually |
| `prisma/migrations/add_tenant_config.sql` | 1 | historical migration, **already applied** | **no** — editing applied history changes nothing and misleads |

**Priority within C:** `scripts/data/hr/page_content.json` is the only one with a real failure mode —
it is live seed data, and re-running the seeder after cutover would write Sydney URLs back into
Frankfurt. Worth fixing soon, but it does not block cutover.

---

## D. Documentation — 18 occurrences ❌ NOT IN GATE 6

| location | occ | verdict |
|---|---|---|
| `.claudedocs/` — sessions, reviews, work evidence | 11 | **do not change** — historical records; rewriting them falsifies what was true at the time |
| `.claude/memory.md` | 2 | do not change (legacy/deprecated file) |
| `.claude/rules/storage-tenant.md` | 1 | ⚠️ **exception — should be updated after cutover.** It documents the *current* canonical storage URL pattern for future agent work; leaving it stale would have agents generate Sydney URLs. |

`.claude/rules/storage-tenant.md` is the single documentation file with forward-looking effect. It
belongs in the cutover **follow-up**, not the cutover itself.

---

## E. Dead / unreachable — 10 occurrences, 10 files ❌ NO RUNTIME EFFECT

Each was traced and has **no importer**, or only a dead importer. Changing them affects nothing;
leaving them affects nothing.

| file | occ | why dead |
|---|---|---|
| `pages/smar/SmarPage.jsx` chain → `pages/smar/canvas/CollageScene.jsx` | 1 | `CollageScene`'s only importer is `SmarPage.jsx`, which is **not routed and imported nowhere** |
| `pages/smar/ui/SmarUnitModal.jsx` | 1 | no importer |
| `pages/smar/canvas/FloatingRings.jsx` | 1 | no importer |
| `pages/smar/sections/VillaSection.jsx` | 1 | no importer |
| `pages/smar/sections/ShowcaseCards.jsx` | 1 | no importer |
| `pages/smar/sections/AmenitiesSection.jsx` | 1 | no importer *(matches CLAUDE.md: "Phase 7.4 🔲 Pending")* |
| `pages/smar/spatial/SmarWebGLHero.jsx` | 1 | no importer |
| `pages/smar/spatial/SmarHero.jsx` | 1 | no importer |
| `pages/beit-al-fakhar/plates/plateAssets.js` | 1 | no importer |
| `design-system/molecules/UnitCard.jsx` | 1 | exported from `molecules/index.js` but `<UnitCard>` appears in **0** files outside design-system |

**Side finding:** 8 of these 10 are smar components. `SmarPage.jsx` being unrouted while
`ShowcaseTemplate` serves `/smar` is consistent with CLAUDE.md's Phase 7.3 note. This is a real
dead-code cluster and a natural **Phase B/C** cleanup candidate — deleting the files would remove
the references outright, which is cleaner than updating URLs in code nobody runs.

---

## Bottom line for Gate 6

```
MUST ship with cutover      A (25 code)  +  B (3 env)   = 28
Follow-up, non-blocking     C (12)  +  storage-tenant.md (1)
Never change                D (17 historical docs)
No effect either way        E (10 dead)
```

**The cutover's code change is therefore exactly 13 files / 25 occurrences**, all of them a single
mechanical substring swap, plus the 4 environment variables.

**Sequencing consequence:** A and B must land **together**. Changing env vars without shipping the
frontend leaves 5 tenants pulling media from Sydney; shipping the frontend without the env change
points media at Frankfurt while the database still answers from Sydney. Either half alone is a
split-brain state.

**Gate 6 remains PAUSED** pending review of this classification and a chosen cutover window.
