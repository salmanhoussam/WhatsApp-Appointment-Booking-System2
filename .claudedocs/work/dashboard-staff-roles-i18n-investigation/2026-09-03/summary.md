# Investigation — Admin Dashboard: Staff CRUD, Roles, Content i18n

**Date:** 2026-09-03
**Trigger:** Salman's own live testing of the RK dashboard surfaced two real problems and asked for
a full check + report before any implementation ("اعمل الفحص واعملي ريبورت، بعد هيك منعمل خطة
للشغل").
**Method:** code-read investigation (file:line evidence throughout) — GenericAdminDashboard needs
authenticated access this session doesn't have handy; per this project's own established
precedent (repeated in earlier investigations this same week), that's logged as an Unknown, not
silently skipped. No code changed. No implementation started.

---

## Confirmed Findings

### 1. Staff (Barber) records — Add exists, "delete" is a deliberate design choice, but "un-hide" is a real bug

- **Add**: real, reachable. `StaffTab.jsx:477` renders a "+ موظف جديد" button wired to
  `openCreate()` (`StaffTab.jsx:250`), which opens a form that `POST`s to `/barbers/`
  (`StaffTab.jsx:324`, backend: `app/api/v1/admin/barbers.py`'s `create_barber`). This works —
  Salman's "ما فيني add" read may have been about hard-delete specifically, not creation.
- **No hard delete — deliberate, documented, not an oversight.** `app/api/v1/admin/barbers.py`'s
  own file header states the reasoning explicitly: "No DELETE exposed — a hard delete would orphan
  historical `Reservation.barberId` rows (`onDelete: SetNull`); deactivate is the supported path."
  Real tradeoff: losing which barber a past reservation was with vs. never being able to fully
  remove a mistaken/duplicate entry.
- **Confirmed real bug: once hidden, there is no way back in the UI.** `StaffTab.jsx:653-657`:
  the "إخفاء" (Hide) button only renders `{member.is_active && <Button onClick={deactivate}>...}`
  — there is no corresponding button for the `!member.is_active` case anywhere in the file. The
  backend already supports the reverse (`PATCH /barbers/{id}` accepts `is_active: true`,
  `barbers.py`'s `BarberUpdate`/`update_barber`) — the gap is purely the missing frontend button,
  not a backend limitation. This is the concrete bug behind "بس فيني أعملو invisible" — hiding is
  a one-way door in the UI today.

### 2. No dashboard path exists to create a staff LOGIN account at all — the real root of the "roles" complaint

This is the deepest finding, and it explains the whole "roles" request, not just a missing toggle.

- The Barber model (`StaffTab.jsx` manages this) is the **public-facing profile** — name, photo,
  hours. It is a **separate model** from `User` — the **login + role** record. Nothing in
  `StaffTab.jsx`, or anywhere else searched under `frontend/src/pages/generic-admin/`, creates or
  edits a `User` row. No "Team" tab exists (`find -iname "*Team*"` under generic-admin: zero
  results — RK/generic tenants have no equivalent of `smar`'s own admin `TeamTab.jsx`).
- The **only** backend route that can create any admin `User` account is
  `POST /api/v1/auth/create-user` (`app/api/v1/admin/auth.py:311`) — and its own docstring says
  exactly what it is: *"One-time route to seed admin User accounts in production without SSH...
  Protected by SECRET_KEY — only the platform owner can call it"* (gated by an `X-Setup-Key` header
  matching the server's real `SECRET_KEY` env var — something only Salman has). Confirmed **not**
  called from anywhere in the frontend (`grep -rln "create-user" frontend/src` — zero matches).
- **Even that hidden, Salman-only route cannot create a `STAFF`-role user.** Its own
  `valid_roles = {"SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS", "MANAGER_UNITS"}`
  (`admin/auth.py:329`) — `STAFF` is not in the set. So today, a `STAFF` login (the one role that's
  scoped to a single Barber via `User.barberId`, per `STAFF_SCOPED_ACCESS_CONTRACT.md`) can only be
  created by someone with **direct database access** — not through any API route, hidden or not.
- **Net effect**: there is no way, today, for a tenant admin (or even Salman through the app
  itself) to give one specific employee a scoped login. "الادمن مانجر بحدد الروولز" (the admin/
  manager decides the roles) — that UI does not exist anywhere in this codebase yet.

### 3. The role matrix itself has a real gap even once accounts can be created

Checked every `require_roles(...)` gate across the relevant admin route files:

| Capability | Roles allowed today |
|---|---|
| Reservations (`admin/reservations.py`, `RESERVATION_ROLES`) | `SUPER_ADMIN`, `TENANT_ADMIN`, `MANAGER_RESERVATIONS`, **`STAFF`** |
| Generic Catalog (`admin/catalog.py`, `CATALOG_ROLES`) | `SUPER_ADMIN`, `TENANT_ADMIN`, `MANAGER_RESERVATIONS`, `MANAGER_UNITS` |
| Store inventory — RK's real product catalog (`admin/store.py`) | `SUPER_ADMIN`, `TENANT_ADMIN`, `MANAGER_RESERVATIONS` (no `MANAGER_UNITS`, no `STAFF`) |
| Barber roster write (create/update/deactivate) | `SUPER_ADMIN`, `TENANT_ADMIN` only |

`STAFF` can already place/manage reservations (self-scoped) — that half of what Salman described
already works. But **no role can do both** "place reservations" and "add inventory items" as one
scoped, non-full-admin account: `STAFF` is excluded from `store.py` entirely, and the only roles
that *can* touch store inventory (`TENANT_ADMIN`, `MANAGER_RESERVATIONS`) are not scoped to a
single employee the way `STAFF` is (a `MANAGER_RESERVATIONS` account currently sees the *whole*
tenant's reservations, not just its own). This is a real, structural gap in the role matrix, not
just a missing UI.

### 4. Dashboard-authored content has zero English fields anywhere — structurally, not just on RK

Re-confirmed (Salman's own independent observation matches what was already found and logged
2026-09-01, ADR-0006's Recommendation Risk 3):

- Live check, `GET /api/v1/public/rk/config`: every one of RK's 11 real sections (`hero`, `story`,
  `story_experience`, `gallery`, `featured_items`, `video_story`, `testimonials`, `hours`,
  `location`, `cta`, `products`) has real `_ar` data fields and **zero** `_en` fields — not "empty
  English fields," fields that don't exist in the data at all.
- The authoring side confirms this isn't just missing data — it's missing *schema*.
  `frontend/src/tenant-os/schemas/content.js` (the Content Editing Engine's own field
  definitions — every editable field a dashboard admin can type into) defines only `_ar` fields
  (`title_ar`, `heading_ar`, etc.) throughout. `grep -rln "_en\b" tenant-os/` returns zero files.
  There is no hidden/unused English input anywhere — the dashboard's content editor has never had
  an English field to type into, for any section, for any tenant.

---

## Side Findings

- `MANAGER_UNITS` is excluded from `store.py` despite its name sounding inventory-adjacent — it
  gates the generic `catalog.py` routes instead. Worth knowing before assuming that role name maps
  to "can manage Store items" — it currently doesn't, for RK's real product catalog specifically.
- The hidden `/create-user` setup route's `valid_roles` set was clearly written before `STAFF`
  existed (Staff Scoped Access shipped 2026-08-09, per that phase's own dated comments) and never
  revisited — a real, small, easy-to-miss omission once a real dashboard-based staff-creation flow
  gets built.

## Unknowns

- No live, authenticated browser pass on `GenericAdminDashboard` this round — same standing gap
  named in this project's own prior sessions (needs real admin credentials). Every claim above is
  code-read-confirmed with file:line citations, not independently screenshotted.
- Whether Salman wants `STAFF` (self-scoped) extended to cover inventory, a genuinely new role
  added, or a different shape entirely (e.g., per-permission toggles instead of a fixed role enum)
  is a real design decision this investigation surfaces but does not answer.
- Whether the missing "un-hide" button was ever intentionally omitted (vs. a plain oversight) is
  not documented anywhere in the code the way the "no hard delete" decision explicitly is — treated
  here as a real bug, not a judgment call, since nothing argues for the current one-way behavior.

---

## What this does NOT include (deliberately, per Salman's own sequencing)

No implementation, no code changes, no new role added, no new route written, no frontend button
added. This report is the "فحص" step; the work plan is the next, separate step, per Salman's own
explicit instruction to keep the two apart.
