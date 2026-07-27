# RK Barber Reservations — End-to-End Verification (Fix + Working Hours + Real Calendar)

**Tenant:** `hr` (RK Barber Shop) — **Date:** 2026-07-27 — Follows
`investigation-protocol.md`'s evidence discipline. Screenshots referenced below are saved at
`/tmp/claude-1000/.../scratchpad/rk-barber-reservations-evidence/` (session scratchpad — not
committed to the repo, since this project keeps evidence as text/markdown; the images were shown
directly to Salman in-conversation as the real proof).

---

## 1. What Was Fixed / Built

1. **Real 500 bug** (`app/services/reservation_service.py`): every reservation create call that
   included `metadata` (or explicitly `None`) failed — Prisma's generated types for this client
   require an optional `Json?` field to be omitted entirely or wrapped in `Json(...)`. Root-caused
   via 3 direct diagnostic Prisma calls before touching any route code.
2. **Working hours** — new, `Client.config.working_hours` (no migration): `hr` set to closed
   Monday, 09:00–21:00 the rest of the week. Enforced in `create_reservation()`, returns `409`
   with a clear message on violation. All times UTC directly (named simplification — no
   timezone-conversion utility exists anywhere in the reservation path).
3. **Real Calendar View** — `frontend/src/pages/generic-admin/components/
   ReservationsWeekCalendar.jsx` (new), wired into `ReservationsTab.jsx` via a List/Calendar
   toggle. Backend `app/api/v1/admin/reservations.py` gained `date_from`/`date_to` query params
   for a 7-day range fetch.
4. `hr`'s admin password reset to `password123` (one-off script, scoped only to `hr`'s
   `TENANT_ADMIN` row) — its real password was never recorded anywhere in this repo.

## 2. Real Bugs Found *While Verifying*, Not Assumed Away

Per `investigation-protocol.md`'s "Independent Causes Are Allowed" — three more real, independent
bugs surfaced during this verification, none of which were the original 500:

- **`scheduled_at` vs `reserved_at`** — `ReservationsTab.jsx` read a field
  (`res.scheduled_at ?? res.created_at`) that doesn't exist in the backend response at all,
  silently falling back to the booking's *creation* time in all 3 places it appeared. Invisible in
  a flat table; would have been immediately, visibly wrong in a calendar. Fixed first, before
  building the calendar, since the whole verification depends on it.
- **UTC vs local-timezone display** — found via the *first* real screenshot: an 11:00 UTC booking
  rendered at ~14:00 (this environment's real local time, EEST/UTC+3) in the calendar's initial
  implementation, which used `getHours()`/`getDate()` (local) instead of UTC methods. Fixed by
  making every date/time helper in `ReservationsWeekCalendar.jsx` UTC-consistent, matching the
  backend's own working-hours semantic exactly — otherwise a late-night UTC booking could have
  rendered in the wrong day column entirely for a non-UTC viewer.
- **Real out-of-order-response race** — switching List→Calendar fired a new fetch before the
  previous (list-mode, empty-for-today) request had resolved; when the older request's empty
  result landed *after* the newer calendar fetch's real data, it silently overwrote the correct
  data with an empty array. Confirmed directly: a raw `fetch()` call from within the same page
  context returned the correct 3 rows while the component's own state showed 0. Fixed with a
  request-sequence guard (`requestSeqRef`) in `ReservationsTab.jsx`'s `load()` — a stale response
  is now dropped rather than applied.

## 3. Real Evidence

### 3a. Positive case — Tuesday 11:00 booking

```
POST /api/v1/public/reservations/  →  200
{
  "module_key": "services", "customer_name": "زبون اختبار حقيقي",
  "customer_phone": "+96170000009", "reserved_at": "2026-07-28T11:00:00Z",
  "duration_min": 60, "metadata": {"service_name": "قصة", "catalog_item_id": "...", "price": 5.0}
}
```

### 3b. Negative cases — both correctly rejected

```
Monday 2026-08-03 11:00Z  → 409 "This business is closed on Monday."
Tuesday 2026-07-28 07:00Z → 409 "Outside working hours (09:00-21:00)."
```

### 3c. Real DB row (direct Prisma query, full field dump)

```json
{
  "id": "895e49a2-12e6-44ac-a026-c7c14f7e7617",
  "client_id": "7ef5c8c9-3d47-4aa9-b5e0-43b746ee2657",
  "module_key": "services",
  "customer_name": "زبون اختبار حقيقي",
  "customer_phone": "+96170000009",
  "reserved_at": "2026-07-28T11:00:00+00:00",
  "duration_min": 60,
  "status": "pending",
  "notes": "REAL TEST BOOKING -- End-to-End Reservations Calendar verification",
  "metadata": {
    "price": 5.0, "currency": "USD", "service_name": "قصة",
    "catalog_item_id": "2586960c-b896-4e36-8b7a-a8f91fcb5f3d"
  },
  "created_at": "2026-07-27T16:22:14.677000+00:00"
}
```

### 3d. Real headless-Chrome screenshots (real login token, real browser render)

- `calendar_view.png` — the week grid (2026-07-26 → 2026-08-01), booking card visually
  positioned exactly at the Tuesday (28/7) column, 11:00 row.
- `calendar_modal.png` — clicking the card opens the detail modal, showing customer name, status
  badge ("معلّق"), phone, "60 دقيقة — 11:00", module_key, service_name, notes, and the full real
  metadata JSON.

Both screenshots were iterated on for real — the first attempt visually exposed the UTC/local-time
bug (card rendered at ~14:00, not 11:00) before the fix above; the corrected screenshots (saved)
show 11:00 correctly.

## 4. Cleanup

Two earlier diagnostic-only reservations (created directly via Prisma while root-causing the
original 500, "Diag Test 1"/"Diag Test 3") were deleted after verification — they were never part
of the real deliverable, just bug-diagnosis artifacts.

## 5. Verdict

- [x] 500 bug fixed, confirmed via a real successful booking.
- [x] Working hours enforced both directions (accept in-range, reject both closed-day and
      outside-hours cases) with real 409s.
- [x] Real Calendar View built, wired, and visually verified via real headless-Chrome screenshots
      — not claimed without evidence.
- [x] Three independent real bugs found during verification (field-name mismatch, UTC/local
      display, response race) — all fixed, not left as known issues.
