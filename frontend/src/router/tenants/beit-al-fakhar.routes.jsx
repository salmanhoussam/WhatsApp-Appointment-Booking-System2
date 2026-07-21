/**
 * beit-al-fakhar.routes.jsx — All routes for the "beit-al-fakhar" tenant (ceramics/pottery store)
 *
 * Lazy-loaded by TenantResolver when slug === 'beit-al-fakhar'.
 *
 * Routes:
 *   /beit-al-fakhar    → redirect → home
 *   /beit-al-fakhar/home        → HomePage (custom cinematic homepage — hero video, categories, gallery)
 *   /beit-al-fakhar/store       → CatalogPage (generic — store module, real categories/products)
 *   /beit-al-fakhar/store/:itemId → ProductPage (tenant-specific — Premium Product Experience)
 *   /beit-al-fakhar/cart        → CheckoutPage (tenant-specific — Showroom Checkout Experience)
 *   /beit-al-fakhar/admin       → GenericAdminDashboard (JWT required — owner adds products here)
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { TenantConfigProvider } from '../../context/TenantConfigContext';

// ── Lazy page imports ─────────────────────────────────────────────────────────
const HomePage             = lazy(() => import('../../pages/beit-al-fakhar/normal/HomePage'));
const CatalogPage          = lazy(() => import('../../pages/generic/normal/CatalogPage'));
const ProductPage          = lazy(() => import('../../pages/beit-al-fakhar/product/ProductPage'));
const CheckoutPage         = lazy(() => import('../../pages/beit-al-fakhar/checkout/CheckoutPage'));
const GenericAdminDashboard = lazy(() => import('../../pages/generic-admin/GenericAdminDashboard'));

// ── Fallback ──────────────────────────────────────────────────────────────────
function PageFallback() {
  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#2A2420',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#C1683A', boxShadow: '0 0 18px 4px rgba(193,104,58,0.5)',
        animation: 'pulse 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
    </div>
  );
}

function Lazy({ component: Component, ...props }) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component {...props} />
    </Suspense>
  );
}

// ── Routes ────────────────────────────────────────────────────────────────────
export default function BeitAlFakharRoutes() {
  return (
    <TenantConfigProvider slug="beit-al-fakhar">
      <Routes>
        <Route path="home"  element={<Lazy component={HomePage} />} />
        <Route path="store" element={
          <Lazy component={CatalogPage} productLinkBase={(item) => `/beit-al-fakhar/store/${item.id}`} />
        } />
        <Route path="store/:itemId" element={<Lazy component={ProductPage} />} />
        <Route path="cart"  element={<Lazy component={CheckoutPage} />} />

        <Route path="admin" element={
          <ProtectedRoute>
            <Lazy component={GenericAdminDashboard} />
          </ProtectedRoute>
        } />

        <Route path=""  element={<Navigate to="home" replace />} />
        <Route path="*" element={<Navigate to="home" replace />} />
      </Routes>
    </TenantConfigProvider>
  );
}
