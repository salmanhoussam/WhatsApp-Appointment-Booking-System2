# Staff Scoped Access — Phase D Evidence

Follows: `.claudedocs/implementation/STAFF_SCOPED_ACCESS_CONTRACT.md`. Dashboard-only phase per
Salman's framing — backend (Phases A-C) is the real security boundary; this phase is UI plus one
real bug found and fixed via required browser verification.

## Changes

- `frontend/src/pages/generic-admin/GenericAdminDashboard.jsx` — new `STAFF_NAV` (Calendar/
  Reservations/My Clients only), computed via `useAdminRole()`. **Real finding**: `useAdminRole.js`'s
  existing `ROLE_TABS`/`canAccessTab` mechanism ("add STAFF to ROLE_TABS," the literal instruction)
  is wired only into the legacy `SmarAdminDashboard.jsx` (a different tab-id vocabulary entirely —
  `inbox`/`units`/`gallery`/etc.) — `GenericAdminDashboard.jsx` (what `rk` actually uses) never used
  it. Adding `STAFF` there would have been dead code; built an equivalent, parallel filter for this
  dashboard's real nav shape instead.
- `frontend/src/pages/generic-admin/tabs/MyClientsTab.jsx` (new) — reads `GET
  /reservations/my-clients` (Phase C), no client-side filtering of its own (nothing to filter — the
  backend never sends another staff member's clients).
- `frontend/src/pages/generic-admin/components/ReservationsTodayView.jsx` — barber-picker pill row
  now hidden via `hideBarberPicker` when `true` (not just cosmetic: with the picker visible but the
  backend always scoped to the caller's own barber regardless of selection, a STAFF user selecting a
  different name would silently keep seeing their own schedule underneath it — actively misleading,
  not just cluttered).
- `frontend/src/hooks/useAdminRole.js` — new `useAdminBarberId()` (separate from `useAdminRole()`,
  doesn't change its existing return contract).
- `app/api/v1/admin/auth.py` — admin JWTs (`user_login`, `magic_link_login`) now carry a
  **display-only** `barber_id` claim. Never used for backend authorization (that stays exactly as
  Phase A/B built it — DB-sourced on every request via `get_current_admin_user`); needed because the
  frontend has no other reliable way to know "my own barberId" that survives page reloads without
  depending on reservation data being non-empty (the `barbers[0]` auto-default the calendar already
  had could resolve to a *different* staff member, silently filtering the view to nothing even
  though the backend sent real data — the exact bug this phase's browser verification caught, see
  below).

## Bug found via required browser verification (not caught by code reading alone)

First Jaafar pass showed **"لا يوجد موظفون نشطون" (no active staff) with 0 reservations, despite 3
real ones existing.** Root cause, from real console/network capture:
`GET /api/v1/admin/barbers/?client_slug=rk` and `GET /api/v1/admin/catalog-services/?client_slug=rk`
both `403` — neither `barbers.py` nor `catalog_services.py` had `STAFF` in their read allow-lists,
so the calendar couldn't even resolve its own rendering data.

### Fix — read-only grant, writes untouched

- `app/api/v1/admin/barbers.py`: `STAFF` added to `GET /` (`list_barbers`) only.
- `app/api/v1/admin/catalog_services.py`: `STAFF` added to `GET /` (`list_catalog_services`) only.
- Every write route in both files (`POST`, `PATCH`, `deactivate`, `set_barber_services`) left
  exactly as-is — no `STAFF` added anywhere in a write path.

## Real Verification — API level (post-fix)

| # | Test | Expected | Actual |
|---|---|---|---|
| D1 | Jaafar `GET /barbers/` | 200 | `HTTP 200` ✅ |
| D2 | Jaafar `GET /catalog-services/` | 200 | `HTTP 200` ✅ |
| D3 | Jaafar `POST /barbers/` | 403 | `HTTP 403` ✅ |
| D4 | Jaafar `PATCH /barbers/{own id}` | 403 | `HTTP 403` ✅ |
| D5 | Jaafar `POST /catalog-services/` | 403 | `HTTP 403` ✅ |
| D6 | Jaafar `PATCH /catalog-services/{id}` | 403 | `HTTP 403` ✅ |
| D7 | Jaafar `GET` Hussein's reservation | 403 (Phase B, re-confirmed) | `HTTP 403` ✅ |
| D8 | Jaafar `GET /reservations/my-clients` | still exactly 3 | `count: 3` ✅ |
| D9 | Jaafar `GET /catalog/categories` | 403 (unrelated route, unaffected) | `HTTP 403` ✅ |
| D10 | Tenant Admin `GET /barbers/` + `/catalog-services/` (regression) | 200/200 | `200`/`200` ✅ |
| D11 | Tenant Admin `POST /barbers/` (regression) | 201 | `HTTP 201` ✅ (test row created, then deactivated — see below) |

11/11 pass. D11's test row (`Regression Check Barber`) was deactivated immediately after (not
deleted — `barbers.py` exposes no hard delete, same reasoning as `resources.py`: would orphan
historical `Reservation.barberId` rows).

## Real Verification — Browser level (post-fix, Jaafar)

- `document.body.innerText.includes('لا يوجد موظفون نشطون')` → **`false`** (was `true` before the
  fix) — bug confirmed gone.
- Calendar column header correctly renders **"جعفر"** — `visibleBarberId` correctly seeded from the
  JWT's new `barber_id` claim, correctly resolved against the now-loading `barbers` list.
- Console: 4 messages, 0 errors, 0 warnings (previously 2 real `403` errors).
- Network: `GET /admin/barbers/` and `GET /admin/catalog-services/` both `200` (×2 each, one per
  Calendar load) — previously both `403`.
- "0 حجز" for today's date (2026-08-09) is **correct, not a gap** — verified against real data:
  Jaafar's 4 reservation rows are dated 2026-08-05, 08-06 (×2), and 08-12 — none fall on today, so
  an empty Today view is the accurate result, not a rendering failure.
- My Clients: still exactly 3, unchanged by this fix (correct — Phase C's own endpoint was never
  touched).

## Regression — Tenant Admin (Hussein), full browser pass

- Sidebar: all 9 tabs present (Calendar/Reservations/Catalog/Staff/Customers/Notifications/
  Settings/Orders/Overview) — nothing missing.
- Calendar staff-switcher pill row: present, functional — clicked جعفر, column switched correctly,
  confirmed via both snapshot and screenshot.
- Zero console errors during the entire admin session.

## Tooling note, not a product bug

`browser_click` on the sidebar's RTL nav buttons (My Clients, Calendar) intermittently registered no
navigation despite a clean hit-test; a raw DOM `.click()` via `browser_evaluate` worked immediately
every time it was tried as a fallback. Logged in case it recurs in a future verification pass — not
something a real mouse click would necessarily reproduce.

## Full 3-Tier Capability — Status

- **Salman (Super Admin)**: unaffected by any phase — `require_super_admin` and `/super/*` routes
  were never touched anywhere in Phases A-D.
- **Hussein (Tenant Admin)**: confirmed fully unaffected, real browser regression pass, all tabs and
  functionality intact.
- **Jaafar (Staff)**: real, backend-enforced scoping (Phases A-C) plus a working, correctly-scoped
  dashboard (Phase D) — Calendar, Reservations, and My Clients all render his own real data; every
  write/other-staff/other-capability path returns a real 403 from the backend, not a hidden tab.

**3-tier authorization capability complete end-to-end**, per Salman's own closing bar.
