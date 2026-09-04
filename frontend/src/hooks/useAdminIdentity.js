import { useQuery } from '@tanstack/react-query'
import adminApi from '../utils/admin.config'
import useTenantSlug from './useTenantSlug'

/**
 * The authenticated admin's SERVER-RESOLVED identity, authority and tenant capabilities.
 *
 * Phase 2B-4 (design: .claudedocs/implementation/PERMISSION_MODEL/PHASE_2B_4_DESIGN.md).
 * Closes finding B1 of Dashboard Architecture Review 1: Phase 2B-3 deliberately put permissions in
 * the DATABASE with zero token changes, so the JWT this dashboard decodes client-side
 * (useAdminRole) structurally cannot see them. A `shop_manager` account stores role=STAFF as an
 * inert placeholder -- rendering nav from that role would show it exactly the three surfaces it has
 * no permission for. Nav must therefore come from the server, not the token.
 *
 * This hook does NOT replace useAdminRole()/useAdminBarberId(): those have call sites outside this
 * dashboard (ProtectedRoute, the legacy smar dashboard) and stay untouched. This phase changes what
 * GenericAdminDashboard *trusts*, not what exists -- the same "add alongside, delete nothing"
 * discipline the backend used for require_roles.
 *
 * Shape (see PHASE_2B_4_DESIGN.md §3.3):
 *   { identity:     { account_type, user_id, full_name, email, client_id, slug },
 *     authority:    { role, is_legacy, permissions, scope, preset, scopable_areas },
 *     capabilities: { active_services } }
 *
 * `authority.permissions` is null for a legacy account -- that is correct and load-bearing, not a
 * missing value: a legacy account genuinely has no resolved array (invariant I1 preserves its
 * behaviour through each route's own role tuple, never through a derived bundle).
 */
export default function useAdminIdentity() {
  const slug = useTenantSlug()

  const { data, isLoading, error } = useQuery({
    queryKey: [slug, 'admin', 'me'],
    queryFn: async () => {
      const { data } = await adminApi.get('/me')
      return data
    },
    // Authority is security-relevant: never serve it from a stale cache across a session. Revoking
    // a permission takes effect on the next request server-side (I6); the UI should follow within
    // the same session rather than holding a cached view of what this account used to be allowed.
    staleTime: 0,
    retry: 1,
  })

  const authority = data?.authority ?? null

  return {
    identity:       data?.identity ?? null,
    authority,
    activeServices: data?.capabilities?.active_services ?? null,
    isLegacy:       authority?.is_legacy ?? null,
    isLoading,
    error: error ? (error?.response?.data?.detail || error.message) : null,
  }
}

/**
 * Does this authority satisfy `permission`?
 *
 * Mirrors app/core/permissions.py's has_permission() write-implies-read rule (I5) and NOTHING else.
 * The server deliberately returns the stored array verbatim rather than an expanded one, so this
 * single helper is the one place that expansion happens on the client -- never inlined at a call
 * site, so the two can be compared and cannot quietly diverge in several places at once.
 *
 * Returns false for a legacy authority: a legacy account has no array to test, and its visibility
 * is decided by the existing role/capability path instead (design §5.2).
 */
export function hasPermission(authority, permission) {
  const perms = authority?.permissions
  if (!Array.isArray(perms)) return false
  if (perms.includes(permission)) return true
  if (permission.endsWith('.read')) {
    const area = permission.slice(0, permission.lastIndexOf('.'))
    return perms.includes(`${area}.write`)
  }
  return false
}
