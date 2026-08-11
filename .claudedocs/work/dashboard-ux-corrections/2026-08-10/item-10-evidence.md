# Item #10 — Store order-status chevron affordance — Evidence

Follows: `.claudedocs/implementation/DASHBOARD_UX_CORRECTIONS_CONTRACT.md`, Section B.10.

## What Was Implemented

`frontend/src/pages/generic-admin/tabs/OrdersTab.jsx` — `StatusBadge` now renders a small inline
chevron-down SVG next to the label whenever `clickable` is true. Purely visual — the click handler
and transition-validation logic were already fully working and are unchanged.

## Real Verification (nested Playwright, real TENANT_ADMIN)

Store → الطلبات (Orders) had **0 real orders** at verification time ("0 طلب", every status filter
count 0) — confirmed on both desktop (1440×900) and mobile (390×844), no layout overflow on the
empty state. **Cannot visually verify the chevron on a real row — no orders exist to check against.**
Not fabricated; reported as an honest gap, not rounded up to "verified."

## Acceptance

Code change is correct by inspection (pure additive JSX + inline SVG, zero logic touched) and the
full regression pass (see item-11 evidence) confirmed zero new console/network errors on the Store
tab. Visual confirmation against a real order row remains open — should be checked the next time a
real Store order exists for `rk`, or ahead of the Ali onboarding rollout.
