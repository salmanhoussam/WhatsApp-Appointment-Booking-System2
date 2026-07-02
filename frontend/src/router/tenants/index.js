/**
 * tenants/index.js  —  Tenant Registry
 *
 * Single source of truth for all tenants.
 *
 * ── Canonical URL Rule ────────────────────────────────────────────────────────
 * Every custom-built tenant has ONE canonical public URL:
 *   demo.salmansaas.com/{slug}/{defaultRedirect}
 *   e.g. demo.salmansaas.com/olivello/home
 *        demo.salmansaas.com/smar/home
 *
 * /demo/{slug} ALWAYS redirects to /{slug}/{defaultRedirect} for these tenants.
 * Only auto-onboarded tenants (not in this registry) use /demo/{slug} directly.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * To add a new tenant:
 *   1. Create src/pages/[slug]/ with canvas/, sections/, ui/, store/
 *   2. Create src/router/tenants/[slug].routes.jsx
 *   3. Add an entry below — canonical URL is auto: demo.salmansaas.com/{slug}/{defaultRedirect}
 */

import { lazy } from 'react';

export const tenantRegistry = {
  smar: {
    routes:          lazy(() => import('./smar.routes')),
    defaultRedirect: 'home',     // canonical: demo.salmansaas.com/smar/home
    theme:           'gold-dark',
  },

  caracas: {
    routes:          lazy(() => import('./caracas.routes')),
    defaultRedirect: 'menu',     // canonical: demo.salmansaas.com/caracas/menu
    theme:           'red-dark',
  },

  footlab: {
    routes:          lazy(() => import('./footlab.routes')),
    defaultRedirect: 'store',    // canonical: demo.salmansaas.com/footlab/store
    theme:           'purple-dark',
  },

  'sneakers-lb': {
    routes:          lazy(() => import('./sneakers-lb.routes')),
    defaultRedirect: 'store',    // canonical: demo.salmansaas.com/sneakers-lb/store
    theme:           'silver-dark',
  },

  'sneakers-beirut': {
    routes:          lazy(() => import('./sneakers-beirut.routes')),
    defaultRedirect: 'store',    // canonical: demo.salmansaas.com/sneakers-beirut/store
    theme:           'blue-dark',
  },

  olivello: {
    routes:          lazy(() => import('./olivello.routes')),
    defaultRedirect: 'home',     // canonical: demo.salmansaas.com/olivello/home
    theme:           'olive-dark',
  },

  moments: {
    routes:          lazy(() => import('./moments.routes')),
    defaultRedirect: 'create',   // canonical: demo.salmansaas.com/moments/create
    theme:           'gold-dark',
  },
};
