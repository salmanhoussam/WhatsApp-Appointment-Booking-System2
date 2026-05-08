/**
 * service-catalog.js
 *
 * Static mapping: client_services.serviceKey → frontend nav item + route.
 *
 * Usage:
 *   import { getNavItems } from '@/config/service-catalog';
 *   const nav = getNavItems(activeServices, slug);
 *   // → [{ key, route, labelAr, labelEn, icon }]
 *
 * Rules:
 *   - One entry per serviceKey that has a visible page.
 *   - Backend-only keys (whatsapp_ordering) have no nav entry.
 *   - Granular dot-notation keys (restaurant.table_booking) override the
 *     module-level key entry when present.
 */

export const SERVICE_CATALOG = {
  // ── Booking module (smar) ───────────────────────────────────────────────
  booking: {
    labelAr:  'الوحدات',
    labelEn:  'Units',
    icon:     'home',
    route:    (slug) => `/${slug}/listings`,
    priority: 10,
  },
  gallery: {
    labelAr:  'المعرض',
    labelEn:  'Gallery',
    icon:     'image',
    route:    (slug) => `/${slug}/gallery`,
    priority: 20,
  },
  whatsapp_ordering: null,  // backend-only — no nav entry

  // ── Restaurant module (caracas) ─────────────────────────────────────────
  restaurant: {
    labelAr:  'القائمة',
    labelEn:  'Menu',
    icon:     'utensils',
    route:    (slug) => `/${slug}/menu`,
    priority: 10,
  },
  'restaurant.menu': {
    labelAr:  'القائمة',
    labelEn:  'Menu',
    icon:     'utensils',
    route:    (slug) => `/${slug}/menu`,
    priority: 10,
  },
  'restaurant.table_booking': {
    labelAr:  'حجز طاولة',
    labelEn:  'Book a Table',
    icon:     'calendar',
    route:    (slug) => `/${slug}/table-booking`,
    priority: 20,
  },
  'restaurant.delivery': {
    labelAr:  'توصيل',
    labelEn:  'Delivery',
    icon:     'truck',
    route:    (slug) => `/${slug}/delivery`,
    priority: 30,
  },

  // ── Store module (footlab) ──────────────────────────────────────────────
  store: {
    labelAr:  'المتجر',
    labelEn:  'Shop',
    icon:     'shopping-bag',
    route:    (slug) => `/${slug}/store`,
    priority: 10,
  },
  'store.products': {
    labelAr:  'المنتجات',
    labelEn:  'Products',
    icon:     'shopping-bag',
    route:    (slug) => `/${slug}/store`,
    priority: 10,
  },
  'store.wishlist': {
    labelAr:  'المفضلة',
    labelEn:  'Wishlist',
    icon:     'heart',
    route:    (slug) => `/${slug}/wishlist`,
    priority: 30,
  },
  'store.loyalty': {
    labelAr:  'نقاط الولاء',
    labelEn:  'Rewards',
    icon:     'star',
    route:    (slug) => `/${slug}/rewards`,
    priority: 40,
  },

  // ── Catalog module (generic — services, salons, mechanics…) ────────────
  catalog: {
    labelAr:  'الخدمات',
    labelEn:  'Services',
    icon:     'grid',
    route:    (slug) => `/${slug}/catalog`,
    priority: 10,
  },
};

/**
 * getNavItems(activeServices, slug)
 *
 * Returns sorted nav items for the given active service keys.
 * Granular keys (restaurant.menu) suppress their parent module key (restaurant)
 * so we don't show duplicate nav entries.
 *
 * @param {string[]} activeServices - from GET /{slug}/config → active_services
 * @param {string}   slug           - tenant slug (for route building)
 * @returns {{ key, route, labelAr, labelEn, icon }[]}
 */
export function getNavItems(activeServices = [], slug = '') {
  if (!activeServices.length) return [];

  // If granular keys exist (e.g. restaurant.menu), suppress the parent module key
  const hasGranular = (moduleKey) =>
    activeServices.some((k) => k.startsWith(`${moduleKey}.`));

  const items = [];
  const seen = new Set();

  for (const key of activeServices) {
    const def = SERVICE_CATALOG[key];
    if (!def) continue;                         // backend-only (null) or unknown key

    const moduleKey = key.split('.')[0];
    if (!key.includes('.') && hasGranular(moduleKey)) continue;  // skip parent when granular present

    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      key,
      route:    def.route(slug),
      labelAr:  def.labelAr,
      labelEn:  def.labelEn,
      icon:     def.icon,
      priority: def.priority,
    });
  }

  return items.sort((a, b) => a.priority - b.priority);
}

/**
 * getServiceRoute(serviceKey, slug)
 * Quick lookup — returns the route string for a single key.
 */
export function getServiceRoute(serviceKey, slug) {
  const def = SERVICE_CATALOG[serviceKey];
  return def ? def.route(slug) : null;
}

/**
 * MODULE_KEYS — used by require_service() — the coarse-grained gate.
 * Granular keys are sub-features within a module.
 */
export const MODULE_KEYS = ['booking', 'restaurant', 'store'];
