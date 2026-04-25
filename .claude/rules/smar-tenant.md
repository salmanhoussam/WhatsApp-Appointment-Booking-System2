paths: "src/pages/smar/**" "src/router/tenants/smar*" "app/**" "prisma/**"

# Smar Tenant — Complete Reference

## 1. Identity & Config

| Field | Value |
|---|---|
| slug | `smar` |
| name_ar | بيت سمار |
| name_en | Beit Smar |
| primary_color | `#d4a853` (gold) |
| Supabase storage folder | `beitsmar/` (slug→folder mapping in `public_service.py`) |
| domain | `smar.salmansaas.com` |
| unit types | `villa`, `chalet`, `restaurant`, `pool` |
| payment methods | `cash`, `card`, `whatsapp`, `whish`, `omt` |

---

## 2. Route Map

File: `src/router/tenants/smar.routes.jsx`

| URL path | Component | Load | Notes |
|---|---|---|---|
| `/smar` | → redirect | — | → `showcase` (relative, not absolute) |
| `/smar/*` | → redirect | — | catch-all → `showcase` |
| `/smar/showcase` | `ShowcaseTemplate` | lazy | GSAP Z-axis cinema, default landing |
| `/smar/listings` | `ListingsTemplate` | direct | no FM scroll hooks, safe to import directly |
| `/smar/gallery` | `SmarGalleryPage` | lazy | AnimatePresence lightbox |
| `/smar/spatial` | `SpatialHomePage` | lazy | FM scroll — MUST be lazy (FM12 rule) |
| `/smar/spatial/property/:id` | `SpatialPropertyDetails` | lazy | cinematic video + booking panel |
| `/smar/challet` | `ChalletDemo` | lazy | static challet HTML demo preview |
| `/smar/ring` | `SmarLiquidRing` | lazy | WebGL liquid ring hero |
| `/smar/admin` | `SmarAdminDashboard` | lazy + `ProtectedRoute` | JWT required |

### CRITICAL — FM12 Rule
Any page using `useScroll`, `useTransform`, or any FM `MotionValue` binding **MUST** be lazy-loaded.  
A direct import executes the module at chunk-load time → FM12 crash in React 19 StrictMode → blank `div#root`.  
`PageFallback` = gold pulsing dot on `#0a0a0f` background.

---

## 3. Frontend Component Map

### `src/pages/smar/`

#### `canvas/` — WebGL / R3F layer
| File | Purpose |
|---|---|
| `Scene3D.jsx` | Root R3F Canvas scene (currently removed from SmarPage per Phase 7.3 — re-added Phase 15) |
| `CameraManager.jsx` | R3F camera animation controller |
| `FloatingRings.jsx` | Animated floating ring meshes |
| `CollageScene.jsx` | Photo collage 3D scene |
| `MountainBackground.jsx` | 5-SVG-ridge mountain background (Phase 8 target) |

#### `sections/` — Content sections for SmarPage (HTML/CSS ScrollTrigger)
| File | Purpose |
|---|---|
| `HeroSection.jsx` | SMAR logo entrance + shrink-to-nav animation (Phase 7.1 ✅) |
| `VillaSection.jsx` | Full-bleed `frontveiwvilla.png` + GS MAR heritage text panel (Phase 7.2 ✅) |
| `ShowcaseCards.jsx` | Card grid for showcasing units |
| `AmenitiesSection.jsx` | Cafeteria + Pool layers (Phase 7.4 🔲) |

#### `ui/` — Fixed overlays & interaction components
| File | Purpose |
|---|---|
| `Preloader.jsx` | Page entry preloader animation |
| `SmarBookingDrawer.jsx` | RTL-aware booking drawer (slides left for Arabic, right for English); has date validation guard |
| `SmarUnitModal.jsx` | Unit detail modal |
| `SmarWhatsAppButton.jsx` | Floating WhatsApp CTA button |

