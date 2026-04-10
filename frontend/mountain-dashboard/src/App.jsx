/**
 * App.jsx  —  Root Router
 *
 * Static routes:
 *   /               →  redirect → /smar
 *   /login          →  Login
 *   /dashboard/:slug/units  →  MountainDashboard (admin portal)
 *   /404            →  NotFound
 *
 * Dynamic tenant route (catches all slugs):
 *   /:slug/*        →  TenantPages  (reads slug → tenantRegistry → lazy routes)
 *
 * To add a new tenant: no changes needed here.
 * Add it to src/router/tenants/index.js only.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SmarAdminDashboard from './pages/smar/admin/SmarAdminDashboard';
import Login              from './pages/mountain_dashboard/Login';
import TenantPages        from './router/TenantPages';

function NotFound() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0f',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <span style={{ color: '#d4a853', fontSize: 64, fontWeight: 900,
                     letterSpacing: '-0.04em' }}>404</span>
      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13,
                     letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        Tenant not found
      </span>
      <a href="/smar"
         style={{ marginTop: 24, color: '#d4a853', fontSize: 12,
                  letterSpacing: '0.1em', textDecoration: 'none',
                  textTransform: 'uppercase', opacity: 0.6 }}>
        ← Back to Smar
      </a>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Root redirect ── */}
        <Route path="/" element={<Navigate to="/smar" replace />} />

        {/* ── Static admin routes ── */}
        <Route path="/login"                 element={<Login />} />
        <Route path="/dashboard/:slug/*"     element={<SmarAdminDashboard />} />

        {/* ── 404 ── */}
        <Route path="/404" element={<NotFound />} />

        {/* ── Dynamic tenant routes (must be last) ── */}
        <Route path="/:slug/*" element={<TenantPages />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
