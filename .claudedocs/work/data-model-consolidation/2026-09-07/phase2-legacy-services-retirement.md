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
