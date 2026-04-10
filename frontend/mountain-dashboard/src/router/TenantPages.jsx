/**
 * TenantPages.jsx  —  Universal Tenant Router
 *
 * Reads :slug from the URL → looks it up in tenantRegistry →
 * lazy-renders the tenant's own Routes file.
 *
 * Adding a new tenant requires ZERO changes here.
 * Only src/router/tenants/index.js needs a new entry.
 */

import React, { Suspense }         from 'react';
import { useParams, Navigate }     from 'react-router-dom';
import { tenantRegistry }          from './tenants/index';

// ── Full-screen gold-dot fallback ─────────────────────────────────────────
function TenantFallback() {
  return (
    <div
      style={{
        width:          '100vw',
        height:         '100vh',
        background:     '#0a0a0f',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            16,
      }}
    >
      <div
        style={{
          width:        6,
          height:       6,
          borderRadius: '50%',
          background:   '#d4a853',
          boxShadow:    '0 0 18px 4px rgba(212,168,83,0.5)',
          animation:    'pulse 1.4s ease-in-out infinite',
        }}
      />
      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11,
                     letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        Loading Experience
      </span>
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────
export default function TenantPages() {
  const { slug } = useParams();

  const tenant = tenantRegistry[slug];

  // Unknown slug → 404
  if (!tenant) return <Navigate to="/404" replace />;

  const TenantRoutes = tenant.routes;

  return (
    <Suspense fallback={<TenantFallback />}>
      <TenantRoutes />
    </Suspense>
  );
}
