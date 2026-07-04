# Project Todo List — SalmanSaaS
# Last updated: 2026-06-29

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
- New workflow rule: .claudedocs/plans/phase-XY.md per phase, per-agent division — ✅ Done 2026-05-21
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
- Python venv + Prisma setup (post-format) — venv, requirements, prisma generate, start_dev.bat — ✅ Done 2026-06-29
- Memory system initialized — 8 files in projects/memory/ — ✅ Done 2026-06-29
- Mona Page Screen 0 — German travel story, staggered reveal, globe animation — ✅ Done 2026-06-29
- Phase 75-A: DatePage DB model + dating_repo + dating_service + dating router + maintenance cron — ✅ Done 2026-06-30
- Showcase canvas black screen fix (100vw×100vh wrapper) + GLSL pow() clamp — ✅ Done 2026-06-30
- Saudi glass tower shader (4×20 curtain-wall, golden frames) + RoomEnvironment CSS photo layer — ✅ Done 2026-06-30
- Page structure pivot: Hero→400vh zoom→content (tower IS the hero) — ✅ Done 2026-06-30

## 🔴 عاجل — يحتاج تنفيذ يدوي

- [ ] **حذف المشروع القديم** — `gdzthjcvzvhfpsvoxhbm` — كل البيانات والصور انتقلت ✅ (يمكن الحذف الآن)
- [ ] **Install Git** — `winget install Git.Git` — needed for deploy workflow (post-format)
- [ ] **`cd frontend && npm install`** — frontend packages not installed yet (post-format)
- [ ] **`python -m prisma db push`** — 5 schema changes معلّقة: `Client.tier` + OccasionCreator + OccasionPage + OccasionRSVP + DatePage (Railway subscription lapsed) — لا تستخدم `npx prisma` على هذا الجهاز
- [ ] **Cloudflare:** أضف `demo.salmansaas.com` كـ custom domain في Pages → Custom Domains
- [ ] **SEC-03 (partial):** Supabase service key + Resend API key — rotation يدوي في الداشبوردات
- [ ] **Mona page hosting** — `frontend/public/mona.html` جاهز — ارفعه على Netlify Drop أو Cloudflare Pages
- [ ] **`floor-video.mp4`** — حمّل dark-tech video من pexels.com (search: "dark technology screen") → احفظه في `frontend/public/videos/floor-video.mp4`

## 🟠 In Progress / Carry Forward

- ✅ Done 2026-07-02 — **Moments Module full-stack** (4 backend files + 4 frontend files + routing registry)
- ✅ Done 2026-07-02 — **Scroll-Video FLOOR_04** (RoomEnvironment videoSrc/videoRef props + RAF scrub loop in HomePage)
- ✅ Done 2026-07-02 — **Pricing Tiers** (Regular $15 / Pro $22 / Ultra $35 — documented in PRODUCT.md + schema + service-system + memory)
- ✅ Done 2026-07-01 — **Showcase tower extended to 5 floors** (Video #a855f7 y=-6, Romance #e11d48 y=-12, 15-waypoint camera, VideoGenerationCard, RomanceDateCard, 5 HUD dots, 560vh void)
- ✅ Done 2026-07-01 — **Marketing page integrated** — `frontend/src/pages/marketing/` (18 files from Home-Page-main), `/marketing` route, demo links per service
- ✅ Done 2026-07-01 — **Design Intelligence System** — PRODUCT.md + DESIGN.md rebuilt (OKLCH, GS MAR tokens, absolute bans), gs-mar-components.md (10 recipes), frontend-architect.md upgraded to builder protocol
- ✅ Done 2026-07-01 — **Marketing page full redesign** — 5 sections rebuilt (ProblemSolution, WorkflowDemo, UseCases, Trust, CTA) + FAQSection added. GS MAR: dark bg #060b18, Space Mono labels, Cairo headings, FM spring animations, RTL dir attribute. Competitor best: before/after (مستقل), 3-step flow (Fiverr), category grid (خمسات), stats+testimonials (Upwork), FAQ accordion (Fiverr). REMOVED: gradient text ban violation in TrustSection.
- [ ] **TEST: Showcase canvas** — open `localhost:5173/showcase`, confirm 5 floors visible (after scroll-video revert)
- [ ] **TEST: Restaurant pages** — `localhost:5173/caracas/menu` + `localhost:5173/arizona/menu` — تحقق المنيو ظاهر مع الصور المنقولة
- [ ] **Phase 75-B: DatingTemplate** — HeroSection + StorySection + ConfirmSection (running "لا" button) — `frontend/src/pages/dating/`
- [ ] **Phase 75-C: DatingCreatePage** — multi-step form (5 steps) — `frontend/src/pages/dating/DatingCreatePage.jsx`
- [ ] **Phase 75-D: ntfy test** — subscribe to `ntfy.sh/salman-dating-2026` on phone → test notification
- [ ] **Phase 75-E: Railway cron** — `0 3 * * *` → `POST /api/v1/super/maintenance/cleanup-date-pages`
- [ ] **`python -m prisma db push`** — DatePage model → Railway DB (new from 2026-06-30)
- [ ] **Showcase HeroSection** — hero text repositioning so tower crown is visible above it
- [ ] **AI Integration Phase** — قرار: نبدأ بـ RAG chatbot للمطعم/المتجر — repo awesome-llm-apps محمّل
- [ ] **DemoLauncher navigation fix** — بعد الإنشاء يوجّه لـ `/{slug}/menu` (restaurant) أو `/{slug}/store` (store) بدل `/{slug}/home` دائماً
- [ ] **Phase 72 visual validation** — جرّب `localhost:5173/olivello/home`، تحقق olive size + slot positions
- [ ] **Phase 61 n8n wiring** — backend done، ينتظر: أين n8n شغّال + أي WhatsApp provider

## 🟡 Upcoming (بالأولوية)

1. **RAG Chatbot per tenant** — يجاوب على أسئلة الزبائن عن القائمة/المنتجات — يستخدم awesome-llm-apps كـ reference
2. **Phase 73: Olivello .glb model** — real olive .glb + morph targets (squish/teardrop on scroll)
3. **Phase ~70: TenantTemplate table** — بدّل `page_templates/*.json` بجدول DB — Super Admin يدير من UI
4. **SOLAIS-style 3D scene** — `LogoBlocks.jsx` (انفجار مكعبات + camera path)

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
