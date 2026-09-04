# Phase 2B — Permission Model: Implementation Design

**Date:** 2026-09-04
**Status:** **APPROVED** by Salman 2026-09-04, with the three binding invariants below pinned into
the design at his explicit request. Design only — no code, no schema applied, no migration run.
Only **Phase 2B-1** (§7, the `client_services` gate) is approved for implementation; everything
else here awaits its own approval.
**Decision being implemented (Salman, 2026-09-04):** Option 3 — granular permissions, phased.
`UserRole` stays as preset bundles; `scope` becomes an independent concept; granular backend from
day one, but the merchant UI ships with 3–4 clear presets, not a permission matrix.
**Evidence base:** `.claudedocs/work/permission-model-investigation/2026-09-04/summary.md` (Phase 2A).

---

## INVARIANTS — binding, not guidance (Salman, 2026-09-04)

These three were made explicit because leaving them implicit is how a safe additive migration
quietly turns into a breaking one. Any future slice that violates one of these is wrong by
definition, regardless of how reasonable it looks in isolation.

### I1 — `permissions == NULL` means "use the legacy role bundle". Nothing else.

It does **not** mean *no permissions*, it does **not** mean *deny all*, and it must **never** be
resolved by deriving permissions some other way. A `NULL` is the explicit, intended state of every
account that exists today, and it must keep resolving through §5's bundle table verbatim. This one
rule is what makes the entire migration additive and reversible — if it is ever weakened, every
existing account's authorization changes silently.

### I2 — `scope` is capability-aware, never a global filter.

`scope = 'self'` may only alter authorization for areas that genuinely implement per-employee row
ownership. Today that is exactly two: `reservations` and the `staff` roster (§2). For every other
area — `store`, `catalog`, `capabilities`, `content`, `settings`, and the rest — the presence of
`scope='self'` **must have no effect whatsoever**, because those areas have no concept of an
"owned" row. The scope engine consults a per-area *scopable* declaration; it never applies a
blanket "own rows only" filter to areas that cannot express ownership.

### I3 — Bundles are a behavior-preserving snapshot, anomalies included.

§5's bundle table is a literal transcription of today's behavior, **not** a corrected version of
it. `MANAGER_RESERVATIONS` keeps `store.*`; `MANAGER_UNITS` keeps `catalog.*`. A migration is not
the place to fix anomalies — doing so would ship a security change disguised as a refactor, with
no separate review and no isolated way to verify or revert it. Narrowing these is its own later
work item, **Permission Bundle Correction**, requiring its own approval and its own API/browser
regression verification.

---

## 0. The finding that shapes this whole design

`get_current_admin_user` (`app/core/tenant.py:379-382`) **re-loads the User row from the database
on every request** and returns the live record; `require_roles` (`tenant.py:509-517`) then reads
`user.role` **from that fresh row**, not from the JWT claim.

Consequence: **authorization data can live in the User row and be read per-request at zero extra
cost** — it arrives with a query that already happens. No token changes, no re-issue, no stale
window, and revocation takes effect on the very next request.

This is not a new idea in this codebase — `User.barberId`'s own schema comment states it
explicitly: *"No JWT change needed -- get_current_admin_user() already loads the full User row from
DB on every request."* This design follows that established precedent rather than inventing one.

---

## 1. Permission vocabulary

Derived from the **real capability areas found in Phase 2A's F1 matrix**, not invented. Format:
`<area>.<action>`, actions limited to `read` / `write`.

| Area key | Covers (real route files) |
|---|---|
| `reservations` | `reservations.py` |
| `staff` | `barbers.py` (roster + barber↔service assignment) |
| `services` | `catalog_services.py` |
| `catalog` | `catalog.py` |
| `store` | `store.py` (products, orders, inventory) |
| `units` | `units.py` |
| `properties` | `properties.py` |
| `gallery` | `gallery.py` |
| `resources` | `resources.py` |
| `content` | `content.py` |
| `settings` | `settings.py` |
| `customers` | `customers.py` |
| `team` | `team.py` (user accounts) |
| `capabilities` | `client_services.py` (turning tenant modules on/off) |
| `provisioning` | `provisioning.py` |

15 areas × 2 actions = 30 permission strings maximum.

