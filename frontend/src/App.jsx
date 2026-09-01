/**
 * App.jsx  —  Root Router
 *
 * Static routes:
 *   /               →  redirect → /showcase
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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/admin/Login';
import TenantResolver from './router/TenantResolver';
import ProtectedRoute from './router/ProtectedRoute';
import { AppLanguageProvider } from './context/AppLanguageContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 min default — override per-hook
      gcTime:    10 * 60 * 1000,   // 10 min cache retention
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Lazy — keeps heavy admin deps out of the main bundle
const SmarAdminDashboard    = lazy(() => import('./pages/smar/admin/SmarAdminDashboard'));
const GenericAdminDashboard = lazy(() => import('./pages/generic-admin/GenericAdminDashboard'));
const SSOLoginPage          = lazy(() => import('./pages/auth/SSOLoginPage'));
const TenantRegisterPage    = lazy(() => import('./pages/auth/TenantRegisterPage'));
const SetupPage             = lazy(() => import('./pages/auth/SetupPage'));
const ShowcaseRoutes        = lazy(() => import('./router/showcase.routes'));
const ClientsManager        = lazy(() => import('./pages/super-admin/ClientsManager'));
const DynamicTenantResolver = lazy(() => import('./router/DynamicTenantResolver'));

// Marketing landing page — formerly on Cloudflare, now integrated
const MarketingApp = lazy(() => import('./pages/marketing/MarketingApp'));

// Dating module (Phase 75) — standalone, before /:slug/* catch-all
const DatingPageResolver = lazy(() => import('./pages/dating/DatingPageResolver'));
const DatingCreatePage   = lazy(() => import('./pages/dating/DatingCreatePage'));

// Detect subdomain mode at module scope (stable across renders)
// _IS_LOCAL_HOST mirrors useTenantSlug.js's own _isSubdomainMode() check — a private LAN IP
// (192.168.x.x, used for on-network device testing) must be treated as path-based/local mode,
// same as localhost/127.*, or this file and useTenantSlug.js disagree on IS_SUBDOMAIN_MODE and
// register the tenant catch-all as the wrong route pattern (/* instead of /:slug/*), breaking
// TenantResolver's pathnameBase assumption silently (blank #root, no console error).
const _h = window.location.hostname;
const _IS_LOCAL_HOST = _h === 'localhost' || _h.startsWith('127.') || _h.startsWith('192.168.');
const IS_SUBDOMAIN_MODE = !_IS_LOCAL_HOST && _h.split('.').length >= 3;
const IS_DEMO_SUBDOMAIN  = IS_SUBDOMAIN_MODE && _h.startsWith('demo.');
// alzabt.salmansaas.com — canonical domain for SUBSCRIBED/paid tenants (Tenant Lifecycle + Dual
// Subdomain audit, 2026-08-28), replacing the old per-tenant subdomain pattern (smar.salmansaas.com,
// retired). Path-based exactly like demo.salmansaas.com — see IS_PATH_BASED_DOMAIN below.
const IS_ALZABT_SUBDOMAIN = IS_SUBDOMAIN_MODE && _h.startsWith('alzabt.');
// Both demo. and alzabt. resolve the tenant slug from the URL path, not the hostname — every
// branch below that needs "acts like demo." for routing purposes should key off this, not
// IS_DEMO_SUBDOMAIN alone. A branch that must stay demo-only (or gain alzabt-specific behavior)
// still keys off the specific flag instead — see the 2026-08-28 audit's per-branch table.
const IS_PATH_BASED_DOMAIN = IS_DEMO_SUBDOMAIN || IS_ALZABT_SUBDOMAIN;
// salmansaas.com (no subdomain, not localhost) → serve showcase at root
const IS_SHOWCASE_DOMAIN = !IS_SUBDOMAIN_MODE && !_IS_LOCAL_HOST;

// alzabt.salmansaas.com's bare root (no slug) has no valid page of its own — every real
// subscriber link always includes a slug. Redirect to the real marketing site. This is a
// cross-origin navigation (different hostname), so React Router's <Navigate> can't do it —
// it only handles same-origin SPA routes.
function ExternalRedirect({ to }) {
  if (typeof window !== 'undefined') window.location.replace(to);
  return null;
}

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
    <QueryClientProvider client={queryClient}>
    <HelmetProvider>
    <AppLanguageProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Root redirect — skipped on showcase domain (/* route handles it) ──
              alzabt.salmansaas.com has no bare-root page — every real subscriber link includes a
              slug — so it redirects out to the real marketing site instead of into the SPA. */}
          {!IS_SHOWCASE_DOMAIN && (
            <Route path="/" element={
              IS_ALZABT_SUBDOMAIN
                ? <ExternalRedirect to="https://salmansaas.com" />
                : <Navigate to={
                    IS_SUBDOMAIN_MODE
                      ? (_h.startsWith('demo.') ? '/home' : '/showcase')
                      : '/showcase'
                  } replace />
            } />
          )}

          {/* ── Static admin routes ── */}
          {/* demo.salmansaas.com/login and alzabt.salmansaas.com/login → SSO portal (real
              subscribed tenants log in here too) | localhost/login → legacy dev form */}
          <Route path="/login" element={
            IS_PATH_BASED_DOMAIN
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

          {/* ── Static test pages served via iframe (no tenant config needed) ── */}
          <Route path="/demo/hamoudi" element={
            <iframe src="/hamoudi.html" style={{ width:'100vw', height:'100vh', border:'none', display:'block' }} title="hamoudi" />
          } />

          {/* ── Trial public page — no auth, customers browse here ── */}
          {/* salmansaas.com/demo/:slug/*  or  demo.salmansaas.com/demo/:slug/*  or  localhost/demo/:slug/* */}
          {/* More specific than /* so it wins on showcase domain without any condition. */}
          <Route path="/demo/:slug/*" element={
            <Suspense fallback={null}><DynamicTenantResolver /></Suspense>
          } />

          {/* ── Trial + subscribed admin — demo/alzabt subdomain + localhost (no tenant DNS needed) ── */}
          {/* /:slug/dashboard  =  generic dashboard for all tenants, trial or subscribed */}
          {(IS_PATH_BASED_DOMAIN || (!IS_SUBDOMAIN_MODE && !IS_SHOWCASE_DOMAIN)) && (
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

          {/* ── Demo subdomain: /home → DemoLandingPage via ShowcaseRoutes ── */}
          {IS_DEMO_SUBDOMAIN && (
            <Route path="/home/*" element={<Suspense fallback={null}><ShowcaseRoutes /></Suspense>} />
          )}

          {/* ── Demo subdomain: /alzabt → direct entry into the isolated alzabt-demo tenant ──
              salmansaas.com Product IA decision, 2026-08-12: demo.salmansaas.com/alzabt is the
              dedicated demo surface for the Alzabt product (distinct from /alzabt on the bare
              domain, which is the marketing page). Redirects straight into the existing,
              pre-seeded alzabt-demo tenant's reserve flow -- never creates a new tenant, never
              touches RK. No /smart-order equivalent yet -- that product has no real tenant to
              redirect to. */}
          {IS_DEMO_SUBDOMAIN && (
            <Route path="/alzabt" element={<Navigate to="/alzabt-demo/reserve" replace />} />
          )}

          {/* ── Localhost dev preview: /showcase/* ── */}
          {!IS_SHOWCASE_DOMAIN && !IS_SUBDOMAIN_MODE && (
            <Route path="/showcase/*" element={<Suspense fallback={null}><ShowcaseRoutes /></Suspense>} />
          )}

          {/* ── Marketing landing (accessible everywhere, before tenant catch-all) ── */}
          <Route path="/marketing" element={
            <Suspense fallback={null}><MarketingApp /></Suspense>
          } />

          {/* ── /alzabt → redirect to the canonical unified homepage, 2026-08-26 (Alzabt Homepage
              Implementation Contract) — Alzabt is the one product, "/" is now its real homepage;
              this route stays only as a backward-compat alias for old links. The old marketing
              page it used to render, AlzabtLandingPage.jsx, is left on disk untouched -- not
              deleted -- per the Contract's own instruction not to conflate this rebuild with a
              cleanup pass. */}
          <Route path="/alzabt" element={<Navigate to="/" replace />} />

          {/* ── Dating module routes (must be before /:slug/*) ── */}
          <Route path="/dating/create" element={
            <Suspense fallback={null}><DatingCreatePage /></Suspense>
          } />
          <Route path="/dating/:slug" element={
            <Suspense fallback={null}><DatingPageResolver /></Suspense>
          } />

          {/* ── Dynamic tenant routes (must be last) ──
               Subdomain mode: /* so a real per-tenant subdomain resolves cleanly (legacy pattern,
                 no tenant currently uses it — smar.salmansaas.com was the last one, retired 2026-08-28)
               Demo/alzabt subdomain: /:slug/* ALSO registered so /olivello/* or /smar/* gets the
                 correct pathnameBase — React Router ranks this more specific pattern above the bare
                 /* also registered below for the same host (IS_SUBDOMAIN_MODE is true for both),
                 same mechanism this project already relies on for demo.salmansaas.com.
               Localhost mode:  /:slug/* so /smar/showcase resolves correctly
               Showcase domain: TenantResolver not registered (ShowcaseRoutes above handles /*) */}
          {IS_PATH_BASED_DOMAIN && (
            <Route path="/:slug/*" element={<TenantResolver />} />
          )}
          {IS_SUBDOMAIN_MODE
            ? <Route path="/*"       element={<TenantResolver />} />
            : !IS_SHOWCASE_DOMAIN && <Route path="/:slug/*" element={<TenantResolver />} />
          }
        </Routes>
      </BrowserRouter>
    </AppLanguageProvider>
    </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
