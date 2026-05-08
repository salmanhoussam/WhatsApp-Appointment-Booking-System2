/**
 * DynamicTenantResolver.jsx
 *
 * Sub-router mounted at /demo/:slug/* (and salmansaas.com/demo/:slug/*).
 * Resolves the active tenant from the :slug URL param and dispatches
 * to the appropriate public page based on the sub-path.
 *
 *   /demo/roz           → DemoPublicPage  (hero + catalog strip)
 *   /demo/roz/catalog   → DemoCatalogPage (full catalog grid)
 *   /demo/roz/menu      → DemoCatalogPage (same view, restaurant alias)
 *   /demo/roz/*         → DemoPublicPage  (fallback)
 *
 * useParams() in child components inherits { slug } from the parent
 * route in App.jsx — no need to re-extract it here.
 */

import { lazy, Suspense } from 'react';
import { Routes, Route }  from 'react-router-dom';

const DemoPublicPage  = lazy(() => import('../pages/demo/DemoPublicPage'));
const DemoCatalogPage = lazy(() => import('../pages/demo/DemoCatalogPage'));

function PageFallback() {
  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#d4a853',
        boxShadow: '0 0 18px 4px rgba(212,168,83,0.5)',
        animation: 'pulse 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
    </div>
  );
}

export default function DynamicTenantResolver() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route index            element={<DemoPublicPage />}  />
        <Route path="catalog"   element={<DemoCatalogPage />} />
        <Route path="menu"      element={<DemoCatalogPage />} />
        <Route path="store"     element={<DemoCatalogPage />} />
        <Route path="*"         element={<DemoPublicPage />}  />
      </Routes>
    </Suspense>
  );
}
