# Production Data Hygiene Inventory — `rk` (RK Barber Shop)

**Investigation type:** Read-only DB inventory (per `investigation-protocol.md` — Confirmed / Side
Findings / Unknowns discipline). No DELETE/UPDATE queries were run. No code files were modified.

**Client ID investigated:** `7ef5c8c9-3d47-4aa9-b5e0-43b746ee2657` (`rk`, RK Barber Shop)

**Method:** A standalone read-only script
(`/tmp/.../scratchpad/investigate_rk.py`, not committed to the repo) connected via the project's
own Prisma Python client (same `prisma/schema.prisma` this project uses) and ran `find_many()`
reads only, scoped to `clientId = 7ef5c8c9-3d47-4aa9-b5e0-43b746ee2657`, against: `Barber`,
`CatalogService` (+ `category` include), `CatalogItem` (+ `category` include, filtered to
`category.moduleKey == 'store'`), `StoreOrder` (+ `items` + `catalogItem` include), `Reservation`
(+ `barber` + `service` + `resource` include), `BarberService` (bridge table, for cascading-effects
checks only), and `User` (for cascading-effects checks on Staff↔Barber links only). Raw output was
captured to a local JSON file before this report was written; every row below is transcribed from
that real query output, not summarized from memory.

**Overview "آخر النشاطات" (Recent Activity) widget — no separate table exists.** Confirmed by
reading `frontend/src/pages/generic-admin/components/ActivityFeed.jsx` (lines 29–56,
`buildFeed()`): the feed is built client-side by merging an `orders` prop with a live
`GET /reservations/` call and sorting by `created_at`. The `orders` prop itself is fetched by the
parent, `frontend/src/pages/generic-admin/tabs/OverviewTab.jsx` line 575:
`adminApi.get(\`/${orderEndpoint}/orders\`)` — i.e. `StoreOrder` rows. **There is no dedicated
"activity" table or repository query** — the QA noise on Overview is a direct downstream symptom
of the same `StoreOrder` and `Reservation` rows already inventoried below (Tables 4 and 5). No
additional table needed investigating for item 6.

---

## Table 1 — `Barber` (5 rows)

| id (8) | name | created_at | classification | reasoning |
|---|---|---|---|---|
| `f64ce71e` | حسين | 2026-08-02 09:38 | **REAL** | Genuine Arabic staff name, `isActive=true`, real working hours (09:00–21:00, closed Monday), 22 reservations attached (see Table 5) |
| `c75b89c3` | جعفر | 2026-08-04 21:37 | **REAL** | Genuine Arabic staff name, `isActive=true`, real working hours, 4 reservations attached, has a real `STAFF`-role login account (see Users, below) |
| `0d87ed78` | Test Staff 1786124916 | 2026-08-07 17:49 | **TEST/QA** | Name literally starts with "Test Staff" + a Unix-timestamp suffix; description field reads "وصف محدث بعد الرفع" ("description updated after upload" — a test-verification artifact); `isActive=false` |
| `ba5033de` | Test Staff NetCheck 1786131600 | 2026-08-07 18:04 | **TEST/QA** | "Test Staff NetCheck" + Unix-timestamp suffix; `isActive=false` |
| `87d6c11a` | Regression Check Barber | 2026-08-09 11:06 | **TEST/QA** | Name is literally "Regression Check Barber"; `isActive=false`, no working hours set |

**Summary:** 2 REAL, 3 TEST/QA, 0 UNCERTAIN.

---

## Table 2 — `CatalogService` (8 rows, category "الخدمات")

