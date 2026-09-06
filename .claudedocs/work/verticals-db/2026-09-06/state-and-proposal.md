# Verticals — real DB state, and what "improving the database" actually means

**Date:** 2026-09-06 · Read-only investigation against **Frankfurt** (`aws-0-eu-central-1`), the
live production database. **Nothing written. No migration, no seed, no commit, no deploy.**

Smar / real-estate is parked by decision; everything learned there is recorded in
`.claudedocs/work/booking-experience/2026-09-06/`.

---

## 🟢 Headline: the verticals model is **already correct for all 9 real tenants**

| slug | `vertical` | correct? |
|---|---|---|
| `rk` | `barber` | ✅ — real reservations tenant, 3 Barber rows |
| `mr-h` | `barber` | ✅ — real reservations tenant, 2 Barber rows |
| `smar` `caracas` `footlab` `roz` `olivello` `arizona` `beit-al-fakhar` | `NULL` | ✅ — **correct by ratified decision** |

**`NULL` here is not a gap.** `ALZABT_VERTICAL_REGISTRY_ARCHITECTURE.md` Decision #4 scopes
`vertical` to **Reservations-shaped verticals only**; a retail or restaurant tenant is *supposed* to
carry `NULL`. Assigning them one would be a scope violation.

> ### ⚠️ Correction to my own earlier handoff
> `TENANT_MODEL_CLEANUP/HANDOFF.md` §C2 listed *"`vertical` is NULL for 7 of 9"* as **contradiction
> #1**. **That was wrong.** I wrote it before reading the six ratified `ALZABT_VERTICAL_*` documents.
> It is the intended design, not drift. Repository beats my own summary.

---

## Where the work actually stopped

The 2026-08-14 arc is **further along than the handoff implied**:

| step | state |
|---|---|
| Fix self-registration to activate `reservations` | ✅ done, commit `e5e031c` |
| Classify existing tenants with real evidence | ✅ done (`ALZABT_VERTICAL_TENANT_CLASSIFICATION_PROPOSAL.md`) |
| Pre-write verification for rk / ali / alzabt-demo | ✅ done (`..._BACKFILL_VERIFICATION_...md`) |
| **Backfill `vertical='barber'`** | ✅ **executed** — live check confirms `rk`, `mr-h` (= `ali`, post-rebrand), `alzabt-demo` all carry it. The verification doc still says "NOT yet written"; the write happened after it. |
| New tenants get `vertical` automatically at provisioning | ✅ working — 6 newer demo rows carry it without anyone backfilling |
| **Step 6 — retire `service_type`** | ⏸️ deliberately deferred |
| **Unify the duplicate service maps into the Registry** | ⏸️ `verticals.py`'s own docstring: *"not done yet"* |

---

## The real state of the 37 rows

| bucket | rows | with `vertical` |
|---|---|---|
| **REAL** | **9** | 2 (both correct) |
| DEMO (`demo-*`, `alzabt-demo`) | 14 | 7 |
| TEST/experimental | 9 | 0 |
| UNDECIDED (`cafe` `tastybites` `sneakers-lb` `sneakers-beirut` `assi`) | 5 | 0 |
| **total** | **37** | 9 |

> ## You were right — this is Phase B.
> **Every remaining `vertical` inconsistency lives in the 28 non-real rows.** Delete or archive them
> and the verticals picture becomes clean by construction, with **zero risk to any real tenant**.
> That is exactly the "B before C" ordering, now proven with numbers rather than asserted.

Note among the TEST rows: **`barberlab-test` has 2 real Barber rows and `vertical=NULL`**, and five
`demo-barber-*` rows each have 1 Barber row and `NULL`. They predate the Registry. The classification
proposal already ruled these out: *"the 5 `demo-barber-*` load-test artifacts stay NULL permanently,
treated as test data, not tenants."* No backfill needed — **deletion is the answer, not correction.**

---

## What is genuinely still wrong (small, and all outside the 9 real tenants except one)

### 🔴 F1 — the new Vertical Registry **inherited the `booking` defect**

`app/core/verticals.py:33`

```python
"barber": { "default_services": ["booking", "reservations", "catalog", "whatsapp_ordering"], ... }
```

`booking` is **unit booking** (chalets/rooms). A barbershop has no units. Live proof:

