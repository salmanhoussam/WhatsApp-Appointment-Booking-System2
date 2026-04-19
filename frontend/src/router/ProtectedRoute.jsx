/**
 * ProtectedRoute.jsx
 *
 * Guards any route that requires an authenticated admin session.
 * Reads `admin_access_token` from localStorage — the same key
 * that Login.jsx writes on successful auth.
 *
 * Usage (in smar.routes.jsx):
 *   <Route path="admin" element={<ProtectedRoute><Lazy component={SmarAdminDashboard} /></ProtectedRoute>} />
 */

import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('admin_access_token')
    : null;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
