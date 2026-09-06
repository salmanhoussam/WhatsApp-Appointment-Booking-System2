# Tenant Inventory — definitive, for ADR-0007 ratification

**Date:** 2026-09-06 · **Method:** read-only `COUNT(*)` against the live Sydney database (not
`pg_stat_user_tables`, which was proven unreliable — it reported `units = 0` while the real count is
16). **Total client rows: 37** — and 9 + 14 + 9 + 5 = 37, so every row is accounted for.

**Classification rule, stated so it can be audited:** a tenant is marked REAL *only* because Salman
named it explicitly. DEMO and EXPERIMENTAL are assigned by slug pattern (`demo-*`/`alzabt-demo`;
`test`/`pilot`/`magic`/`bohussein`/`barberlab`/`verify`). Anything matching neither is left
**NEEDS-DECISION** rather than guessed.

---

## REAL — 9 tenants ✅ (corrected from the earlier, wrong "7")

The count was 7 when it covered only the tenants named on 2026-09-05. Salman added `olivello` and
`roz` on 2026-09-06 ("لا يوجد سبب تقني أو تجاري كافٍ لحذف بيانات حقيقية أثناء migration").
**The correct number is 9.**

| slug | client_id | name | vertical | service_type | items | cats | catalog_services | users | resv | units | orders | imgs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `smar` | `091526a9-41c5-4b61-b2e9-a4819e…` | Bait Smar | — | real_estate | 3 | 4 | 0 | 5 | 0 | **16** | 0 | 0 |
| `caracas` | `b4628f71-6e74-4170-ab18-59b7d5…` | Caracas | — | restaurant | **97** | 10 | 0 | 4 | 0 | 0 | 0 | 0 |
| `footlab` | `b82fe0cf-4dad-4d55-b030-eeb66c…` | Footlab | — | ecommerce | 3 | 3 | 0 | 4 | 0 | 0 | 0 | 0 |
| `roz` | `9667825d-9dee-4e62-a30a-38f058…` | (Arabic name) | — | services | 17 | 4 | 0 | 1 | 0 | 0 | 0 | 0 |
| `olivello` | `bb1679b2-0b84-4f65-aa58-dd815a…` | Olivello | — | ecommerce | 23 | 8 | 0 | 1 | 0 | 0 | 0 | 0 |
| `arizona` | `343c850b-956a-41fb-9153-7be39b…` | Arizona Restaurant | — | restaurant | 28 | 2 | 0 | **0** | 0 | 0 | 0 | 0 |
| `beit-al-fakhar` | `10e5cecd-0b6f-4041-91b6-e0f22f…` | Beit Al-Fakhar | — | ecommerce | 34 | 4 | 0 | 1 | 0 | 0 | 4 | 0 |
| `rk` | `7ef5c8c9-3d47-4aa9-b5e0-43b746…` | RK Barber Shop | **barber** | barbershop | 11 | 2 | 7 | 8 | **24** | 0 | 9 | 3 |
| `mr-h` | `fd53e0e1-684c-4a14-a41e-31dfe5…` | Salon, Mister H | **barber** | services | 6 | 1 | 6 | 1 | **11** | 0 | 0 | 3 |
| **TOTAL** | | | | | **222** | **38** | **13** | **25** | **35** | **16** | **13** | **6** |

Notes carried forward, not acted on:
- `arizona` has **0 users** — nobody can log into its dashboard. Salman: data is kept regardless.
- `smar` holds the only `units` rows in the entire database (16).
- `caracas` holds the largest catalog (97 items).

## DEMO — 14 tenants

`alzabt-demo`, `demo-barber-{a484, c57f, 5513, 82d5, f93b, 6970}`,
`demo-verticalregistrytest-f87f`, `demo-verticalregistrytestrestaurant`,
`demo-phase2extractiontest-{5282, 0b4a, 61f2}`, `demo-verify-salon-25-0803`,
`demo-code-verify-test-fd92`.

Totals: items 8 · cats 16 · **catalog_services 68** · users 14 · reservations 1 · orders 0.

> Worth noting: the demos hold **68 of the 81** `catalog_services` rows — 84 % of that table is demo
> data. Relevant to the later schema work, not to this migration.

## EXPERIMENTAL — 9 tenants

`test-fashion` (Layla Boutique), `test-catalog-fix`, `magic-test`, `pilot-test-20260720`,
`store-pilot-test-20260727`, `barberlab-test`, `store-pilot-20260731`,
`bohussein-redirecttest-1786113608`, `bohussein-test-1786114296`.

