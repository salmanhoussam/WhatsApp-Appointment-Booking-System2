# Production Data Hygiene — Deletion Review (pre-approval, nothing deleted)

Expands `.claudedocs/work/production-data-hygiene/2026-08-10/inventory.md` with the exact per-row
detail Salman asked for before approving anything: full field list per row, service/barber names
resolved (not just IDs), related-row counts, and each of the 7 uncertain rows explained
individually. Read-only queries only, re-run independently of the original investigation agent
(not trusting its output blind) via `venv/bin/python3` against the real `Reservation`/`StoreOrder`
tables, `clientId = 7ef5c8c9-3d47-4aa9-b5e0-43b746ee2657` (`rk`).

**Executed 2026-08-10 — see "Execution Results" section at the end of this file.** Everything
below this line is the original pre-approval review, left exactly as Salman reviewed it.

## Group A — `Barber` (3 rows recommended for deletion)

| id | name | created_at | reservations referencing it |
|---|---|---|---|
| `0d87ed78-c8a4-44a3-beee-cac2c4eb7b88` | Test Staff 1786124916 | 2026-08-07 17:49 | 0 |
| `ba5033de-b478-4d25-a7f4-e702968b0ee2` | Test Staff NetCheck 1786131600 | 2026-08-07 18:04 | 0 |
| `87d6c11a-fe22-4d08-8ead-22ef0e0138e5` | Regression Check Barber | 2026-08-09 11:06 | 0 |

Why safe: name pattern alone is unambiguous ("Test Staff" + Unix timestamp, "Regression Check"),
all `isActive=false`, zero reservations/qualifications/logins reference any of them (re-confirmed).

## Group B — `CatalogService` (2 rows recommended for deletion)

| id | name | price | created_at | reservations referencing it |
|---|---|---|---|---|
| `eaaabf7c-efd5-42d2-be32-e33ce3f098a5` | خدمة اختبار المتصفح ("browser test service") | $15 | 2026-08-09 | 0 |
| `867e7a28-cdcf-4025-b422-3537f82c5ed5` | خدمة تحقق نهائي ("final verification service") | $12 | 2026-08-09 | 0 |

Why safe: names are literal Arabic phrases for "browser test service" / "final verification
service" — not ambiguous. Zero reservations reference either.

## Group C — `StoreOrder` (5 rows recommended for deletion, full detail)

| id | customer_name | items | total | status | created_at | internal note |
|---|---|---|---|---|---|---|
| `c8ba498e-dd6e-4a61-9ee9-03d01f19bcd0` | زبون اختبار متجر حقيقي | 2 | $42.00 | pending | 2026-07-28 13:54 | "REAL E2E TEST — Store products (Catalog service/product split verification)" |
| `966b0cc5-ae37-40e3-851c-cb57b13e18c2` | Pilot Verify | 1 | $8.00 | cancelled | 2026-07-31 18:19 | "API-level pilot verification, cancel after" |
| `744566b9-bed9-4525-ae0e-b48806e0bb55` | Local Pilot Verify | 1 | $10.00 | cancelled | 2026-07-31 19:03 | "Local-Pilot journey re-verification over LAN IP" |
| `0daaba62-8c2b-43a4-9f71-c2826ac2f95d` | HTTPS Pilot Verify | 1 | $7.00 | cancelled | 2026-07-31 19:36 | "HTTPS Local-Pilot re-verification" |
| `84ff956a-0dd0-4abb-9580-e801b471c4ae` | Proxy Pilot Verify | 1 | $8.00 | cancelled | 2026-07-31 19:57 | "Single-origin proxy re-verification" |

Why safe: every single one has either a name that literally says "test"/"pilot verify" or an
internal note explicitly describing itself as a test/verification run. `StoreOrderItem` rows cascade
automatically on delete (`onDelete: Cascade`), 7 items total, all belonging only to these 5 orders.

## Group D — `Reservation`, the 32 recommended for deletion (full detail, every field)