| id (8) | name (ar/en) | price | created_at | classification | reasoning |
|---|---|---|---|---|---|
| `71502964` | شعر / Hair | $5 | 2026-07-25 | **REAL** | Genuine service name/price, 22 reservations reference it |
| `2586960c` | شعر ودقن / Haircut | $5 | 2026-07-25 | **REAL** | Genuine service, referenced by 3 reservations |
| `067df2d2` | كرياتين / Keratin | $5 | 2026-07-25 | **REAL** | Genuine service, no red flags |
| `6e19f65e` | دقن | $5 | 2026-08-03 | **REAL** | Genuine service, referenced by 1 reservation |
| `5f34412f` | تمشيط أو تسريح | $5 | 2026-08-03 | **REAL** | Genuine service, referenced by 1 reservation |
| `88a280b2` | حنة أو صبغة | $5 | 2026-08-03 | **REAL** | Genuine service, no red flags |
| `eaaabf7c` | خدمة اختبار المتصفح ("browser test service") | $15 | 2026-08-09 | **TEST/QA** | Name literally translates to "browser test service" |
| `867e7a28` | خدمة تحقق نهائي ("final verification service") | $12 | 2026-08-09 | **TEST/QA** | Name literally translates to "final verification service" |

**Summary:** 6 REAL, 2 TEST/QA, 0 UNCERTAIN.

**Side finding (not itself a test/QA classification issue, flagged for Salman separately):** all 6
REAL `CatalogService` rows above share the *exact same UUID* as 6 `CatalogItem` rows found in Table
3b (`categoryModuleKey: "catalog"`) — e.g. `71502964-79f0-4840-b676-ab1882402a13` exists as both a
`CatalogService` row named "شعر" and a `CatalogItem` row named "شعر", identical id, identical name.
This is consistent with the Phase 3.7C (2026-08-08) `CatalogService` split described in
`prisma/schema.prisma` lines 474–489 — the old `CatalogItem` rows (from before the split, when
services lived in `CatalogItem` gated by `metadata.requires_booking`) appear to still exist,
un-deleted, sharing IDs with their new `CatalogService` counterparts. This is a real data-hygiene
question but **not** a test/QA question — these are duplicate REAL rows from an incomplete
migration cleanup, not fake data — so it is **out of scope for this test/QA deletion list** and is
called out here only so it isn't lost. Recommend a separate, dedicated investigation (owned by
whoever ran the Phase 3.7C migration) before any cleanup touches `CatalogItem` rows with
`categoryModuleKey: "catalog"`.

---

## Table 3a — `CatalogItem` where `category.moduleKey == 'store'` (4 rows)

| id (8) | name (ar/en) | price | is_active | created_at | classification | reasoning |
|---|---|---|---|---|---|---|
| `c03fba21` | سبراي تثبيت الشعر / Hair Fixing Spray | $8 | false | 2026-07-28 | **REAL** | Plausible real barbershop retail product, no test-name pattern |
| `49ceda8a` | واكس تصفيف الشعر / Styling Wax | $10 | false | 2026-07-28 | **REAL** | Plausible real product |
| `7e989961` | جل تصفيف الشعر / Styling Gel | $7 | false | 2026-07-28 | **REAL** | Plausible real product |
| `8dde72f3` | عطر ريحة رجالي / Mens Cologne | $22 | false | 2026-07-28 | **REAL** | Plausible real product |

**Summary:** 4 REAL, 0 TEST/QA, 0 UNCERTAIN.

**Note (not a classification, a status flag):** all 4 rows have `is_active = false`. This looks
like a real product catalog that simply hasn't been switched on for public sale yet, not a test
artifact — the names/prices are exactly what a real barbershop retail shelf would carry, with no
"Test"/timestamp/"Verify" markers. **Not recommended for deletion** — this is a launch-readiness
question for Salman/the shop owner, separate from test-data cleanup.

## Table 3b — `CatalogItem`, all module keys (10 rows, for cross-check / context only)

| id (8) | name | categoryModuleKey | created_at |
|---|---|---|---|
| `71502964` | شعر | catalog | 2026-07-25 |
| `2586960c` | شعر ودقن | catalog | 2026-07-25 |
| `067df2d2` | كرياتين | catalog | 2026-07-25 |
| `c03fba21` | سبراي تثبيت الشعر | store | 2026-07-28 |
| `49ceda8a` | واكس تصفيف الشعر | store | 2026-07-28 |
| `7e989961` | جل تصفيف الشعر | store | 2026-07-28 |
| `8dde72f3` | عطر ريحة رجالي | store | 2026-07-28 |
| `6e19f65e` | دقن | catalog | 2026-08-03 |
| `5f34412f` | تمشيط أو تسريح | catalog | 2026-08-03 |
| `88a280b2` | حنة أو صبغة | catalog | 2026-08-03 |

