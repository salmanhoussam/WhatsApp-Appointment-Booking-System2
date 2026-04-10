paths: "src/pages/**" "src/router/**"

# Tenant Scaffolding & Management

## 1. Directory Structure Rule (MANDATORY)

When scaffolding a new tenant (e.g., `vila`), use this exact structure:

```
src/pages/[slug]/
├── canvas/          # WebGL layer — Scene3D, CameraManager, FloatingRings
├── sections/        # Content sections — HeroSection, ShowcaseCards
├── ui/              # Fixed overlays — Navigation, Preloader
├── store/           # Zustand store — use[Slug]Store.js
├── spatial/         # Parallax / cinematic pages
├── normal/          # 2D booking flow
├── admin/           # Tenant admin dashboard
└── [slug].css       # Scoped CSS (see rule 2)
```

## 2. CSS Isolation & Scoping

NEVER write global CSS that affects other tenants.
All CSS for a tenant MUST be wrapped in a data-attribute selector:

```css
body[data-slug="[slug]"] .hero-title {
  font-family: 'Inter', sans-serif;
}
```

## 3. Route Registration — Registry Pattern (NEW ARCHITECTURE)

Adding a tenant's routes is a strict 3-step process.
See `.claude/commands/scaffold-tenant.md` for the full template.

### Step 1 — Create routes file
`src/router/tenants/[slug].routes.jsx`
Contains all `<Route>` definitions for this tenant.

### Step 2 — Register in the registry
`src/router/tenants/index.js` — add ONE lazy() entry:
```js
[slug]: {
  routes: lazy(() => import('./[slug].routes')),
  defaultRedirect: 'home',
  theme: '[theme]',
},
```

### Step 3 — Nothing else
`App.jsx` and `TenantPages.jsx` must NEVER be modified for new tenants.

## 4. Supabase Asset Management

Assets isolated by tenant slug in Supabase storage:
```
properties/[slug]/homepage/[filename]
properties/[slug]/amenities/[filename]
```

## 5. Scaffolding Checklist

- [ ] `src/pages/[slug]/` folder structure (canvas, sections, ui, store, spatial, normal, admin)
- [ ] `src/pages/[slug]/[slug].css` scoped CSS
- [ ] `src/pages/[slug]/store/use[Slug]Store.js` Zustand store
- [ ] `src/router/tenants/[slug].routes.jsx` routes file
- [ ] `src/router/tenants/index.js` registry entry added
- [ ] DB Tenant table row inserted
- [ ] Supabase storage folder created
