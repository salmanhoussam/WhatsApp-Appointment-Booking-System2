/**
 * Discovery — Tenant OS Editing Engine.
 *
 * Walks real EditableRegion registrations into the Page -> Region -> Field -> Operations
 * tree any Interface (Dashboard, AI, Mobile) can read. Sprint 1 scope: a flat in-memory
 * registry is enough — only one real registration (content.hero.title) exists. A real
 * Page/Region grouping layer is intentionally not built ahead of a second real Capability
 * proving the shape is needed (Abstraction Rule; TENANT_OS_IMPLEMENTATION_REVIEW.md Q5/Q7).
 *
 * See TENANT_OS_PLAN.md §14.
 */

const registry = new Map()

function registryKey(capability, key) {
  return `${capability}:${key}`
}

export function registerRegion({ capability, key, schema }) {
  registry.set(registryKey(capability, key), { capability, key, schema })
}

export function unregisterRegion({ capability, key }) {
  registry.delete(registryKey(capability, key))
}

/** Every currently-mounted EditableRegion — the real "what can I edit here" tree. */
export function discoverRegions() {
  return Array.from(registry.values())
}
