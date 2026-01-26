import { create } from 'zustand';
import type { Order, CreateOrderData, OrderStatus } from '../types/order.types';
import { ordersApi } from '../api/orders';
import { toast } from 'sonner';

function formatValidationErrors(err: { validationErrors?: Record<string, string[]> }): string | null {
  const v = err.validationErrors;
  if (!v || typeof v !== 'object') return null;
  const parts = Object.values(v).flat().filter(Boolean) as string[];
  return parts.length ? parts.join(' ') : null;
}

interface OrderState {
  orders: Order[];
  riderDeliveries: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  fetchOrders: (params?: { status?: OrderStatus }) => Promise<void>;
  fetchOrder: (id: number) => Promise<void>;
  createOrder: (data: CreateOrderData) => Promise<Order>;
  updateOrderStatus: (orderId: number, status: OrderStatus) => Promise<void>;
  assignRider: (orderId: number, riderId: number) => Promise<void>;
  cancelOrder: (orderId: number) => Promise<void>;
  getAvailableOrders: () => Promise<void>;
  getRiderDeliveries: () => Promise<void>;
  acceptOrder: (orderId: number) => Promise<void>;
  getMyRestaurantOrders: () => Promise<void>;
  getRestaurantPendingOrders: (restaurantId: number) => Promise<void>;
  getRestaurantOrders: (restaurantId: number, params?: { status?: OrderStatus }) => Promise<void>;
  getRestaurantOrdersAll: (storeId: number) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  riderDeliveries: [],
  currentOrder: null,
  isLoading: false,