**Deliberate v1 constraints:**
- **Only `read`/`write`** — no separate `create`/`delete`/`update`. Phase 2A F4 showed the codebase
  itself only ever splits read vs. write; a finer verb set would be vocabulary we don't yet have
  evidence anyone needs.
- `write` implies `read` (an account that can edit stock can obviously view it). Encoded once in
  the resolver, not repeated at every gate.
- **`SUPER_ADMIN` is not modelled as permissions.** It stays a hard bypass — it is a
  platform-owner role, not a tenant employee role, and mixing the two is how privilege systems get
  confusing. `require_permission` short-circuits `True` for `SUPER_ADMIN`.

## 2. Scope model

New independent field on the account: **`scope: 'self' | 'all'`** (default `'all'`).

- `'self'` means: within areas that have a real per-employee row dimension, the account sees only
  its own rows.
- Today exactly **two** areas are scopable, and both already implement it:
  `reservations` (via `_require_staff_barber_id`, `reservations.py:46-54`) and `staff`
  (roster self-filter, `barbers.py:94`). Every other area ignores `scope` entirely — there is no
  "my own product" in an inventory.

**Binding: I2** — areas without real row-ownership must be completely unaffected by `scope`.
Implementation consequence: each area declares whether it is *scopable*; the resolver consults that
declaration. There is no global "self" filter.