Totals: items 8 · cats 26 · users 10 · reservations 2 · orders 1.

## NEEDS-DECISION — 5 tenants ⚠️ Salman's call, not guessed

All five carry **zero items, zero orders, zero reservations** — only empty categories and one user
each. Whatever is decided, the data volume is negligible.

| slug | client_id | name | service_type | items | cats | users | created |
|---|---|---|---|---|---|---|---|
| `cafe` | `d9048d04-fae0-4839-b3c5-98190a…` | cafe | restaurant | 0 | 0 | 1 | 2026-04-25 |
| `tastybites` | `09c8653c-9084-42af-aea5-50025f…` | تيستي بايتس | restaurant | 0 | 0 | 1 | 2026-05-04 |
| `sneakers-lb` | `ce21b02d-0983-4a4f-a15b-6f4de5…` | Sneakers LB | store | 0 | 5 | 1 | 2026-05-13 |
| `sneakers-beirut` | `2f755ea9-6a9c-442f-9131-16d5c9…` | Sneakers Beirut | store | 0 | 5 | 1 | 2026-05-13 |
| `assi` | `6c145618-0ef6-4260-9a2a-c6ef16…` | assi | ecommerce | 0 | 5 | 1 | 2026-05-15 |

`sneakers-lb` and `sneakers-beirut` appear in `.claude/CLAUDE.md`'s client table as
**"Registered (Unverified)"** — consistent with being registered but never built out.

---

## Exact row counts — the Gate 4 parity baseline

`COUNT(*)`, taken 2026-09-06. **These are the numbers Gate 4 must match exactly.** Re-take them
immediately before the dump, since live traffic can change them.

| table | rows | | table | rows |
|---|---|---|---|---|
| `clients` | 37 | | `reservations` | 38 |
| `users` | 54 | | `units` | **16** |
| `catalog_items` | 238 | | `barbers` | 20 |
| `catalog_categories` | 95 | | `barber_services` | 85 |
| `catalog_services` | 81 | | `customers` | 25 |
| `client_services` | 110 | | `store_orders` | 14 |
| `gallery_images` | 6 | | `store_order_items` | 17 |
| `subscriptions` | 15 | | | |

---

## Migration scope decision (per Salman, 2026-09-06)

**Phase A migrates ALL 37 client rows — everything, unchanged.** Cleanup of DEMO/EXPERIMENTAL
tenants is **Phase B**, after the EU project is verified and primary. This is deliberate:

1. It keeps Gate 4's row-count parity check meaningful — an exact match on both sides is the
   strongest safety gate in the whole plan, and it is only possible if nothing is filtered.
2. Sydney remains untouched as the rollback copy, so nothing is at risk from deferring cleanup.
3. It preserves clean attribution: *same application, same schema, same data — only topology
   changed.* Any latency improvement is then unambiguously the region move.

Total volume is trivial either way — the whole database is 32 MB.

---

## `service_type` is a legacy label, not a capability description (Salman, 2026-09-06)

Salman's correction, adopted: **a tenant must not be characterised by `service_type`.** It is a
single-valued legacy classification; actual capabilities come from `client_services`. The real data
proves it — no real tenant's capabilities can be derived from its `service_type`:

| slug | `service_type` | `vertical` | **actual active `client_services`** |
|---|---|---|---|
| `rk` | barbershop | barber | `reservations`, **`store`**, `whatsapp_ordering` |
| `mr-h` | **services** | barber | `booking`, `reservations`, `whatsapp_ordering` |
| `smar` | real_estate | — | `booking`, `gallery`, `whatsapp_ordering` |
| `caracas` | restaurant | — | `catalog`, `restaurant`, `restaurant.menu`, `whatsapp_ordering` |
| `footlab` / `olivello` / `beit-al-fakhar` | ecommerce | — | `catalog`, `store`, `store.cart`, `store.products` |
| `arizona` | restaurant | — | `restaurant` *(only — no `catalog`)* |
| `roz` | **services** | — | `catalog` *(only)* |

**Two corrections to the record, from evidence rather than assumption:**

1. **The "barber that also sells" case is `rk`, not `mr-h`.** `rk` carries `store` alongside
   `reservations` — a genuine multi-capability tenant. **`mr-h` has no `store` capability active at
   all.** Salman's underlying point stands completely (one label cannot describe a tenant), but the
   live example supporting it is `rk`.
2. **`mr-h` carries `booking`** — see the dedicated section below. My first explanation for this
   ("residue from `DEFAULT_SERVICES`") was **wrong**; the real cause is an explicit line in the
   provisioning code, and the anomaly is systematic rather than specific to `mr-h`.