- `mr-h` → `['booking', 'reservations', 'whatsapp_ordering']`, **0 units** — carries it, never uses it
- `rk` → `['reservations', 'store', 'whatsapp_ordering']`, **no `booking`** — **rk is the correct one**

The defect now exists in **three** places: `registration_service.py:54`, `demo_service.py:49`, **and
the canonical Registry itself**. Fixing it in `verticals.py` is a **one-line data change in a
developer-maintained file** and stops every future barber tenant inheriting it.

### 🟠 F2 — `mr-h.service_type = 'services'` while `vertical = 'barber'`

`rk` says `barbershop`, `mr-h` says `services` — same vertical, two vocabularies. This exact row is
**already documented** as the live artifact of the self-registration bug (`..._BACKFILL_VERIFICATION_...md`:
*"'services' is the confirmed, live artifact of the self-registration bug this whole arc traced"*).
**One row, one column.**

### 🟠 F3 — `selected_services` is a second source of truth, correct only by accident

`app/core/services.py:87` `sync_selected_services()` rebuilds it from `client_services`, but runs
**only** when services change via `admin/client_services.py` or `super/platform_services.py`. Tenants
whose services were seeded at registration never get it populated. Live result:

| | |
|---|---|
| `[]` despite having real capabilities | **7 of 9** real tenants |
| stale/wrong | `footlab` → `['store','catalog']`, actual `catalog, store, store.cart, store.products` |
| correct | `rk`, `smar` only |

`registration_service.py:214` even writes a hardcoded `"selected_services": []`. This is the same
"one capability, two write paths" shape `rules/backend/architecture.md` §9 warns about — here as
**one fact, two storage locations**.

### 🟡 F4 — four parallel maps still describe tenant type

`VERTICAL_REGISTRY` (1 entry) · `_SERVICE_SEED_MAP` (6) · `demo_service._SERVICE_MAP` ·
`VENUE_TYPE_MAP` (5) · `services.SERVICE_TYPE_MAP`. The Registry's docstring already names itself as
the intended single source — the consolidation is simply unstarted.

---

## Proposal — smallest change that settles verticals

Ordered by risk, lowest first. **Nothing executed; each needs your explicit go-ahead.**

| # | change | blast radius | risk |
|---|---|---|---|
| **1** | Remove `"booking"` from `VERTICAL_REGISTRY["barber"]["default_services"]` (F1) | future barber tenants only — **no existing row touched** | 🟢 near-zero |
| **2** | Phase B row cleanup: archive/delete the **14 DEMO + 9 TEST** rows (+ your call on the 5 UNDECIDED) | removes **all** remaining vertical noise | 🟠 real DB deletes — needs a snapshot first |
| **3** | `mr-h.service_type`: `'services'` → `'barbershop'` (F2) | 1 row, 1 column | 🟡 low, but a live tenant |
| **4** | Decide `selected_services`: retire it, or make the sync authoritative (F3) | schema/contract decision | 🟠 needs a decision, not a patch |
| **5** | Consolidate the 4 maps into `VERTICAL_REGISTRY` (F4) | code only | 🟡 medium — its own contract |

**My recommendation:** do **1** now (it is a one-line, zero-existing-row change that prevents the
defect recurring), then **2** with a snapshot, then reassess — **3, 4, 5 look different once 28 noisy
rows are gone.**

⚠️ **Standing constraint:** step 2 writes to live production rows and this project has **no staging
rehearsal and no snapshot mechanism**. Per `[[migration-staging-discipline]]`, a snapshot must exist
before any delete.

---

## Confirmed / Side / Unknowns

