# Team · Services · Manager · Staff model — implementation + design

**Date:** 2026-09-09 · **Status:** CLOSED.
Implementation performed for Team + Services. Manager and Barber→Staff are design/investigation
only. **0 schema changes · 0 migrations · 0 deploys · 0 push.**
Builds on `.claudedocs/work/team-barber-user/2026-09-09/report.md` (the read-only investigation).

---

## 1. Team implementation ✅

**Problem removed:** an owner had to create the person twice — a Barber on the Staff page, then a
User in Team — which is what made the two surfaces confusing.

**`app/api/v1/admin/team.py`** — `TeamMemberCreate` gains `new_staff_name` / `new_staff_phone`.
When a self-scoped preset is chosen and a new identity is requested, the route creates the Barber
row **first**, then the User, then links them.

Ordering is deliberate and stated in the code: `User.barberId` is a real FK, so the Barber must
exist first — and if the User create then fails, an orphan Barber is a harmless visible row on the
Services page, whereas the reverse would leave an account that fails closed on every scoped request
(`permissions.py:250-254`).

Guards, all server-side:
- `new_staff_name` **and** `barber_id` together → **422** (pick one).
- `clientId` on the new Barber is `tenant["id"]` — **server-derived**, never client-supplied.
- The staff phone goes through `normalize_for_storage` — same Phone Numbers rule as the account's.

**`TeamTab.jsx`** — the barber `<select>` gains a `➕ موظف جديد…` option; choosing it reveals a name
field and a `PhoneField` (country selector, Lebanon default). Payload sends either `barber_id` **or**
the new-identity pair, never both.

**Barber and User remain two separate rows.** This is a UI unification, not a merge — exactly as
the boundary required.

## 2. Services navigation implementation ✅

| File | Change |
|---|---|
| `GenericAdminDashboard.jsx:207` | `labelAr: 'الموظفون'` → **`'الخدمات'`**. The route id stays `'staff'` so existing deep links (`/dashboard/staff`) keep working |
| `StaffTab.jsx` | Removed the `الموظفون / الخدمات` toggle · header pinned to الخدمات with only `+ خدمة جديدة` · removed the employee card grid and its `+ موظف جديد` · `subView` pinned to `'services'` (kept as a constant because the services loader still guards on it) |

### Judgment call, stated rather than buried

**The Employee↔Service assignment matrix STAYS on this page.** It was inside the `employees`
sub-view, but it is not employee *management* — it is what configures which services each person
delivers, and `BarberService` drives which staff member appears for a service in the booking flow.
Removing it with nowhere else to do it would have broken booking configuration outright. Employee
CRUD moved to Team; the matrix stayed. **Flagged for confirmation.**

### Browser verification (real Playwright, local, `barberlab-test`)

```
nav: نظرة عامة · التقويم · الحجوزات · الخدمات · العملاء · الفريق · الإشعارات · الإعدادات · خروج
```
`الموظفون` appears **nowhere**. On `/dashboard/staff`: heading الخدمات, only `+ خدمة جديدة`,
no `موظف جديد` button, toggle gone, and the matrix still renders (`Ali` / `Rami` selector →
"الخدمات التي يقدمها Ali" with live checkboxes). Service cards keep تعديل/إخفاء/↑/↓.

### API tests (local, against production DB, test tenant, rows deleted afterwards)

| # | Case | Result |
|---|---|---|
| T1 | Create staff + new identity, phone typed `70111222` | **201** — User `scope=self`, `barber_id` set; account phone stored `96170111222`, staff phone `96170333444` |
| T2 | `barber_id` **and** `new_staff_name` together | **422** |
| T3 | `preset: "super_admin"` | **422** — no such preset exists |
| T4 | `preset: "reservations_manager"` | **422**, naming the blocker: *"grants permissions in ['catalog'], which has not been migrated"* |
| T5 | Another tenant's `barber_id` | **404** (id space not probeable) |
| — | Cross-tenant links in DB after tests | **0** |

Cleanup verified: `barberlab-test` back to its original 2 users / 2 barbers.

---

## 3. Manager authorization — **DESIGN ONLY, NEED DECISION**

