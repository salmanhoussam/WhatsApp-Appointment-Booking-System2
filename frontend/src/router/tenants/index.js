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
    // 'menu', not 'home' (Salman, 2026-10-03). This key is the ONE thing that decides where
    // `/demo/caracas` lands: DynamicTenantResolver.jsx:76 reads it, and the dashboard's live
    // preview iframe (GenericAdminDashboard.jsx:958) is `src={`/demo/${slug}`}`. So switching
    // the Catalog Layout and pressing preview opened the HOME page — a page with no catalog on
    // it — and the layout control looked broken while it was working perfectly.
    //
    // Fixed here rather than in the dashboard on purpose: hardcoding `/caracas/menu` into the
    // preview would fix one tenant and break the rule for every other one. The registry IS the
    // canonical mechanism, and `.claude/rules/frontend/routing.md:17` already declared
    // «caracas → …/caracas/menu» — the registry was the half that disagreed.
    defaultRedirect: 'menu',     // canonical: demo.salmansaas.com/caracas/menu
    theme:           'dark-ember',
  },

  arizona: {
    routes:          lazy(() => import('./arizona.routes')),
    defaultRedirect: 'home',     // canonical: demo.salmansaas.com/arizona/home
    theme:           'yellow-teal',
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


  'beit-al-fakhar': {
    routes:          lazy(() => import('./beit-al-fakhar.routes')),
    defaultRedirect: 'home',     // canonical: demo.salmansaas.com/beit-al-fakhar/home
    theme:           'terracotta-cream',
  },

  'store-pilot-20260731': {
    routes:          lazy(() => import('./store-pilot-20260731.routes')),
    defaultRedirect: 'store',    // canonical: demo.salmansaas.com/store-pilot-20260731/store
    theme:           'silver-dark',
  },
};
