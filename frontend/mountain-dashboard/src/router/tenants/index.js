/**
 * tenants/index.js  —  Tenant Registry
 *
 * Single source of truth for all tenants.
 * To add a new tenant:
 *   1. Create src/pages/[slug]/ with canvas/, sections/, ui/, store/
 *   2. Create src/router/tenants/[slug].routes.jsx
 *   3. Add an entry below
 */

import { lazy } from 'react';

export const tenantRegistry = {
  smar: {
    routes:          lazy(() => import('./smar.routes')),
    defaultRedirect: 'home',
    theme:           'gold-dark',
  },

  // ── Add future tenants here ──────────────────────────────────────────────
  // vila: {
  //   routes:          lazy(() => import('./vila.routes')),
  //   defaultRedirect: 'home',
  //   theme:           'green-nature',
  // },
};