**Account-level, not per-permission (v1).** One field, matching how `_require_staff_barber_id`
already works (derived from the account's `barberId`, not from any per-area setting). Per-area
scope (`reservations: self` + `customers: all` on one account) is a real future possibility but has
**no real case today** — Phase 2A's two cases are both satisfied by an account-level flag. Upgrade
path is open: the resolver returns a scope per area, so per-area overrides can be added later
without changing any call site.

**Fail-closed is preserved and made explicit:** an account with `scope='self'` but no `barberId`
must 403, exactly as `_require_staff_barber_id` does today. That behavior moves into the resolver
so it applies uniformly, instead of living only inside `reservations.py`.

## 3. DB representation

Two **additive, nullable** columns on `User` — no new table, no join:

```
permissions  Json?    @map("permissions")   // e.g. ["reservations.read","reservations.write","store.read"]
scope        String?  @map("scope")         // 'self' | 'all' | null
```

Rationale:
- They ride along on the User row **already loaded every request** (§0) — zero added queries.
- Nullable is the backward-compatibility mechanism (§10): `NULL` = "resolve from the role bundle."
- `Json?` matches this codebase's established convention for flexible structures
  (`Barber.workingHours`, `CatalogItem.metadata`, `Client.config`).
- A flat array of `"area.action"` strings, not a nested object — trivially checkable
  (`perm in perms`), trivially diffable in logs and audits.

A separate `Permission`/`RolePermission` table was considered and rejected for v1: it adds a join
to the hot auth path to model data that is small, per-account, and never queried independently.
Revisit only if permissions ever need to be queried across accounts (e.g. "who can edit stock?").

## 4. JWT implications

**None. No token change, no re-issue, no version bump.**

- Permissions and scope are read from the DB row per request (§0), so a permission change takes
  effect on the account's **next request** — no logout/login, no token TTL wait.
- The existing `role` claim in the token stays as-is (it is informational; `require_roles` already
  ignores it in favour of the DB row).
- **Explicitly rejected:** embedding permissions in the JWT. It would create a stale-permission
  window for the token's full lifetime (24h per `rules/backend/security.md`), make revocation
  impossible without a denylist, and bloat every request header — all to avoid a query that already
  happens.

## 5. Role → permission bundle mapping

The five existing roles become named bundles. **These are transcribed from the Phase 2A F1 matrix
so that resolution reproduces today's behavior exactly** — this migration must not change who can
do what.

| Bundle | Permissions | scope |
|---|---|---|
| `SUPER_ADMIN` | *(bypass — not permission-modelled, §1)* | `all` |
| `TENANT_ADMIN` | every area, `read`+`write` | `all` |
| `MANAGER_RESERVATIONS` | `reservations.*`, `staff.read`, `services.read`, `catalog.*`, `store.*`, `resources.read` | `all` |
| `MANAGER_UNITS` | `units.*`, `properties.*`, `gallery.*`, `catalog.*`, `services.*` (add-ons) | `all` |
| `STAFF` | `reservations.*`, `staff.read`, `services.read` | **`self`** |

**Two known anomalies are preserved on purpose, then fixed as separate decisions:**
1. `MANAGER_RESERVATIONS` holding full `store.*` (Phase 2A F3 — a role named for bookings owning
   retail inventory).
2. `MANAGER_UNITS` holding `catalog.*` while `store.*` excludes it.

Changing either **during** the migration would be a silent security change disguised as a refactor.
They are carried forward verbatim (**binding: I3**), then narrowed as their own reviewed, approved
change — tracked as the **Permission Bundle Correction** work item, which requires its own approval
and its own API + browser regression verification before any bundle is narrowed.

**New presets for the merchant UI** (Salman's 3–4, §9) are defined as bundles too — e.g.
`Shop Manager` = `store.*`, `catalog.read`, `customers.read`, scope `all`. Presets are the UI's
vocabulary; permissions are the enforcement's.

## 6. `require_roles()` migration strategy

**Additive and reversible. `require_roles` is never deleted during the migration.**

Introduce alongside it:
```
require_permission("store.write")        # returns the user, like require_roles does
```
Resolution order inside it: `SUPER_ADMIN` → allow; else `user.permissions` if non-NULL; else the
bundle for `user.role` (§5). Then the scope check for scopable areas (§2).

Migrate **one area at a time**, each area being an independently approvable slice:

| Order | Area | Why this order |
|---|---|---|
| 1 | `capabilities` (`client_services.py`) | Currently has **no gate at all** (F5) — adding one is strictly additive; nothing can regress (§7) |
| 2 | `team` | Small, 3 routes, `SA`/`TA` only, no scoping |
| 3 | `store` | The area that triggered this whole track; no scoping involved |
| 4 | `reservations` | **Last** — the only area with real scoping; highest risk, migrate once the resolver is proven on 3 simpler areas |
| 5+ | remaining areas | Mechanical once the pattern is proven |

Because bundles reproduce current behavior exactly, each swap is behavior-neutral and verifiable by
the same test matrix (§12) run before and after.

## 7. `client_services` authorization (security blocker — independent of everything above)

Phase 2A F5: `client_services.py:74, 81, 131` depend only on `get_current_admin_user`, **no
`require_roles`**. Confirmed live: a real `STAFF` token read RK's full capability config (200).
Write escalation is **inferred, not demonstrated** — deliberately not executed against live data.

**Fix, shippable immediately and independently of the permission model:** add
`require_roles("SUPER_ADMIN", "TENANT_ADMIN")` to all three routes. Ownership reasoning matches
`team.py`'s already-approved matrix — capability activation is a tenant-owner decision, not an
operational one.

**Regression risk: none identified.** `grep -rn "client-services" frontend/src` returns **zero
callers** — no dashboard screen consumes these routes today. The only consumers are direct API
calls.

Later, in migration step 1 (§6), this becomes `require_permission("capabilities.write")`.

## 8. `STAFF` account creation

Phase 2A F6: `STAFF` cannot be created through **any** route — `TeamMemberCreate.role` is
`Literal["MANAGER_RESERVATIONS", "MANAGER_UNITS"]` (`team.py`), and the hidden `/create-user` setup
route excludes it too. Only direct DB access can produce one.

Design:
- Extend the `Literal` to include `STAFF` (and later, the new preset names).
- **Hard constraint:** when role/preset is `STAFF` (or any bundle with `scope='self'`), a
  `barber_id` is **required** — creating a self-scoped account without one produces an account that
  fails closed on every request (`_require_staff_barber_id` raises 403). Validate at creation, with
  a clear error, rather than letting a broken account be created.
- The `barber_id` must be verified to belong to the requesting tenant before linking
  (`User.barberId` is `@unique` — one login per barber; the API must return a clean 409 on a
  barber that already has an account, not a raw constraint error).

## 9. Generic Admin Team UI

The `/team` API is fully built and works; its only consumer is smar's **legacy** dashboard
(`pages/smar/admin/components/TeamTab.jsx`) — never ported to `GenericAdminDashboard` (F6).

v1 scope, per Salman's "presets not a permission matrix":
- A **Team tab** in `GenericAdminDashboard`, consuming the existing endpoints — no new backend
  surface beyond §7/§8.
- **List** accounts (name, email, preset, active).
- **Create**: name, email, password, **preset dropdown (3–4 options)**, plus a barber picker shown
  only when the chosen preset is self-scoped (§8).
- **Deactivate** (the existing soft-delete).
- Explicitly **not** in v1: per-permission checkboxes, custom preset builder, scope toggle. Those
  arrive only once real merchant demand is observed — the backend already supports them, so adding
  the UI later requires no architectural change. That is the whole point of building granular
  underneath and simple on top.
- `smar`'s legacy `TeamTab.jsx` stays untouched.

## 10. Backward compatibility

- Both new columns are **nullable**; every existing account has `permissions = NULL`,
  `scope = NULL` → resolves to its role bundle → **behavior identical to today** (**binding: I1** —
  `NULL` means "legacy bundle", never "deny all" and never a differently-derived permission set).
- No token invalidation, no forced re-login, no data migration of existing rows.
- `require_roles` keeps working unchanged for every area not yet migrated.
- Bundles are transcribed to match current behavior exactly (§5), including the two known
  anomalies — so "before" and "after" produce the same 200/403 for every existing account.

## 11. Migration / rollback

**Migration:** two additive nullable columns (`prisma db push`), then per-area dependency swaps —
each area its own commit.

**Rollback, per level:**
| Level | Rollback |
|---|---|
| One migrated area | Revert that area's dependency swap back to `require_roles` — one file, no data change |
| The whole resolver | Revert the commits; the nullable columns can stay (unread, harmless) |
| Schema | Columns are additive and nullable — dropping them is optional and non-urgent; nothing else references them |

No destructive migration exists anywhere in this plan. Nothing is deleted, renamed, or rewritten in
place — which is what makes per-area rollback genuinely cheap.

## 12. Test matrix

Run **before and after** each area migration; identical results = behavior-neutral swap proven.

**A. Bundle equivalence (the critical backward-compat proof)** — for each of the 5 roles × each of
the 15 areas × {read, write}: assert the response code with `permissions = NULL` matches the
pre-migration recorded baseline. This is the test that proves §10.

**B. Scope** — `STAFF`/self account sees only its own reservations and only its own roster row;
an `all`-scope account sees the full set; a `scope='self'` account **with no `barberId` gets 403**
(fail-closed, §2).

**C. Explicit permissions override** — an account with a non-NULL `permissions` array gets exactly
those permissions, ignoring its role bundle; `write` implies `read` (§1).

**D. Security regressions** — `STAFF` token against `capabilities.*` returns **403** (the F5 fix);
cross-tenant access still impossible (an account of tenant A cannot touch tenant B's rows under any
permission set); `SUPER_ADMIN` bypass still works.

**E. Account creation** — self-scoped preset without `barber_id` rejected with a clear error;
duplicate `barberId` returns 409; created account's effective permissions match its preset.

**F. Real browser verification** on the Team UI slice, per `browser-verification-protocol.md` and
the standard set in Phase 1 — including one real end-to-end pass: create an account with a preset,
log in as it, confirm the dashboard shows only the permitted tabs and a forbidden call returns 403.

---

## Recommended first slice (for approval as Phase 2B-1)

**The `client_services` gate fix alone (§7).** Rationale: it is the one item that is a live security
gap rather than a design question; it is 3 lines in 1 file; it has zero frontend callers, so no
regression surface; and it is independent of the permission model, so it does not commit us to any
part of this design before the rest is approved.

Everything else in this document stays unimplemented pending explicit approval.

## Open questions for Salman

1. **Preset names and exact contents** (§9) — "Staff / Reservations Manager / Shop Manager /
   Tenant Admin" was the sketch; the precise permission set behind each is a product call.
2. **The two anomalies** (§5) — once migrated, should `MANAGER_RESERVATIONS` lose `store.*`, and
   should `MANAGER_UNITS` keep `catalog.*`? Each is a real behavior change requiring its own
   approval, deliberately excluded from the migration itself.
3. **`scope` granularity** (§2) — account-level is proposed for v1; confirm no real case today
   needs per-area scope.
