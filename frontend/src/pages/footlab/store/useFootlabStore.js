import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const SESSION_KEY = 'footlab_cart_session';

function getOrCreateSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const useFootlabStore = create(
  persist(
    (set, get) => ({
      sessionId: getOrCreateSessionId(),

      // Cart items keyed by catalog_item_id — matches CatalogItem.id from /public/store/products
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
        set((state) => ({ cartItems: state.cartItems.filter((i) => i.catalog_item_id !== catalogItemId) })),

      updateQuantity: (catalogItemId, quantity) =>
        set((state) => ({
          cartItems: quantity <= 0
            ? state.cartItems.filter((i) => i.catalog_item_id !== catalogItemId)
            : state.cartItems.map((i) => (i.catalog_item_id === catalogItemId ? { ...i, quantity } : i)),
        })),

      clearCart: () => set({ cartItems: [] }),

      // UI state
      isCartOpen: false,
      openCart:   () => set({ isCartOpen: true }),
      closeCart:  () => set({ isCartOpen: false }),

      activeCategoryId: null,
      setActiveCategoryId: (id) => set({ activeCategoryId: id }),

      // Computed
      totalItems:  () => get().cartItems.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice:  () =>
        get().cartItems.reduce((sum, i) => sum + (i.product?.price ?? 0) * i.quantity, 0),
    }),
    {
      name: 'footlab-store',
      partialize: (state) => ({ cartItems: state.cartItems, sessionId: state.sessionId }),
    }
  )
);

export default useFootlabStore;
