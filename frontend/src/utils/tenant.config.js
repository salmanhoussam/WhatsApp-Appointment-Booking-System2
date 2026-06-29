// src/utils/tenant.config.js
//
// Resolution priority (highest → lowest):
//   1. URL path /demo/:slug  → always wins on auth subdomain (prevents JWT bleed)
//   2. JWT payload           → correct for subdomain + localhost admin routes
//   3. ?tenant= param        → localhost dev override
//   4. Subdomain             → smar.salmansaas.com → "smar"
//   5. Fallback              → "smar" (local dev without any context)
//
// NON-TENANT subdomains that must NOT be treated as slugs:
const _RESERVED = new Set(['auth', 'admin', 'manager', 'api', 'www', 'mail']);

export const getTenantSlug = () => {
  if (typeof window === 'undefined') return 'smar';

  // ── 1. URL path — /demo/:slug/* always wins ────────────────────────────────
  //    Must be checked first: a stored JWT for "smar" must NOT bleed into
  //    another tenant's demo page on demo.salmansaas.com/demo/cafe.
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts[0] === 'demo' && parts[1]) return parts[1];

  // ── 2. JWT (reliable for subdomain + localhost admin routes) ───────────────
  try {
    const token = localStorage.getItem('admin_access_token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload?.slug) return payload.slug;
    }
  } catch { /* malformed token — continue */ }

  // ── 3. ?tenant= query param (localhost dev shortcut) ──────────────────────
  const tenantParam = new URLSearchParams(window.location.search).get('tenant');
  if (tenantParam) return tenantParam;

  // ── 4. Subdomain (e.g. smar.salmansaas.com) ───────────────────────────────
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && !hostname.startsWith('127.') && hostname.includes('.')) {
    const sub = hostname.split('.')[0];
    if (!_RESERVED.has(sub)) return sub;
  }

  // ── 5. Fallback ────────────────────────────────────────────────────────────
  return 'smar';
};