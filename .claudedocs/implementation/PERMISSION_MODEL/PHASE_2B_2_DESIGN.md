# Phase 2B-2 — Presets, Add-ons, Team & STAFF Accounts: Implementation Design

**Date:** 2026-09-04
**Status:** DESIGN ONLY — no code. Awaiting Salman's approval before any implementation slice.
**Parent:** `PHASE_2B_DESIGN.md` (APPROVED) — its invariants **I1/I2/I3 are binding here too**.
**Product decisions being implemented (Salman, 2026-09-04, all APPROVED):**
1. Presets + add-on system; v1 ships exactly **one** add-on ("can manage inventory" → `store.read`
   + `store.write`).
2. Preset names are permission-shaped, never vertical-shaped: موظف/Staff, مدير الحجوزات/Reservations
   Manager, مدير المتجر/Shop Manager, المالك/Tenant Admin.
3. Reservations Manager has **no** `services.write` — a deliberate behavior narrowing, routed to
   Permission Bundle Correction (§12), not folded into the migration.

---

## 1. The structural problem this design had to solve first

Three of the four presets have a natural legacy `UserRole` equivalent. **Shop Manager does not.**
`MANAGER_UNITS` is units/properties/gallery — smar's stay-booking world — not retail.

This matters because the migration is incremental (parent §6): while it runs, some areas check
permissions and others still check roles. A brand-new Shop Manager account would therefore need a
`role` value for the not-yet-migrated routes, and **every available legacy role over-grants**:
`MANAGER_RESERVATIONS` would hand it reservations, `STAFF` would hand it self-scoped reservations,
`TENANT_ADMIN` would hand it everything. There is no legacy role meaning "store only".

**Resolution — deny-by-default for permission-based accounts (§4).** An account that carries an
explicit `permissions` array is governed by permissions alone; any route still using `require_roles`
**denies it**. This is fail-closed, preserves I1 exactly (legacy accounts are untouched), and turns
the ordering requirement into an explicit, checkable rule:

> **A preset may only be offered in the Team UI once every area it grants has been migrated to
> permission checks.**

That rule replaces what would otherwise be a silent over-grant, and it makes the rollout order in
§10 a correctness requirement rather than a preference.

## 2. The four presets

Permission vocabulary is the parent design's §1 (`<area>.<action>`, `write` implies `read`).

| Preset (`preset` value) | Arabic | Permissions | scope |
|---|---|---|---|
| `staff` | موظف | `reservations.write`, `staff.read`, `services.read` | **`self`** |
| `reservations_manager` | مدير الحجوزات | `reservations.write`, `staff.read`, `services.read`, `catalog.read`, `customers.read` | `all` |
| `shop_manager` | مدير المتجر | `store.write`, `catalog.write`, `customers.read` | `all` |
| `tenant_admin` | المالك | *(legacy — see below)* | `all` |

**`tenant_admin` is deliberately NOT permission-based.** An owner account is stored the way it is
today — `role = TENANT_ADMIN`, `permissions = NULL` — so it resolves through the legacy bundle and
keeps working across migrated and unmigrated areas alike. Making it permission-based would gain
nothing and would expose it to the deny-by-default rule for no reason. This is the simplest correct
choice, not a shortcut.

**Not offered as presets:** `SUPER_ADMIN` (platform-level, never a tenant employee) and
`MANAGER_UNITS` (legacy, still gates smar's real units/properties/gallery routes — it keeps working
untouched, it is simply absent from the new UI).

## 3. The inventory add-on

| Add-on | Label | Grants |
|---|---|---|
| `inventory` | يقدر يدير المخزون / Can manage inventory | `store.write` (implies `store.read`) |

Offered on top of `staff` and `reservations_manager`. Meaningless on `shop_manager` (already has
it) and on `tenant_admin` — the UI hides it there rather than showing a no-op checkbox.

**RK's originating case, resolved without a fifth role:**
```
preset = staff  +  addon = inventory  +  scope = self
→ reservations.write (own rows only), staff.read, services.read, store.write
```
That is literally "يحط حجوزات ينزل بضاعة".

**Why scope stays account-level (confirms parent §2 / I2):** this account is `scope='self'`, but
`store` declares itself non-scopable, so `self` has no effect there — the barber sees only his own
appointments *and* the full shared inventory. Correct behavior with one account-level field; no
per-area scope needed. RK's case is the proof.

## 4. Permission resolution

Single resolver, one place, consulted by `require_permission(area.action)`:

