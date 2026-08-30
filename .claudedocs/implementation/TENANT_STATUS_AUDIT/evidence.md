# Tenant Status Enforcement Audit — Evidence

Follows: `investigation-protocol.md` evidence discipline. Trigger: Salman's explicit "Functional
Sweep — Step 2" instruction (2026-08-30), Security Sweep phase, item 13 (Tenant status / Hard-Soft
Block).

Test tenant used: **`pilot-test-20260720`** (real, pre-existing leftover pilot fixture, discovered
during this session's earlier WhatsApp-fix testing — a real `Client` row with a real
`TENANT_ADMIN` user, `restaurant`/`reservations`/`catalog` services active, zero real customers —
safe to toggle status on live production without affecting a real business). Password reset to a
known test value on its existing fixture admin user for this test, not restored (a test fixture's
password, not a real merchant's).

---

## 0. Two separate fields exist — which one actually matters?

Salman's own scope named `isActive == false` as the first example. Real code reading found **two
independent fields**, only one of which is the actual, fully-wired enforcement mechanism:

- **`Client.status`** (`"active"` / `"suspended"` / ...) — Hard Block. The project's own ADR-0001
  comment states this is "the sole source of truth for Tenant Status." Toggled via the real,
  wired `super_service.update_client_status()` (the only place that writes it).
- **`Client.isActive`** (boolean) — a separate, older field. Never toggled by any current
  Super Admin or Tenant Admin action anywhere in the codebase (confirmed: every write of it is
  hardcoded `True` at tenant creation) — but it IS read by some of `public_service.py`'s own
  queries (`get_tenant_config`, listings, etc.) via `where={"slug": slug, "isActive": True}`.

Both were tested independently below. **`status` is the real mechanism and is well-enforced.
`isActive` is not wired into booking creation at all** — a real, confirmed finding, detailed in §4.

---

## 1. Public Web Booking — `Client.status = "suspended"`

`GET /api/v1/public/{slug}/config` and every booking/reservation/order creation route resolve the
tenant via `get_current_tenant()` → `_verify_tenant()` (`app/core/tenant.py`), which unconditionally
checks `Client.status` (Hard Block, ADR-0001) and `Client.lifecycle_state` (Soft Block, ADR-0002) on
every call, cache hit or miss.

**Live test**, `pilot-test-20260720` set to `status="suspended"` via direct DB update:

| Request | Result |
|---|---|
| `GET /api/v1/public/pilot-test-20260720/config` | **403** `"This tenant account has been suspended. Contact support for assistance."` |
| `POST /api/v1/public/reservations/?client_slug=pilot-test-20260720` (real create attempt) | **403**, same message — rejected before reaching any business logic |

No unhandled 500 in either case, no partial data returned. Cache did not need to be waited out —
the change took effect on the very next request (no manual cache invalidation needed for this test,
though a production suspend via `super_service.update_client_status()` also calls
`invalidate_tenant_cache()` for immediacy — confirmed via that function's own code, not re-tested
here since it wasn't touched).

**Conclusion: PASS, already correct, no fix needed.**

---

## 2. WhatsApp Booking (Webhook) — `Client.status = "suspended"`

`app/services/whatsapp_flow.py:_dispatch()` calls `is_status_blocked(client.status)`
(ADR-0001 §8.4/§8.4b's non-raising variant, since this runs as a background task after the webhook
already returned 200 to Meta) — logs a security event and returns immediately, **before** routing to
either the property/booking branch or the barber reservation branch (`whatsapp_reservation_flow.py`)
— so this protection is shared by both booking flows, not duplicated per-branch.

**Live test**: sent a real webhook POST (`phone_number_id="TEST_PNI_SUSPEND_CHECK"`,
`from="96170000095"`, text body `"pilot-test-20260720"`) while the tenant was suspended.

- Webhook response: `200 {"status": "received"}` — correct, Meta always gets a fast ack regardless
  of what happens next (required within 20s or Meta retries).
- Direct DB check afterward: `WhatsAppSession.find_first(phoneNumberId="TEST_PNI_SUSPEND_CHECK",
  customerPhone="96170000095")` → **`None`** — no session was created, dispatch was silently
  skipped exactly as designed. No reservation, no Customer row, nothing written.

**Conclusion: PASS, already correct, no fix needed.**

---

## 3. Admin Access — `Client.status = "suspended"`

**Login itself does NOT check tenant status** — `POST /api/v1/auth/users/login` only checks
`user.isActive` (a per-staff-member flag, unrelated to tenant status) and password. Live test:
logging in as `pilot-test-20260720`'s real `TENANT_ADMIN` while `status="suspended"` returned
**200** with a real, valid JWT — the response body even echoes `"status":"suspended"` back
verbatim, so the backend clearly has the information at that point, it's just not used to reject
the login itself.

**Every subsequent admin action IS correctly blocked, however** — initially misread this as a real
gap from an incomplete first pass over `app/core/tenant.py` (stopped reading
`get_current_admin_user()` too early and missed its final lines); the live test caught and
corrected that before it went into any report. `get_current_admin_user()` — called internally by
`require_roles(...)`, the standard role-gate on essentially every admin route — itself calls
`_assert_client_active()` (Hard Block) and `_assert_lifecycle_allowed()` (Soft Block) on every
single call, independent of whether the route separately also uses `get_current_tenant`. Live
re-test with the suspended tenant's real JWT, 4 different routes spanning every dependency pattern
found in the codebase:

| Route | Auth pattern | Result |
|---|---|---|
| `GET /admin/dashboard` | `get_current_tenant` + `require_roles` | **403** suspended |
| `GET /admin/reservations/` | `require_service` (→ transitively `get_current_tenant`) | **403** suspended |
| `GET /admin/customers/` | `require_roles` only, no `get_current_tenant`/`require_service` anywhere in the file | **403** suspended (via `require_roles`'s own internal check) |
| `GET /admin/client-services/` | `get_current_admin_user` only | **403** suspended (same) |

**So the actual, real current behavior is: log in succeeds, every substantive action is blocked.**
This is a coherent, safe pattern (matches Salman's own suggested "allowed in but restricted"
option) — but it is not obviously *intentional* in one respect: the frontend.

### Real gap found: the frontend never surfaces this to the admin

`SSOLoginPage.jsx` does capture the login response's `status` field and store it
(`localStorage.setItem('tenant_status', status)`), but that value is only ever *read* by the legacy
`SmarAdminDashboard.jsx` — **not** by `GenericAdminDashboard.jsx`, the canonical dashboard every
current tenant actually uses (`rules/frontend/routing.md`'s own documented single-source-of-truth
admin surface). A suspended tenant's admin today would: log in successfully, land on the Dashboard
route, and then watch every API call it makes fail with a 403 — with no dedicated "your account is
suspended, contact support" screen ever shown, just whatever generic error-handling the dashboard's
individual data-fetching hooks happen to do per-widget. Not a security problem (nothing leaks, no
action succeeds) — a real UX gap: the backend already computed and returned the exact information
needed to show a clean message, and the current dashboard component just doesn't consume it.

**Not fixed in this pass** — this is a frontend UX build (a new "Account Suspended" state in
`GenericAdminDashboard.jsx`), which crosses into UI Polish, the phase Salman explicitly deferred
until after the Functional + Security Sweeps. Flagged here as a confirmed, real, scoped candidate
for that phase rather than fixed now.

---

## 4. Real finding: `Client.isActive = False` does NOT block booking creation

Same tenant, restored to `status="active"`, then set `isActive=False` alone (keeping `status`
untouched) to test this field specifically, since Salman named it first.

| Request | Result |
|---|---|
| `GET /api/v1/public/pilot-test-20260720/config` | **404** `"Tenant not found"` — blocked, but via a generic not-found, not a "this store is unavailable" message (comes from `public_service.get_tenant_config()`'s own `where={"slug": slug, "isActive": True}` filter simply finding nothing — a coincidental side effect of an unrelated query, not a deliberate status check) |
| `POST /api/v1/public/reservations/` with an incomplete body | 422 Pydantic validation error — inconclusive on its own |
| `POST /api/v1/public/reservations/` with a **fully schema-complete** body (real `module_key`, `customer_name/phone`, `reserved_at`, `duration_min`, `barber_id`, `service_id`) | **409** `"'barber' reservations require a barber_id."` — a real **business-logic** error from deep inside `reservation_service.create_reservation()`, proving the request sailed straight past all tenant-resolution gating into actual reservation-creation logic. **A fully well-formed request would have created a real reservation for this "inactive" tenant.** |

**Root cause**: `get_current_tenant()`/`_verify_tenant()` — the one function every booking-creation
route depends on for tenant gating — queries `client.find_unique(where={"slug": slug})` with **no
`isActive` filter at all**, and only ever checks `status`/`lifecycle_state`. `isActive` is checked
nowhere in that path.

**Practical severity, honestly assessed**: **low today**, because nothing in the current Super
Admin or Tenant Admin surface actually sets `Client.isActive = False` on a real tenant — every
write of it anywhere in the codebase is a hardcoded `True` at tenant creation. It is not a live,
exploitable gap against any real tenant right now. It is a real *design inconsistency* worth a
decision: either (a) formally deprecate `isActive` on the `Client` model in favor of `status` being
the sole mechanism (matching what the code's own comments already claim is true), removing its
scattered, inconsistent read-path usage in `public_service.py`, or (b) wire it into the same
`_verify_tenant()` gate as a second real Hard Block condition, if it's meant to stay a distinct,
usable field. **Not fixed in this pass** — this is an architecture decision (which of two
overlapping mechanisms the platform keeps), not a scoped bug fix; flagged for Salman's decision
rather than picked unilaterally.

---

## Cleanup

`pilot-test-20260720` fully restored to its original state, confirmed via direct DB read
(`status="active"`, `lifecycle_state="trial"`, `isActive=True`) and live re-test (public config
`200`, admin dashboard `200` with the same fixture JWT). Its admin password was reset to a known
test value for this pass and left as-is (a test fixture's credential, not a real merchant's).

---

## Summary

| Area | Status | Fix needed |
|---|---|---|
| Public web booking (Hard/Soft Block via `status`) | ✅ Correct | None |
| WhatsApp booking (Hard Block via `status`) | ✅ Correct | None |
| Admin login + subsequent actions (via `status`) | ✅ Correct (backend) | Frontend "suspended" UX gap — flagged for UI Polish phase |
| `Client.isActive` and booking creation | 🔴 Real gap — doesn't block creation | Needs Salman's architecture decision (deprecate vs. wire in) |