Per the task's own instruction ("If the clean implementation requires a new role/preset or
permission bundle: STOP … and report the exact proposed design"), nothing was implemented.

### Why the existing model cannot express "full tenant Manager" cleanly today

```
ASSIGNABLE_PRESETS : shop_manager · staff · tenant_admin
MIGRATED_AREAS     : capabilities · customers · reservations · services · staff · store
                     (catalog is NOT migrated — Slice 4)
enum UserRole      : SUPER_ADMIN · TENANT_ADMIN · MANAGER_RESERVATIONS · MANAGER_UNITS · STAFF
```

Three possible designs, each with its real cost:

| | Design | Cost |
|---|---|---|
| **M1** ⭐ | New `tenant_manager` **preset**, permissions covering every area | **Blocked by `catalog`** — a full-tenant manager must include it, and the server-side gate refuses any preset touching an unmigrated area. Needs **Slice 4** first. No schema change |
| **M2** | New `TENANT_MANAGER` value in the `UserRole` enum | **Schema migration** (enum change) **plus** editing every `require_roles(...)` tuple across the admin API — wide blast radius, easy to miss one and leave a manager 403'd on a random page |
| **M3** | Reuse the existing `tenant_admin` preset, label it "مدير" in the UI | Zero code, works today — **but the account is then indistinguishable from the owner**, and see the gap below |

### 🔴 A real gap that blocks M3 specifically

`team.py` has **no self-deactivation guard and no last-owner guard**. `DELETE /team/{id}` only
checks the caller is `SUPER_ADMIN`/`TENANT_ADMIN` and that the target belongs to the tenant.

So under M3 a "Manager" could deactivate the real owner, and an owner can deactivate themselves —
locking the tenant out of its own dashboard with no recovery path in the product. This is a real
defect **independent of the Manager decision** and is recorded here, not fixed.

### Recommendation

**M1, after Slice 4 (catalog migration).** It is the only design that is both server-enforced and
schema-free, and the block is honest rather than incidental: the permission model is telling us
catalog isn't ready to be delegated yet. M3 is available as a stopgap **only if** the last-owner
guard is built first.

Constraints that hold under all three: `SUPER_ADMIN` is not a preset and cannot be selected;
`permissions` is never accepted from the client; `clientId` is always taken from the JWT.

---

## 4. Current Barber dependency graph

**DB foreign keys → `barbers`:** `reservations.barber_id` · `barber_services.barber_id` ·
`users.barber_id`.
**Constraints:** `users.barber_id` is `@unique`, nullable, `onDelete: SetNull` ⇒ **1 : 0..1** both
ways. `barbers` has `@@index([clientId, isActive])`.

**Code references:** `app/repositories/barber_repo.py` · `app/api/v1/admin/barbers.py` ·
`app/api/v1/admin/team.py` (link + now create) · `app/core/permissions.py:250-254` (self-scope
resolves `user.barberId`) · `app/services/reservation_service.py` (`_notify_merchant_new_reservation`
resolves the staff phone via `find_user_by_barber_id`) · public reservation routes exposing barbers.

**Frontend consumers:** `StaffTab.jsx` (matrix) · `TeamTab.jsx` (link/create) ·
`useReservationBooking.js` and the booking wizard (barber selection) · calendar columns.

**Real production rows (read-only, 2026-09-09):** 10 barbers · 33 users · **0 users currently
linked** · 42 reservations with a barber · 39 `barber_services` · 0 cross-tenant links.
Anomaly carried over: جعفر was deactivated 2026-09-08 19:21 and his link released, which is why the
linked count is 0 — see the previous report.

---

## 5. Proposed generic Staff model

```prisma
model Staff {
  id           String   @id @default(...)
  clientId     String                              // tenant binding, unchanged
  staffType    String   @default("general")        // barber | doctor | receptionist | trainer | ...
  name         String
  phone        String?
  imageUrl     String?
  description  String?
  isActive     Boolean  @default(true)
  workingHours Json?
  sortOrder    Int      @default(0)
}
```

