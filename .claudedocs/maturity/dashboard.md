# Dashboard — Architecture (Maturity) Review Ledger

Recurring maturity review for the Admin Dashboard **Interface** (per
`rules/backend/architecture.md` §10, Dashboard is an Interface that consumes Capabilities' Admin
Contracts — not a Capability itself, so this ledger's "Architecture Impact" section will typically
point at whichever Capability actually changed, not this file). Governed by
`.claude/rules/architecture-review-loop.md`. Never rewritten or deleted — only appended to.

---

## Review 1 — 2026-09-04

**Trigger:** Cadence rule (`architecture-review-loop.md`) — never reviewed, and a real Verification
exists (`.claudedocs/reviews/rk-barber-phase4-admin-dashboard-fix-verification.md`) ⇒ due
immediately. Requested by Salman as a gate **before** Phase 2B-4 (Team UI + STAFF account creation),
which would build directly on `GenericAdminDashboard`.

**Scope:** REVIEW ONLY. No code, no refactor, no migration, no commit, no deploy. HEAD `85bd886`
unchanged.

**Review Window:** 14 session reports, `2026-08-22` → `2026-09-04` (2,914 lines), plus the real
source of `frontend/src/pages/generic-admin/` (23 files, 10,161 lines), `app/api/v1/admin/team.py`,
`app/repositories/user_repo.py`, `frontend/src/hooks/useAdminRole.js`, and
`.claudedocs/evolution/user-roles-permissions.md`.

### Original Goal

One admin surface for every tenant type, replacing per-tenant dashboards. Per
`rules/frontend/routing.md` §0b: `/{slug}/dashboard` → `GenericAdminDashboard`, *"the one correct
admin surface for every tenant type, branching internally per `active_services`."* The branching
input was deliberately **capability-driven** (`active_services`), not vertical-driven.

### Current State

**Shape.** 23 files / 10,161 lines: a 919-line shell (`GenericAdminDashboard.jsx`), 9 tabs
(largest: `ReservationsTab` 1,062, `SettingsTab` 1,038, `StaffTab` 835), 9 components, a 3-file
`ui/` primitive set, one `theme.js`.

**Contracts consumed.** Admin Contract via `adminApi` (`utils/admin.config`); tenant configuration
via `useTenantConfig` → `config.active_services`. Consistent with `rules/backend/architecture.md`
§10 — the dashboard writes through Admin routes and never touches a repository.

**Access control — three parallel mechanisms, only two of them live:**

| # | Mechanism | Location | Input | Status |
|---|---|---|---|---|
| 1 | `buildNav(hasReservations, activeServices)` | `GenericAdminDashboard.jsx:170-202` | **capability** (`active_services`) | Live |
| 2 | `STAFF_NAV` (hardcoded 3 entries) | `GenericAdminDashboard.jsx:213-217`, selected at `:503` | **role** (`isStaff`) | Live |
| 3 | `ROLE_TABS` / `canAccessTab` | `useAdminRole.js:23-36` | role | **Dead for this dashboard** |

Mechanism 3 is documented in-code as dead here (`GenericAdminDashboard.jsx:204-212`): it uses the
legacy `SmarAdminDashboard` tab vocabulary (`inbox`/`units`/`gallery`/…) and *"this dashboard has
never used ROLE_TABS at all."* Recorded as an accurate, deliberate note — not drift discovered now.

**Role source.** `useAdminRole()` (`useAdminRole.js:7-20`) decodes the JWT in `localStorage`
client-side and returns `payload.role`. `useAdminBarberId()` (`:39-49`) reads a display-only
`barber_id` claim, explicitly *"never used for backend authorization."*

**Maturity summary:** production-real and verified live on `rk` — but its authorization input model
is now one release behind the backend it serves (see Architecture Impact).

### What Worked

1. **Capability-driven nav was the right primitive.** `buildNav`'s `active_services` branch survived
   three separate feature waves (Staff/Store IA Separation 2026-08-09, Overview reorder 2026-08-10,
   Store gating 2026-08-21) without the shell being rearchitected. Evidence:
   `GenericAdminDashboard.jsx:179-191`'s own change log, each entry citing its contract.
2. **Staff self-scoping shipped and was verified live, repeatedly.** `2026-08-22` (`f365e8e`) caught
   and fixed Week's picker not being hidden for STAFF *before* calling the phase done — *"0
   cross-barber leakage, 0 console errors."* `2026-08-23` extended it to a mobile single-column
   model; `2026-08-24` re-ran STAFF RBAC regression as a testing-only phase.
3. **Real production CRUD proven, not asserted.** `2026-08-28` §5: add/edit/hide staff and services
   against real production data — real `201`/`200`s, on `demo.salmansaas.com/rk/dashboard`.
4. **Its own patterns were reused outward.** `2026-08-22`: the Cart's white-screen recovery reuses
   *"the Dashboard's own error-screen pattern (`DashboardErrorState`), not a new mechanism."*

