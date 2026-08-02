/**
 * ProtectedRoute.jsx
 *
 * Guards admin routes. Two auth sources are supported:
 *
 *   1. localStorage `admin_access_token`  — set by the local Login.jsx
 *   2. URL `?token=<jwt>`                 — set by SSOLoginPage redirect from
 *                                           demo.salmansaas.com (cross-subdomain)
 *
 * SSO token handoff flow:
 *   demo.salmansaas.com logs in → redirects to
 *   smar.salmansaas.com/dashboard/smar/units?token=<jwt>
 *   ProtectedRoute reads ?token=, saves to localStorage, strips from URL,
 *   then renders the protected page on the next pass.
 */

import { Navigate, useLocation, useParams } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { slug: routeSlug } = useParams();

  // ── SSO token handoff ────────────────────────────────────────────────────────
  const params   = new URLSearchParams(location.search);
  const urlToken = params.get('token');
  if (urlToken) {
    localStorage.setItem('admin_access_token', urlToken);
    params.delete('token');
    const clean = location.pathname + (params.toString() ? `?${params.toString()}` : '');
    return <Navigate to={clean} replace />;
  }

  // ── Standard localStorage guard ──────────────────────────────────────────────
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('admin_access_token')
    : null;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ── Tenant-match guard ──────────────────────────────────────────────────────
  // A JWT left over from a previously-visited tenant must not be allowed to
  // render a different tenant's protected route — confirmed real bug,
  // 2026-08-02 (Product Readiness Audit): navigating straight to a new
  // tenant's admin URL while an old tenant's token was still in localStorage
  // let components mount and fire real requests scoped to the OLD tenant
  // before anything caught the mismatch. Only runs when the current route
  // actually carries a :slug param to compare against (subdomain-mode routes
  // with no :slug segment are unaffected by this check, unchanged).
  if (routeSlug) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload?.slug && payload.slug !== routeSlug) {
        localStorage.removeItem('admin_access_token');
        return <Navigate to="/login" replace />;
      }
    } catch {
      // malformed token — fall through, the existing 401 response interceptor
      // in admin.config.js already handles this case downstream
    }
  }

  return children;
}
