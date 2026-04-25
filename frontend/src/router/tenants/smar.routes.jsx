/**
 * smar.routes.jsx  —  All routes for the "smar" tenant
 *
 * Lazy-loaded by TenantResolver when slug === 'smar'.
 *
 * Architecture rule (CRITICAL):
 *   ALL pages that use FM useScroll / useTransform / MotionValue style bindings
 *   MUST be lazy-loaded. A direct import makes their module execute at chunk-load
 *   time, which can cause a FM12 + React 19 StrictMode crash that propagates
 *   above any ErrorBoundary and leaves div#root empty.
 *
 * Routes:
 *   /smar/showcase               →  ShowcaseTemplate      (lazy — GSAP Z-axis + billboard S1)
 *   /smar/listings               →  ListingsTemplate      (atomic)
 *   /smar/gallery                →  SmarGalleryPage       (lazy — AnimatePresence)
 *   /smar/spatial                →  SpatialHomePage       (lazy — FM scroll)
 *   /smar/spatial/property/:id   →  SpatialPropertyDetails (lazy — FM scroll)
 *   /smar/ring                   →  SmarLiquidRing        (lazy — WebGL)
 *   /smar/admin                  →  SmarAdminDashboard    (lazy)
 *   /smar  (empty / catch-all)   →  redirect → showcase
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { TenantConfigProvider } from '../../context/TenantConfigContext';

// ListingsTemplate — no scroll hooks, direct import is safe
import ListingsTemplate  from '../../templates/ListingsTemplate';

// ShowcaseTemplate — GSAP ScrollTrigger registers at module scope → lazy-isolated
const ShowcaseTemplate = lazy(() => import('../../templates/ShowcaseTemplate'));

// ── Lazy pages (FM scroll hooks or heavy deps — isolated per-route) ───────────
const SpatialHomePage        = lazy(() => import('../../pages/smar/spatial/SpatialHomePage'));
const SpatialPropertyDetails = lazy(() => import('../../pages/smar/spatial/SpatialPropertyDetails'));
const SmarAdminDashboard     = lazy(() => import('../../pages/smar/admin/SmarAdminDashboard'));
const SmarLiquidRing         = lazy(() => import('../../pages/smar/showcase/SmarLiquidRing'));
const SmarGalleryPage        = lazy(() => import('../../pages/smar/gallery/SmarGalleryPage'));
const ChalletDemo            = lazy(() => import('../../pages/smar/showcase/ChalletDemo'));

// ── Shared loading fallback ───────────────────────────────────────────────────
function PageFallback() {
  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#d4a853', boxShadow: '0 0 18px 4px rgba(212,168,83,0.5)',
        animation: 'pulse 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
    </div>
  );
}

// ── Route wrapper: Suspense + per-route isolation ────────────────────────────
function Lazy({ component: Component }) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
  );
}

export default function SmarRoutes() {
  return (
    <TenantConfigProvider slug="smar">
    <Routes>
      {/* ── Showcase — GSAP Z-axis cinema, lazy-isolated ── */}
      <Route path="showcase" element={<Lazy component={ShowcaseTemplate} />} />

      {/* ── Spatial experience (FM scroll — isolated via lazy) ── */}
      <Route path="spatial"              element={<Lazy component={SpatialHomePage} />} />
      <Route path="spatial/property/:id" element={<Lazy component={SpatialPropertyDetails} />} />

      {/* ── Listings — atomic template, no FM scroll hooks ── */}
      <Route path="listings" element={<ListingsTemplate />} />

      {/* ── Gallery — AnimatePresence lightbox, lazy-isolated ── */}
      <Route path="gallery"  element={<Lazy component={SmarGalleryPage} />} />

      {/* ── Challet Static Demo Preview ── */}
      <Route path="challet"  element={<Lazy component={ChalletDemo} />} />

      {/* ── Liquid ring hero ── */}
      <Route path="ring"  element={<Lazy component={SmarLiquidRing} />} />

      {/* ── Admin portal — JWT required ── */}
      <Route path="admin" element={
        <ProtectedRoute>
          <Lazy component={SmarAdminDashboard} />
        </ProtectedRoute>
      } />

      {/* ── Default & catch-all → showcase ─────────────────────────────────────
          Use RELATIVE path "showcase" (no leading slash).
          An absolute "/showcase" on localhost would route to slug="showcase"
          which is not in the registry → 404 loop. ── */}
      <Route path=""  element={<Navigate to="showcase" replace />} />
      <Route path="*" element={<Navigate to="showcase" replace />} />
    </Routes>
    </TenantConfigProvider>
  );
}
