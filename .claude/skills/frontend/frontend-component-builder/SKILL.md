---
name: frontend-component-builder
description: Step-by-step protocol for building new public-facing features in Salman SaaS. Covers: where to create files, which layer to use (atom/molecule/organism/template), how to wire to the API, and how to integrate into the router.
user-invocable: true
---

# Frontend Component Builder
**Stack:** React 19 + Framer Motion 12 + Tailwind CSS + Vite

Activate when the user says "build a component", "create a page", "add a feature to frontend", or "wire up the UI".

---

## 1. Decision Tree — Where Does This Go?

Before writing one line, answer these questions:

```
Is it a pure UI primitive (button, input, badge)?
  → YES → src/design-system/atoms/

Does it combine 2+ atoms + display logic (no API calls)?
  → YES → src/design-system/molecules/

Is it a self-contained feature block that fetches its own data?
  → YES → src/design-system/organisms/

Is it a layout shell with no data fetching?
  → YES → src/templates/

Is it a full page specific to the smar tenant?
  → YES → src/pages/smar/[section]/
```

---

## 2. The 4-Layer Frontend Architecture

```
src/design-system/atoms/       → Button, Input, Badge, Spinner, PriceTag
src/design-system/molecules/   → UnitCard, DateRangePicker, AmenityIcon
src/design-system/organisms/   → UnitGrid, BookingDrawer, TenantHeader, LoginModal
src/templates/                 → ShowcaseTemplate, ListingsTemplate
src/pages/smar/                → Tenant-specific pages (gallery, spatial, admin)
src/hooks/                     → useTenantConfig, useUnits (data fetching)
src/utils/publicApi.js         → axios instance for all public API calls
```

---

## 3. Building a New Organism (Most Common Task)

### Step 1 — Create the file
```
src/design-system/organisms/MyFeature.jsx
```

### Step 2 — File skeleton
```jsx
/**
 * MyFeature.jsx — Organism
 *
 * [Short description of what this does]
 *
 * Props:
 *   slug — string — tenant identifier (REQUIRED — every organism needs this)
 *
 * API: GET /api/v1/public/{slug}/my-endpoint
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import publicApi from '../../utils/publicApi';
import { colors, spring, glass } from '../tokens';

export default function MyFeature({ slug }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!slug) return;
    publicApi.get(`/${slug}/my-endpoint`)
      .then(r  => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingSkeleton />;
  if (error)   return null; // fail silently on public pages

  return (
    <section>
      {/* content */}
    </section>
  );
}
```

### Step 3 — Export from barrel
```js
// src/design-system/organisms/index.js
export { default as MyFeature } from './MyFeature';
```

### Step 4 — Use in template/page
```jsx
import { MyFeature } from '../design-system/organisms';
// ...
<MyFeature slug={slug} />
```

---

## 4. Building a New Hook

For any data that multiple components need:

```js
// src/hooks/useMyData.js

import { useState, useEffect, useRef } from 'react';
import publicApi from '../utils/publicApi';

const CACHE = {}; // in-memory cache — survives re-renders, resets on page refresh

export default function useMyData(slug) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const didFetch = useRef(false);

  useEffect(() => {
    if (!slug || didFetch.current) return;
    if (CACHE[slug]) {
      setData(CACHE[slug]);
      setLoading(false);
      return;
    }
    didFetch.current = true;
    publicApi.get(`/${slug}/my-endpoint`)
      .then(r => {
        CACHE[slug] = r.data;
        setData(r.data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return { data, loading, error };
}
```

---

## 5. Adding a New Page to the smar Tenant

### Step 1 — Create the page file
```
src/pages/smar/[section]/MySmarPage.jsx
```

### Step 2 — Add route to smar.routes.jsx
```jsx
// src/router/tenants/smar.routes.jsx
import MySmarPage from '../../pages/smar/section/MySmarPage';

// Inside SmarRoutes():
<Route path="my-page" element={<MySmarPage />} />
```

**Rules:**
- Pages using `useScroll`/WebGL → **must be lazy loaded**
- Pages in normal booking flow → **can be direct import**
- All routes catch-all → redirect to `showcase`

### Step 3 — Add nav link (if needed)
```jsx
// In TenantHeader.jsx NAV_LINKS array:
{ ar: 'صفحتي', en: 'My Page', action: () => navigate(`${base}/my-page`) }
```

