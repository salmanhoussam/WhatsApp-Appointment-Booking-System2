# RK Barber — Phase 4 Fix Verification (Admin Dashboard: Overview + Orders)

**Tenant:** `hr` — **Date:** 2026-07-28 — Follows `investigation-protocol.md`'s evidence discipline
and `CAPABILITY_RESOLUTION_PLAN.md`'s Phase 4 definition (rows #11, #12; #13 explicitly deferred —
see Scope Note).

## Fix

- **`frontend/src/pages/generic-admin/GenericAdminDashboard.jsx`** — stops passing its own
  `moduleKey` (one of the three duplicate derivations TOS-004 retires) into `OverviewTab`/
  `OrdersTab`. Passes the real, plural `activeServices` array instead (already computed one line
  above, previously only used to derive the single value). `GenericAdminDashboard.jsx`'s own
  `moduleKey`/`deriveModuleKey()` are otherwise untouched — still used for its own topbar badge and
  passed to other tabs — deletion is Phase 5's job, not this one's.
- **`frontend/src/pages/generic-admin/tabs/OverviewTab.jsx`** — now takes `activeServices` instead
  of `moduleKey`. Computes a local `orderEndpoint` (`hasCapability(activeServices,'restaurant') ?
  'restaurant' : hasCapability(activeServices,'store') ? 'store' : null`) and a plural `hasOrders =
  hasOrderCapability(activeServices)`, replacing the old `moduleKey === 'restaurant' || moduleKey
  === 'store'` check.
- **`frontend/src/pages/generic-admin/tabs/OrdersTab.jsx`** — same pattern: takes `activeServices`,
  computes its own local `orderEndpoint`, uses it for the orders fetch, the status-update PATCH, and
  `MODULE_STATUSES`/`TRANSITIONS` lookups. `StatusCell`/`MobileOrderCard` (the tab's own internal
  sub-components) keep their own `moduleKey` prop name unchanged — they describe which order type
  this one tab instance is currently displaying, a legitimate local concept once genuinely sourced
  from a real capability check, not the tenant-wide collapse this migration retires; only the value
  they receive changed (`orderEndpoint`, not the old externally-collapsed variable).

## Scope Note — #13 (`KanbanBoard.jsx`) explicitly deferred, not silently skipped

Per the Plan's own row #13, `KanbanBoard.jsx` is confirmed dead code (Acceptance Review Finding
#12 — zero real imports anywhere) and is not wired into any live route today. It was **not**
touched in this phase: fixing its hardcoded `if (moduleKey === 'catalog') return <"no orders">`
would be a code change with **no way to get a real screenshot verification**, since the component
never renders. Per this project's own End-to-End Verification Routine, a change that cannot be
proven with real visual evidence doesn't get claimed as "done" — it stays exactly as documented in
the Plan ("relevant if/when this component is ever wired back in"), left for whenever that happens.

## Evidence

Real headless-Chrome walkthrough, admin JWT, `hr`'s real dashboard (`hr`'s one real store order,
$42, confirmed already in the DB from earlier verification work):

1. **Overview tab** — real stat cards: "٢ طلبات اليوم" (2 today — this counts the store order plus
   a reservation, per `stats.todayCount`'s existing combined formula, unchanged by this phase),
   "٤٢ USD الإيرادات اليوم", "٢ معلّقة", "٠ مكتملة"; real revenue chart and status donut ("1
   إجمالي", "معلّقة 1"); real "الأكثر مبيعاً" (top-selling) with real product names/quantities;
   real "آخر الطلبات" (recent orders) showing the actual customer, actual $42.00, actual "معلّق"
   status.
2. **Orders tab** — real status pill counts ("معلّق(1)"), "1 طلب" total, and the real order row:
   customer name and phone, real date/time, status badge, total (`٤٢ USD`), item count (2).
   Screenshot confirms a clean, fully-populated table — not a skeleton, not an empty state.
3. **Network-level confirmation the fix itself is correct, independent of rendering timing** —
   captured via CDP's Network domain: every request fired was
   `GET /api/v1/admin/store/orders?client_slug=hr` (the correct, `orderEndpoint`-resolved URL,
   matching the topbar's own "STORE" badge) — confirming `activeServices` correctly reached both
   tabs and `hasCapability`/`hasOrderCapability` correctly resolved to `'store'`, not `null` and not
   a stale/wrong value.

## Side Finding — reproduced the already-documented Finding #11b, not a new regression

An earlier attempt in this same verification session showed both tabs briefly rendering "لا توجد
طلبات بعد" (no orders yet) / all-zero status counts despite the real order existing. Before treating
this as a Phase 4 regression, it was checked directly: the Network capture showed the correct
request (`/store/orders?client_slug=hr`) firing every time, consistently — the fetch call itself,
sourced from the new plural-capability logic, was never wrong. The delay was in the response
arriving/rendering, not in what was requested — a longer wait (~15s instead of ~4s) then showed the
correct, complete data. This is the same already-documented, already out-of-scope Finding #11b from
the Acceptance Review (a not-fully-root-caused, intermittent stuck-loading/latency pattern already
observed independently of any `moduleKey`-related code) — reproduced again here, not newly caused by
this phase's change, and not re-investigated further per the Plan's own explicit Non-Goal.

## Verdict

- [x] Root cause fixed at the correct layer for both real, live consumers (`OverviewTab.jsx`,
      `OrdersTab.jsx`) — sourced from the plural `activeServices`, not a tenant-wide collapsed value.
- [x] Real end-to-end verification: real stat cards, real charts, real order row, in both tabs.
- [x] Confirmed via Network-domain capture that the fix's own logic (request routing) is correct,
      separating that from the pre-existing, separately-tracked rendering-latency issue.
- [x] `KanbanBoard.jsx` (#13) explicitly deferred, not silently skipped — no real verification is
      possible for unwired dead code, so no claim is made about it.
- [x] Nothing deleted — all three duplicate `moduleKey` derivations remain exactly as they were,
      per the Plan's Phase-5-only deletion rule. `GenericAdminDashboard.jsx`'s own `moduleKey` and
      topbar badge are untouched.

## Related

- `.claudedocs/architecture/CAPABILITY_RESOLUTION_PLAN.md` — Phase 4's own definition, now complete
  for its two live consumers.
- `.claudedocs/reviews/rk-barber-acceptance-review-2026-07-28.md` — Finding #11a/#11b (the adjacent,
  separately-tracked rendering-latency issue reproduced here as a Side Finding, not fixed by this
  phase).
- `.claudedocs/adr/TOS-004-plural-capability-resolution.md` — the ratified decision this phase
  executes.
