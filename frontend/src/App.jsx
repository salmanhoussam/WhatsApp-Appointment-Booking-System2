/**
 * App.jsx  —  Root Router
 *
 * Static routes:
 *   /               →  redirect → /smar
 *   /login          →  Login
 *   /dashboard/:slug/units  →  SmarAdminDashboard (admin portal)
 *   /404            →  NotFound
 *
 * Dynamic tenant route (catches all slugs):
 *   /:slug/*        →  TenantPages  (reads slug → tenantRegistry → lazy routes)
 *
 * To add a new tenant: no changes needed here.
 * Add it to src/router/tenants/index.js only.
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Login from './pages/admin/Login';
import TenantResolver from './router/TenantResolver';
import ProtectedRoute from './router/ProtectedRoute';
import { LanguageProvider } from './context/LanguageContext';

// Lazy — keeps heavy admin deps out of the main bundle
const SmarAdminDashboard = lazy(() => import('./pages/smar/admin/SmarAdminDashboard'));

// Detect subdomain mode at module scope (stable across renders)
const _h = window.location.hostname;
const IS_SUBDOMAIN_MODE =
  _h !== 'localhost' && !_h.startsWith('127.') && _h.split('.').length >= 3;

function NotFound() {
  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#0a0a0f',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16
    }}>
      <span style={{
        color: '#d4a853', fontSize: 64, fontWeight: 900,
        letterSpacing: '-0.04em'
      }}>404</span>
      <span style={{
        color: 'rgba(255,255,255,0.3)', fontSize: 13,
        letterSpacing: '0.15em', textTransform: 'uppercase'
      }}>
        Tenant not found
      </span>
      <a href="/smar"
        style={{
          marginTop: 24, color: '#d4a853', fontSize: 12,
          letterSpacing: '0.1em', textDecoration: 'none',
          textTransform: 'uppercase', opacity: 0.6
        }}>
        ← Back to Smar
      </a>
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Root redirect ── */}
          <Route path="/" element={
            <Navigate to={
              IS_SUBDOMAIN_MODE
                ? (_h.startsWith('auth.') ? '/login' : '/showcase')
                : '/smar'
            } replace />
          } />

          {/* ── Static admin routes ── */}
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard/:slug/*" element={
            <ProtectedRoute>
              <Suspense fallback={null}><SmarAdminDashboard /></Suspense>
            </ProtectedRoute>
          } />

          {/* ── 404 ── */}
          <Route path="/404" element={<NotFound />} />

          {/* ── Dynamic tenant routes (must be last) ──
               Subdomain mode: /* so smar.domain.com/showcase resolves cleanly
               Localhost mode:  /:slug/* so /smar/showcase resolves correctly  */}
          {IS_SUBDOMAIN_MODE
            ? <Route path="/*"       element={<TenantResolver />} />
            : <Route path="/:slug/*" element={<TenantResolver />} />
          }
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
    </HelmetProvider>
  );
}

export default App;