(The 6 `moduleKey: "catalog"` rows are the duplicate-ID side finding noted under Table 2 — not
separately classified here, since they are identity-duplicates of already-classified REAL
`CatalogService` rows, not distinct test data.)

---

## Table 4 — `StoreOrder` (5 rows)

| id (8) | customer_name | total | status | notes | created_at | classification | reasoning |
|---|---|---|---|---|---|---|---|
| `c8ba498e` | زبون اختبار متجر حقيقي | $42.00 | pending | "REAL E2E TEST -- Store products (Catalog service/product split verification)" | 2026-07-28 | **TEST/QA** | Customer name literally means "real test store customer"; internal note explicitly says "REAL E2E TEST" — the exact row named in the Product Review that triggered this investigation |
| `966b0cc5` | Pilot Verify | $8.00 | cancelled | "API-level pilot verification, cancel after" | 2026-07-31 | **TEST/QA** | Name + note explicitly describe a Pilot verification run |
| `744566b9` | Local Pilot Verify | $10.00 | cancelled | "Local-Pilot journey re-verification over LAN IP" | 2026-07-31 | **TEST/QA** | Same pattern, LAN-IP re-verification run |
| `0daaba62` | HTTPS Pilot Verify | $7.00 | cancelled | "HTTPS Local-Pilot re-verification" | 2026-07-31 | **TEST/QA** | Same pattern, HTTPS re-verification run |
| `84ff956a` | Proxy Pilot Verify | $8.00 | cancelled | "Single-origin proxy re-verification" | 2026-07-31 | **TEST/QA** | Same pattern, proxy re-verification run |

**Summary: 0 REAL, 5 TEST/QA, 0 UNCERTAIN.** Every `StoreOrder` currently in `rk`'s database is a
test/QA artifact from the Store Pilot verification passes (2026-07-28 through 2026-07-31). There is
currently **no real store order** on record for `rk`.

---

## Table 5 — `Reservation` (39 rows)

