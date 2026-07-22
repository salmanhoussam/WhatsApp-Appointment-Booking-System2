# Tenant OS — Sprint 1 Evidence

Follows: `.claudedocs/architecture/TENANT_OS_IMPLEMENTATION_REVIEW.md` §8 (Sprint 1 Plan) and §1a
(Decisions Ratified), per the Service Execution Constitution's "every execution leaves evidence"
principle. Content Capability, Hero Title field only — real code, real verification, no mocks.

## What was built

**Backend**
- `app/services/content_service.py` (new) — Content Capability's own canonical Service
  (`update_hero_title`, `get_hero_title`), reading/writing `Client.config.content.sections[]`
  through `admin_client_repo` (never `prisma_client` directly).
- `app/api/v1/admin/content.py` (new) — `GET`/`PATCH /content/hero-title`, registered in
  `app/api/v1/admin/__init__.py`. A direct function call to `content_service`, not a generic
  Dispatcher, per the review's corrected Q7 answer.

**Frontend**
- `frontend/src/tenant-os/discovery.js` (new) — the Discovery registry.
- `frontend/src/tenant-os/EditableRegion.jsx` (new) — the pure Contract wrapper. Renders identically
  for a visitor and an editor; carries `data-capability`/`data-field-key` attributes only.
- `frontend/src/tenant-os/schemas/content.js` (new) — Content Capability's Schema (`hero.title`).
- `frontend/src/components/dynamic-sections/HeroSection.jsx` — wrapped the real title `<motion.h1>`
  in `EditableRegion`. No other change to this file.
- `frontend/src/pages/generic/normal/DynamicPage.jsx` — added an iframe-only click-capture effect
  (`window.self !== window.top` gate) that reports `{capability, key}` to the parent via
  `postMessage`. Never active for a real visitor.