#### `showcase/` — Demo & special FX pages
| File | Purpose |
|---|---|
| `ChalletDemo.jsx` | Embeds static `challet.html` via `srcDoc` (bypasses React Router static serving issues) |
| `ShowcaseHUD.jsx` | HUD overlay for the showcase view |
| `SmarLiquidRing.jsx` | WebGL liquid ring hero (experimental) |

#### `spatial/` — Immersive / cinematic pages
| File | Purpose |
|---|---|
| `SpatialHomePage.jsx` | Z-axis kinetic gallery, Framer Motion `translateZ` + scroll |
| `SpatialPropertyDetails.jsx` | Cinematic video player + chapter timestamps + booking panel |
| `SmarHero.jsx` | 2.5D parallax hero (4-layer CSS/FM effect) |
| `SmarHeader.jsx` | Spatial navigation header |
| `SmarWebGLHero.jsx` | WebGL-backed hero variant |
| `SmarTimelineGallery.jsx` | Timeline-based gallery scroll |
| `i18n.js` | Arabic/English string map for spatial pages |

#### `gallery/`
| File | Purpose |
|---|---|
| `SmarGalleryPage.jsx` | Image lightbox gallery — AnimatePresence transitions; category inference: images 1-3→chalet, 4-6→nature, 7-9→pool, 10-12→chalet |

#### `admin/`
| File | Purpose |
|---|---|
| `SmarAdminDashboard.jsx` | Root admin layout, JWT-gated |
| `UnitFormModal.jsx` | Create/Edit unit modal (Block Builder fields) |
| `components/ActionInbox.jsx` | Booking requests inbox |
| `components/ServicesTab.jsx` | Add-on services management |
| `components/SettingsTab.jsx` | Tenant config settings panel |
| `components/TeamTab.jsx` | Staff/team management |

#### `store/`
| File | Purpose |
|---|---|
| `store/useSmarStore.js` | Zustand store — `scrollProgress (0→1)`, `activeSection ('hero'|'architecture'|'gardens'|'pool'|'cta')`, `isCanvasLoaded` |

#### Root
| File | Purpose |
|---|---|
| `SmarPage.jsx` | Main SmarPage — pure HTML/CSS ScrollTrigger shell (500vh spacer), R3F Canvas removed Phase 7.3 |

---

## 4. Backend — Smar-Specific

### API Endpoints (public)
```
GET  /api/v1/public/client/smar/units
     ?checkIn=  &checkOut=  &guests=  &type=villa|chalet|restaurant|pool

POST /api/v1/public/client/smar/book
     { unit_id, customer_name, customer_phone, check_in, check_out, guests, services[] }
```

### `app/services/public_service.py` — Smar defaults
- Slug→folder mapping: `"smar": "beitsmar"`
- Auto-creates the `Client` DB row if missing (`slug == "smar"`) with:
  - `primary_color: "#d4a853"`
  - Hero video URL
  - Payment methods: `['cash', 'card', 'whatsapp', 'whish', 'omt']`
  - Unit types: `['villa', 'chalet']`
- `get_client_catalog()` returns per-unit: `id, unit_type, name_ar, name_en, description_ar, description_en, capacity, bedrooms, bathrooms, images[], content_blocks, amenities, rules_policies, position_x, position_y`

### `app/core/config.py`
- CORS origins include `https://smar.salmansaas.com`

---

## 5. Database — Smar Models

### `Client` row (seed)
```
slug='smar'  name_en='Beit Smar'  name_ar='بيت سمار'
primary_color='#d4a853'  unit_types=['villa','chalet']
payment_methods=['cash','card','whatsapp','whish','omt']
features: spatial, listings, booking, payment (all enabled)
```

### `Unit` model fields (relevant to smar)
```
unit_type     TEXT DEFAULT 'chalet'   # villa | chalet | restaurant | pool
category      String?                  # filterable classification
description_ar String?
description_en String?
content_blocks Json?                   # Block Builder [{type, content, style?, icon?}]
amenities      Json?                   # [{icon, label, label_ar?}]
rules_policies Json?                   # {checkIn, checkOut, cancellation, rules[]}
```