**Confirmed**
1. All 9 real tenants have the correct `vertical` today; `NULL` on 7 is by design (Decision #4).
2. The backfill was executed (contrary to its own doc's "not yet written" status).
3. Provisioning writes `vertical` automatically for new vertical-aware tenants.
4. 28 of 37 rows are demo/test/undecided and hold **all** remaining inconsistency.
5. `VERTICAL_REGISTRY` carries the `booking` defect; `rk` is the only correctly-configured barber.
6. `selected_services` is a denormalized mirror, correct for only 2 of 9 real tenants.

**Side findings**
- `provisioning_status` is `None` for **every** row including `rk`/`mr-h`, though
  `registration_service.py:149` sets `'pending'` when a vertical resolves — so either it completed and
  was cleared, or these predate that line. Not chased.
- `rk` now has **3** Barber rows (was 2 at the 2026-08-14 audit) — `جعفر` plus one more.

**Unknowns**
1. **When** the backfill ran and under which commit — the verification doc was never updated to
   record it. The doc and the database disagree; the database is authoritative.
2. Whether anything outside this repo reads `service_type` (the Google Sheet at
   `sheets_service.py:205` does receive it).
3. Whether the 5 UNDECIDED tenants are yours to delete — still your call, unchanged from Phase B.

---

# EXECUTED — 2026-09-06

## Step 1 ✅ `28839f1`
`booking` removed from `VERTICAL_REGISTRY["barber"]`. Future barber tenants now provision
`['catalog','reservations','whatsapp_ordering']`. No existing row touched.

**Mid-flight correction:** the proposal called this "near-zero risk" before I had seen
`demo_service.py:46-49`, whose comment claims `booking` is deliberate and cites
`service-system.md`'s *"must seed both keys"*. Verified before proceeding: there is **no
`require_service("booking")` anywhere** (real gates are only reservations 32 / store 22 /
restaurant 18 / catalog 16), and the Reservations tab reads only `reservations`. The note is stale;
its own stated mechanism does not support its conclusion. Recorded in the commit, **not silently
changed in the rule file** — correcting `service-system.md` is a separate task.

## Snapshot ✅ verified before any delete
`frankfurt_pre-cleanup_20260906-225000.dump` (464K, `pg_dump -Fc`). Row parity vs live: **EXACT**
across clients 37 · client_services 110 · barbers 20 · catalog_services 81 · reservations 40 ·
bookings 1 · units 16 · catalog_items 238 · customers 26.
⚠️ Stored in the session scratchpad — must be copied somewhere durable. Never commit it (production data).

## Step 2 ✅ executed by Salman — 17 rows deleted

The set was cut from 23 → 17 by a reference check run **before** deleting. The catch that mattered:

> **`alzabt-demo` — 21 code references.** `App.jsx:232` routes `/alzabt` → `/alzabt-demo/reserve`,
> which backs the live "جرّب عالزبط" demo. Deleting it would have broken a public flow.

Also held: `store-pilot-20260731` (9 refs, has a `tenantRegistry` entry), `barberlab-test` (4 refs —
**and 2 `services` rows, a RESTRICT FK that would have aborted the delete**), `pilot-test-20260720`
(4), `store-pilot-test-20260727` (3), `test-fashion` (1).

| table | before | after | removed |
|---|---|---|---|
| clients | 37 | **20** | 17 |
| client_services | 110 | 51 | 59 |
| catalog_services | 81 | **19** | 62 |
| catalog_categories | 95 | 69 | 26 |
| users | 54 | 37 | 17 |
| barbers | 20 | 9 | 11 |
| catalog_items | 238 | 230 | 8 |
| reservations · store_orders · services | — | unchanged | 0 |

Survivors: **REAL 9/9 · HELD 6/6 · UNDECIDED 5/5.**

*(My pre-delete estimates were computed over 23 candidates, so they ran higher — e.g. 3 reservations
and 1 store_order, which all turned out to belong to the 6 held tenants and were correctly not
touched. Barbers: predicted 15 of 23, actual 11 of 17, difference 4 = alzabt-demo's 2 +
barberlab-test's 2. Consistent.)*

## Post-state verification

- **`vertical` is now set on exactly 3 rows — `rk`, `mr-h`, `alzabt-demo`** — precisely the three the
  2026-08-14 classification named. **The database now matches the ratified decision exactly.**
- Orphan check after cascade: `client_services` **0**, `barbers` **0**, `users` **0**.
- Production `/health` → `db: ok`, 0.36s. All 9 real tenants + `alzabt-demo` → **HTTP 200**.
- Real browser: `alzabt.salmansaas.com/rk/reserve` renders services + barbers, no errors;
  `demo.salmansaas.com/alzabt` correctly redirects to `/alzabt-demo/reserve` and renders
  "صالون عالزبط" with real content.

**Verticals are settled at the data level.** What remains is code-level, not data-level:
`mr-h.service_type` (F2), `selected_services` (F3), map consolidation (F4) — all unstarted.

**Side observation:** `alzabt-demo`'s public nav still shows "الوحدات" (Units) because it was
provisioned **before** Step 1 and still carries `booking`. A live instance of the exact defect Step 1
now prevents — cosmetic, on a demo tenant, not fixed here.