---

## 6. Gallery Page — Build Protocol

Based on `roadmap_audit_april.md` (priority feature):

### Files to create:
```
src/pages/smar/gallery/SmarGalleryPage.jsx   (already exists — extend it)
src/hooks/useGallery.js                       (new — reads GalleryImage from API)
```

### API contract:
```
GET /api/v1/public/{slug}/gallery
Response: {
  success: true,
  data: [
    { id, url, caption_ar, caption_en, category, sort_order }
  ]
}
```

### Component structure:
```
SmarGalleryPage
  ├── TenantHeader (organism, exists)
  ├── GalleryFilterPills  (molecule — new)
  │   └── filters: كل | شاليهات | فيلات | طبيعة | مسبح
  ├── GalleryGrid (organism — new)
  │   ├── CSS columns masonry (not JS masonry)
  │   └── GalleryCard (molecule — new)
  │       ├── image
  │       ├── glassmorphism caption overlay
  │       └── onClick → opens GalleryLightbox
  └── GalleryLightbox (organism — new)
      ├── full screen overlay
      ├── keyboard nav (ESC, ←, →)
      ├── body scroll lock on open
      └── caption bar
```

### Masonry CSS Pattern (no JS library):
```jsx
<div style={{
  columns:      '1',
  columnGap:    '12px',
  // Responsive:
  // @media (min-width: 640px): columns: 2
  // @media (min-width: 1024px): columns: 3
}}>
  {images.map(img => (
    <div key={img.id} style={{ breakInside:'avoid', marginBottom:12 }}>
      <GalleryCard image={img} />
    </div>
  ))}
</div>
```

---

## 7. BookingDrawer — Extend Protocol

The `BookingDrawer` already exists. To add a new step or field:

1. Open `src/design-system/organisms/BookingDrawer.jsx`
2. Find the step it belongs to (step 1: dates, step 2: guests, step 3: confirm)
3. Add your field in the correct step
4. Update the WhatsApp message template at the bottom
5. Test: does the message make sense for an Arabic speaker?

---

## 8. Admin Gallery Tab — Build Protocol

```
src/pages/smar/admin/components/GalleryTab.jsx   (new)
```

### Features needed:
```
GalleryTab
  ├── Upload zone (drag & drop or click)
  │   ├── Uploads to: POST /api/v1/admin/gallery/upload
  │   └── Shows upload progress
  ├── GalleryGrid (admin version)
  │   ├── Drag to reorder (react-dnd or native HTML5 drag)
  │   ├── Each image has: delete button, caption edit, category select
  │   └── Changes saved on drag-end → PATCH /api/v1/admin/gallery/reorder
  └── Save all button → saves all pending changes
```

### API endpoints needed (verify backend exists):
```
GET    /api/v1/admin/gallery/?client_slug=smar
POST   /api/v1/admin/gallery/upload
PATCH  /api/v1/admin/gallery/{id}
DELETE /api/v1/admin/gallery/{id}
POST   /api/v1/admin/gallery/reorder  (accepts [{id, sort_order}])
```

---

## 9. Image Upload Pattern (Supabase)

```jsx
// Upload via backend (backend handles Supabase SDK)
const uploadImage = async (file, slug, unitId) => {
  const form = new FormData();
  form.append('file', file);
  form.append('client_slug', slug);
  if (unitId) form.append('unit_id', unitId);

  const { data } = await adminApi.post('/units/upload-image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      setProgress(Math.round((e.loaded / e.total) * 100));
    }
  });
  return data.url; // Supabase public URL
};
```

---

## 10. React 19 Safety Checklist

Before committing any component, verify:

- [ ] No `useScroll` in a direct-imported (non-lazy) component
- [ ] No `MotionValue` passed directly to `style={{}}`
- [ ] All `AnimatePresence` uses `mode="wait"`
- [ ] Scroll animations use native `window.addEventListener('scroll', ...)`
- [ ] Each `useEffect` has correct dependencies array
- [ ] No memory leaks: scroll listeners and intervals are cleaned up on unmount
- [ ] RTL: `dir="rtl"` on Arabic containers, not hardcoded `text-align:right`
- [ ] Multi-tenancy: slug passed to every API call
- [ ] No global CSS — all styles scoped to component or use `body[data-slug="smar"]`
