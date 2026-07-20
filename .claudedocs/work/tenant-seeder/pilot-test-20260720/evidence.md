# Evidence — tenant-seeder / pilot-test-20260720

**First real execution of tenant-seeder's Service Contract.** Demo Flow, synthetic test fixture
input (`scripts/data/pilot-test-20260720.json`), dev environment. All values below are real —
captured from actual HTTP responses, not summarized or assumed.

## Pre-flight correction found during setup

Backend was not running; started `uvicorn app.main:app --port 8000`. **The Contract's own "Base
URL" section said `8080` — verified wrong** against three independent real sources (`.env`
`PORT=8000`, `start_dev.sh`'s default, `frontend/src/utils/publicApi.js`'s hardcoded `:8000`).
Fixed in `.claude/agent/tenant-seeder.md` before proceeding — this is exactly the kind of error
a real run exists to catch.

## Step 1 — Parse JSON + registry lookup

- `template_key`: `food-restaurant` — confirmed real in `frontend/src/config/template-registry.js:115`
- `module_key`: `restaurant` (from registry, not guessed)
- `services[]`: `["restaurant", "reservations"]` (from registry)
- Schema source used: `.claude/skills/seeding/demo/01-parse-tenant-json.md` (the real, currently-enforced
  v2.1 validator) — not either of the two stale reference files found during Contract review
  (logged as tech debt in `todo_list.md`)

## Step 2 — Register + JWT

`POST http://localhost:8000/api/v1/auth/register`

- First attempt: **HTTP 422** — `owner.email` used the `.invalid` TLD (RFC 2606 reserved),
  rejected by pydantic's `email-validator`. Corrected to `pilot-test-20260720@salmansaas-pilot-fixture.com`.
- Second attempt: **HTTP 200**
- Response: `client_id` embedded in JWT `e15b204d-3bbd-44ef-b532-4abcea7d8d6f`, `slug: pilot-test-20260720`,
  `role: TENANT_ADMIN`, `status: trial`, `trial_ends_at: 2026-08-03T12:52:39.017673+00:00`,
  `dashboard_url: https://salmansaas.com/pilot-test-20260720/dashboard`

## Step 3 — Apply design settings

`PATCH http://localhost:8000/api/v1/admin/settings`

- **HTTP 200**
- Response: `{"success":true,"updated_fields":["primary_color","pageType","templateKey","whatsapp_number"]}`

## Step 4 — Seed catalog

`POST http://localhost:8000/api/v1/admin/catalog/seed-from-template`

- **HTTP 201**
- Response: `created_count: 5`, real category UUIDs:
  - `f5e670aa-c603-4833-a30d-37e9cf1bc9e9` — مقبلات / Starters
  - `6d9a5827-d7ee-4869-8305-7efe34454f8e` — أطباق رئيسية / Main Dishes
  - `6518caa8-e122-46bd-b06a-2e1bb259db66` — مشاوي / Grills
  - `0af296e9-8ec3-4e33-94ec-527b627313af` — حلويات / Desserts
  - `dcaa23bb-a273-469e-9a87-0ea073632e64` — مشروبات / Beverages

## Step 4.5 — Tenant data files

- `scripts/data/pilot-test-20260720/settings.json` — created (`_meta` wrapper, matches `smar`'s
  real shape)
- `scripts/data/pilot-test-20260720/page_content.json` — copied from `page_templates/restaurant.json`
- `python scripts/seed_page_content.py pilot-test-20260720` — real stdout:
  `✅ pilot-test-20260720: seeded 8 sections (template: restaurant)` / `Done — 1/1 tenants seeded`

## Step 5 — Frontend route

**Real finding, not previously documented**: this generic/template-based tenant needs no custom
`{slug}.routes.jsx`. Read `frontend/src/router/DynamicTenantResolver.jsx` directly — since
`pilot-test-20260720` is absent from `tenantRegistry`, `/demo/pilot-test-20260720` correctly
falls through to `DynamicPage` (sections-driven) automatically. The Contract's Step 5 branch
("create routes file from `_template.routes.jsx`") applies only to custom-built tenants like
`beit-al-fakhar`, not this kind — worth clarifying in the Contract on the next pass.

## Step 6 — Verify + deliver