| id (8) | module_key | customer_name | customer_phone | status | created_at | classification | reasoning |
|---|---|---|---|---|---|---|---|
| `895e49a2` | services | زبون اختبار حقيقي | +96170000009 | pending | 2026-07-27 | **TEST/QA** | Name means "real test customer"; note explicitly "REAL TEST BOOKING -- End-to-End Reservations Calendar verification" |
| `15c4f1fd` | services | زائر تجربة القبول الحقيقي | +96170000099 | pending | 2026-07-28 | **TEST/QA** | Name means "real acceptance-test visitor" |
| `ebabb2a0` | services | زائر تجربة Phase 5 نهائي | +96170000125 | pending | 2026-07-29 | **TEST/QA** | Name means "Phase 5 final test visitor" |
| `b43098be` | clinic | Test Patient | 70123456 | cancelled | 2026-07-30 | **TEST/QA** | Literal "Test Patient"; also `moduleKey: "clinic"` — not even rk's real module ("barber"/"services") — leftover from the Clinic Reservation Strategy build |
| `35963527` | clinic | Independence Test | 70123459 | cancelled | 2026-07-30 | **TEST/QA** | Literal "Independence Test"; wrong module (clinic) |
| `c29a9ef5` | clinic | Fix Verify | 70199999 | cancelled | 2026-07-30 | **TEST/QA** | Literal "Fix Verify"; wrong module |
| `f62baecb` | clinic | Status Verify | 70188888 | cancelled | 2026-07-30 | **TEST/QA** | Literal "Status Verify"; wrong module |
| `a8bda88f` | clinic | Base Slot | 70177001 | cancelled | 2026-07-30 | **TEST/QA** | Generic slot-test label; wrong module |
| `9865fad1` | clinic | Within New Hours | 70177004 | cancelled | 2026-07-30 | **TEST/QA** | Working-hours test label; wrong module |
| `00c93dd0` | barber | Availability Test Customer | 96170000099 | cancelled | 2026-08-02 | **TEST/QA** | Literal "Availability Test Customer" |
| `c237bf16` | barber | Test Customer Two | +96170999888 | cancelled | 2026-08-02 | **TEST/QA** | Literal "Test Customer Two" |
| `ec20df7e` | barber | Journey Test Customer | +96170555444 | cancelled | 2026-08-02 | **TEST/QA** | Literal "Journey Test Customer" |
| `7bc899e1` | barber | زبون واتساب | عبر واتساب | pending | 2026-08-03 | **UNCERTAIN** | See note A below |
| `63c0f3c5` | barber | زبون واتساب | عبر واتساب | pending | 2026-08-03 | **UNCERTAIN** | See note A below |
| `1cc82257` | barber | زبون واتساب | عبر واتساب | pending | 2026-08-03 | **UNCERTAIN** | See note A below |
| `2b8c74f2` | barber | زبون واتساب | عبر واتساب | cancelled | 2026-08-03 | **UNCERTAIN** | See note A below |
| `abc22337` | barber | Secondary Test | +96170111222 | cancelled | 2026-08-03 | **TEST/QA** | Literal "Secondary Test" |
| `9f95968c` | barber | حسام المعدّل | 78700000 | pending | 2026-08-03 | **TEST/QA** | "المعدّل" literally means "the edited one" — same pattern as the confirmed "Playwright Edited Name" row, i.e. a name intentionally suffixed to prove an edit-flow test worked |
| `e4ab87b1` | barber | Reschedule Test | +96170444555 | cancelled | 2026-08-03 | **TEST/QA** | Literal "Reschedule Test" |
| `2a2612bb` | barber | Conflict Blocker | +96170444556 | cancelled | 2026-08-03 | **TEST/QA** | Literal "Conflict Blocker" — conflict-detection test fixture |
| `f97bf576` | barber | Today View Test | +96170777888 | cancelled | 2026-08-03 | **TEST/QA** | Literal "Today View Test" |
| `fa480c8a` | barber | Conflict Guard | +96170999000 | cancelled | 2026-08-03 | **TEST/QA** | Literal "Conflict Guard" |
| `66a3e85d` | barber | Drag Fix Test | +96170333222 | pending | 2026-08-03 | **TEST/QA** | Literal "Drag Fix Test" |
| `215dd50b` | barber | Conflict Reference | 70000001 | pending | 2026-08-04 | **TEST/QA** | Literal "Conflict Reference" + placeholder-pattern phone (70000001) |
| `6268e2e7` | barber | Conflict Reference 2 | 70000002 | pending | 2026-08-04 | **TEST/QA** | Literal "Conflict Reference 2" + placeholder-pattern phone |
| `9aa6c103` | barber | Week Edit Test | +96170123123 | cancelled | 2026-08-04 | **TEST/QA** | Literal "Week Edit Test" |
| `c9f34665` | barber | Playwright Edited Name | +96170555001 | cancelled | 2026-08-04 | **TEST/QA** | Literal "Playwright" — confirmed Playwright E2E artifact |
| `bec27e28` | barber | Jaafar Drag Test | 70444333 | pending | 2026-08-04 | **TEST/QA** | Literal "Drag Test" |
| `54478f5c` | barber | Jaafar Drag Retry | 70444999 | pending | 2026-08-04 | **TEST/QA** | Literal "Drag Retry" |
| `c91bee72` | barber | Mobile Week Edit | 70000011 | cancelled | 2026-08-05 | **TEST/QA** | Literal "Mobile Week Edit" + placeholder-pattern phone |
| `5ed06d0a` | barber | Phase 1.x Verify Public Create | 96170555111 | pending | 2026-08-05 | **TEST/QA** | Literal "Phase 1.x Verify" |
| `97d39b6b` | barber | Phase 1.x Verify Admin Create | 96170555222 | pending | 2026-08-05 | **TEST/QA** | Literal "Phase 1.x Verify" |
| `0ba470a6` | barber | bo salo | 70111222 | pending | 2026-08-06 | **UNCERTAIN** | See note B below |
| `391568ee` | barber | ali aloka | 70222211 | pending | 2026-08-06 | **UNCERTAIN** | See note B below |
| `a08640be` | barber | ashraf kokha | 70121212 | pending | 2026-08-06 | **UNCERTAIN** | See note B below |
| `796bfe3c` | barber | Playwright Week Create Test | 70999888 | cancelled | 2026-08-06 | **TEST/QA** | Literal "Playwright" |
| `fedf7a5e` | barber | Playwright Mobile Week Test | 70888777 | pending | 2026-08-06 | **TEST/QA** | Literal "Playwright" |
| `67c0efe9` | barber | Jaafar Drag Test | 70444333 | pending | 2026-08-09 | **TEST/QA** | Literal "Drag Test" — 2nd occurrence, same phone as `bec27e28`, future-dated (2026-08-12), no `service_id` |
| `1f57f5ff` | barber | adel | 711111111 | pending | 2026-08-09 | **TEST/QA** | Explicitly named in this investigation's own brief as a previously-observed suspect entry; phone `711111111` is malformed (9 digits, all-repeating) — not a valid Lebanese mobile number |

