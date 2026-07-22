/**
 * Discovery — Tenant OS Editing Engine.
 *
 * Walks real EditableRegion registrations into the Page -> Region -> Field -> Operations
 * tree any Interface (Dashboard, AI, Mobile) can read. A flat in-memory registry is enough for
 * now — a real Page/Region grouping layer is intentionally not built ahead of a real need for
 * it (Abstraction Rule; TENANT_OS_IMPLEMENTATION_REVIEW.md Q5/Q7).
 *
 * Real status, per CONTENT_CAPABILITY_ARCHITECTURE_REVIEW.md: registerRegion/unregisterRegion
 * genuinely run on every EditableRegion mount/unmount, but discoverRegions() has no callers yet
 * anywhere in the app — the real click-to-edit flow works via DynamicPage.jsx reading DOM
 * data-* attributes directly, not by querying this registry. This is real, working
 * infrastructure waiting for an Interface that actually needs to ask "what can I edit here"
 * up front (e.g. a real Dashboard overview, or AI planning) rather than reacting to a click —
 * intentionally not wired to anything until that real need exists.
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
