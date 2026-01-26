import { create } from 'zustand';
import type { CartItem, MenuItem } from '../types/order.types';
import { MAX_CART_ITEM_QUANTITY } from '../utils/constants';

interface CartState {
  items: CartItem[];
  restaurantId: number | null;
  addItem: (menuItem: MenuItem, quantity: number) => void;
  removeItem: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  setRestaurant: (restaurantId: number) => void;
}

export const useCartStore = create<CartState>()((set, get) => ({
      items: [],
      restaurantId: null,

      addItem: (menuItem: MenuItem, quantity: number) => {
        const { items, restaurantId } = get();

        // If adding item from different restaurant, clear cart
        if (restaurantId && restaurantId !== menuItem.restaurant_id) {
          set({
            items: [{ menu_item: menuItem, quantity }],
            restaurantId: menuItem.restaurant_id,
          });
          return;
        }

        // Check if item already exists
        const existingItemIndex = items.findIndex(
          (item) => item.menu_item.id === menuItem.id
        );

        if (existingItemIndex >= 0) {
          // Update quantity
          const newItems = [...items];
          const newQuantity = Math.min(
            newItems[existingItemIndex].quantity + quantity,
            MAX_CART_ITEM_QUANTITY
          );
          newItems[existingItemIndex].quantity = newQuantity;
          set({ items: newItems });
        } else {
          // Add new item
          set({
            items: [...items, { menu_item: menuItem, quantity }],
            restaurantId: menuItem.restaurant_id,
          });
        }
      },

      removeItem: (menuItemId: number) => {
        const items = get().items.filter((item) => item.menu_item.id !== menuItemId);
        set({ items });
        if (items.length === 0) {
          set({ restaurantId: null });
        }
      },

      updateQuantity: (menuItemId: number, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId);
          return;
        }

        const items = get().items.map((item) =>
          item.menu_item.id === menuItemId
            ? { ...item, quantity: Math.min(quantity, MAX_CART_ITEM_QUANTITY) }
            : item
        );
        set({ items });
      },

      clearCart: () => {
        set({ items: [], restaurantId: null });
      },

      getTotal: () => {
        return get().items.reduce(
          (total, item) => total + item.menu_item.price * item.quantity,
          0
        );
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },

      setRestaurant: (restaurantId: number) => {
        set({ restaurantId });
      },
    })
);
