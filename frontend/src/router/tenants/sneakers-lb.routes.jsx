/**
 * sneakers-lb.routes.jsx — Routes for "Sneakers LB" tenant
 *
 * Template: fashion-grid  |  Module: store  |  page_type: showcase
 *
 * Routes:
 *   /sneakers-lb          → redirect → store
 *   /sneakers-lb/store    → CatalogPage (layoutOverride="showcase")
 *   /sneakers-lb/cart     → CartPage (checkout + session_id flow)
 *   /sneakers-lb/admin    → (placeholder — JWT required)
 */

import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../ProtectedRoute'
import { TenantConfigProvider } from '../../context/TenantConfigContext'

const CatalogPage = lazy(() => import('../../pages/generic/normal/CatalogPage'))
const CartPage    = lazy(() => import('../../pages/generic/normal/CartPage'))

// ── Fallback ──────────────────────────────────────────────────────────────────
// Accent is #E8E8E8 (light silver) from fashion-grid template
function PageFallback() {
  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#E8E8E8', boxShadow: '0 0 18px 4px rgba(232,232,232,0.4)',
        animation: 'pulse 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
    </div>
  )
}

function Lazy({ component: Component, ...props }) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component {...props} />
    </Suspense>
  )
}

// ── Routes ────────────────────────────────────────────────────────────────────
export default function SneakersLbRoutes() {
  return (
    <TenantConfigProvider slug="sneakers-lb">
      <Routes>
        {/* page_type=showcase → CatalogPage with layoutOverride */}
        <Route path="store"   element={<Lazy component={CatalogPage} layoutOverride="showcase" />} />
        <Route path="cart"    element={<Lazy component={CartPage} />} />

        <Route path="admin" element={
          <ProtectedRoute>
            <div style={{ color: '#fff', padding: 40, fontFamily: 'Cairo' }}>
              Admin dashboard — coming soon
            </div>
          </ProtectedRoute>
        } />

        {/* Default redirect */}
        <Route path=""  element={<Navigate to="store" replace />} />
        <Route path="*" element={<Navigate to="store" replace />} />
      </Routes>
    </TenantConfigProvider>
  )
}
