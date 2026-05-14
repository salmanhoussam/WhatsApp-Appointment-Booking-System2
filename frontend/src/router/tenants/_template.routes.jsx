/**
 * _template.routes.jsx — Copy this file when scaffolding a new tenant.
 *
 * Steps:
 *   1. cp _template.routes.jsx [slug].routes.jsx
 *   2. Replace every occurrence of "MY_SLUG"  with the real slug (e.g. "tastybites")
 *   3. Replace every occurrence of "MY_COLOR" with the brand accent (e.g. "#e85d26")
 *   4. Choose the module block that matches the tenant's service_type (store / restaurant / booking)
 *      and delete the unused blocks.
 *   5. Register in src/router/tenants/index.js (see Step 5 comment at the bottom).
 *
 * service_type map:
 *   store       → CatalogPage + CartPage
 *   restaurant  → CatalogPage (menu view) + CartPage (order summary)
 *   real_estate → ListingsPage + BookingPage
 *   hotel       → ListingsPage + BookingPage
 */

import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../ProtectedRoute'
import { TenantConfigProvider } from '../../context/TenantConfigContext'

// ── Lazy page imports — choose the set that matches service_type ───────────────

// store / restaurant
const CatalogPage = lazy(() => import('../../pages/generic/normal/CatalogPage'))
const CartPage    = lazy(() => import('../../pages/generic/normal/CartPage'))

// real_estate / hotel (uncomment if needed)
// const ListingsPage = lazy(() => import('../../pages/generic/normal/ListingsPage'))
// const BookingPage  = lazy(() => import('../../pages/generic/normal/BookingPage'))

// ── Fallback spinner — replace MY_COLOR ──────────────────────────────────────
function PageFallback() {
  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: 'MY_COLOR',
        boxShadow: '0 0 18px 4px MY_COLOR40',
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

// ── Routes — replace MY_SLUG ─────────────────────────────────────────────────
export default function MySlugRoutes() {
  return (
    <TenantConfigProvider slug="MY_SLUG">
      <Routes>

        {/* ── STORE / RESTAURANT ── */}
        {/* page_type controls layout: "showcase" | "grid" | "list" */}
        <Route path="store"   element={<Lazy component={CatalogPage} layoutOverride="showcase" />} />
        <Route path="cart"    element={<Lazy component={CartPage} />} />

        {/* ── REAL ESTATE / HOTEL (swap above block for this one) ──
        <Route path="listings" element={<Lazy component={ListingsPage} />} />
        <Route path="book"     element={<Lazy component={BookingPage} />} />
        */}

        {/* ── Admin (always present, always JWT-gated) ── */}
        <Route path="admin/*" element={
          <ProtectedRoute>
            <Suspense fallback={<PageFallback />}>
              {/* Replace with tenant-specific admin dashboard when ready */}
              <div style={{ color: '#fff', padding: 40, fontFamily: 'Cairo', direction: 'rtl' }}>
                لوحة التحكم — قيد الإعداد
              </div>
            </Suspense>
          </ProtectedRoute>
        } />

        {/* ── Default redirect ── */}
        <Route path=""  element={<Navigate to="store" replace />} />
        <Route path="*" element={<Navigate to="store" replace />} />

      </Routes>
    </TenantConfigProvider>
  )
}

/*
 * Step 5 — Register in src/router/tenants/index.js:
 *
 *   import { lazy } from 'react'
 *
 *   export const tenantRegistry = {
 *     ...existingTenants,
 *     'MY_SLUG': {
 *       routes:          lazy(() => import('./MY_SLUG.routes')),
 *       defaultRedirect: 'store',   // or 'listings'
 *       theme:           'dark',    // 'dark' | 'light'
 *     },
 *   }
 */
