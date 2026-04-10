Project Memory & Execution Status

Global Directives

Zero Hallucination: Never invent variables. Use tools to read files.

Multi-Tenant Strictness: Every DB query MUST include clientSlug or tenantId.

UI Rules: Generic UI in src/components/, Tenant UI in src/pages/[tenant_name]/.

Architecture: Strict 4-Layer Architecture for both Backend (FastAPI) and Frontend (React/Vite).

---

# Beit Smar — Vision & Business Goals

منصة "بيت سمار" الرقمية — وثيقة التحول الرقمي الفاخر.
Turns a casual visitor into a confirmed booking through cinematic "wow" experiences
and a frictionless payment flow. Built with Awwwards-level frontend standards.

Business Goals (Priority Order):
1. زيادة المبيعات — Cinematic UI that makes the visitor *feel* luxury before they book
2. تقليل التكاليف التشغيلية — WhatsApp automation (n8n), smart admin inbox, 15-min soft-lock
3. تعزيز القيمة الدائمة للعالمة التجارية — Premium first impression justifies premium pricing

---

# Unit Categories (Beit Smar Fixed — 4 types)

| unit_type    | Count | Notes                                        |
|--------------|-------|----------------------------------------------|
| villa        | 3     | Luxury full-property units                   |
| chalet       | 12    | Individual chalet units                      |
| restaurant   | 1     | Mountain dining — WhatsApp contact only      |
| pool         | 1     | Infinity pool — WhatsApp contact only        |

DB Column: units.unit_type TEXT DEFAULT 'chalet'
Migration: prisma/migrations/add_unit_type.sql — run in Supabase SQL Editor (port 5432)
Decision: No separate categories table — 4 fixed types use a column, not a JOIN.

Back-fill example after migration:
  UPDATE public.units SET unit_type = 'villa'  WHERE unit_number IN ('V1','V2','V3');

---

# Second Supabase Project (Multi-Restaurant — SEPARATE)

Screenshot shows project "Mlti-Restaurant-AI" with store_products, store_orders, store_categories etc.
This is a DIFFERENT SaaS product. Do NOT mix with Beit Smar schema.

---

# Backend Status (FastAPI/Prisma) — ✅ COMPLETED + unit_type added

Phase 1 Foundation: TTL Cache, Centralized Exception Handling, Auth/Roles.
Phase 2 Core Features: Availability Calendar, WhatsApp Webhook State Machine.
Phase 3 Polish: Pagination, asyncio.gather, BackgroundTasks for WhatsApp notifications.

2026-04-10 Changes:
  - prisma/schema.prisma: Unit model gets unit_type TEXT DEFAULT 'chalet'
  - app/repositories/unit_repo.py: get_all_by_client() with unit_type + exclude_ids params
  - app/services/public_service.py: get_client_catalog() accepts unit_type param, filters at DB level,
    now returns bedrooms/bathrooms/image_url1-5 in response
  - app/api/v1/public.py: GET /client/{slug}/units accepts ?type=villa|chalet|restaurant|pool

---

# Frontend Status (React/Vite) — 🟡 IN PROGRESS

✅ Architecture Audit & Restructure: 4-Layer (data, domain, components, pages).
✅ Smar Normal Flow: SmarListingsPage, SmarPaymentPage, SmarUnitModal, SmarBookingDrawer.
✅ Smar Spatial: SpatialHomePage, SpatialPropertyDetails (cinematic video + booking panel).
✅ Routing: Registry-based lazy routing. smar.routes.jsx wired.
✅ Phase 7.1: HeroSection — SMAR logo entrance + shrink to nav (sections/HeroSection.jsx)
✅ Phase 7.2: VillaSection — full-bleed frontveiwvilla.png + GS MAR heritage text panel (sections/VillaSection.jsx)
✅ Phase 7.3: SmarPage rebuild — R3F Canvas removed, pure HTML/CSS ScrollTrigger, 500vh spacer

🔲 Phase 7.4: AmenitiesSection (Cafeteria + Pool layers)
🔲 Phase 8: MountainBackground (5 SVG ridge layers, stars, sky gradient)
🔲 Phase 9: Expand useSmarStore (activeCategory, expandedUnit, openUnit, closeUnit)
🔲 Phase 10–15: Full Mountain Pyramid orchestration

---

# API Contract (Frontend ↔ Backend)

GET /api/v1/public/client/{slug}/units
  Query: checkIn, checkOut, guests, type (villa|chalet|restaurant|pool)
  Response per unit: id, unit_type, name_ar, name_en, description, capacity,
                     bedrooms, bathrooms, image_url, image_url1..5, position_x, position_y

POST /api/v1/public/client/{slug}/book
  Body: unit_id, customer_name, customer_phone, check_in, check_out, guests, services[]

---

# Key Architectural Decisions

- unit_type column (not table) for Beit Smar — 4 fixed types, no JOIN needed
- R3F Canvas removed from SmarPage temporarily (Phase 7.3) — re-added in Phase 15
- Booking funnel routes are direct imports (not lazy) — no WebGL weight
- RTL-aware BookingDrawer — slides from left (Arabic) or right (English)
- SmarListingsPage reads ?type from URL params — pre-selects filter pill
- SmarPaymentPage has guard — redirects to /listings if accessed without state

---

# Asset Locations (Supabase Storage)

Bucket: properties/beitsmar/
  homepage/frontveiwvilla.png     ← VillaSection hero image
  homepage/mountain.jpg           ← future background
  amenities/amenity1.jpg          ← pool
  amenities/amenity2.jpg          ← restaurant
  amenities/amenity3.jpg          ← exterior
  videos/{unit_id}.mp4            ← SpatialPropertyDetails cinematic video
