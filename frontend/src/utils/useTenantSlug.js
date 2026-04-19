/**
 * useTenantSlug.js
 *
 * Resolves the correct tenant slug regardless of routing mode:
 *   • Subdomain  (smar.salmansaas.com/*)  → reads from hostname  → "smar"
 *   • Path-based (localhost/smar/*)        → reads from useParams → "smar"
 *
 * Also exports useTenantBase() which returns the route prefix for navigate():
 *   • Subdomain mode  → ""         (navigate('/showcase'))
 *   • Path-based mode → "/smar"    (navigate('/smar/showcase'))
 *
 * This eliminates the double-slug URL bug (smar.salmansaas.com/smar/showcase).
 */

import { useParams } from 'react-router-dom';

function _isSubdomainMode() {
  const h = window.location.hostname;
  const isLocal = h === 'localhost' || h.startsWith('127.') || h.startsWith('192.168.');
  if (isLocal) return false;
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
