# Project Todo List — SalmanSaaS
# Last updated: 2026-08-12

## 🎯 STANDING TOP PRIORITY: عالزبط (Alzabt) — the product launching 2026-08-31

Alzabt IS the product (RK is the reference tenant, not a separate project). Master reference:
`.claudedocs/implementation/ALZABT_MASTER_PRODUCT_PLAN.md` (Revision 2, all decisions resolved).
Section K Steps 1-9 are DONE, committed, real-browser verified — do not redo them. Full state saved
in memory (`project_alzabt_master_plan_priority.md`) — read that first on any resume. Barber-first;
Clinic is next (gated on a real onboarding fix, see the plan's Section K step 9 finding); Real
Estate deferred. **Step 13 (LIVE) is explicitly not executed — requires Salman's fresh, explicit
approval, never autonomous.**

### ✅ Checkpoint — 2026-08-12, commit `ff38f89`: salmansaas.com Product IA + Alzabt Demo Builder

**Done, do not reopen for polish:**
- Root `/` = Product Showcase Home (`frontend/src/pages/home/ProductShowcaseHome.jsx`) — Smart
  Order "قريباً" placeholder (top) + real Alzabt section (below).
- `/alzabt` (marketing page) + `demo.salmansaas.com/alzabt` (subdomain route) — UNCHANGED, still
  point at the static `alzabt-demo` reference tenant.
- Alzabt Demo Builder (`/demo-builder`, reachable only from root's Alzabt CTA) — real per-visitor
  tenant provisioning: real `Barber` (personalized name), 6 real `CatalogService` rows,
  `booking`+`reservations` activated, correct `/{slug}/dashboard` admin URL, 14-day trial
  lifecycle. `name_en` optional with a `demo-barber-{4hex}` slug fallback. Full real-browser
  verification, 0 console errors end-to-end. Evidence:
  `.claudedocs/work/alzabt-demo-builder/2026-08-12/summary.md`.

**Do not touch right now:**
- RK (real production tenant) — no fake bookings, no data changes.
- The static `alzabt-demo` tenant — stays as-is, reference only.
- Clinic / Real Estate scope — Barber-only priority stands.
- Two named, deliberately-deferred gaps — do NOT fix opportunistically just because they're known:
  (1) no cron consumes `trial_ends_at` yet (pre-existing, shared by every demo/trial tenant type);
  (2) a fresh tenant's `/reserve` page can flash "no available times" before its first data fetch
  resolves (pre-existing UX timing gap, not a bug, no console error).
- **Step 13 (LIVE) / any Railway or production deploy** — stays fully stopped. Everything
  continues on localhost until Salman gives fresh, explicit approval to go further.

**Next step, agreed 2026-08-12**: a comprehensive LOCAL-ONLY readiness check across all 3 real
paths (RK / alzabt-demo / demo-builder-created tenants) before any LIVE decision — not opportunistic
gap-fixing. See the ready-to-use `/bo-hussein` checkpoint prompt in that day's chat transcript for
the exact scope (Done / Do Not Touch / Must Check Before LIVE) — not yet executed, awaiting
Salman's go-ahead to run it.

## 🎯 PRODUCTION DEADLINE: 2026-08-31 — RK + Ali both live

Phase 3.5's three-sided Product Review (Customer/Admin/Staff) is ✅ DONE. Salman ratified the final
execution order for everything found — see `.claudedocs/architecture/RESERVATION_PRODUCTION_ROADMAP.md`'s
"Execution Order — ratified 2026-08-10" section for the full rationale:

```
1. ✅ Availability reliability -- DONE 2026-08-10, 10/10 load-test success post-fix
2. 🟡 Production Data Hygiene -- 42 confirmed-safe rows deleted 2026-08-10, verified clean
        (exact IDs/counts: .claudedocs/work/production-data-hygiene/2026-08-10/deletion-review.md).
        7 reservations deliberately left untouched -- NOT an internal task, blocked on external
        confirmation from RK/the real shop owner on two specific questions (see below).
3. ✅ STAFF /admin/barbers/ roster scoping -- DONE 2026-08-10, real-account tests + browser
        regression both clean (.claudedocs/work/staff-barbers-roster-scoping/2026-08-10/evidence.md)
4. ✅ Overview UX improvements -- DONE 2026-08-10. Reclassified 🔴→🟡 first (fresh evidence showed
        3 of 5 original reasons no longer reproduced post-cleanup) -- small named contract, not a
        redesign (.claudedocs/implementation/OVERVIEW_UX_IMPROVEMENTS_CONTRACT.md)
5. 🟡 Calendar/Reservations/Staff/Store polish -- APPROVED 2026-08-10, MOSTLY DONE 2026-08-12
        Plan: `.claudedocs/implementation/DASHBOARD_UX_CORRECTIONS_CONTRACT.md`. Items #4/#9/#10/#3/
        #7C all shipped + real-browser verified (evidence per item:
        `.claudedocs/work/dashboard-ux-corrections/2026-08-10/`). Item #2 (Reservations
        List-vs-Calendar) still gated on an explicit product-reversal confirmation (plan's own
        Section G Q1) -- NOT started. Item #1 (Overview empty-state) never had a reproducible case
        named -- NOT implemented, per the plan's own rule.
        Item #11 (routing/URL fixes) -- **partial**. TENANT_ADMIN portion done+verified. A real,
        confirmed STAFF-role nav-click bug (~50% intermittent, first click after login, reproduces
        even on a real production build) was found and is UNRESOLVED after substantial
        investigation -- full writeup + every ruled-out hypothesis:
        `.claudedocs/work/dashboard-ux-corrections/2026-08-10/item-11-evidence.md`. Carried to
        Phase 4 in the roadmap as a named open item. Self-resolves on a 2nd click/reload -- not a
        hard blocker to reaching any page, but a real rough edge on STAFF's daily entry point.
6. Ali onboarding
7. Final production regression
8. 2026-08-31 LIVE
```

**Blocked on RK, not on us** — two questions only the real shop owner can answer, needed before the
7 remaining uncertain reservations can be resolved either way:
1. Does RK staff actually log phone/WhatsApp-taken bookings with a name placeholder ("زبون واتساب")
   and no real number captured?
2. Do "bo salo" / "ali aloka" / "ashraf kokha" match real walk-in customers from 2026-08-06?

**Also open, not blocking, logged as a Phase 4 follow-up**: `POST /api/v1/auth/users/login` hit the
same known transient pooler-flakiness class (`P1001`) twice during today's testing, unwrapped by
the earlier availability-reliability fix (which was scoped to the reservation flow only).

Next-session priority: #5, Calendar/Reservations/Staff/Store polish — the remaining 🟡 items from
the three-sided Product Review (`.claudedocs/work/admin-dashboard-review/2026-08-10/summary.md`).

## 2026-08-09 — see full session report

Staff Scoped Access (3-tier authorization) and Staff/Store IA Separation both shipped end-to-end
this session — see `.claudedocs/sessions/2026-08-09.md` for the full account, and its own
"🚧 Unfinished / Carry Forward" section for real open items (order status-change control gap,
`store.py`/`catalog_service.py` dual-write-path, `StoreCustomer` dead code, Ali's real onboarding).

## Completed Phases

- Phase 1–23: WebGL / 3D / State / Canvas foundation — COMPLETED
- Phase 24–29: Spatial scroll & animations — COMPLETED
- Phase 30.1: ShowcaseTemplate — GSAP Z-Axis 6-station cinematic — COMPLETED
- Phase 31: Backend API — FastAPI routes, Prisma schema, Supabase connection — COMPLETED
- Phase 32: TenantConfig Auto-Seed — 404 fix for `/config` endpoint — COMPLETED
- Phase 33: FEAT-01 Login Modal — Glassmorphism overlay, Guest + Admin entry points — COMPLETED
- Phase 34.1–34.3: TenantHeader, organisms export, Frontend Architecture Docs — COMPLETED
- Phase 40: Auth Evolution A→D — bcrypt backfill, GlobalAuthModal, SSO, RBAC — COMPLETED
- Phase 41: Auth Production Hotfixes — useAdminRole, Login.jsx endpoint, subdomain routing — COMPLETED
- Phase 42: Tailwind v3 CDN vs v4 Build Conflict — blank pages fix — COMPLETED
- BUG-01/02/03: Admin stats 500, CRM linkage, bookings table — FIXED
- Phase 52: Self-Service Onboarding — ✅ Done 2026-05-08
- Phase 53: Image Upload (`POST /admin/upload`) — ✅ Done 2026-05-05
- Phase 54: DB Unification (menu+store → catalog, 29→23 tables) — ✅ Done 2026-05-05
- Phase 56-A/B/C/D/E: Dashboard v2 — ✅ Done 2026-05-08/09
- Phase 59 + 60-A: Template Picker + Dashboard Live Preview — ✅ Done 2026-05-11
- Phase 60-B: TemplatePicker saves to DB — ✅ Done 2026-05-13
- Phase 61: WhatsApp AI Settings Agent endpoint — ✅ Backend done 2026-05-13
- Phase D1/D2/D3: _template.routes, BUG-08 migration, integration test — ✅ Done 2026-05-13
- Phase 57: Cyberpunk showcase homepage (R3F + GSAP + Lenis) — ✅ Done 2026-05-15
- Phase 62: Footlab store — admin user + catalog seed + CartPage fix + store live ✅ — Done 2026-05-15
- Phase 63: Caracas restaurant — admin user + catalog seed + CartPage fix + menu live ✅ — Done 2026-05-15
- Phase 64: Page Builder v2 — drag-and-drop, 10 section types, 5 business templates, live preview — ✅ Done 2026-05-16
- Phase 65: PricingSection.jsx — 3-tier pricing on showcase homepage — ✅ Done 2026-05-17
- FIX: Upload 500 (SUPABASE_KEY fallback) — ✅ Done 2026-05-17
- FIX: auth → demo subdomain rename (14 files) — ✅ Done 2026-05-17
- Resend email integration — booking confirmation + welcome email — ✅ Done 2026-05-17
- Caracas re-seed `--clear` — 10 cat / 75 items, arizona duplicates cleared — ✅ Done 2026-05-18
- Phase 66: ProChatbot.jsx + POST /api/v1/public/ai/chat (SSE, haiku) — ✅ Done 2026-05-18
- ARCH-01 public routes — 0 prisma_client calls in public/ — ✅ Done 2026-05-18
- Phase 67: CanvasPageEditor — Canva-style 3-panel, animations, keyboard, resizable — ✅ Done 2026-05-18
- bo-hussein CEO agent — /bo-hussein command + agent file — ✅ Done 2026-05-18
- Tenant onboarding rules — .claude/rules/tenant-onboarding.md + agent steps — ✅ Done 2026-05-18
- Page content seed infrastructure — page_templates/ + seed_page_content.py — ✅ Done 2026-05-18
- BUG-V: Video upload 400 fix — storage_service + upload.py + useImageUpload.js — ✅ Done 2026-05-21
- BUG-C: Prisma connection pool timeout fix — app/db/client.py — ✅ Done 2026-05-21
- Hero Video upload field in SettingsTab — VideoUploadField + hero_video_url save — ✅ Done 2026-05-21
- TemplatePicker removed from public/demo pages — DynamicPage + DemoPublicPage — ✅ Done 2026-05-21
- Phase 70A: Olivello DB seed — Client + 4 cat + 11 items — ✅ Done 2026-05-20/21
- Phase 70B: Olivello frontend scaffold — TreeSection + HarvestSection + MillSection + routes — ✅ Done 2026-05-21
- Phase 70D: Olivello sections 4-7 — DonkeySection + PasteSection + PressSection + GoldenDropSection — ✅ Done 2026-05-21
- Phase 70E: Olivello ProductsSection + store flow (CatalogPage/CartPage generic wired) — ✅ Done 2026-05-21
- Phase 70F: /impeccable polish — fonts, perf, reduced-motion, SVG icons, config drift — ✅ Done 2026-05-21
- Phase 71: OlivelloStory cinematic scroll (7 scenes × 130vh, real photos, CSS olive morphing) — ✅ Done 2026-05-22
- Phase 72: 3D Olive R3F + Slot System (SphereGeometry PBR, 6 SlotPlane vignette shader, ScrollProgressContext) — ✅ Built 2026-05-26
- cyber-sentinel agent — 10 threat classes — ✅ Done 2026-05-30
- SEC-07: /docs hidden in production (main.py) — ✅ Done 2026-05-30
- SEC-09: bcrypt 72-byte guard (security.py) — ✅ Done 2026-05-30
- TanStack Query cache layer — useTenantConfig + DynamicPage migrated — ✅ Done 2026-05-30
- Bulletproof React 5-bucket refactor — hooks/ + services/ + rule file — ✅ Done 2026-05-30
- Phase F ARCH-01 admin routes — 0 prisma_client violations (13 files, 9 new repos) — ✅ Done 2026-05-30
- Phase E: POST /demo/create + auto-seed catalog + DemoLauncher.jsx — ✅ Done 2026-05-30
- FIX: circular import crash (limiter → app.core.limiter) — ✅ Done 2026-05-30
- ARCH Catalog Refactor (Phase 51 tech debt) — catalog_service.py expanded, admin+public routers cleaned — ✅ Done 2026-06-29
- Mona Page Screen 0 — German travel story, staggered reveal, globe animation — ✅ Done 2026-06-29
- Phase 75-A: DatePage DB model + dating_repo + dating_service + dating router + maintenance cron — ✅ Done 2026-06-30
- Showcase canvas black screen fix (100vw×100vh wrapper) + GLSL pow() clamp — ✅ Done 2026-06-30
- Saudi glass tower shader (4×20 curtain-wall, golden frames) + RoomEnvironment CSS photo layer — ✅ Done 2026-06-30
- Page structure pivot: Hero→400vh zoom→content (tower IS the hero) — ✅ Done 2026-06-30
- Arizona tenant scaffold — arizona.css + hooks + store + MenuPage + HomePage — ✅ Done 2026-07-04
- Caracas HomePage — dark cinematic #0D0503, split hero editorial — ✅ Done 2026-07-04
- Relume UI installed + .npmrc legacy-peer-deps fix — ✅ Done 2026-07-04
- Backend rules v2 — security.md + api-rules + architecture + service-system updated — ✅ Done 2026-07-04
- **git push origin main** — confirmed already succeeded (GitHub has commit `100ded0` plus 2 later commits) — ✅ Done, no action needed
- **`python -m prisma db push`** — confirmed already live: `Client.tier` + `OccasionCreator` + `OccasionPage` + `OccasionRSVP` + `DatePage` all present in production DB (verified by diffing `schema.prisma` against a live DDL dump — zero drift) — ✅ Done, no action needed
- Phase 75-B/C/D: Dating module frontend — HeroSection/StorySection/DatePicker/FoodPicker/ConfirmSection, "Running No Button", 5-step DatingCreatePage.jsx, ntfy.sh notifications tested to Salman's phone — ✅ Done (per updated report from `new-matirial/`)
- Ubuntu 24.04 migration — Node 20 (nvm), Python venv, Prisma client, git tracking restored, `start_dev.sh`, `.env.example` filled in — ✅ Done 2026-07-12
- **DB `connection_limit` bug fixed** — `.env`'s `DATABASE_URL` had `connection_limit=1` hardcoded, bypassing `app/db/client.py`'s own safe-default guard (should be `connection_limit=10&pool_timeout=30`); this was the root cause of intermittent P1001/"tenant not found" errors — ✅ Done 2026-07-12
- Caracas `CaracasStoryReel.jsx` — scroll-chaptered cinematic section (sticky pinned viewport, per-chapter opacity cross-fade, real dish content) replacing the static dish grid — ✅ Done 2026-07-12
- Root domain routing fix — `localhost:5173/` now redirects to `/showcase` (real 3D homepage) instead of `/smar`, matching production behavior — ✅ Done 2026-07-12
- Arizona `ArizonaStoryReel.jsx` — same scroll-chaptered technique applied to Arizona, using 4 real live-catalog sandwich items (Taouk/Spicy Steak/Twister/Philly Cheesesteak) with verified real Supabase photo URLs, replacing the static Relume Carousel gallery — ✅ Done 2026-07-12
- `new-matirial/local-llm-learning-plan.md` — hardware-grounded local LLM learning guide (Ollama, no VM) — ✅ Done 2026-07-12
- Higgsfield CLI + MCP pipeline proven end-to-end (video_analysis, product-photoshoot, generate_image/video, upscale_image, Supabase upload) — ✅ Done 2026-07-13
- Caracas Special (`/caracas/special`) — 7 real Higgsfield videos generated + uploaded to Supabase; 3D cube-rotation reel built then reverted to flat crossfade per user feedback — ✅ Done 2026-07-13
- **New tenant "anas"** (artisanal ceramics/pottery shop) — full onboarding: video-analyzed real footage, generated 4 category banners + used 6 real photos, seeded Client/User/categories (no fake products), built custom homepage (`frontend/src/pages/anas/`), registered routes — ✅ Done 2026-07-13
- `anas.html` static page hero fixed — layered blurred-backdrop + sharp centered video, fixes blur/crop from forced `object-fit:cover` on portrait source footage — ✅ Done 2026-07-14
- Cybersecurity portfolio consolidated — `new-matirial/Cybersecurity/portfolio/` indexes 3 real completed pieces + 1 honestly-labeled illustrative SQL piece — ✅ Done 2026-07-14
- `frontend/wrangler.toml` added + Cloudflare Pages build-passthrough verified for `anas.html`/`mona.html` — ✅ Done 2026-07-14
- **Salman Local AI Agent — Phase 1** (new standalone product, `local-agent/`) — local-only agent (Ollama LLM, no cloud calls) managing customers/products/invoices via natural language against a local SQLite/Postgres DB; refactored to a `plugins/` architecture (`Plugin.execute(action, payload)`) with a full event log; verified end-to-end except the actual Ollama LLM call — ✅ Done 2026-07-14
- **Tenant Identity Migration: `anas` → `beit-al-fakhar`** — full DB/storage/frontend rename ("بيت الفخار"), canonical URL now `/beit-al-fakhar/home`; 25 real uploaded plate photos imported as real `CatalogItem` rows (honest generic naming, no fabricated prices/descriptions) — ✅ Done 2026-07-20
- **Beit Al-Fakhar Hero — real-video scroll-scrubbed frame sequence** — canvas paints preloaded real video frames by scroll position (replaced a failed AI-still crossfade attempt that cost 28/31 Higgsfield credits); `PlateHero` compositor architecture (basePlate/decorationLayer/optionalShadow/optionalHighlight, decoration layer not yet populated); new reusable skill `.claude/skills/frontend/frame-sequence-canvas/SKILL.md`; new `documentation-policy.md` rule 6 (per-role evidence logging in multi-contributor contracts) — ✅ Done 2026-07-20
- **tenant-seeder → Frontend Architect handoff, real gap fixed** — auditing `pilot-test-20260720` (the first real `tenant-seeder` Service run) against `DynamicPage.jsx`'s `SECTION_MAP` found 3 of its 8 real seeded section types (`offers`, `testimonials`, `hours`) had no matching renderer anywhere in the codebase — silently dropped, no error. Built `OffersSection.jsx`/`TestimonialsSection.jsx`/`HoursSection.jsx`, registered them in `dynamic-sections/index.js` + `SECTION_MAP`, confirmed via a real `GET /config` call that all 8 sections now resolve. Also fixed the CTA section's empty `link` (button was not rendering at all) → wired to the fixture's WhatsApp number. Added a permanent "Frontend Handoff Checklist" to `tenant-seeder.md`'s Service Contract so future template-based tenants get this check before being called "finished." — ✅ Done 2026-07-20
- **Strategic decisions captured** (`.claudedocs/decisions/2026-07-20-cash-only-billing.md`, `.claudedocs/architecture/TEMPLATE_ROADMAP_VISION.md`): billing stays manual/cash-only (no gateway integration), which unblocks but does not schedule Super Admin Dashboard work; template roadmap fixed as Restaurant → Store → Clinic, sequential, one at a time — ✅ Done 2026-07-20
- **ADR-0003 (Architecture Documentation System) migration — all 8 phases** — `TENANT_OS_PLAN.md` (1,432 lines) retired to `archive/`, replaced by the six-layer `architecture/{TENANT_OS.md,principles/,capabilities/}` + `adr/TOS-*` structure. Two real completeness gaps (SSOT/Governance/Acceptance sections, 6 more stale code references) found and fixed before archiving, not glossed over — ✅ Done 2026-07-27
- **Platform Services Catalog — real investigation** (`.claudedocs/evolution/platform-services-catalog.md`) — confirmed a real `PlatformService` entity + mounted CRUD API already exist but sit disconnected from 3 other hardcoded service-key taxonomies that actively disagree with each other — logged as Evolution, not yet promoted to an ADR — ✅ Done 2026-07-27
- **RK Barber Reservations — full end-to-end fix + real Calendar View** — fixed a live 500 bug (Prisma `Json` wrapping), added working-hours enforcement (new, no migration), built a Calendar View that didn't exist before, found + fixed 3 more independent real bugs while verifying (field-name mismatch, UTC/local-timezone display, response race). Verified with real DB proof + real headless-Chrome screenshots, per the new standing End-to-End Verification Routine (`.claude/agent/bo-hussein.md`) — ✅ Done 2026-07-27, full evidence in `.claudedocs/reviews/rk-barber-reservations-calendar-verification.md`
- **RK Barber Acceptance Review** — 6 Acceptance Criteria scored (3 fail/2 partial/1 pass), 19 numbered Confirmed Findings across Content/Media/Booking/Catalog, two Critical bugs found (real booking-form 404, real services invisible on the public homepage) — ✅ Done 2026-07-28, `.claudedocs/reviews/rk-barber-acceptance-review-2026-07-28.md`
- **Booking 404 fixed** — `ReservePage.jsx` posted to a URL that doesn't exist; one-line fix, verified via a real end-to-end submission (real success screen, real confirmation number) — ✅ Done 2026-07-28, `.claudedocs/reviews/rk-barber-booking-404-fix-verification.md`
- **Module Resolution Review + TOS-004 ADR + full Capability Resolution Migration (5 phases)** — confirmed the frontend's single tenant-wide `moduleKey` was a wrong domain concept (backend's `client_services` was always plural); ratified `TOS-004-plural-capability-resolution.md`; executed all 5 phases (primitives → Public Catalog → Cart/Reserve → Admin Dashboard → Search Verification → delete all 3 duplicate derivations + remove the Admin topbar module badge entirely). Architecture Success Criteria all met, verified live at every phase — ✅ Done 2026-07-28/29, `.claudedocs/architecture/CAPABILITY_RESOLUTION_PLAN.md` + `.claudedocs/reviews/capability-resolution-*.md`
- **Architecture Review Loop established + self-corrected** — new recurring maturity-review stage (`.claude/rules/architecture-review-loop.md`, `/architecture-review` command, `.claudedocs/maturity/*.md`); found and fixed 3 real gaps in its own design under immediate self-review — ✅ Done 2026-07-29
- **Site Configuration Sprint 3 — Phase 2 + Phase 3** — consolidated the write path (`site_configuration_service.py` replacing dead `client_service.py`), deleted the entire Hero Video pipeline (found a second consumer, smar's own bespoke SettingsTab.jsx, only during verification), and fixed `saveFieldValue`'s anti-dispatcher risk (schema-owned `getCurrentValue`/`applyLocalUpdate`/`getPreviewPatch`) — ✅ Done 2026-07-29, `.claudedocs/reviews/site-configuration-phase{2,3}-verification.md`
- **Restaurant Capability Investigation** (investigation only) — confirmed Reservation is already schema-ready for restaurant tables (unexercised); confirmed Menu is already Catalog's data model at the Contract level, but Implementation hasn't caught up — ✅ Done 2026-07-29, `.claudedocs/work/restaurant-capability-investigation/2026-07-29/investigation.md`
- **Schema Architecture Review** (Platform Health view, 6 Explore passes) — found `Unit` carries a second undocumented Content storage location, an entire module (`public.py`) permanently unreachable via a name collision, 4 unregistered admin route files, 2 parallel GalleryImage write paths — ✅ Done 2026-07-29, `SCHEMA_ARCHITECTURE_REVIEW.md`
- **ADR-0004 (Information Ownership Model) + Architecture Checkpoint Review** — ownership-first classification (Business Data/Experience Definition/Platform Configuration/Integrations); the repeated bypass pattern (Media, Catalog, Site Configuration) promoted to a stated Principle (`architecture.md §9`), with `ADR-0005` deliberately left open and tracked via a new Watchlist in `capability-contracts.md` — ✅ Done 2026-07-29
- **Authorization Hardening — COMPLETE, all 9 files (+2 found mid-initiative)** — closed the critical unauthenticated-admin-access hole (router-level `get_authenticated_tenant` floor across all admin routes except `settings.py`) 2026-07-30, then fully implemented + live-verified role matrices (Ownership Question, Least Privilege principle) for all of `team.py`, `units.py` (2026-07-30), `bookings.py`, `gallery.py`, `properties.py`, `services.py`, `upload.py`, `fleet.py`, `dashboard.py` (2026-07-31) — plus `restaurant.py`/`store.py`, found to have the same gap class (missing `require_roles` despite already using `get_current_admin_user`) and folded into the same initiative rather than treated as separate, 2026-07-31. Full final role matrix + resolution record in `.claudedocs/reviews/SECURITY-2026-07-30-admin-authorization-bypass.md`. ✅ Done 2026-07-31 — **this milestone is now finished, not to be reopened** except for genuinely new admin routes.
- **Reservation Capability — Clinic built and live-verified as the first real Reservation Strategy case** — four design revisions (each resolving a real objection: Capability≠Type, Boolean Explosion risk, Resource≠Doctor, missing Service tier) before any code; `reservation_service.py` reorganized into a canonical 6-stage pipeline (Validate→Resolve Resource→Working Hours→Conflict Check→Create→Post Actions); new `Resource` model (single table, `type`-discriminated) + `Reservation.resourceId` FK; new `admin/resources.py` (role-gated from day one, matching the Authorization Hardening pattern); real bug found+fixed (`reservation_repo.py`'s `update_many()` returning a plain `int`, not a `.count`-bearing object). Extensively live-verified: per-resource working hours (incl. live edits taking effect immediately), partial-overlap conflict detection, cross-resource independence, real `Service` references, cancel/status lifecycle. Real gap surfaced (not a bug): no reschedule capability exists at all. Full evidence + the 4 ratified architectural decisions (pipeline is canonical, Resource's definition, Reschedule registered as deferred, no extraction/ADR before a 2nd real case) in `.claudedocs/evolution/reservation-capability.md` — ✅ Done 2026-07-30
- **Reservation Capability — Barber built and live-verified as the 2nd real Reservation Strategy case, built independently of Clinic** — per Salman's explicit instruction, built as if Clinic didn't exist: own `Barber` model/migration/repo/admin route/`_resolve_barber()`/`find_overlapping_by_barber()`, none of it calling into Clinic's `_resolve_resource`/`RESOURCE_BACKED_MODULE_KEYS`/`find_overlapping_by_resource`. Live-verified against a fresh disposable `barberlab-test` tenant (never `hr`, the real RK Barber Shop tenant): per-barber working hours incl. a live edit taking effect immediately, overlap conflict detection, cross-barber independence at the same wall-clock time, role gating (identical matrix to `resources.py`, arrived at independently), cancel lifecycle, validation errors (missing/invalid `barber_id`). Full literal-vs-similar-vs-Clinic-only comparison in `.claudedocs/evolution/reservation-capability.md`'s 2026-07-31 entry — extraction decision is explicitly left to Salman, not concluded — ✅ Done 2026-07-31
- **Reservation Pilot Phase 1 (Backend Foundation)** — real `Barber` "حسين" for `hr`, `CatalogItem.metadata.requires_booking`+`duration_min` bridge on hr's real services, and a real availability-slot API (`GET /public/reservations/availability`) generating candidate slots through the existing working-hours/conflict-check pipeline (no new validation logic invented). Two real bugs found+fixed during build: `catalog_service.py` metadata Json-wrapping, and the slot engine's N+1 query + tz-naive/aware datetime bug. Verified via 3 real cases (empty day, with-conflict, after-cancel) — ✅ Done 2026-08-02
- **Reservation Calendar / Admin Dashboard — v1 CLOSED, tagged `reservation-dashboard-v1`** — the full arc from staff-column Today View through today's polish, all Browser-Verified end to end:
  - Phase 3.1 — Calendar UX redesign: staff-column Today View + drag-and-drop reschedule (dnd-kit, reusing `KanbanBoard.jsx`'s proven optimistic-update pattern)
  - Phase 3.2 — Quick Create / full Edit (name/phone/service/staff/time/duration) / Cancel, all via the popover shell, single-barber view, light theme
  - Phase 3.3.1 — Real-Time Calendar Awareness: current-time indicator + auto-scroll-to-now on both the admin Today view and the customer `/reserve` page, today-only, no forced scroll on other days
  - Phase 3.3.2 — popover positioning: shared, domain-agnostic `usePopoverPosition()` hook (flip-above / constrain+scroll-body fallback when a day-end slot doesn't fit; viewport-generic, not hardcoded against the mobile bottom nav), plus the Quick Create default-time UTC-vs-local fix
  - Same-day hardening: 3 more instances of the same past-slot timezone bug fixed (reschedule + both create paths), a real dead-code file removed (`app/api/v1/public.py`), and a real input-validation gap fixed (`barber_id` now UUID-typed on the availability route, clean 422 instead of a raw 500)
  - Architecture review delivered (not a refactor): `.claudedocs/evolution/reservation-capability.md`'s 2026-08-05 entry — Reservation Engine vs. Barber Dashboard, no extraction warranted yet, Escalation Watch set for the next real tenant type (Gym/Clinic/etc.) as the mandatory re-evaluation checkpoint
  - Per Salman's explicit Phase Closure (2026-08-06): **any further change to this Calendar/Dashboard screen is a new Feature request, not a continuation of this milestone.** — ✅ Done 2026-08-06
- **Phase 3.4 — Weekly Calendar Feature Parity — v1 CLOSED, tagged `reservation-calendar-v1`** — Week View reached full feature parity with Today View, closing the last real gap in the Calendar screen:
  - Step 0 — extracted `reservationInteractions.jsx`: shared `ReservationPopover`/`CreatePopover`/`usePopoverPosition`/date-math/`useBarbers()`/`useCatalogItems()`, replacing Week's fully standalone implementation; added a one-click "✅ تأكيد الحجز" quick-confirm button (both views get it for free)
  - Item 2 — Week empty-slot click → Quick Create (previously Week had zero Create capability)
  - Item 3 — Week's bespoke read-mostly modal replaced with the shared popover: real Edit/Cancel/Status-Change/mini-reschedule for the first time; found+fixed a real bug (cancelled cards weren't disappearing from Week's grid — `VISIBLE_STATUSES` filter moved to the shared module)
  - Item 4 — Week drag-and-drop, genuinely new capability (cross-day AND time, vs. Today's time-only): dnd-kit droppable-per-day-column, verified via real trusted pointer sequences with zero ghost/duplicate cards on a round-trip
  - Item 5 — real bug fixed: Week's `today = new Date()` used true UTC instead of the shared local-wall-clock convention, silently mis-highlighting "today" for 2-4 hours around local midnight every day; added the current-time line + auto-scroll
  - Item 6 — mobile Browser Verification pass + one more real bug found+fixed: the shared popover's body needed `overflowY:auto` unconditionally (a fixed height estimate couldn't account for the new quick-confirm button's variable height, causing content to overlap the footer on mobile)
  - New standing rule (Salman, 2026-08-06): **any future Calendar capability must ship in both Today View and Week View before it's considered complete** — see `.claudedocs/evolution/reservation-capability.md`'s 2026-08-06 entry
  - Per Salman's explicit Phase Closure: **the Calendar is now a stable platform to build on, not an area under continuous development — no further Calendar work planned unless a bug surfaces.** Next: Staff Management → Customers → Notifications — ✅ Done 2026-08-06
- **Reservations filter-button checkup (2026-08-07) — real bug fixed** (`5321764`): the List-only
  date picker/اليوم/الكل buttons stayed visible and interactive during Today/Week Calendar view
  despite doing nothing there — now correctly hidden outside List mode, verified via real Browser
  Verification across all 3 view modes.
- **Phase 3.5 — Reservations List v1 Completion — CLOSED** — List reached full capability parity
  with Calendar on the shared Reservation Engine, closing the last real gap across all three views:
  - Item 1 — row/card click → shared `ReservationPopover`, closing View/Edit/Cancel(with the
    confirm-safety step)/Quick-Confirm/Reschedule at once; `StatusCell`'s badge click got
    `e.stopPropagation()` so it doesn't also open the row popover
  - Item 2 — "+ حجز جديد" button → shared `CreatePopover` (List has no empty-slot/grid to click, so
    a plain button instead); found+fixed a real, previously-latent bug in this same commit —
    `getUsableViewportBottom()` mistook the desktop sidebar (full-height `position:fixed`) for a
    bottom-docked bar, collapsing usable viewport height to ~0 on desktop; every earlier popover
    trigger opened far enough down the page to mask it, this button (near the top) was the first to
    expose it
  - Item 3 — client-side Search (name/phone substring), reusing `OrdersTab.jsx`'s exact pattern,
    zero new backend request; explicitly scoped as List-specific, not a Calendar-parity capability
  - New standing rule (Salman, 2026-08-07, supersedes the 2026-08-06 one): **any Reservation
    capability must work across Today, Week, AND List before it's considered complete, unless
    explicitly declared view-specific** — see `.claudedocs/evolution/reservation-capability.md`'s
    2026-08-07 entry
  - ✅ Done 2026-08-07
- **Registration Routing — fixed, tag n/a (docs-only + 1 code fix)** — real "old dashboard after
  registration" bug traced and fixed: `/register` renders `TenantRegisterPage.jsx` (confirmed via
  real inbound-link + git-history investigation, not `RegistrationPage.jsx` which is legacy/dead
  code at `/showcase/register`, left as-is). Canonical Admin URL Rule now documented in
  `.claude/rules/frontend/routing.md` §0b/§0c. — ✅ Done 2026-08-07
- **Phase 3.6.1 — Reservation Platform API Boundary Cleanup — CLOSED** — documentation only, full
  report `.claudedocs/work/reservation-api-boundary-cleanup/2026-08-07/summary.md`. Real open
  finding (not fixed): Barber/Resource roster CRUD lives entirely inside files classified as
  "Reservation" — the entry point for Staff Management. — ✅ Done 2026-08-07
- **Staff Capability Investigation — CLOSED** — `.claudedocs/work/staff-capability-investigation/
  2026-08-07/summary.md`, evolution log `evolution/staff-capability.md`. Answer: `Barber`/`Resource`
  pass this project's own independent-lifecycle Capability test; no `Barber`↔`CatalogItem`
  relationship exists in any form — the real gap Phase 3.7C will need to design, not migrate.
  — ✅ Done 2026-08-07
- **Phase 3.7A — Staff Foundation — CLOSED** — real `StaffTab.jsx` shipped (`Barber`-only CRUD +
  photo + description + working hours), full Browser Verification incl. a negative test (zero
  Services/Categories/Skills/Pricing UI anywhere) and a Reservations regression check. Commits
  `d4ab023`, `61733be`. — ✅ Done 2026-08-07
  - [ ] Two real Side Findings, not yet decided: no UI path to reactivate a deactivated staff
    member (backend already supports it via `is_active`); a deactivated staff member still shows up
    as bookable in the reservation/reschedule barber picker and Calendar day columns.
  - [ ] Two disposable test records exist in `hr`'s real dev DB (`Test Staff 1786124916`, `Test
    Staff NetCheck 1786131600`), deactivated but not deleted — clean up if/when convenient, not
    urgent.
  - [x] **Phase 3.7B (Catalog UX, first slice) — ✅ Done 2026-08-08**, 4 commits
    (`6e7ac01`, `cc95dea`, `4a9677d`, `b8eb3f6`), each real-Browser-Verified against `hr`'s live
    catalog. Followed the Catalog UX Gap Investigation's (`.claudedocs/work/catalog-ux-gap-
    investigation/2026-08-07/summary.md`) recommended first slice: (1) `sortOrder` tiebreaker
    (`createdAt` secondary key, matching the already-proven `barber_repo.py`/`resource_repo.py`/
    `service_repo.py` pattern); (2) corrected a real mislabeling bug found while implementing —
    "حذف" already only soft-deleted under the hood (`catalog_service.py`'s `admin_delete_*` always
    called `soft_delete_*`), relabeled to "إخفاء" + added the missing "إظهار" reactivate button,
    closing the same gap Staff's own deactivate flow still has open; (3) ↑/↓ reorder for both
    categories and items, renumbering the whole list to sequential `sort_order` on each move (every
    real row started at the untouched default `0`, so a naive adjacent-swap would've been a no-op);
    (4) an optional Parent Category `<select>` (not a tree — no real tenant has nested categories).
    **A real backend bug found and fixed while wiring (4):** Prisma's generated
    `CatalogCategoryUpdateInput` doesn't expose `parentId` as a directly-settable scalar on
    `update` (unlike `create`) — it's modeled as the `parent` relation, so a raw `parentId: None`
    assignment threw a real `DataError` ("Error creating UUID... found 0") trying to parse an empty
    string as a UUID. Fixed via `parent: {connect/disconnect}`.
  - [x] **Real infra bug found and fixed mid-phase: the backend dev server had silently orphaned**
    — its `uvicorn --reload` reloader-supervisor process had died at some point (before this
    session), leaving a bare worker process reparented to `systemd --user`, still serving requests
    on :8000 but **never picking up file changes again**. This is exactly what made the parent-
    dropdown bug look unfixable on the first two attempts — the fix was correct the whole time, but
    curl/Browser Verification kept hitting stale, pre-fix code. Caught by noticing a debug `print()`
    never appeared in the log despite repeated edits; confirmed via `ps -ef` showing the worker's
    `PPID` was `systemd --user`, not a live reloader. Fixed by killing the orphan and restarting a
    supervised `uvicorn --reload` process; all 4 commits re-verified clean afterward. **Real open
    question, not resolved here:** how long had this been orphaned, and did any earlier session's
    "Browser-Verified" backend claim actually run against stale code as a result? Not investigated
    — flagged as a real risk to be aware of, not assumed clean.
- [x] **Public `/hr/reserve` mobile report (2026-08-08) — real bug found+fixed, reported layout bug
  not reproduced** (`9a630c9`). Built real Playwright device-emulation tooling (same approach as the
  Login investigation — the `playwright` npm package + cached Chromium, `devices['iPhone 14 Pro
  Max']`, real `isMobile`/`hasTouch`/`deviceScaleFactor: 3`) to test the exact reported conditions.
  **Real bug found along the way**: `ReservePage.jsx` checked `hasReservations` (derived from
  `config?.active_services`) *before* `configLoading` — while config is in flight, `active_services`
  defaults to `[]`, so any reservations-enabled tenant could flash a permanent-looking "خدمة الحجز
  غير متاحة حالياً" dead end instead of a loading state on a cold load. Reproduced reliably on a
  fresh, uncached context; fixed by reordering the two checks. **The specific gray-box/cut-off-card
  layout bug from the screenshot did not reproduce** even under full real device emulation — same
  non-reproduction outcome as Login. Made a defensive `ServiceCard` sizing tightening anyway (smaller
  minWidth/padding/icon/font, kept natural flex-wrap — no forced column count, to avoid a desktop
  regression) since it was explicitly requested regardless of root-cause confirmation.
- [x] **Phase 3.7C — Service Capability Extraction + Staff↔Service Assignment — ✅ Done 2026-08-08**,
  5 commits (`3d9f926`, `c8d6e40`, `5ec93dd`, `76dbf47`, `7f05698`), each independently
  Browser/API-verified. Started from the Capability Investigation (`bdca1bb`,
  `.claudedocs/work/staff-service-relationship-investigation/2026-08-08/summary.md`), but Salman
  stopped before Commit 1 to correct a real domain-model conflation the original plan assumed
  (`Service = CatalogItem where requires_booking = true`) — real evidence backed the correction:
  `CatalogItem` had zero schema relation to `Reservation` but three real relations to order-side
  concepts. Ended up two pieces in one phase:
  - **(A) `CatalogService` extracted as its own real Prisma model** — shares `CatalogCategory` with
    `CatalogItem` (no new category table), `duration_min` promoted to a real column. Conservative
    migration per Salman's explicit correction: `hr`'s 6 real services **copied** into the new
    table (same id reused, not moved) — **originals stay in `catalog_items`, untouched**; deleting
    them is an explicit, separate, later decision, not scheduled. Every existing consumer
    (admin Reservations Quick-Create/Edit/Today/Week, the public booking page) rewired onto the
    real model. `Reservation.serviceId` added as a real FK (mirrors `barberId`, `onDelete:
    SetNull`), set on both create and edit — not just the legacy `metadata.service_id` mirror.
  - **(B) `BarberService` join table** — the actual Staff↔Service relationship, mirrors
    `ClientService`'s bridge-table shape. `GET`/`PATCH /admin/barbers/{id}/services` (full
    replace-set) + a `Staff` edit-modal checklist. `GET /public/reservations/barbers` gains an
    optional `service_id` filter with a fallback-to-all-when-unassigned rule — Salman's explicit
    "soft filter, not hard enforcement" decision for v1, kept fully backward compatible.
  - **Two real naming/routing collisions caught before they became bugs** (both mid-Commit-1):
    an unrelated `Service` model already existed (smar's property add-ons) — every new file/route
    uses `CatalogService`/`catalog_service_repo.py`/`catalog_services.py` throughout, never the
    shorter name; a wildcard public route (`GET /{slug}/services`, also smar's) silently intercepted
    the first attempt at `/reservations/services` — renamed to `/reservations/catalog-services`.
  - **One real bug found via Browser Verification and fixed before Commit 5 closed**:
    `StaffCarousel`'s local pagination `offset` never reset when `barbers` changed at runtime
    (previously it only ever changed once, on mount) — switching services could silently render an
    empty picker. Fixed via `key={selectedServiceId}` (a remount, React's own recommended pattern),
    re-verified with 4 repeated back-and-forth switches, confirmed robust.
  - **Explicitly deferred, named so it isn't lost**: Phase 3.7D — Services Management UX (a real
    admin CRUD tab for `CatalogService` — name/price/duration/image/category/hide-show/reorder;
    this phase only built the data model + relationship, not a management UI). Also: whether to
    delete/archive the original 6 `catalog_items` rows (gated on this phase's own regression pass,
    which passed); hard-enforcing Staff↔Service (a later, separate product decision);
    `Resource`/clinic's equivalent join table (no real clinic tenant yet).
  - **Full regression pass, 7/7 checks clean**: Overview/Calendar(Today+Week)/Reservations(List)/
    Catalog/Staff all render real data, zero console errors — confirmed Catalog's own Item
    management (untouched by this phase) still shows all 6 real items correctly.
- [ ] **Week Calendar mobile-bug report (2026-08-07) — investigated, ruled out, real side finding
  left open:** `.claudedocs/work/week-calendar-mobile-report-investigation/2026-08-07/summary.md`.
  The reported "grid collapsed to one column" bug is not real (real Browser Verification confirmed
  the 7-column grid, scroll, and font sizes all correct at 390×844). What IS real: 10 genuine `500`
  errors on core admin endpoints during that same check, matching the same unrooted Supabase pooler
  flakiness that separately hit this session's own backend restarts during Phase 3.7A — recurring,
  never root-caused, only ever worked around by retrying. Worth a real investigation next time it
  blocks something, not another silent retry.
- [ ] **SSO login routing bug (found during the Registration Routing Item 3 investigation, 2026-08-07)
  — independent follow-up ticket, explicitly not folded into any other phase:** `SSOLoginPage.jsx`'s
  `resolveRedirect()` branches on `status === 'trial'`, but the login API now always returns
  `Client.status` (permanently `"active"` post-ADR-0002's lifecycle_state split) — so any *returning*
  SSO login (not the immediate post-registration auto-login, which hardcodes the right value)
  misroutes to the legacy `SmarAdminDashboard` for any tenant. Full writeup:
  `.claudedocs/work/legacy-admin-route-investigation/2026-08-07/summary.md`.
- [ ] **API Boundary Review (2026-08-06) — carry-forward items before/during Staff Management &
  Customers:** full report `.claudedocs/work/api-boundary-review/2026-08-06/summary.md`, evolution
  entry `.claudedocs/evolution/api-boundaries.md`. Two real items to resolve, not urgent but
  load-bearing for those phases:
  - `admin/customers.py` exists but is unmounted (not in `admin/__init__.py`) and uses a stale
    auth/tenancy pattern (no JWT dependency, raw `client_id` query param) — rebuild fresh for the
    Customers phase, don't wire up as-is.
  - `Reservation` has no relation to `Customer` at the schema level — decide phone-string matching
    vs. a real `Reservation.customerId` FK before building Customers for `hr`.
- [ ] **Shared data-fetching / React Query — Store Dashboard carry-forward (2026-08-06):** migrate
  `reservationInteractions.jsx`'s `useBarbers()`/`useCatalogItems()` (currently bespoke
  `useState`+`useEffect`) to `useQuery`, per the already-established `tanstack-query` skill's PART 9
  migration checklist — do this at the same time Store's own admin-dashboard data hooks are built,
  so Store starts on `useQuery` from day one instead of repeating the bespoke pattern a third time.
  No new cache/abstraction needed — React Query is already wired app-wide (`App.jsx`) and already
  proven in `useTenantConfig.js`/`useCatalog.js`; this is a consistency retrofit, not new
  architecture. See `.claudedocs/evolution/frontend-data-layer.md`.
- [ ] **Dashboard Workload / API Audit (2026-08-06) — concrete migration targets for the same Store
  phase pass above:** full report
  `.claudedocs/work/dashboard-workload-api-audit/2026-08-06/summary.md`. Three real duplicate-request
  patterns found, all rooted in `GenericAdminDashboard.jsx`'s tab-remount-on-switch behavior:
  - Toggling "التقويم"/"الحجوزات" nav items refetches `/reservations/`, `/barbers/`, `/catalog/items`
    every time — both nav items render the same `ReservationsTab` component.
  - `GET /{restaurant|store}/orders` is independently fetched by both Overview and Orders tabs with
    identical params.
  - `GET /catalog/items` (full list) is independently fetched by Overview and by
    `reservationInteractions.jsx`'s `useCatalogItems()`.
  - Side item, not urgent: `ActivityFeed`'s 30s poll only refreshes orders, never reservations — the
    reservation half of "Recent Activity" silently goes stale after mount.

## 🔴 عاجل — يحتاج تنفيذ يدوي

- [ ] **حذف المشروع القديم** — `gdzthjcvzvhfpsvoxhbm` — كل البيانات والصور انتقلت (يمكن الحذف الآن، لسا ما انحذف)
- [ ] **Cloudflare:** أضف `demo.salmansaas.com` كـ custom domain في Pages → Custom Domains (wrangler.toml جاهز، ينقص `wrangler login` + الخطوة اليدوية بالـ dashboard)
- [ ] **SEC-03 (partial):** Supabase service key + Resend API key — rotation يدوي في الداشبوردات
- [ ] **Mona page hosting** — `frontend/public/mona.html` جاهز — ارفعه على Netlify Drop أو Cloudflare Pages
- [ ] **`floor-video.mp4`** — حمّل dark-tech video من pexels.com → `frontend/public/videos/floor-video.mp4`
- [ ] **local-agent: install Ollama** — `ollama pull qwen2.5:7b` + `ollama serve` على جهاز المستخدم، ثم تحقق فعلي من `/agent/command` (كل الطبقات تحته متحقق منها، بس نداء الـ LLM نفسه لسا ما انجرب)

## 🟠 In Progress / Carry Forward

- [x] **Tenant OS Editing Engine — Sprint 1 (Content Capability) + Sprint 2 (Media Capability)** —
  `hero.title`/`story.heading` (`UpdateField`) and `hero.bg_image` (`ReplaceMedia`) all real,
  verified end-to-end via CDP; `CanvasPageEditor.jsx`/`PageBuilderTab.jsx` deleted once proven. See
  `.claudedocs/architecture/TENANT_OS_PLAN.md` §14, `.claudedocs/sessions/2026-07-22.md` — ✅ Done
  2026-07-22
- [ ] **Site Configuration Capability (Sprint 3), Phase 2 + Phase 3** — Phase 0 (real
  re-investigation) + Phase 1 (Ownership Matrix + Contract) done 2026-07-22
  (`.claudedocs/work/tenant-os-sprint3-phase0/2026-07-22/PHASE0_INVESTIGATION.md`,
  `.claudedocs/architecture/capabilities/site-configuration.md`). Phase 2 must fix `client_service.py` (extend its `ClientUpdate`
  schema — doesn't cover Site Config fields today) **and** `settings.py` **and** `upload.py`'s
  `page_hero_video` bypass together (2 independent writers found, not 1) before Phase 3's Engine
  integration for Brand/Contact/Currency/Theme. Three named Hero boundary-debt findings
  (`config.hero.*` legacy duplicate, dead `Client.hero_video_url` pipeline, phantom
  `config.hero_image_url` reference) carry forward, not resolved yet.
- [x] **Architecture Documentation System — Implementation Contract (Migration Manifest) — Done
  2026-07-27** — `ADR-0003` (committed 2026-07-22) fully executed, all 8 phases
  (`.claudedocs/implementation/ADR-0003/CONTRACT.md`, `PHASE_1.md`–`PHASE_7.md`): reviews
  consolidated, 3 Tenant OS ADRs (`TOS-001/2/3`) written, 4 Principles extracted, all 8 Capability
  files built (with a real completeness-check addendum adding SSOT/Governance/Acceptance sections
  that Phase 5 had initially missed), `TENANT_OS.md` finalized, `TENANT_OS_PLAN.md` archived
  (`archive/TENANT_OS_PLAN.md`, history preserved), and all 11 external references fixed. Two real,
  honestly-named exceptions carried forward, not silently dropped: §23–24's Rollout
  Phases/Client Journey Audit (deferred, out of Contract scope) and Units/Team-Staff (neither has
  passed the Capability Proposal gate, so neither got its own `capabilities/*.md` file).
- [ ] **`ReplaceMedia` Processing Pipeline for beit-al-fakhar's frame-sequence Hero** — named Gap,
  `.claudedocs/adr/TOS-002-editing-engine.md` §4.5. Frame extraction is still manual `ffmpeg` + hand-edited
  `walkthroughAssets.js`; no automation connects a new video upload to regenerated frames.
- [x] **Restaurant template — visual confirmation in an actual browser — settled 2026-07-27 per Salman's explicit criteria** (either real verification or a logged environmental constraint closes this gate). A real Chrome + dev-server check was attempted (`.claudedocs/reviews/pilot-test-20260720-verification.md`) and hit **Blocked by Environment Network Egress** — Supabase pooler ports 6543/5432 confirmed genuinely intermittent (raw TCP + Prisma's own P1001 both observed failing within the same short window, general internet/DNS confirmed fine) — not a code bug, logged rather than retried further. API-verified state (all 8 sections resolve via `GET /config`, CTA wired) stands as the current reference; a real visual check on a machine with stable Supabase connectivity would close the remaining gap in ~5 minutes, tracked separately below, no longer gating the roadmap.
- [ ] **Restaurant template — actual browser re-check** (carry-forward, non-blocking) — do this whenever convenient on a machine with stable Supabase connectivity: open `localhost:5173/demo/pilot-test-20260720`, confirm all 8 sections + CTA visually, then `pilot-test-20260720` formally becomes the documented reference for `food-restaurant`/`module_key: restaurant` per `.claudedocs/architecture/TEMPLATE_ROADMAP_VISION.md`
- [ ] **Catalog's Admin bypass** (`admin/restaurant.py`/`admin/store.py` calling `admin_catalog_repo` directly instead of `catalog_service.py`) — already named in `catalog.md`'s Open Findings, re-confirmed twice this session (Consistency Review + Schema Architecture Review); the Architecture Checkpoint Review's own recommended next priority, ahead of Restaurant's rollout since it directly unblocks it.
- [x] **Decide the fate of the dead admin CRUD scaffolding — CLOSED 2026-08-09.** `app/api/v1/admin/customers.py`, `prices.py`, `booking_services.py`, `listings.py` (all four confirmed unregistered in `admin/__init__.py`, zero other importers, zero frontend callers) — deleted as Repository Hygiene / dead-code cleanup, **not a security fix** (they were never reachable — see the correction entry in `.claudedocs/evolution/user-roles-permissions.md`'s 2026-08-09 correction, which had briefly mischaracterized this same finding as a live unauthenticated hole). Service/repo layer (`customer_service.py`, `price_service.py`, `booking_service_service.py`, `customer_repo.py`, `price_repo.py`) left untouched — `customer_repo`/`price_repo`/`price_service` remain live via other, already-secured paths. Evidence: `.claudedocs/work/orphaned-admin-routers-cleanup/2026-08-09/summary.md`. `app/api/v1/public.py` half of this item was already resolved 2026-08-06 (confirmed permanently unreachable, a same-named package shadows it, deleted while investigating an unrelated pair of 500s).
- [ ] **Service-type taxonomy consolidation** — 4 independent lists disagree today (`SERVICE_TYPE_MAP`, `service-system.md`, `ACTIVATABLE_KEYS`, `registration_service.py`'s own mapping); first logged 2026-07-27, reconfirmed with sharper precision 2026-07-29. Do this after the dead-scaffolding decision above, not before.
- [ ] **ADR-0005 candidate (bypass-pattern Principle → possible future ADR)** — deliberately deferred; Watchlist lives in `.claudedocs/evolution/capability-contracts.md`, tracking Site Configuration and Booking as the next Capabilities to check for a *converging solution*, not just another confirming instance of the same problem.
- [ ] **Payments — a named, real Integration-Capability gap** (`ADR-0004`) — cash-only today by the existing 2026-07-20 decision; no Investigation started, not scheduled ahead of the Restaurant → Store → Clinic sequence.
- [ ] **Restaurant's own Decisions Required** (from its 2026-07-29 Investigation) — whether/where to pilot a real table reservation, whether to schedule the Catalog bypass fix, whether Story Experience for Caracas is pursued at all right now — none decided yet.
- [x] **Barber — the 2nd real Reservation Strategy case — built + live-verified 2026-07-31, built independently of Clinic per Salman's explicit instruction** (own `Barber` table/migration/repo/admin route, no calls into `_resolve_resource`/`RESOURCE_BACKED_MODULE_KEYS`/`find_overlapping_by_resource`, tested against a fresh disposable `barberlab-test` tenant, never `hr`). Comparison + final decision in `.claudedocs/evolution/reservation-capability.md`'s 2026-07-31 entry: `_resolve_X()`/`find_overlapping_by_X()` turned out literally identical across both cases, but **Salman decided NOT to extract now** — the duplication is real but cheap, and extracting before the `type`-column question is settled risks re-shaping a helper that has exactly 2 consumers. Two concrete future triggers named instead: (1) a 3rd real case repeats the same `_resolve_X`/`find_overlapping_by_X` shape a third time, or (2) routine maintenance starts requiring edits to both the Clinic and Barber branches together more than once. Neither has happened yet.
- [ ] **Disposable `barberlab-test` tenant** (`scripts/seed_barber_arch_test.py`) — kept for now in case the comparison needs re-checking; safe to delete once no longer needed. Never touches `hr`/RK Barber Shop.
- [ ] **STANDING RULE: no `ReservationStrategy`/`ReservationProfile`/shared resolve-helper extraction, no `Resource`/`Barber` schema merge** — ratified 2026-07-31, `.claudedocs/evolution/reservation-capability.md`. Only revisit on one of the 2 named triggers above (3rd real case, or repeated dual-file maintenance pain) — not on a felt sense that "it's been a while."
- [x] **Reschedule — built and live-verified, closing the gap this item named** — `reservation_service.reschedule_reservation()` was renamed to `edit_reservation()` (Phase 3.2) and now backs both the drag-and-drop path and the admin `PATCH /{id}/reschedule` / `PATCH /{id}` routes, re-running Working Hours + Conflict Check against the new proposed time on every call. Exercised end to end via real drag-and-drop reschedules and the popover's mini-reschedule form throughout Phase 3.1-3.3.2 — ✅ Done, closed 2026-08-06 as part of the Reservation Calendar v1 closure above.
- [x] **`reservation_repo.py`'s `cancel()` and `update_status()` both 500'd — pre-existing bug, unrelated to the Clinic/Resource work — FIXED 2026-07-30** — both called `self.db.reservation.update_many(...)` then accessed `result.count`, but this Prisma Python client version (0.15.0, confirmed directly in `venv/lib/.../prisma/actions.py`) returns a plain `int` (the row count itself) from `update_many`, not an object with a `.count` attribute. Fixed both call sites to use the int directly. **A second, still-unfixed instance of the identical pattern exists at `app/repositories/dating_repo.py:53`** (`return result.count`) — confirmed via grep, not touched (out of scope for today's Reservation lifecycle work; the Dating module is unrelated). Two real test reservations (`Test Patient`/`Independence Test`, hr tenant, 2026-07-30) were left `pending` before this fix landed — cancel them now that `cancel()` works, or leave them (harmless, clearly labeled).
- [ ] **`dating_repo.py:53` — same `result.count` bug as reservation_repo.py, not yet fixed** (found 2026-07-30 while fixing the Reservation-side instance) — `return result.count` after `update_many()`, same root cause, different module. Not fixed — Dating module wasn't exercised this session, no reproduction attempted, purely a grep-confirmed pattern match.
- [ ] **`settings.py`'s exclusion from the admin router-level auth floor** (`app/api/v1/admin/__init__.py`, Authorization Hardening Phase 1, 2026-07-30) — deliberate, not an oversight: `settings.py` owns a Contract predating this fix (ADR-0002 §9.1's Soft-Block allowlist, `allow_during_soft_block` must run before any tenant/admin-user dependency in that route's own signature; a blanket router-level dependency executes before a route's own signature-declared ones, which would break that ordering). Open question for later, once Phase 2 settles: can `settings.py` be unified with the central floor without breaking that ordering guarantee (e.g. a variant of `get_authenticated_tenant` that also sets `soft_block_allowed` correctly) — so this doesn't quietly become a permanent, forgotten exception.
- [ ] **Least Privilege — never widen an administrative endpoint's role list to serve an operational need** (established 2026-07-30, `units.py`'s Authorization Hardening decision: `GET /admin/units` denied to `MANAGER_RESERVATIONS` even for read-only access, because the endpoint itself is an Administrative Unit Management view — inactive units included, admin-only display fields, full editorial content — not a lean "Unit Entity" a booking workflow needs). Standing principle Salman wants fixed for future Authorization Matrices: if an operational role needs a resource's data, build a new, narrowly-scoped operational endpoint for it — never expand an admin endpoint's allowed roles instead. Not yet promoted to a rules file (this is the first real instance) — per this project's own Abstraction Rule, revisit once a second independent case confirms it's a stable pattern, not a one-off. `app/api/v1/public/listings.py` noted as a possibly-relevant existing building block if/when such an endpoint is ever needed — not scheduled, not designed.
- [ ] **`dashboard.py`/`booking_repo.py` — pre-existing bug, unrelated to Authorization Hardening** (found 2026-07-30 while live-verifying Phase 1 against the `hr` tenant) — `GET /admin/dashboard/stats` 500s with `TypeError: Type <class 'datetime.date'> not serializable`, traced to `booking_repo.py:24`'s `count_by_client` passing a raw `datetime.date` into a Prisma query where clause. Confirmed unrelated to auth (the request reached real business logic before failing). Deliberately not touched during the security work — logged as its own independent ticket per Salman's explicit instruction not to let bug-fixing scope-creep into the security hardening session.
- [x] **`app/api/v1/admin/bookings.py`'s `POST /` create — FIXED 2026-07-31** (found 2026-07-31 while live-verifying the Authorization Hardening role matrix against `smar`) — `booking_service.py`'s `create_booking()` parsed `check_in`/`check_out` into real `datetime` objects (lines 29-30) but only used them for the availability check — the original raw `"YYYY-MM-DD"` strings were left in `booking_data`, which is what actually got sent to `booking_repo.create()`, causing `prisma.errors.MissingRequiredValueError` (`data.client` required but not set — a secondary artifact of the date field failing to parse, confirmed by this fix resolving both complaints together, not just the date one). Fixed: the parsed `check_in`/`check_out` are now written back into `booking_data` before `create()` is called. Live-verified: a real booking was created successfully (`id=bc890142-...`, cancelled afterward as cleanup) with correct `clientId`/`unitId`/`customerId`/`checkIn`/`checkOut` all persisted correctly.
- [ ] **⬆️ ELEVATED PRIORITY (not opened as Investigation/Refactor yet) — Response Serialization Pattern**: `bookings.py` and `properties.py` are no longer two separate bugs — they're 2 independent confirmed cases of the same root cause (Prisma's camelCase attributes vs. a Pydantic `response_model=` expecting snake_case). Per Salman's explicit call 2026-07-31: not a Booking/Property problem, possibly a project-wide pattern — but 2 cases isn't enough evidence to justify a structural fix yet. When this is picked up, the Investigation should answer: (1) how many endpoints use `response_model=` directly on a raw Prisma object (vs. the hand-written `_fmt()`/`_serialize()` pattern most other admin routes already use)? (2) does a unified mapper/alias approach exist or get invented? (3) is this confined to these 2 files or general? Only becomes a structural fix if the Investigation shows it's general — see the two entries below for the confirmed evidence so far.
- [ ] **⬆️ ELEVATED PRIORITY (not opened as Investigation/Refactor yet) — Prisma Client API drift (`order` vs `order_by`)**: `fleet_repo.py`/`samsara_event_repo.py` both use `order_by=` (rejected by this Prisma client version), while every other repo in the codebase uses `order=`. Per Salman's explicit call 2026-07-31: could be scoped to Fleet alone, or to every repository written in the same period — not investigated yet, no refactor opened. See the Fleet entry below for the confirmed evidence so far.
- [ ] **`app/api/v1/admin/restaurant.py`'s `create_item`/`update_item` (2 places) — same `metadata: meta if meta else None` bug already fixed in `store.py`, unfixed here** (found 2026-07-31 while fixing the Store version during the Store Template Pilot's Phase 3). Restaurant module, out of scope for the Store Pilot — logged, not touched.
- [ ] **Duplicate, disagreeing tenant-registration endpoints — found 2026-07-31 during Store Template Pilot Phase 3 prep**: `app/api/v1/public/registration.py`'s `POST /api/v1/public/register` has no `venue_type` field at all (silently falls through to `registration_service.register_new_tenant()`'s `data.get("venue_type", "real_estate")` default) — mounted, live, reachable, but NOT the endpoint the real frontend (`TenantRegisterPage.jsx`) actually calls (confirmed: that page calls `POST /api/v1/auth/register`, `app/api/v1/admin/auth.py`, which does have `venue_type`). Plausible real explanation for how `store-pilot-test-20260727` ended up with `service_type="ecommerce"` (Finding #7, `store-template-investigation-2026-07-31/investigation.md`) if whatever created it called the wrong endpoint. Not fixed — the dead/dangerous duplicate endpoint should probably be removed or given the same `venue_type` field, but that's a real code change out of scope for the Store Pilot itself. Logged for later.
- [ ] **`app/api/v1/admin/bookings.py`'s `POST /` response serialization — new bug, exposed by the fix above** (found 2026-07-31) — `response_model=BookingResponse` expects snake_case (`check_in`, `client_id`, `total_price`, `created_at`, etc.) but the raw Prisma `Booking` object is camelCase (`checkIn`, `clientId`, `totalPrice`, `createdAt`) — same root-cause *pattern* already logged for `properties.py`'s `GET /` (`PropertyResponse` vs raw `Property`), worth naming as a possible systemic issue across response models using `response_model=` with a Prisma object directly, though not verified beyond these two. Not fixed — the DB write itself is correct and confirmed working; only the POST route's HTTP response is affected (bookings.py's own hand-written `_serialize()` used by `PATCH /{id}/status` and `PATCH /{id}` works fine, since it isn't a Pydantic `response_model`).
- [x] **`app/api/v1/admin/properties.py`'s `POST /` create — FIXED 2026-07-31** (found 2026-07-31 while live-verifying the Authorization Hardening role matrix against `smar`) — `property_repo.py`'s `create()` passed `is_active` straight through, but the Prisma `Property` model's field name is `isActive` — Prisma rejected it (`createOneProperty.data.is_active: Field does not exist in enclosing type`), which also produced a secondary `data.client` complaint (same secondary-artifact pattern as the `bookings.py` fix above). Fixed: `create()` now remaps `is_active` → `isActive` before calling Prisma. Live-verified: a real property was created correctly (`isActive=True` persisted correctly), deleted afterward as cleanup (no admin DELETE route exists for properties, removed directly).
- [ ] **`app/api/v1/admin/properties.py`'s `GET /` AND `POST /` response serialization — confirmed to affect both routes, same pattern as `bookings.py`'s equivalent bug** (found 2026-07-31, POST confirmed affected by this same bug after the create-fix above exposed it) — `response_model=PropertyResponse` expects snake_case (`client_id`, `created_at`, `updated_at`) but the raw Prisma `Property` object is camelCase (`clientId`, `createdAt`, `updatedAt`); `populate_by_name=True` alone doesn't bridge that without an explicit alias/mapping step. **Side finding, not yet verified further**: `is_active`/`manager_id` have schema defaults (`True`/`None`), so a real `isActive=False` property would silently render as `is_active: true` in the API response instead of erroring — a data-correctness bug, not just a crash, though not separately confirmed against a real inactive property. Not fixed — same systemic pattern as `bookings.py`'s response-model bug; worth checking whether other `response_model=`-on-raw-Prisma-object routes share it before deciding on a general fix vs. per-file fixes.
- [x] **`fleet.py` — every route reads `tenant["client_id"]` — FIXED 2026-07-31** (found 2026-07-31 while building this file's role matrix) — `get_current_tenant()` (`app/core/tenant.py:203`) returns `{"id": str, "slug": str, "currency": str}`, never `client_id`. All 6 routes did `client_id = tenant["client_id"]` and raised `KeyError` on every real call, regardless of role. Fixed: all 6 now read `tenant["id"]`. Live-verified: `PATCH /alerts/{id}/read` and `DELETE /drivers/{id}/data` both now return clean 200s (previously KeyError 500). `GET /dashboard`/`/vehicles`/`/alerts` still 500, but for a *different*, newly-exposed bug — see below.
- [ ] **`fleet_repo.py:16` and `samsara_event_repo.py:78` — `find_many(order_by=...)` instead of `order=...`** (found 2026-07-31 while verifying the `client_id` fix above — the KeyError was firing before either of these ever ran, so this bug was invisible until now) — this Prisma client version doesn't accept `order_by` as a kwarg (every other repo in the codebase uses `order=`), so `GET /fleet/vehicles`, `GET /fleet/alerts`, and `GET /fleet/dashboard` (which calls both internally) still 500 with `TypeError: ...find_many() got an unexpected keyword argument 'order_by'`. Not fixed — separate ticket, same discipline as every other bug found this session.
- [x] **Store Template — "First Production Store" milestone, Investigation + Phase 3 Execution done 2026-07-31, Pilot gate pending** — full 4-phase treatment (Investigation → Verification Plan → Execution Plan → Risk Assessment) in `.claudedocs/work/store-template-investigation-2026-07-31/investigation.md`, per Salman's explicit instruction to treat Store like Clinic/Authorization Hardening. **Real root cause of the original 2026-07-27 pilot's block found and fixed**: `TenantRegisterPage.jsx` mapped `venue_type: "ecommerce"` for store-module templates, which has no entry in `registration_service.py`'s `_SERVICE_SEED_MAP` — a live bug in the only real self-registration path, not a one-off slip. Fixed, plus a 2nd bug (`admin/store.py`'s `metadata: None` 500 on every simple product, same root-cause pattern as today's `bookings.py`/`properties.py` fixes). A fresh tenant (`store-pilot-20260731`) registered correctly, scaffolded into `tenantRegistry` (a self-registered tenant has no cart-capable page otherwise — confirmed), 5 categories + 3 real products added via the real admin API. QR generation (`GET /admin/settings/qr`) and generalized WhatsApp order notification (`CartPage.jsx`, generalized from `beit-al-fakhar`'s proven logic — Salman's explicit decision: both in Definition of Done, not deferrable) both built and committed. Live-verified end to end at the API level (registration → services → categories → products → public listing → cart → checkout); frontend confirmed to parse/transform cleanly via Vite (no browser tool available in this environment to click through it). **Remaining, Pilot-closing gates only** (per Salman's own explicit sequencing — these close the milestone, they didn't block starting it): a real WhatsApp-capable number to replace the fixture's placeholder, and a physical phone QR scan. See the investigation doc's "Phase 3 Execution — Status" section for the full evidence trail.
- [ ] **Clinic (dental booking) template** (step 3) — not started, queued behind Store
- [ ] **`KanbanBoard.jsx`** (`frontend/src/pages/generic-admin/components/`) — confirmed dead code throughout the 2026-07-28 Capability Resolution Migration (no live render path anywhere), still contains the old wrong `moduleKey === 'catalog'` pattern the migration retired everywhere else. Deliberately left untouched (no way to get real verification for unwired code, per the End-to-End Verification Routine) — fix it if/when it's ever wired back into a real route.
- [ ] **Test data cleanup** — one real test reservation (`زائر تجربة Phase 5 نهائي`) and a real store-cart test item from the 2026-07-28 Capability Resolution Migration's final verification are still in the DB/localStorage; the cleanup script hit the known intermittent Supabase pooler connectivity on retry. Harmless, clearly-labeled test data — clean up whenever convenient.
- [ ] **Super Admin Dashboard build** — gate opened 2026-07-20 (`.claudedocs/decisions/2026-07-20-cash-only-billing.md`), design already exists (`SUPER_ADMIN_DASHBOARD_PLAN.md`), but queued behind all 3 templates per Salman's explicit sequencing — do not start early

- [ ] **TEST: Arizona + Caracas pages in browser** — `/arizona/home`, `/caracas/home`, `/caracas/special` (crossfade revert) — built and lint/transform/API-verified, never visually confirmed in an actual browser (no screenshot tool available in this environment)
- [ ] **beit-al-fakhar (formerly anas): real contact info** — owner needs to provide real WhatsApp number/address/hours (currently honest "قريباً" placeholders in `ContactSection.jsx`); admin login is now under the new slug post-rename
- [ ] **beit-al-fakhar: real customer reviews** — `ReviewsSection.jsx` intentionally shows "coming soon"; add once the owner has real testimonials
- [ ] **beit-al-fakhar: real per-item plate names/prices** — the 25 real `CatalogItem` rows imported 2026-07-20 use honest generic names ("طبق فخار مرسوم يدوياً رقم N") and `price=null` since no real per-item data exists yet — needs the shop owner, cannot be fabricated
- [x] **beit-al-fakhar: Bowls & Vases category populated** — 9 real photos from `/home/musicmaster/Downloads/anas/not main category/` imported as 9 real `CatalogItem` rows under Bowls & Vases (`scripts/import_beit_al_fakhar_bowls_vases.py`), same honest-naming/no-fabricated-price discipline as the Plates import. **Correction found by actually viewing every photo**: the user described the batch as covering 3 categories, but all 9 photos show vases or hand-painted bowls — none show mugs or figurines. Nothing was force-fit into the wrong category; Mugs and Decorative Figurines are still empty (0 items), waiting on real photos of those shapes — ✅ Done 2026-07-20
- [ ] **beit-al-fakhar: Mugs + Decorative Figurines categories still empty** — need real photos of those specific shapes (handled cups / sculptural pieces), not yet supplied
- [x] **beit-al-fakhar `/store` infinite loading spinner — real bug found and fixed, visually confirmed** — `useCatalog.js`'s `mountedRef` pattern never reset to `true` in the effect's setup, so React 18 StrictMode's dev-mode mount→cleanup→remount cycle permanently latched it to `false`; every subsequent `if (mountedRef.current)` guard silently no-op'd, so categories/items fetches succeeded but state updates were skipped forever. Found via direct headless Chrome + Chrome DevTools Protocol (no browser tool was available, so a real `google-chrome` binary was launched headlessly and driven via raw CDP websocket). Fixed, verified with a real screenshot showing all 4 category pills + all 25 real plate photos rendering — first time this session a UI claim was actually visually confirmed rather than inferred from API responses — ✅ Done 2026-07-21
- [ ] **bo-hussein.md routing table is stale: "Bug / Investigation → المحقق كونان"** (found 2026-07-21 while deciding whether to attribute the beit-al-fakhar `/store` investigation to konaan) — read `.claude/agent/المحقق كونان.md` directly: konaan is exclusively a WhatsApp-conversation-to-onboarding-JSON extractor (per `konaan-onboarding-schema.md`), with no bug-investigation capability described anywhere in the file. The routing table's "Bug / Investigation" line points to the wrong agent. Not fixed here — needs a real decision (does bo-hussein handle investigations directly, as happened 2026-07-21, or should a dedicated investigation agent be created per the Team Evolution process in bo-hussein.md?), not a silent one-line edit
- [ ] **Dead duplicate file: `frontend/src/pages/catalog/CatalogPage.jsx`** (found 2026-07-20 while investigating a beit-al-fakhar `/store` bug report) — an older, unimported duplicate of `frontend/src/pages/generic/normal/CatalogPage.jsx` (same creation date, superseded architecture — inline `CategoryPill` instead of the shared `design-system/molecules` one). Confirmed zero importers via grep. Not the cause of any live bug, but a real naming-collision/dead-code case, same category as the already-noted `frontend-architect.md`/`Frontend-Architect-Agent.md` collision — not deleted here since it wasn't asked for and isn't causing harm
- [ ] **`app/services/dating_service.py:91` — narrower version of the `Json?`-field-as-None bug** (found 2026-07-21 while sweeping for the `store_repo.py` shippingAddress bug's pattern elsewhere) — `"config": payload.get("config", {})`. The `{}` default only covers a *missing* key; if `payload["config"]` is explicitly `None`, the same `MissingRequiredValueError` this session just fixed in `store_repo.py` could fire. Not independently confirmed live (dating module wasn't exercised this session), not fixed — out of scope for the store-checkout bug this was found while investigating
- [ ] **beit-al-fakhar: Hero source video quality** — the working frame-sequence Hero uses a WhatsApp-quality video as its source; Salman will personally film/source better footage — not an agent task
- [ ] **beit-al-fakhar: rest of homepage** — Hero is one section; About/Gallery/WhyUs/Reviews/Contact and the Plates "Pattern Library" decoration system are still architecture/placeholder only
- [ ] **beit-al-fakhar: Pattern Library** — only 1 of 4 planned decoration variants (Blue Floral/Olive Branch/Arabesque/Modern Minimal) is budget-feasible right now (3 of 31 Higgsfield credits remain, 7 credits/generation) — needs a credit top-up before continuing
- [ ] **local-agent Phase 2** — WhatsApp Cloud API as an input layer in front of the same agent (deferred until Phase 1 proven with real Ollama)
- [ ] **Stale tenant-onboarding schema references** (found 2026-07-20 during tenant-seeder Service Contract review): `scripts/data/tenant_onboarding_template.json` (`_schema_version: "2.0"`, missing `design.module_key`) and `konaan-onboarding-schema.md`'s worked example (`"1.0"`, older flat-`services`/`client.primary_color` shape) both disagree with the real, currently-enforced schema — `.claude/skills/seeding/demo/01-parse-tenant-json.md` validates `_schema_version in ("2.0","2.1")` and requires `design.module_key` (v2.1). Neither reference file reflects v2.1; `tenant_onboarding_template.json` also points at a nonexistent `scripts/seed_new_tenant.py`. Update both reference files to match the real v2.1 shape.
- [ ] **local-agent Phase 3** — MySQL/SQL Server/POS/Odoo/Square plugins (placeholder folders only, per `plugins/{mysql,sqlserver,pos}/README.md`)
- [ ] **local-agent: `.claudelocaldocs/` full restructure** (architecture/roadmap/phases/decisions/research/logs subfolders) — explicitly deferred by user until architecture stabilizes
- [ ] **local-agent: repo split** (SalmanSaaS vs. standalone "Salman Local AI Runtime") — explicitly deferred by user
- [ ] **Showcase Homepage 3D Redesign** (per `new-matirial/قائمة المهام المحدثة_C.md`) — remove `CyberGrid.jsx` (cyberpunk look), replace with `Clouds`/`Fog`; wire `RoomEnvironment.jsx` into R3F Canvas at reduced brightness (~0.12); upgrade `BuildingTower.jsx` materials to `MeshPhysicalMaterial` for realistic glass
- [ ] **Phase 75-E: Railway cron** — `0 3 * * *` → `POST /api/v1/super/maintenance/cleanup-date-pages`
- [ ] **Phase 51 automation** — `POST /super/clients/{id}/seed-categories` endpoint, `PATCH /super/clients/{id}/settings` primary_color support, Higgsfield MCP orchestration layer (upload-to-Supabase + JSON config shaping — note: Higgsfield generation itself is already available via the connected MCP tools, only the orchestration/upload logic needs building)
- [ ] **Showcase HeroSection** — hero text repositioning so tower crown is visible above it
- [ ] **AI Integration Phase** — قرار: نبدأ بـ RAG chatbot للمطعم/المتجر — repo awesome-llm-apps محمّل
- [ ] **DemoLauncher navigation fix** — بعد الإنشاء يوجّه لـ `/{slug}/menu` (restaurant) أو `/{slug}/store` (store) بدل `/{slug}/home` دائماً
- [ ] **Phase 72 visual validation** — جرّب `localhost:5173/olivello/home`، تحقق olive size + slot positions
- [ ] **Phase 61 n8n wiring** — backend done، ينتظر: أين n8n شغّال + أي WhatsApp provider

### ADR-0002 (Tenant Lifecycle) — من مراجعة ما بعد التنفيذ (2026-07-18)
- [ ] **مراجعة يدوية: `footlab`/`caracas`/`olivello`** — `lifecycle_state` لا يزال بالقيمة الافتراضية `trial` رغم أنها تينانتات حقيقية `active` — يحتاج Super Admin يحدد القيمة الصحيحة عبر `PATCH /clients/{id}/lifecycle`
- [ ] **إشعار يدوي لـ9 تينانتات** حصلوا على grace period 5 أيام (`roz`, `magic-test`, `test-fashion`, `sneakers-beirut`, `cafe`, `test-catalog-fix`, `tastybites`, `sneakers-lb`, `assi`) — قبل **2026-07-23** (لا يوجد إشعار تلقائي بعد)
- [ ] **anas: ضبط `trial_ends_at` الفعلي** عند إطلاق الفترة التجريبية فعلياً — حالياً `null` (الحقل جاهز معمارياً لكن الساعة لم تبدأ)
- [ ] **دَين عملية موثَّق**: `scripts/migrate_lifecycle_state.py` نُفِّذ مباشرة على القاعدة الحية بدون staging أو snapshot صريح (لا يوجد أي منهما بالمشروع) — يجب إصلاح هذا قبل أي migration قادمة تلمس بيانات حية، انظر `.claudedocs/reviews/ADR-0002_POST_IMPLEMENTATION_REVIEW.md` §3
- [ ] **`dating` module** لا يزال يتجاوز الـtenant registry (static routes بـ`App.jsx` بدل `tenantRegistry`) — اكتُشف بـProject Status Audit، لم يُصلَح بعد
- [ ] **`.claudedocs/architecture/database_report.md`** قديم جداً (منذ 2026-05-05، يسبق توحيد Phase 54 — 29 model قديم مقابل 34 الحالي) — يحتاج regeneration كامل، لم يُلمَس عمداً لتفادي "false freshness"

### ADR-0002 Contract 02 (Subscription/Plan) — Tech Debt من الـPost-Implementation Review (2026-07-19)
- [ ] **إغلاق هيكلي (لا سلوكي فقط) لثغرة الـDual-Write**: حذف `SuperRepository.update_client_lifecycle_state()` (`app/repositories/super_repo.py`) بالكامل، وحذف `super_service.update_client_lifecycle_state()` المُعلَّمة كـsuperseded (`app/services/super_service.py`) — لضمان أن `subscription_service` هو المسار الوحيد هيكلياً لكتابة `Client.lifecycle_state`، لا سلوكياً فقط (لا مستدعٍ حالي، لكن الدالة لا تزال قابلة للاستدعاء)
- [ ] **مصدر الحقيقة عند التسجيل**: تعديل `registration_service.py` و`demo_service.py` لاستدعاء `subscription_service.assign_plan()` فوراً عند إنشاء تينانت جديد (اشتراك Trial) — لا يجب أن يوجد `Client` بدون صف `Subscription` مرافق، ليبقى Subscription مصدر الحقيقة المطلق فعلياً، لا نظرياً فقط (اكتُشف بـ`.claudedocs/reviews/ADR-0002_CONTRACT02_POST_IMPLEMENTATION_REVIEW.md` §6)

## 🟡 Upcoming (بالأولوية)

### Permanent Demo Tenant (added 2026-08-02, not scheduled, not urgent)

Idea from Salman, real motivating evidence not speculative: this session's Orders-tab review found a
raw QA test note and 4 fake `Pilot Verify`-style orders sitting in `hr`'s real live data. One
always-polished tenant (clean data, realistic bookings, organized products, full calendar) would
prevent this class of problem and give future UX evaluation a stable reference instead of scattered
test data. Most useful once Dashboard redesign (P3) and customer-page Product Readiness Review (P4)
start — see the 2026-08-02 5-priority breakdown in memory (`project_foundation_phase_closed.md`).
Not started.

### After First Pilot — Engineering Cleanup Sprint (added 2026-08-02, explicitly gated)

Not bugs — Technical Debt in the engineering system itself, surfaced as a side effect of the
Capability Reference Extraction + Agent Collaboration Map work
(`.claudedocs/architecture/AGENT_COLLABORATION_MAP.md`). Salman's explicit ruling: none of these are
worth interrupting Phase 3 (Capability Decisions) or the Pilot for. **Do not touch any of this before
the first real Pilot is done.**

- [ ] **Sync `CLAUDE.md`'s Agents index** — lists 7 of 13 real agents; missing entries mean a future
  agent works from incomplete information. Priority A (most important of the five).
- [ ] **Fix `memory-keeper.md`'s Step 1 path** — currently points at a Windows path that doesn't
  exist on this Ubuntu machine; a real invocation would look for memory in the wrong place. Priority
  A, simple fix.
- [ ] **Decide the `Frontend-Architect-Agent.md` vs `frontend-architect.md` duplication** — before
  merging or deleting either, first answer *why both exist*: if one is v1 and the other v2, archive
  the old one; if one is UX-focused and the other Architecture-focused, rename instead of merging.
  Immediate merge is a premature decision. Priority B.
- [ ] **Archive completed mission playbooks** — `dashboard-builder.md` and `generic-page-builder.md`
  read as finished Phase-56/57 blueprints, not standing agents (same shape as `Capability
  Extraction`'s own status). If confirmed unused going forward, move to `.claude/archive/` or
  `.claudedocs/history/` — never delete. Priority B.
- [ ] **Resolve `konaan-onboarding-schema.md` ownership** — `tenant-seeder.md` already enforces
  schema v2.1; this separate file still documents v1.0 as if it were the reference. Either
  `tenant-seeder` becomes the one official schema source, or `konaan-onboarding-schema.md` gets
  updated — the two must not keep disagreeing. Priority B.

**Also noted, deliberately not turned into anything**: Browser Verification Capability turned out to
surface more than product bugs this session — it (indirectly) revealed Documentation Drift, Agent
Drift, and Architecture Drift too. Salman's explicit call: this is a recognizable *task type* (call it
"Project Health Investigation" informally) any agent can run when real evidence warrants it — **not**
a new Capability, role, or layer. Nothing to build here, just a pattern worth recognizing next time it
shows up.

0. ✅ **Cross-tenant cart leak fix — Done 2026-07-25** — `useGenericStore.js` scoped by tenant
   slug + tenant-switch detection in `setConfig`; a real false-positive bug found while verifying
   it (loading-placeholder `slug: 'unknown'` looking like a tenant change) was also found and fixed
   same day. **Still uncommitted as of end of session 2026-07-25 — commit first thing next time.**
1. ✅ **Story Experience — قرار الإنتاج، حسم 2026-07-25** — سلمان راجع الـ lab وقرر: الفيديو نفسه
   يضل زي ما هو (frame-sequence canvas، الفريمات الحقيقية، نفس التوقيت)، بس الشغل الإضافي (about/
   services/products) صار teasers قصيرة (عنوان + سطر + CTA) على الـ chapters الموجودة أصلاً، مش
   chapters جديدة ومش معلومات كاملة. منفّذ فعليًا بـ `scripts/data/hr/page_content.json`.
2. RK Barber — الاسم العربي الحقيقي للمحل — لسا بانتظار العميل الحقيقي.
3. **RAG Chatbot per tenant** — يجاوب على أسئلة الزبائن عن القائمة/المنتجات — يستخدم awesome-llm-apps كـ reference
2. **Phase 73: Olivello .glb model** — real olive .glb + morph targets (squish/teardrop on scroll)
3. **Phase ~70: TenantTemplate table** — بدّل `page_templates/*.json` بجدول DB — Super Admin يدير من UI
4. **SOLAIS-style 3D scene** — `LogoBlocks.jsx` (انفجار مكعبات + camera path)

5. **`.claudedocs/SYSTEM_ARCHITECTURE_INDEX.md`** — ليس مجرد فهرس أسماء، بل خريطة علاقات بين الوثائق (مثال: ADR-0002 → TENANT_LIFECYCLE_PLAN + SUPER_ADMIN_DASHBOARD_PLAN → مستقبلاً PAYMENT_ARCHITECTURE_PLAN/NOTIFICATION_ENGINE_PLAN/REPORTING_PLAN) — طلب المستخدم صراحة كتحسين مستقبلي، يُبنى بعد أن يصبح عندنا 5-6 وثائق معمارية، ليس عاجلاً الآن (وثيقتان فقط حالياً: TENANT_LIFECYCLE_PLAN.md وSUPER_ADMIN_DASHBOARD_PLAN.md)

## Sprint 2 — Code Review Findings (مستقبلي)

- SEC-01: Fix plain-text password fallback in app/core/security.py
- SEC-02: Add race condition check in public_service.py (create_public_booking)
- SEC-04: Fix Customer.phone/email → @@unique([clientId, phone])
- BUG-01: get_client_catalog — except Exception → should raise 500
- BUG-02: create_public_booking — re-raise HTTPException first
- BUG-03: datetime.utcnow() → datetime.now(timezone.utc)
- BUG-04: Remove duplicate GET /{slug}/services endpoint
- BUG-05: Add publicApi.interceptors.response error handler
- PERF-01: N+1 query — replace per-service find_unique loop with find_many
- ARCH-02: Fix circular import in price_service
- SCHEMA-01: Add category field to GalleryImage + unify data source
- FE-01: Persist language state to localStorage in LanguageContext.jsx
- FE-02: Add ErrorBoundary wrapping App in App.jsx