---

## `booking` ≠ `reservations` — review and corrections (Salman, 2026-09-06)

**The distinction, as Salman defines it and as this document now uses it throughout:**

| Capability | What it is | Model | Correct example |
|---|---|---|---|
| **`reservations`** | **Appointments.** Customer opens a calendar, picks a time slot, books it. | `reservations` rows, `barbers`, `catalog_services` | **`rk`** — barber |
| **`booking`** | **Unit booking.** Customer picks a Unit (room/villa/chalet) and enters a booking process for it. **Not a calendar appointment.** | `bookings` rows, `units` | **`smar`** — real estate |

**Neither implies the other.** A barber needing `reservations` does not need `booking`; a real-estate
tenant needing `booking` does not need `reservations`.

### Where this document conflated them, and what was corrected

1. **Prose, in ADR-0007 and CONTRACT.md** — the phrases "booking journey" and "a real WhatsApp
   booking" were used as everyday English for what is, in this system, specifically a **reservation**
   (the verified WhatsApp flow `BF948302` created a *reservation* for `mr-h`, not a `booking`). In a
   system where `booking` is a capability name, that wording is genuinely ambiguous. **Corrected
   throughout both documents.** The only surviving occurrences of the word are real identifiers
   (`catalog_items.metadata.requires_booking`), which must not be renamed.
2. **Cause attribution for `mr-h`'s `booking`** — corrected below. This was a substantive error, not
   just wording.
3. **The capability analysis itself was NOT conflated** — `booking` was already described as "the
   stay/unit-booking capability that `smar` uses" and flagged as inappropriate for a barbershop. That
   conclusion stands.

### Corrected root cause — systematic, not a one-off

The provisioning code grants `booking` to **every** barbershop tenant, explicitly, and the line is
duplicated in two files:

```python
app/services/registration_service.py:54
    "barbershop": ["booking", "reservations", "catalog", "whatsapp_ordering"],
app/services/demo_service.py:49
    "barbershop": ["booking", "reservations", "catalog", "whatsapp_ordering"],
```

So this is **not** seed residue from `DEFAULT_SERVICES` — it is a deliberate, hardcoded entry in the
barbershop provisioning map. Every barbershop provisioned through registration or the demo builder
receives a real-estate capability it cannot use.

### Definitive table — who has `booking`, who has `reservations`

| slug | service_type | vertical | `booking` | `reservations` | units | `reservations` rows | `bookings` rows | barbers | reading |
|---|---|---|---|---|---|---|---|---|---|
| **`smar`** | real_estate | — | ✅ | — | **16** | 0 | **1** | 0 | ✅ **correct** — unit booking, real estate |
| **`rk`** | barbershop | barber | — | ✅ | 0 | **24** | 0 | 3 | ✅ **correct** — appointments, barber |
| **`mr-h`** | services | barber | ⚠️ **yes** | ✅ | 0 | **11** | 0 | 2 | ⚠️ **anomaly** — `booking` unused, 0 units, 0 bookings |
| `alzabt-demo` | barbershop | barber | ⚠️ yes | ✅ | 0 | 1 | 0 | 2 | same anomaly (demo) |
| `demo-barber-{a484,c57f,5513,82d5,f93b,6970}` | barbershop | — / barber | ⚠️ yes | ✅ | 0 | 0 | 0 | 1 each | same anomaly (demo) |
| `demo-phase2extractiontest-{5282,0b4a,61f2}` | barbershop | barber | ⚠️ yes | ✅ | 0 | 0 | 0 | 1 each | same anomaly (demo) |
| `demo-verify-salon-25-0803` | barbershop | barber | ⚠️ yes | ✅ | 0 | 0 | 0 | 1 | same anomaly (demo) |
| `demo-verticalregistrytest-f87f` | barbershop | barber | ⚠️ yes | ✅ | 0 | 0 | 0 | 1 | same anomaly (demo) |
| `demo-code-verify-test-fd92` | real_estate | — | ✅ | — | 0 | 0 | 0 | 0 | consistent with real_estate (empty demo) |
| `barberlab-test` | services | — | — | ✅ | 0 | 2 | 0 | 2 | consistent — appointments only |
| `pilot-test-20260720` | restaurant | — | — | ✅ | 0 | 0 | 0 | 0 | `reservations` on a restaurant — table booking; unused |

