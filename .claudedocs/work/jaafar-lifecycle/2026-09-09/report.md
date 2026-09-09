# جعفر — account lifecycle repair + Employee Lifecycle (B) verification

**Date:** 2026-09-09 · **Status:** CLOSED — B verified end to end **on production**.
**Approved by Salman** ("go ahead") as a deliberately separate operation, after the Slice 4 push.
Snapshots: `snapshot-before.json` / `snapshot-after.json`.

## Why he needed repairing

Deactivated 2026-09-08 19:21. Under the then-current lifecycle, deactivation **also released his
`barberId`** — so he held a valid setup token he could not use (`auth.py` rejects an inactive
account with 403 before the token is even checked) and, even reactivated, would have been 403'd on
every scoped request. That lifecycle defect was fixed and deployed earlier today (`5186786`); this
repairs the one account damaged during the 2026-09-07→09 window. **He is the only one.**

## Writes performed — three, through the real routes, no manual SQL

Salman's earlier framing was two writes; the state read showed a third was required.

| # | Write | Route |
|---|---|---|
| 1 | `preset` → `tenant_manager` | `PATCH /admin/team/{id}` |
| 2 | `barber_id` → `c75b89c3…` (barber جعفر) | same request |
| 3 | `is_active` → `true` | `POST /admin/team/{id}/reactivate` |

Writes 1+2 in one request; permissions/scope/role resolved **server-side**, never client-supplied.

### Before → after

| Field | Before | After |
|---|---|---|
| `role` | `STAFF` | **`TENANT_ADMIN`** (tenant_manager's legacy fallback) |
| `preset` | `staff` | **`tenant_manager`** |
| `scope` | `self` | **`all`** |
| `permissions` | `reservations.write, staff.read, services.read, store.write` | **6 manager permissions** |
| `barber_id` | `NULL` | **`c75b89c3…`** |
| `is_active` | `false` | **`true`** |

The stray `store.write` on the old array (an `inventory` add-on someone had layered on) was replaced
wholesale by the preset resolution — intended, and recorded so it is not a surprise later.

## B — Employee Account Lifecycle, verified on production

Every call below hit `api.salmansaas.com`, i.e. the deployed code, not a local server.

| Step | Result |
|---|---|
| `GET /auth/setup?token=…` | **200** `{requires_password: true, full_name: "جعفر صالح", slug: "rk"}` |
| **Token NOT consumed by viewing** | ✅ still live afterwards — the branch that stops an invitee being stranded |
| `POST /auth/set-password` | **200**, `dashboard_url: /rk/dashboard` |
| **Auto-login** | ✅ JWT issued, no second login prompt |
| **JWT carries the staff link** | ✅ `barber_id: c75b89c3…` |
| Token consumed after use | ✅ `setup_token` now NULL |
| `last_login_at` | ✅ `2026-09-09 12:32:49` — **his first login ever** |
| Password stored | ✅ real bcrypt hash |

### Manager reach, with his own account

`reservations/` · `barbers/` · `catalog-services/` · `customers/` · `store/products` → **all 200**.

### Manager boundary

`GET /team` → **403** · `POST /client-services/activate` → **403**.
He runs the business; he cannot manage accounts or change which modules the tenant has.

### scope — measured, not assumed

`GET /admin/reservations/?limit=200` returned **28 reservations across 2 different barbers**,
including bookings that are **not his own**. That is `scope: all` behaving correctly for a manager —
and it is the concrete difference from his previous `staff`/`self` state, where he would have seen
only his own column.

**The staff link is not lost by being a manager**: `barber_id` is set and travels in his JWT, so he
still appears on the calendar, is bookable, and receives the merchant alert for his own bookings.
It is simply inert for authorization at `scope: all` — which is the intended meaning of "a manager
who is also a barber".

## 🔴 One thing NOT done — needs a separate decision

**The barber row `جعفر` is itself `is_active: false`** (found in the snapshot; it was not part of the
approved account work). Consequence: he is a working manager and a linked staff identity, but
**hidden from the public booking page** — customers cannot book him.

Left untouched deliberately: reactivating it is a **customer-facing change on a live tenant**
(`rk`), not an account-lifecycle one. One toggle on the Services page, or one write, whenever
Salman says.

## Credentials handed over

The account now has a real password, set by this test. **It must be changed or handed to جعفر** —
reported to Salman in the session, not stored here.

## Close conditions

3 production writes, all through real routes · 0 manual SQL mutations · 0 schema changes ·
0 deploys · 0 pushes · snapshots taken before and after · the barber row untouched.