**Summary: 0 REAL, 32 TEST/QA, 7 UNCERTAIN.** No reservation in `rk`'s database today can be
confidently classified as a genuine customer booking — the entire 39-row Reservation table is
either explicit test/QA data or ambiguous placeholder-style data.

### UNCERTAIN reasoning, spelled out

**Note A — the 4 "زبون واتساب" / "عبر واتساب" rows (`7bc899e1`, `63c0f3c5`, `1cc82257`,
`2b8c74f2`):** `customer_phone = "عبر واتساب"` is literally the Arabic text "via WhatsApp," not a
phone number — clearly a placeholder, not real contact data. Two readings are equally plausible
without asking a human: (a) a real barbershop workflow where staff manually logs an appointment
taken over a WhatsApp call and doesn't bother typing the customer's number into this field, or (b)
a QA fixture for testing WhatsApp-sourced-booking display. Weighing toward (b): all 4 rows were
created within a 27-minute window on the same day (`created_at` 07:56–08:23 on 2026-08-03), which
is a tighter clustering than four independent real walk-in/phone bookings would typically show —
but this is circumstantial, not a "Test"-keyword-level signal, so it is flagged UNCERTAIN rather
than asserted as TEST/QA.

**Note B — `0ba470a6` ("bo salo"), `391568ee` ("ali aloka"), `a08640be` ("ashraf kokha"):** none of
these names match any test-keyword pattern ("Test"/"Verify"/"Playwright"/"Phase"/timestamp) — they
read as plausible informal real customer names. However, their phone numbers (`70111222`,
`70222211`, `70121212`) are all valid-length (8-digit) but suspiciously patterned (repeating or
alternating digit pairs), which is also consistent with quickly-typed test fixtures. Not named in
this investigation's brief as previously-flagged rows. Genuinely ambiguous — needs a human who
knows whether RK actually had walk-in customers by these names in early August.

---

## Cross-check — `BarberService` (1 row, read for cascading-effects only)

| id (8) | barber | service | created_at |
|---|---|---|---|
| `934b02d7` | حسين (REAL) | شعر (REAL) | 2026-08-08 |

The one `BarberService` qualification row links two REAL rows — not relevant to any deletion
recommendation.

## Cross-check — `User` (8 rows, read for cascading-effects only — Staff↔Barber login accounts)

Not one of the 6 tables requested in the brief, but necessary to check whether deleting a test
`Barber` would silently break a login account.

| id (8) | full_name | role | barber_id | is_active | classification |
|---|---|---|---|---|---|
| `2e6c7824` | Temp Manager Verify | MANAGER_UNITS | — | false | TEST/QA |
| `eb0708f3` | Phase1 Verify Bot | MANAGER_UNITS | — | false | TEST/QA |
| `62b8cbd3` | MU Verify | MANAGER_UNITS | — | false | TEST/QA |
| `8f3eedf1` | MR Verify | MANAGER_RESERVATIONS | — | false | TEST/QA |
| `827fb44e` | MR Clinic Verify | MANAGER_RESERVATIONS | — | false | TEST/QA |
| `81edde7e` | RK Barber Shop | TENANT_ADMIN | — | true | **REAL** — the real tenant admin login |
| `b7674220` | جعفر | STAFF | `c75b89c3` (REAL barber جعفر) | true | **REAL** — real staff login for real barber |
| `b01011e1` | Staff No Barber Verify | STAFF | — | true | TEST/QA (note: `isActive=true` despite the "Verify" name — flag for human review, not auto-deleted) |

