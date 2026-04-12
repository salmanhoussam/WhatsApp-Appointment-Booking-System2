/**
 * App.jsx  —  Root Router
 *
 * Strict separation of Global Routes vs Tenant Routes.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/mountain_dashboard/Login';
import TenantResolver from './router/TenantResolver';
import { LanguageProvider } from './context/LanguageContext';

function NotFound() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <span style={{ color: '#d4a853', fontSize: 64, fontWeight: 900, letterSpacing: '-0.04em' }}>404</span>
      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Tenant not found</span>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          {/* ── 1. Global / Independent Routes ── */}
          {/* Login is strictly global. No slug required to access it. */}
          <Route path="/login" element={<Login />} />

          <Route path="/404" element={<NotFound />} />

          {/* ── 2. The Smart SaaS Resolver (Handles Everything Else) ── */}
          <Route path="*" element={<TenantResolver />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;