# Frontend Architecture — Multi-Tenant Routing System

## Overview

Every tenant (e.g. `smar`, `vila`) gets its own isolated folder and route file.
The router reads the URL slug and dynamically loads the correct tenant experience —
no changes to `App.jsx` or `TenantPages.jsx` are ever needed when adding a tenant.

---

## Folder Structure

```
src/
├── App.jsx                          ← Root router (static routes + /:slug/*)
├── router/
│   ├── TenantPages.jsx              ← Reads slug → looks up registry → renders routes
│   └── tenants/
│       ├── index.js                 ← REGISTRY: add new tenants here
│       ├── smar.routes.jsx          ← All routes for "smar"
│       └── [slug].routes.jsx        ← One file per tenant
│
├── pages/
│   ├── mountain_dashboard/          ← Admin portal (Login, MountainDashboard)
│   └── [slug]/                      ← One folder per tenant
│       ├── [Slug]Page.jsx           ← Shell (optional top-level)
│       ├── canvas/                  ← 3D / WebGL layer (z-0)
│       │   └── Scene.jsx
│       ├── sections/                ← Content sections / virtual pages (z-10)
│       │   └── HeroSection.jsx
│       ├── ui/                      ← Fixed overlays: nav, HUD, cursor (z-20)
│       │   └── Navigation.jsx
│       ├── store/                   ← Zustand store (scrollProgress, lang, etc.)
│       │   └── use[Slug]Store.js
│       ├── normal/                  ← 2D booking flow
│       ├── spatial/                 ← Parallax / cinematic experience
│       ├── showcase/                ← WebGL immersive experience
│       └── admin/                   ← Tenant admin dashboard
│
└── components/                      ← Shared, tenant-agnostic components only
```

---

## How the Routing Works

```
URL: /smar/spatial
        │
        ▼
App.jsx: <Route path="/:slug/*" element={<TenantPages />} />
        │
        ▼
TenantPages.jsx: slug = "smar"
  → tenantRegistry["smar"] → lazy(smar.routes.jsx)
        │
        ▼
SmarRoutes: <Route path="spatial" element={<SpatialHomePage />} />
```

---

## Adding a New Tenant — 3 Steps

### Step 1: Create the tenant folder
```
mkdir src/pages/vila/
```
Structure it with: `canvas/`, `sections/`, `ui/`, `store/`, `spatial/`, `normal/`, `admin/`

### Step 2: Create the routes file
```jsx
// src/router/tenants/vila.routes.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import VilaHomePage from '../../pages/vila/spatial/VilaHomePage';

export default function VilaRoutes() {
  return (
    <Routes>
      <Route path="home"  element={<VilaHomePage />} />
      <Route path=""      element={<Navigate to="home" replace />} />
      <Route path="*"     element={<Navigate to="home" replace />} />
    </Routes>
  );
}
```

### Step 3: Register in the registry
```js
// src/router/tenants/index.js
export const tenantRegistry = {
  smar: { ... },                              // existing
  vila: {
    routes:          lazy(() => import('./vila.routes')),
    defaultRedirect: 'home',
    theme:           'green-nature',
  },
};
```

That's it. The tenant is live at `/vila/*`.

---

## URL Map

| URL | Component |
|-----|-----------|
| `/` | redirect → `/smar` |
| `/login` | `Login.jsx` |
| `/dashboard/:slug/units` | `MountainDashboard.jsx` |
| `/smar` | redirect → `/smar/spatial` |
| `/smar/spatial` | `SpatialHomePage.jsx` |
| `/smar/spatial/property/:id` | `SpatialPropertyDetails.jsx` |
| `/smar/showcase` | `SmarShowcasePage.jsx` (lazy + WebGL) |
| `/smar/ring` | `SmarLiquidRing.jsx` (lazy + WebGL) |
| `/smar/admin` | `SmarAdminDashboard.jsx` |
| `/404` | `NotFound` inline component |
| `/:slug/*` (unknown) | redirect → `/404` |

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `react-router-dom` | Routing |
| `zustand` | Tenant-scoped global state (scrollProgress, lang, booking state) |
| `three` + `@react-three/fiber` + `@react-three/drei` | WebGL scenes |
| `framer-motion` | All UI animations |
| `gsap` | ScrollTrigger, timeline-based animations |
| `lenis` | Smooth scroll |
