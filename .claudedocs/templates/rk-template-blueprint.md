# RK Barbershop — Template Blueprint (Gold Standard)

**Date:** 2026-09-07 · Read-only extraction from **live Frankfurt**. Nothing was written to any
database. Companion data file: `.claudedocs/templates/rk-barbershop-template.json`.

---

## ⚠️ Read this first — RK is not clean today

The brief assumed RK could be extracted as-is. **It cannot.** A live audit found real contamination
from at least three separate past experiments sitting inside the tenant:

| what | evidence | why it matters |
|---|---|---|
| **`resources`: "Dr. Faisal", "Dr. Sara"** — `type='doctor'`, inactive | 2 rows | **clinic** experiment residue on a *barbershop* |
| **`services` (legacy): "تنظيف أسنان / Teeth Cleaning"** — inactive, currency `SAR` | 1 row | dental residue; RK's real currency is `USD` |
| **`barbers`: "Test Staff QA"** — inactive | 1 row | QA residue |
| **`catalog_services`: "خدمة تجريبية QA"** — inactive, price 9.00 | 1 row | QA residue |
| **8 users** — 1 TENANT_ADMIN, 3 MANAGER_UNITS, 2 STAFF, 2 MANAGER_RESERVATIONS | 8 rows | 7 are test accounts |
| **`client_services`**: `booking` and `catalog` present but **inactive** | 2 of 5 rows | dormant keys; only 3 are active |

> ### 🔴 And the most important one — RK is barely bookable
> `barber_services` holds **3 links**, and **2 of them belong to `جعفر`, who is `is_active=false`.**
> Of `3 barbers × 7 services = 21` possible combinations, exactly **one** (`حسين → شعر`) is really
> bookable today. **Cloning RK verbatim would produce a demo where nothing works.**

**Conclusion: the template is a *curated* extract, not a dump.** The JSON companion excludes every
row above and states each exclusion in its `_meta`.

---

## 1. Pure Extraction — what the template actually contains

| entity | rows | notes |
|---|---|---|
| `Client` | 1 | config: `working_hours`, `hero`, `story`, `font`, `catalog_layout`, `page_background` |
| `ClientService` | **3** | `reservations`, `store`, `whatsapp_ordering` — active only |
| `User` | **1** | TENANT_ADMIN only; everything identifying is regenerated |
| `Barber` | **1** ⚠️ | only `حسين` is active — see Decision D1 |
| `CatalogCategory` | 2 | `الخدمات` (module `catalog`), `منتجات العناية` (module `store`) |
| `CatalogService` | 6 | شعر 20m · دقن 15m · شعر ودقن 30m · تمشيط 20m · حنة 45m · كرياتين 90m |
| `CatalogItem` (store) | 5 | جل · زيت · سبراي · عطر · واكس — real grooming products |
| `BarberService` | *generated* | cross-link every active barber × every service — **not** copied from RK |

**Deliberately excluded — transactional:** `reservations` (26) · `customers` (21) · `store_orders`
(9) · `whatsapp_sessions` (1) · `bookings` (0).

**Also excluded — `catalog_items` where `metadata.requires_booking = true` (6 rows).** These are the
**same six services** already present in `catalog_services`. RK stores its bookable services in
**both** models — the dual-model duplication already on record. **`CatalogService` is authoritative
for this template**; cloning both would create two sources of truth in every new tenant.

**Also excluded — `gallery_images` (3).** Their URLs span **three different storage folders** —
`properties/hr/`, `properties/RK%20Barbar/`, `properties/rk/` — the unresolved folder drift. Cloning
them would propagate it into every new demo. Deferred to the storage-consolidation contract.

---

## 2. Dynamic vs Static — field classification

### 🔵 REGENERATE — must be new per clone (collides otherwise)

| field | rule |
|---|---|
| every `id` | `gen_random_uuid()` — never copy |
| `Client.slug` | `demo-{name}-{4 chars}` (`demo_service._unique_slug`) — **`@unique`** |
| `Client.phone` / `whatsapp_number` | **`@unique`** in practice — registration rejects duplicates |
| `User.email` | **`@unique`** — the single most likely collision |
| `User.password_hash` | fresh `_temp_password()` → hashed |
| `User.setupToken` / `setupTokenExp` | fresh token, fresh expiry |
| `createdAt` / `updatedAt` | `now()` |
| `trial_ends_at` | `now() + TRIAL_DAYS` |
| every `clientId` FK | the new Client's id |

### 🟢 COPY-VERBATIM — identical in every clone

Service names (ar/en) · `duration_min` · category names + `module_key` + `sort_order` · store product
names · `Client.config.working_hours` · `config.font` · `config.catalog_layout` ·
`config.page_background` · `page_type` · `service_type='barbershop'` · `vertical='barber'` ·
`client_services` keys.

