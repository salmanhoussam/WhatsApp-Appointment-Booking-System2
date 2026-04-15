/**
 * smar.routes.jsx  —  All routes for the "smar" tenant
 *
 * Lazy-loaded by TenantPages.jsx when slug === 'smar'.
 * Three.js / R3F / postprocessing are NOT in the main bundle —
 * they only load when this chunk is requested.
 *
 * Routes:
 *   /smar/spatial                →  SpatialHomePage        (parallax + timeline)
 *   /smar/spatial/property/:id   →  SpatialPropertyDetails (cinematic video + booking)
 *   /smar/showcase               →  SmarShowcasePage       (WebGL 3D immersive)
 *   /smar/ring                   →  SmarLiquidRing         (Active Theory ring)
 *   /smar/admin                  →  SmarAdminDashboard
 *   /smar  (empty / catch-all)   →  redirect → spatial
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SpatialHomePage             from '../../pages/smar/spatial/SpatialHomePage';
import SpatialPropertyDetails      from '../../pages/smar/spatial/SpatialPropertyDetails';
import SmarAdminDashboard          from '../../pages/smar/admin/SmarAdminDashboard';
import SmarListingsPage            from '../../pages/smar/normal/SmarListingsPage';
import SmarPaymentPage             from '../../pages/smar/normal/SmarPaymentPage';
import SmarClassicPage             from '../../pages/smar/normal/SmarClassicPage';

// ShowcaseTemplate — new pure-DOM architecture (no WebGL, no FM MotionValue bindings)
import ShowcaseTemplate from '../../templates/ShowcaseTemplate';

// Heavy WebGL pages — lazy to keep chunk size small
const SmarLiquidRing = lazy(() => import('../../pages/smar/showcase/SmarLiquidRing'));

// ── Gold-dot loading fallback ─────────────────────────────────────────────────
function WebGLFallback() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0f',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#d4a853', boxShadow: '0 0 18px 4px rgba(212,168,83,0.5)',
        animation: 'pulse 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
    </div>
  );
}


export default function SmarRoutes() {
  return (
    <Routes>
      {/* ── Cinematic spatial experience ── */}
      <Route path="spatial"               element={<SpatialHomePage />} />
      <Route path="spatial/property/:id"  element={<SpatialPropertyDetails />} />

      {/* ── Showcase — pure DOM template (KineticSection + TenantHero) ── */}
      <Route path="showcase" element={<ShowcaseTemplate />} />

      {/* ── Liquid ring hero ── */}
      <Route
        path="ring"
        element={
          <Suspense fallback={<WebGLFallback />}>
            <SmarLiquidRing />
          </Suspense>
        }
      />

      {/* ── Booking funnel ── */}
      <Route path="listings" element={<SmarListingsPage />} />
      <Route path="classic"  element={<SmarClassicPage />} />
      <Route path="payment"  element={<SmarPaymentPage />} />

      {/* ── Admin portal ── */}
      <Route path="admin" element={<SmarAdminDashboard />} />

      {/* ── Default & catch-all → showcase (WebGL gallery entry point) ──
          MUST use absolute path /showcase — relative "showcase" resolves
          against the current URL and causes an infinite append loop on typos.
          No /smar prefix — TenantResolver strips it on subdomains. ── */}
      <Route path=""  element={<Navigate to="/showcase" replace />} />
      <Route path="*" element={<Navigate to="/showcase" replace />} />
    </Routes>
  );
}
