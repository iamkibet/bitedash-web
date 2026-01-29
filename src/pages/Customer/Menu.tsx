import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { restaurantsApi } from '../../api/restaurants';
import { menuItemsApi } from '../../api/menuItems';
import { ratingsApi } from '../../api/ratings';
import type { Restaurant } from '../../types/restaurant.types';
import type { MenuItem } from '../../types/order.types';
import { useCartStore } from '../../store/cartStore';
import { useFavoritesStore } from '../../store/favoritesStore';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/common/Card';
import { Spinner } from '../../components/common/Spinner';
import { DishCard } from '../../components/common/DishCard';
import {
  ArrowLeft,
  MapPin,
  Clock,
  ShoppingCart,
  Store,
  UtensilsCrossed,
} from 'lucide-react';
import { toast } from 'sonner';
import { resolveImageUrl } from '../../utils/formatters';
import { cn } from '../../utils/cn';

interface MenuItemWithRestaurant extends MenuItem {
  restaurant?: Restaurant;
}

export const Menu = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [ratings, setRatings] = useState<
    Record<number, { average: number; count: number }>
  >({});
  const [userRatings, setUserRatings] = useState<
    Record<number, { rating: number; id: number }>
  >({});

  const { addItem, restaurantId: cartRestaurantId, getItemCount } = useCartStore();
  const {
    isFavorite,
    fetchFavorites,
    addFavorite,
    removeFavorite,
  } = useFavoritesStore();
  const { isAuthenticated, role } = useAuthStore();

  const fetchRestaurant = useCallback(async () => {
    if (!id) return;
    try {
      const data = await restaurantsApi.getById(Number(id));
      setRestaurant(data);
    } catch {
      toast.error('Failed to load store');
      navigate('/stores');
    }
  }, [id, navigate]);

  const fetchMenuItems = useCallback(async () => {
    if (!id) return;
    try {
      const items = await menuItemsApi.getByRestaurant(Number(id));
      setMenuItems(items);
      const initialQuantities: Record<number, number> = {};
      items.forEach((item) => {
        initialQuantities[item.id] = 1;
      });
      setQuantities(initialQuantities);
    } catch {
      toast.error('Failed to load menu');
    }
  }, [id]);

  const fetchRatings = useCallback(async () => {
    if (menuItems.length === 0) return;
    const ratingsMap: Record<number, { average: number; count: number }> = {};
    const userRatingsMap: Record<number, { rating: number; id: number }> = {};
    const { user } = useAuthStore.getState();

    await Promise.all(
      menuItems.map(async (item) => {
        try {
          const response = await ratingsApi.getByMenuItem(item.id);
          const list = response.data || [];
          const count = list.length;
          const average =
            count > 0
              ? list.reduce((sum, r) => sum + r.rating, 0) / count
              : 0;
          ratingsMap[item.id] = { average, count };
          if (isAuthenticated && user?.id) {
            const ur = list.find((r) => r.user_id === user.id);
            if (ur) userRatingsMap[item.id] = { rating: ur.rating, id: ur.id };
          }
        } catch {
          ratingsMap[item.id] = { average: 0, count: 0 };
        }
      })
    );
    setRatings(ratingsMap);
    setUserRatings(userRatingsMap);
  }, [menuItems, isAuthenticated]);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      navigate('/stores');
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      await fetchRestaurant();
      await fetchMenuItems();
      if (!cancelled) setIsLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [id, navigate, fetchRestaurant, fetchMenuItems]);

  useEffect(() => {
    if (menuItems.length === 0) return;
    fetchRatings();
  }, [menuItems.length, fetchRatings]);

  useEffect(() => {
    if (isAuthenticated && role === 'customer') {
      fetchFavorites();
    }
  }, [isAuthenticated, role, fetchFavorites]);

  const handleQuantityChange = (itemId: number, delta: number) => {
    setQuantities((prev) => {
      const current = prev[itemId] ?? 1;
      const next = Math.max(1, Math.min(50, current + delta));
      return { ...prev, [itemId]: next };
    });
  };

  const handleAddToCart = (item: MenuItem) => {
    const qty = quantities[item.id] ?? 1;
    if (cartRestaurantId && cartRestaurantId !== item.restaurant_id) {
      if (
        window.confirm(
          'Your cart has items from another store. Replace and add this item?'
        )
      ) {
        addItem(item, qty);
        toast.success('Added to cart');
      }
    } else {
      addItem(item, qty);
      toast.success('Added to cart');
    }
  };

  const handleToggleFavorite = async (menuItemId: number) => {
    if (!isAuthenticated || role !== 'customer') {
      toast.error('Login to add favorites');
      return;
    }
    try {
      if (isFavorite(menuItemId)) {
        await removeFavorite(menuItemId);
      } else {
        await addFavorite(menuItemId);
      }
    } catch {
      // Toast handled in store
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!restaurant) {
    return null;
  }

  const itemsWithRestaurant: MenuItemWithRestaurant[] = menuItems.map(
    (item) => ({ ...item, restaurant })
  );

  return (
    <div className="space-y-6">
      {/* Store header */}
      <Card padding="none" className="overflow-hidden border border-gray-100">
        <div className="flex flex-col md:flex-row">
          {/* Store image or placeholder */}
          <div className="relative w-full md:w-56 lg:w-64 aspect-[2/1] md:aspect-auto md:min-h-[180px] bg-gray-100 shrink-0">
            {restaurant.image_url ? (
              <img
                src={resolveImageUrl(restaurant.image_url) ?? restaurant.image_url}
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <Store className="h-14 w-14 text-gray-400" />
              </div>
            )}
            <div
              className={cn(
                'absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm inline-flex items-center gap-1.5',
                restaurant.is_open
                  ? 'bg-green-500/95 text-white'
                  : 'bg-gray-700/90 text-white'
              )}
            >
              {restaurant.is_open ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  Open
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" />
                  Closed
                </>
              )}
            </div>
          </div>

          <div className="p-4 md:p-6 flex-1 flex flex-col justify-center min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <button
                  type="button"
                  onClick={() => navigate('/stores')}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary-600 mb-2 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to stores
                </button>
                <h1 className="text-xl font-semibold text-gray-900">
                  {restaurant.name}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => navigate('/cart')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shrink-0"
              >
                <ShoppingCart className="h-5 w-5" />
                <span>Cart</span>
                {getItemCount() > 0 && (
                  <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-white/20 text-xs font-semibold flex items-center justify-center">
                    {getItemCount()}
                  </span>
                )}
              </button>
            </div>
            {restaurant.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {restaurant.description}
              </p>
            )}
            {restaurant.location && (
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="truncate">{restaurant.location}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Menu section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <UtensilsCrossed className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
        </div>

        {menuItems.length === 0 ? (
          <Card className="text-center py-16">
            <UtensilsCrossed className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No menu items available</p>
            <p className="text-sm text-gray-500 mt-1">
              Check back later or try another store.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {itemsWithRestaurant.map((item) => (
              <DishCard
                key={item.id}
                item={item}
                quantity={quantities[item.id] ?? 1}
                isFavorite={isAuthenticated && role === 'customer' ? isFavorite(item.id) : false}
                rating={ratings[item.id]}
                userRating={userRatings[item.id]}
                onQuantityChange={handleQuantityChange}
                onAddToCart={handleAddToCart}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
