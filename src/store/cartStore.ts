import { create } from 'zustand';
import type { CartItem, MenuItem } from '../types/order.types';
import { MAX_CART_ITEM_QUANTITY } from '../utils/constants';

const CART_STORAGE_KEY = 'bitedash_cart';

function loadCartFromStorage(): { items: CartItem[]; restaurantId: number | null } {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { items: [], restaurantId: null };
    const data = JSON.parse(raw) as { items?: CartItem[]; restaurantId?: number | null };
    if (!data || !Array.isArray(data.items)) return { items: [], restaurantId: null };
    return {
      items: data.items,
      restaurantId: data.restaurantId ?? null,
    };
  } catch {
    return { items: [], restaurantId: null };
  }
}

function saveCartToStorage(items: CartItem[], restaurantId: number | null): void {
  try {
    if (items.length === 0) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return;
    }
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items, restaurantId }));
  } catch (e) {
    console.warn('Failed to persist cart', e);
  }
}

const initialState = loadCartFromStorage();

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
  items: initialState.items,
  restaurantId: initialState.restaurantId,

  addItem: (menuItem: MenuItem, quantity: number) => {
    const { items, restaurantId } = get();

    if (restaurantId && restaurantId !== menuItem.restaurant_id) {
      const next = {
        items: [{ menu_item: menuItem, quantity }],
        restaurantId: menuItem.restaurant_id,
      };
      set(next);
      saveCartToStorage(next.items, next.restaurantId);
      return;
    }

    const existingItemIndex = items.findIndex(
      (item) => item.menu_item.id === menuItem.id
    );

    if (existingItemIndex >= 0) {
      const newItems = [...items];
      const newQuantity = Math.min(
        newItems[existingItemIndex].quantity + quantity,
        MAX_CART_ITEM_QUANTITY
      );
      newItems[existingItemIndex].quantity = newQuantity;
      set({ items: newItems });
      saveCartToStorage(newItems, get().restaurantId);
    } else {
      const newItems = [...items, { menu_item: menuItem, quantity }];
      set({ items: newItems, restaurantId: menuItem.restaurant_id });
      saveCartToStorage(newItems, menuItem.restaurant_id);
    }
  },

  removeItem: (menuItemId: number) => {
    const items = get().items.filter((item) => item.menu_item.id !== menuItemId);
    const restaurantId = items.length === 0 ? null : get().restaurantId;
    set({ items, restaurantId });
    saveCartToStorage(items, restaurantId);
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
    saveCartToStorage(items, get().restaurantId);
  },

  clearCart: () => {
    set({ items: [], restaurantId: null });
    localStorage.removeItem(CART_STORAGE_KEY);
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
    saveCartToStorage(get().items, restaurantId);
  },
}));
