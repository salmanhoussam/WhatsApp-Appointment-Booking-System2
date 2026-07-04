/**
 * caracas.routes.jsx — All routes for the "caracas" tenant (restaurant)
 *
 * Lazy-loaded by TenantResolver when slug === 'caracas'.
 *
 * Routes:
 *   /caracas             → redirect → menu
 *   /caracas/menu        → CatalogPage (generic — restaurant module)
 *   /caracas/cart        → CartPage   (generic — place restaurant order)
 *   /caracas/reserve     → ReservePage (generic — guarded by "reservations" service)
 *   /caracas/admin       → CaracasAdminDashboard (JWT required)
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { TenantConfigProvider, useTenantConfigContext } from '../../context/TenantConfigContext';

// ── Lazy page imports ─────────────────────────────────────────────────────────
const HomePage              = lazy(() => import('../../pages/caracas/normal/HomePage'));
const MenuPage              = lazy(() => import('../../pages/caracas/normal/MenuPage'));
const CartPage              = lazy(() => import('../../pages/generic/normal/CartPage'));
const ReservePage           = lazy(() => import('../../pages/generic/normal/ReservePage'));
const CaracasAdminDashboard = lazy(() => import('../../pages/caracas/admin/CaracasAdminDashboard'));

// ── Fallback ──────────────────────────────────────────────────────────────────
function PageFallback() {
  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#1a0a08',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#c0392b', boxShadow: '0 0 18px 4px rgba(192,57,43,0.5)',
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
// Reads from TenantConfigContext (already provided by TenantConfigProvider above).
// Redirects to /menu if "reservations" is not in active_services.
function ReserveGuard() {
  const { config, isLoading } = useTenantConfigContext();
  if (isLoading) return <PageFallback />;
  const hasReservations = config?.active_services?.includes('reservations') ?? false;
  if (!hasReservations) return <Navigate to="../menu" replace />;
  return <Lazy component={ReservePage} />;
}

// ── Routes ────────────────────────────────────────────────────────────────────
export default function CaracasRoutes() {
  return (
    <TenantConfigProvider slug="caracas">
      <Routes>
        <Route path="home"    element={<Lazy component={HomePage} />} />
        <Route path="menu"    element={<Lazy component={MenuPage} />} />
        <Route path="cart"    element={<Lazy component={CartPage} />} />
        <Route path="reserve" element={<ReserveGuard />} />

        <Route path="admin" element={
          <ProtectedRoute>
            <Lazy component={CaracasAdminDashboard} />
          </ProtectedRoute>
        } />

        <Route path=""  element={<Navigate to="home" replace />} />
        <Route path="*" element={<Navigate to="home" replace />} />
      </Routes>
    </TenantConfigProvider>
  );
}