```
1. role == SUPER_ADMIN                  → ALLOW (bypass, never permission-modelled)
2. user.permissions IS NULL             → legacy bundle for user.role   [I1 — unchanged behavior]
3. user.permissions IS NOT NULL         → membership test against that array
                                          ('x.write' in perms also satisfies 'x.read')
4. if the area is scopable AND scope == 'self'
                                        → additionally constrain to the account's own rows;
                                          scope='self' with no barberId → 403 (fail closed)
5. area not scopable                    → scope ignored entirely       [I2]
```

And the deny-by-default rule from §1, which lives in `require_roles`, not in the new resolver:

```
require_roles(*roles):
    permissions IS NULL  → existing role check, byte-identical to today   [I1]
    permissions NOT NULL → DENY (403). The account is permission-based; this route
                           has not been migrated yet and cannot evaluate it.
```

Scopable areas today: `reservations`, `staff`. Every other area ignores `scope`.

## 5. User DB fields

Three **additive, nullable** columns on `User` — no new table, no join, riding on the row
`get_current_admin_user` already loads every request (parent §0):

```
permissions  Json?    // resolved final array, e.g. ["reservations.write","staff.read","store.write"]
scope        String?  // 'self' | 'all' | null
preset       String?  // 'staff' | 'reservations_manager' | 'shop_manager' | null
```

`role` stays as-is (NOT NULL, existing default). For permission-based accounts it is **not
authoritative** — documented in the schema comment — and is set to the nearest legacy value purely
for readability when someone reads the table directly.

**`permissions` stores the fully-resolved array (preset baseline + add-ons), not a reference.**
Deliberate: an account's privileges are then frozen at creation and **cannot change silently when a
preset definition is later edited**. Editing the `shop_manager` preset must never retroactively
re-privilege existing accounts without review — the same principle as I3. The UI reconstructs
"preset + add-ons" for display by diffing the stored array against the preset baseline; if they
diverge (because a definition changed), the UI shows the real stored permissions, which is the
honest thing to display.

## 6. Backward compatibility

- All three columns nullable; **every account that exists today has all three NULL** → resolves via
  the legacy bundle → behavior identical to today (I1).
- `require_roles` is unchanged for NULL-permission accounts — the deny-by-default branch (§4) can
  only trigger for accounts that did not exist before this feature.
- No token change, no re-issue, no forced logout (parent §4).
- `MANAGER_UNITS` and smar's whole world keep working untouched.
- No existing row is written to by this feature's rollout.

## 7. Team / STAFF account creation

Extends `app/api/v1/admin/team.py` (already built, `SA`/`TA`-gated, tenant-forced, bcrypt, soft
delete — parent §8):

- `TeamMemberCreate` gains `preset` (the three assignable presets; `tenant_admin` only assignable
  by an existing `TENANT_ADMIN`/`SUPER_ADMIN`), `addons: list[str]`, and `barber_id: str | None`.
- On create, the server resolves preset + add-ons → writes `permissions`, `scope`, `preset`. The
  client never sends a permission array — **presets are resolved server-side**, so a crafted request
  cannot grant itself arbitrary permissions.
- **`preset='staff'` requires `barber_id`.** A self-scoped account without one fails closed on
  every request (`_require_staff_barber_id` → 403), so creating one is creating a broken account —
  reject at creation with a clear message instead.
- `barber_id` must belong to the requesting tenant (verify before linking) and must be unlinked —
  `User.barberId` is `@unique`, so return a clean **409** rather than surfacing a raw constraint
  error.
- `role` is set to the nearest legacy value (`staff`→`STAFF`, `reservations_manager`→
  `MANAGER_RESERVATIONS`, `shop_manager`→`STAFF` as an inert placeholder) and is non-authoritative
  per §5 — the account is governed by its permissions.

## 8. Generic Admin Team UI

A **Team tab** in `GenericAdminDashboard`, consuming the existing `/team` endpoints — this is the
gap where the API exists but only smar's *legacy* dashboard consumes it (parent §9 / Phase 2A F6).

v1 scope:
- **List**: name, email, preset label (Arabic), add-on chips, active state.
- **Create**: name, email, password, **preset dropdown (4)**, **add-on checkbox** (hidden when
  meaningless, §3), **barber picker shown only when preset = موظف** (required, §7).
