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

  update: async (id: number, data: UpdateRestaurantData, image?: File): Promise<Restaurant> => {
    if (image) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'boolean') {
            formData.append(key, value ? '1' : '0');
          } else if (typeof value === 'number') {
            formData.append(key, String(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });
      formData.append('image', image);
      const response = await apiClient.put<{ data: Restaurant }>(`/stores/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data;
    }
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
      
      // Log for debugging
      console.log('getMyStoreWithStats response:', { store, statistics, rawData: data });
      
      return {
        store: store && typeof store === 'object' && store.id ? store : null,
        statistics: statistics && typeof statistics === 'object' ? statistics : undefined,
      };
    } catch (error: any) {
      const err = error as { response?: { status?: number; data?: any } };
      console.error('getMyStoreWithStats error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: error?.message,
      });
      
      if (err.response?.status === 404) {
        return { store: null, statistics: undefined };
      }
      throw error;
    }
  },
};