### 🟡 PARAMETERIZE — from the new tenant's own input

`Client.name_ar` / `name_en` · `phone` / `whatsapp_number` · `email` · `primary_color`
(RK's is `#2F4F4F`) · `currency` (RK's is `USD`) · barber display names · `config.hero` and
`config.story` text (RK's mention RK by name).

### 🔴 DROP — never cloned

All transactional rows · all 7 non-admin users · the `doctor` resources · the dental `services` row ·
QA barber and QA service · `gallery_images` (pending folder consolidation) · `lifecycle_state` /
`tier` / `provisioning_status` (set by the provisioning path, not copied) · the 6 duplicate
`catalog_items` with `requires_booking=true`.

---

## 3. Dependency Order Map — the strict insert sequence

FK rules read from **both** `information_schema` (live) and `prisma/schema.prisma`. From `clients`:
**22 CASCADE, 4 RESTRICT** (`customers`, `prices`, `services`, `units`), 1 SET NULL.

```
1.  Client                     no FK parent. Everything below carries the NEW clientId.
2.  ClientService              FK: clientId → Client.  @@unique([clientId, serviceKey])
                                Must precede anything gated by require_service().
3.  User (TENANT_ADMIN)        FK: clientId → Client.  barberId MUST be NULL here.
                                Placed 3rd on purpose — an email collision surfaces
                                BEFORE 15 domain rows are written.
4.  CatalogCategory (roots)    FK: clientId → Client.  parentId = NULL
5.  CatalogCategory (children) FK: parentId → CatalogCategory  ← SELF-REFERENCE, see below
6.  CatalogItem   (store)      FK: clientId → Client, categoryId → CatalogCategory
7.  CatalogService (bookable)  FK: clientId → Client, categoryId → CatalogCategory
8.  Barber                     FK: clientId → Client
9.  BarberService              FK: barberId → Barber, serviceId → CatalogService
                                @@unique([barberId, serviceId]) — TWO parents, strictly last
10. GalleryImage               FK: clientId → Client, catalogItemId → CatalogItem (after 6)
```

Steps 6, 7 and 8 are independent of one another and may run in any order or in parallel — but never
before 4, and never after 9.

### Three ordering hazards the naive order misses

**H1 — `CatalogCategory.parentId` is a self-reference** (`schema.prisma:500`, `onDelete` not
declared → Prisma's optional-relation default `SetNull`). A flat category list sidesteps it entirely,
and **both existing seed paths do exactly that** — one root category. If the template ever nests,
insert roots first then `UPDATE` children with the remapped ids; **never copy RK's `parentId`**.

**H2 — `User.barberId` is `@unique` AND an FK → `Barber`** (`schema.prisma:174, 205`, `onDelete:
SetNull`). It creates a mutual optional 1-1 between User and Barber. It is not a true insert cycle
because the column is nullable — **but a copied non-null value both collides on the unique index and
points at RK's own Barber row**. Always insert the admin with `barberId = NULL`; wire STAFF accounts
only after step 8.

**H3 — 🔴 `BarberService.clientId` has NO foreign key declared** (`schema.prisma:972`). Postgres will
**silently accept a stale RK `client_id`** on a cloned row. Nothing in the database catches it. This
is the single most dangerous column in the clone and must be asserted in code.

---

## 4. Guardrails — no cross-tenant bleed

1. **Every insert carries the NEW `clientId`.** Never reuse RK's (`7ef5c8c9-…`). One copied clientId
   silently attaches a row to RK's **live production** tenant.
2. **🔴 Assert `BarberService.clientId` explicitly** — per H3, the database will not do it for you.
3. **Omit every `id` column** and let `gen_random_uuid()` fire. Never carry a copied PK.
4. **Wrap the whole clone in one transaction.** A partial clone leaves an orphan Client with no admin
   user — unrecoverable through the UI.
5. **Never `SELECT … FROM` RK at clone time.** Clone from the JSON template file, not the live tenant
   — otherwise every future edit to RK silently changes new demos, and today's contamination
   propagates forever.
6. **Assert before insert:** slug, email and phone are all free. `registration_service.py:89-99`
   already does this — reuse it, don't rewrite it.
7. **Re-assert after insert:** row counts under the new `clientId` match the template's expected
   counts, **and** `count(*) where client_id = <rk>` is unchanged.
8. **Deduplicate `GalleryImage` hero/logo rows in code.** At most one active row per
   `(clientId, imageType)` for `page_hero`/`page_logo` is enforced **at the service layer only**
   (`schema.prisma:422-426`) — Postgres accepts two.
9. **Never clone `gallery_images`** until the storage-folder drift is resolved.
10. **Storage:** call `_init_tenant_storage()` for the new slug — never point a clone at
    `properties/rk/` or `properties/hr/`.

### Unique constraints, ranked by how likely they are to bite

| # | constraint | regenerate as |
|---|---|---|
| 1 | **`User.email` @unique** — *global*, not per-tenant | `{slug}@demo.salmansaas.com` (`demo_service.py:345`) |
| 2 | **`Client.slug` @unique** | `demo-{name}-{4 hex}` + 5-attempt retry (`demo_service.py:174,302`) |
| 3 | **`Client.phone` @unique** — NOT NULL | `demo-{slug}` placeholder (`demo_service.py:320`) — non-numeric, can never clash with a real phone |
| 4 | **`User.setupToken` @unique** | **always NULL** — a copied non-null token collides *and* leaks a live setup link |
| 5 | **`User.barberId` @unique** | **always NULL** — see H2 |
| 6 | `@@unique([clientId, serviceKey])` | fresh clientId makes it free; use `upsert` on the compound key for re-run safety (`demo_repo.py:24`) |
| 7 | `@@unique([barberId, serviceId])` | remap both ids; `set_services_for_barber()` uses delete_many + create_many |

⚠️ **No name-level uniqueness exists on categories, items, services or barbers** — duplicate service
names are silently accepted, so the clone script itself must be idempotent.

---

## 5. Reuse the proven path — with three real fixes

`demo_service.create_demo_tenant()` + `provisioning_service.provision_barber_domain()` already
implement this whole shape. **Use them.** But a schema-level comparison against
`scripts/seed_alzabt_demo_tenant.py` found three genuine defects that a template must fix:

| # | defect | evidence |
|---|---|---|
| **F1** | **`CatalogService.currency` is the hardcoded literal `"USD"`**, not derived from `Client.currency` | `provisioning_service.py:88` — a tenant on `SAR` or `LBP` gets USD-priced services |
| **F2** | **`_DEFAULT_CONFIG` has `hero` + `story` but NO `working_hours`**; the alzabt script has `working_hours` but no hero/story | `demo_service.py:68-79` vs `seed_alzabt_demo_tenant.py:110-112` — **each path loses what the other supplies.** RK's own config has all of them. |
| **F3** | **`primary_color` is hardcoded in both paths** (`#6d28d9` / `#2F4F4F`) | `demo_service.py:328`, `seed_alzabt_demo_tenant.py:58` — must become PARAMETERIZE |

**Also settled by the comparison:** the alzabt script predates the Vertical Registry and leaves
`vertical` NULL; `demo_service` sets both `service_type='barbershop'` and `vertical='barber'`.
**`demo_service` is the correct path** — the alzabt script should not be the model.

**Where they already agree:** the four `client_services` keys, and both cite the same documented
pitfall (seeding only one of `booking`/`reservations` leaves the admin Reservations route silently
unreachable). *Note: per `28839f1`, a new barber clone should now get **three** keys, not four —
`booking` was removed from the barber vertical.*

---

## Decisions required

| # | decision | why it can't be decided here |
|---|---|---|
| **D1** | **The template yields only ONE barber.** Add a second (and what name)? | A one-barber demo makes the "choose your barber" step meaningless. `alzabt-demo` uses 2. This is a product-quality call. |
| **D2** | Prices: all six RK services are **5.00 USD** — placeholder, not market pricing. Keep, or use researched prices? | `alzabt-demo`/`ali` were given real researched prices ($8-40). Cloning 5.00 everywhere looks unfinished to a prospect. |
| **D3** | Should the clone seed `catalog_items(requires_booking)` too, for the tenants/UI that read that model instead? | Depends on the unresolved dual-model question (Phase C). |
| **D4** | Clean RK itself (drop the doctors, dental row, QA rows, 7 test users)? | RK is a **live production tenant**, not a fixture. Separate, approved change. |
| **D5** | Does the template belong in `.claudedocs/templates/` (documentation) or `scripts/data/rk/` (runnable seed data)? | Affects whether the seeder can read it directly. |

## Confirmed / Side / Unknowns

**Confirmed** — every count and every contaminated row above was read live from Frankfurt on
2026-09-07; the FK rules come from `information_schema`, not from reading the schema file.

**Side findings**
- RK's `template_key` is `None`, so it has no page-template identity to clone.
- `client_services` carries `booking` **inactive** — consistent with the registry fix (`28839f1`);
  a fresh barber clone should never get it at all.

**Unknowns**
1. Whether `جعفر` is inactive deliberately or because his staff setup link was never completed.
2. Whether the 5 store products should be part of a *barbershop* template at all, or belong to an
   optional "store add-on".
3. Whether RK's `config.hero`/`config.story` text is generic enough to parameterize, or needs
   rewriting per vertical — not inspected field-by-field here.
