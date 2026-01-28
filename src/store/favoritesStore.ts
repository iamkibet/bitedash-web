import { create } from 'zustand';
import { favoritesApi, type Favorite } from '../api/favorites';
import { toast } from 'sonner';

interface FavoritesState {
  favorites: Favorite[];
  favoriteIds: Set<number>;
  isLoading: boolean;
  fetchFavorites: () => Promise<void>;
  addFavorite: (menuItemId: number) => Promise<void>;
  removeFavorite: (menuItemId: number) => Promise<void>;
  isFavorite: (menuItemId: number) => boolean;
  getCount: () => number;
}

export const useFavoritesStore = create<FavoritesState>()((set, get) => ({
  favorites: [],
  favoriteIds: new Set(),
  isLoading: false,

  fetchFavorites: async () => {
    try {
      set({ isLoading: true });
      const favorites = await favoritesApi.getAll();
      const favoriteIds = new Set(favorites.map((f) => f.menu_item_id));
      set({ favorites, favoriteIds, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
      set({ isLoading: false });
    }
  },

  addFavorite: async (menuItemId: number) => {
    try {
      const favorite = await favoritesApi.add(menuItemId);
      set((state) => ({
        favorites: [...state.favorites, favorite],
        favoriteIds: new Set([...state.favoriteIds, menuItemId]),
      }));
      toast.success('Added to favorites');
    } catch (error: unknown) {
      console.error('Failed to add favorite:', error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || 'Failed to add favorite';
      toast.error(errorMessage);
      throw error;
    }
  },

  removeFavorite: async (menuItemId: number) => {
    try {
      await favoritesApi.remove(menuItemId);
      set((state) => ({
        favorites: state.favorites.filter((f) => f.menu_item_id !== menuItemId),
        favoriteIds: new Set(
          Array.from(state.favoriteIds).filter((id) => id !== menuItemId),
        ),
      }));
      toast.success('Removed from favorites');
    } catch (error: unknown) {
      console.error('Failed to remove favorite:', error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || 'Failed to remove favorite';
      toast.error(errorMessage);
      throw error;
    }
  },

  isFavorite: (menuItemId: number) => {
    return get().favoriteIds.has(menuItemId);
  },

  getCount: () => {
    return get().favorites.length;
  },
}));
