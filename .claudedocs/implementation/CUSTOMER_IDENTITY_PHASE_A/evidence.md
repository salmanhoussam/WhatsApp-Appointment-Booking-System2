# Phase A — Data Foundation (Customer Identity + WhatsApp Booking Study)

Implements Phase A of `.claude/plans/we-moved-on-new-hazy-barto.md`, approved by Salman
2026-08-24 ("You have a clear GO to execute Phase A exclusively"). Phase B (WhatsApp
config/webhook) explicitly **not started**, per instruction.

## What changed

### 1. `Reservation.customerId` (nullable FK, additive)
- `prisma/schema.prisma` — `Reservation.customerId String? @db.Uuid` + `customer Customer?`
  relation, `onDelete: SetNull` (mirrors `barberId`/`serviceId`/`resourceId` on the same model
  exactly). `Customer` gained the opposite-side `reservations Reservation[]`. New
  `@@index([clientId, customerId])`.
- `prisma/migrations/add_reservation_customer_id.sql` — real, additive SQL (matches this
  project's own migration-file convention), applied via `prisma db push` (confirmed against the
  live DB — see Verification).

### 2. `create_reservation()` — Customer find-or-create
`app/services/reservation_service.py` — before building `create_data`, resolves/creates a
`Customer` via `CustomerRepository.get_by_phone(phone, client_id)` → create if not found. Sets
`create_data["customerId"] = customer.id`. `customerName`/`customerPhone`/`customerEmail` fields
are unchanged — kept as the permanent historical snapshot (Hybrid decision, Study 1). Reuses
`CustomerRepository` verbatim, no changes to that class's public methods' signatures.