| id | customer | phone | service | barber | status | reserved_at | created_at |
|---|---|---|---|---|---|---|---|
| `895e49a2` | زبون اختبار حقيقي | +96170000009 | — | — | pending | 2026-07-28 11:00 | 2026-07-27 16:22 |
| `15c4f1fd` | زائر تجربة القبول الحقيقي | +96170000099 | — | — | pending | 2026-07-29 11:00 | 2026-07-28 17:16 |
| `ebabb2a0` | زائر تجربة Phase 5 نهائي | +96170000125 | — | — | pending | 2026-07-29 13:00 | 2026-07-29 10:34 |
| `b43098be` | Test Patient | 70123456 | — | — | cancelled | 2026-07-31 10:00 | 2026-07-30 15:21 |
| `35963527` | Independence Test | 70123459 | — | — | cancelled | 2026-08-03 10:00 | 2026-07-30 15:22 |
| `c29a9ef5` | Fix Verify | 70199999 | — | — | cancelled | 2026-07-31 15:00 | 2026-07-30 16:02 |
| `f62baecb` | Status Verify | 70188888 | — | — | cancelled | 2026-07-31 16:00 | 2026-07-30 16:02 |
| `a8bda88f` | Base Slot | 70177001 | — | — | cancelled | 2026-08-03 11:00 | 2026-07-30 16:04 |
| `9865fad1` | Within New Hours | 70177004 | — | — | cancelled | 2026-08-03 10:30 | 2026-07-30 16:05 |
| `00c93dd0` | Availability Test Customer | 96170000099 | شعر ودقن | حسين | cancelled | 2026-08-03 11:00 | 2026-08-02 10:03 |
| `c237bf16` | Test Customer Two | +96170999888 | شعر | حسين | cancelled | 2026-08-02 11:30 | 2026-08-02 11:29 |
| `ec20df7e` | Journey Test Customer | +96170555444 | شعر | حسين | cancelled | 2026-08-03 09:00 | 2026-08-02 17:46 |
| `abc22337` | Secondary Test | +96170111222 | شعر | حسين | cancelled | 2026-08-06 09:00 | 2026-08-03 08:26 |
| `9f95968c` | حسام المعدّل | 78700000 | شعر ودقن | حسين | pending | 2026-08-04 10:30 | 2026-08-03 10:54 |
| `e4ab87b1` | Reschedule Test | +96170444555 | شعر | حسين | cancelled | 2026-08-06 10:00 | 2026-08-03 14:17 |
| `2a2612bb` | Conflict Blocker | +96170444556 | شعر | حسين | cancelled | 2026-08-06 11:00 | 2026-08-03 14:18 |
| `f97bf576` | Today View Test | +96170777888 | شعر | حسين | cancelled | 2026-08-03 16:15 | 2026-08-03 14:30 |
| `fa480c8a` | Conflict Guard | +96170999000 | شعر | حسين | cancelled | 2026-08-03 17:00 | 2026-08-03 15:03 |
| `66a3e85d` | Drag Fix Test | +96170333222 | شعر | حسين | pending | 2026-08-03 17:30 | 2026-08-03 17:16 |
| `215dd50b` | Conflict Reference | 70000001 | شعر | حسين | pending | 2026-08-05 14:00 | 2026-08-04 21:35 |
| `6268e2e7` | Conflict Reference 2 | 70000002 | شعر | حسين | pending | 2026-08-05 12:30 | 2026-08-04 21:36 |
| `9aa6c103` | Week Edit Test | +96170123123 | شعر | حسين | cancelled | 2026-08-05 11:00 | 2026-08-04 21:52 |
| `c9f34665` | Playwright Edited Name | +96170555001 | شعر | جعفر | cancelled | 2026-08-06 09:15 | 2026-08-04 21:59 |
| `bec27e28` | Jaafar Drag Test | 70444333 | شعر | جعفر | pending | 2026-08-05 16:15 | 2026-08-04 22:57 |
| `54478f5c` | Jaafar Drag Retry | 70444999 | شعر | جعفر | pending | 2026-08-06 14:30 | 2026-08-04 23:08 |
| `c91bee72` | Mobile Week Edit | 70000011 | تمشيط أو تسريح | حسين | cancelled | 2026-08-05 17:45 | 2026-08-05 13:50 |
| `5ed06d0a` | Phase 1.x Verify Public Create | 96170555111 | شعر | حسين | pending | 2026-08-05 20:00 | 2026-08-05 16:32 |
| `97d39b6b` | Phase 1.x Verify Admin Create | 96170555222 | شعر | حسين | pending | 2026-08-05 20:45 | 2026-08-05 16:37 |
| `796bfe3c` | Playwright Week Create Test | 70999888 | شعر | حسين | cancelled | 2026-08-08 11:45 | 2026-08-06 12:31 |
| `fedf7a5e` | Playwright Mobile Week Test | 70888777 | دقن | حسين | pending | 2026-08-08 15:45 | 2026-08-06 12:37 |
| `67c0efe9` | Jaafar Drag Test *(2nd occurrence)* | 70444333 | — | جعفر | pending | 2026-08-12 09:42 | 2026-08-09 09:42 |
| `1f57f5ff` | adel | 711111111 | شعر | جعفر | pending | 2026-08-09 15:30 | 2026-08-09 12:27 |

