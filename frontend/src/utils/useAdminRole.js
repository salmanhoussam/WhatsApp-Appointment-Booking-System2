/**
 * Decodes the JWT stored in localStorage and returns the admin's role.
 * Returns null if no token is present or the token is malformed.
 */
export function useAdminRole() {
  try {
    const token = localStorage.getItem('admin_access_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.role ?? null;
  } catch {
    return null;
  }
}

// Role permission map — which tabs each role can access
export const ROLE_TABS = {
  SUPER_ADMIN:          ['inbox', 'bookings', 'units', 'dashboard', 'housekeeping', 'maintenance', 'gardens', 'settings', 'team'],
  TENANT_ADMIN:         ['inbox', 'bookings', 'units', 'dashboard', 'housekeeping', 'maintenance', 'gardens', 'settings', 'team'],
  MANAGER_RESERVATIONS: ['inbox', 'bookings', 'dashboard', 'housekeeping', 'maintenance', 'gardens'],
  MANAGER_UNITS:        ['units', 'dashboard', 'housekeeping', 'maintenance', 'gardens'],
};

export function canAccessTab(role, tabId) {
  if (!role) return false;
  return (ROLE_TABS[role] ?? []).includes(tabId);
}