### 3. Server-side status-transition guard
`app/services/reservation_service.py` — new `TRANSITIONS` dict (mirrors
`frontend/src/pages/generic-admin/tabs/ReservationsTab.jsx`'s own `TRANSITIONS` exactly).
`update_status()` now always fetches the reservation first (previously only for STAFF calls),
and raises `ValueError` (→ real `400`, same existing exception-handling pattern the route already
had) if `new_status` isn't a valid transition from the current status. Same-status calls
(idempotent no-op) are explicitly allowed.

### 4. Eight multi-tenant clientId-scoping fixes (Study 7 findings)
Each repository function below previously queried by `id` alone with no `clientId` in its own
`where` clause — every real caller happened to pre-check tenant ownership first, so none were
exploited, but none independently enforced this project's own `rules/global.md` rule. Fixed via
the same pattern `reservation_repo.py` already used correctly: `update_many(where={"id":...,
"clientId":...})` + re-fetch for the caller (since `update_many` returns a count, not the row).

| Function | File | Fix |
|---|---|---|
| `update_barber` | `barber_repo.py` | +`client_id` param, `update_many`+refetch |
| `upsert_system_customer` | `customer_repo.py` | real compound-unique `clientId_phone` selector (was `phone` alone — not even a valid standalone unique key on `Customer`) |
| `update_catalog_service` | `catalog_service_repo.py` | +`client_id` param, `update_many`+refetch |
| `update_category` | `admin_catalog_repo.py` | +`client_id` param, `update_many`+refetch |
| `soft_delete_category` (2nd call) | `admin_catalog_repo.py` | its 2nd Prisma call, `update_many`+refetch (1st call was already correct) |
| `update_item` | `admin_catalog_repo.py` | +`client_id` param, `update_many`+refetch |
| `soft_delete_item` | `admin_catalog_repo.py` | +`client_id` param, `update_many`+refetch |

Every real caller of these 7 functions was found and updated to pass `client_id` — including two
NOT originally listed in Study 7's own file scope, found only while fixing the calls:
`app/api/v1/admin/store.py` and `app/api/v1/admin/restaurant.py` both import `admin_catalog_repo`
directly as `_cat_repo` (the already-known Catalog dual-write-path — `store.py`/`restaurant.py`
bypass `catalog_service.py`) and call `update_category`/`update_item` with the old 2-arg
signature. Both fixed (4 call sites) — otherwise Store and Restaurant admin category/item editing
would have broken on deploy. Confirmed via an exhaustive repo-wide grep after every other fix, not
assumed complete.

## Real browser/API verification (localhost, real dev server, real DB — not code-inspection-only)

Backend restarted after all changes; confirmed clean import
(`python -c "from app.main import app"` → no error) and `db push`/`generate` both succeeded
against the live Supabase DB (confirmed via `information_schema.columns`/
`information_schema.table_constraints` — real `customer_id` UUID column + real
`reservations_customer_id_fkey` FK exist).

### Customer find-or-create (real guest bookings via `POST /public/reservations/`, rk)
- Booking 1 (`PHASE-A-TEST-1`, phone `70011122`) → real `201`-equivalent success, real reservation
  id `ca23d0de-...`.
- Booking 2, same phone, different reserved time, **different typed name**
  (`PHASE-A-TEST-1-DIFFERENT-NAME`) → real success, id `d05dd0a2-...`.
- Direct DB read: both reservations' `customerId` are the **same** real `Customer` row
  (`4c62e0f8-...`) — find-or-create correctly avoided a duplicate. `customers` count for that
  phone: exactly 1, not 2. Matches the documented Study 1 behavior: the second booking's different
  typed name did **not** overwrite the stored `Customer.name` (still reads `PHASE-A-TEST-1`) —
  same limitation the Booking engine already has, now confirmed identical for Reservation.

### Status-transition guard (real `PATCH /admin/reservations/{id}/status`, rk TENANT_ADMIN JWT)
- `pending → cancelled` (valid) → real `200`.
- `cancelled → confirmed` (invalid, the exact gap Study 5 found) → real `400`,
  `"Cannot change status from 'cancelled' to 'confirmed'."` — **the previously-open gap is now
  closed**, confirmed live, not just by code inspection.
- `pending → confirmed` (valid, on a second reservation) → real `200`.
- `confirmed → confirmed` (same-status no-op) → real `200`, no error.

### Multi-tenant scoping fixes — real regression + a real negative proof
- `update_barber`: real `PATCH /admin/barbers/{id}` on حسين (rk) → real `200`, description
  updated then reverted.
- `update_catalog_service`: real `PATCH /admin/catalog-services/{id}` on شعر (rk) → real `200`.
- `update_category` (store.py dual-write-path): real `PATCH /admin/store/categories/{id}` on a
  real category (`beit-al-fakhar`) → real `200`.
- `update_item`: direct call to the fixed function with `beit-al-fakhar`'s own real `client_id` →
  real success, no-op `sortOrder` write confirmed round-tripped correctly.
  - **Real cross-tenant negative test**: the exact same call repeated with **rk's** `client_id`
    instead of `beit-al-fakhar`'s (i.e. simulating what the pre-fix code would have allowed) →
    correctly returned `None` (no row matched), and the real item's `sortOrder` in the DB was
    confirmed **unchanged** — direct, live proof the clientId scoping now actually blocks a
    cross-tenant write that the old code would have silently allowed.
- `upsert_system_customer`: real call with the new compound `clientId_phone` selector → creates a
  real row; called a second time with identical args → reuses the same row (real upsert
  semantics, not a duplicate) — confirmed via `count` before/after. Test row deleted afterward.
- `soft_delete_category`/`soft_delete_item`: **not exercised against real live data** (both are
  destructive — they set `isActive=False` on a real tenant's real row) — relied on being the
  identical `update_many`+`clientId` pattern already proven correct by `update_category`/
  `update_item` above in the same file, rather than mutating real production rows for a
  low-risk, already-pattern-proven fix.

### `onDelete: SetNull` — real proof
Deleted the disposable test `Customer` row after use → both real test reservations' `customerId`
correctly reverted to `null` (confirmed via direct DB read) with the reservations themselves
untouched — the exact FK behavior the schema comment claims, now verified live, not assumed.

### Cleanup
- Both real test reservations (`ca23d0de-...`, `d05dd0a2-...`) — created via the real public
  booking flow — are `cancelled` (soft-cancel via the real admin status endpoint, this project's
  established convention).
- The disposable test `Customer` row was hard-deleted (Customer has no soft-delete/status concept
  in this schema, unlike Reservation) — confirmed via `onDelete: SetNull` proof above that this
  was safe.
- The disposable `upsert_system_customer` test row was hard-deleted.
- No raw/destructive DB writes were made outside the app's own real repository functions and admin
  API — every write in this verification pass went through the actual code being tested.

## Acceptance — checked against Phase A's own scope in the plan

- [x] `Reservation.customerId` added (nullable FK, additive, `onDelete: SetNull`) — real migration
      applied to the live DB.
- [x] `create_reservation()` uses the find-or-create Customer step.
- [x] All 8 Study 7 clientId-scoping FLAGs fixed, plus their real callers (including 2 dual-write
      call sites not in Study 7's original file list, found only while fixing this).
- [x] Server-side status-transition guard added to `update_status()`.
- [x] Backend imports cleanly; real DB schema confirmed in sync.
- [x] Real functional verification for every change — not code-inspection-only.
- [x] No Phase B / WhatsApp config work started, per explicit instruction.
- [x] All real test data cleaned up (cancelled reservations, deleted disposable Customer rows).

## Explicitly out of scope for this pass (per instruction)

WhatsApp credentials, webhook, per-tenant config, encryption utility (`SECRET_ENCRYPTION_KEY`) —
none touched. Phase B starts only on a future, separate authorization.
