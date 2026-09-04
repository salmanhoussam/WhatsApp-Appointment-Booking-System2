# Phase 2B-4 — Server Identity, Team Staff Lifecycle & Server-Driven Nav: Phase Record

**Date:** 2026-09-04
**Status:** Implemented and verified. **UNCOMMITTED** — HEAD `85bd886`, awaiting Salman's review.
**Design:** `PHASE_2B_4_DESIGN.md` (APPROVED, with the three decisions answered).
**Gate that produced it:** `.claudedocs/maturity/dashboard.md` Review 1 — findings B1 and P2.

---

## 1. What shipped

| Artifact | Kind |
|---|---|
| `app/core/permissions.py` | Extended — preset registry, migration gate as data, `describe_authority`, `describe_legacy_owner_authority`, `resolve_preset` |
| `app/api/v1/admin/me.py` | **NEW** — `GET /admin/me` |
| `app/api/v1/admin/__init__.py` | Mounts `me.router` on the existing `_protected` floor |
| `app/api/v1/admin/team.py` | Create extended (preset/addons/barber_id, server-resolved) · list projection · **`POST /team/{id}/reactivate`** |
| `app/repositories/user_repo.py` | `deactivate_user` tenant-scoped at DB level · **`reactivate_user`** · `find_user_by_barber_id` |
| `frontend/src/hooks/useAdminIdentity.js` | **NEW** — identity hook + `hasPermission` |
| `frontend/src/pages/generic-admin/GenericAdminDashboard.jsx` | `PERMISSION_NAV`/`buildPermissionNav`, identity-gated render, owner-only Team entry, out-of-nav safety net |
| `frontend/src/pages/generic-admin/tabs/TeamTab.jsx` | **NEW** — the merchant-facing surface |
| `scripts/test_phase_2b4_core.py` | **NEW** — 37 tests |

**No schema change.** 2B-3's three nullable columns were sufficient, as the design predicted.

## 2. Evidence — separated by kind

### 2.1 Unit level

- `scripts/test_permission_core.py` — **45/45**, unchanged, run before and after (no regression).
- `scripts/test_phase_2b4_core.py` — **37/37**. Groups: A projection fidelity · B client-token owner ·
  C server-side resolution · D migration gate · E no client-supplied permissions survive.

Unit tests prove the resolver and projection logic. They are **not** evidence a route behaves this
way over HTTP — §2.2 and §2.3 are, and they are reported separately on purpose.

### 2.2 Real HTTP — tenant-matched accounts on `barberlab-test`

Test accounts belong to the same tenant being written to, per the standing rule adopted after the
2B-1 incident. `rk` (live) was deliberately **not** used for the write journey: there is no hard
delete in this lifecycle, so a test credential created there would remain forever.

**Identity projection**

| Account | `is_legacy` | `permissions` | `scope` |
|---|---|---|---|
| `admin@barberlab-test.local` (TENANT_ADMIN, legacy) | `true` | `null` | `all` |
| `reservations@barberlab-test.local` (MANAGER_RESERVATIONS, legacy) | `true` | `null` | `all` |
| `rami.staff@example.com` (created via the new API) | `false` | `["reservations.write","staff.read","services.read"]` | `self` |

`permissions: null` for a legacy account is the correct, load-bearing answer (constraint C1), not a
missing value.

**Creation guards** — all five exercised genuinely:

