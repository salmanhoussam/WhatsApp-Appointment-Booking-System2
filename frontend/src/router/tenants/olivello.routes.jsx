/**
 * olivello.routes.jsx — All routes for the "olivello" tenant (e-commerce store)
 *
 * Lazy-loaded by TenantResolver when slug === 'olivello'.
 *
 * Routes:
 *   /olivello             → redirect → home
 *   /olivello/home        → OlivelloShowcase  (7-section رحلة زيتونة — Phase C/D)
 *   /olivello/store       → CatalogPage       (generic store module)
 *   /olivello/cart        → CartPage          (generic checkout)
 *   /olivello/admin       → OlivelloAdminDashboard (JWT required)
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { TenantConfigProvider } from '../../context/TenantConfigContext';

// ── Lazy page imports ─────────────────────────────────────────────────────────
// FM12: OlivelloStory uses useScroll/useTransform → MUST be lazy()
const OlivelloStory          = lazy(() => import('../../pages/olivello/sections/OlivelloStory'));
const CatalogPage            = lazy(() => import('../../pages/generic/normal/CatalogPage'));
const CartPage               = lazy(() => import('../../pages/generic/normal/CartPage'));
const OlivelloAdminDashboard = lazy(() => import('../../pages/olivello/admin/OlivelloAdminDashboard'));

// ── Fallback ──────────────────────────────────────────────────────────────────
function PageFallback() {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'oklch(22% 0.05 100)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: '#C8A84B', boxShadow: '0 0 20px 4px rgba(200,168,75,0.5)',
        animation: 'pulse 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.7)}}`}</style>
    </div>
  );
}

function Lazy({ component: Component }) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
  );
}

// ── Routes ────────────────────────────────────────────────────────────────────
export default function OlivelloRoutes() {
  return (
    <TenantConfigProvider slug="olivello">
      <Routes>
        <Route path="home"  element={<Lazy component={OlivelloStory} />} />
        <Route path="store" element={<Lazy component={CatalogPage} />} />
        <Route path="cart"  element={<Lazy component={CartPage} />} />

        <Route path="admin" element={
          <ProtectedRoute>
            <Lazy component={OlivelloAdminDashboard} />
          </ProtectedRoute>
        } />

        <Route path=""  element={<Navigate to="home" replace />} />
        <Route path="*" element={<Navigate to="home" replace />} />
      </Routes>
    </TenantConfigProvider>
  );
}
