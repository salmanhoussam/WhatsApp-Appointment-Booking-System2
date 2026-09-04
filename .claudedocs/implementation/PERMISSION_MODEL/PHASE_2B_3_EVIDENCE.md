# Phase 2B-3 — Permission Core + Slice 2 Backend: Phase Record

**Date:** 2026-09-04
**Status:** **CLOSED ✅** — reviewed and closed by Salman, 2026-09-04. No reopening, no code changes.
**Parent designs:** `PHASE_2B_DESIGN.md` (APPROVED), `PHASE_2B_2_DESIGN.md` (APPROVED) — invariants
I1/I2/I3 binding.
**Commit state at closure:** none. HEAD `85bd886`; all Phase 2B-3 work uncommitted by standing
instruction (no commit/push/deploy without explicit direction).

---

## 1. What shipped (built, not committed)

| Artifact | Kind |
|---|---|
| `prisma/schema.prisma` — `User.permissions` (Json?), `User.scope` (String?), `User.preset` (String?) | Schema, additive + nullable |
| `app/core/permissions.py` | NEW — resolver, scope, `require_permission()` |
| `app/core/tenant.py` — deny-by-default inside `require_roles` | Modified |
| `app/api/v1/admin/reservations.py` — 8 routes | Slice 2 migration |
| `app/api/v1/admin/barbers.py` — 6 routes | Slice 2 migration |
| `app/api/v1/admin/catalog_services.py` — 3 routes | Slice 2 migration |
| `scripts/test_permission_core.py` | NEW — 45 tests, groups A–I |

`prisma db push` succeeded; **54 User rows before and after, every new column NULL** — I1 holds:
every pre-existing account still resolves through its legacy role.

## 2. Evidence — separated by kind, deliberately not merged

### 2.1 Unit level

`scripts/test_permission_core.py` — **45/45 passed**. Groups: A legacy equivalence · B preset
resolution · C write⇒read · D scope · E non-scopable areas · F fail-closed · G deny-by-default ·
H SUPER_ADMIN bypass · I permission-based classification.

Unit tests prove the resolver's logic. They are **not** evidence that a route behaves this way over
HTTP — that is §2.2's job, and the two are reported separately on purpose.

### 2.2 Real HTTP, tenant-matched accounts

Self-scoping, proven live — the single most load-bearing piece of evidence in this phase:

| Account | `GET /admin/reservations/` | `GET /admin/barbers/` |
|---|---|---|
| Tenant Admin (legacy, `permissions=NULL`) | 2 reservations | 2 barbers |
| Permission-based staff (`preset=staff`, `scope=self`) | **1** reservation | **1** barber |

Legacy preservation, proven live — the migration did not widen `staff.read`:

| Route | Legacy STAFF token | Meaning |
|---|---|---|
| `GET /admin/barbers/` | **200** | route's own legacy tuple includes STAFF — preserved |
| `GET /admin/barbers/{id}/services` | **403** | route's own legacy tuple excludes STAFF — preserved |

Both are staff-area reads. This is exactly why `require_permission()` carries the route's own legacy
tuple: the coarse `<area>.<action>` vocabulary cannot express the distinction, and inventing a
permission to paper over it would have been a behavior change disguised as a migration.

Write path, permission-based staff account:

> **`reservations.write` → gate passed; downstream validation rejected request (422).**

Recorded in this wording deliberately (Salman, 2026-09-04). The 422 is **not** a permission failure
— it is positive evidence the permission gate allowed the request through, after which Pydantic
validation rejected the test payload:

```
permission gate passed  →  request reached validation  →  422
```

Anyone reading `write = 422` alone later would misread it as the permission itself failing. It does
not.

## 3. Known limitations — recorded as limitations, not blockers

### 3.1 SUPER_ADMIN on a migrated route

> **SUPER_ADMIN migrated-route HTTP path: not directly verified because the controlled SUPER_ADMIN
> tenant does not activate that capability. Unit-level bypass and live access to an unmigrated admin
> route were verified.**

(Salman's own wording, adopted verbatim.) The controlled SUPER_ADMIN account belongs to `smar`,
which has no `reservations` capability, so `require_service` returns 403 **before** the permission
gate is reached. What *was* verified: unit-level bypass (group H), and live SA access to `/team`
(200, unmigrated admin route).

**Explicitly rejected** as a way to close it: activating a module on a live tenant, or creating a
throwaway SUPER_ADMIN, purely to manufacture a green check. Accepted as a limitation by Salman —
better an honest gap than invented test state.

### 3.2 Pre-existing bug, found incidentally, deliberately not fixed here

`POST /admin/client-services/deactivate` returns 500 for every caller (`update_many` returns an
`int`; the code reads `result.count`), and writes to the DB **before** the exception while
`sync_selected_services` never runs — so `selected_services` can desync. Out of 2B-3's scope;
tracked as its own ticket in `todo_list.md`.

## 4. State cleanup

No live tenant data was left changed by this phase. All allowed-path write tests used
**tenant-matched** accounts, per the standing rule adopted after the 2B-1 incident
(`.claude` memory: `feedback_tenant_matched_test_accounts`).

## 5. Closure

Reviewed by Salman 2026-09-04 against the phase scope. Verdict: schema ✅, resolver ✅, deny-by-default
✅, Slice 2 scope ✅, legacy preservation ✅; the two items in §3.1 and the §2.2 wording recorded as
limitations/clarifications rather than blockers.

**Phase 2B-3 — CLOSED ✅.** No further code changes to this phase.

Track state at closure:

| Phase | State |
|---|---|
| 2B-1 Permission gate prerequisites | CLOSED |
| 2B-2 Permission model design | APPROVED |
| 2B-3 Permission core + Slice 2 | **CLOSED** |

Still open, each its own item: Permission Bundle Correction · Team UI (2B-4) · STAFF account
creation (2B-4) · Shop Manager (blocked on Slice 3) · Inventory add-on (blocked on Slice 3) ·
`MANAGER_UNITS` legacy untouched · the `deactivate` 500 ticket.
