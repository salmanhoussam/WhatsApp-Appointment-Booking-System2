/**
 * useTenantSlug.js
 *
 * Resolves the correct tenant slug regardless of routing mode:
 *   • Subdomain  (a real per-tenant subdomain, e.g. some-tenant.salmansaas.com) → reads from hostname
 *   • Path-based (localhost/smar/*, demo.salmansaas.com/smar/*,
 *     alzabt.salmansaas.com/smar/*)      → reads from useParams → "smar"
 *
 * Also exports useTenantBase() which returns the route prefix for navigate():
 *   • Subdomain mode  → ""         (navigate('/showcase'))
 *   • Path-based mode → "/smar"    (navigate('/smar/showcase'))
 *
 * This eliminates the double-slug URL bug (was: smar.salmansaas.com/smar/showcase).
 *
 * 2026-08-28 (Tenant Lifecycle + Dual Subdomain audit): this function previously had NO
 * demo./alzabt. awareness at all — unlike App.jsx/TenantResolver.jsx's own hostname checks — a
 * real, confirmed drift risk since this hook is used by 24+ files. demo. and alzabt. are both
 * path-based domains now (see App.jsx's IS_PATH_BASED_DOMAIN), so both must be excluded from
 * "subdomain mode" here too, or any component using this hook would misread the slug on those
 * hosts (e.g. reading "alzabt" as the tenant instead of the real path slug).
 */

import { useParams } from 'react-router-dom';

function _isSubdomainMode() {
  const h = window.location.hostname;
  const isLocal = h === 'localhost' || h.startsWith('127.') || h.startsWith('192.168.');
  if (isLocal) return false;
  if (h.startsWith('demo.') || h.startsWith('alzabt.')) return false;
  const parts = h.split('.');
  return parts.length >= 3 && parts[0] !== 'www';
}

export default function useTenantSlug() {
  const { slug: pathSlug } = useParams();
  if (_isSubdomainMode()) {
    return window.location.hostname.split('.')[0];
  }
  return pathSlug;
}

/**
 * useTenantBase()
 * Returns the navigation prefix to prepend to tenant-scoped routes.
 *   Subdomain: ""        → navigate(`${base}/showcase`) == navigate('/showcase')
 *   Localhost: "/smar"   → navigate(`${base}/showcase`) == navigate('/smar/showcase')
 */
export function useTenantBase() {
  const { slug: pathSlug } = useParams();
  if (_isSubdomainMode()) return '';
  return `/${pathSlug ?? ''}`;
}
