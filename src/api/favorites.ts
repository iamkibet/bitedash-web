import apiClient from './client';
import type { MenuItem } from '../types/order.types';

export interface Favorite {
  id: number;
  user_id: number;
  menu_item_id: number;
  menu_item: MenuItem;
  created_at: string;
  updated_at: string;
}

export const favoritesApi = {
  /** GET /api/v1/favourites - Get user's favourites */
  getAll: async (): Promise<Favorite[]> => {
    const response = await apiClient.get<{ data: Favorite[] }>('/favourites');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : [];
  },

  /** POST /api/v1/favourites - Add menu item to favourites */
  add: async (menuItemId: number): Promise<Favorite> => {
    // Try both field name formats for API compatibility
    const response = await apiClient.post<{ data: Favorite }>('/favourites', {
      menu_item_id: menuItemId,
      menuItemId: menuItemId,
    });
    return response.data?.data ?? response.data;
  },

  /** DELETE /api/v1/favourites/{menuItem} - Remove from favourites */
  remove: async (menuItemId: number): Promise<void> => {
    await apiClient.delete(`/favourites/${menuItemId}`);
  },
};
