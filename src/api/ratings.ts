import apiClient from './client';

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

export interface RatingStats {
  average_rating: number;
  total_ratings: number;
  rating_distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface CreateRatingData {
  menu_item_id: number;
  menuItemId?: number; // Alternative field name for API compatibility
  rating: number; // 1-5
  comment?: string;
}

export interface UpdateRatingData {
  rating?: number;
  comment?: string;
}

export const ratingsApi = {
  /** GET /api/v1/menu-items/{menuItem}/ratings - View ratings (public) */
  getByMenuItem: async (menuItemId: number): Promise<{ data: Rating[]; stats?: RatingStats }> => {
    const response = await apiClient.get<{ data: Rating[]; stats?: RatingStats }>(
      `/menu-items/${menuItemId}/ratings`
    );
    return response.data;
  },

  /** POST /api/v1/ratings - Create rating (requires order & payment) */
  create: async (data: CreateRatingData): Promise<Rating> => {
    // Try both field name formats for API compatibility
    const payload = {
      menu_item_id: data.menu_item_id,
      menuItemId: data.menu_item_id,
      rating: data.rating,
      ...(data.comment && { comment: data.comment }),
    };
    const response = await apiClient.post<{ data: Rating }>('/ratings', payload);
    return response.data?.data ?? response.data;
  },

  /** PUT /api/v1/ratings/{rating} - Update rating (owner only) */
  update: async (ratingId: number, data: UpdateRatingData): Promise<Rating> => {
    const response = await apiClient.put<{ data: Rating }>(`/ratings/${ratingId}`, data);
    return response.data?.data ?? response.data;
  },

  /** DELETE /api/v1/ratings/{rating} - Delete rating (owner only) */
  delete: async (ratingId: number): Promise<void> => {
    await apiClient.delete(`/ratings/${ratingId}`);
  },
};
