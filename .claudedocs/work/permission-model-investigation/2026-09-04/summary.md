# Phase 2A — Permission Model Investigation & Design

**Date:** 2026-09-04
**Mandate (Salman, explicit):** investigation and design only, zero code. Decide *how employee
permissions should be represented in the SaaS* before any Phase 2B implementation plan exists.
**Method:** every `require_roles()` gate in `app/api/v1/` read directly; role semantics derived
from the routes themselves, not from role names; live 403/200 probes with real minted JWTs against
the running backend. No code changed, no schema touched, no commit.

---

## Confirmed Findings

### F1 — The real role × capability matrix (derived from every gate, not from names)

`UserRole` enum (`prisma/schema.prisma:139`): `SUPER_ADMIN`, `TENANT_ADMIN`,
`MANAGER_RESERVATIONS`, `MANAGER_UNITS`, `STAFF`. Abbreviated below as SA / TA / MR / MU / ST.

| Capability area | Route file | SA | TA | MR | MU | ST |
|---|---|:--:|:--:|:--:|:--:|:--:|
| Reservations — list/status/reschedule/edit | `reservations.py` | ✅ | ✅ | ✅ | — | ✅ *(self-scoped)* |
| Barbers — read roster | `barbers.py:94` | ✅ | ✅ | ✅ | — | ✅ *(self only)* |
| Barbers — create/update/deactivate/assign services | `barbers.py` | ✅ | ✅ | — | — | — |
| Barber↔service — read | `barbers.py:192` | ✅ | ✅ | ✅ | — | — |
| Catalog services — read | `catalog_services.py:69` | ✅ | ✅ | ✅ | — | ✅ |
| Catalog services — write | `catalog_services.py:80,97` | ✅ | ✅ | — | — | — |
| Catalog (generic) | `catalog.py` `CATALOG_ROLES` | ✅ | ✅ | ✅ | ✅ | — |
| **Store — products/orders/inventory** | `store.py` (11 routes) | ✅ | ✅ | ✅ | — | — |
| Units | `units.py` | ✅ | ✅ | — | ✅ | — |
| Properties / Gallery / Services(add-ons) | `properties.py`, `gallery.py`, `services.py` | ✅ | ✅ | —* | ✅ | — |
| Resources — read / write | `resources.py` | ✅ | ✅ | ✅ / — | — | — |
| Content (page editing) | `content.py` (11 routes) | ✅ | ✅ | — | — | — |
| Settings / Customers / Provisioning | `settings.py`, `customers.py`, `provisioning.py` | ✅ | ✅ | — | — | — |
| Team — user accounts (list/create/deactivate) | `team.py` | ✅ | ✅ | — | — | — |
| **Client services — capability on/off** | `client_services.py` | ✅ | ✅ | ✅ | ✅ | **✅ ← ungated** |

\* `services.py:77` (read) also allows MR.

### F2 — Two orthogonal dimensions already exist; the enum only expresses one

Authorization here is really **two** independent questions, and the codebase already answers both —
but only the first is modelled as a role:

1. **What capability areas can this account touch?** → the role name, via `require_roles()`.
2. **Which rows within an area can it see?** → `_require_staff_barber_id()`
   (`reservations.py:46-54`): server-derived from the JWT, never client input, **fails closed**
   (a STAFF account with no `barberId` gets a real 403, never a silent full-roster fallback).
   `barbers.py:94` applies the same filter to the roster.

Dimension 2 is hardcoded to mean "`STAFF` = self only." There is no way to express *"can see all
reservations"* + *"cannot edit prices"*, or *"self-scoped"* + *"can add inventory"*, because
scoping is welded to one specific role name.

### F3 — `MANAGER_*` roles split the platform by **vertical**, not by function

`MU` covers units / properties / gallery / add-on services — the **smar stay-booking** world.
`MR` covers reservations / resources / **store** — the **appointment + retail** world.

This is why a role literally named *"reservations manager"* holds full write access to store
products, orders and inventory (`store.py`, 11 routes): not because managing bookings implies
managing stock, but because `store.py` needed *some* non-admin role and MR was the nearest one that
already existed. The name no longer describes the permission set.