- `GET http://localhost:8000/api/v1/public/pilot-test-20260720/config` — **HTTP 200**, real body
  confirms: `name_ar`/`name_en` match Step 2 exactly, `primary_color: #D4A017`, all 8 sections
  from Step 4.5 present (hero/offers/categories_grid/featured_items/gallery/testimonials/hours/cta),
  `active_services: ["restaurant","reservations","catalog"]` (catalog correctly auto-included per
  `registration_service.py`'s `_SERVICE_SEED_MAP`), `template_key: food-restaurant`
- `GET http://localhost:8000/api/v1/public/catalog/categories?client_slug=pilot-test-20260720` —
  **HTTP 200**, all 5 real categories returned, UUIDs match Step 4 exactly
- `GET http://localhost:5173/demo/pilot-test-20260720` — **HTTP 200** (frontend, real dev server)

## Deliverable

```
✅ Tenant Seeded Successfully — FIRST REAL RUN

Slug:          pilot-test-20260720
Template:      food-restaurant
Module Key:    restaurant
Services:      restaurant, reservations, catalog
Categories:    5

🔗 Demo:       http://localhost:5173/demo/pilot-test-20260720
🔐 Dashboard:  https://salmansaas.com/pilot-test-20260720/dashboard
📧 Email:      pilot-test-20260720@salmansaas-pilot-fixture.com
🔑 Password:   PilotTest2026

Status: DEMO_LIVE — synthetic test fixture, not a real business, Production not applicable
```

## Contract corrections this run produced (Constitution Principle 1: real state over memory)

1. Base URL `8080` → `8000` (fixed in `tenant-seeder.md` before Step 2)
2. Context Investigation's schema source corrected earlier this session (before this run) to
   point at `01-parse-tenant-json.md`, not the two stale reference files
3. Step 5's scope clarified: doesn't apply to generic/template-based tenants (folded into
   `tenant-seeder.md` the same day)

## Second pass — Frontend Architect handoff, 2026-07-20 (same day, per Salman's strategic update)

Real gap found by diffing this tenant's own seeded `page_content.json` against
`frontend/src/pages/generic/normal/DynamicPage.jsx`'s `SECTION_MAP`: 3 of the 8 real section
types this tenant was seeded with (`offers`, `testimonials`, `hours`) had **no matching renderer
anywhere in the codebase** — `SECTION_MAP[type]` resolves `undefined`, `DynamicPage` silently
`return null`s for that section. No error, no console warning — confirmed by reading the actual
component files under `frontend/src/components/dynamic-sections/` (only 7 existed:
Hero/Story/FeaturedItems/CategoriesGrid/Gallery/Location/Cta — none for the other 3 despite them
being real, live section types produced by `page_templates/restaurant.json`, the same template
every future `food-restaurant` tenant seeds from).

Fixed:
- Built `OffersSection.jsx`, `TestimonialsSection.jsx`, `HoursSection.jsx` — same inline-style/
  Cairo/RTL/spring-animation pattern as the 7 existing sections (no new dependencies, no design
  tokens import — matches `CtaSection.jsx`/`GallerySection.jsx`'s established local style, not
  `design-system/tokens.js`, since that's what the rest of `dynamic-sections/` already does).
- Registered all 3 in `dynamic-sections/index.js` and `DynamicPage.jsx`'s `SECTION_MAP`.
- Re-fetched `GET /api/v1/public/pilot-test-20260720/config` — confirmed real: all 8 section
  types present, all 8 now have a matching component.
- Separately found the `cta` section's `link` field was `""` (a leftover template placeholder)
  — `CtaSection.jsx` only renders its button when `data.link` is truthy, so the button was
  silently absent, not broken. Fixed to `https://wa.me/10000000000` (the fixture's own synthetic
  WhatsApp number from `pilot-test-20260720.json`'s `owner.whatsapp`), re-seeded via
  `seed_page_content.py`, confirmed live via a fresh `GET /config` (`cta.data.link` now present).
- Added a permanent "Frontend Handoff Checklist" to `tenant-seeder.md`'s Service Contract
  (Dependencies section) so this check — diff seeded section types against `SECTION_MAP` — runs
  once per template, not something a future run has to rediscover from scratch.

Environment note: `seed_page_content.py`'s Prisma client (connects via `DIRECT_URL`, port 5432)
failed to connect on the first 2 attempts (`P1001`), succeeded on the 3rd — the same transient
Supabase cold-start pattern already documented repeatedly this session; not a real connectivity
problem, no code change needed.
