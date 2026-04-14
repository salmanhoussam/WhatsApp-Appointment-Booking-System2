/**
 * useTenantSlug.js
 *
 * Resolves the correct tenant slug regardless of routing mode:
 *   • Subdomain  (smar.salmansaas.com/*)  → reads from hostname  → "smar"
 *   • Path-based (localhost/smar/*)        → reads from useParams → "smar"
 *
 * Problem this solves:
 *   App.jsx mounts the catch-all at /:slug/*, so on a subdomain like
 *   smar.salmansaas.com/showcase, useParams().slug === "showcase" (the
 *   path segment), NOT "smar" (the subdomain). This hook fixes that.
 */

import { useParams } from 'react-router-dom';

export default function useTenantSlug() {
  const { slug: pathSlug } = useParams();
  const hostname = window.location.hostname;

  // Treat localhost and 127.x.x.x as path-based
  const isLocalhost =
    hostname === 'localhost' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('192.168.');

  if (!isLocalhost) {
    const parts = hostname.split('.');
    // e.g. ["smar", "salmansaas", "com"] — length >= 3 and not "www"
    if (parts.length >= 3 && parts[0] !== 'www') {
      return parts[0];
    }
  }

  // Path-based fallback (localhost dev)
  return pathSlug;
}
