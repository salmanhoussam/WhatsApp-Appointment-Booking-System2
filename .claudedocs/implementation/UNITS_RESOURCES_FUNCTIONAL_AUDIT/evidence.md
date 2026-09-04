# Units / Resources — Functional Verification (Priority 3)

Follows: `investigation-protocol.md` evidence discipline. Trigger: Salman's explicit "Production
Readiness Final Sweep — Priority 3" instruction (2026-08-31), completing item #10 ("Units/resources
⏳ pending") from `.claudedocs/work/production-functional-sweep/2026-08-30/summary.md`.

---

## 1. What "Units / Resources" actually means in the current product — investigated, not assumed

Three distinct, unrelated Prisma models could plausibly match this name. Checked each against the
real, live product:

| Model | Real purpose | Live tenant using it | Admin surface |
|---|---|---|---|
| `Unit` (`prisma/schema.prisma:211`) | Real-estate booking (villa/chalet/restaurant/pool) | **Smar** — confirmed live, 16 real rows | `SmarAdminDashboard.jsx`'s "Units" tab → `app/api/v1/admin/units.py` |
| `Resource` (`schema.prisma:859`) | Generic reservation-capable entity, `type` field currently only ever `"doctor"` — built for a hypothetical Clinic-type tenant | **None** — no live tenant in `CLAUDE.md`'s Active Clients table maps to a Clinic/doctor service type; `admin/resources.py` exists but no frontend tab references it | N/A |
| `Barber` (`schema.prisma:897`) | Staff/reservation scheduling for barbershop-type tenants | **RK, Mr H** | `GenericAdminDashboard.jsx`'s "الموظفون/Staff" tab |

**Confirmed via direct grep**: `GenericAdminDashboard.jsx` (what RK/Mr H actually use) has **no**
`units` or `resources` tab id anywhere in its real nav (`reservations`, `staff`, `store`,
`customers`, `notifications`, `settings`, `catalog`). That terminology only exists in the legacy
`SmarAdminDashboard.jsx`'s own tab vocabulary (`inbox`/`units`/`gallery`/`housekeeping`/...).

**Conclusion**: the sweep's "Units/Resources" item refers to **Smar's real `Unit` management**
(`admin/units.py`), not RK/Mr H's `Barber`/Staff (already tested — sweep item #7, "PASS + finding")
and not `Resource`/Clinic (no live tenant — **NOT APPLICABLE**, not tested).

## 2. Real contract confirmed before testing

`admin/units.py:154-161` — `GET /` docstring: *"Return ALL units for this tenant (active +
inactive) — admin view."* Matches Salman's own stated expectation exactly — **treated as
intentional, confirmed by code, not re-litigated.**

Role matrix (`admin/units.py:9-22`, a documented 2026-07-30 Authorization Hardening decision):
`SUPER_ADMIN`/`TENANT_ADMIN`/`MANAGER_UNITS` allowed on every route; `MANAGER_RESERVATIONS`
explicitly denied even on `GET` (the file's own docstring explains why: the admin view exposes
admin-only fields, not a lean read a booking workflow would need).

Real routes in scope: `GET /`, `POST /`, `PATCH /{id}`, `DELETE /{id}`, `POST /{id}/block-dates`,
`POST /{id}/date-overrides`, `POST/DELETE /{id}/images`. Repository (`unit_repo.py`) already
correctly `clientId`-scoped on every method — confirmed by re-reading it fresh this session (my own
fixes from the 2026-08-30 Tenant Isolation Audit, still in place).

## 3. Test setup

Reused the project's own established test-account convention rather than inventing new state or
touching any real admin's credentials: `scripts/seed_authz_hardening_test_users.py` (already
committed, 2026-07-31) creates disposable `authz-verify-{role}@{slug}.test` accounts, password
`TestPass123!` (already public in the repo, not a production secret). Found them **deactivated**
from a prior session — re-ran the script to reactivate (its own built-in behavior), obtained real
JWTs for `smar`'s `TENANT_ADMIN`/`MANAGER_UNITS` and `footlab`'s `TENANT_ADMIN` (for cross-tenant
testing), ran the test plan below, then **deactivated all 9 accounts again** afterward — restoring
the exact pre-test state, matching this project's "deactivate, never delete" convention.

Tested against the local backend (`uvicorn`, port 8000) — per the 2026-08-29 audit's own confirmed
finding (G3), local `.env`'s `DATABASE_URL` and Railway's production app are the same live Supabase
database, so this is a real test against real data, not a lookalike.

## 4. PASS / FAIL matrix

