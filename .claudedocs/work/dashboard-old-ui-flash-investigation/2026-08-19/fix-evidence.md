# Fix — Dashboard Loading Race (Old-UI Flash) — Evidence (2026-08-19)

Follows `summary.md` (the investigation) and Salman's explicit decision to fix this before Phase 2
of the Tenant OS Section Editor. Constraints given, all honored:

- `GenericAdminDashboard.jsx` only — confirmed, the only file touched.
- No route/schema/Section Editor change.
- No data change.
- **Fallback data values unchanged** — `{name_ar:'لوحة التحكم', primary_color:'#6366f1'}` and
  `useTenantConfig.js`'s `DEFAULT_CONFIG` are both byte-identical to before; only *whether the
  shell renders with them silently* changed.
- No dashboard redesign — the fix is a widened boolean condition plus one small, new error-state
  component reusing the exact same full-screen layout `FullScreenSpinner` already used.
- Independent commit: `fix(dashboard): gate shell until tenant config is resolved`.

## Code change

`frontend/src/pages/generic-admin/GenericAdminDashboard.jsx`:
- `useTenantConfig()` now also destructures `isLoading: configLoading` and `error: configError`
  (both already returned by the hook, previously unused here).
- New `settingsError` state, set alongside (not instead of) the existing `/settings` fetch's
  `.catch()` fallback.
- New `DashboardErrorState` component — same full-screen layout as `FullScreenSpinner`, a message
  + real "إعادة المحاولة" (retry, via `window.location.reload()`) button.
- The render gate: `if (loading || configLoading) return <FullScreenSpinner />` (was `loading`
  alone), then `if (settingsError || configError) return <DashboardErrorState .../>` before the
  real shell renders.

## Real Acceptance Test — both tenants, real browser, real evidence

**mr-h, normal connection**: real login, real navigation to `/mr-h/dashboard/settings` — full,
correct nav (`نظرة عامة/التقويم/الحجوزات/الموظفون/المتجر/العملاء/الإشعارات/الإعدادات`) and real
branding ("صالون مستر إتش") rendered directly. 0 console errors.

**mr-h, the actual race condition (config slower than settings)** — real `page.route()` delay of
exactly `GET /api/v1/public/mr-h/config` by 3000ms (confirmed via a real request-hit log the
delayed route actually intercepted, not assumed): sampled `document.body.innerText` every 400ms
for the full 3.2s window — **empty (spinner) at every single sample**, never once showing the
short/wrong nav. Once the delayed request resolved, the page went **directly** to the full, correct
shell — confirming the fix's core claim: the shell no longer renders until both real sources are
ready.

**mr-h, `/admin/settings` failing (real `500`, confirmed via request-hit log)**: after both sources
settled, `document.body.innerText` read **exactly** `"تعذّر تحميل بيانات المتجر\nإعادة المحاولة"`
— the new `DashboardErrorState`, not a stuck spinner, not the shell rendered on fake data.

**mr-h, tenant-config failing (real `500`, confirmed via 3 real request hits — the initial attempt
plus `useTenantConfig`'s own existing `retry: 2`, unchanged)**: `document.body.innerText` read
`"Request failed with status code 500\nإعادة المحاولة"` — the same `DashboardErrorState`, this time
carrying the real `configError` message. Confirms both failure paths (`settingsError`,
`configError`) independently reach the new error state, not just one.

**rk, the same race condition, same test**: real `page.route()` delay of `GET /api/v1/public/rk/config`
by 3000ms, confirmed via a real request-hit log — sampled every 400ms, empty (spinner) at every
sample, then jumped directly to the full, correct shell with real "RK Barber Shop" branding on
resolution. **Identical behavior to mr-h, same code, zero tenant-specific branching** — the fix is
real for the whole Tenant OS, not `mr-h`-specific.

## Acceptance criteria, checked explicitly

- ✅ Never saw the short/incomplete nav (`نظرة عامة/الطلبات/الكتالوج/الإعدادات`) before the system
  knew the tenant's real capabilities — confirmed via dense 400ms sampling through the exact
  real-world race condition that used to produce it.
- ✅ Spinner does not hang forever on a real failure — both `settingsError` and `configError`
  independently produce a real, visible error state with a retry action.
- ✅ Tested on both `mr-h` and `rk`.
- ✅ Tested under a real simulated slow condition (route-delayed responses — a more precise
  isolation of the actual race than blanket network throttling, since it controls exactly which of
  the two async sources is slow).
- ✅ Tested a real simulated failure of both `/admin/settings` and tenant-config independently.

## Result

Fix verified working exactly as specified, on both real tenants, under the real race condition and
both real failure modes. No regression to normal-path loading. Ready to commit as its own,
independent change per Salman's own requested message.