### Unit counts (Beit Smar)
| type | count | notes |
|---|---|---|
| villa | 3 | V1, V2, V3 — luxury full-property |
| chalet | 12 | Individual chalet units |
| restaurant | 1 | Mountain dining — WhatsApp contact only |
| pool | 1 | Infinity pool — WhatsApp contact only |

### Migration files
- `prisma/migrations/add_unit_type.sql` — adds `unit_type` column, back-fills villas
- `prisma/migrations/add_tenant_config.sql` — creates `tenant_configs` table, seeds smar row

---

## 6. Supabase Storage

Bucket: `properties`

```
properties/beitsmar/
├── homepage/
│   ├── frontveiwvilla.png     ← VillaSection hero
│   └── mountain.jpg           ← future MountainBackground
├── amenities/
│   ├── amenity1.jpg           ← pool
│   ├── amenity2.jpg           ← restaurant
│   └── amenity3.jpg           ← exterior
└── videos/
    └── {unit_id}.mp4          ← SpatialPropertyDetails cinematic video
```

---

## 7. Design System

### Colors
| Token | Value | Usage |
|---|---|---|
| Gold | `#d4a853` | Primary CTA, highlights, preloader dot |
| Dark BG | `#0a0a0f` | Page background |
| Glass | `rgba(255,255,255,0.05)` | GS MAR glassmorphism panels |

### Animation Presets (Framer Motion)
```js
Premium Spring:  { type: "spring", stiffness: 70,  damping: 20, mass: 1.5 }
Snappy Spring:   { type: "spring", stiffness: 300, damping: 25, mass: 0.5 }
Smooth Spatial:  { type: "spring", stiffness: 60,  damping: 20, mass: 1   }
```

### 2.5D Parallax Layers (SmarHero)
| Layer | z-index | Move range | Notes |
|---|---|---|---|
| Sky | z-0 | `[0, 50]` | slowest |
| Text Behind | z-10 | `[0, 200]` | mix-blend-overlay |
| Cutout PNG | z-20 | rises to 0vh then fades | no background |
| Foreground | z-30 | `[0, -50]` | fastest, moves up |

---

## 8. Phase Status

| Phase | Description | Status |
|---|---|---|
| 7.1 | HeroSection — SMAR logo entrance + shrink to nav | ✅ Done |
| 7.2 | VillaSection — full-bleed image + GS MAR text panel | ✅ Done |
| 7.3 | SmarPage rebuild — R3F removed, pure HTML/CSS ScrollTrigger | ✅ Done |
| 7.4 | AmenitiesSection (Cafeteria + Pool layers) | 🔲 Pending |
| 8 | MountainBackground (5 SVG ridge layers, stars, sky gradient) | 🔲 Pending |
| 9 | Expand useSmarStore (activeCategory, expandedUnit, openUnit, closeUnit) | 🔲 Pending |
| 10–15 | Full Mountain Pyramid orchestration + R3F Canvas re-integration | 🔲 Pending |

---

## 9. Key Architectural Decisions

- `unit_type` column (not table) — 4 fixed types, no JOIN needed
- R3F Canvas removed from `SmarPage` in Phase 7.3 — will be re-added in Phase 15
- Booking funnel routes (`listings`, `book`) are direct imports — no WebGL weight
- RTL-aware `SmarBookingDrawer` — slides from left (Arabic) or right (English)
- `SmarListingsPage` reads `?type` from URL params — pre-selects filter pill
- `SmarPaymentPage` has guard — redirects to `/listings` if accessed without state
- `ChalletDemo` uses `srcDoc` to embed static HTML — bypasses Vite static routing
- Slug→storage folder is `smar`→`beitsmar` (handled in `public_service.py`)
