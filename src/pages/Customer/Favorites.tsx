import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { favoritesApi, type Favorite } from '../../api/favorites';
import { ratingsApi } from '../../api/ratings';
import { Card } from '../../components/common/Card';
import { Spinner } from '../../components/common/Spinner';
import { DishCard } from '../../components/common/DishCard';
import { toast } from 'sonner';
import { Heart } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';

export const Favorites = () => {
  const { isAuthenticated } = useAuthStore();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addItem, restaurantId: cartRestaurantId } = useCartStore();
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [ratings, setRatings] = useState<
    Record<number, { average: number; count: number }>
  >({});

  const fetchRatings = useCallback(async () => {
    if (favorites.length === 0) return;
    
    try {
      const ratingsMap: Record<number, { average: number; count: number }> = {};
      const uniqueItemIds = [...new Set(favorites.map((f) => f.menu_item.id))];

      await Promise.all(
        uniqueItemIds.map(async (itemId) => {
          try {
            const response = await ratingsApi.getByMenuItem(itemId);
            if (response.stats) {
              ratingsMap[itemId] = {
                average: response.stats.average_rating,
                count: response.stats.total_ratings,
              };
            }
          } catch {
            // Ignore errors for individual items
          }
        }),
      );

      setRatings(ratingsMap);
    } catch (error) {
      console.error('Failed to fetch ratings:', error);
    }
  }, [favorites]);

  useEffect(() => {
    fetchFavorites();
  }, []);

  useEffect(() => {
    if (favorites.length > 0) {
      fetchRatings();
    }
  }, [favorites, fetchRatings]);

  const fetchFavorites = async () => {
    try {
      setIsLoading(true);
      const data = await favoritesApi.getAll();
      setFavorites(data);
      
      // Initialize quantities
      const initialQuantities: Record<number, number> = {};
      data.forEach((fav) => {
        initialQuantities[fav.menu_item.id] = 1;
      });
      setQuantities(initialQuantities);
    } catch (error: unknown) {
      console.error('Failed to fetch favorites:', error);
      toast.error('Failed to load favorites. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async (menuItemId: number) => {
    try {
      await favoritesApi.remove(menuItemId);
      setFavorites((prev) => prev.filter((fav) => fav.menu_item_id !== menuItemId));
      toast.success('Removed from favorites');
    } catch (error: unknown) {
      console.error('Failed to remove favorite:', error);
      toast.error('Failed to remove favorite. Please try again.');
    }
  };

  const handleQuantityChange = (menuItemId: number, delta: number) => {
    setQuantities((prev) => {
      const current = prev[menuItemId] || 1;
      const newQuantity = Math.max(1, Math.min(50, current + delta));
      return { ...prev, [menuItemId]: newQuantity };
    });
  };

  const handleAddToCart = (item: { id: number; name: string; price: number; image_url?: string; restaurant_id: number }) => {
    try {
      const quantity = quantities[item.id] || 1;

      // Check if cart has items from a different restaurant
      if (cartRestaurantId && cartRestaurantId !== item.restaurant_id) {
        toast.error('Your cart contains items from another restaurant. Please clear your cart first.');
        return;
      }

      addItem({
        id: item.id,
        name: item.name,
        price: item.price,
        image_url: item.image_url,
        restaurant_id: item.restaurant_id,
        quantity,
      });

      toast.success(`Added ${quantity} ${item.name} to cart`);
    } catch (error: unknown) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add item to cart. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Favorites</h1>
        <p className="text-gray-600">Your favorite meals and dishes</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner />
        </div>
      ) : favorites.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-600 mb-2">No favorites yet</p>
            <p className="text-gray-500 mb-4">
              Start adding your favorite meals to see them here
            </p>
            <Link
              to="/stores"
              className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Browse Restaurants
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favorites.map((favorite) => {
            const item = favorite.menu_item;
            return (
              <div key={favorite.id}>
                <DishCard
                  item={item}
                  quantity={quantities[item.id] || 1}
                  isFavorite={true}
                  rating={ratings[item.id]}
                  onQuantityChange={handleQuantityChange}
                  onAddToCart={handleAddToCart}
                  onToggleFavorite={handleToggleFavorite}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
