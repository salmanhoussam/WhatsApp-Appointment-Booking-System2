import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
        const updates   = { config, activeServices, moduleKey }
        // Store module: lazily create a server-cart session ID
        if (moduleKey === 'store' && config?.slug && !get().sessionId) {
          updates.sessionId = getSessionId(config.slug)
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
      partialize: (s) => ({ cartItems: s.cartItems, sessionId: s.sessionId }),
    }
  )
)

export default useGenericStore
