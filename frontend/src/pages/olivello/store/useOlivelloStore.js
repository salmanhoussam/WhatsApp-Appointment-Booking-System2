import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const SESSION_KEY = 'olivello_cart_session';

function getOrCreateSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const useOlivelloStore = create(
  persist(
    (set, get) => ({
      sessionId: getOrCreateSessionId(),

      // Cart — catalog_item_id matches CatalogItem.id from /public/store/products
      cartItems: [],
      setCartItems: (items) => set({ cartItems: items }),

      addItem: (product, quantity = 1) => {
        const items = get().cartItems;
        const existing = items.find((i) => i.catalog_item_id === product.id);
        if (existing) {
          set({
            cartItems: items.map((i) =>
              i.catalog_item_id === product.id ? { ...i, quantity: i.quantity + quantity } : i
            ),
          });
        } else {
          set({ cartItems: [...items, { catalog_item_id: product.id, quantity, product }] });
        }
      },

      removeItem: (catalogItemId) =>
        set((state) => ({
          cartItems: state.cartItems.filter((i) => i.catalog_item_id !== catalogItemId),
        })),

      updateQuantity: (catalogItemId, quantity) =>
        set((state) => ({
          cartItems: quantity <= 0
            ? state.cartItems.filter((i) => i.catalog_item_id !== catalogItemId)
            : state.cartItems.map((i) =>
                i.catalog_item_id === catalogItemId ? { ...i, quantity } : i
              ),
        })),

      clearCart: () => set({ cartItems: [] }),

      // Cart UI
      isCartOpen: false,
      openCart:   () => set({ isCartOpen: true }),
      closeCart:  () => set({ isCartOpen: false }),

      activeCategoryId: null,
      setActiveCategoryId: (id) => set({ activeCategoryId: id }),

      // Showcase scroll state — tracks which of the 7 رحلة زيتونة sections is active
      activeSection: 'tree',   // 'tree' | 'harvest' | 'mill' | 'donkey' | 'paste' | 'press' | 'drop'
      setActiveSection: (section) => set({ activeSection: section }),

      scrollProgress: 0,
      setScrollProgress: (v) => set({ scrollProgress: v }),

      // Computed
      totalItems: () => get().cartItems.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () =>
        get().cartItems.reduce((sum, i) => sum + (Number(i.product?.price) || 0) * i.quantity, 0),
    }),
    {
      name: 'olivello-store',
      partialize: (state) => ({ cartItems: state.cartItems, sessionId: state.sessionId }),
    }
  )
);

export default useOlivelloStore;