  fetchOrders: async (params?: { status?: OrderStatus }) => {
    try {
      set({ isLoading: true });
      const response = await ordersApi.getAll(params);
      set({ orders: response.data, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      toast.error(error.message || 'Failed to fetch orders.');
      throw error;
    }
  },

  fetchOrder: async (id: number) => {
    try {
      set({ isLoading: true });
      const order = await ordersApi.getById(id);
      set({ currentOrder: order, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      toast.error(error.message || 'Failed to fetch order.');
      throw error;
    }
  },

  createOrder: async (data: CreateOrderData) => {
    try {
      set({ isLoading: true });
      const order = await ordersApi.create(data);
      set((state) => ({
        orders: [order, ...state.orders],
        currentOrder: order,
        isLoading: false,
      }));
      toast.success('Order placed successfully!');
      return order;
    } catch (error: any) {
      set({ isLoading: false });
      let msg = error?.message || 'Failed to place order.';
      const ve = error?.validationErrors as Record<string, string[]> | undefined;
      if (ve && typeof ve === 'object') {
        const parts = Object.entries(ve).flatMap(([k, v]) =>
          (Array.isArray(v) ? v : [String(v)]).map((s) => (k === 'base' || k === 'error' ? s : `${k}: ${s}`))
        );
        if (parts.length) msg = parts.join('. ');
      }
      toast.error(msg);
      throw error;
    }
  },

  updateOrderStatus: async (orderId: number, status: OrderStatus) => {
    try {
      set({ isLoading: true });
      const updatedOrder = await ordersApi.update(orderId, { status });
      set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
        riderDeliveries: state.riderDeliveries.map((o) => (o.id === orderId ? updatedOrder : o)),
        currentOrder:
          state.currentOrder?.id === orderId ? updatedOrder : state.currentOrder,
        isLoading: false,
      }));
      toast.success('Order status updated!');
    } catch (error: any) {
      set({ isLoading: false });
      toast.error(error.message || 'Failed to update order status.');
      throw error;
    }
  },

  assignRider: async (orderId: number, riderId: number) => {
    try {
      set({ isLoading: true });
      const updatedOrder = await ordersApi.assignRider(orderId, riderId);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
        riderDeliveries: state.riderDeliveries.some((o) => o.id === orderId)
          ? state.riderDeliveries.map((o) => (o.id === orderId ? updatedOrder : o))
          : state.riderDeliveries,
        currentOrder:
          state.currentOrder?.id === orderId ? updatedOrder : state.currentOrder,
        isLoading: false,
      }));
      toast.success('Rider assigned successfully!');
    } catch (err: unknown) {
      set({ isLoading: false });
      const e = err as { message?: string; validationErrors?: Record<string, string[]> };
      const detail = formatValidationErrors(e);
      toast.error(detail || e.message || 'Failed to assign rider.');
      throw err;
    }
  },

  cancelOrder: async (orderId: number) => {
    try {
      set({ isLoading: true });
      const cancelledOrder = await ordersApi.cancel(orderId);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? cancelledOrder : o)),
        currentOrder:
          state.currentOrder?.id === orderId ? cancelledOrder : state.currentOrder,
        isLoading: false,
      }));
      toast.success('Order cancelled successfully.');
    } catch (error: any) {
      set({ isLoading: false });
      toast.error(error.message || 'Failed to cancel order.');
      throw error;
    }
  },

  getAvailableOrders: async () => {
    try {
      set({ isLoading: true });
      const orders = await ordersApi.getAvailableOrders();
      set({ orders, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      toast.error(error.message || 'Failed to fetch available orders.');
      throw error;
    }
  },

  getRiderDeliveries: async () => {
    try {
      set({ isLoading: true });
      const riderDeliveries = await ordersApi.getRiderDeliveries();
      set({ riderDeliveries, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      toast.error(error.message || 'Failed to fetch your deliveries.');
      throw error;
    }
  },

  acceptOrder: async (orderId: number) => {
    try {
      set({ isLoading: true });
      const acceptedOrder = await ordersApi.acceptOrder(orderId);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? acceptedOrder : o)),
        isLoading: false,
      }));
      toast.success('Order accepted successfully!');
    } catch (error: any) {
      set({ isLoading: false });
      toast.error(error.message || 'Failed to accept order.');
      throw error;
    }
  },

  getMyRestaurantOrders: async () => {
    try {
      set({ isLoading: true });
      const orders = await ordersApi.getMyRestaurantOrders();
      set({ orders: Array.isArray(orders) ? orders : [], isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      console.error('Failed to fetch my restaurant orders:', error);
      toast.error(error.message || 'Failed to fetch orders.');
      throw error;
    }
  },

  getRestaurantPendingOrders: async (restaurantId: number) => {
    try {
      set({ isLoading: true });
      const orders = await ordersApi.getRestaurantPendingOrders(restaurantId);
      // Ensure we always set an array, even if API returns null/undefined
      const ordersArray = Array.isArray(orders) ? orders : [];
      console.log(`Fetched ${ordersArray.length} pending orders for restaurant ${restaurantId}`, ordersArray);
      
      // If no pending orders, try to get all orders and filter by restaurant_id
      // This helps if orders are in other statuses (preparing, on_the_way, etc.)
      if (ordersArray.length === 0) {
        try {
          console.log('No pending orders found, trying to fetch all orders...');
          const allOrdersResponse = await ordersApi.getAll();
          const allOrders = Array.isArray(allOrdersResponse.data) 
            ? allOrdersResponse.data 
            : [];
          // Filter orders by restaurant_id
          const restaurantOrders = allOrders.filter(
            (order) => order.restaurant_id === restaurantId && order.status !== 'delivered' && order.status !== 'cancelled'
          );
          console.log(`Found ${restaurantOrders.length} non-delivered orders for restaurant ${restaurantId}`, restaurantOrders);
          if (restaurantOrders.length > 0) {
            set({ orders: restaurantOrders, isLoading: false });
            return;
          }
        } catch (fallbackError) {
          console.warn('Fallback to getAll() failed:', fallbackError);
        }
      }
      
      set({ orders: ordersArray, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      console.error('Failed to fetch restaurant pending orders:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      toast.error(error.message || 'Failed to fetch pending orders.');
      // Don't clear existing orders on error - keep showing what we have
      throw error;
    }
  },

  getRestaurantOrders: async (restaurantId: number, params?: { status?: OrderStatus }) => {
    try {
      set({ isLoading: true });
      const orders = await ordersApi.getRestaurantOrders(restaurantId, params);
      set({ orders: Array.isArray(orders) ? orders : [], isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      console.error('Failed to fetch restaurant orders:', error);
      toast.error(error.message || 'Failed to fetch orders.');
      throw error;
    }
  },

  getRestaurantOrdersAll: async (storeId: number) => {
    try {
      set({ isLoading: true });
      const orders = await ordersApi.getRestaurantOrdersAll(storeId);
      set({ orders: Array.isArray(orders) ? orders : [], isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      console.error('Failed to fetch store orders:', error);
      toast.error(error.message || 'Failed to fetch orders.');
      throw error;
    }
  },
}));
