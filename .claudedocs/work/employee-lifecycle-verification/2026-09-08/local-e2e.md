# B — Employee Account Lifecycle: local end-to-end verification

**Date:** 2026-09-08 · **Status:** CLOSED — flow verified locally; one gap and two findings recorded.
**Environment:** local FastAPI (`127.0.0.1:8000`) + Vite (`localhost:5173`), **against the production
Frankfurt database** (`.env` DATABASE_URL) — the only database this project has.
**Tenant:** `barberlab-test` — a **test** tenant chosen deliberately over `rk`, per Salman's standing
rule *"لا نختبر كوداً جديداً على عملاء حقيقيين أبداً."*
**Cleanup:** the test account was hard-deleted; `barberlab-test` is back to its original 2 users.

## What was exercised

| Step | Result | Evidence |
|---|---|---|
| Admin creates staff, phone typed **local** `70123456` | ✅ | `POST /api/v1/admin/team` → `201` |
| **Phone normalised on write** | ✅ | response `"phone": "96170123456"` |
| Preset resolved server-side | ✅ | `shop_manager` → `["store.write","customers.read"]`, `scope: all`, `role: STAFF` |
| **`invite_sent` honest** | ✅ | `"invite_sent": false` — no WhatsApp credentials locally, and it said so |
| `setup_url` returned to owner | ✅ | carries the one-time token |
| Setup page renders, greets by name | ✅ | `🔐 أهلاً اختبار الرقم` + two password fields |
| Token **not consumed** by viewing | ✅ | password form shown, not an "expired" error |
| Set password → **auto-login** | ✅ | redirected to `/barberlab-test/dashboard/customers`, no second login |
| **Dashboard scoped to the preset** | ✅ | nav rendered exactly `العملاء` + `خروج` |
| Backend deny-by-default | ✅ | `403` on `/admin/reservations/`, `/admin/barbers/`, `/admin/catalog-services/` |

**Salman's requirement — *"الداشبورد فيها بس الأقسام اللي نقّاها الأدمن"* — confirmed working.**
`shop_manager` granted `store.write` + `customers.read`; the nav showed **only** Customers. Store was
withheld too, because `PERMISSION_NAV`'s second axis requires the TENANT to have the `store` service
active and `barberlab-test` does not — permission AND service, both enforced.

## 🟠 Finding — the UI hides tabs it still requests

Six console errors, all `403`, on three endpoints the account has no permission for, each fired
twice (React StrictMode double-render in dev).

**Not a security defect** — the server refused every one, which is deny-by-default working. It is a
**correctness/noise defect**: the nav correctly hides these surfaces while something still fetches
them. Wasted round-trips on every dashboard load for every scoped account, and a console that cries
wolf. **Recorded, not fixed** — outside this task's scope.

## 🔴 Gap — no reissue path

`admin/team.py` exposes `POST /team` (create), `DELETE /team/{id}` (**deactivates**, does not delete —
`POST /team/{id}/reactivate` is the inverse), and nothing else. **There is no way to resend a setup
link.** An invite whose WhatsApp failed can only be recovered by deleting and recreating the account.
That is exactly جعفر's situation. Named as a real lifecycle gap; no change made.

## ⚠️ Not verified here

- **Real WhatsApp delivery.** Credentials live on Railway, not locally — proven by this run:
  `send_staff_setup_link` returned **False** with `Missing WhatsApp credentials`. Correct behaviour,
  but the delivery leg stays **UNKNOWN** until exercised on production.
- **`FRONTEND_URL`.** Locally unset, so `team.py:219` fell back to `https://salmansaas.com`, visible
  in the returned `setup_url`. The apex serves a different build than `demo.`/`alzabt.`
  (`index-CEGFNe9L.js` vs `index-PnxR8Gfi.js`). Railway's value is still unread.

## Side finding — the email validator rejects the project's own convention

`POST /team` refused both `@barberlab-test.local` and `@rk.dev.invalid` ("special-use or reserved
name"), yet **every existing account uses exactly those domains**. The current API cannot create an
account matching the naming convention its own data follows. Recorded, not fixed.

## The defect this test found

Running the send path locally returned `True` while sending nothing:
`WhatsAppService._send_request` **never raises** — missing credentials return `None`, a Meta rejection
returns the non-200 response, a network error returns `None`. The morning's try/except fix therefore
still reported success in every real failure mode. Fixed in `91906f7` by inspecting the actual
result; re-measured, now returns `False`. **Found by execution, not by reading.**
