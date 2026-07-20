# Project Todo List — SalmanSaaS
# Last updated: 2026-07-20

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

## 🔴 عاجل — يحتاج تنفيذ يدوي

- [ ] **حذف المشروع القديم** — `gdzthjcvzvhfpsvoxhbm` — كل البيانات والصور انتقلت (يمكن الحذف الآن، لسا ما انحذف)
- [ ] **Cloudflare:** أضف `demo.salmansaas.com` كـ custom domain في Pages → Custom Domains (wrangler.toml جاهز، ينقص `wrangler login` + الخطوة اليدوية بالـ dashboard)
- [ ] **SEC-03 (partial):** Supabase service key + Resend API key — rotation يدوي في الداشبوردات
- [ ] **Mona page hosting** — `frontend/public/mona.html` جاهز — ارفعه على Netlify Drop أو Cloudflare Pages
- [ ] **`floor-video.mp4`** — حمّل dark-tech video من pexels.com → `frontend/public/videos/floor-video.mp4`
- [ ] **local-agent: install Ollama** — `ollama pull qwen2.5:7b` + `ollama serve` على جهاز المستخدم، ثم تحقق فعلي من `/agent/command` (كل الطبقات تحته متحقق منها، بس نداء الـ LLM نفسه لسا ما انجرب)

## 🟠 In Progress / Carry Forward

- [ ] **Restaurant template — visual confirmation in an actual browser** (`localhost:5173/demo/pilot-test-20260720`) — all 8 sections now resolve to real components and the CTA link is wired (verified via `GET /config`, matches the same "verified via API, never visually confirmed" gap already logged for Arizona/Caracas above); no screenshot tool available in this environment
- [ ] **Restaurant template — reference-quality sign-off** — once visually confirmed, `pilot-test-20260720` becomes the documented reference for `food-restaurant`/`module_key: restaurant`; only then does Store (step 2) start, per `.claudedocs/architecture/TEMPLATE_ROADMAP_VISION.md`
- [ ] **Store template** (step 2 of the roadmap) — not started, queued behind Restaurant sign-off
- [ ] **Clinic (dental booking) template** (step 3) — not started, queued behind Store
- [ ] **Super Admin Dashboard build** — gate opened 2026-07-20 (`.claudedocs/decisions/2026-07-20-cash-only-billing.md`), design already exists (`SUPER_ADMIN_DASHBOARD_PLAN.md`), but queued behind all 3 templates per Salman's explicit sequencing — do not start early

- [ ] **TEST: Arizona + Caracas pages in browser** — `/arizona/home`, `/caracas/home`, `/caracas/special` (crossfade revert) — built and lint/transform/API-verified, never visually confirmed in an actual browser (no screenshot tool available in this environment)
- [ ] **beit-al-fakhar (formerly anas): real contact info** — owner needs to provide real WhatsApp number/address/hours (currently honest "قريباً" placeholders in `ContactSection.jsx`); admin login is now under the new slug post-rename
- [ ] **beit-al-fakhar: real customer reviews** — `ReviewsSection.jsx` intentionally shows "coming soon"; add once the owner has real testimonials
- [ ] **beit-al-fakhar: real per-item plate names/prices** — the 25 real `CatalogItem` rows imported 2026-07-20 use honest generic names ("طبق فخار مرسوم يدوياً رقم N") and `price=null` since no real per-item data exists yet — needs the shop owner, cannot be fabricated
- [x] **beit-al-fakhar: Bowls & Vases category populated** — 9 real photos from `/home/musicmaster/Downloads/anas/not main category/` imported as 9 real `CatalogItem` rows under Bowls & Vases (`scripts/import_beit_al_fakhar_bowls_vases.py`), same honest-naming/no-fabricated-price discipline as the Plates import. **Correction found by actually viewing every photo**: the user described the batch as covering 3 categories, but all 9 photos show vases or hand-painted bowls — none show mugs or figurines. Nothing was force-fit into the wrong category; Mugs and Decorative Figurines are still empty (0 items), waiting on real photos of those shapes — ✅ Done 2026-07-20
- [ ] **beit-al-fakhar: Mugs + Decorative Figurines categories still empty** — need real photos of those specific shapes (handled cups / sculptural pieces), not yet supplied
- [ ] **Dead duplicate file: `frontend/src/pages/catalog/CatalogPage.jsx`** (found 2026-07-20 while investigating a beit-al-fakhar `/store` bug report) — an older, unimported duplicate of `frontend/src/pages/generic/normal/CatalogPage.jsx` (same creation date, superseded architecture — inline `CategoryPill` instead of the shared `design-system/molecules` one). Confirmed zero importers via grep. Not the cause of any live bug, but a real naming-collision/dead-code case, same category as the already-noted `frontend-architect.md`/`Frontend-Architect-Agent.md` collision — not deleted here since it wasn't asked for and isn't causing harm
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

1. **RAG Chatbot per tenant** — يجاوب على أسئلة الزبائن عن القائمة/المنتجات — يستخدم awesome-llm-apps كـ reference
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
