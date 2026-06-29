/**
 * DynamicTenantResolver.jsx
 *
 * Sub-router for the /demo/:slug/* prefix. Always available on every domain.
 * Used for trial previews and the admin dashboard iframe.
 *
 * ── Routing strategy ──────────────────────────────────────────────────────────
 *
 * DEVELOPMENT (localhost:5173):
 *   /demo/:slug           → DynamicPage   (sections-driven, trial ribbon shown)
 *   /demo/:slug/catalog   → DemoCatalogPage
 *   /demo/:slug/legacy    → DemoPublicPage (old ConfigurableHero, keep as escape hatch)
 *   /:slug                → TenantResolver → _dynamic.routes → DynamicPage
 *   /:slug/dashboard/*    → GenericAdminDashboard (JWT-gated)
 *
 * PRODUCTION — path-based (salmansaas.com):
 *   Same as development. /demo/:slug is the public trial preview.
 *   /:slug/dashboard/* is the admin portal.
 *
 * PRODUCTION — subdomain (slug.salmansaas.com):
 *   /              → TenantResolver → _dynamic.routes → DynamicPage
 *   /catalog       → CatalogPage
 *   /admin/*       → GenericAdminDashboard (JWT-gated, /admin/* route in App.jsx)
 *   Demo still at: demo.salmansaas.com/demo/:slug (auth subdomain)
 *
 * ── page_type is NOT a separate URL ───────────────────────────────────────────
 * page_type ("showcase", "catalog", "restaurant", "store", "normal") is a
 * config field, not a route segment. DynamicPage reads it and decides what
 * to show when sections: [] (no sections built yet):
 *   showcase → ConfigurableHero (legacy hero from tenant settings)
 *   catalog/restaurant/store → redirect to ./catalog
 *   normal/anything else → "coming soon" message
 * When sections are configured, page_type is ignored — sections drive the page.
 *
 * ── Production API ────────────────────────────────────────────────────────────
 * All API calls use publicApi (utils/publicApi.js) which reads VITE_API_URL.
 * Set this in Railway env vars:
 *   VITE_API_URL=https://your-backend.up.railway.app
 * No changes to backend CORS needed — the domain is already in the allow-list.
 *
 * useParams() in child components inherits { slug } from the parent
 * route in App.jsx — no need to re-extract it here.
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { tenantRegistry } from './tenants/index.js';

const DynamicPage     = lazy(() => import('../pages/generic/normal/DynamicPage'));
const DemoPublicPage  = lazy(() => import('../pages/demo/DemoPublicPage'));
const DemoCatalogPage = lazy(() => import('../pages/demo/DemoCatalogPage'));

function PageFallback() {
  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#d4a853',
        boxShadow: '0 0 18px 4px rgba(212,168,83,0.5)',
        animation: 'pulse 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
    </div>
  );
}

export default function DynamicTenantResolver() {
  const { slug } = useParams();

  // Custom-built tenants have dedicated routes — canonical URL is /{slug}/{defaultRedirect}
  // /demo/{slug} for these must redirect so there is exactly ONE public URL per tenant.
  if (slug && tenantRegistry[slug]) {
    const redirect = tenantRegistry[slug].defaultRedirect || 'home';
    return <Navigate to={`/${slug}/${redirect}`} replace />;
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route index            element={<DynamicPage />}     />
        <Route path="catalog"   element={<DemoCatalogPage />} />
        <Route path="menu"      element={<DemoCatalogPage />} />
        <Route path="store"     element={<DemoCatalogPage />} />
        <Route path="legacy"    element={<DemoPublicPage />}  />
        {/* Static test pages — served under any demo slug, e.g. /demo/sneakers-beirut/hamoudi */}
        <Route path="hamoudi"   element={<iframe src="/hamoudi.html" style={{ width:'100vw', height:'100vh', border:'none', display:'block' }} title="hamoudi" />} />
        <Route path="*"         element={<DynamicPage />}     />
      </Routes>
    </Suspense>
  );
}
