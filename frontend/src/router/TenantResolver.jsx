/**
 * TenantResolver.jsx  —  The Smart SaaS Router
 *
 * This component intelligently determines the active tenant based on the environment:
 * - Production: Extracts slug from SUBDOMAIN (e.g., smar.domain.com/spatial)
 * - Localhost: Extracts slug from URL PATH (e.g., localhost:5173/smar/spatial)
 */

import React, { Suspense } from 'react';
import { useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { tenantRegistry } from './tenants/index';

// ── Full-screen gold-dot fallback ─────────────────────────────────────────
function TenantFallback() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d4a853', boxShadow: '0 0 18px 4px rgba(212,168,83,0.5)', animation: 'pulse 1.4s ease-in-out infinite' }} />
      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        Loading Experience
      </span>
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
    </div>
  );
}

// ── Main Resolver ────────────────────────────────────────────────────────
export default function TenantResolver() {
  const location = useLocation();
  const hostname = window.location.hostname || '';

  // 1. Detect Subdomain (Production)
  const parts = hostname.split('.');
  const isLocalhost = hostname === 'localhost' || hostname.startsWith('127.0.0.1');

  // If we have 3 or more parts (smar.salmansaas.com) and it's not 'www', it's a subdomain!
  const subdomain = (!isLocalhost && parts.length >= 3 && parts[0] !== 'www') ? parts[0] : null;

  // 2. Detect Path Slug (Fallback for Localhost)
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const pathSlug = pathSegments.length > 0 ? pathSegments[0] : null;

  // 3. Determine the Active Slug
  const activeSlug = subdomain || pathSlug;

  // If someone visits the root domain (salmansaas.com) without a slug, redirect to default
  if (!activeSlug) {
    return <Navigate to="/smar" replace />;
  }

  // 4. Validate Tenant Exists in Registry
  const tenant = tenantRegistry[activeSlug];
  if (!tenant) {
    return <Navigate to="/404" replace />;
  }

  const TenantRoutes = tenant.routes;

  // 5. Dynamic Route Mounting (The Magic Trick 🪄)
  // If Subdomain: Mount routes at root "/*" (smar.salmansaas.com/spatial)
  // If Localhost: Mount routes with slug prefix "/smar/*" (localhost:5173/smar/spatial)
  const routePath = subdomain ? "/*" : `/${activeSlug}/*`;

  return (
    <Routes>
      <Route
        path={routePath}
        element={
          <Suspense fallback={<TenantFallback />}>
            <TenantRoutes />
          </Suspense>
        }
      />
    </Routes>
  );
}