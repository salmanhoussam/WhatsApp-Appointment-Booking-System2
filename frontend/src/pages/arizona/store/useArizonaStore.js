import { create } from 'zustand';

const useArizonaStore = create((set, get) => ({
  activeCategoryId: null,
  setActiveCategoryId: (id) => set({ activeCategoryId: id }),

  cartItems: [],
  addItem: (item) => set((state) => {
    const existing = state.cartItems.find((i) => i.catalogItemId === item.catalogItemId);
    if (existing) {
      return {
        cartItems: state.cartItems.map((i) =>
          i.catalogItemId === item.catalogItemId ? { ...i, quantity: i.quantity + 1 } : i
        ),
      };
    }
    return { cartItems: [...state.cartItems, { ...item, quantity: 1 }] };
  }),
  removeItem: (catalogItemId) =>
    set((state) => ({ cartItems: state.cartItems.filter((i) => i.catalogItemId !== catalogItemId) })),
  updateQuantity: (catalogItemId, quantity) =>
    set((state) => ({
      cartItems: quantity <= 0
        ? state.cartItems.filter((i) => i.catalogItemId !== catalogItemId)
        : state.cartItems.map((i) => (i.catalogItemId === catalogItemId ? { ...i, quantity } : i)),
    })),
  clearCart: () => set({ cartItems: [] }),

  isOrderOpen: false,
  openOrder:   () => set({ isOrderOpen: true }),
  closeOrder:  () => set({ isOrderOpen: false }),

  totalItems: () => get().cartItems.reduce((sum, i) => sum + i.quantity, 0),
  totalPrice: () => get().cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
}));

export default useArizonaStore;
