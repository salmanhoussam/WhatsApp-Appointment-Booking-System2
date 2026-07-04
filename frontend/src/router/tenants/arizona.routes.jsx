/**
 * arizona.routes.jsx — All routes for the "arizona" tenant (restaurant)
 *
 * Routes:
 *   /arizona        → redirect → home
 *   /arizona/home   → ArizonaHomePage  (restaurant landing page)
 *   /arizona/menu   → ArizonaMenuPage  (menu + ordering)
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TenantConfigProvider } from '../../context/TenantConfigContext';

const ArizonaHomePage = lazy(() => import('../../pages/arizona/normal/HomePage'));
const ArizonaMenuPage = lazy(() => import('../../pages/arizona/normal/MenuPage'));

function PageFallback() {
  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#E3E55E',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem',
    }}>
      <div style={{ fontSize: '2.5rem' }}>🥤</div>
      <div style={{
        height: 4, width: 70, borderRadius: 99, background: '#2B5454',
        animation: 'az-load 1.2s ease-in-out infinite',
      }} />
      <style>{`@keyframes az-load{0%,100%{transform:scaleX(0.3);opacity:.4}50%{transform:scaleX(1);opacity:1}}`}</style>
    </div>
  );
}

function Lazy({ component: Component }) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
  );
}

export default function ArizonaRoutes() {
  return (
    <TenantConfigProvider slug="arizona">
      <Routes>
        <Route path="home" element={<Lazy component={ArizonaHomePage} />} />
        <Route path="menu" element={<Lazy component={ArizonaMenuPage} />} />
        <Route path=""     element={<Navigate to="home" replace />} />
        <Route path="*"    element={<Navigate to="home" replace />} />
      </Routes>
    </TenantConfigProvider>
  );
}
