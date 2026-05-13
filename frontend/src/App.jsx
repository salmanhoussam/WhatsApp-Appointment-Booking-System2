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
const SmarAdminDashboard    = lazy(() => import('./pages/smar/admin/SmarAdminDashboard'));
const GenericAdminDashboard = lazy(() => import('./pages/generic-admin/GenericAdminDashboard'));
const SSOLoginPage          = lazy(() => import('./pages/auth/SSOLoginPage'));
const TenantRegisterPage    = lazy(() => import('./pages/auth/TenantRegisterPage'));
const SetupPage             = lazy(() => import('./pages/auth/SetupPage'));
const ShowcaseRoutes        = lazy(() => import('./router/showcase.routes'));
const ClientsManager        = lazy(() => import('./pages/super-admin/ClientsManager'));
const DynamicTenantResolver = lazy(() => import('./router/DynamicTenantResolver'));

// Detect subdomain mode at module scope (stable across renders)
const _h = window.location.hostname;
const IS_SUBDOMAIN_MODE =
  _h !== 'localhost' && !_h.startsWith('127.') && _h.split('.').length >= 3;
const IS_AUTH_SUBDOMAIN  = IS_SUBDOMAIN_MODE && _h.startsWith('auth.');
// salmansaas.com (no subdomain, not localhost) → serve showcase at root
const IS_SHOWCASE_DOMAIN = !IS_SUBDOMAIN_MODE && _h !== 'localhost' && !_h.startsWith('127.');

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
          {/* ── Root redirect — skipped on showcase domain (/* route handles it) ── */}
          {!IS_SHOWCASE_DOMAIN && (
            <Route path="/" element={
              <Navigate to={
                IS_SUBDOMAIN_MODE
                  ? (_h.startsWith('auth.') ? '/login' : '/showcase')
                  : '/smar'
              } replace />
            } />
          )}

          {/* ── Static admin routes ── */}
          {/* auth.salmansaas.com/login → SSO portal | localhost/login → legacy dev form */}
          <Route path="/login" element={
            IS_AUTH_SUBDOMAIN
              ? <Suspense fallback={null}><SSOLoginPage /></Suspense>
              : <Login />
          } />
          {/* /setup?token=xxx — one-time magic link login from onboarding pipeline */}
          <Route path="/setup" element={
            <Suspense fallback={null}><SetupPage /></Suspense>
          } />

          {/* /register — tenant self-sign-up (always accessible) */}
          <Route path="/register" element={
            <Suspense fallback={null}><TenantRegisterPage /></Suspense>
          } />
          {/* Subdomain mode: smar.domain.com/admin/units  (no slug in path) */}
          {IS_SUBDOMAIN_MODE && (
            <Route path="/admin/*" element={
              <ProtectedRoute>
                <Suspense fallback={null}><SmarAdminDashboard /></Suspense>
              </ProtectedRoute>
            } />
          )}
          {/* Subdomain mode legacy: smar.domain.com/dashboard/units */}
          {IS_SUBDOMAIN_MODE && (
            <Route path="/dashboard/*" element={
              <ProtectedRoute>
                <Suspense fallback={null}><SmarAdminDashboard /></Suspense>
              </ProtectedRoute>
            } />
          )}
          {/* Localhost: domain.com/:slug/admin/units */}
          <Route path="/:slug/admin/*" element={
            <ProtectedRoute>
              <Suspense fallback={null}><SmarAdminDashboard /></Suspense>
            </ProtectedRoute>
          } />
          {/* Path-based trial admin: salmansaas.com/dashboard/:slug  (all domains) */}
          <Route path="/dashboard/:slug/*" element={
            <ProtectedRoute>
              <Suspense fallback={null}><GenericAdminDashboard /></Suspense>
            </ProtectedRoute>
          } />

          {/* ── Trial public page — no auth, customers browse here ── */}
          {/* salmansaas.com/demo/:slug/*  or  auth.salmansaas.com/demo/:slug/*  or  localhost/demo/:slug/* */}
          {/* More specific than /* so it wins on showcase domain without any condition. */}
          <Route path="/demo/:slug/*" element={
            <Suspense fallback={null}><DynamicTenantResolver /></Suspense>
          } />

          {/* ── Trial admin — auth subdomain + localhost (no tenant DNS needed) ── */}
          {/* /:slug/dashboard  =  generic dashboard for all new tenants */}
          {(IS_AUTH_SUBDOMAIN || (!IS_SUBDOMAIN_MODE && !IS_SHOWCASE_DOMAIN)) && (
            <Route path="/:slug/dashboard/*" element={
              <ProtectedRoute>
                <Suspense fallback={null}><GenericAdminDashboard /></Suspense>
              </ProtectedRoute>
            } />
          )}

          {/* ── Super Admin Control Room ── */}
          <Route path="/super/*" element={
            <ProtectedRoute>
              <Suspense fallback={null}><ClientsManager /></Suspense>
            </ProtectedRoute>
          } />

          {/* ── 404 ── */}
          <Route path="/404" element={<NotFound />} />

          {/* ── Showcase domain: full site served at /* ── */}
          {IS_SHOWCASE_DOMAIN && (
            <Route path="/*" element={<Suspense fallback={null}><ShowcaseRoutes /></Suspense>} />
          )}

          {/* ── Localhost dev preview: /showcase/* ── */}
          {!IS_SHOWCASE_DOMAIN && !IS_SUBDOMAIN_MODE && (
            <Route path="/showcase/*" element={<Suspense fallback={null}><ShowcaseRoutes /></Suspense>} />
          )}

          {/* ── Dynamic tenant routes (must be last) ──
               Subdomain mode: /* so smar.domain.com/showcase resolves cleanly
               Localhost mode:  /:slug/* so /smar/showcase resolves correctly
               Showcase domain: TenantResolver not registered (ShowcaseRoutes above handles /*) */}
          {IS_SUBDOMAIN_MODE
            ? <Route path="/*"       element={<TenantResolver />} />
            : !IS_SHOWCASE_DOMAIN && <Route path="/:slug/*" element={<TenantResolver />} />
          }
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
    </HelmetProvider>
  );
}

export default App;