**Generic fields** (every vertical has them): `clientId`, `name`, `phone`, `imageUrl`,
`description`, `isActive`, `sortOrder`, `workingHours` — the last one is already shared verbatim
with `Resource.workingHours` and is what `reservation_service._check_working_hours()` understands.

**Barber-specific fields: none.** Every current `Barber` column is generic. That is the strongest
argument that this is a rename plus a type column, not a redesign.

Answers to the specific questions: reservations **can** safely point at generic Staff (the FK is
opaque); `BarberService` **can** (it is a join table, `barber_id` → `staff_id`); self-scope **can**
use `Staff.id` (`permissions.py` only needs *an* id); notification recipient resolution **can**
(`find_user_by_barber_id` becomes `find_user_by_staff_id`); `User.barberId` **can** become
`User.staffId` — the `@unique` semantics are unchanged.

## 6. `vertical` vs `staffType` — **both, and they are not the same axis**

**Recommendation: keep both.** Evidence for why one is insufficient:

- `vertical` lives on the **tenant** (`Client.vertical`, `VERTICAL_REGISTRY`) and answers *what kind
  of business is this*.
- `staffType` lives on the **person** and answers *what does this person do here*.

A clinic has **doctors and receptionists in the same tenant**: same `vertical`, different
`staffType`. Collapsing them would force one people-table per professional type — precisely the
outcome the requirement says to avoid. Conversely `staffType` must not be derived from `vertical`,
because that mapping is 1:many, not 1:1.

`staffType` should be a **free string with a default**, not an enum — a new vertical must not require
a schema migration to add a job title. That is the whole point.

---

## 7. Migration plan (NOT EXECUTED)

| Phase | Action | Reversible? |
|---|---|---|
| **1** | Create `staff` table with the model above. Nothing reads it | Yes — drop an empty table |
| **2** | Backfill: one `staff` row per `barbers` row, **preserving ids** so every existing FK value stays valid | Yes — truncate |
| **3** | Add nullable `staff_id` beside each `barber_id` (`reservations`, `barber_services`, `users`); dual-write in the repositories; keep reading `barber_id` | Yes — drop the new columns |
| **4** | Backfill `staff_id` from `barber_id`; verify **row-for-row equality** before switching any reader | Yes |
| **5** | Flip readers to `staff_id`, one call site at a time, deploying readers **before** anything stops writing `barber_id` | Yes — flip back |
| **6** | Move `User.barberId` → `User.staffId`; update `permissions.py` self-scope and `find_user_by_barber_id` | Yes |
| **7** | Rename API/UI surfaces; keep `barber_id` accepted as an alias in request bodies for one release | Yes |
| **8** | **Only then** consider dropping `barbers` — after an observation period | **No** — the one-way door |

**Preserving ids in Phase 2 is what makes phases 3-7 cheap**: no id remapping, and a rollback is a
reader flip rather than a data restore.

## 8. Rollback

Phases 1-7 are each independently reversible; the plan is deliberately shaped so **no phase both
destroys data and lacks a reader-side flip**. The binding lesson from this project's own history
(2026-09-06, the `services` table) is in Phase 5: **deploy readers first, then stop writing the old
column** — dropping a column before its readers shipped caused a real production outage.
Snapshot before Phase 2 and before Phase 8; per `feedback_migration_staging_discipline` this project
has no staging rehearsal, so **the snapshot is the rollback**.

## 9. Real-data impact

10 barbers → 10 staff rows. 42 reservations + 39 barber_services + (currently 0, historically ≥1)
user links to repoint. 6 tenants affected: `rk`, `mr-h`, `alzabt-demo`, `barberlab-test`,
`demo-barber-6efb`, `demo-barber-d61e`. Two of those are demo rows and one is a test tenant, so the
genuinely live surface is `rk` (28 reservations) and `mr-h` (11).

## 10. Remaining blockers

1. 🔴 **No last-owner / self-deactivation guard** in `team.py` — blocks Manager option M3, and is a
   real lockout risk today regardless.
2. 🔴 **`catalog` unmigrated (Slice 4)** — blocks Manager option M1 and `reservations_manager`.
3. 🟠 **جعفر is deactivated with his staff link released** — his pending setup link cannot be used
   (auth rejects inactive before checking the token), and reactivation alone is not enough: the
   staff link must be restored or he is 403'd on every scoped request.
