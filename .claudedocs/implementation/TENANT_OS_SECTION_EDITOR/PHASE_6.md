# Tenant OS Section Editor — Phase 6 (Remove Legacy Settings) — Narrowed, Evidence (2026-08-20)

Closes Phase 6 **as originally scoped** in
`.claudedocs/architecture/ALZABT_CMS_SECTION_EDITOR_IMPLEMENTATION_PLAN.md` §11 ("remove
`page_type`/`catalog_layout`/`font` controls"). That scope is **not executed** — Salman's explicit
decision, following a real pre-removal audit
(`.claudedocs/work/legacy-page-settings-audit/2026-08-20/summary.md`) that found `page_type` and
`catalog_layout` are real, load-bearing, currently-live infrastructure, not dead legacy code.

## Decision (Salman, 2026-08-20)

- **`font`**: removed. Confirmed genuinely dead — zero real consumers anywhere in the codebase.
- **`page_type`/`catalog_layout`**: kept, **intentionally**. They belong to a separate,
  still-live rendering system — the auto-onboarded/Demo application path
  (`DynamicTenantResolver.jsx` → `DynamicPage.jsx`'s `DefaultFallback` for `page_type`;
  `DemoCatalogPage.jsx`/`DemoPublicPage.jsx` for `catalog_layout`) — which is a genuinely separate
  architectural track (the Menu/Restaurant/Store application foundation) from the Tenant OS Section
  Editor this whole 6-phase effort concerns. A real, currently-live tenant (`assi`) depends on
  `page_type` today, verified in a real browser during the audit.
- **No refactor or rebuild of the Demo/Menu/Restaurant/Store application systems** — explicitly out
  of scope for this decision. This closes only the removal question for these two fields; it does
  not open a new work item to touch that separate track.

## Code changes

`frontend/src/pages/generic-admin/tabs/SettingsTab.jsx` only:
- Removed the `FONT_OPTS` constant.
- Removed `font` from the initial `form` state (was `existingConfig.font ?? 'Cairo'`).
- Removed `font: form.font` from the save `PATCH` payload's `config` object — `...existingConfig`
  alone now carries whatever `font` value already exists forward unchanged, never overwritten from
  a form with no UI to set it (same "unwritten from the UI, no column removal implied" behavior
  the original Phase 6 spec always intended).
- Removed the "الخط" `<Field>` block (the visible Cairo/Tajawal/Inter picker) from the Design &
  Appearance card.
- Added an inline comment on `page_type`/`catalog_layout`'s initial-state lines explaining why they
  remain, pointing at the audit evidence file.

`page_type`/`catalog_layout`'s own controls, state, and save logic are **completely untouched** —
confirmed via diff (only the lines listed above changed).

## Real verification — both tenants, real browser + real API

- **mr-h, rk**: `/​{slug}/dashboard/settings` — confirmed "الخط" label/control is gone;
  "نمط الصفحة الرئيسية" (page_type) and "عرض الكتالوج" (catalog_layout) controls both still
  present and functioning, unchanged. 0 console errors on both.
- **Real save, both tenants**: clicked "حفظ الإعدادات" on both `mr-h` (had no prior `font` value)
  and `rk` (had a real, non-default `font: "Cairo"`). Both saves succeeded (real "تم الحفظ" /
  success toast), 0 console errors.
- **Real data-preservation proof** (the decisive check): `GET /admin/settings` for `rk` — the exact
  same endpoint `SettingsTab.jsx` itself reads on load — confirmed **after** the save:
  `config.font: "Cairo"` and `config.catalog_layout: "grid"` both **unchanged**, `page_type:
  "normal"` unchanged, and `content.sections` (including the real `products` section from Track B)
  intact. Removing the UI control did not wipe or corrupt the existing stored value.
- **Public homepage, both tenants**: re-verified after the change — `rk` still shows exactly 7 real
  "احجز الآن" buttons (Track B's Services-only fix unaffected), `mr-h` unchanged, 0 console errors
  on both (one transient real `503` hit mid-verification on `rk`, traced to the same
  long-documented Supabase pooler flakiness this project has hit repeatedly — confirmed
  self-resolved on retry, unrelated to this change).

## Acceptance, checked explicitly

- ✅ `font` control removed from the Dashboard.
- ✅ `page_type`/`catalog_layout` controls and their real, live behavior completely untouched.
- ✅ No existing tenant data wiped — proven via a real before/after `GET /admin/settings` check on
  a tenant (`rk`) with a real, non-default `font` value already set.
- ✅ Real homepage render for `mr-h`/`rk` unchanged before/after — matches the original Phase 6
  acceptance test's own wording, satisfied for the narrowed scope.
- ✅ No refactor of the Demo/Menu/Restaurant/Store application systems — confirmed via diff, only
  `SettingsTab.jsx` touched.

## Result

**Tenant OS Section Editor Phase 6: CLOSED, narrowed to `font` only.** The original, broader scope
("remove `page_type`/`catalog_layout`/`font`") is explicitly not executed — `page_type`/
`catalog_layout` remain, documented here and in the audit evidence file as an intentional,
evidence-based decision, not an oversight. This closes the Tenant OS Section Editor's own 6-phase
structure. The Menu/Restaurant/Store (Demo/auto-onboarding) application foundation remains a
separate, real, still-live architectural track — untouched, not opened by this decision.
