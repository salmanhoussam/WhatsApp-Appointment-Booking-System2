# Frontend Routing Architecture — Multi-Tenant System
# Source: frontend/docs/architecture.md (updated to reflect current live state)

## Overview

Every tenant (e.g. `smar`, `vila`) gets its own isolated folder and routes file.
The router reads the URL slug and dynamically loads the correct tenant experience —
`App.jsx` and `TenantResolver.jsx` never need modification when adding a new tenant.

---

## Folder Structure (Current)

```
src/
├── App.jsx                          ← Root router (static routes + /:slug/*)
├── router/
│   ├── TenantResolver.jsx           ← Reads slug → looks up registry → renders routes
│   └── tenants/
│       ├── index.js                 ← REGISTRY: add new tenants here only
│       ├── smar.routes.jsx          ← All routes for "smar"
│       └── [slug].routes.jsx        ← One file per tenant
│
├── pages/
│   ├── admin/                       ← Global admin (Login.jsx)
│   └── smar/                        ← Smar tenant
│       ├── canvas/                  ← WebGL layer (FloatingRings, Scene3D, CameraManager)
│       ├── sections/                ← Content sections (HeroSection, ShowcaseCards)
│       ├── ui/                      ← Fixed overlays (Navigation, Preloader)
│       ├── store/                   ← Zustand store (useSmarStore.js)
│       ├── spatial/                 ← 2.5D parallax pages (SpatialHomePage, SpatialPropertyDetails)
│       ├── showcase/                ← WebGL / special experiences (SmarLiquidRing)
│       ├── normal/                  ← 2D booking flow (if needed)
│       └── admin/                   ← Tenant admin (SmarAdminDashboard)
│
├── templates/                       ← Layout-only shells (no data fetching)
│   ├── ShowcaseTemplate.jsx
│   └── ListingsTemplate.jsx
│
└── design-system/                   ← Shared, tenant-agnostic components
    ├── atoms/
    ├── molecules/
    └── organisms/
```

---

## How Routing Works

```
URL: /smar/spatial
        │
        ▼
App.jsx: <Route path="/:slug/*" element={<TenantResolver />} />
        │
        ▼
TenantResolver.jsx: slug = "smar"
  → tenantRegistry["smar"] → lazy(smar.routes.jsx)
        │
        ▼
SmarRoutes: <Route path="spatial" element={<Lazy component={SpatialHomePage} />} />
```

---

## URL Map (Current — Live)

| URL | Component | Import Strategy |
|-----|-----------|-----------------|
| `/` | redirect → `/smar` | — |
| `/login` | `Login.jsx` | direct |
| `/dashboard/:slug/*` | `SmarAdminDashboard` | lazy (Suspense) |
| `/404` | `NotFound` inline | inline |
| `/:slug/*` unknown | redirect → `/404` | — |
| `/smar` | redirect → `/smar/showcase` | — |
| `/smar/showcase` | `ShowcaseTemplate` | **direct** (no FM scroll hooks) |
| `/smar/listings` | `ListingsTemplate` | **direct** (no FM scroll hooks) |
| `/smar/spatial` | `SpatialHomePage` | **lazy** — FM scroll hooks |
| `/smar/spatial/property/:id` | `SpatialPropertyDetails` | **lazy** — FM scroll hooks |
| `/smar/ring` | `SmarLiquidRing` | **lazy** — WebGL |
| `/smar/admin` | `SmarAdminDashboard` | **lazy** |

> **Rule:** Pages that use `useScroll` / `useTransform` / MotionValue style bindings
> MUST be lazy-loaded. Direct imports execute at chunk-load time and can cause
> FM12 + React 19 StrictMode crashes that bypass any ErrorBoundary.

---

## Adding a New Tenant — 3 Steps Only

### Step 1: Create tenant folder
```
src/pages/vila/
├── canvas/   sections/   ui/   store/
├── spatial/  normal/  showcase/  admin/
└── vila.css  (scoped: body[data-slug="vila"] { ... })
```

### Step 2: Create routes file
```jsx
// src/router/tenants/vila.routes.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const VilaHomePage = lazy(() => import('../../pages/vila/spatial/VilaHomePage'));

export default function VilaRoutes() {
  return (
    <Routes>
      <Route path="home"  element={<Suspense fallback={null}><VilaHomePage /></Suspense>} />
      <Route path=""      element={<Navigate to="home" replace />} />
      <Route path="*"     element={<Navigate to="home" replace />} />
    </Routes>
  );
}
```

### Step 3: Register in registry
```js
// src/router/tenants/index.js — add ONE entry:
vila: {
  routes:          lazy(() => import('./vila.routes')),
  defaultRedirect: 'home',
  theme:           'green-nature',
},
```

**Nothing else.** `App.jsx` and `TenantResolver.jsx` stay untouched.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `react-router-dom` | Routing |
| `zustand` | Tenant-scoped global state (scrollProgress, lang, booking) |
| `framer-motion` | All UI animations |
| `gsap` | ScrollTrigger, timeline animations |
| `lenis` | Smooth scroll |
| `three` + `@react-three/fiber` + `@react-three/drei` | WebGL scenes |
| `lucide-react` | Icons (User, X, ShieldCheck, etc.) |
