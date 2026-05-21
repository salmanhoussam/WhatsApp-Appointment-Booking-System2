# Project Todo List — SalmanSaaS
# Last updated: 2026-05-18

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

## 🔴 عاجل — يحتاج تنفيذ يدوي

- [ ] **Cloudflare:** أضف `demo.salmansaas.com` كـ custom domain في Pages → Custom Domains
- [ ] **SEC-03 (partial):** Supabase service key + Resend API key — rotation يدوي في الداشبوردات
  - JWT_SECRET_KEY + SECRET_KEY + ONBOARDING_SECRET: ✅ rotated 2026-05-18

## 🟠 In Progress / Carry Forward

- [ ] **Olivello deploy** — git push → Railway/Vercel + smoke test `/olivello/home`
- [ ] **Phase 67 — اختبار يدوي** — افتح `/{slug}/dashboard` → "محرر الصفحة"، تحقق من 3 panels + interactions + toast
- [ ] **Phase 61 n8n wiring** — backend done، ينتظر: أين n8n شغّال + أي WhatsApp provider
- [ ] **ARCH-01 admin routes** — ~21 ملف admin لا تزال تستخدم prisma_client مباشرة

## 🟡 Upcoming (بالأولوية)

1. **Phase 70F** — `/impeccable polish` على olivello showcase بعد اكتمال الـ 7 sections
2. **Phase 68: DemoLauncher.jsx + `POST /demo/create`** — زر "جرّب مجاناً" → tenant مؤقت 7 أيام
3. **Phase ~70: TenantTemplate table** — بدّل `page_templates/*.json` بجدول DB — Super Admin يدير من UI
4. **SOLAIS-style 3D scene** — `LogoBlocks.jsx` (انفجار مكعبات + camera path)

## Upcoming (مستقبلي)

- n8n workflow: Konaan → webhook → WhatsApp AI settings
- footlab page_type → store: redirect fix من `/demo/footlab`

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
