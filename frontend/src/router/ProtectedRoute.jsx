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

import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const location = useLocation();

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

  return children;
}
