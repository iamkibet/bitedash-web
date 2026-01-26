import apiClient from './client';
import type { MenuItem } from '../types/order.types';

export interface CreateMenuItemData {
  restaurant_id: number;
  name: string;
  description: string;
  price: number;
  is_available?: boolean;
}

export interface UpdateMenuItemData extends Partial<CreateMenuItemData> {}

function buildMenuItemFormData(
  data: { name: string; description: string; price: number; is_available: boolean },
  meta: { restaurant_id?: number }
): FormData {
  const fd = new FormData();
  fd.append('name', data.name);
  fd.append('description', data.description);
  fd.append('price', String(data.price));
  fd.append('is_available', data.is_available ? '1' : '0');
  if (meta.restaurant_id != null) fd.append('restaurant_id', String(meta.restaurant_id));
  return fd;
}

export const menuItemsApi = {
  /** GET /stores/{store}/menu-items */
  getByRestaurant: async (
    restaurantId: number,
    params?: { is_available?: boolean }
  ): Promise<MenuItem[]> => {
    const response = await apiClient.get<{ data: MenuItem[] }>(
      `/stores/${restaurantId}/menu-items`,
      { params }
    );
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : [];
  },

  /** GET /menu-items/{menuItem} */
  getById: async (id: number): Promise<MenuItem> => {
    const response = await apiClient.get<{ data: MenuItem }>(`/menu-items/${id}`);
    return response.data?.data ?? response.data;
  },

  /** POST /menu-items. Use FormData when image is provided. */
  create: async (data: CreateMenuItemData, image?: File): Promise<MenuItem> => {
    if (image) {
      const fd = buildMenuItemFormData(
        {
          name: data.name,
          description: data.description,
          price: data.price,
          is_available: data.is_available ?? true,
        },
        { restaurant_id: data.restaurant_id }
      );
      fd.append('image', image);
      const response = await apiClient.post<{ data: MenuItem }>('/menu-items', fd);
      return response.data?.data ?? response.data;
    }
    const response = await apiClient.post<{ data: MenuItem }>('/menu-items', data);
    return response.data?.data ?? response.data;
  },

  /** PUT /menu-items/{menuItem}. Use FormData when image is provided. */
  update: async (
    id: number,
    data: UpdateMenuItemData,
    image?: File
  ): Promise<MenuItem> => {
    if (image) {
      const fd = buildMenuItemFormData(
        {
          name: data.name!,
          description: data.description!,
          price: data.price!,
          is_available: data.is_available ?? true,
        },
        {}
      );
      fd.append('image', image);
      const response = await apiClient.put<{ data: MenuItem }>(`/menu-items/${id}`, fd);
      return response.data?.data ?? response.data;
    }
    const response = await apiClient.put<{ data: MenuItem }>(`/menu-items/${id}`, data);
    return response.data?.data ?? response.data;
  },

  /** DELETE /menu-items/{menuItem} */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/menu-items/${id}`);
  },

  /** POST /menu-items/{menuItem}/toggle-availability */
  toggleAvailability: async (id: number): Promise<MenuItem> => {
    const response = await apiClient.post<{ data: MenuItem }>(
      `/menu-items/${id}/toggle-availability`
    );
    return response.data?.data ?? response.data;
  },
};
