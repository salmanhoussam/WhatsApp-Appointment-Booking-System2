import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { hasCapability } from '../../../utils/capabilities'

// Module key priority — first matching active service wins
function deriveModuleKey(services = []) {
  if (services.includes('restaurant')) return 'restaurant'
  if (services.includes('store'))      return 'store'
  if (services.includes('catalog'))    return 'catalog'
  return null
}

// Per-slug session ID stored in localStorage — prevents cross-tenant cart leakage
function getSessionId(slug) {
  const key = `${slug}_cart_session`
  let id = localStorage.getItem(key)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id) }
  return id
}

// The persisted cart itself was NOT scoped by tenant (real bug, found 2026-07-24/25:
// a bookmarked/shared link to one tenant's /cart showed another tenant's real items)
// -- `getSessionId` above already had the right per-slug convention, it just was never
// applied to `cartItems`, the thing actually rendered on the cart page. Every generic
// tenant page was reading/writing the exact same global `localStorage['generic-cart']`
// key regardless of which tenant's URL you were on.
function currentSlug() {
  return window.location.pathname.split('/').filter(Boolean)[0] || 'unknown'
}

const scopedCartStorage = createJSONStorage(() => ({
  getItem:    (name) => localStorage.getItem(`${currentSlug()}_${name}`),
  setItem:    (name, value) => localStorage.setItem(`${currentSlug()}_${name}`, value),
  removeItem: (name) => localStorage.removeItem(`${currentSlug()}_${name}`),
}))

const useGenericStore = create(
  persist(
    (set, get) => ({
      // ── Config ────────────────────────────────────────────────────────────
      config:         null,
      moduleKey:      null,
      activeServices: [],
      sessionId:      null,   // used by store module for server-side cart
      activeCategory: null,

      // ── Cart ──────────────────────────────────────────────────────────────
      // Shape: [{ catalogItemId, name_ar, name_en, price, image_url, quantity }]
      // catalogItemId = CatalogItem.id — follows catalog-contract (restaurant convention)
      cartItems: [],

      // ── Actions ───────────────────────────────────────────────────────────

      setConfig: (config, activeServices = []) => {
        const moduleKey = deriveModuleKey(activeServices)
        const prevSlug  = get().config?.slug
        const nextSlug  = config?.slug
        // A client-side route change between two tenants (React Router swap, no full
        // page reload) keeps this module-scoped Zustand singleton alive -- storage-key
        // scoping alone only protects a fresh page load. Detect the actual tenant
        // switch here and clear in-memory cart state too.
        // useTenantConfig() returns a DEFAULT_CONFIG placeholder (slug: 'unknown')
        // while the real fetch is in flight, so the very first setConfig call on any
        // page load looks like a "previous tenant" -- real bug found while verifying
        // this fix: it made every fresh load's placeholder->real transition look like
        // a tenant switch and wiped a legitimately-persisted cart. 'unknown' is never
        // a real slug, so it can never count as one side of an actual tenant change.
        const tenantChanged =
          prevSlug && nextSlug &&
          prevSlug !== 'unknown' && nextSlug !== 'unknown' &&
          prevSlug !== nextSlug

        const updates = { config, activeServices, moduleKey }
        if (tenantChanged) {
          updates.cartItems      = []
          updates.sessionId      = null
          updates.activeCategory = null
        }
        // Store module: lazily create a server-cart session ID (or a fresh one if the
        // tenant just changed, since `updates.sessionId` was just nulled above).
        // Plural check (TOS-004) -- this must fire whenever Store is active, regardless of
        // whether it also won the tenant-wide `moduleKey` priority contest. Found via the
        // Search Verification gate ahead of Phase 5: for a tenant with Store active but NOT
        // winning that priority (unlike `hr`, where `store` currently wins by chance), this
        // session ID would never have been created and Store's real Cart/Checkout flow would
        // have silently never initialized.
        if (hasCapability(activeServices, 'store') && nextSlug && (tenantChanged || !get().sessionId)) {
          updates.sessionId = getSessionId(nextSlug)
        }
        set(updates)
      },

      setActiveCategory: (categoryId) => set({ activeCategory: categoryId }),

      // item = raw API response: { id, name_ar, name_en, price, image_url, ... }
      addItem: (item, quantity = 1) => {
        const items    = get().cartItems
        const existing = items.find((i) => i.catalogItemId === item.id)
        if (existing) {
          set({
            cartItems: items.map((i) =>
              i.catalogItemId === item.id
                ? { ...i, quantity: i.quantity + quantity }
                : i
            ),
          })
        } else {
          set({
            cartItems: [
              ...items,
              {
                catalogItemId: item.id,
                name_ar:       item.name_ar   ?? null,
                name_en:       item.name_en   ?? null,
                price:         Number(item.price) || 0,
                image_url:     item.image_url ?? null,
                quantity,
              },
            ],
          })
        }
      },

      removeItem: (catalogItemId) =>
        set((s) => ({
          cartItems: s.cartItems.filter((i) => i.catalogItemId !== catalogItemId),
        })),

      updateQuantity: (catalogItemId, qty) =>
        set((s) => ({
          cartItems: qty <= 0
            ? s.cartItems.filter((i) => i.catalogItemId !== catalogItemId)
            : s.cartItems.map((i) =>
                i.catalogItemId === catalogItemId ? { ...i, quantity: qty } : i
              ),
        })),

      clearCart: () => set({ cartItems: [] }),

      // ── Computed ──────────────────────────────────────────────────────────
      totalItems: () => get().cartItems.reduce((s, i) => s + i.quantity, 0),
      totalPrice: () => get().cartItems.reduce((s, i) => s + i.price * i.quantity, 0),
    }),
    {
      name:       'generic-cart',
      storage:    scopedCartStorage,
      partialize: (s) => ({ cartItems: s.cartItems, sessionId: s.sessionId }),
    }
  )
)

export default useGenericStore
