# Team · Services · Manager · Barber/User — Investigation

**Date:** 2026-09-09 · **Mode:** INVESTIGATION ONLY — no code changed, no schema touched, no
migration, no deploy, no push. Production was read **read-only** (`SELECT` only).
**Status:** CLOSED — four verdicts at the end.

---

## 1. Current Team architecture

**Team is ALREADY the employee-account management surface.** This was not obvious from the UI and
is the single most important finding for sections 1 and 3.

| Question asked | Answer, with evidence |
|---|---|
| Where does employee creation happen? | `POST /api/v1/admin/team` (`app/api/v1/admin/team.py:115`), driven by `frontend/src/pages/generic-admin/tabs/TeamTab.jsx` |
| Backend service/route | `admin/team.py` → `users` table. Also `DELETE /team/{id}` (deactivates), `POST /team/{id}/reactivate` |
| Frontend component | `TeamTab.jsx`; nav entry `GenericAdminDashboard.jsx:178` |
| Who may call it | `require_roles("SUPER_ADMIN", "TENANT_ADMIN")` — `team.py:120` |
| Is the nav entry gated? | Yes — `const team = isOwner ? [...] : []` (`GenericAdminDashboard.jsx:178`), matching the backend matrix |
| Tenant binding | **Server-derived** — `row["clientId"] = tenant["id"]`, commented `# CRITICAL: always the current tenant` (`team.py:145`). A client-supplied tenant id is impossible |
| Preset selector present? | **Yes** — `TeamTab.jsx:59` defines all four presets and renders them at `:454`, showing unassignable ones **disabled with a reason** |
| Does creating a Team member create a Barber? | **NO.** `team.py:173-186` requires an **existing** `barber_id` when the preset is self-scoped, validates it belongs to the requesting tenant (404 otherwise), and rejects a duplicate link (409) |
| Where are Barbers created? | Only `StaffTab.jsx:325` → `POST /barbers/` |

**So the gap in section 1 is narrow and specific:** Team can *link* an account to a Barber, it
cannot *create* one. Making "add employee in Team" create both entities is a **lifecycle-semantics
change**, which this task's own boundary says to stop and report rather than implement.

---

## 2. Current Workers/Services navigation

Every live occurrence of the label, found by grep:

| File | Line | What it is |
|---|---|---|
| `GenericAdminDashboard.jsx` | **207** | The nav entry itself — `{ id: 'staff', labelAr: 'الموظفون', Icon: IconStaff }` |
| `GenericAdminDashboard.jsx` | 673 | `case 'staff':` — renders `<StaffTab/>` |
| `StaffTab.jsx` | **465** | **An internal toggle: `[['employees','الموظفون'], ['services','الخدمات']]`** |
| `StaffTab.jsx` | 485 | Heading — `subView === 'employees' ? 'الموظفون' : 'الخدمات'` |
| `StaffTab.jsx` | 15, 103, 494 | Comments describing that toggle (Staff/Store IA Separation, 2026-08-09) |

### 🔴 The rename is not a one-line change — it collides

`StaffTab` **already contains a `الموظفون / الخدمات` toggle**. Renaming the tab to `الخدمات`
produces:

```
الخدمات  (tab)
   └── [ الموظفون | الخدمات ]   (toggle inside it)
```

A tab named الخدمات whose first sub-view is الموظفون, containing a second thing also called
الخدمات. That reads as a bug, not a rename.

**The rename only becomes coherent once the `employees` sub-view leaves** — which is exactly the
Team change in section 1. The two are one change, not two: **section 2 cannot be executed
independently of section 1's decision.**

---

## 3. Manager role/preset behaviour

Computed from the live module (`app.core.permissions`), not read off the source:

```
MIGRATED_AREAS     : capabilities, customers, reservations, services, staff, store
ASSIGNABLE_PRESETS : shop_manager, staff, tenant_admin
ASSIGNABLE_ADDONS  : inventory
```

| Preset | Assignable | Permissions | Scope | legacy_role | requires_barber |
|---|---|---|---|---|---|
| `staff` | ✅ | `reservations.write` `staff.read` `services.read` | **self** | STAFF | **YES** |
| `shop_manager` | ✅ | `store.write` `customers.read` | all | STAFF *(inert)* | no |
| `tenant_admin` | ✅ | `None` = legacy account | all | TENANT_ADMIN | no |
| **`reservations_manager`** | ❌ **BLOCKED** | + `catalog.read` `customers.read` | all | MANAGER_RESERVATIONS | no |

