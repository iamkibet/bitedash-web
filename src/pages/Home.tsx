import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { restaurantsApi } from '../api/restaurants';
import { menuItemsApi } from '../api/menuItems';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Spinner } from '../components/common/Spinner';
import { Input } from '../components/common/Input';
import { MenuItemImage } from '../components/common/MenuItemImage';
import { MealWheel } from '../components/common/MealWheel';
import { UtensilsCrossed, ShoppingBag, Bike, Shield, Plus, Minus, Search, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { toast } from 'sonner';
import type { Restaurant } from '../types/restaurant.types';
import type { MenuItem } from '../types/order.types';

interface MenuItemWithRestaurant extends MenuItem {
  restaurant?: Restaurant;
}

export const Home = () => {
  const { isAuthenticated, role } = useAuthStore();
  const { addItem, restaurantId: cartRestaurantId } = useCartStore();
  const [allMenuItems, setAllMenuItems] = useState<MenuItemWithRestaurant[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchAllDishes();
  }, []);

  const fetchAllDishes = async () => {
    try {
      setIsLoading(true);
      // Fetch all restaurants
      const restaurantsResponse = await restaurantsApi.getAll({ is_open: true });
      const allRestaurants = restaurantsResponse.data || [];
      setRestaurants(allRestaurants);

      // Fetch menu items for each restaurant
      const menuItemsPromises = allRestaurants.map(async (restaurant) => {
        try {
          const items = await menuItemsApi.getByRestaurant(restaurant.id, { is_available: true });
          return items.map((item) => ({ ...item, restaurant }));
        } catch (error) {
          console.error(`Failed to fetch menu for restaurant ${restaurant.id}:`, error);
          return [];
        }
      });

      const allItemsArrays = await Promise.all(menuItemsPromises);
      const flattenedItems = allItemsArrays.flat();
      setAllMenuItems(flattenedItems);

      // Initialize quantities
      const initialQuantities: Record<number, number> = {};
      flattenedItems.forEach((item) => {
        initialQuantities[item.id] = 1;
      });
      setQuantities(initialQuantities);
    } catch (error) {
      console.error('Failed to fetch dishes:', error);
      toast.error('Failed to load dishes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityChange = (itemId: number, delta: number) => {
    setQuantities((prev) => {
      const current = prev[itemId] || 1;
      const newQuantity = Math.max(1, Math.min(50, current + delta));
      return { ...prev, [itemId]: newQuantity };
    });
  };

  const handleAddToCart = (item: MenuItemWithRestaurant) => {
    if (cartRestaurantId && cartRestaurantId !== item.restaurant_id) {
      if (window.confirm('Your cart contains items from another restaurant. Clear cart and add this item?')) {
        addItem(item, quantities[item.id] || 1);
        toast.success(`${item.name} added to cart`);
      }
    } else {
      addItem(item, quantities[item.id] || 1);
      toast.success(`${item.name} added to cart`);
    }
  };

  const getRoleDashboard = () => {
    switch (role) {
      case 'customer':
        return '/stores';
      case 'restaurant':
        return '/store/dashboard';
      case 'rider':
        return '/rider/orders';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/stores';
    }
  };

  // Filter menu items based on search query
  const filteredMenuItems = allMenuItems.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.restaurant?.name.toLowerCase().includes(query)
    );
  });

  return (
    <div>
      {/* Hero Section with Meal Wheel */}
      <div className="text-center py-8 mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-2">BiteDash</h1>
        <p className="text-xl text-gray-600 mb-8">
          Order food from your favorite restaurants in Kenya
        </p>
        
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[500px]">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="mb-8">
            <MealWheel
              restaurants={restaurants}
              menuItems={allMenuItems}
            />
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search dishes, restaurants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* All Dishes Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900">
            {searchQuery ? `Search Results (${filteredMenuItems.length})` : 'All Dishes'}
          </h2>
          {isAuthenticated && (
            <Link to="/cart">
              <Button variant="outline">
                <ShoppingCart className="h-4 w-4 mr-2" />
                View Cart
              </Button>
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Spinner size="lg" />
          </div>
        ) : filteredMenuItems.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <UtensilsCrossed className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-600 mb-2">
                {searchQuery ? 'No dishes found' : 'No dishes available at the moment'}
              </p>
              <p className="text-gray-500">
                {searchQuery ? 'Try a different search term' : 'Check back later for new dishes'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMenuItems.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <div className="mb-4">
                  <MenuItemImage src={item.image_url} alt={item.name} />
                </div>
                <div className="mb-2">
                  <Link
                    to={`/stores/${item.restaurant_id}/menu`}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {item.restaurant?.name || 'Restaurant'}
                  </Link>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.name}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-primary-600">
                    {formatCurrency(item.price)}
                  </span>
                  {!item.is_available && <Badge variant="error">Out of Stock</Badge>}
                </div>

                {item.is_available && (
                  <div className="space-y-3">
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
                    <Button
                      onClick={() => handleAddToCart(item)}
                      className="w-full"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Features Section - Only show when not authenticated or when no search */}
      {!isAuthenticated && !searchQuery && (
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Why Choose BiteDash?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <UtensilsCrossed className="h-12 w-12 text-primary-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Restaurants</h3>
              <p className="text-gray-600">
                Browse and order from a variety of restaurants
              </p>
            </Card>
            <Card>
              <ShoppingBag className="h-12 w-12 text-primary-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Easy Ordering</h3>
              <p className="text-gray-600">
                Simple and fast ordering process
              </p>
            </Card>
            <Card>
              <Bike className="h-12 w-12 text-primary-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Fast Delivery</h3>
              <p className="text-gray-600">
                Quick and reliable delivery service
              </p>
            </Card>
            <Card>
              <Shield className="h-12 w-12 text-primary-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Payment</h3>
              <p className="text-gray-600">
                Safe M-Pesa payment integration
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