Note on `— / —` service/barber rows (first 9): those reservations predate Phase 3.7C's real
`Barber`/`CatalogService` split (2026-08-08) or use `moduleKey: "clinic"` — they never had a real
barber/service FK populated (an artifact of the module they were built to test, not a data-integrity
problem with today's schema).

Why each is safe: every single name is either a literal "Test"/"Verify"/"Playwright"/"Phase"
keyword, an implausible placeholder phone (`711111111`, `70000001`, `70000002`), or (`حسام المعدّل`
= "the edited Hassan") a name intentionally suffixed to prove an edit-flow test worked. None of
these 32 rows are referenced by any other table (`Reservation` has no incoming FKs).

## Group E — the 7 UNCERTAIN rows, individually, full detail

**Not recommended for deletion. This is the part that needs your judgment, not a re-read of the
database — presented with everything found, nothing decided.**

| id | customer | phone | service | barber | status | reserved_at | created_at |
|---|---|---|---|---|---|---|---|
| `7bc899e1` | زبون واتساب | عبر واتساب | شعر | حسين | pending | 2026-08-05 12:00 | 2026-08-03 07:56:03 |
| `63c0f3c5` | زبون واتساب | عبر واتساب | شعر | حسين | pending | 2026-08-04 13:00 | 2026-08-03 08:02:55 |
| `1cc82257` | زبون واتساب | عبر واتساب | شعر | حسين | pending | 2026-08-04 11:00 | 2026-08-03 08:04:39 |
| `2b8c74f2` | زبون واتساب | عبر واتساب | شعر | حسين | cancelled | 2026-08-06 11:00 | 2026-08-03 08:23:47 |
| `0ba470a6` | bo salo | 70111222 | شعر ودقن | حسين | pending | 2026-08-06 14:45 | 2026-08-06 11:01:42 |
| `391568ee` | ali aloka | 70222211 | شعر | حسين | pending | 2026-08-06 17:15 | 2026-08-06 11:12:08 |
| `a08640be` | ashraf kokha | 70121212 | شعر | حسين | pending | 2026-08-07 09:00 | 2026-08-06 11:20:57 |

**Why each is uncertain, spelled out (not just "uncertain"):**

- **The 4 "زبون واتساب" rows**: `customer_phone` is literally the Arabic words "via WhatsApp," not
  a real phone number — that alone is a real, structural gap (this booking has no way to actually
  contact the customer), regardless of whether the booking itself is real. All 4 were created within
  a 27-minute window on the same morning (07:56:03 → 08:23:47, 2026-08-03) — tighter clustering than
  four independent real walk-in/phone bookings taken over a normal business day would typically
  show, but not impossible if a staff member was batch-entering a morning's worth of phone bookings
  at once. **The real question for you**: does `rk`'s staff actually log phone/WhatsApp-taken
  bookings this way (name placeholder, no real number)? If yes, these are real, and the fix is
  adding a real phone-capture step to that workflow, not deleting the bookings.
- **`bo salo` / `ali aloka` / `ashraf kokha`**: none match any test-keyword pattern — they read as
  plausible informal real customer names. Created within a *19-minute* window (11:01:42 → 11:20:57,
  2026-08-06), each roughly 10 minutes apart. Phone numbers are valid-length (8 digits) but visibly
  patterned (`70111222`, `70222211`, `70121212` — repeating/alternating pairs), which is also
  exactly what a developer typing throwaway test data by hand tends to produce. **The real question
  for you**: do these three names match any real walk-in customers RK actually had on 2026-08-06?

## Decision Requested

1. Approve deletion of the 42 rows across Groups A–D (all cascading effects re-confirmed clean,
   zero orphaning)?
2. For each of the 7 Group E rows: real (keep, and separately fix the missing-phone-number gap for
   the WhatsApp ones) or test (add to the deletion list)?

Nothing executes until both are answered.

---

## Execution Results — 2026-08-10

**Decision**: Salman approved deletion of exactly the 42 rows in Groups A–D. All 7 Group E
(uncertain) rows explicitly preserved, unchanged — no decision made on them yet, still open.

**Script**: `scripts/cleanup_rk_test_data_20260810.py` — explicit hardcoded ID lists only (no
pattern/LIKE delete), every delete scoped by both `id` and `clientId`, single database transaction
(all-or-nothing), children (`Reservation`) deleted before parents (`Barber`/`CatalogService`).

### Step 1 — Final pre-delete re-verification (immediately before deleting, not reused from the
earlier review)