4. 🟡 The Employee↔Service matrix staying on the Services page is my judgment call, not an
   instruction — confirm or move it.

---

TEAM: **GO** — implemented and verified
SERVICES: **GO** — implemented and browser-verified
MANAGER: **NEED DECISION** — M1 (after Slice 4) recommended; M3 needs the owner guard first
BARBER → STAFF: **DESIGN READY** — every Barber field is generic, ids can be preserved, all phases reversible until 8

---

# Implementation pass 2 — account lifecycle, owner protection, manager-as-staff

**Appended 2026-09-09.** Nothing above was rewritten; where this pass reverses an earlier decision
it says so explicitly. **0 schema changes · 0 migrations · 0 destructive deletions of real data ·
0 production employee writes · 0 deploys · 0 push.**

## A. Staff/User separation — the lifecycle defect, fixed

**Reversed:** `user_repo.deactivate_user()` no longer clears `barberId`.

That side effect was added 2026-09-07 (`a0ccf41`) for a real reason, quoted from its own commit
body: `User.barberId` is `@unique`, so a switched-off account held a live staff member hostage and
creating the replacement account returned **409 with no way out** — *"team.py has no edit route"*.

**That justification is now gone**, because this pass adds the edit route. So the destructive side
effect could be dropped rather than traded against.

Why it had to go — measured, not asserted:
1. Reactivation restored an account that was then **403'd on every scoped request**
   (`permissions.py:250-254` raises when a self-scoped account has no `barberId`).
2. It stranded جعفر: deactivated, link released, holding a still-valid setup token he could no
   longer use.

**The principle now holds in code:** deactivating an *authentication* account never destroys the
person's *business* identity. Releasing a staff link is an explicit action
(`PATCH /team/{id}` with `barber_id: ""`), never a side effect.

## B. `PATCH /team/{user_id}` — permission editing (§6)

New route. Accepts `preset`, `addons`, `barber_id` only.

- `permissions` is **not a field** — resolution stays server-side (invariant I7). A crafted request
  cannot grant itself anything.
- `role` is not editable; a preset resolves it. **SUPER_ADMIN is unreachable** — it is not a preset.
- `clientId` is never accepted; the tenant comes from the caller's token.
- `barber_id`: absent = leave as is · `""` = release · an id = link (404 on a foreign id, 409 if
  already linked elsewhere).
- Refuses to strand a self-scoped account: changing to a `requires_barber` preset without a link,
  present or supplied, returns **422**.
- Writes `permissions` in the same shape as the create path (`Json(...)`, or a real NULL for
  `tenant_admin` — that NULL is what keeps the account on the legacy path, invariant I1).

## C. Owner protection (§5, §10) — server-side, on both paths

Enforced in `admin/team.py`, not by hiding a button.

**Deactivate path** — two invariants, in order:
1. **No self-deactivation** → 403.
2. **Never the last active TENANT_ADMIN** → 403.

**Edit path** — the same two, applied to authorization, because *demoting* the last administrator
locks a tenant out just as completely as deactivating them, and more quietly:
1. Owner cannot strip their own admin access → 403.
2. Cannot demote the last active administrator → 403.

### Honest note on reachability

Invariant 2 (**last active admin**) is currently **defence-in-depth rather than a live path** on the
deactivate route: `get_current_admin_user` requires the token's `client_id` to equal the user's own
(`tenant.py:379-384`), so a SUPER_ADMIN cannot act cross-tenant here — and any tenant-admin caller
is itself an active admin, so a *different* active admin target means there are ≥2. Invariant 1 is
therefore the effective protection today. Invariant 2 is kept because it is correct, cheap, and
becomes live the moment a demotion path or cross-tenant admin access exists — and on the **edit**
route it is already reachable. Stated rather than claimed as a passing test.

**UI** — the owner's row shows *"لا يمكنك تعطيل حسابك بنفسك"* (or the last-admin equivalent) in place
of the deactivate button, and every row gains **"تعديل الصلاحيات"**. Deliberately not a disabled
button: Salman's requirement is that the protection is explained, not shown as a dead control. The
frontend check mirrors the server's and never replaces it.