**Confirms:** no `User` row's `barberId` points at any of the 3 test `Barber` rows recommended for
deletion below — deleting them will not orphan a login account.

---

## Overall Summary

| Table | REAL | TEST/QA | UNCERTAIN | Total |
|---|---|---|---|---|
| Barber | 2 | 3 | 0 | 5 |
| CatalogService | 6 | 2 | 0 | 8 |
| CatalogItem (store) | 4 | 0 | 0 | 4 |
| StoreOrder | 0 | 5 | 0 | 5 |
| Reservation | 0 | 32 | 7 | 39 |
| **Total (5 core tables)** | **12** | **42** | **7** | **61** |
| User (supplementary, cascading-check only) | 2 | 6 | 0 | 8 |

---

## Recommended for Deletion (TEST/QA only — never REAL or UNCERTAIN)

**Barber (3):**
- `0d87ed78-c8a4-44a3-beee-cac2c4eb7b88` — "Test Staff 1786124916"
- `ba5033de-b478-4d25-a7f4-e702968b0ee2` — "Test Staff NetCheck 1786131600"
- `87d6c11a-fe22-4d08-8ead-22ef0e0138e5` — "Regression Check Barber"

**CatalogService (2):**
- `eaaabf7c-efd5-42d2-be32-e33ce3f098a5` — "خدمة اختبار المتصفح"
- `867e7a28-cdcf-4025-b422-3537f82c5ed5` — "خدمة تحقق نهائي"

**StoreOrder (5, including its child StoreOrderItem rows which cascade automatically):**
- `c8ba498e-dd6e-4a61-9ee9-03d01f19bcd0`
- `966b0cc5-ae37-40e3-851c-cb57b13e18c2`
- `744566b9-bed9-4525-ae0e-b48806e0bb55`
- `0daaba62-8c2b-43a4-9f71-c2826ac2f95d`
- `84ff956a-0dd0-4abb-9580-e801b471c4ae`

**Reservation (32):**
`895e49a2-12e6-44ac-a026-c7c14f7e7617`, `15c4f1fd-faa8-414b-8de3-d2833f334f74`,
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

**User (6, supplementary — not one of the 6 requested tables, listed only because it's the same
"Verify"/"Bot"-named pattern and is directly relevant to the same production-hygiene goal):**
- `2e6c7824-0188-4168-9490-02e6dafc5b83` — "Temp Manager Verify"
- `eb0708f3-d950-40c2-be95-1d5c584f2adc` — "Phase1 Verify Bot"
- `62b8cbd3-b3c8-401b-a010-e6eda4b35a55` — "MU Verify"
- `8f3eedf1-2254-4c99-845c-bbae1aed3c79` — "MR Verify"
- `827fb44e-f2d0-4779-8fab-d893d7f74d19` — "MR Clinic Verify"
- `b01011e1-7f7b-438d-abb1-9646a4ecf898` — "Staff No Barber Verify" (⚠️ `isActive=true` — confirm
  no one is actually using this login before deleting)

---

## Needs Human Judgment (UNCERTAIN — 7 Reservation rows)

1. `7bc899e1`, `63c0f3c5`, `1cc82257`, `2b8c74f2` — all customer_name "زبون واتساب" / phone
   literally "عبر واتساب" ("via WhatsApp"). Could be a real staff workflow for phone-less
   WhatsApp-sourced bookings, or a QA fixture (created within a 27-minute window on 2026-08-03).
   **Question for Salman:** does RK's staff actually log WhatsApp-call bookings this way in real
   life? If yes, these are real and the placeholder phone is just an operational gap, not a
   deletion candidate.
