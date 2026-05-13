# Project Todo List — Beit Smar / Salman SaaS
# Last updated: 2026-05-13

## Completed Phases

- Phase 1–23: WebGL / 3D / State / Canvas foundation — COMPLETED
- Phase 24–29: Spatial scroll & animations — COMPLETED
- Phase 30.1: ShowcaseTemplate — GSAP Z-Axis 6-station cinematic — COMPLETED
- Phase 31: Backend API — FastAPI routes, Prisma schema, Supabase connection — COMPLETED
- Phase 32: TenantConfig Auto-Seed — 404 fix for `/config` endpoint — COMPLETED
- Phase 33: FEAT-01 Login Modal — Glassmorphism overlay, Guest + Admin entry points — COMPLETED
- Phase 34.1: TenantHeader User Icon — lucide-react User button triggers LoginModal — COMPLETED
- Phase 34.2: organisms/index.js — LoginModal barrel export added — COMPLETED
- Phase 34.3: Standardized Agent Frontend Architecture Docs — COMPLETED
- Phase 40: Auth Evolution A→D — bcrypt backfill, GlobalAuthModal, SSO, RBAC — COMPLETED
- Phase 41: Auth Production Hotfixes — useAdminRole, Login.jsx endpoint, subdomain routing — COMPLETED
- Phase 42: Tailwind v3 CDN vs v4 Build Conflict — blank pages fix — COMPLETED
- BUG-01: Admin Dashboard Stats 500 Error — Prisma date type mismatch — FIXED
- BUG-02: Customer CRM Linkage Failure — cross-tenant phone lookup — FIXED
- BUG-03: Bookings Tab Empty Table — response shape mismatch — FIXED

## Completed Phases (continued)

- Phase 52: Self-Service Onboarding (TenantRegisterPage + GenericAdminDashboard + CatalogTab) — ✅ Done 2026-05-08
- Phase 53: Image Upload (`POST /admin/upload` + `useImageUpload.js`) — ✅ Done 2026-05-05
- Phase 54: DB Unification (menu+store → catalog, 29→23 tables) — ✅ Done 2026-05-05
- Phase 56-A/B/C/D/E: Dashboard v2 (OverviewTab + Activity Feed + ReservationsTab + mobile) — ✅ Done 2026-05-08/09
- Phase 59 + 60-A: Template Picker System + Dashboard Live Preview — ✅ Done 2026-05-11 (commit: ed2661b)
- Phase 60-B: TemplatePicker saves to DB via persistToDb() — ✅ Done 2026-05-13
- Phase 61: WhatsApp AI Settings Agent endpoint — ✅ Backend done 2026-05-13

## In Progress / Carry Forward

- [ ] **COMMIT + PUSH** — 8 agent files + Phase 60-B + Phase 61 + skills + SpatialHomePage (nothing committed since ed2661b)
- [ ] **Deploy to Railway** — after commit
- [ ] **PRODUCT.md + DESIGN.md** — required by impeccable skill at project root
- [ ] **Phase 61 n8n wiring** — backend done, n8n workflow not built yet
- [ ] **Footlab SpatialHomePage polish** — product strip below pinned area (needs real API test)

## Upcoming

- Phase 62: Footlab store migration (catalog API wiring + CartPage + checkout)
- Phase 63: Caracas restaurant migration (catalog API wiring + order flow)
- ARCH-01: Prisma calls in Routes/Auth files (20 files) — Phase 60+ refactor
- PRODUCT.md + DESIGN.md creation for impeccable context loading
- n8n workflow: Konaan → webhook → WhatsApp AI settings

## Sprint 2 — Code Review Findings (all Pending)

- SEC-01: Fix plain-text password fallback in app/core/security.py
- SEC-02: Add race condition check (find_first conflict check) in public_service.py
- SEC-03: Rotate ALL credentials in .env — URGENT (exposed in ZIP)
- SEC-04: Fix Customer.phone/email from global @unique → @@unique([clientId, phone])
- BUG-01: get_client_catalog — except Exception returns None, should raise 500
- BUG-02: create_public_booking — same, re-raise HTTPException first
- BUG-03: datetime.utcnow() → datetime.now(timezone.utc) in public_service.py
- BUG-04: Remove duplicate GET /{slug}/services endpoint
- BUG-05: Add publicApi.interceptors.response error handler
- PERF-01: Fix N+1 query — replace per-service find_unique loop with find_many
- ARCH-01: Replace direct prisma_client in routes with Depends(get_db)
- ARCH-02: Fix circular import in price_service
- SCHEMA-01: Add category field to GalleryImage model + unify data source
- FE-01: Persist language state to localStorage in LanguageContext.jsx
- FE-02: Add ErrorBoundary wrapping App in App.jsx
