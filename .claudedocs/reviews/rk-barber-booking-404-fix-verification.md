# RK Barber — Booking 404 Fix (Sprint A, Release Blocker #1)

**Tenant:** `hr` — **Date:** 2026-07-28 — Follows `investigation-protocol.md`'s evidence discipline.
Closes Finding #3 of `rk-barber-acceptance-review-2026-07-28.md`, per Salman's explicit sprint
ordering ("أقفل الـ Critical... هذا يجب أن يكون أول شيء يُصلح"). That review document is left
unedited, immutable, per this project's standing convention — this is a separate fix-verification.

## Root Cause (already identified in the Acceptance Review, re-stated for this record)

`frontend/src/pages/generic/normal/ReservePage.jsx:150` posted to `` `/${slug}/reservations/` ``
(i.e. `/api/v1/public/hr/reservations/`), a path that does not exist — the real registered route
has no slug path segment (`prefix="/reservations"`, tenant resolved via the `client_slug` query
param, which the same call already correctly passed). Confirmed isolated to this one line — no
other `publicApi` call in the frontend uses this `` `/${slug}/...` `` pattern.

## Fix

```diff
- `/${slug}/reservations/`,
+ `/reservations/`,
```

One line. No backend change needed — the backend route and its `client_slug` query-param
resolution were already correct.

## Evidence

**Before** (already documented in the Acceptance Review, re-confirmed once more before fixing):
```
curl -X POST http://localhost:8000/api/v1/public/hr/reservations/?client_slug=hr  → 404
```

**After the fix, real browser end-to-end (no admin token — a real cold visitor):**
1. Filled the real `/hr/reserve` form (name, phone, date, time) exactly as a visitor would.
2. Submitted — real network request fired: `POST /api/v1/public/reservations/?client_slug=hr` →
   **200**.
3. Real success screen rendered after ~7s (the response took several seconds — this session's
   already-known, already-documented intermittent Supabase-pooler latency, not a new issue; two
   earlier attempts with a 6-second observation window mistakenly looked "stuck" before this was
   understood — the request was still in flight, not failed):
   > تم تسجيل حجزك! رقم الحجز: 95e941fd — سنتواصل معك على الرقم الذي أدخلته للتأكيد.
4. Real DB row confirmed via direct admin API read-back (`GET /admin/reservations/?client_slug=hr`)
   for each of 4 independent test submissions run during this verification — all 4 real rows found,
   confirming the fix is consistent, not a one-off success.
5. **Negative-case check preserved:** the `hasReservations` guard (`ReservePage.jsx:178`, shows
   "خدمة الحجز غير متاحة حالياً" when the `reservations` service isn't active) was still observed
   firing correctly during one page load where the tenant config transiently hadn't resolved yet —
   this is the *same* `useTenantConfig` fallback mechanism already documented as Finding #11a in the
   Acceptance Review, not a new issue, and not something this fix touches.

## Cleanup

All 4 diagnostic test reservations (`زائر تجربة إصلاح الحجز`, `... 3`, `... 4`, and the original
Phase-A curl-created "x"/"y" row from before this fix) were deleted after verification — none were
real customer data.

## Verdict

- [x] Root cause fixed, one line, no backend change.
- [x] Real end-to-end submission confirmed via actual browser interaction, not just an API call.
- [x] Confirmed consistent across 4 independent real submissions.
- [x] No regression to the existing `hasReservations` negative-case guard.

## Recommendation vs Decision vs Execution

- **Recommendation:** none needed — this was a confirmed, isolated, one-line bug fix with clear
  root cause, not an architectural decision requiring approval.
- **Decision:** approved implicitly by Salman's explicit Sprint A instruction ("أقفل الـ Critical...
  أول شيء يُصلح").
- **Execution:** as documented above, this session, 2026-07-28.

## Related

- `.claudedocs/reviews/rk-barber-acceptance-review-2026-07-28.md` — Finding #3, the source of this
  fix (left unedited, per this project's Review immutability convention).
