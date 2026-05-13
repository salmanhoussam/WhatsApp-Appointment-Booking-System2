/**
 * sneakers-beirut.routes.jsx — Routes for "Sneakers Beirut" tenant
 *
 * Owner: Ahmad | Template: fashion-grid | Module: store | page_type: showcase
 *
 * Routes:
 *   /sneakers-beirut          → redirect → store
 *   /sneakers-beirut/store    → CatalogPage (layoutOverride="showcase")
 *   /sneakers-beirut/cart     → CartPage
 */

import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../ProtectedRoute'
import { TenantConfigProvider } from '../../context/TenantConfigContext'

const CatalogPage = lazy(() => import('../../pages/generic/normal/CatalogPage'))
const CartPage    = lazy(() => import('../../pages/generic/normal/CartPage'))

function PageFallback() {
  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#3B82F6', boxShadow: '0 0 18px 4px rgba(59,130,246,0.4)',
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

export default function SneakersBeirutRoutes() {
  return (
    <TenantConfigProvider slug="sneakers-beirut">
      <Routes>
        <Route path="store"   element={<Lazy component={CatalogPage} layoutOverride="showcase" />} />
        <Route path="cart"    element={<Lazy component={CartPage} />} />

        <Route path="admin" element={
          <ProtectedRoute>
            <div style={{ color: '#fff', padding: 40, fontFamily: 'Cairo' }}>
              Admin dashboard — coming soon
            </div>
          </ProtectedRoute>
        } />

        <Route path=""  element={<Navigate to="store" replace />} />
        <Route path="*" element={<Navigate to="store" replace />} />
      </Routes>
    </TenantConfigProvider>
  )
}
