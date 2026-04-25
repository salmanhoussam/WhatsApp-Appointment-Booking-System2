/**
 * Decodes the JWT stored in localStorage and returns the admin's role.
 * Returns null if no token is present or the token is malformed.
 */
const _LEGACY_ROLE_MAP = { manager: 'TENANT_ADMIN', admin: 'TENANT_ADMIN' };

export function useAdminRole() {
  try {
    const token = localStorage.getItem('admin_access_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Client token (tenant owner) → full TENANT_ADMIN access
    if (payload?.type === 'client') return 'TENANT_ADMIN';
    // Legacy string roles from before the UserRole enum migration
    const role = payload?.role ?? null;
    return _LEGACY_ROLE_MAP[role] ?? role;
  } catch {
    return null;
  }
}

// Role permission map — which tabs each role can access
export const ROLE_TABS = {
  SUPER_ADMIN:          ['inbox', 'bookings', 'units', 'services', 'dashboard', 'housekeeping', 'maintenance', 'gardens', 'settings', 'pagebuilder', 'team'],
  TENANT_ADMIN:         ['inbox', 'bookings', 'units', 'services', 'dashboard', 'housekeeping', 'maintenance', 'gardens', 'settings', 'pagebuilder', 'team'],
  MANAGER_RESERVATIONS: ['inbox', 'bookings', 'dashboard', 'housekeeping', 'maintenance', 'gardens'],
  MANAGER_UNITS:        ['units', 'services', 'dashboard', 'housekeeping', 'maintenance', 'gardens'],
};

export function canAccessTab(role, tabId) {
  if (!role) return false;
  return (ROLE_TABS[role] ?? []).includes(tabId);
}