## D. Manager-as-Staff (§8)

Previously any non-self-scoped preset rejected a staff link with `422 "does not take a barber link"`,
which forced a barber-who-also-manages to exist twice. Now the link is **optional** for those
presets: create or attach a staff identity alongside a manager account, or don't.

The link is **inert for authorization** on those presets (`scope: 'all'`, so `permissions.py` never
reads `barberId`). Its only effects are the ones a staff identity should have: the person appears on
the calendar, can be booked, and `_notify_merchant_new_reservation` can reach them.

Both states stay valid: **manager without a staff identity**, and **manager with one**.

## E. Tenant Manager (§7, §9) — still NEED DECISION, not faked

`shop_manager` was **not** renamed into `tenant_manager`, per the instruction not to do that
silently. The blocker is unchanged and precise:

```
MIGRATED_AREAS : capabilities · customers · reservations · services · staff · store
                 catalog is NOT migrated (Slice 4)
```

A full-tenant manager must include `catalog`, and `resolve_preset` refuses any preset touching an
unmigrated area — **server-side**, so it cannot be worked around from the UI. Granting the strings
anyway would produce an account the older `require_roles` routes still 403, i.e. exactly the "faked
completeness" the task forbids.

**Recommendation unchanged: M1 after Slice 4.** The design is written in §3 above; nothing about it
changed in this pass.

## F. Deactivate vs delete (§4)

**No destructive deletion was added, and none should be exposed as a normal UI action.** The reason
is concrete, not cautious: `reservations.barber_id` and `barber_services.barber_id` are real FKs, so
deleting a staff identity would either orphan or cascade **42 live reservations and 39 service
assignments**. Historical business identity must survive.

| Case | Behaviour |
|---|---|
| A — Staff, no account | Deactivate (hide) on the Services page. Safe |
| B — Staff with an active account | Deactivate the account; **the staff identity and its link survive** (fixed in A above) |
| C — Staff with historical reservations | **Never delete.** Deactivate only — the reservations are the tenant's business record |
| D — Staff assigned to services | Deactivate; assignments are preserved so re-activation restores the booking configuration |
| E — Staff who is also a Manager | Two concerns, two actions: deactivate the account, or release the staff link — never one implying the other |
| F — Account only | Deactivate/reactivate, both already exist |
| G — Staff identity only | Hide/show on the Services page |

Hard deletion remains available only through direct DB access for genuinely orphaned test rows —
which is exactly how this pass's own fixtures were removed.

## G. Tests

Backend, run live against a local API on the **test tenant** `barberlab-test`; every fixture deleted
afterwards (tenant verified back to its original 2 users / 2 barbers).

| # | Case | Expected | Result |
|---|---|---|---|
| T1 | Owner deactivates self | 403 | ✅ 403 + Arabic reason |
| T2a | Second admin deactivates the owner (2 active admins) | 200 | ✅ 200 |
| T2b | Last remaining admin deactivates self | 403 | ✅ 403 |
| T3 | Create `shop_manager` **+ new staff identity** | 201, linked | ✅ `scope: all`, `barber_id` set |
| T4 | Owner demotes own preset to `shop_manager` | 403 | ✅ 403 |
| T5 | Owner edits another member's preset | 200 | ✅ 200 |
| T6 | `PATCH preset: "super_admin"` | 422 | ✅ 422 |
| T7 | `PATCH` a user in another tenant | 404 | ✅ 404 |
| T8 | **Deactivate keeps `barberId`** | preserved | ✅ preserved |
| T9 | Reactivate restores a working account | link intact | ✅ `is_active=True`, link intact |
| T10 | Explicit release via `barber_id: ""` | NULL | ✅ NULL |

Earlier pass, re-verified unchanged: create-with-identity, mutual-exclusion 422, foreign barber 404,
`reservations_manager` blocked by catalog 422, zero cross-tenant links.

## H. Browser evidence (real Playwright, local)

