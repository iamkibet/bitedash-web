import apiClient from './client';
import type {
  Order,
  CreateOrderData,
  OrderListResponse,
  OrderStatus,
} from '../types/order.types';

function normalizeOrderList(list: any[]): Order[] {
  if (!Array.isArray(list)) return [];
  return list.map((o: any) => {
    const raw = o.total ?? o.total_amount;
    const total = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
    const ps = (o.payment_status ?? '').toString().toLowerCase();
    const payment_status = ['unpaid', 'pending', 'paid', 'failed'].includes(ps)
      ? (ps as Order['payment_status'])
      : o.status === 'pending'
        ? 'unpaid'
        : ('paid' as const);
    return { ...o, total: !isNaN(total) && total >= 0 ? total : 0, payment_status } as Order;
  });
}

export const ordersApi = {
  getAll: async (params?: {
    status?: OrderStatus;
    page?: number;
  }): Promise<OrderListResponse> => {
    const response = await apiClient.get<OrderListResponse>('/orders', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Order> => {
    const res = await apiClient.get<{ data: Order; total?: number }>(`/orders/${id}`);
    const data = res.data as any;
    const order = data?.data ?? data;
    if (!order || typeof order !== 'object') throw new Error('Order not found');
    const rawTotal = order.total ?? order.total_amount ?? data.total;
    let total = typeof rawTotal === 'string' ? parseFloat(rawTotal) : Number(rawTotal);
    if (!total || isNaN(total)) {
      const items = Array.isArray(order.items) ? order.items : [];
      total = items.reduce((sum: number, i: { price?: number; quantity?: number }) => sum + (Number(i?.price) || 0) * (Number(i?.quantity) || 0), 0);
    }
    const ps = (order.payment_status ?? '').toString().toLowerCase();
    const payment_status = ['unpaid', 'pending', 'paid', 'failed'].includes(ps)
      ? (ps as Order['payment_status'])
      : order.status === 'pending'
        ? 'unpaid'
        : 'paid';
    return { ...order, total, payment_status } as Order;
  },

  create: async (data: CreateOrderData): Promise<Order> => {
    const response = await apiClient.post<{ data: Order }>('/orders', data);
    return response.data.data;
  },

  update: async (id: number, data: { status?: OrderStatus; rider_id?: number | null }): Promise<Order> => {
    const response = await apiClient.put<{ data: Order }>(`/orders/${id}`, data);
    return response.data.data;
  },

  /** Assign a rider to an order (store manager action) */
  assignRider: async (orderId: number, riderId: number): Promise<Order> => {
    return ordersApi.update(orderId, { rider_id: Number(riderId) });
  },

  /** Unassign rider from an order */
  unassignRider: async (orderId: number): Promise<Order> => {
    return ordersApi.update(orderId, { rider_id: null });
  },

  cancel: async (id: number): Promise<Order> => {
    const response = await apiClient.post<{ data: Order }>(`/orders/${id}/cancel`);
    return response.data.data;
  },

  // Restaurant endpoints
  /** GET /orders/my-restaurant — all orders for authenticated restaurant. Use when backend supports it. */
  getMyRestaurantOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get<{ data: Order[] } | Order[]>(
      '/orders/my-restaurant'
    );
    const data = response.data;
    const list: Order[] = Array.isArray(data) ? data : (data as any)?.data ?? [];
    return normalizeOrderList(list);
  },

  getRestaurantPendingOrders: async (restaurantId: number): Promise<Order[]> => {
    const response = await apiClient.get<{ data: Order[] } | Order[]>(
      `/stores/${restaurantId}/orders/pending`
    );
    const data = response.data;
    if (Array.isArray(data)) return data;
    return data?.data ?? [];
  },

  /** Fetch ALL store orders by store ID. GET /stores/:id/orders. */
  getRestaurantOrdersAll: async (storeId: number): Promise<Order[]> => {
    const response = await apiClient.get<{ data: Order[] } | Order[]>(
      `/stores/${storeId}/orders`
    );
    const data = response.data;
    const list: Order[] = Array.isArray(data) ? data : (data as any)?.data ?? [];
    return normalizeOrderList(list);
  },

  getRestaurantOrders: async (restaurantId: number, params?: { status?: OrderStatus | 'all' }): Promise<Order[]> => {
    const status = params?.status;
    if (status && status !== 'all' && status !== 'pending') {
      const response = await apiClient.get<{ data: Order[] } | Order[]>(
        `/stores/${restaurantId}/orders`,
        { params: { status } }
      );
      const data = response.data;
      if (Array.isArray(data)) return data;
      return data?.data ?? [];
    }
    return ordersApi.getRestaurantOrdersAll(restaurantId);
  },

  // Rider endpoints
  getAvailableOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get<{ data: Order[] } | Order[]>('/orders/available');
    const data = response.data;
    const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
    return Array.isArray(list) ? list : [];
  },

  /** GET /orders/my-rider — orders assigned to current rider. For My Deliveries page. */
  getRiderDeliveries: async (): Promise<Order[]> => {
    try {
      const response = await apiClient.get<{ data: Order[] } | Order[]>(
        '/orders/my-rider'
      );
      const data = response.data;
      const list: Order[] = Array.isArray(data) ? data : (data as any)?.data ?? [];
      return normalizeOrderList(list);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err.response?.status === 404) return [];
      throw e;
    }
  },

  acceptOrder: async (id: number): Promise<Order> => {
    const response = await apiClient.post<{ data: Order }>(`/orders/${id}/accept`);
    return response.data.data;
  },
};