### What Didn't

1. **Capability gating was missed twice, independently — a real pattern, not one bug.**
   - `2026-08-21` (Store B1): the `store` nav entry was unconditional, so a reservations-only tenant
     saw a real tab whose every request `403`'d. Confirmed live on `mr-h`.
     (`GenericAdminDashboard.jsx:187-191`)
   - `2026-08-22` (`9dfbb1a`): `OverviewTab.jsx` fired an **unconditional** `/admin/catalog/items`,
     `403` for a reservations-only tenant.

   Both are the same defect class — *a dashboard surface assuming a capability the tenant may not
   have*. Two independent cases ⇒ the Abstraction Rule threshold is met (see Architecture Impact).
2. **Soft-delete without a restore path — also twice, independently.**
   - `StaffTab.jsx`: hide had no unhide, while the confirm dialog itself promised re-activation
     (`2026-09-03` investigation; Phase 1 fix built, uncommitted).
   - `app/api/v1/admin/team.py`: `DELETE /team/{id}` soft-deactivates (`:108-128`) and **no
     reactivate route exists** — the same one-way door, in the exact API 2B-4 will build on.
3. **Suspended-tenant state is unhandled.** `2026-08-30`: *"`GenericAdminDashboard.jsx` never
   [handles it] … broken dashboard instead of a clear message. Flagged for UI Polish, not fixed."*
   Still listed open on `2026-08-31`. Nine days open at this review.
4. **Zero i18n.** `2026-09-01`: *"`GenericAdminDashboard.jsx` صفر i18n"*, and `2026-09-02` counts
   **12** `toLocaleString('ar-SA')` call sites inside it. The customer-facing side went bilingual
   under ADR-0006; the merchant-facing side did not move.

### Unexpected Discoveries

Found while reading source for this review — none of these were the point of it:

1. **There is no `/me` endpoint anywhere.** `grep` across `app/api/v1/` for `/me` returns nothing.
   The frontend's only source of identity is the JWT it decodes itself. This is load-bearing for
   2B-4 — see below.
2. **`team.py:36` is where the "can't create a STAFF account" gap actually lives:**
   `role: Literal["MANAGER_RESERVATIONS", "MANAGER_UNITS"]`. Phase 2A's F6 finding, now pinned to a
   line rather than described.
3. **`user_repo.deactivate_user` (`:101-106`) runs `where={"id": user_id}` with no `clientId`** —
   the tenant scope is enforced only by the route's preceding `find_user_by_id(user_id, tenant_id)`
   check (`team.py:116`). Not exploitable through any current caller, but it is the exact shape
   `2026-08-30` already flagged in `resource_repo`/`unit_repo` — *"an unscoped mutating query, never
   actually exploitable."* Third independent instance of that shape.
4. **`team.py:46`'s docstring says "all active users"; the repository returns all users regardless
   of `isActive`** (`user_repo.py:66-71`). The code is the safer of the two — but the Team UI must
   be built against the code, not the docstring.

### Architecture Impact

**The Interface's authorization input model no longer matches the Capability it serves.** This is
the single finding that matters for 2B-4:

- Phase 2B-3 deliberately put permissions **in the database, with zero token changes** —
  `get_current_admin_user` reloads the `User` row every request, so revocation takes effect on the
  next call.
- The dashboard's gating input is `useAdminRole()`, which reads **the JWT**. A JWT issued to a
  permission-based account carries only `role` — and per the approved design, `shop_manager` stores
  `role=STAFF` as an *inert placeholder*.
- Therefore a Shop Manager logging in today renders `STAFF_NAV` — Calendar / Reservations /
  My Clients — i.e. **exactly the three surfaces it has no permission for**, and none of the store
  surfaces it does. Not a bug in either piece; a genuine seam between two correct designs.

Staff-only v1 masks this (the `staff` preset ≈ `STAFF_NAV`), which is precisely why it must be named
now rather than discovered at Slice 3.

**Pattern-escalation (rule: 2nd independent occurrence must be called out, not logged):**

- **P1 — "surface assumes a capability the tenant may not have."** 2 independent cases (Store B1
  2026-08-21; OverviewTab 2026-08-22). Both were fixed one-off. Candidate for a stated rule: *a
  dashboard surface — nav entry **or** data fetch — is gated on `active_services` at one place.*
- **P2 — "soft-delete without a restore path."** 2 independent cases (StaffTab; `team.py`).
  Candidate for a stated rule: *any soft-delete ships with its restore in the same phase.*

Both are **candidates**. Per `architecture-review-loop.md`, naming a candidate is not creating an
ADR — that decision stays Salman's.

Capability files touched: none. Dashboard is an Interface; P1/P2 belong to the Dashboard Interface
itself, and the authorization seam points at the Authorization/permission-model track
(`.claudedocs/implementation/PERMISSION_MODEL/`).

### Promote?

