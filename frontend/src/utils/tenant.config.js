// src/utils/tenant.config.js
//
// Resolution priority (highest → lowest):
//   1. URL path /demo/:slug        → always wins on auth subdomain (prevents JWT bleed)
//   2. JWT payload                 → correct for subdomain + localhost admin routes
//   3. ?tenant= param              → localhost dev override
//   4. Path-based domain slug      → demo./alzabt. read the first path segment
//   5. Subdomain                   → a real per-tenant subdomain → its own name
//   6. Fallback                    → "smar" (local dev without any context)
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

  // ── 4. Path-based domain (demo./alzabt.salmansaas.com) — read slug from path ──
  //    2026-08-28 (Tenant Lifecycle + Dual Subdomain audit): previously this file had no
  //    path-reading fallback beyond tier 1's /demo/:slug special case, so a fresh (no-JWT,
  //    no-?tenant=) visit to alzabt.salmansaas.com/{slug} would have fallen through to tier 5
  //    below and misread "alzabt" itself as the slug. demo.salmansaas.com/{slug} had the same
  //    latent gap, just never triggered because App.jsx/TenantResolver.jsx handle the actual
  //    routing for real page loads — this hook is used independently in a few places, so it
  //    needs its own correct fallback rather than relying on those other files being right.
  const hostname = window.location.hostname;
  if ((hostname.startsWith('demo.') || hostname.startsWith('alzabt.')) && parts[0]) {
    return parts[0];
  }

  // ── 5. Subdomain (a real per-tenant subdomain) ─────────────────────────────
  if (hostname !== 'localhost' && !hostname.startsWith('127.') && hostname.includes('.')) {
    const sub = hostname.split('.')[0];
    if (!_RESERVED.has(sub)) return sub;
  }

  // ── 6. Fallback ────────────────────────────────────────────────────────────
  return 'smar';
};