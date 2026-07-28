// src/utils/capabilities.js
//
// The Capability Resolution Layer (TOS-004, CAPABILITY_RESOLUTION_PLAN.md Phase 1).
//
// Nothing in this codebase should ask "what is this tenant's type/moduleKey" anymore --
// that question has no correct single answer once a tenant can have more than one
// simultaneously-active catalog-bearing capability (Catalog, Store, Restaurant, Booking).
// Every real decision is one of:
//   - "is capability X active for this tenant at all?"      -> hasCapability()
//   - "which capability does THIS specific record belong to?" -> read the record's own
//     `module_key` field directly (CatalogCategory.module_key, Reservation.module_key) --
//     never inferred from the tenant.
//
// Phase 1 only: this file is additive. No existing consumer is wired to it yet -- see
// CAPABILITY_RESOLUTION_PLAN.md's phased migration for when each consumer switches over.

/**
 * Does this tenant have `key` active right now?
 * @param {string[]} activeServices - the tenant's real active_services array (GET /{slug}/config)
 * @param {string} key - a service key, e.g. 'store', 'catalog', 'restaurant', 'booking', 'reservations'
 * @returns {boolean}
 */
export function hasCapability(activeServices, key) {
  return Array.isArray(activeServices) && activeServices.includes(key);
}

/**
 * Does this tenant have any order-bearing capability active (Store or Restaurant)?
 * The one grouped check several real consumers need (Cart visibility, Orders stat cards) --
 * named explicitly so each consumer doesn't re-derive the same "store or restaurant" pair.
 */
export function hasOrderCapability(activeServices) {
  return hasCapability(activeServices, 'store') || hasCapability(activeServices, 'restaurant');
}