- **Deactivate** (existing soft-delete).
- **Only presets whose areas are fully migrated are selectable** (§1's rule) — the others are
  visibly disabled with a short reason, rather than hidden, so the UI does not silently differ
  between environments mid-migration.
- Explicitly **not** in v1: per-permission checkboxes, custom preset builder, scope toggle, editing
  an existing account's preset. The backend supports all of it; exposure waits for real demand.
- `pages/smar/admin/components/TeamTab.jsx` stays untouched.

## 9. Migration strategy

Unchanged from parent §6 — `require_permission` added *alongside* `require_roles`, which is never
deleted — with the §1 rule now making the order load-bearing:

| Slice | Areas migrated | Unlocks |
|---|---|---|
| 1 | *(done — Phase 2B-1)* `capabilities` gated | — |
| 2 | `reservations`, `staff`, `services` | preset **موظف / Staff** |
| 3 | `store`, `catalog`, `customers` | presets **مدير المتجر** and **مدير الحجوزات** |
| 4 | remaining areas | mechanical; pattern already proven |

`tenant_admin` needs no migration at all (§2). Each slice is independently approvable, independently
verifiable, and independently revertible.

## 10. Tests

Run before and after each slice; identical results prove a behavior-neutral swap.

**A. Legacy equivalence (proves I1 — the critical backward-compat test).** For each of the 5 legacy
roles × 15 areas × {read, write}, with all three columns NULL: response code must equal the
pre-migration baseline.

**B. Preset resolution.** Each preset resolves to exactly §2's permission set; `write` implies
`read`; add-on adds exactly `store.write`; `staff`+`inventory`+`self` produces RK's case (§3)
end-to-end.

**C. Scope (I2).** `scope='self'` limits `reservations` and `staff` to own rows; **has no effect on
`store`/`catalog`/any non-scopable area**; `scope='self'` without `barberId` → 403 fail-closed.

**D. Deny-by-default (§1/§4).** A permission-based account hitting a **not-yet-migrated**
`require_roles` route → 403, never an over-grant. This is the test that makes incremental migration
safe.

**E. Creation guards (§7).** `preset='staff'` without `barber_id` → rejected; `barber_id` from
another tenant → rejected; already-linked `barber_id` → 409; client-supplied permission array is
ignored (server-side resolution only).

**F. Security regressions.** Cross-tenant access impossible under every preset/add-on/scope
combination; `SUPER_ADMIN` bypass intact; STAFF still 403 on `capabilities.*` (the 2B-1 fix).

**G. Real browser verification** on the Team UI slice, per `browser-verification-protocol.md`:
create an account with a preset, **log in as it**, confirm only permitted tabs render and a
forbidden call returns 403.

**Test-account rule (standing, after the 2B-1 incident):** allowed-path write tests must use a
**tenant-matched** account; record the target tenant's before/after state as proof of no-change. An
inactive account returns 401 before the role check — a 401 is not evidence a gate denies that role.

## 11. Rollback

| Level | Rollback |
|---|---|
| One migrated area | Revert that area's dependency swap — one file, no data change |
| Team UI | Revert the tab; API and data untouched |
| Whole feature | Revert the commits; the three nullable columns can stay (unread, harmless) |
| Schema | Additive and nullable — dropping is optional and non-urgent |

No destructive migration anywhere. Nothing is deleted, renamed, or rewritten in place.

## 12. Permission Bundle Correction — SEPARATE work item, not part of the above

Per I3 and Salman's explicit instruction, narrowing the legacy `MANAGER_RESERVATIONS` bundle is its
own reviewed change with its own approval and verification. It is **not** part of any migration
slice, because it changes real behavior for existing accounts.

**Change:** legacy `MANAGER_RESERVATIONS` loses `store.*` and `services.write`.

**Required tests (Salman's own wording):**
```
Reservations Manager
  reservations.read/write → allowed
  services.read           → allowed
  services.write          → denied
  store.*                 → denied
```

**Blast radius, measured 2026-09-04:** exactly **one active** `MANAGER_RESERVATIONS` account exists
platform-wide — `reservations@barberlab-test.local` on the `barberlab-test` tenant. Every other
manager account is `isActive=False`. So this correction is currently near-zero-risk and easy to
verify end-to-end — but the count must be **re-measured immediately before it ships**, not assumed
from this date.

`MANAGER_UNITS` keeping `catalog.*` is the second known anomaly (parent §5) and is **not** included
here — it belongs to smar's live world and needs its own separate assessment.

---

## Open questions

1. **Shop Manager's `role` placeholder** (§7) — `STAFF` is proposed as an inert value since
   deny-by-default makes it non-granting. Alternative: add a `SHOP_MANAGER` enum value for
   readability. Cosmetic under this design, but it is a schema change either way, so worth deciding
   before slice 3 rather than after.
2. **Editing an existing account's preset** is out of v1 (§8) — confirm that create + deactivate is
   enough for now, or whether "change this employee's permissions" is needed immediately.
3. **`MANAGER_UNITS` long-term** — it is absent from the new preset vocabulary but still gates
   smar's real routes. Fine indefinitely; flagging that it has no migration path defined yet.
