export interface Restaurant {
  id: number;
  name: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  is_open: boolean;
  image_url?: string;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface StoreStatistics {
  total_revenue?: number;
  total_orders?: number;
  paid_orders?: number;
  pending_orders?: number;
}

export interface CreateRestaurantData {
  name: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateRestaurantData extends Partial<CreateRestaurantData> {
  is_open?: boolean;
  image_url?: string;
}

export interface RestaurantListResponse {
  data: Restaurant[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
