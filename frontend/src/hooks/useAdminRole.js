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
  SUPER_ADMIN:          ['inbox', 'bookings', 'units', 'gallery', 'services', 'dashboard', 'housekeeping', 'maintenance', 'gardens', 'settings', 'pagebuilder', 'team'],
  TENANT_ADMIN:         ['inbox', 'bookings', 'units', 'gallery', 'services', 'dashboard', 'housekeeping', 'maintenance', 'gardens', 'settings', 'pagebuilder', 'team'],
  MANAGER_RESERVATIONS: ['inbox', 'bookings', 'dashboard', 'housekeeping', 'maintenance', 'gardens'],
  MANAGER_UNITS:        ['units', 'gallery', 'services', 'dashboard', 'housekeeping', 'maintenance', 'gardens'],
};

export function canAccessTab(role, tabId) {
  if (!role) return false;
  return (ROLE_TABS[role] ?? []).includes(tabId);
}

/**
 * Staff Scoped Access Phase D (2026-08-09) -- the STAFF-role JWT now carries a display-only
 * barber_id claim (never used for backend authorization -- that stays DB-sourced, see
 * get_current_admin_user()). A separate hook rather than extending useAdminRole()'s return shape,
 * to avoid changing its existing string-return contract for every current call site.
 */
export function useAdminBarberId() {
  try {
    const token = localStorage.getItem('admin_access_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.barber_id ?? null;
  } catch {
    return null;
  }
}
