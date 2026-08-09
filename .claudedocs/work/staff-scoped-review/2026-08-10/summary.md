# Staff-Scoped Product Review — `rk`, Jaafar (`STAFF`) — Phase 3.5, Pass 3 (final)

Real Playwright browser (desktop 1440×900) plus independent direct-API verification for both
findings the raw review flagged as needing confirmation, per this session's own established
discipline (correct before reporting, not after).

## Verdict

**✅ Keep as-is** for the core scoped experience: three-item nav (Calendar / Reservations / My
Clients), lands on today's schedule, both UI-level and **server-level** enforcement confirmed —
including a real spoofed `barber_id` API attempt that the backend correctly ignored, returning only
Jaafar's own 5 reservations. Direct-URL attempts at `/staff`, `/store`, `/settings` all correctly
fell back with the underlying admin endpoints returning real `403 Forbidden`s, not just a hidden
nav link.

Two real findings underneath that verdict — one confirmed safe on investigation, one confirmed a
real (minor) gap:

## Finding 1 — Cross-barber reassignment via the reschedule modal: investigated, NOT a gap

The raw review flagged the reschedule modal's barber-reassignment dropdown showing all 5 staff
members (including 3 test entries) as a possible authorization concern, correctly declining to test
it live (would mutate real booking data). Checked directly in the code instead of guessing:

`app/services/reservation_service.py:497-501` (`edit_reservation()`):
```python
if staff_barber_id is not None:
    if getattr(existing, "barberId", None) != staff_barber_id:
        raise ReservationAccessDenied()
    if new_barber_id is not None and new_barber_id != staff_barber_id:
        raise ReservationAccessDenied()
```
This is explicitly documented in the function's own docstring as a deliberate Phase B (2026-08-09)
guard: a STAFF caller may not reassign their own reservation to a different barber — exactly the
scenario flagged. **Confirmed safe, not an Unknown.**

The real, smaller issue that remains: the dropdown itself is a **misleading affordance** — it
offers 4 other barbers (3 of them test data) that any actual selection+submit would always be
rejected for. This is a UI polish item, and it doubles as another instance of the Production Data
Hygiene finding (Phase 3.6) — test staff names leaking into a staff-facing modal, not just admin
screens.

## Finding 2 — `GET /admin/barbers/` returns the full, unfiltered staff roster to a STAFF token

Independently re-verified via direct `curl` with Jaafar's real bearer token (not just trusting the
nested review's claim):

```
GET /api/v1/admin/barbers/?client_slug=rk  =>  200 OK
```
Response: all 5 barbers, full objects — `name`, `phone`, `working_hours`, `image_url`,
`is_active`, `sort_order` — including a real-looking phone number
(`"96170555916"` on `Test Staff 1786124916`) and حسين's/جعفر's own working hours. **Confirmed real,
not a UI leak assumption** — the endpoint itself is not role-scoped, unlike `/reservations/` and
`/reservations/my-clients` (both independently confirmed correctly scoped in Step 6/7).

This matches the shape of a standing principle this project already named once (`todo_list.md`'s
"Least Privilege" entry, 2026-07-30 Authorization Hardening: "if an operational role needs a
resource's data, build a new, narrowly-scoped operational endpoint for it — never expand an admin
endpoint's allowed roles instead"), not yet promoted to a rules file pending a second confirming
case. This may be that second case — worth naming, not deciding here.

**Severity**: real but currently low-impact on `rk`'s own data (several phone fields are `null`);
would become a genuine PII exposure the moment a real shop has multiple staff with real phone
numbers on file, which is exactly the state RK/Ali are meant to reach by 2026-08-31.

## Other Findings

- "My Clients" is correctly scoped (4 clients, matching Jaafar's own reservation customers exactly)
  but thin — name + phone only, no visit history/last-service, limiting real usefulness.
- The Week toggle on Jaafar's Calendar has no visible effect — a dead control, not investigated
  further (low priority, cosmetic).
- Console: one benign 401 (a startup race before the token attaches, self-resolves), all other
  errors are the expected/correct 403s from the direct-URL admin-route probes.

## Not Fixed

Per this session's own "report first, decide/fix separately" discipline — nothing here was patched
inline. Both the barbers-roster scoping and the reassignment-dropdown data-hygiene leak are logged
for a scoping/priority decision, not silently fixed mid-review.

---

## Phase 3.5 — Three-Sided Product Review: COMPLETE

| Pass | Verdict summary |
|---|---|
| Customer (`/rk/reserve`) | Steps 1-3 ✅ Keep as-is; availability endpoint reliability + error-masking is its own Production Blocker (unrelated to UI) |
| Admin (Tenant Owner) | Settings + Store Categories ✅; Calendar/Reservations/Staff/Store Items&Orders 🟡; Overview 🔴 Redesign-candidate |
| Staff (`STAFF`, Jaafar) | ✅ Keep as-is overall; one real minor scoping gap (`/admin/barbers/`) and one UI-hygiene leak found and independently confirmed |

All three passes evidence-backed (screenshots + DOM/network/API verification, not impressions),
per `browser-verification-protocol.md`. Two claims from raw reviews were caught and corrected
before being reported as fact this session (`customers.py`/`prices.py` reachability, the
Staff↔Service assignment location) — same discipline applied a third time here (the reassignment
"Unknown" resolved via code read instead of left standing).
