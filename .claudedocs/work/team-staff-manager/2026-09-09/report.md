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