**No — reviewed, no promotion this pass.** Two named candidates (P1, P2) recorded above, each with
two real independent cases, awaiting Salman's decision. No ADR written.

### Next Actions

1. Salman's decision on P1 and P2 (rule / ADR / leave as candidates).
2. 2B-4 proceeds with the adjusted scope in §"2B-4 Readiness" below — the `/admin/me` prerequisite
   is the only blocking item found.
3. Suspended-tenant UX (open 9 days) and dashboard i18n (12 call sites) remain unscheduled; both
   are real, neither blocks 2B-4.

---

## Review 1 — Appendix: 2B-4 Readiness Assessment

Answering the seven outputs Salman specified for this review.

### 1. Current dashboard architecture

Shell + tab-registry. `GenericAdminDashboard.jsx` owns tab state, nav construction, auth/logout, and
a `switch` that renders one tab (`:556-586`); each tab owns its own data fetching. No router nesting
per tab, no shared store. Tabs receive `color`/`currency`/`activeServices` as props.

### 2. Existing contracts / dependencies

`adminApi` (Admin Contract) · `useTenantConfig` → `active_services` · `useAdminRole` /
`useAdminBarberId` (JWT-decoded) · `contentSchema` / `mediaSchema` (Tenant OS) · `useImageUpload` ·
local `theme.js`. Backend dependency for Team is `app/api/v1/admin/team.py` → `user_repo`.

### 3. What is reusable for Team

Substantial — Team is a conventional list+create tab, the shape this dashboard already does well:

| Reusable | Where |
|---|---|
| Tab registration (nav entry + `switch` case) | `GenericAdminDashboard.jsx:170-202`, `:556-586` |
| `ui/Button`, `ui/Card`, `ui/EmptyState` | `components/ui/` |
| List/create/deactivate card layout with confirm | `StaffTab.jsx` — closest existing analogue |
| Backend list/create/soft-delete, tenant-forced, bcrypt | `team.py:41-128` |
| Barber picker (for `preset=staff` linking) | `ReservationsTab` picker + `StaffTab` list |

### 4. What is technically risky

1. **Role is read from the JWT, permissions live in the DB** — the seam in Architecture Impact.
   Adding a 4th client-side gating mechanism on top of a token that structurally cannot carry
   permissions would be building the wrong foundation.
2. **Three nav mechanisms already exist** (one dead). A Team tab wired naively becomes the fourth
   branch of `isStaff ? … : …`.
3. **`GET /team` returns no `permissions`/`preset`/`scope`** (`team.py:49-59`) — the UI cannot render
   what an account actually has without extending the response.
4. **No reactivate route** — shipping Team v1 with deactivate-only repeats P2 knowingly.
5. `deactivate_user`'s unscoped `where` (Discovery 3) — defense-in-depth, not exploitable today.

### 5. Is `GenericAdminDashboard` suitable for Team?

**Yes.** It is the correct and only home: `rules/frontend/routing.md` §0b names it the one admin
surface, `team.py` exists but is consumed *only* by the legacy `SmarAdminDashboard`, and 2B-2 §8
already specified the tab here. Nothing found in this review argues for a different host. The
suitability question is not *where* but *what drives its visibility* — item 4.1.

### 6. Blockers that must be resolved before 2B-4

**One true blocker:**

- **B1 — no server-truth identity endpoint.** The frontend has no way to learn a user's
  `permissions`/`preset`/`scope`, because 2B-3 deliberately kept them out of the token. Team UI
  cannot correctly disable unavailable presets (2B-2 §8's own requirement) nor drive nav for a
  permission-based account without one. Resolution: a `GET /admin/me` returning the server-resolved
  identity — the same resolver `app/core/permissions.py` already implements, exposed read-only.
  This is **additive**, breaks nothing, and is the natural first slice of 2B-4.

**Not blockers, but decide before building:**

- B2 — extend `GET /team`'s response with `preset`/`addons`/`scope`.
- B3 — add a reactivate route (P2) rather than knowingly shipping a one-way door.
- B4 — whether nav derives from `/admin/me`'s permissions now, or stays `isStaff`-based for
  Staff-only v1 with a named follow-up. (Recommendation: derive it now — the cost is lower before
  a fourth branch exists than after.)

### 7. Explicit recommendation

**PROCEED — with adjusted scope.**

Salman's ordering (2B-4 Staff-only → Slice 3) is sound and this review found nothing against it. The
adjustment is one item: **B1 (`GET /admin/me`) becomes 2B-4's first slice, before the Team UI.**
Without it, Staff-only v1 works by coincidence — `staff` preset happens to match the hardcoded
`STAFF_NAV` — and that coincidence ends at Slice 3, when Shop Manager renders a reservations nav it
has no permission to use.

Adjusted 2B-4 shape: **`/admin/me` → extend `team.py` (preset/addons/barber_id + reactivate) →
Team tab driven by server-resolved identity → only fully-migrated presets selectable.**
