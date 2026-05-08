/**
 * footlab.routes.jsx — All routes for the "footlab" tenant (e-commerce store)
 *
 * Lazy-loaded by TenantResolver when slug === 'footlab'.
 *
 * Routes:
 *   /footlab             → redirect → store
 *   /footlab/store       → CatalogPage (generic — store module)
 *   /footlab/cart        → CartPage   (generic — checkout + session_id flow)
 *   /footlab/reserve     → ReservePage (generic — guarded by "reservations" service)
 *   /footlab/admin       → FootlabAdminDashboard (JWT required)
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { TenantConfigProvider, useTenantConfigContext } from '../../context/TenantConfigContext';

// ── Lazy page imports ─────────────────────────────────────────────────────────
const CatalogPage           = lazy(() => import('../../pages/generic/normal/CatalogPage'));
const CartPage              = lazy(() => import('../../pages/generic/normal/CartPage'));
const ReservePage           = lazy(() => import('../../pages/generic/normal/ReservePage'));
const FootlabAdminDashboard = lazy(() => import('../../pages/footlab/admin/FootlabAdminDashboard'));

// ── Fallback ──────────────────────────────────────────────────────────────────
function PageFallback() {
  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#1a1a2e',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#6c63ff', boxShadow: '0 0 18px 4px rgba(108,99,255,0.5)',
        animation: 'pulse 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
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

// ── Reserve guard ─────────────────────────────────────────────────────────────
// Reads from TenantConfigContext (provided by TenantConfigProvider above).
// Redirects to /store if "reservations" is not in active_services.
function ReserveGuard() {
  const { config, isLoading } = useTenantConfigContext();
  if (isLoading) return <PageFallback />;
  const hasReservations = config?.active_services?.includes('reservations') ?? false;
  if (!hasReservations) return <Navigate to="../store" replace />;
  return <Lazy component={ReservePage} />;
}

// ── Routes ────────────────────────────────────────────────────────────────────
export default function FootlabRoutes() {
  return (
    <TenantConfigProvider slug="footlab">
      <Routes>
        <Route path="store"   element={<Lazy component={CatalogPage} />} />
        <Route path="cart"    element={<Lazy component={CartPage} />} />
        <Route path="reserve" element={<ReserveGuard />} />

        <Route path="admin" element={
          <ProtectedRoute>
            <Lazy component={FootlabAdminDashboard} />
          </ProtectedRoute>
        } />

        <Route path=""  element={<Navigate to="store" replace />} />
        <Route path="*" element={<Navigate to="store" replace />} />
      </Routes>
    </TenantConfigProvider>
  );
}