`/barberlab-test/dashboard/team`:
```
4 × "تعديل الصلاحيات"          (every row)
3 × "تعطيل"                    (the owner has none)
owner row: "لا يمكنك تعطيل حسابك بنفسك"
owner label: "المالك"
```
`/barberlab-test/dashboard/staff` (Services), re-verified after this pass: heading الخدمات, only
`+ خدمة جديدة`, no employee CRUD, and the Staff↔Service matrix still functional.

One transient `500` on `/admin/settings` was observed and traced to the Supabase pooler
(`Can't reach database server`), with the immediately following request returning `200` — **not
caused by these changes**, recorded rather than ignored.

## I. جعفر — WAITING FOR EXPLICIT PRODUCTION ACTION

**Not touched.** Current state unchanged: `is_active = false`, `barber_id = NULL`, setup token valid
until 2026-09-14.

**After this fix, can he be used for B?** **Yes — with two explicit actions, both production writes
needing approval:**
1. **Reactivate** — without it, `auth.py:291/:446` reject the setup link with 403 before the token
   is even checked.
2. **Re-link his staff identity** — his preset is `staff` (`scope: self`); without a link he is
   403'd on every scoped request. Reactivation alone is not enough.

The lifecycle fix means **this will not happen again** — a future deactivation preserves the link,
so only accounts damaged during the 2026-09-07→09 window need manual repair. جعفر is the only one.

## J. Barber → Staff — DEFERRED

Unchanged from §5-§7 above. No schema touched. The dependency map and 8-phase plan stand as the
basis for a future, separate task.

## K. Unresolved blockers

1. 🔴 **`catalog` unmigrated (Slice 4)** — blocks the real Tenant Manager contract.
2. 🟠 **جعفر** needs two approved production writes (above).
3. 🟡 Owner-protection invariant 2 is unreachable on the deactivate route today (§C) — correct, but
   do not describe it as a tested live path.
4. 🟡 The Staff↔Service matrix staying on the Services page remains my judgment call from pass 1.

---

TEAM: **GO**
SERVICES: **GO**
OWNER PROTECTION: **GO**
TENANT MANAGER: **NEED DECISION** — blocked by the catalog migration (Slice 4)
MANAGER-AS-STAFF: **GO**
BARBER → STAFF: **DEFERRED**
JAAFAR: **WAITING FOR EXPLICIT PRODUCTION ACTION**

---

# Implementation pass 3 — Slice 4 (catalog) and the real Tenant Manager

**Appended 2026-09-09.** Nothing above rewritten. **0 schema changes · 0 migrations · 0 deploys.**
This pass removes the blocker §E named, then builds the preset that blocker was preventing.

## A. Slice 4 — the catalog area migrated

`app/api/v1/admin/catalog.py`: all **9 routes** moved from `require_roles(*CATALOG_ROLES)` to
`require_permission(*_READ | *_WRITE)`, following Slice 3's shape verbatim (`store.py`), with
`CATALOG_ROLES` still passed through as the legacy tuple.

| | |
|---|---|
| GET `/categories`, `/items` | `catalog.read` |
| POST/PATCH/DELETE `/categories`, `/items`, POST `/seed-from-template` | `catalog.write` |

**Additive, not a behaviour change:** an account with `permissions = NULL` — every account created
before 2026-09-04 — still resolves through the role tuple exactly as before (invariant I1). Only
accounts carrying an explicit permissions array gain reach.

`MIGRATED_AREAS` now contains all seven areas. Consequence, verified by running the module:

```
ASSIGNABLE_PRESETS : reservations_manager · shop_manager · staff · tenant_admin · tenant_manager
```

`reservations_manager` — registered but blocked since it was written — **became assignable by
removing its dependency**, not by editing the preset.

## B. `tenant_manager` — the confirmed product definition, as a real permission array

```python
"tenant_manager": {
    "permissions": ["reservations.write", "staff.write", "services.write",
                    "catalog.write", "store.write", "customers.read"],
    "scope": "all", "legacy_role": "TENANT_ADMIN", "requires_barber": False,
}
```

Built as a permission array rather than a second `TENANT_ADMIN` — deliberately, and this is the
architectural decision of this pass:

- **Distinguishable.** A `tenant_admin`-shaped manager is indistinguishable from the owner, which is
  exactly what made option M3 unsafe.
- **Bounded.** What a manager can do is enumerable and reviewable, not "whatever TENANT_ADMIN
  happens to mean today".
- **Cannot reach SUPER_ADMIN.** No permission string grants it; `legacy_role` is a tenant-level
  value, never an infrastructure one.

`legacy_role: TENANT_ADMIN` is what keeps a manager working on routes **not yet** migrated — those
still evaluate the role tuple. That is the one place the two systems must agree, and it is why this
preset could not exist before Slice 4.

### Every string verified, none invented

Checked against the real gates in `app/`: `reservations.write` · `staff.write` · `services.write` ·
`catalog.write` · `store.write` · `customers.read`. `x.write` satisfies `x.read` (invariant I5), so
the read side needs no separate entry.

**`capabilities.write` is deliberately absent.** `admin/client_services.py`'s own header states the
approved boundary: *"turning a tenant's modules on and off is a tenant-owner decision, not an
operational one. Managers are denied."* A manager runs the business the tenant **has**; deciding
which modules the business **buys** stays with the owner. Team/account management is excluded for
the same reason — a manager runs the business, the owner decides who has keys.

## C. Tests — a real manager account against real routes

Created on the test tenant `barberlab-test`, exercised, then deleted. `catalog` and `store` were
temporarily activated for the tenant (it had only `reservations`) and **removed again afterwards** —
verified back to `['reservations']`.

**Manager reach — identical to the owner on every business surface:**

| Route | manager | owner |
|---|---|---|
| `catalog/categories` · `catalog/items` | **200** | 200 |
| `store/products` | **200** | 200 |
| `customers/` · `barbers/` · `catalog-services/` · `reservations/` | **200** | 200 |

**Manager boundary — denied exactly where intended:**

| Attempt | Result |
|---|---|
| `POST /client-services/activate` (change tenant modules) | **403** |
| `GET /team` (account management) | **403** |

**First run produced two 403s that were NOT the permission gate** — `catalog/items` and
`store/products` — and the owner got 403 on the same routes. Traced to the **service gate**:
`barberlab-test` had only `reservations` active. Recorded because it is exactly the kind of result
that would otherwise be mistaken for a permission bug.

**Tenant binding — proven, not assumed.** A manager token for `barberlab-test` calling
`?client_slug=rk` first returned 200, which looked like a cross-tenant read. It is not: the JWT wins
over the query param (`get_current_tenant`'s documented priority order). Proof — after `catalog` was
removed from `barberlab-test`, the identical `client_slug=rk` request returned **403 "Service
'catalog' is not activated for this tenant"**, i.e. the response tracks the **token's** tenant, not
the parameter's. A client-supplied tenant id cannot cross tenants.

## D. UI

`TeamTab.jsx` gains **مدير المنشأة** (`tenant_manager`), placed between the narrower managers and
المالك so the list reads staff → managers → owner. `مدير الحجوزات` loses its "not available yet"
reason and becomes selectable, because its dependency is gone.

Its hint states the boundary in the merchant's own words: manages reservations, services, staff,
catalog, store and customers — **but is not the owner and does not change the tenant's modules.**

## E. Architectural decision recorded

> **A full-tenant Manager is expressed as a bounded permission array with a `TENANT_ADMIN` legacy
> fallback — never as a second owner account.** The legacy fallback is a migration artefact that
> shrinks as areas migrate; the array is the contract. This is what makes "manager" reviewable and
> revocable rather than a synonym for "owner".

Consequence to watch: while any area remains unmigrated, a manager reaches it through
`legacy_role`, i.e. with owner-equivalent rights on that area. Today every area **is** migrated, so
the gap is closed — but a **new** area added without a permission gate would silently re-open it.
Recorded as the standing invariant for future slices, not as a present defect.

## F. Status change

Blocker §K.1 (`catalog` unmigrated) is **CLOSED**. Remaining: جعفر's two approved production writes,
and the two 🟡 notes.

---

TENANT MANAGER: **GO** — implemented, tested, bounded
SLICE 4 (catalog): **GO** — 9 routes migrated, additive