| Attempt | Result |
|---|---|
| `preset=staff` without `barber_id` | **422** "self-scoped and requires barber_id…" |
| `barber_id` from another tenant | **404** (never reveals another tenant's id space) |
| `preset=shop_manager` (unmigrated) | **422** "Unknown preset 'shop_manager'." |
| `preset=staff` + `addons=["inventory"]` | **422** "…grants ['store.write'], whose area has not been migrated…" |
| same `barber_id` linked twice | **409**, not a raw constraint 500 |

**Injection attempt (I7)** — a request carrying `permissions:["store.write","settings.write",
"catalog.write"]` and `scope:"all"` returned **201** with the row stored as
`["reservations.write","staff.read","services.read"]`, `scope="self"`. **The client-supplied array
was ignored entirely.**

**Self-scoping, same routes, two tenant-matched accounts**

| Route | Owner (legacy) | Staff (permission-based) |
|---|---|---|
| `GET /admin/reservations/` | 200, **2** items | 200, **1** item |
| `GET /admin/barbers/` | 200, **2** items | 200, **1** item |

**Forbidden surfaces for the staff account** — `/admin/team` **403**, `/admin/client-services/`
**403** (the 2B-1 gate), `/admin/store/products` **403**, `/admin/customers/` **403** (both
unmigrated ⇒ deny-by-default). Owner controls on the first two: **200**, **200**.

**Lifecycle (P2)** — deactivate **200** → login refused (`"هذا الحساب غير نشط حالياً"`) →
reactivate **200** → login **succeeds**, and the account still sees **1** reservation: the same
scope, restored intact. Cross-tenant reactivate (owner of `barberlab-test` targeting a real `rk`
user id): **404**, rk untouched.

**Legacy equivalence (I1)** — the MANAGER_RESERVATIONS account still sees all **2** reservations
(`scope=all`), still reaches `/admin/barbers/` (200), still gets **403** on `/admin/team`.

### 2.3 Real browser — the acceptance criterion

Driven through a real Playwright browser per `browser-verification-protocol.md`. **The pass below
is the second one**: the first found a real bug (§4), and per the standing restart rule the entire
pass was re-run on the fixed code rather than mixing pre- and post-fix evidence.

| Check | Verdict | Raw basis |
|---|---|---|
| Owner dashboard renders | PASS | `rootLen 20983`, 9 nav items, 0 console errors |
| Team tab | PASS | `/admin/team` → **200**; 4 accounts rendered with preset/scope/barber-link badges |
| Staff login + render | PASS | login **200**, `rootLen 15979`, calendar renders, 0 console errors |
| **Staff nav is restricted** | PASS | staff nav = `["التقويم","الحجوزات","عملائي","خروج"]` — 4 items vs the owner's 9; نظرة عامة/الموظفون/العملاء/الإشعارات/الإعدادات/الفريق all absent |
| Staff never reaches Team | PASS | zero `/admin/team` requests in the staff session |

`GET /admin/me` is the **first** admin request of the staff session — nav genuinely derives from it.
Zero console errors or warnings in either session.

**Honest limit of the browser evidence** (the nested verifier raised it itself): the staff UI never
issues a `/admin/team` request, so the browser proves the *front-end* gate, not the backend 403.
That backend boundary is covered by §2.2's direct call with the staff token (403), not by this pass.

### 2.4 State cleanup

The two accounts created during verification were deleted afterwards. Verified: `barberlab-test`
back to its original **2** seeded users, both barbers intact and unlinked, platform-wide user count
**54** — identical to before 2B-3 and 2B-4. No live tenant data left changed.

## 3. Design decisions carried out as approved

- `/admin/me` carries `active_services` (decision 1) — the dashboard now prefers it and falls back
  to `useTenantConfig`.
- `deactivate_user`'s unscoped `where` tightened alongside the new `reactivate_user` (decision 2),
  narrowly: two queries scoped, no repository redesign, no wider authorization audit.
- The Staff (management) tab is **hidden** for every `scope='self'` account (decision 3) — no
  read-only variant built.

Salman's condition on `/admin/me` — projection, not a second engine — is satisfied structurally:
every `authority` field is produced by a function in `permissions.py`, and `me.py` contains no
role→permission mapping of its own. `write ⇒ read` is deliberately **not** expanded into the
payload; the single client-side mirror lives in `useAdminIdentity.hasPermission`.

## 4. Bugs found during this phase, and what they cost

### 4.1 Prisma `Json` wrapper — a real 500 on the first create

`prisma_client.user.create` rejected a bare Python list for the `permissions` column:
*"`permissions` should be of any of the following types: `NullableJsonNullValueInput`, `Json`"*.
Fixed with `Json(...)`.

**This is the THIRD independent occurrence of this exact class in this codebase** —
`reservation_service.py`, then `catalog_service.py` (both already carry their own comment about
it), now `team.py`. Recorded here as a pattern rather than quietly fixed a third time: it is a
candidate for the same treatment P1/P2 got — a stated rule that any write to a `Json?` column goes
through `Json(...)`.

### 4.2 Response-envelope mismatch — caught only by the browser

`TeamTab.jsx` read `.data` identically from `/admin/team` (a **bare array**) and `/admin/barbers/`
(the standard `{success, data}` envelope, `api-rules.md` §5). The result put an object into `staff`,
`staff.filter` threw, and — because **no error boundary sits above the tab** — the entire dashboard
went blank. Both API calls returned 200 throughout; nothing server-side was wrong.

Fixed by reading each endpoint on its own terms (matching `StaffTab.jsx:155`, which already does
`r.data.data ?? []` for this same endpoint) plus an `Array.isArray` guard, since the failure mode is
a full-dashboard blank rather than one broken widget.

**Two things worth stating plainly:** unit tests and green 200s would never have caught this —
only the real browser did; and the underlying inconsistency (`/admin/team` returning a bare list
while its neighbours use the envelope) is a real API-contract drift that this phase worked *around*
rather than fixed, because normalizing an endpoint's response shape is a behavior change for its
existing consumers (the legacy smar TeamTab). Logged, not silently absorbed.

## 5. Known limitations

- **SUPER_ADMIN over HTTP on a migrated route** — still not directly verified, unchanged from
  2B-3's own limitation and for the same reason (the controlled SA tenant does not activate that
  capability). Unit-level bypass is covered.
- **The three nav mechanisms were deliberately not consolidated** (design §5.3). `ROLE_TABS` stays
  dead-but-present, `buildNav` stays capability-driven, `STAFF_NAV` still serves legacy STAFF.
  Consolidation waits until a second permission-based preset exists, after Slice 3.
- **`/admin/team` returning a bare array** (§4.2) — real drift, not fixed here.

## 6. Scope discipline

Nothing from the excluded list was touched: no Slice 3, no store/catalog/customers migration, no
Shop Manager or Reservations Manager, no inventory add-on activation, no custom-permission UI, no
editing of existing accounts, no `MANAGER_UNITS` migration, no Permission Bundle Correction, **no
JWT change**, and no unrelated dashboard refactor.

No commit, no push, no deploy.
