import apiClient from './client';
import type {
  Restaurant,
  CreateRestaurantData,
  UpdateRestaurantData,
  RestaurantListResponse,
  StoreStatistics,
} from '../types/restaurant.types';

export const restaurantsApi = {
  getAll: async (params?: {
    is_open?: boolean;
    search?: string;
    page?: number;
  }): Promise<RestaurantListResponse> => {
    const response = await apiClient.get<RestaurantListResponse>('/stores', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Restaurant> => {
    const response = await apiClient.get<{ data: Restaurant }>(`/stores/${id}`);
    return response.data.data;
  },

  create: async (data: CreateRestaurantData): Promise<Restaurant> => {
    try {
      const response = await apiClient.post<{ data: Restaurant }>('/stores', data);
      return response.data.data;
    } catch (error: any) {
      console.error('Create store API error:', {
        url: '/stores',
        method: 'POST',
        data,
        error: error.message,
        status: error.response?.status,
        response: error.response?.data,
      });
      throw error;
    }
  },

  update: async (id: number, data: UpdateRestaurantData): Promise<Restaurant> => {
    const response = await apiClient.put<{ data: Restaurant }>(`/stores/${id}`, data);
    return response.data.data;
  },

  toggleStatus: async (id: number): Promise<Restaurant> => {
    const response = await apiClient.post<{ data: Restaurant }>(`/stores/${id}/toggle-status`);
    return response.data.data;
  },

  // Get the authenticated user's store (may include statistics)
  getMyStore: async (): Promise<Restaurant | null> => {
    try {
      const response = await apiClient.get<{ data: Restaurant; statistics?: StoreStatistics }>('/stores/my-store');
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      // 404 means user doesn't have a store yet
      if (err.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Get my store with statistics (revenue, counts)
  getMyStoreWithStats: async (): Promise<{ store: Restaurant | null; statistics?: StoreStatistics }> => {
    try {
      const response = await apiClient.get<{ data: Restaurant & { statistics?: StoreStatistics }; statistics?: StoreStatistics }>('/stores/my-store');
      const data = response.data as any;
      const store = data?.data ?? data;
      const statistics = data?.statistics ?? data?.data?.statistics ?? store?.statistics ?? null;
      return {
        store: store && typeof store === 'object' ? store : null,
        statistics: statistics && typeof statistics === 'object' ? statistics : undefined,
      };
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 404) {
        return { store: null, statistics: undefined };
      }
      throw error;
    }
  },
};
