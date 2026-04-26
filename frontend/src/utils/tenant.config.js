// src/utils/tenant.config.js
//
// Resolution priority (highest → lowest):
//   1. JWT payload       → always correct, works on any subdomain/path
//   2. ?tenant= param    → localhost dev override
//   3. Subdomain         → smar.salmansaas.com → "smar"
//   4. URL path segment  → auth.../demo/:slug/* → slug from path
//   5. Fallback          → "smar" (local dev without any context)
//
// NON-TENANT subdomains that must NOT be treated as slugs:
const _RESERVED = new Set(['auth', 'admin', 'manager', 'api', 'www', 'mail']);

export const getTenantSlug = () => {
  if (typeof window === 'undefined') return 'smar';

  // ── 1. JWT (most reliable — issued for a specific tenant) ──────────────────
  try {
    const token = localStorage.getItem('admin_access_token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload?.slug) return payload.slug;
    }
  } catch { /* malformed token — continue */ }

  // ── 2. ?tenant= query param (localhost dev shortcut) ──────────────────────
  const tenantParam = new URLSearchParams(window.location.search).get('tenant');
  if (tenantParam) return tenantParam;

  // ── 3. Subdomain (e.g. smar.salmansaas.com) ───────────────────────────────
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && !hostname.startsWith('127.') && hostname.includes('.')) {
    const sub = hostname.split('.')[0];
    if (!_RESERVED.has(sub)) return sub;
  }

  // ── 4. URL path — /demo/:slug/* on auth subdomain ─────────────────────────
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts[0] === 'demo' && parts[1]) return parts[1];

  // ── 5. Fallback ────────────────────────────────────────────────────────────
  return 'smar';
};