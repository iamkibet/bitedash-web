export type OrderStatus = 'pending' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled';

export interface MenuItem {
  id: number;
  restaurant_id: number;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  quantity: number;
  price: number;
  menu_item: MenuItem;
}

export interface Order {
  id: number;
  restaurant_id: number;
  user_id: number;
  rider_id?: number;
  status: OrderStatus;
  total: number;
  delivery_address: string;
  notes?: string;
  /** unpaid = pre-payment; pending = payment initiated; paid = success; failed = payment failed */
  payment_status?: 'unpaid' | 'pending' | 'paid' | 'failed';
  restaurant?: {
    id: number;
    name: string;
    location: string;
  };
  rider?: {
    id: number;
    name: string;
    phone: string;
  };
  user?: {
    id: number;
    name: string;
    phone: string;
  };
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateOrderData {
  restaurant_id: number;
  items: Array<{
    menu_item_id: number;
    quantity: number;
  }>;
  delivery_address: string;
  notes?: string;
}

export interface OrderListResponse {
  data: Order[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface CartItem {
  menu_item: MenuItem;
  quantity: number;
}

export interface Rating {
  id: number;
  user_id: number;
  menu_item_id: number;
  rating: number; // 1-5
  comment?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
  };
}

export interface Favorite {
  id: number;
  user_id: number;
  menu_item_id: number;
  menu_item: MenuItem;
  created_at: string;
  updated_at: string;
}
