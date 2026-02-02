import apiClient from './client';
import { restaurantsApi } from './restaurants';
import { ordersApi } from './orders';
import type { User } from '../types/auth.types';
import type { Restaurant } from '../types/restaurant.types';
import type { Order, OrderListResponse } from '../types/order.types';

export interface AdminStats {
  total_users: number;
  total_stores: number;
  total_orders: number;
  total_revenue: number;
  orders_today?: number;
  new_users_today?: number;
}

export interface AdminUsersResponse {
  data: User[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface AdminStoresResponse {
  data: Restaurant[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export const adminApi = {
  /** GET /admin/stats — platform overview. Falls back to aggregation if endpoint missing. */
  getStats: async (): Promise<AdminStats> => {
    try {
      const response = await apiClient.get<{ data: AdminStats }>('/admin/stats');
      const data = response.data as { data?: AdminStats };
      if (data?.data && typeof data.data === 'object') {
        return data.data;
      }
      return (response.data as unknown as AdminStats) ?? defaultStats();
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err.response?.status === 404 || err.response?.status === 403) {
        return await aggregateStats();
      }
      throw e;
    }
  },

  /** GET /admin/users — list users. Falls back to GET /users when admin endpoint is missing. */
  getUsers: async (params?: {
    role?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<AdminUsersResponse> => {
    const normalize = (raw: unknown): AdminUsersResponse => {
      if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: User[] }).data)) {
        return raw as AdminUsersResponse;
      }
      if (Array.isArray(raw)) {
        return { data: raw as User[] };
      }
      return { data: [] };
    };

    try {
      const response = await apiClient.get<AdminUsersResponse>('/admin/users', { params });
      return normalize(response.data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err.response?.status === 404 || err.response?.status === 403) {
        try {
          const fallback = await apiClient.get<AdminUsersResponse | User[]>('/users', { params });
          return normalize(fallback.data);
        } catch {
          return { data: [] };
        }
      }
      throw e;
    }
  },

  /** GET /admin/stores — list all stores. Falls back to public stores list. */
  getStores: async (params?: {
    is_open?: boolean;
    search?: string;
    page?: number;
  }): Promise<AdminStoresResponse> => {
    try {
      const response = await apiClient.get<AdminStoresResponse>('/admin/stores', { params });
      const data = response.data;
      if (Array.isArray((data as { data?: Restaurant[] })?.data)) {
        return data as AdminStoresResponse;
      }
      if (Array.isArray((data as unknown) as Restaurant[])) {
        return { data: (data as unknown) as Restaurant[] };
      }
      return { data: [] };
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err.response?.status === 404 || err.response?.status === 403) {
        const fallback = await restaurantsApi.getAll({ ...params, page: params?.page ?? 1 });
        return { data: fallback.data ?? [], meta: fallback.meta };
      }
      throw e;
    }
  },

  /** GET /admin/orders — list all orders. Falls back to ordersApi.getAll. */
  getOrders: async (params?: {
    status?: string;
    payment_status?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<OrderListResponse> => {
    try {
      const response = await apiClient.get<OrderListResponse>('/admin/orders', { params });
      const data = response.data;
      if (Array.isArray((data as { data?: Order[] })?.data)) {
        return data as OrderListResponse;
      }
      if (Array.isArray((data as unknown) as Order[])) {
        return { data: (data as unknown) as Order[] };
      }
      return { data: [] };
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err.response?.status === 404 || err.response?.status === 403) {
        return ordersApi.getAll({
          page: params?.page,
          status: params?.status as Order['status'] | undefined,
        });
      }
      throw e;
    }
  },

  /** PATCH /admin/users/:id — update user (e.g. role, suspend). */
  updateUser: async (id: number, data: { role?: User['role']; name?: string; phone?: string }): Promise<User> => {
    const response = await apiClient.put<{ data: User }>(`/admin/users/${id}`, data);
    return response.data.data;
  },

  /** PATCH /admin/stores/:id — update store (e.g. is_open). */
  updateStore: async (id: number, data: { is_open?: boolean }): Promise<Restaurant> => {
    const response = await apiClient.put<{ data: Restaurant }>(`/admin/stores/${id}`, data);
    return response.data.data;
  },
};

function defaultStats(): AdminStats {
  return {
    total_users: 0,
    total_stores: 0,
    total_orders: 0,
    total_revenue: 0,
  };
}

async function aggregateStats(): Promise<AdminStats> {
  let total_orders = 0;
  let total_revenue = 0;
  let total_stores = 0;
  try {
    const [ordersRes, storesRes] = await Promise.all([
      ordersApi.getAll({ page: 1 }).catch(() => ({ data: [], meta: undefined })),
      restaurantsApi.getAll({ page: 1 }).catch(() => ({ data: [], meta: undefined })),
    ]);
    const orders = ordersRes.data ?? [];
    total_orders = ordersRes.meta?.total ?? orders.length;
    total_revenue = orders
      .filter((o) => (o.payment_status ?? '') === 'paid')
      .reduce((sum, o) => sum + Number(o.total ?? 0), 0);
    total_stores = storesRes.meta?.total ?? (storesRes.data?.length ?? 0);
  } catch {
    // ignore
  }
  return {
    total_users: 0,
    total_stores,
    total_orders,
    total_revenue,
  };
}