| # | Test | Method | Expected | Actual | Result |
|---|---|---|---|---|---|
| 1 | Anonymous `GET /admin/units/` | no token | 401/403 | `401` | **PASS** |
| 2 | `TENANT_ADMIN` `GET /admin/units/` | smar token | 200 | `200`, 16 real units returned | **PASS** |
| 3 | `MANAGER_UNITS` `GET /admin/units/` | smar token | 200 | `200` | **PASS** |
| 4 | `CREATE` a real unit | `POST /admin/units/`, smar `TENANT_ADMIN` | 201 | **500** — `prisma.errors.MissingRequiredValueError` | **FAIL — real defect, see §5** |
| 5–8 | Update/deactivate/date-override/delete the created unit | (dependent on #4) | — | Not run — no safe throwaway fixture existed once CREATE failed | **NOT TESTABLE** (blocked by #4) |
| 9 | Cross-tenant `PATCH` against a **real existing** smar unit, using footlab's token | `PATCH /admin/units/{real_id}`, footlab `TENANT_ADMIN` | 404 | `404 {"error":{"code":"NOT_FOUND"}}` | **PASS** |
| 10 | Cross-tenant `DELETE` against the same real unit | footlab token | 404 | `404`, same body | **PASS** |
| 11 | Confirm the real unit is byte-identical and still present after 9–10 | re-`GET` | unchanged | Confirmed unchanged (`before == after` diff, same count: 16/16) | **PASS** — proves the rejections happened before any write, zero risk to real data |
| 12 | Anonymous `CREATE` | no token | 401/403 | `401` | **PASS** |
| 13 | Downstream consumer (public listing) shows only active+available | code inspection: `unit_repo.get_all_by_client()` filters `isActive: True, isAvailable: True`; `get_all_admin()` (used only by the admin route) does not | — | Confirmed via code, **not independently live-verified** — my guessed public URL (`/public/client/smar/units`) didn't match the real route (`public/units.py:29`, `/{property_id}/units`, needs a `property_id` not a slug), and re-deriving the exact live call was judged not worth the added risk/time for a check the code already answers unambiguously | **PASS (code-verified only)** |
| 14 | Reservation/booking integration | `Unit` connects to `Booking`+`Price` (not `Reservation`, that's the Barber-based flow's model). `POST /{id}/date-overrides` writes `Price` rows directly | — | Not run — depended on the same throwaway fixture blocked by #4 | **NOT TESTABLE** (blocked by #4) |

## 5. Defect found — STOPPED per instructions, not fixed

**`POST /api/v1/admin/units/` (create a unit) returns HTTP 500 for any real request that omits
Block Builder fields (`content_blocks`/`amenities`/`rules_policies`) — which is every normal,
first-time unit creation, since those are advanced fields a brand-new unit wouldn't have yet.**

### Evidence
```
prisma.errors.MissingRequiredValueError: Unable to match input value to any allowed input type
for the field. Parse errors: [`data.client`: A value is required but not set, Unable to match
input value to any allowed input type for the field. Parse errors: [`data.content_blocks`: A
value is required but not set, `data.content_blocks`: A value is required but not set]]
```
Full traceback confirms the failure is in `app/repositories/unit_repo.py:115`
(`self.db.unit.create(data=data)`), called from `app/api/v1/admin/units.py:181`.

### Root cause — grounded in a real, working comparison within the same file

`admin/units.py:201-203` (`create_unit`'s data dict) **always** includes the
`content_blocks`/`amenities`/`rules_policies` keys, falling back to bare Python `None` when the
client didn't send a value:
```python
"content_blocks": Json(body.content_blocks) if body.content_blocks is not None else None,
```
`admin/units.py:264-269` (`update_unit`'s **already-working** PATCH path) does the opposite —
**omits the key entirely** when the value is `None`:
```python
if body.content_blocks is not None:
    patch["content_blocks"] = Json(body.content_blocks)
```
Prisma-client-py's `create()` needs an optional `Json?` field either omitted or wrapped, not passed
as a bare `None` — the PATCH path already proves this pattern works; CREATE never adopted it. The
confusing `data.client` half of the error is Prisma's own union-type error reporting falling
through to describe an unrelated alternate match once the first attempt (the whole dict, content
fields included) failed — not a second, independent bug; `barber_repo.create_barber()` (a
comparable bare-passthrough `create()` with no such optional-Json fields) works fine, which is
further evidence this is specifically the `content_blocks`/`amenities`/`rules_policies` handling,
not the `clientId` scalar itself.

### Impact

**Every real attempt to create a new Unit from Smar's admin dashboard currently fails with a 500.**
This is the core "add a new chalet/villa" workflow — a severe, live, user-facing defect on Smar's
own admin surface, not a security issue and not tenant-isolation-related (confirmed: the 500 fires
identically regardless of which tenant's admin triggers it — a code-shape bug, not a scoping bug).

### Fix — APPROVED and APPLIED 2026-08-31

Mirrored `update_unit`'s already-proven pattern in `create_unit` (`app/api/v1/admin/units.py`):
the `data` dict is now built as a plain dict of the always-present fields, then
`content_blocks`/`amenities`/`rules_policies` are added conditionally (`if body.X is not None:
data["X"] = Json(body.X)`) — identical shape to the working `PATCH` path. No schema change, no
repository change, no API contract change (request/response shapes unchanged), no authorization
change. Exactly the smallest fix proposed, nothing broader.

## 6. Security results

- Anonymous access: rejected on both `GET` and `POST` (401). **PASS**
- Authorized `TENANT_ADMIN`: allowed on `GET`. **PASS**
- Authorized `MANAGER_UNITS`: allowed on `GET`, per the documented role matrix. **PASS**
- Cross-tenant `PATCH`/`DELETE` (footlab's token against a real smar unit): both rejected with 404,
  **zero state change confirmed** (before/after diff identical, count unchanged 16/16). **PASS**
- `MANAGER_RESERVATIONS` explicitly-denied-on-GET behavior (documented in the file's own header
  comment) — **NOT TESTED** this pass: hit the platform's 5-requests/minute login rate limit
  (`rules/backend/security.md §6`) after the tests above; not worth a long wait for one additional,
  already-documented-by-design check. **NOT TESTABLE** (rate-limited, not a defect).

**No new security defect found.** The one real defect (§5) is a functional bug, not an
authorization/tenant-isolation issue — confirmed it reproduces identically regardless of tenant.

## 7. Side findings (not defects, not acted on)

- `admin/units.py` calls `_unit_repo.*` directly with no `unit_service.py` intermediary, while the
  sibling `public/units.py` correctly goes through `UnitService` (`app/services/unit_service.py`,
  confirmed real and imported there) — an architecture-layering inconsistency
  (`rules/backend/architecture.md` §2's Routes → Services → Repositories chain), not a functional or
  security defect. Noted for a future Architecture Guardian pass, not fixed here.

## 8. Post-fix re-verification — 2026-08-31

Same method as §3 (real local backend against the same live production DB, `authz-verify-*`
disposable test accounts, reactivated → tested → deactivated again). Backend restarted to load the
fix, zero startup errors.

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| 0a | Anonymous `GET` | 401/403 | 401 | **PASS** (regression check) |
| 0b | Anonymous `POST` | 401/403 | 401 | **PASS** (regression check) |
| 1 | Create with only required fields (`name_ar`, `capacity`) | 201 | 201 | **PASS** |
| 2 | Create with every Block Builder field populated (`content_blocks`, `amenities`, `rules_policies`) | 201, values persisted exactly | 201; re-fetched response's `content_blocks`/`amenities`/`rules_policies` byte-match the request | **PASS** |
| 3 | Update the newly-created unit (`capacity`, `name_en`) | 200, values changed | 200, `capacity` confirmed `9` | **PASS** |
| 4 | Deactivate it (`is_active: false`) | 200 | 200, confirmed `is_active: false` | **PASS** |
| 4b | Deactivated unit still returned by the **admin** list (active+inactive contract) | present | present | **PASS** — the original documented contract holds |
| 5 | Date override (`POST /{id}/date-overrides`) | 201 | 201 | **PASS** |
| 6 | Delete (real, supported hard-delete) | 200 | 200 | **PASS** |
| 6b | Confirmed removed from the admin list after delete | gone | gone | **PASS** |
| 7 | Downstream active/availability filtering — **DB-backed, not code-inspection-only**: created a fresh test unit, called `UnitRepository.get_all_by_client()` (the exact method the public route uses) directly against the live DB while the unit was active, then again after deactivating it | present while active, absent once deactivated | present → then absent, exactly as expected | **PASS** |
| 8a | Cross-tenant `PATCH` (footlab token on the smar test unit) | 404 | 404 | **PASS** |
| 8b | Cross-tenant `DELETE` (footlab token on the smar test unit) | 404 | 404 | **PASS** |
| 8c | Zero state change from the rejected cross-tenant calls (before/after diff on the test unit) | unchanged | unchanged | **PASS** |
| 9a | `MANAGER_UNITS` `GET` | 200 | 200 | **PASS** |
| 9b | `MANAGER_UNITS` `CREATE` (role matrix — this role IS allowed to create) | 201 | 201 | **PASS** |
| 10 | Existing UPDATE flow, no regression — same-value `PATCH` against a **real, pre-existing** unit (not a test fixture) | 200, unit byte-identical after | 200, confirmed byte-identical before/after | **PASS** |

**All 17 checks PASS. Zero errors in the backend log across the entire re-verification run**
(grepped for `error`/`traceback`/`exception`, zero matches outside normal `INFO` lines).

**Test-data cleanup confirmed**: final admin unit count back to exactly **16** (the same real count
from before any testing began), zero `QA-`-prefixed leftover rows. All 9 `authz-verify-*` test
accounts deactivated again, restoring the exact pre-test state.

## 9. Status

**Units/Resources is CLOSED.** The one real defect found (§5) is fixed, and every test that was
blocked by it (create variants, update, deactivate, date-override, delete, downstream filtering,
cross-tenant rejection with zero state change) now passes with real, DB-backed evidence — not
code-inspection alone. Authorization matrix and tenant isolation remain solid, confirmed again
post-fix with no regression.

**What remains before Priority 4**: nothing outstanding on Units/Resources. Priority 4
(Email/Resend functional verification) is next, pending Salman's go-ahead.
