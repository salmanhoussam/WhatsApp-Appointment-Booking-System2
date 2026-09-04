# Phase 2B-4 — Server Identity, Team Staff Lifecycle & Server-Driven Nav: Implementation Design

**Date:** 2026-09-04
**Status:** DESIGN ONLY — no code written. Awaiting Salman's review before any implementation.
**Parents:** `PHASE_2B_DESIGN.md` (APPROVED) · `PHASE_2B_2_DESIGN.md` (APPROVED) ·
`PHASE_2B_3_EVIDENCE.md` (CLOSED) — invariants **I1–I7 binding**.
**Gate that produced this phase:** `.claudedocs/maturity/dashboard.md` Review 1 (2026-09-04) —
finding B1 (no server-truth identity endpoint) and pattern P2 (soft-delete with no restore path).

**Mission (Salman's own wording):** prove the first real account lifecycle for a permission-based
Staff member — *server identity → navigation → creation → login → self-scoped access →
deactivate/reactivate.*

---

## 0. The condition this design is built to satisfy

> `/admin/me` must be a **projection of resolved server state, not a second permission engine.**

Concretely, that means one rule governs every line below:

```
app/core/permissions.py   →  the only place authorization rules exist
        ↓  (called, never re-implemented)
GET /admin/me             →  serializes what the resolver returns
        ↓  (consumed, never re-derived)
GenericAdminDashboard     →  renders what it is told
```

No permission constant, no bundle table, no `if role == …` mapping may be introduced in the route
layer or the frontend. Where this design needs a rule the resolver doesn't already expose, it says
so explicitly and adds it **inside `permissions.py`** (§3.3), not beside it.

---

## 1. Three real constraints found in the code — these shape the design

These were found by reading the source during the Dashboard Review, not predicted. Each one would
have become a mid-implementation surprise.

### C1 — A legacy account has no resolved permission array, by design

`app/core/permissions.py` contains **no legacy role → permissions bundle map**. I1 is implemented by
carrying each route's *own* legacy tuple (`require_permission(perm, *legacy_roles)`, `:130-168`),
precisely so no bundle is ever re-derived. The module docstring states this outright (`:28-35`).

**Consequence:** `/admin/me` **cannot** return a permission array for a legacy account without
inventing one — which is exactly the second engine Salman forbade. It must return
`permissions: null` and say so honestly.

**Therefore the UI keeps two paths, and that is correct, not a compromise:**

| Account | `/admin/me` returns | Nav derivation |
|---|---|---|
| Legacy (`permissions IS NULL`) | `permissions: null` + live `role` | Existing role/capability logic, **unchanged** (I1 applied to the UI too) |
| Permission-based | the resolved array + `scope` + `preset` | Derived from that array |

This preserves I1 at the Interface layer with the same literalness the backend already does.

### C2 — Tenant owners may hold a **client-type** token, and have no `User` row at all

`get_current_admin_user` (`app/core/tenant.py:345-390`) requires `payload.type == "admin"` and loads
a `User` row. But `get_authenticated_tenant` (`:274-292`) explicitly accepts **Client-type tokens
too**, and `useAdminRole.js:12-13` already maps `payload.type === 'client'` → `'TENANT_ADMIN'`.

**Consequence:** an owner logged in through the Client path has **no `User` row**. If `/admin/me`
depended only on `get_current_admin_user`, those owners would get **401 and a broken dashboard** —
a regression introduced by an "improvement".

**Resolution:** `/admin/me` handles both token types (§3.2). The client-token branch returns exactly
the identity `useAdminRole()` already synthesizes today — this **moves an existing client-side
mapping to the server unchanged**; it does not invent authority.

### C3 — `GET /team` cannot describe a permission-based account

`team.py:49-59` returns `id/full_name/email/role/is_active/created_at` only. A Team UI could not show
what an account actually has. `TeamMemberCreate.role` (`:36`) is
`Literal["MANAGER_RESERVATIONS","MANAGER_UNITS"]` — **`STAFF` is not creatable at all**, which is
where Phase 2A's F6 gap physically lives.

---

## 2. Scope

### In scope

| # | Item | Why |
|---|---|---|
| A | `GET /admin/me` | Review B1 — the blocking prerequisite |
| B | Team: create a permission-based Staff account (preset, add-ons, `barber_id`) | The mission |
| C | Team: **reactivate** | Review P2 — the API 2B-4 builds on is one-way today |
| D | Server-driven nav for permission-based accounts | Closes the JWT/DB seam |
| E | Team tab in `GenericAdminDashboard` | The merchant-facing surface |
| F | Real browser verification of the full lifecycle | `browser-verification-protocol.md` |

### Explicitly out of scope (Salman's list, restated so it is checkable)

❌ Slice 3 · ❌ `store`/`catalog`/`customers` migration · ❌ Shop Manager · ❌ Reservations Manager ·
❌ inventory add-on **activation** · ❌ custom-permission UI · ❌ editing existing accounts ·
❌ `MANAGER_UNITS` migration · ❌ Permission Bundle Correction · ❌ **any JWT modification** ·
❌ unrelated dashboard refactor (the three nav mechanisms are **not** consolidated in this phase;
see §5.3).

---

## 3. A — `GET /admin/me`

### 3.1 Placement

`app/api/v1/admin/me.py`, mounted on the existing `_protected` router
(`admin/__init__.py:24`), which already requires a valid JWT of either type. New file rather than a
route inside `team.py`: `/team` is *managing other people's accounts* (SA/TA-only); `/me` is *the
caller describing itself* and must be callable by **every** authenticated admin-surface identity,
including a STAFF account. Different resource, different authorization — a separate file keeps that
obvious.

### 3.2 Authorization

**Any authenticated identity may read its own `/me`.** No `require_roles`, no `require_permission` —
gating an identity endpoint on a permission the caller might lack would deadlock the dashboard
before it can decide what to render.

Two branches, matching C2:

```
Admin-type token  → get_current_admin_user(request) → real User row → project it
Client-type token → tenant-owner identity (no User row) → project the same shape
```

The client branch must be reached **without** letting `get_current_admin_user`'s 401 escape. The
design intent: inspect the decoded token type first, then call the matching path — the route
performs no authorization decision of its own beyond "is this token valid", which `_protected`
already guarantees.

### 3.3 Response contract

```jsonc
{
  "identity": {
    "account_type": "admin" | "client",   // which token/identity path resolved this
    "user_id":      "uuid" | null,        // null for a client-token owner (C2)
    "full_name":    "string" | null,
    "email":        "string" | null,
    "client_id":    "uuid",
    "slug":         "string"
  },
  "authority": {
    "role":        "TENANT_ADMIN",        // LIVE from the DB row, not the token
    "is_legacy":   true,                  // == (permissions IS NULL)
    "permissions": null,                  // null for legacy (C1); the array otherwise
    "scope":       "all",                 // resolver's scope_of()
    "preset":      null,                  // the stored preset label, or null
    "scopable_areas": ["reservations", "staff"]   // SCOPABLE_AREAS, so the UI never hardcodes it
  },
  "capabilities": {
    "active_services": ["reservations", "store"]  // see §3.5
  }
}
```

**Every field is a projection of something that already exists:**

| Field | Source — no new logic |
|---|---|
| `role` | `permissions._role_of(user)` |
| `is_legacy` | `not permissions.is_permission_based(user)` |
| `permissions` | the stored array (or `null`), unmodified |
| `scope` | `permissions.scope_of(user)` |
| `scopable_areas` | `permissions.SCOPABLE_AREAS` |
| `preset` | the stored `User.preset` column |

**Deliberately NOT returned:** an "effective/expanded" permission list. `write` implies `read` (I5)
is a *resolver* rule; expanding it into the payload would place a copy of that rule in the transport
layer and let the two drift. The frontend asks the same question the backend does, using the one
helper below.

**The one addition to `permissions.py`** — because §0 forbids putting it anywhere else:

```
permissions.py  gains a pure projection helper, e.g. describe_authority(user) -> dict
                returning exactly the `authority` block above, built from the functions
                already in that module. The route serializes its return value and adds nothing.
```

If the UI later needs the write⇒read expansion, it is exported from that same helper — never
re-implemented in JS.

### 3.4 Errors

| Case | Response |
|---|---|
| No/invalid/expired token | `401` (from `_protected`, unchanged) |
| Suspended / lifecycle-blocked tenant | whatever `get_current_admin_user` already raises — **unchanged**; this endpoint does not create a new bypass around `_assert_client_active` |
| Valid token, user row deactivated mid-session | `401`, same as every other admin route today |

### 3.5 Open decision — does `/me` carry `active_services`?

Today the dashboard gets `active_services` from `useTenantConfig` (a separate public config call).
Including it in `/me` would let the dashboard render from **one** authoritative call instead of two
that can disagree mid-load. Against: it mixes *tenant capability* with *user authority* in one
payload, and duplicates a value another endpoint already owns.

**Recommendation:** include it, because the nav needs both axes simultaneously and the review found
two real bugs (Store B1, OverviewTab) caused by a surface acting before capability was known.
**Decision required from Salman** — if rejected, the `capabilities` block is dropped and the UI keeps
using `useTenantConfig` for that half.

---

## 4. B + C — Team Staff lifecycle

All changes are in `app/api/v1/admin/team.py` and its repository. Authorization on all `/team`
routes stays `require_roles("SUPER_ADMIN","TENANT_ADMIN")` — unchanged, and correct: managing
accounts is an owner action. (Deny-by-default therefore also means a permission-based account cannot
manage the team, which is the intended v1 behavior.)

### 4.1 Create — `POST /team`

`TeamMemberCreate` gains:

| Field | Rule |
|---|---|
| `preset` | one of the **assignable, fully-migrated** presets. In this phase that is `staff` only (§4.3) |
| `addons` | `list[str]`, empty in this phase — `inventory` is **rejected** until Slice 3 (§4.3) |
| `barber_id` | **required when `preset == "staff"`**; must belong to the requesting tenant; must be unlinked |
| `role` | no longer client-supplied for a preset-based create — the server sets the inert legacy placeholder |

**Server-side resolution (I7) — the client can never send a permission array.** The server maps
`preset` → the constant already in `permissions.py` (`PRESET_STAFF`), writes `permissions`, `scope`,
`preset`, and the placeholder `role`. Any `permissions` field appearing in the request body is
ignored, not honored.

**Guards, each returning a clean status rather than a raw DB error:**

| Condition | Status |
|---|---|
| `preset == "staff"` with no `barber_id` | `422` — a self-scoped account with no barber link fails closed on every request (`scope_barber_id` raises 403), so creating one creates a broken account |
| `barber_id` not in the requesting tenant | `404` (never reveal another tenant's id space) |
| `barber_id` already linked (`User.barberId` is `@unique`) | `409` |
| email already used | `409` (existing behavior, unchanged) |
| `preset` not assignable in this phase | `422`, with the reason |

`clientId` stays forced to the requesting tenant (`team.py:83`) — unchanged.

### 4.2 List — `GET /team`

Extended with `preset`, `permissions`, `scope`, `barber_id`, and the existing `is_active`.
`find_users_by_client` (`user_repo.py:66-71`) already returns **all** users regardless of
`isActive`, so inactive members are available for the reactivate affordance with no repository
change. (`team.py:46`'s docstring says "active users" and is simply wrong — a docstring correction,
not a behavior change.)

### 4.3 The migration gate, enforced server-side as well as in the UI

2B-2 §1's binding rule — *a preset may only be offered once every area it grants is migrated* — is
enforced in **two** places: the UI disables the option, and the API rejects it. UI-only enforcement
would leave a crafted request able to create an account that is 403'd everywhere.

Concretely, in this phase: `staff` is assignable; `reservations_manager` and `shop_manager` are
rejected (their areas await Slice 3); `tenant_admin` is created the legacy way (`permissions=NULL`),
and stays assignable only by an existing TA/SA. The `inventory` add-on is rejected — it grants
`store.write`, and `store` is not migrated.

### 4.4 Reactivate — Review finding P2

```
POST /team/{user_id}/reactivate      (mirrors DELETE /team/{user_id})
```

- Same authorization as its inverse (`SUPER_ADMIN`/`TENANT_ADMIN`).
- Same ownership pre-check (`find_user_by_id(user_id, tenant_id)`) before acting.
- Sets `isActive = true`. **No hard delete anywhere in this phase.**
- **`POST` + a sub-path, not `PATCH /team/{id}`**: a general update route would be an editing
  surface, and editing existing accounts is explicitly out of v1. A single-purpose route cannot
  become one by accident.

**Repository note (Review Discovery 3):** `deactivate_user` (`user_repo.py:101-106`) runs
`where={"id": user_id}` with no `clientId`; tenant scope rests entirely on the route's pre-check.
The new `reactivate_user` **must not copy that shape** — it scopes on both. Whether the existing
`deactivate_user` is also tightened is a one-line defense-in-depth change; **Decision required from
Salman** (in-scope as a sibling of the new route, or its own hygiene ticket).

---

## 5. D + E — Frontend

### 5.1 The identity hook

A new `useAdminIdentity()` (React Query, key `[slug, 'me']`) calling `GET /admin/me`, per
`rules/frontend/feature-structure.md` (data access lives in `hooks/`, never in a section).

`useAdminRole()` / `useAdminBarberId()` are **not deleted** in this phase — they have call sites
outside this dashboard (`ProtectedRoute.jsx`, the legacy Smar dashboard). This phase changes what
`GenericAdminDashboard` *trusts*, not what exists. Same "add alongside, delete nothing" discipline
2B-3 used for `require_roles`.

**Loading state matters.** Nav today renders from a synchronously-decoded JWT; `/me` is async. The
dashboard already solves exactly this for `hasReservations`
(`GenericAdminDashboard.jsx:527-542` — a `hasSetDefaultRef` guard against a force-navigate once the
async config resolves). The Team/nav work must not reintroduce the bug that guard exists for:
**render no nav until identity resolves**, rather than rendering a legacy-shaped nav and swapping it.

### 5.2 Nav derivation

```
identity.is_legacy === true   → existing behavior, untouched (I1)
                                 role from /me (live DB) instead of the JWT
identity.is_legacy === false  → nav entries derived from identity.permissions
                                 ∩ tenant active_services
```

The permission-based branch replaces `isStaff ? STAFF_NAV : …` **for permission-based accounts
only**. `STAFF_NAV` stays in place for legacy `STAFF` accounts — deleting it would change behavior
for accounts this phase is not migrating.

Tab → required permission map (the tab ids are the dashboard's real ones):

| Tab | Requires | In `staff` preset? |
|---|---|---|
| `calendar`, `reservations` | `reservations.read` | ✅ |
| `myclients` | `reservations.read` + `scope === 'self'` | ✅ |
| `staff` | `staff.read` | ✅ (read-only — see below) |
| `store` | `store.read` **+** `store` in `active_services` | ❌ this phase |
| `catalog` | `catalog.read` | ❌ this phase |
| `customers` | `customers.read` | ❌ this phase |
| `overview`, `settings` | owner-level; legacy path only | ❌ |

**Open point:** the `staff` preset grants `staff.read`, so a Staff account would see the Staff tab
read-only — but `StaffTab.jsx` is built as a management surface (add/edit/hide). Options: hide the
tab for `scope === 'self'` accounts; or render it read-only. **Decision required from Salman.**
Recommendation: **hide it in v1** — a read-only variant is real UI work and `staff.read` exists for
the *pickers* (which barbers exist), not for a management screen.

### 5.3 What is deliberately NOT done here

The three parallel nav mechanisms are **not** consolidated. `ROLE_TABS` stays dead-but-present,
`buildNav` stays capability-driven, `STAFF_NAV` stays for legacy STAFF. Consolidation is a real
refactor with its own risk and belongs to its own phase after Slice 3, when a second
permission-based preset actually exists. Naming it here so it is a deferral on record, not an
oversight.

### 5.4 Team tab

Per 2B-2 §8: list (name, email, preset label in Arabic, add-on chips, active state) · create
(name, email, password, preset dropdown, **barber picker shown only when `preset = موظف`**) ·
deactivate · **reactivate** (new). Unavailable presets render **disabled with a short reason**, never
hidden — so the UI does not silently differ between environments mid-migration. Nav entry gated to
owner-level identities. `pages/smar/admin/components/TeamTab.jsx` stays untouched.

---

## 6. Tests

Run before and after; identical legacy results prove a behavior-neutral change.

**A. Legacy equivalence (I1).** Every existing legacy role's dashboard nav and every migrated route's
response are unchanged. Includes the C2 case explicitly: **a client-token owner still gets a working
dashboard**.

**B. `/me` projection fidelity.** For each identity kind, `/me`'s `authority` block equals what
`permissions.py`'s own functions return for that user — asserted against the module, so a future
drift between route and resolver fails a test rather than shipping.

**C. Creation guards (§4.1).** Each of the five guard rows returns its stated status; a request body
containing a `permissions` array is ignored and the stored array equals the server-resolved preset.

**D. Migration gate (§4.3).** `reservations_manager` / `shop_manager` / `inventory` are rejected by
the **API**, not only greyed out in the UI.

**E. Reactivate (P2).** deactivate → account cannot log in → reactivate → account logs in and sees
the same scoped data as before. Cross-tenant reactivate attempt → `404`.

**F. Self-scoping still holds end-to-end.** The newly created Staff account sees only its own
reservations/barber — the same assertion 2B-3 proved, now starting from an account created **through
the UI** rather than seeded.

**G. Security regressions.** Cross-tenant impossible in every new route; SUPER_ADMIN bypass intact;
STAFF still `403` on `capabilities.*` (the 2B-1 fix); `/me` never returns another user's identity.

**Test-account rule (standing, after the 2B-1 incident):** every allowed-path write test uses a
**tenant-matched** account, with the target tenant's before/after state recorded. A `401` from an
inactive account is not evidence a gate denies that role.

## 7. Browser verification — the actual acceptance criterion

Per `browser-verification-protocol.md` and the standing *"browser is the customer"* rule, this phase
is not complete on green tests. One real journey, in one pass, on `rk`:

```
owner logs in → Team tab → create "جعفر" with preset=موظف + barber link
   → log out → log in AS جعفر
   → nav shows only his permitted tabs (derived from /me, not the JWT)
   → calendar/reservations show ONLY his own rows
   → a forbidden call returns 403
   → owner deactivates him → he can no longer log in
   → owner reactivates him → he logs in and sees the same scoped data
```

Any single ❌ blocks "Phase Complete". Evidence: real DOM state, full console, network with status
codes, screenshots — not a code read.

## 8. Rollback

| Level | Rollback |
|---|---|
| Nav derivation | Revert `GenericAdminDashboard` to the `isStaff` branch — one file, no data change |
| Team tab | Revert the tab; API and data untouched |
| `/team` extensions | Revert the route; created accounts keep working (they are just DB rows) |
| `/admin/me` | Delete the route; nothing else reads it once nav is reverted |
| Schema | **No schema change in this phase at all** — 2B-3's three nullable columns are all that is needed |

## 9. Decisions required from Salman before implementation

1. **§3.5** — does `/admin/me` carry `active_services`? (Recommendation: yes.)
2. **§4.4** — is `deactivate_user`'s unscoped `where` tightened alongside the new reactivate route,
   or logged as its own hygiene ticket? (Recommendation: alongside — it is one line and the route
   sits next to it.)
3. **§5.2** — for a `scope='self'` account, is the Staff tab hidden or rendered read-only?
   (Recommendation: hidden in v1.)

No implementation starts until these three are answered and this design is approved.
