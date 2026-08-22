# Final Production Gate — P0 #1 Fix: Cart white-screen recovery (2026-08-22)

Fixes the one real code P0 from `.claudedocs/work/final-production-gate-audit/2026-08-22/summary.md`:
`/rk/cart` could go permanently blank with zero recovery UI on repeated tenant-config failures.
Scope, per Salman's explicit instruction: this exact gap only, no cart/order/checkout/WhatsApp
logic change, no backend/DB change, no change to the successful-load behavior, shared hook touched
only if it were the correct fix location.

## Root cause — confirmed by reading the real code, not assumed

`useTenantConfig()` (`frontend/src/hooks/useTenantConfig.js`) never returns `null` on a fetch
failure — after its own `retry: 2` (3 total attempts, exactly matching the "3 consecutive 503s"
observed live) it resolves to `isError ? { ...DEFAULT_CONFIG, slug } : (data ?? null)`, where `slug`
is the REAL tenant slug (not `DEFAULT_CONFIG`'s own `'unknown'`). `CartPage.jsx`'s own capability
guard —

```js
if (config && config.slug !== 'unknown' && !hasOrderCapability(config.active_services)) {
  return null
}
```

— was written to hide Cart for a tenant that genuinely has no order-bearing capability. But on a
real fetch failure, `config.slug` is now the real slug (not `'unknown'`) and
`config.active_services` is `DEFAULT_CONFIG`'s empty array — making "fetch genuinely failed" and
"genuinely no capability" indistinguishable to this guard. Both silently hit `return null`. The
hook itself was never the bug — it already exposed a real `error` value for exactly this case;
`CartPage.jsx` simply never read it before this fix. No shared-hook change was needed or made —
`GenericAdminDashboard.jsx` already consumes this same hook's `error` correctly (its own
`DashboardErrorState`), so the hook's contract was already sufficient once `CartPage.jsx` started
using it.

## Change

One file, `frontend/src/pages/generic/normal/CartPage.jsx`:

- New local `CartErrorState` component — same retry/error-screen **pattern**
  `GenericAdminDashboard.jsx`'s `DashboardErrorState` already established (a message + a button
  that calls `window.location.reload()`), styled for this file's own dark public-facing theme
  rather than cross-importing the admin-side component (`generic-admin/` and `generic/` stay
  separate presentation trees, per this codebase's own layering). Not a new retry mechanism —
  `useTenantConfig()`'s own `retry: 2` still does the actual retrying; this only renders once that
  is exhausted.
- `CartPage()` now destructures `error: configError` from `useTenantConfig()` (previously only
  `config` was read) and checks it in a new branch, placed before the existing capability guard:
  ```js
  if (configError) {
    return <CartErrorState accent={accent} message={configError} />
  }
  ```
  This resolves the ambiguity before the capability guard ever runs — a real failure now shows a
  real error+retry screen; a real success with genuinely no capability still correctly returns
  `null`, unchanged; a real success with capability renders normally, unchanged.

## Real verification — a deliberate, real backend outage, not a mock

Dev servers restarted multiple times across this pass; the backend was genuinely stopped
(`pkill -f "uvicorn app.main:app"`) and restarted (`nohup uvicorn app.main:app --port 8000 &`) to
reproduce the exact real trigger condition, confirmed via `curl` before/after each transition.

- **Backend down, fresh navigation to `/rk/cart`**: `document.getElementById('root').innerHTML.length`
  = **755** (non-zero — the original bug produced 0). Real visible text: "⚠ Request failed with
  status code 500" + a real, labeled "إعادة المحاولة" button. Console: exactly 3 real errors (the
  3 exhausted retry attempts against `/api/v1/public/rk/config`), matching `retry: 2`'s real
  behavior exactly.
- **Backend restarted, retry button clicked on the SAME still-open error page** (no navigation
  triggered): the page recovered in place into the real, working cart — 3 real items
  (سبراي تثبيت الشعر, شعر ودقن, شعر), real total (18 USD), full order form. Confirmed via
  `browser_find` locating the exact button and clicking it directly, not a page reload issued by
  the test itself. 0 new console errors after the click.
- **Normal successful path, post-recovery**: filled name/phone test values, confirmed the real
  order summary (items, total) and the "تأكيد الطلب" submit button's `disabled` attribute
  correctly disappearing only once both required fields were filled — unchanged behavior, not
  touched by this fix. Not clicked (no real order created).
- **mr-h regression check**: mr-h has no store capability at all, so `CartPage.jsx` is never
  reached on its real flow. Confirmed live: homepage → real booking CTA → `/mr-h/reserve` with
  real services/barber/calendar, 0 console errors — completely unaffected, as expected for a
  Store/Cart-only fix.
- **Console errors, whole pass**: 0 new errors anywhere except the deliberately-induced outage's
  own real, expected request failures (which are the condition being tested, not a regression).

## Acceptance — checked explicitly against every item in the instruction

- ✅ Reused the existing `DashboardErrorState` pattern (message + reload button), did not invent a
  second retry mechanism — `useTenantConfig()`'s own `retry: 2` still owns the actual retrying.
- ✅ Real, visible error state + retry button once retries are exhausted — confirmed live under a
  genuine backend outage, twice.
- ✅ Cart/order/checkout/WhatsApp logic (`handleSubmit`, `buildStoreWhatsAppMessage`, the restaurant
  branch) — byte-for-byte untouched, confirmed via diff.
- ✅ No backend, no DB change.
- ✅ Successful config load behavior — unchanged, confirmed via the post-recovery real-item/real-
  total/real-form-enable check.
- ✅ Fix scoped to `CartPage.jsx` alone — the shared hook was read, confirmed already correct, and
  deliberately not touched (would have been unnecessary risk to `GenericAdminDashboard.jsx` and
  every other consumer).
- ✅ Both tenants tested — rk (the real bug scenario) and mr-h (regression, Cart doesn't apply).
- ✅ 0 new DB writes — every real write this pass was either a pre-existing, already-persisted test
  cart from an earlier session (untouched, not created here) or explicitly not submitted (name/
  phone filled, final button never clicked).

## Result

**P0 #1: PASS.** See the separate Final Production Gate report for P0 #2's own status
(deployment-configuration, not a code fix — reported separately as UNVERIFIED).
