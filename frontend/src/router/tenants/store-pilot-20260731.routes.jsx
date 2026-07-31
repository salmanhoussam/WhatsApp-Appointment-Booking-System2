/**
 * store-pilot-20260731.routes.jsx — Routes for the Store Template Pilot tenant
 *
 * Template: fashion-grid  |  Module: store  |  page_type: showcase
 *
 * Routes:
 *   /store-pilot-20260731          → redirect → store
 *   /store-pilot-20260731/store    → CatalogPage (generic — store module)
 *   /store-pilot-20260731/cart     → CartPage (generic — checkout + WhatsApp + session_id flow)
 *   /store-pilot-20260731/admin    → GenericAdminDashboard (JWT required — owner adds products,
 *                                     views orders, generates QR, here)
 *
 * Same minimal shape as sneakers-lb.routes.jsx (the closest existing precedent for a
 * fashion-grid store tenant with no bespoke pages), but wires the real GenericAdminDashboard
 * (matching beit-al-fakhar.routes.jsx's pattern) instead of a placeholder, since this tenant's
 * whole point is a working admin experience (product entry, QR, orders).
 */

import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../ProtectedRoute'
import { TenantConfigProvider } from '../../context/TenantConfigContext'

const CatalogPage           = lazy(() => import('../../pages/generic/normal/CatalogPage'))
const CartPage              = lazy(() => import('../../pages/generic/normal/CartPage'))
const GenericAdminDashboard = lazy(() => import('../../pages/generic-admin/GenericAdminDashboard'))

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
export default function StorePilot20260731Routes() {
  return (
    <TenantConfigProvider slug="store-pilot-20260731">
      <Routes>
        <Route path="store" element={<Lazy component={CatalogPage} layoutOverride="showcase" />} />
        <Route path="cart"  element={<Lazy component={CartPage} />} />

        <Route path="admin" element={
          <ProtectedRoute>
            <Lazy component={GenericAdminDashboard} />
          </ProtectedRoute>
        } />

        {/* Default redirect */}
        <Route path=""  element={<Navigate to="store" replace />} />
        <Route path="*" element={<Navigate to="store" replace />} />
      </Routes>
    </TenantConfigProvider>
  )
}