- Re-confirmed all 42 target rows still present: 3 barbers, 2 services, 5 orders, 32 reservations.
- Re-ran the cascading-effects check fresh: **zero** reservations referenced any of the 3 test
  barbers or 2 test services (re-confirmed, not assumed from the earlier pass).

### Step 2 — Pre-delete snapshot

| Table | Count (clientId=rk) |
|---|---|
| Barber | 5 |
| CatalogService | 8 |
| StoreOrder | 5 |
| StoreOrderItem | 6 |
| Reservation | 39 |

Full field-level fingerprint taken of every row **not** in a deletion list (2 barbers, 6 services,
0 orders, 7 reservations — the 7 uncertain ones) for exact before/after comparison.

### Step 3 — Delete (single transaction)

Deleted: **32 reservations, 3 barbers, 2 services, 5 orders — exactly 42 rows**, confirmed by the
script's own count of rows the delete calls reported affected, matching the pre-approved list
exactly (no more, no less).

**Exact deleted IDs:**

- **Barber (3)**: `0d87ed78-c8a4-44a3-beee-cac2c4eb7b88`, `ba5033de-b478-4d25-a7f4-e702968b0ee2`,
  `87d6c11a-fe22-4d08-8ead-22ef0e0138e5`
- **CatalogService (2)**: `eaaabf7c-efd5-42d2-be32-e33ce3f098a5`,
  `867e7a28-cdcf-4025-b422-3537f82c5ed5`
- **StoreOrder (5)**: `c8ba498e-dd6e-4a61-9ee9-03d01f19bcd0`, `966b0cc5-ae37-40e3-851c-cb57b13e18c2`,
  `744566b9-bed9-4525-ae0e-b48806e0bb55`, `0daaba62-8c2b-43a4-9f71-c2826ac2f95d`,
  `84ff956a-0dd0-4abb-9580-e801b471c4ae`
