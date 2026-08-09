# STAFF `/admin/barbers/` Roster Scoping — Investigation (before any code)

Follows: `.claudedocs/work/staff-scoped-review/2026-08-10/summary.md` (the Product Review finding
that first confirmed this). Per Salman's explicit instruction: security/backend task, investigation
proves the leak shape and the required contract before any implementation starts.

## Confirmed: exact shape of the current leak

`app/api/v1/admin/barbers.py`'s `GET /` (`list_barbers`):
```python
_user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "MANAGER_RESERVATIONS", "STAFF")),
...
barbers = await barber_repo.list_barbers(tenant["id"])
return {"success": True, "data": [_fmt(b) for b in barbers]}
```
`STAFF` was added to the role list 2026-08-09 (Staff Scoped Access Phase D — the Calendar needs
*some* barber data to render), but the query itself is never scoped by the caller's own identity —
every role in the list gets the same, full, unfiltered roster. `_fmt()` includes `phone`,
`working_hours`, `image_url`, `is_active` for every barber, not just the caller's own.

**Independently re-confirmed via a real request** (not re-trusting the earlier review's claim):
```
GET /api/v1/admin/barbers/?client_slug=rk   Authorization: Bearer <Jaafar's real STAFF token>
=> 200 OK, 5 barbers, full fields, including "Test Staff 1786124916"'s real phone number
```
(Since Production Data Hygiene's cleanup earlier today, the roster is down to 2 real barbers,
حسين and جعفر — the leak shape is identical, just fewer rows to leak now.)

## Confirmed: this is unrelated to the write routes

Every other route in the file (`POST /`, `PATCH /{id}`, `PATCH /{id}/deactivate`,
`PATCH /{id}/services`) already excludes `STAFF` from its role list — only `SUPER_ADMIN`/
`TENANT_ADMIN` (plus `MANAGER_RESERVATIONS` on the read-only `GET /{id}/services`). No write-route
change is needed or will be made — confirmed, not assumed, by reading every route in the file.

## Confirmed: the exact reusable pattern already exists in this codebase

`app/api/v1/admin/reservations.py` solved this identical problem for reservations/clients on
2026-08-09 (Staff Scoped Access Phase B) with `_require_staff_barber_id(user)`:
```python
def _require_staff_barber_id(user) -> Optional[str]:
    """Server-derived from the authenticated User, never from client input. Returns None for
    every non-STAFF role (no scoping applies). A STAFF user with no barberId link is a
    misconfiguration -- fails closed (403), never silently falls back to seeing everything."""
    if not _is_staff(user):
        return None
    if not user.barberId:
        raise HTTPException(status_code=403, detail="Staff account is not linked to a barber profile.")
    return str(user.barberId)
```
`require_roles()` (`app/core/tenant.py:476`) already returns the full `User` model (via
`get_current_admin_user`), with real `.role`/`.barberId` fields — the same object
`_require_staff_barber_id` expects. **No new mechanism needed — this is a second call site for an
already-proven, already-fail-closed pattern**, not a new design.

## Required contract (per Salman's explicit spec)

- `STAFF` → sees exactly one row: their own, resolved from `User.barberId`, server-side.
- `STAFF` with no `barberId` link → `403`, fail-closed, same as the reservations precedent — never
  silently falls back to the full list or an empty-but-200 response.
- `TENANT_ADMIN` / `SUPER_ADMIN` / `MANAGER_RESERVATIONS` → unchanged, full roster.
- Enforced in the API response itself, not left to the frontend to filter/hide.

## Confirmed: frontend regression risk is real but the fix doesn't introduce it — it removes an
existing footgun

`GenericAdminDashboard.jsx:462/464` already passes `hideBarberPicker={isStaff}` into
`ReservationsTab`, which is the *only* thing currently preventing Jaafar's Calendar from showing a
multi-barber switcher — a client-side flag, not real data scoping. `ReservationsTab.jsx`'s own code
comment (lines 330-336) already states this explicitly: *"`barbers` is the tenant's full, unscoped
list (Phase B never touched `GET /barbers/`)"* — the frontend team already knew this gap existed and
worked around it by seeding `visibleBarberId` from the JWT's own `barber_id` claim
(`useAdminBarberId()`), never from `barbers[0]`. Traced the actual column-render logic
(`ReservationsTodayView.jsx:432`): `barbers.find((b) => b.id === visibleBarberId)` — this only ever
needs the caller's own row to exist in the array; it never depends on the array containing anyone
else's. Scoping the API to one row for `STAFF` will not change `visibleBarberId` (still JWT-derived)
and will not break this lookup (their own row will still be present). The only other consumer of
this array requiring `barbers.length > 1` (the switcher) will now be `false` server-side too,
redundant with but consistent with the existing `hideBarberPicker` flag — no behavior change for
`STAFF`, a real security improvement underneath it.

`StaffTab.jsx:142`'s own call to this same endpoint only ever runs on the Staff/Employees admin
screen — confirmed unreachable by `STAFF` (no nav entry exists for it, per the Staff-scoped
review) — unaffected by this change.

## Confirmed: a real STAFF-without-barberId test account already exists

`User` row `b01011e1-7f7b-438d-abb1-9646a4ecf898`, "Staff No Barber Verify", role `STAFF`,
`barberId = null`, `isActive = true` — surfaced during today's Production Data Hygiene investigation
and deliberately left untouched (flagged for human review, not auto-deleted, since it's
`isActive=true` unlike its 5 dormant siblings). Reused directly for the fail-closed test below
rather than fabricating a new one.

## Plan (implementation, next — not started until this file was reviewed)

1. Import `_require_staff_barber_id` from `app.api.v1.admin.reservations` into `barbers.py`
   (reuse, not a re-implementation — single source of truth for the fail-closed check stays in one
   place).
2. `list_barbers()`: call it, filter the query result to the caller's own barber when it returns a
   real id; `TENANT_ADMIN`/`SUPER_ADMIN`/`MANAGER_RESERVATIONS` unaffected (`None` returned, no
   filter applied).
3. No other route in this file changes.
4. Real tests: Jaafar (real barber) sees only himself; a real `TENANT_ADMIN` login still sees the
   full roster; "Staff No Barber Verify" gets a real `403`, not a 200 with an empty/full list.
5. Regression: Jaafar's Calendar (Today + Week) still renders correctly; `TENANT_ADMIN`'s Staff tab
   still shows the full roster.
