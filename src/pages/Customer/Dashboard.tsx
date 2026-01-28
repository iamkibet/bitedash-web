import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { favoritesApi, type Favorite } from '../../api/favorites';
import { ratingsApi, type Rating } from '../../api/ratings';
import { useOrderStore } from '../../store/orderStore';
import { Card } from '../../components/common/Card';
import { Spinner } from '../../components/common/Spinner';
import { Badge } from '../../components/common/Badge';
import { MenuItemImage } from '../../components/common/MenuItemImage';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';
import { toast } from 'sonner';
import { Heart, ShoppingCart, Plus, Minus, Star, Package, Eye } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';

export const CustomerDashboard = () => {
  const { user } = useAuthStore();
  const { orders, fetchOrders, isLoading: ordersLoading } = useOrderStore();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addItem, restaurantId: cartRestaurantId } = useCartStore();
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      await fetchOrders();
      await Promise.all([
        fetchFavorites(),
        fetchRatings(),
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const data = await favoritesApi.getAll();
      setFavorites(data);
      
      // Initialize quantities
      const initialQuantities: Record<number, number> = {};
      data.forEach((fav) => {
        initialQuantities[fav.menu_item.id] = 1;
      });
      setQuantities(initialQuantities);
    } catch (error: any) {
      console.error('Failed to fetch favorites:', error);
      toast.error('Failed to load favorites. Please try again.');
    }
  };

  const fetchRatings = async () => {
    if (!user?.id || orders.length === 0) return;
    
    try {
      // Collect unique menu item IDs from all orders
      const menuItemIds = new Set<number>();
      orders.forEach((order) => {
        order.items?.forEach((item) => {
          const menuItemId = item.menu_item?.id || item.menu_item_id;
          if (menuItemId) menuItemIds.add(menuItemId);
        });
      });

      // Fetch ratings for each menu item and find user's ratings
      const ratingsPromises = Array.from(menuItemIds).map(async (menuItemId) => {
        try {
          const response = await ratingsApi.getByMenuItem(menuItemId);
          return response.data?.find((r) => r.user_id === user.id);
        } catch (error) {
          return null;
        }
      });

      const userRatings = (await Promise.all(ratingsPromises)).filter(
        (r): r is Rating => r !== null
      );
      
      setRatings(userRatings);
    } catch (error: any) {
      console.error('Failed to fetch ratings:', error);
    }
  };

  const handleRemoveFavorite = async (menuItemId: number) => {
    try {
      await favoritesApi.remove(menuItemId);
      setFavorites((prev) => prev.filter((fav) => fav.menu_item_id !== menuItemId));
      toast.success('Removed from favorites');
    } catch (error: any) {
      console.error('Failed to remove favorite:', error);
      toast.error(error?.response?.data?.message || 'Failed to remove favorite');
    }
  };

  const handleQuantityChange = (itemId: number, delta: number) => {
    setQuantities((prev) => {
      const current = prev[itemId] || 1;
      const newQuantity = Math.max(1, Math.min(50, current + delta));
      return { ...prev, [itemId]: newQuantity };
    });
  };

  const handleAddToCart = (menuItem: Favorite['menu_item']) => {
    if (cartRestaurantId && cartRestaurantId !== menuItem.restaurant_id) {
      if (window.confirm('Your cart contains items from another restaurant. Clear cart and add this item?')) {
        addItem(menuItem, quantities[menuItem.id] || 1);
        toast.success(`${menuItem.name} added to cart`);
      }
    } else {
      addItem(menuItem, quantities[menuItem.id] || 1);
      toast.success(`${menuItem.name} added to cart`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Get recent orders (last 5)
  const recentOrders = orders.slice(0, 5);
  
  // Create a map of menu item IDs to ratings for quick lookup
  const ratingMap = new Map<number, Rating>();
  ratings.forEach((rating) => {
    ratingMap.set(rating.menu_item_id, rating);
  });

  // Get menu items from orders that have been rated
  const ratedMenuItems = new Map<number, { menuItem: any; rating: Rating }>();
  orders.forEach((order) => {
    order.items?.forEach((item) => {
      const menuItemId = item.menu_item?.id || item.menu_item_id;
      const rating = menuItemId ? ratingMap.get(menuItemId) : undefined;
      if (rating && item.menu_item) {
        ratedMenuItems.set(menuItemId, { menuItem: item.menu_item, rating });
      }
    });
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
      </div>

      {/* Recent Orders Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Orders</h2>
          <Link
            to="/orders"
            className="text-primary-600 hover:text-primary-700 font-medium text-sm"
          >
            View All
          </Link>
        </div>

        {ordersLoading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Spinner />
          </div>
        ) : recentOrders.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">You haven't placed any orders yet.</p>
              <Link
                to="/stores"
                className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Browse Restaurants
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => {
              const statusConfig = ORDER_STATUSES[order.status];
              return (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.id}
                        </h3>
                        <Badge variant={statusConfig.color as 'success' | 'error' | 'warning' | 'info' | 'default'}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {order.restaurant?.name || 'Restaurant'}
                      </p>
                      <p className="text-sm text-gray-500 mb-2">
                        {formatDate(order.created_at)}
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        Total: {formatCurrency(order.total ?? 0)}
                      </p>
                    </div>
                    <Link to={`/orders/${order.id}`}>
                      <button className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Favorites Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">My Favorites</h2>
        </div>

        {favorites.length === 0 ? (
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
              <Card key={favorite.id} className="hover:shadow-lg transition-shadow flex flex-col h-full">
                <div className="mb-4 relative">
                  <MenuItemImage src={item.image_url} alt={item.name} />
                  <button
                    onClick={() => handleRemoveFavorite(item.id)}
                    className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
                    aria-label="Remove from favorites"
                  >
                    <Heart className="h-5 w-5 text-red-500 fill-current" />
                  </button>
                </div>

                <div className="mb-2">
                  <Link
                    to={`/stores/${item.restaurant_id}/menu`}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Restaurant
                  </Link>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.name}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2 flex-1">{item.description}</p>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-primary-600">
                    {formatCurrency(item.price)}
                  </span>
                  {!item.is_available && (
                    <span className="text-xs text-red-600 font-medium">Out of Stock</span>
                  )}
                </div>

                {item.is_available && (
                  <div className="space-y-3 mt-auto">
                    <div className="flex items-center gap-2 border rounded-lg">
                      <button
                        onClick={() => handleQuantityChange(item.id, -1)}
                        className="p-2 hover:bg-gray-100 transition-colors"
                        disabled={quantities[item.id] <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="px-3 py-1 min-w-[3rem] text-center font-medium">
                        {quantities[item.id] || 1}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.id, 1)}
                        className="p-2 hover:bg-gray-100 transition-colors"
                        disabled={quantities[item.id] >= 50}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add to Cart
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
        )}
      </div>

      {/* Rated Dishes Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Rated Dishes</h2>
        </div>

        {ratedMenuItems.size === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-600 mb-2">No rated dishes yet</p>
              <p className="text-gray-500 mb-4">
                Rate dishes from your delivered orders to see them here
              </p>
              <Link
                to="/orders"
                className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                View Orders
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from(ratedMenuItems.values()).map(({ menuItem, rating }) => (
              <Card key={rating.id} className="hover:shadow-lg transition-shadow flex flex-col h-full">
                <div className="mb-4 relative">
                  <MenuItemImage src={menuItem.image_url} alt={menuItem.name} />
                  <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Rated
                  </div>
                </div>

                <div className="mb-2">
                  <Link
                    to={`/stores/${menuItem.restaurant_id}/menu`}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Restaurant
                  </Link>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-2">{menuItem.name}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2 flex-1">{menuItem.description}</p>

                {/* Rating Display */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= rating.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {rating.rating}/5
                    </span>
                  </div>
                  {rating.comment && (
                    <p className="text-xs text-gray-600 italic line-clamp-2">
                      "{rating.comment}"
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-primary-600">
                    {formatCurrency(menuItem.price)}
                  </span>
                  {!menuItem.is_available && (
                    <span className="text-xs text-red-600 font-medium">Out of Stock</span>
                  )}
                </div>

                {menuItem.is_available && (
                  <div className="space-y-3 mt-auto">
                    <div className="flex items-center gap-2 border rounded-lg">
                      <button
                        onClick={() => handleQuantityChange(menuItem.id, -1)}
                        className="p-2 hover:bg-gray-100 transition-colors"
                        disabled={quantities[menuItem.id] <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="px-3 py-1 min-w-[3rem] text-center font-medium">
                        {quantities[menuItem.id] || 1}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(menuItem.id, 1)}
                        className="p-2 hover:bg-gray-100 transition-colors"
                        disabled={quantities[menuItem.id] >= 50}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleAddToCart(menuItem)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add to Cart
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