- **Reservation (32)**: `895e49a2-12e6-44ac-a026-c7c14f7e7617`, `15c4f1fd-faa8-414b-8de3-d2833f334f74`,
  `ebabb2a0-7332-48a5-9295-9c9b2c5b5b59`, `b43098be-f6e0-482b-8da9-7d05428d7b4e`,
  `35963527-f834-4a6f-bb54-8ba8a305b5f9`, `c29a9ef5-2b7c-4fa0-a692-8136d8ba732f`,
  `f62baecb-f8ad-471e-bf70-343be15f44e1`, `a8bda88f-3880-43ce-b900-79507ac7a361`,
  `9865fad1-6192-4684-afbc-ef78870b416d`, `00c93dd0-4e79-4d1c-9c72-a0ee81937ccc`,
  `c237bf16-6310-48c5-8138-568f7cbcc620`, `ec20df7e-a9f8-4e05-9aeb-6dc1b630c8c4`,
  `abc22337-c712-4938-9b01-e52e5939026e`, `9f95968c-6b03-4990-9458-8e15d986e4a7`,
  `e4ab87b1-224f-4016-869e-f01012f7176a`, `2a2612bb-aa66-4619-b493-ae90e7dabd21`,
  `f97bf576-b186-4327-9049-ffc4a9163f05`, `fa480c8a-8b03-4bcb-9ce8-9558b9c80760`,
  `66a3e85d-fae5-4452-9d95-773de966f8ff`, `215dd50b-7f02-4709-8efc-06c996277ec0`,
  `6268e2e7-d2ff-49b1-86ae-befb0de70f76`, `9aa6c103-dcb5-402e-98c8-0d8ba45a0d0e`,
  `c9f34665-c783-4b93-ad8d-f5b0f5d981c6`, `bec27e28-d0c5-4fa0-adaa-a7b9360d14a1`,
  `54478f5c-af76-4888-ba00-e43b6dc52279`, `c91bee72-6093-40ea-8af7-23a14f8afafb`,
  `5ed06d0a-1ac1-4b3e-aae8-f17f850d5573`, `97d39b6b-3835-4783-9397-a1f43c748178`,
  `796bfe3c-168c-4f4b-9b05-a9824ec31f72`, `fedf7a5e-5f5a-40e3-b35e-9978150edf1d`,
  `67c0efe9-64fb-479f-a519-f5043f2ca1ee`, `1f57f5ff-af5a-4011-b84f-acaaf9b9899f`

### Step 4 — Post-delete verification

| Table | Pre | Post | Expected delta | Actual delta |
|---|---|---|---|---|
| Barber | 5 | **2** | −3 | −3 ✅ |
| CatalogService | 8 | **6** | −2 | −2 ✅ |
| StoreOrder | 5 | **0** | −5 | −5 ✅ |
| StoreOrderItem | 6 | **0** | (cascade, no direct delete) | −6 ✅ |
| Reservation | 39 | **7** | −32 | −32 ✅ |

- **Exactly 42 rows removed** — confirmed by both the transaction's own reported delete counts and
  the independent before/after count diff, matching each other.
- **All 7 uncertain reservations still exist, byte-identical** to their pre-delete field values
  (full fingerprint comparison, not just an existence check).
- **Every other non-deleted row in all 4 tables is byte-identical** to its pre-delete state (the 2
  remaining real barbers, 6 remaining real services, and the 7 remaining reservations) — no
  unrelated row was touched.
- **No FK/integrity errors** — the transaction committed cleanly; `StoreOrderItem`'s
  `onDelete: Cascade` correctly removed all 6 child rows automatically when their 5 parent orders
  were deleted, confirmed by the count dropping to exactly 0.

### Smoke Checks (post-delete, real backend, real requests)

- `venv/bin/python3 -c "from app.main import app"` → imports cleanly.
- `GET /api/v1/public/reservations/barbers?client_slug=rk` → `200`, returns exactly the 2 real
  barbers (`حسين`, `جعفر`) — no test entries.
- `GET /api/v1/public/reservations/catalog-services?client_slug=rk` → `200`, 6 services (matches
  8 − 2).
- `GET /api/v1/admin/reservations/?client_slug=rk` (real Tenant Owner login) → `200`, 7
  reservations (matches the 7 preserved uncertain rows exactly).

## Still Open

The 7 uncertain `Reservation` rows remain exactly as they were — no decision made on them. Salman's
own two questions from the original review are still the open item:
1. Does RK's staff actually log phone/WhatsApp-taken bookings with a name placeholder and no real
   number (the 4 "زبون واتساب" rows)?
2. Do "bo salo" / "ali aloka" / "ashraf kokha" match real walk-in customers from 2026-08-06?