**A. Selectable manager presets today: `shop_manager` only.**
**B.** `shop_manager` grants `store.write` + `customers.read` — and `store.write` is deliberately
un-split, so it also covers store categories and `PATCH /orders/{id}/status` (documented at
`permissions.py`'s ADDONS note; do not describe it as inventory-only).
**C. Yes** — TENANT_ADMIN can create it today, server-enforced.
**D. Yes** — `TeamTab.jsx:454` already renders the selector.
**E. Yes** — `require_roles("SUPER_ADMIN","TENANT_ADMIN")` on the route.

**`reservations_manager` is blocked by the `catalog` area, which Slice 4 has not migrated.** The
block is enforced **server-side** (`resolve_preset` raises 422 naming the missing dependency), not
only in the UI — so it cannot be bypassed by a crafted request.

**No new role is needed, and none should be added.** The requested capability exists; one of the two
managers is gated behind an unrelated, already-planned slice.

### Safety properties verified (no accidental escalation)

- `permissions` is **never accepted from the client** — `TeamMemberCreate`'s docstring states it and
  the model has no such field; resolution is server-side only.
- `SUPER_ADMIN` is **not** a preset and cannot be selected — `PRESETS` has no such entry.
- Cross-tenant creation impossible — `clientId` forced from the JWT.
- A barber link is validated against the requesting tenant (404 on a foreign id, so another
  tenant's id space is not probeable).

---

## 4. Barber/User dependency map

### Schema (`prisma/schema.prisma`)

```
User.barberId  String? @unique  -> Barber.id  onDelete: SetNull
Barber.user    User?            (opposite side — at most one account per barber)
```

**Cardinality is 1 : 0..1 in both directions**, enforced by the `@unique` on a nullable column.

| Referencing table | Column | → |
|---|---|---|
| `reservations` | `barber_id` | **barbers** |
| `barber_services` | `barber_id` | **barbers** |
| `users` | `barber_id` | **barbers** |
| `properties` | `manager_id` | **users** |

### The seventeen questions, answered

| # | Question | Answer |
|---|---|---|
| 1 | Is Barber a business/resource entity? | **Yes** — `workingHours`, `sortOrder`, `imageUrl`, `description`, `isActive`; it is what a Reservation is booked against |
| 2 | Is User an auth/account entity? | **Yes** — `email @unique` NOT NULL, `password_hash` NOT NULL, tokens, `lastLoginAt`, `permissions`/`scope`/`preset` |
| 3 | Barber without a User? | **Yes — and today that is 10 of 10** (see data below) |
| 4 | User without a Barber? | **Yes — today 33 of 33** |
| 5 | User with a Barber? | Supported; historically real (جعفر), **currently zero** |
| 6 | Multiple Users → one Barber? | **No** — `@unique` forbids it |
| 7 | Is `barberId` unique? | **Yes** |
| 8 | Tables referencing Barber | `reservations`, `barber_services`, `users` |
| 9 | Tables referencing User | `properties.manager_id` |
| 10 | Historical/demo rows violating assumptions? | See anomalies below |
| 11 | Real production rows affected? | **Yes — 42 reservations, 39 barber_services, 10 barbers, 33 users** |
| 12 | Would merging break reservations? | **Yes** — every one of the 42 points at a barber that has **no account** |
| 13 | Would merging break BarberService? | **Yes** — 39 rows keyed on `barber_id` |
| 14 | Would merging break staff self-scope? | **Yes** — `permissions.py:250-254` resolves self-scope from `user.barberId`; merging removes the join it reads |
| 15 | Would merging break employee onboarding? | **Yes** — `team.py` links to an existing Barber; a merged entity would need `email`+`password_hash` (both NOT NULL) for every barber |
| 16 | Would merging break WhatsApp merchant notifications? | **Partly** — `_notify_merchant_new_reservation` resolves the staff phone via `user_repo.find_user_by_barber_id(barberId)`. With a merged entity the lookup is simpler; but `barbers.phone` is **NULL for all 10**, so the data to merge into does not exist |
| 17 | Does it simplify enough to justify the risk? | **No** — see verdict |

### Real data (production, read-only, 2026-09-09)

```
barbers                       10
users                         33
users with barber_id          0        <-- ZERO
barbers with no account       10       <-- ALL
reservations with a barber    42
barber_services               39
cross-tenant links            0        <-- clean
```

Barbers with no login account, per tenant: `mr-h` 2 · `alzabt-demo` 2 · `rk` 2 ·
`barberlab-test` 2 · `demo-barber-6efb` 1 · `demo-barber-d61e` 1.
Reservations pointing at an account-less barber: `rk` 28 · `mr-h` 11 · `barberlab-test` 2 ·
`alzabt-demo` 1.

Users by role: TENANT_ADMIN 24 · MANAGER_RESERVATIONS 4 · MANAGER_UNITS 3 · STAFF 1 · SUPER_ADMIN 1.
Only **one** account is permission-based (`preset='staff'`, `scope='self'`); the other 32 are legacy
(`permissions` NULL), exactly as invariant I1 promised.

### 🔴 Anomaly found — and it is live, not historical

**جعفر's account was DEACTIVATED on 2026-09-08 19:21:27**, and his `barber_id` was released to NULL
by the same action (commit `a0ccf41`, "release the barber link when deactivating an account").

```
جعفر صالح · jaafar@rk.salmansaas.com · STAFF · preset=staff · scope=self
barber_id = NULL · is_active = FALSE · updated_at = 2026-09-08 19:21:27
```

Two consequences that block work already in flight:

1. **His setup link is now dead even though the token is valid until 2026-09-14.**
   `auth.py:291` and `:446` both reject an inactive account with `403` before touching the token. So
   the pending WhatsApp test cannot succeed until he is reactivated.
2. **Even reactivated, he would be locked out of scoped areas.** His preset is `staff` (`scope=self`)
   and `permissions.py:250-254` raises **403** when a self-scoped account has no `barberId`.
   Reactivation alone is not enough — the barber link must be restored too.

This also explains the `users with barber_id = 0` figure: it is the result of last night's
deactivation, **not** a longstanding truth. The link mechanism works and has been exercised — browser
evidence 2026-08-10 (`work/staff-barbers-roster-scoping/`) showed جعفر correctly seeing only his own
column.

---

## 5. Merge feasibility: **NOT RECOMMENDED**

Not "impossible" — the model is coherent and could be unified. But the evidence says the merge
buys little and costs a lot **right now**:

**Against merging**
- The two entities are genuinely different: one is a *bookable resource with working hours*, the
  other an *authentication principal with a password*. The current schema says so, and the live data
  agrees emphatically — **10 of 10 barbers have no account**.
- A merged table needs `email` and `password_hash` (both NOT NULL today) for every barber, or those
  columns become nullable — which weakens the auth model to accommodate non-auth rows.
- 42 reservations + 39 barber_services would need repointing, on live tenants, with **no staging
  rehearsal available** ([[feedback_migration_staging_discipline]]).
- Self-scope (`permissions.py:250-254`) is built on the join; it would need rewriting along with
  the Permission Model slices that depend on it.
- `barbers.phone` is NULL for all 10 — there is no data to merge *into* on the resource side.

**For merging (recorded honestly)**
- One "add employee" action instead of two entities is genuinely simpler for the owner — which is
  precisely the confusion Salman named.
- `@unique` on `barberId` already makes the relation 1:1, so no data would be lost by collapsing it.

**The owner-facing problem does not require the merge.** Salman's actual complaint was *two "new
employee" buttons that create different things*. That is solvable in the UI/route layer — option (أ)
from 2026-09-08: one Team action that creates the Barber **and** the account and links them —
without touching the schema at all.

**If a merge is ever revisited**, the honest target is not "delete Barber": it is
`Barber = the resource`, `User = the account`, with the account optional — which is **exactly the
current model**. The merge would be a UI/product simplification wearing a schema costume.

---

## 6. Exact implementation performed

**None.** All three product sections resolved to decisions rather than safe edits:

- Section 1 is already built, except for a lifecycle-semantics change the boundary forbids.
- Section 2's rename is incoherent until section 1 is decided.
- Section 3 already works for the one assignable manager; the other is blocked by Slice 4.

No file was modified. `git status` clean apart from this report.