**Scale of the anomaly: 13 of the 14 barber-type tenants carry `booking`. Only `rk` does not.**
`rk` is therefore the *correct* configuration and the outlier — which fits its status as the master
template (ADR-0006), presumably corrected by hand at some point.

### Findings — recorded only, NOT to be fixed now

- **F1.** `booking` is granted to every barbershop by `registration_service.py:54` and
  `demo_service.py:49`. Affects `mr-h` plus 12 demo tenants. Not used by any of them (0 units,
  0 `bookings` rows across all 13).
- **F2.** The same provisioning list is **duplicated in two files** — a second write path for the
  same rule, the pattern `rules/backend/architecture.md` §9 warns about.
- **F3.** `pilot-test-20260720` (restaurant) carries `reservations` with zero rows — plausibly
  intended as table booking, never used. Experimental tenant; noted only.
- **F4.** `mr-h`'s `service_type` is `services` while `rk`'s is `barbershop`, though both are barbers
  with `vertical = barber`.

**No anomaly here is deleted, corrected, or migrated differently.** Phase A copies capability rows
exactly as they are. These findings belong to Phase C.

Also note `roz`: `service_type = services` but its only capability is `catalog` — the label and the
behaviour disagree outright.

**Open question for Phase C, flagged not resolved:** `mr-h`'s site renders a products section
(verified 2026-08-20), yet `mr-h` has no `store` capability. Either that section is not
capability-gated, or the capability is missing. This is the same class of defect as the Footlab
`catalog`→"Services" nav bug. **Not touched during migration.**

## Provenance — evidence for the Phase B cleanup decision

Salman asked to delete tenants only *"if you created them for testing and they have no operational
value."* That is a question about provenance, so here is the actual build evidence rather than
recollection:

| slug | bespoke `pages/` | routes file | registry | seed data | reading |
|---|---|---|---|---|---|
| `beit-al-fakhar` | **10 dirs** | ✅ | ✅ | — | heavily built |
| `smar` | **9 dirs** | ✅ | ✅ | ✅ | heavily built |
| `caracas` | 6 dirs | ✅ | ✅ | ✅ | built |
| **`olivello`** | **6 dirs** | ✅ | ✅ | ✅ | **built — NOT a test tenant** |
| `arizona` | 5 dirs | ✅ | ✅ | — | built |
| `footlab` | 5 dirs | ✅ | ✅ | ✅ | built |
| `rk` | — | — | — | — | **generic engine (ADR-0006) — absence here means modern, not unreal** |
| `mr-h` | — | — | — | — | same as `rk` |
| `roz` | — | — | — | ✅ | seeded, never given a page |
| `sneakers-lb` / `sneakers-beirut` | — | ✅ | ✅ | — | registered, never built (matches CLAUDE.md "Registered (Unverified)") |
| `cafe` / `tastybites` / `assi` | — | — | — | — | nothing anywhere |

**Two conclusions that change the Phase B question:**

- **`olivello` should not be deleted.** It has six directories of bespoke frontend work
  (`TreeSection`, `OlivelloScene3D`, `OlivelloStory`), a routes file, a registry entry, seed data,
  23 catalog items, and is listed **Live ✅** in `.claude/CLAUDE.md`. Whatever its commercial status,
  it is not a test artifact, and deleting it discards real development.
- **Do not read `rk`/`mr-h`'s empty rows as "unbuilt."** They are config-driven through the generic
  engine per ADR-0006 — which is the *newer* architecture. `rk` is the master template.

`cafe`, `tastybites`, `assi` have no code, no data, no activity anywhere — the strongest cleanup
candidates. `sneakers-*` exist only as routing stubs. `roz` sits in between: real seeded catalog
data, no page — **its status is genuinely unclear and remains Salman's call.**

## Side finding for the later schema work (Phase C — recorded, not acted on)

The inventory exposes concrete evidence for the schema problem ADR-0007 defers:

- **`vertical` is NULL for 7 of the 9 real tenants** — populated only for `rk` and `mr-h`. So
  "vertical determines the service" is a target model, not the current data.
- **`service_type` is populated for all 9, but is inconsistent**: `footlab`/`olivello`/
  `beit-al-fakhar` use `ecommerce` while test tenants use `store` — two values, one concept. And
  `rk` uses `barbershop` while `mr-h` uses `services` — two values for the *same* vertical, on the
  two tenants that are otherwise most alike.
- The same bookable services exist twice for `rk` (6 vs 7) and `mr-h` (6 vs 6) — once in
  `catalog_items.metadata.requires_booking`, once in `catalog_services`.

This belongs to its own ADR after the migration, per the agreed Phase A → B → C split.
