# /scaffold-tenant [slug]

Scaffolds a complete new tenant following the Registry-Based Lazy Routing architecture.

**Usage:** `/scaffold-tenant vila`

---

## What This Command Does

Executes 4 steps to bring a new tenant from zero to a working route at `/:slug/`.

---

## Step 1: Frontend Folder Scaffolding

Create the following directory structure under `src/pages/[slug]/`:

```
src/pages/[slug]/
├── canvas/                    # WebGL layer (z-index: -1)
│   ├── Scene3D.jsx            # Lighting, environment, 3D elements
│   ├── CameraManager.jsx      # Reads scrollProgress → drives camera
│   └── FloatingRings.jsx      # Placeholder 3D visual
│
├── sections/                  # Content sections (z-index: 10)
│   ├── HeroSection.jsx        # First section, fades out on scroll
│   └── ShowcaseCards.jsx      # Property cards with glassmorphism
│
├── ui/                        # Fixed overlays (z-index: 20)
│   ├── Navigation.jsx         # Header / HUD
│   └── Preloader.jsx          # useProgress loading screen
│
├── store/                     # Zustand global state
│   └── use[Slug]Store.js      # scrollProgress, activeSection, isCanvasLoaded
│
├── spatial/                   # Parallax / cinematic pages
│   └── [Slug]HomePage.jsx
│
├── normal/                    # 2D booking flow
│   └── PublicBooking.jsx
│
├── admin/                     # Tenant admin dashboard
│   └── [Slug]AdminDashboard.jsx
│
└── [slug].css                 # Scoped CSS — MUST use body[data-slug="[slug]"] selector
```

**CSS Isolation Rule:** ALL styles must be scoped:
```css
/* [slug].css */
body[data-slug="[slug]"] .hero-title {
  /* tenant-specific styles only */
}
```

---

## Step 2: Route Registration (Registry Pattern)

### 2a — Create the tenant routes file

Create `src/router/tenants/[slug].routes.jsx`:

```jsx
/**
 * [slug].routes.jsx — All routes for the "[slug]" tenant
 */
import React, { lazy, Suspense }   from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import [Slug]HomePage              from '../../pages/[slug]/spatial/[Slug]HomePage';
import [Slug]AdminDashboard        from '../../pages/[slug]/admin/[Slug]AdminDashboard';

// Heavy WebGL pages — lazy loaded
const [Slug]ShowcasePage = lazy(() => import('../../pages/[slug]/showcase/[Slug]ShowcasePage'));

function WebGLFallback() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0f',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d4a853',
                    boxShadow: '0 0 18px 4px rgba(212,168,83,0.5)',
                    animation: 'pulse 1.4s ease-in-out infinite' }} />
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
    </div>
  );
}

export default function [Slug]Routes() {
  return (
    <Routes>
      <Route path="home"    element={<[Slug]HomePage />} />
      <Route path="admin"   element={<[Slug]AdminDashboard />} />
      <Route path="showcase" element={
        <Suspense fallback={<WebGLFallback />}>
          <[Slug]ShowcasePage />
        </Suspense>
      } />
      <Route path=""  element={<Navigate to="home" replace />} />
      <Route path="*" element={<Navigate to="home" replace />} />
    </Routes>
  );
}
```

### 2b — Register in the tenant registry

Open `src/router/tenants/index.js` and add ONE entry:

```js
import { lazy } from 'react';

export const tenantRegistry = {
  smar: { ... },   // do not touch existing tenants

  [slug]: {
    routes:          lazy(() => import('./[slug].routes')),
    defaultRedirect: 'home',
    theme:           '[theme-name]',
  },
};
```

### ⛔ FORBIDDEN — Never do these:
- Do NOT modify `src/App.jsx`
- Do NOT modify `src/router/TenantPages.jsx`
- Do NOT add tenant routes directly to any existing file other than `tenants/index.js`

The tenant is live at `/:slug/` immediately after step 2b. No other files need changes.

---

## Step 3: Zustand Store

Create `src/pages/[slug]/store/use[Slug]Store.js`:

```js
import { create } from 'zustand';

export const use[Slug]Store = create((set) => ({
  // State
  scrollProgress:  0,
  activeSection:   'hero',
  isCanvasLoaded:  false,

  // Actions
  setScrollProgress:  (v)    => set({ scrollProgress: v }),
  setActiveSection:   (name) => set({ activeSection: name }),
  setCanvasLoaded:    ()     => set({ isCanvasLoaded: true }),
}));
```

---

## Step 4: Backend & Database

1. Add slug to the DB Tenant table:
```sql
INSERT INTO "Tenant" (slug, name, ...) VALUES ('[slug]', '[Name]', ...);
```

2. Set up Supabase storage folder:
```
properties/[slug]/homepage/
properties/[slug]/amenities/
```

Asset URL pattern:
```
https://[project].supabase.co/storage/v1/object/public/properties/[slug]/[category]/[filename]
```

---

## Scaffolding Checklist

- [ ] `src/pages/[slug]/` — full folder structure created
- [ ] `src/pages/[slug]/[slug].css` — scoped CSS file
- [ ] `src/pages/[slug]/store/use[Slug]Store.js` — Zustand store
- [ ] `src/router/tenants/[slug].routes.jsx` — routes file
- [ ] `src/router/tenants/index.js` — registry entry added
- [ ] DB Tenant table — slug inserted
- [ ] Supabase storage — folder created
- [ ] Test: navigate to `/:slug/` in browser
