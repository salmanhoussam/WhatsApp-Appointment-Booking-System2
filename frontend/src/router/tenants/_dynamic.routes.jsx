/**
 * _dynamic.routes.jsx — Generic Tenant Routes (auto-fallback)
 *
 * Used by TenantResolver when the slug is NOT registered in tenantRegistry.
 * Covers every new tenant created via the onboarding pipeline.
 *
 * URL structure (path-based / localhost):
 *   /:slug              → DynamicPage (sections-driven home)
 *   /:slug/home         → DynamicPage (explicit alias)
 *   /:slug/catalog      → CatalogPage (full grid + category pills)
 *   /:slug/menu         → CatalogPage (alias — restaurant)
 *   /:slug/store        → CatalogPage (alias — e-commerce)
 *   /:slug/cart         → CartPage
 *   /:slug/reserve      → ReservePage
 *
 * URL structure (subdomain mode / production):
 *   slug.salmansaas.com/            → DynamicPage
 *   slug.salmansaas.com/catalog     → CatalogPage
 *   etc.
 *
 * No TenantConfigProvider needed — DynamicPage fetches config itself,
 * and child pages read slug via useTenantSlug() → useParams().
 */

import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

const DynamicPage = lazy(() => import('../../pages/generic/normal/DynamicPage'))
const CatalogPage = lazy(() => import('../../pages/generic/normal/CatalogPage'))
const CartPage    = lazy(() => import('../../pages/generic/normal/CartPage'))
const ReservePage = lazy(() => import('../../pages/generic/normal/ReservePage'))

function PageFallback() {
  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#d4a853',
        boxShadow: '0 0 18px 4px rgba(212,168,83,0.45)',
        animation: 'drpulse 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes drpulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
    </div>
  )
}

function Lazy({ component: Component }) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
  )
}

export default function DynamicTenantRoutes() {
  return (
    <Routes>
      <Route index          element={<Lazy component={DynamicPage} />}  />
      <Route path="home"    element={<Lazy component={DynamicPage} />}  />
      <Route path="catalog" element={<Lazy component={CatalogPage} />}  />
      <Route path="menu"    element={<Lazy component={CatalogPage} />}  />
      <Route path="store"   element={<Lazy component={CatalogPage} />}  />
      <Route path="cart"    element={<Lazy component={CartPage} />}     />
      <Route path="reserve" element={<Lazy component={ReservePage} />}  />
      {/* Any unknown sub-path falls back to home */}
      <Route path="*"       element={<Navigate to="" replace />}        />
    </Routes>
  )
}
