# Homepage Phase 2.1 — Section `enabled`/`reorder` — Evidence

Contract: `.claudedocs/architecture/ALZABT_MISTER_H_HOMEPAGE_PHASE2_IMPLEMENTATION_CONTRACT.md`,
Phase 2.1. §5.1-5.3 resolved by Salman 2026-08-18 (recorded in the Contract itself); this evidence
covers Phase 2.1 only — the `enabled`/`reorder` data-model work, explicitly scoped as "no redesign,
no new media" per Salman's own instruction.

## What changed

- `app/repositories/content_sections_repo.py` — `set_section_enabled()`, `reorder_sections()`,
  same read-merge-write mechanic already established in this file.
- `app/services/content_service.py` — thin wrappers, same pattern as existing functions.
- `app/api/v1/admin/content.py` — `PATCH /admin/content/sections/{type}/enabled`,
  `PATCH /admin/content/sections/reorder`, same dependency chain (`get_current_tenant` +
  `require_roles("SUPER_ADMIN", "TENANT_ADMIN")`) as every other route in this file.
- `frontend/src/pages/generic/normal/DynamicPage.jsx` — `sections` filter gains
  `&& s.enabled !== false` (default true when absent).

## Live verification

| Check | Result |
|---|---|
| Backend restarts clean, no import errors | `uvicorn` restarted, `/docs` returns 200, startup log shows 0 errors |
| `PATCH .../staff/enabled {enabled:false}` on real Mister H admin (`admin@ali-barber.local`, real JWT via `/auth/users/login`) | `{"success":true}` |
| Public config (`GET /api/v1/public/mister-h/config`) reflects it | `staff` section: `enabled: false`, confirmed via direct read immediately after |
| Real browser check — staff section actually gone from render | Navigated to `localhost:5173/mister-h/home`: `document.querySelectorAll('[id]')` shows `s_hero, s_story, s_gallery, s_featured, s_hours, s_location, s_cta` — **`s_staff` absent**. `document.body.innerText.includes('فريقنا')` (the section's real heading) → `false`. Full-page screenshot confirms the visual flow skips directly from Story to Gallery. 0 console errors. |
| Round-trip: re-enable | `PATCH .../staff/enabled {enabled:true}` → public config shows `enabled: true` → browser re-check: `hasStaffText` → `true` again, 0 console errors |
| `PATCH .../reorder` round-trip | Swapped `staff`(2)/`gallery`(3) → public config confirmed `staff: order=3, gallery: order=2` → reverted to original sequence → confirmed `order` values match the pre-test baseline exactly (`hero:0, story:1, staff:2, gallery:3, featured_items:4, hours:5, location:6, cta:7`) |
| RK regression check (real browser, not just curl) | `localhost:5173/rk/home`: all 10 of RK's real sections present (`s_hero, s_story, s_video_story_1, s_gallery, s_featured, s_video_story_2, s_testimonials, s_hours, s_location, s_cta`), 0 console errors. RK's public config confirmed via curl: no tenant section carries an `enabled` field — this change is additive-only, RK was never touched |
| Python syntax | `ast.parse()` clean on all 3 changed backend files |

## Known, harmless residual

Mister H's `staff` section now carries `enabled: true` explicitly (was `<absent>` before this
test). Functionally identical (`!== false` is true either way, section renders) — not reverted
further since doing so would require a field-removal function outside Phase 2.1's scope. Same
category of harmless residual already accepted in Phase 1's evidence (`media-content-foundation/
2026-08-18/evidence.md`).

## Data impact

Real writes to Mister H only (`enabled`/`order` fields on its own `content.sections[]`), all
reverted to the tested target state by the end of this verification. Zero writes to RK or any other
tenant, confirmed live.