### F4 — Per-route capability granularity is already being hand-rolled

`barbers.py`, `catalog_services.py`, `resources.py` and `services.py` each split **read** (wider
role list) from **write** (narrower list) by writing different role tuples per route. Across the
admin surface, 5 roles produce **20+ distinct role-tuple combinations**. The system is already
doing capability-level authorization — it just encodes it as repeated literal tuples instead of as
a named permission concept. Every new combination today means editing tuples across many files.

### F5 — Confirmed live: `client_services.py` has no role gate at all

`GET /`, `POST /activate`, `POST /deactivate` (`client_services.py:74, 81, 131`) depend only on
`get_current_admin_user` — **no `require_roles()`**. These routes turn a tenant's capabilities
(store, reservations, booking, catalog…) on and off.

Live probe, real minted `STAFF` token (`jaafar@rk.dev.invalid`, RK's own barber account):

| Request | Result |
|---|---|
| `GET /admin/client-services/` | **200 — returned RK's full capability config** |
| `GET /admin/team` | 403 ✅ correctly denied |
| `GET /admin/store/products` | 403 ✅ correctly denied |
| `GET /admin/reservations/` | 200 ✅ correctly allowed (self-scoped) |

The write routes use the **identical dependency** as the read route that returned 200 — so a STAFF
account can be expected to activate/deactivate its own tenant's capabilities. **Stated as
inference, not demonstrated**: the write was deliberately not executed against RK's live config.
Read access alone is already a real privilege gap; the write path should be treated as a genuine
escalation risk until proven otherwise.

### F6 — Correction to the 2026-09-03 report: `/team` exists and works

The prior investigation stated there was "no admin-facing User-account-management backend route at
all." **That was wrong** — the earlier search looked for `*user*` filenames and missed
`app/api/v1/admin/team.py`. Corrected picture:

- `GET/POST/DELETE /admin/team` are fully implemented, `SA`/`TA`-gated, tenant-forced
  (`clientId` from JWT, cross-tenant creation impossible), bcrypt-hashed passwords, soft-delete.
- **But its only frontend consumer is `pages/smar/admin/components/TeamTab.jsx`** — smar's
  *legacy* dashboard. It was never ported to `GenericAdminDashboard`, so RK/mr-h/every generic
  tenant cannot reach this working API from their own dashboard.
- **And `TeamMemberCreate.role` is `Literal["MANAGER_RESERVATIONS", "MANAGER_UNITS"]`** — `STAFF`
  is not an option. So the original conclusion still holds in its most important part: **a `STAFF`
  login cannot be created through any route, gated or hidden** — only by direct DB access.

### F7 — Two-case test

**Case A — RK Barber (live, real data).** Needs: a barber who sees *only his own* appointments
(`STAFF` ✅ works today) **and** can add stock (❌ no role permits it — `store.py` excludes `STAFF`).
Granting `STAFF` store access would give *every barber at every barbershop* inventory write. A new
combined role would have to carry **both** the self-scoping flag and store permission — which
requires scoping to become independent of the role name (F2).

**Case B — Clinic (documented design case, not a live tenant).** No clinic exists in
`tenantRegistry` or the database — it appears only in `.claudedocs/evolution/reservation-capability.md`,
`staff-capability.md` and the vertical proposals. Treated here as a design case, not tested live.
Its two documented shapes:
- *Receptionist*: books for **all** doctors (not self-scoped), must **not** edit services/prices.
  Closest today is `MR` — which also hands over full store inventory write. Too much.
- *Doctor*: sees **only own** appointments, no inventory. `STAFF` ✅ fits.

**Conclusion from both cases:** the missing combinations are never "a whole new area of the app" —
they are *existing areas recombined with a different scoping rule*. That is precisely what a role
enum cannot express without multiplying.

### F8 — Does the current enum scale?

No, and the strain is already visible, not hypothetical: 5 roles → 20+ distinct tuple combinations
(F4); a role whose name contradicts its permissions (F3); a scoping rule welded to one role (F2);
and the one role that actually models a real employee (`STAFF`) cannot be created through any API
(F6). Each new real-world combination (barber+inventory, receptionist−pricing) costs another enum
value **plus** edits to role tuples across many route files — and any combination needing *scoping*
cannot be expressed at all.

---

## The three options, compared against real requirements

Requirements taken from the two cases above, not invented: (R1) reuse existing areas in new
combinations; (R2) express row-scoping independently of capability; (R3) let the merchant — not
Salman via SQL — assign permissions; (R4) work across verticals, not just barbershops; (R5) not
require rewriting every `require_roles()` gate at once.

| | Opt 1 — extend `STAFF` | Opt 2 — new role | Opt 3 — granular permissions |
|---|---|---|---|
| R1 recombine areas | ❌ one fixed set for all staff | 🟡 one new combination per role | ✅ any combination |
| R2 scoping independent | ❌ still welded to `STAFF` | ❌ still welded to role name | ✅ scoping becomes its own field |
| R3 merchant self-serve | ❌ nothing to choose | 🟡 pick from a fixed list | ✅ compose per employee |
| R4 cross-vertical | ❌ barbershop-shaped only | ❌ worsens F3 (vertical-named roles) | ✅ vertical-neutral |
| R5 incremental | ✅ one tuple edit | ✅ small | 🟡 larger, but can be phased |

**Opt 1** solves RK's specific complaint in one line and nothing else; it makes F2 worse by loading
more meaning onto `STAFF`. **Opt 2** is the natural next step *if* the only axis were capability —
but F7 shows the missing combinations differ by **scoping**, which a role name cannot carry, so
role count grows multiplicatively (roles × scoping modes), the "role explosion" Salman already
named. **Opt 3** is the only one that answers R2, and R2 is the dimension both real cases actually
turn on.

---

## Recommendation

**Option 3 — granular permissions — but reached in phases, not as a rewrite.** Stated after the
comparison, derived from it: Options 1 and 2 both fail R2 (scoping), and R2 is what both the RK and
Clinic cases genuinely require. Recommended shape, for Phase 2B to specify properly:

1. Keep `UserRole` as a **preset/bundle** (what a merchant picks in the UI) — do not delete it. The
   existing 5 roles become named default bundles, so nothing breaks on day one (R5).
2. Add an explicit **permission set** per account (capability keys, e.g. `reservations.read`,
   `reservations.write`, `store.write`) — resolved from the role bundle unless overridden.
3. Make **scoping its own field** (`scope: self | all`) instead of an implicit property of `STAFF`
   — this is the change that unlocks both real cases (F2, F7).
4. Replace `require_roles(...)` with a capability check at the gates **incrementally**, area by
   area, with the role bundles resolving to the same permissions so behavior is unchanged until a
   merchant actually customizes something.

**Prerequisite, independent of which option is chosen:** F5 (`client_services.py` ungated) and F6
(`STAFF` uncreatable, `/team` missing from `GenericAdminDashboard`) are real gaps that exist under
*every* option and should be scoped as their own small items — F5 in particular is a live
privilege gap, not a design question.

---

## Unknowns

- Whether the `client_services` **write** routes are truly exploitable by `STAFF` was inferred from
  an identical dependency, not demonstrated — deliberately not executed against RK's live config.
- No live clinic tenant exists; Case B is documentation-derived (`evolution/reservation-capability.md`,
  `staff-capability.md`), not tested against real data.
- Whether merchants actually *want* per-employee composition, or would prefer 3–4 well-named presets,
  is a product question this investigation cannot answer from code — it materially affects how much
  of Option 3's UI is worth building.
- `evolution/staff-capability.md` covers the Staff↔**Service** relationship (which services a barber
  performs), a different axis from permissions; it does not decide this question and is not
  contradicted here.

## Explicitly not done

No code, no schema, no new role, no route change, no `client_services` fix, no Team UI, no commit,
no push. Phase 2B (implementation plan) requires Salman's decision on Option 1/2/3 first.
