import apiClient from './client';
import type {
  Order,
  CreateOrderData,
  OrderListResponse,
  OrderStatus,
  OrderItem,
  MenuItem,
} from '../types/order.types';

function buildMinimalMenuItem(
  order: { restaurant_id: number },
  item: { menu_item_id?: number; menu_item?: MenuItem; name?: string; price?: number; unit_price?: number }
): MenuItem {
  const id = item.menu_item?.id ?? item.menu_item_id ?? 0;
  const price = Number(item.price ?? item.unit_price ?? item.menu_item?.price ?? 0);
  return {
    id,
    restaurant_id: order.restaurant_id,
    name: item.menu_item?.name ?? item.name ?? 'Item',
    description: item.menu_item?.description ?? '',
    price,
    image_url: item.menu_item?.image_url,
    is_available: item.menu_item?.is_available ?? true,
    created_at: item.menu_item?.created_at ?? '',
    updated_at: item.menu_item?.updated_at ?? '',
  };
}

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
    const rawItems = Array.isArray(o.items) ? o.items : Array.isArray(o.order_items) ? o.order_items : [];
    const restaurantId = Number(o.restaurant_id ?? o.restaurant?.id ?? 0);
    const orderContext = { restaurant_id: restaurantId };
    const items: OrderItem[] = rawItems.map((i: any) => {
      const menuItem = i.menu_item ?? i.menuItem ?? buildMinimalMenuItem(orderContext, i);
      const menuItemId = menuItem.id ?? i.menu_item_id;
      if (menuItemId != null) (menuItem as any).id = menuItemId;
      const price = Number(i.unit_price ?? i.price ?? menuItem.price ?? 0);
      const qty = Number(i.quantity ?? 0);
      return {
        id: i.id,
        order_id: i.order_id ?? o.id,
        menu_item_id: menuItemId ?? 0,
        quantity: qty,
        price,
        menu_item: menuItem,
      } as OrderItem;
    });
    const user = o.user ?? o.customer;
    const status = (o.status ?? '').toString().toLowerCase();
    return {
      ...o,
      status: status as OrderStatus,
      items,
      user,
      total: !isNaN(total) && total >= 0 ? total : 0,
      payment_status,
    } as Order;
  });
}

export const ordersApi = {
  getAll: async (params?: {
    status?: OrderStatus;
    page?: number;
  }): Promise<OrderListResponse> => {
    const response = await apiClient.get<OrderListResponse>('/orders', { params });
    const body = response.data as OrderListResponse | Order[];
    const list = Array.isArray(body) ? body : (body as OrderListResponse).data ?? [];
    const data = normalizeOrderList(list);
    const meta = Array.isArray(body) ? undefined : (body as OrderListResponse).meta;
    return { data, meta };
  },

  getById: async (id: number): Promise<Order> => {
    const res = await apiClient.get<{ data: Order; total?: number }>(`/orders/${id}`);
    const data = res.data as any;
    const order = data?.data ?? data;
    if (!order || typeof order !== 'object') throw new Error('Order not found');
    const rawTotal = order.total ?? order.total_amount ?? data.total;
    let total = typeof rawTotal === 'string' ? parseFloat(rawTotal) : Number(rawTotal);
    const rawItems = Array.isArray(order.items) ? order.items : Array.isArray(order.order_items) ? order.order_items : [];
    const items = rawItems.map((i: any) => {
      const price = Number(i.unit_price ?? i.price ?? 0);
      const qty = Number(i.quantity ?? 0);
      const subtotal = Number(i.subtotal ?? price * qty);
      return { ...i, price, quantity: qty, subtotal, menu_item: i.menu_item ?? i.menuItem };
    });
    if (!total || isNaN(total)) {
      total = items.reduce((sum, i) => sum + ((i as any).subtotal ?? Number(i.price) * (Number(i.quantity) || 0)), 0);
    }
    const ps = (order.payment_status ?? '').toString().toLowerCase();
    const payment_status = ['unpaid', 'pending', 'paid', 'failed'].includes(ps)
      ? (ps as Order['payment_status'])
      : order.status === 'pending'
        ? 'unpaid'
        : 'paid';
    const user = order.user ?? order.customer;
    return { ...order, items, user, total: !isNaN(total) && total >= 0 ? total : 0, payment_status } as Order;
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

  // Rider endpoints — orders that are paid and not yet assigned to a rider
  getAvailableOrders: async (): Promise<Order[]> => {
    let normalized: Order[] = [];
    try {
      const response = await apiClient.get<{ data: Order[]; orders?: Order[] } | Order[]>('/orders/available');
      const data = response.data as Record<string, unknown> | Order[] | undefined;
      const list = Array.isArray(data)
        ? data
        : (Array.isArray((data as any)?.data) ? (data as any).data : (data as any)?.orders) ?? [];
      normalized = normalizeOrderList(list);
      if (normalized.length > 0) return normalized;
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err.response?.status !== 404) throw e;
    }
    // Fallback: fetch all orders and filter for paid, unassigned, not delivered/cancelled
    try {
      const { data: allOrders } = await ordersApi.getAll();
      return allOrders.filter(
        (o) =>
          (o.payment_status === 'paid' || o.status === 'pending' || o.status === 'preparing') &&
          (o.rider_id == null || o.rider_id === 0) &&
          o.status !== 'delivered' &&
          o.status !== 'cancelled'
      );
    } catch {
      return [];
    }
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