2. `0ba470a6` ("bo salo"), `391568ee` ("ali aloka"), `a08640be` ("ashraf kokha") — plausible
   informal real customer names, but phone numbers follow suspicious repeating/alternating digit
   patterns (`70111222`, `70222211`, `70121212`). **Question for Salman:** do these names match any
   real walk-in customers from early August 2026?

---

## Cascading Effects

Checked explicitly, not assumed:

- **Barber deletion (3 test barbers):** Searched all 39 `Reservation.barberId` values and the 1
  `BarberService.barberId` value and all 8 `User.barberId` values — **none reference the 3 test
  barbers** (`0d87ed78`, `ba5033de`, `87d6c11a`). Every real reservation/qualification/login points
  only at the 2 REAL barbers (`f64ce71e` حسين, `c75b89c3` جعفر). **Safe to delete — no orphaning.**
- **CatalogService deletion (2 test services):** Searched all 39 `Reservation.serviceId` values —
  **none reference** `eaaabf7c` or `867e7a28`. **Safe to delete — no orphaning.**
- **StoreOrder deletion (5 test orders):** `StoreOrderItem` has `onDelete: Cascade` on its
  `orderId` FK (`prisma/schema.prisma` line 715) — deleting these 5 orders will automatically
  delete their own child `StoreOrderItem` rows (7 items total across the 5 orders, all themselves
  test data, not shared with any other order). No other table references `StoreOrder`. **Safe.**
- **Reservation deletion (32 test reservations):** No table has a foreign key pointing *into*
  `Reservation` — deleting these rows has zero cascading effect on any other table. **Safe.**
- **User deletion (6 test users):** All 6 have `barberId = null` — deleting them cannot orphan any
  `Barber` row (the FK direction is `User.barberId → Barber.id`, not the reverse). **Safe**, with
  the one caveat already flagged above (`Staff No Barber Verify` is still `isActive=true`).
- **No case found** of a test row that a real row depends on (e.g. no real `Reservation` points at
  a test `Barber` or test `CatalogService`) — the headline risk this check was built to catch did
  not materialize here.

---

## Confirmed Findings

- `rk` currently has **zero** confidently-REAL rows in `StoreOrder` (0/5) and **zero**
  confidently-REAL rows in `Reservation` (0/39) — every store order and every reservation on record
  is either an explicit test/QA artifact (37 of the 44 combined rows) or an ambiguous
  placeholder-style entry (7 of 44) that needs a human's local knowledge to resolve, not a database
  read.
- `Barber`, `CatalogService`, and `CatalogItem` (store) each have a real, legitimate core (2
  barbers, 6 services, 4 products) contaminated by a small number of obviously-named test rows (3,
  2, and 0 respectively).
- The Overview "آخر النشاطات" widget has no dedicated backend table — it is a client-side merge of
  `StoreOrder` + `Reservation`, confirmed by reading `ActivityFeed.jsx` and `OverviewTab.jsx`
  directly. Cleaning Tables 4 and 5 above **is** the fix for the Overview noise; no separate
  Overview-specific cleanup exists.

## Side Findings

- 6 `CatalogItem` rows (`categoryModuleKey: "catalog"`) share identical UUIDs with 6 REAL
  `CatalogService` rows — an apparent leftover of the Phase 3.7C (2026-08-08) service-split
  migration that copied rows into the new table without removing the old ones. Real data, not test
  data — flagged for a separate architecture/migration cleanup decision, explicitly out of scope
  for this test/QA sweep.
- All 4 real `CatalogItem` (store) products are `isActive=false` — looks like retail hasn't been
  switched on yet for `rk`, a launch-readiness question, not a hygiene question.

## Unknowns

- Whether the 7 UNCERTAIN `Reservation` rows are real customers or test fixtures cannot be
  determined from the database alone — this requires Salman's or RK's own knowledge of their
  August bookings (see "Needs Human Judgment" above).
- Whether `Staff No Barber Verify` (`User` `b01011e1`, `isActive=true`) is a currently-used login
  was not checked (no `lastLoginAt` filter applied in this pass) — worth a quick look before
  deleting it specifically, separate from the other 5 clearly-dormant (`isActive=false`) test users.
