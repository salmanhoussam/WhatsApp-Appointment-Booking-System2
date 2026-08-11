# Item #7/C — Employee ↔ Service two-panel UI — Evidence

Follows: `.claudedocs/implementation/DASHBOARD_UX_CORRECTIONS_CONTRACT.md`, Section C. G3/G4
defaults applied per Salman's explicit instruction (2026-08-11): panel **coexists** with the
existing edit-modal checklist (does not replace it); Service→Staff reverse direction **not** built
this pass.

## What Was Implemented

`frontend/src/pages/generic-admin/tabs/StaffTab.jsx` — a two-panel widget in the الموظفون
(Employees) sub-view, above the existing card grid: left column lists real employees, right column
shows the selected employee's real services as a checklist. Reuses the already-existing
`GET /barbers/{id}/services` / `PATCH /barbers/{id}/services` endpoints — no new backend surface.
Desktop: `200px | 1fr` grid. Mobile: single-column stack (employee pills row, then checklist below).
The existing edit-modal checklist is untouched.

## Real Verification (nested Playwright, real TENANT_ADMIN, fresh server restart)

**Desktop:** two-panel widget visible above the employee cards — left: حسين, جعفر; right: 6 real
services with checkboxes. Clicked جعفر → header updated, real `GET /barbers/{jaafar_id}/services`
fired (200 OK), checklist correctly showed all-unchecked (distinct from حسين's own state). Checked
"دقن" → real `PATCH /barbers/{jaafar_id}/services` (200 OK) + automatic refetch. **Hard page
reload** (not just a tab switch) confirmed real server-side persistence: after reload, جعفر's "دقن"
was still checked. Employee-card grid below still rendered normally; opened جعفر's تعديل modal —
its own checklist correctly showed "دقن" pre-selected too, matching the panel — modal and panel
coexist without conflict, confirming the G3 default.

**Mobile (390×844):** panel stacks single-column, no horizontal overflow (`scrollWidth` 375 <
`innerWidth` 390). Tapped جعفر → checklist correctly showed persisted "دقن" state. Fully functional.

## Acceptance

✅ Ships clean — real persistence proven via a hard reload (not just local state), desktop + mobile
confirmed, existing edit-modal checklist unaffected.