- `frontend/src/pages/generic-admin/GenericAdminDashboard.jsx` — added a `TENANT_OS_FIELD_CLICK`
  listener scoped explicitly to `content`/`hero.title` (Sprint 1's one case, not a generic handler);
  calls the real PATCH endpoint, then pushes the updated config back into the already-real Settings
  iframe via the existing `PREVIEW_UPDATE` bridge.

## A real deviation from the Sprint 1 Plan, and why

The plan (`TENANT_OS_IMPLEMENTATION_REVIEW.md` §8) said to fix Content's Broken-Architecture finding
by rerouting `settings.py` to call `client_service.py`. Reading `client_service.py` before touching
it found this wasn't actually viable as written: its `update_client(client_id, data: ClientUpdate)`
takes a `ClientUpdate` Pydantic schema covering only `name`/`slug`/`phone`/`email`/`password` —
it was never built to accept `config`/branding fields at all. Rerouting `settings.py` through it
for Content's purposes would have required widening that schema, risking `client_service.py`'s
actual (narrow, real) purpose.

Given the ratified decision that Content is its own Capability (§1a), and Design Principle 5 ("One
Capability. One Service."), the correct fix was a new, dedicated `content_service.py` — Content's
own canonical Service — rather than overloading `client_service.py`'s existing narrow contract.
`client_service.py` itself, and `settings.py`'s broader Broken-Architecture finding (its other
fields — name, WhatsApp, currency, etc.), are untouched; that remains real, separate, deferred work
for whenever Site Configuration's own Capability is built.

## Real verification (CDP, no mocks)

Test tenant: `pilot-test-20260720` — the one real DB tenant confirmed **not** in
`frontend/src/router/tenants/index.js`'s registry, with real seeded `config.content.sections`
(8 sections). This mattered: `caracas`/`footlab`/`olivello` were assumed usable test tenants going
into Sprint 1, but are all registry tenants with their own bespoke custom pages —
`DynamicTenantResolver.jsx` redirects `/demo/{slug}` away from `DynamicPage.jsx` for every one of
them (`if (slug && tenantRegistry[slug]) return <Navigate to .../>`). None of the three
"section-driven" tenants this session's earlier investigation assumed were live examples of
`DynamicPage.jsx` actually still are — a real finding worth carrying forward, not previously known.

Real sequence, captured via headless Chrome + raw CDP (no Playwright/Puppeteer):

1. Logged in as `pilot-test-20260720`'s real `TENANT_ADMIN` (password reset for dev-testing
   purposes, matching this session's established, explicitly-sanctioned pattern).
2. Loaded the real Dashboard, opened the Settings tab — the real `<iframe src="/demo/{slug}">`
   rendered the real `DynamicPage.jsx`, and the real Hero title ("أهلاً وسهلاً بكم") rendered
   correctly wrapped in the new `EditableRegion` (`data-field-key="hero.title"` present and
   correct — confirmed by direct DOM query into the same-origin iframe's `contentDocument`).
3. Dispatched a real, physical mouse click (`Input.dispatchMouseEvent`) at the real title's
   on-screen coordinates (first attempt failed — `EditableRegion`'s `display:contents` wrapper
   returns an all-zero `getBoundingClientRect()`; fixed the test to measure the wrapper's real
   child element instead, a genuine bug in the test script, not the component).
4. The click fired the `TENANT_OS_FIELD_CLICK` → `window.prompt()` → real `PATCH
   /api/v1/admin/content/hero-title` sequence exactly as designed. Confirmed via the real uvicorn
   log: `PATCH .../content/hero-title HTTP/1.1" 200 OK`.
5. Confirmed directly against the DB: `Client.config.content.sections[hero].data.title_ar` held
   the new value, with every other hero field (`subtitle_ar`, `cta_text_ar`, `bg_image_url`,
   `bg_type`) untouched.
6. **First live-update attempt failed** — the iframe kept showing the old title. Root cause, found
   by reading `DynamicPage.jsx`'s existing `PREVIEW_UPDATE` handler rather than guessing: it does
   `Object.assign(patch, e.data.config)`, meaning `e.data.config`'s own keys land on `tenantConfig`'s
   top level, not nested under `tenantConfig.config`. Sending the reconstructed `Client.config`
   object directly as `e.data.config` scattered its keys (`content`, etc.) onto the wrong level.
   Fixed by sending `{ config: updatedConfig }` as the message's `config` field — real bug, found
   and fixed via reading the existing code, not assumed to be a "framework limitation."
7. **Second attempt, confirmed working**: real click → real dialog → real PATCH (200 OK) → the
   iframe's Hero title updated live, **within ~3 seconds, with no page reload**, to the new value.
8. Queried the real, public, unauthenticated `GET /api/v1/public/pilot-test-20260720/config`
   endpoint directly (the exact endpoint any real visitor's page load calls) — confirmed it returns
   the new title, proving the edit reached the real production read path, not just the dashboard's
   own state.

## Success Criteria — checked against `TENANT_OS_IMPLEMENTATION_REVIEW.md`'s own bar

1. ✅ Real admin sees the real Hero Title inline and editable on the real rendered page.
2. ✅ Editing and saving calls the real route → real Service → real `Client.config.content` write.
3. ✅ The real public config endpoint (what any visitor's page load uses) reflects the new title.
4. ⚠️ Partially — Content's own Broken-Architecture path is now clean (a real canonical Service,
   reached through a repository, not Prisma directly). `settings.py`'s *other* fields and
   `client_service.py`'s original narrow purpose were correctly left untouched, per the deviation
   above — that closes a *different*, still-open piece of §19's Site Configuration finding, not
   claimed as closed here.
5. Left to the reader: this document plus `TENANT_OS_IMPLEMENTATION_REVIEW.md` should answer what
   Capability was built, what "done" means for it this sprint, and why AI/Mobile/Draft-Publish/
   Versioning aren't part of it yet (§8's explicit exclusions — none were started).

## Explicitly not done

`CanvasPageEditor.jsx`/`PageBuilderTab.jsx` deletion — deferred, per the plan, until the new path
is proven (this evidence is that proof, but the deletion itself is a separate, future commit).
No second field, no second Capability, no Draft/Publish staging, no AI/Mobile/API Interface. The
`window.prompt()` interaction is a deliberately minimal placeholder for a real inline input — Sprint
1 proves the architecture works, not the final editing UX.
