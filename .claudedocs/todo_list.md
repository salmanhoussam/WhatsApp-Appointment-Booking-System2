# Project Todo List — Beit Smar / Salman SaaS
# Last updated: 2026-04-24

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

## In Progress

- Phase 30 (remaining tasks): ShowcaseTemplate → wire to DB assets (30.2–30.5)
  - 30.2: Asset preparation (user task — upload to Supabase)
  - 30.3: DB Migration — homepage_assets + social_links
  - 30.4: Backend — return homepage_assets in /config
  - 30.5: Frontend — wire ShowcaseTemplate to useTenantConfig

- Phase 35: Backend Config Endpoint + Smar Migration
  - 35.1: GET /api/v1/public/{slug}/config
  - 35.2: Smar migration to ShowcaseTemplate
  - 35.3+: remaining tasks

## Upcoming

- Phase 36: components/ Folder Cleanup — Tech Debt (delete 13 orphan components)
- Phase 37: ShowcaseTemplate Portrait Mobile Optimization
- Phase 38: Admin Settings — homepage_assets Editor
- Phase 39: Gallery Page — /smar/gallery (Masonry Grid + Lightbox)

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
