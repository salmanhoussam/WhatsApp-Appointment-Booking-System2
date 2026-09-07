# Phase 2 — retiring the legacy `services` table

## 2a — the three missing columns (CLOSED)

`catalog_services` gained `property_id`, `pricing_unit`, `is_included` — the only things the legacy
model carried that it could not express. Applied via
`scripts/apply_catalog_service_stay_addon_migration.py` through `_db_target.py`.

Additive: all 19 pre-existing rows correctly defaulted (`is_included=false`, the other two NULL),
because a barber service genuinely is not property-bound, has no pricing unit, and is not bundled.

## 2b — the data move (CLOSED)

10 legacy rows → **9 migrated, 1 deleted**.

| tenant | rows | handling |
|---|---|---|
| `smar` | 7 | real hotel/stay add-ons — migrated into smar's **already-existing, empty** `الخدمات` category (`cb3a445b…`), not a category invented for the occasion |
| `barberlab-test` | 2 | had **no `catalog_categories` at all** — one was created. Test tenant, migrated anyway so Phase 2d can drop the table |
| `rk` | 1 | `تنظيف أسنان` — teeth cleaning, in a barber shop, already `is_active=false`. **Deleted.** Migrating contamination only moves it |

### Two guards that mattered

**`booking_services` emptiness is checked at run time, not assumed.** The script does not preserve
ids, and `booking_services` is the only table referencing `services.id`. It holds 0 rows
platform-wide, so nothing breaks — and the script aborts if that is ever untrue.

**A real failure, caught and rolled back.** The first `--execute` attempt died on
`null value in column "updated_at"`. `updated_at` is Prisma's `@updatedAt` — managed in the
application layer, so the column has **no database default** and a raw INSERT omitting it violates
NOT NULL. Because the commit sits at the end of the script, the whole transaction rolled back:
verified immediately afterwards at 19 `catalog_services` / 10 `services` / no stray category —
**nothing partial was left behind.** Fixed by setting `updated_at` explicitly, then re-run.

### Verification — field by field, not a row count

Every migrated row joined back to its legacy source and compared on price, currency, is_active,
is_included, pricing_unit, property_id and name_en:

```
✅ barberlab-test  تحديد لحية          dur=15
✅ barberlab-test  قص شعر              dur=30
✅ smar            إفطار               dur=30
✅ smar            دخول المسبح          dur=30
✅ smar            دخول المسبح للزوار   dur=30
✅ smar            سرير أريكة إضافي     dur=30
✅ smar            سرير أطفال           dur=30
✅ smar            مساج                dur=30
✅ smar            مناشف شاطئ           dur=30

9 pairs compared · 0 mismatches
rk contamination remaining: 0   (expect 0)
rows carrying a real property_id: 3   (expect 3)
```

`dur=30` on smar's seven is the documented default: their legacy `duration` was NULL, because a
stay add-on has no slot length. They attach to `Booking`, never `Reservation`, so they never reach
the slot math that needs the int.

### State after 2b

```
catalog_services: alzabt-demo 6 · barberlab-test 2 · mr-h 6 · rk 7 · smar 7
legacy services:  9 rows, left in place deliberately as the rollback until 2d
```

## Still to do

- **2c** — repoint every reader (`public_service.py`, `service_repo.py`, `service_service.py`,
  `admin/services.py`, `smar/admin/components/ServicesTab.jsx`).
- **2d** — drop `services` and `booking_services`.

---

## 2c — repointing the readers (CLOSED)

Four live call sites moved from `Service` to `CatalogService`:

| file | what |
|---|---|
| `app/repositories/service_repo.py` | every query; plus a new `find_or_create_services_category()` |
| `app/api/v1/admin/services.py` | `_fmt` serialiser, create payload, patch mapping |
| `app/repositories/public_repo.py` | `list_active_services_for_client` |
| `app/services/public_service.py` | unit-detail add-ons · catalog `include` · booking price calc |

**External shapes deliberately unchanged.** The admin route still answers with
`name_ar / base_price / duration / sort_order / is_active`; the public catalog still answers with
`"services"` and `"basePrice"`. Checked against `ServicesTab.jsx` line by line — it reads exactly
those keys, so **zero frontend edits** were needed and a column rename cannot reach the UI.

### Two things the move surfaced

**`booking_services` was the blocker, and is NOT dropped.** Its FK pointed at `services`, so the
moment the booking flow priced add-ons from `catalog_services` it would write ids that FK rejects.
The approved plan said drop it; the write is **live** — `create_booking()` still records these rows
for smar's stay add-ons — so dropping it would leave the add-on money inside `totalPrice` with no
record of *which* add-ons were bought. Repointed instead (`services` → `catalog_services`, one
statement, table empty). **Salman's call to revisit, flagged rather than executed as written.**

**A latent bug fixed by accident.** The unit-detail serialiser asked the legacy row for
`description_en`, a column that never existed on that model, so the `getattr` fallback always
returned `""`. `CatalogService` has real `descriptionAr`/`descriptionEn`, so it now returns actual
content.

## 2d — dropping the table (CLOSED)

Removed: the `services` table, the `Service` model and its `Client`/`Property` relations, and
`service_service.py` + `booking_service_service.py` — both wrapped the retired model and had **zero
callers**; only a wildcard re-export in `services/__init__.py` kept them reachable.

Three preconditions, all checked at run time, any of them fatal:

```
✅ 9 rows · 0 without a catalog_services counterpart
✅ foreign keys still pointing at `services`: none
✅ full 9-row snapshot written before the DROP
to_regclass('public.services') -> None
catalog_services rows: 28
```

## ⚠️ Real consequence — a self-inflicted outage window

Dropping the table while **production still ran pre-2c code** broke `GET /public/smar/listings`
immediately: `get_client_catalog` queried the now-missing table, its `except` returned `None`, and
the route answered `404 Client not found`. Measured, not theorised:

```
/smar/listings -> 404  {"success":false,"error":{"code":"NOT_FOUND","message":"Client not found"}}
/smar/config   -> 200
```

**The ordering was wrong.** Code that stops using a table must be deployed *before* the table is
dropped, not in the same breath. Closed by pushing `2d464d7` straight away; the window is the
deploy latency.

Worth generalising: the same trap applies to every remaining phase that drops or renames a column
(`store_customers` in Phase 3). **Deploy the reader change first, confirm it live, then drop.**
