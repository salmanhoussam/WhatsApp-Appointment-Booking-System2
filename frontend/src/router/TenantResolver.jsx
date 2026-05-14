/**
 * TenantResolver.jsx  —  The Smart SaaS Router
 *
 * Determines the active tenant from the environment:
 *   Production subdomain: smar.domain.com/spatial  → slug = 'smar'
 *   Localhost path:        localhost/smar/spatial   → slug = 'smar'
 *
 * ─── Why NO nested <Routes> here ────────────────────────────────────────────
 * App.jsx mounts this component at <Route path="/:slug/*">.
 * React Router v6 strips the matched prefix from the RouteContext:
 *   URL: /smar/showcase  →  parent pathnameBase = '/smar'
 *   Remaining for any child <Routes>: '/showcase'
 *
 * If TenantResolver added its OWN <Routes path="/smar/*">, that inner Routes
 * would try to match "/smar/*" against "/showcase" → no match → blank screen
 * (no error, just null render).
 *
 * Fix: render the tenant's <Routes> (SmarRoutes, etc.) directly inside
 * <Suspense>. The tenant's Routes inherits pathnameBase='/smar' from App.jsx
 * and correctly matches relative paths like "showcase", "spatial", etc.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Suspense, lazy } from 'react';
import { Navigate }        from 'react-router-dom';
import { tenantRegistry }  from './tenants/index';

// Fallback for tenants not in the registry (onboarded via pipeline, not scaffolded)
const DynamicTenantRoutes = lazy(() => import('./tenants/_dynamic.routes'));

const SSOLoginPage = lazy(() => import('../pages/auth/SSOLoginPage'));

// ── Full-screen gold-dot fallback (shown while lazy chunk downloads) ──────────
function TenantFallback() {
  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#0a0a0f',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#d4a853',
        boxShadow: '0 0 18px 4px rgba(212,168,83,0.5)',
        animation: 'pulse 1.4s ease-in-out infinite',
      }} />
      <span style={{
        color: 'rgba(255,255,255,0.25)', fontSize: 11,
        letterSpacing: '0.2em', textTransform: 'uppercase',
      }}>
        Loading Experience
      </span>
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
    </div>
  );
}

// ── Main Resolver ─────────────────────────────────────────────────────────────
export default function TenantResolver() {
  const hostname    = window.location.hostname || '';
  const isLocalhost = hostname === 'localhost' || hostname.startsWith('127.0.0.1');

  // Subdomain detection (production): smar.salmansaas.com → 'smar'
  const parts     = hostname.split('.');
  const subdomain = (!isLocalhost && parts.length >= 3 && parts[0] !== 'www')
    ? parts[0]
    : null;

  // Path-based slug (localhost): /smar/showcase → 'smar'
  const pathSlug = window.location.pathname.split('/').filter(Boolean)[0] ?? null;

  // Subdomain takes priority on production; path-based on localhost
  const activeSlug = subdomain ?? pathSlug;

  if (!activeSlug) {
    return <Navigate to="/smar" replace />;
  }

  // auth.salmansaas.com → render the SSO login page directly, no tenant routing
  if (hostname.startsWith('auth.')) {
    return (
      <Suspense fallback={<TenantFallback />}>
        <SSOLoginPage />
      </Suspense>
    );
  }

  // Legacy URL fix: smar.salmansaas.com/smar/showcase → /showcase
  // Happens when old links or navigate() calls still include the slug prefix.
  if (subdomain) {
    const path = window.location.pathname;
    if (path.startsWith(`/${subdomain}/`) || path === `/${subdomain}`) {
      const stripped = path.slice(subdomain.length + 1) || '/showcase';
      return <Navigate to={stripped + window.location.search} replace />;
    }
  }

  const tenant = tenantRegistry[activeSlug];

  // Unknown slug: not a registered custom tenant.
  // Serve via the generic dynamic page system — DynamicPage fetches its own config
  // and shows sections built in the Page Builder (or a fallback if none configured).
  // This covers every tenant created through the onboarding pipeline.
  if (!tenant) {
    return (
      <Suspense fallback={<TenantFallback />}>
        <DynamicTenantRoutes />
      </Suspense>
    );
  }

  // Render the tenant's Routes directly — NO extra <Routes> wrapper here.
  // The tenant component (e.g. SmarRoutes) owns its own <Routes> and will
  // correctly resolve paths relative to the pathnameBase set by App.jsx.
  const TenantRoutes = tenant.routes;

  return (
    <Suspense fallback={<TenantFallback />}>
      <TenantRoutes />
    </Suspense>
  );
}
