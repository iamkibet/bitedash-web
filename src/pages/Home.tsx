import { useEffect, useState, useRef } from 'react';
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
import { UtensilsCrossed, ShoppingBag, Bike, Shield, Plus, Minus, Search, ShoppingCart, MapPin, ChevronRight, ArrowRight, ChevronLeft } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { toast } from 'sonner';
import type { Restaurant } from '../types/restaurant.types';
import type { MenuItem } from '../types/order.types';

interface MenuItemWithRestaurant extends MenuItem {
  restaurant?: Restaurant;
}

export const Home = () => {
  const { isAuthenticated } = useAuthStore();
  const { addItem, restaurantId: cartRestaurantId } = useCartStore();
  const [allMenuItems, setAllMenuItems] = useState<MenuItemWithRestaurant[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const autoAdvanceIntervalRef = useRef<number | null>(null);

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


  // Filter menu items based on search query
  const filteredMenuItems = allMenuItems.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.restaurant?.name.toLowerCase().includes(query)
    );
  });

  const selectedRestaurant = restaurants.find((r) => r.id === selectedRestaurantId);
  const selectedRestaurantMenuItems = selectedRestaurantId
    ? allMenuItems.filter((item) => item.restaurant_id === selectedRestaurantId && item.is_available)
    : [];

  // Auto-advance to next restaurant every 8 seconds (pauses when hovering inner menu)
  const [isHoveringInnerMenu, setIsHoveringInnerMenu] = useState(false);
  
  useEffect(() => {
    if (restaurants.length === 0 || !selectedRestaurantId || isHoveringInnerMenu) {
      if (autoAdvanceIntervalRef.current) {
        clearInterval(autoAdvanceIntervalRef.current);
        autoAdvanceIntervalRef.current = null;
      }
      return;
    }

    // Clear any existing interval
    if (autoAdvanceIntervalRef.current) {
      clearInterval(autoAdvanceIntervalRef.current);
    }

    // Set up auto-advance interval
    autoAdvanceIntervalRef.current = window.setInterval(() => {
      const currentIndex = restaurants.findIndex(r => r.id === selectedRestaurantId);
      if (currentIndex !== -1) {
        const nextIndex = currentIndex < restaurants.length - 1 ? currentIndex + 1 : 0;
        const nextRestaurant = restaurants[nextIndex];
        if (nextRestaurant) {
          setSelectedRestaurantId(nextRestaurant.id);
        }
      }
    }, 8000); // 8 seconds

    return () => {
      if (autoAdvanceIntervalRef.current) {
        clearInterval(autoAdvanceIntervalRef.current);
        autoAdvanceIntervalRef.current = null;
      }
    };
  }, [restaurants, selectedRestaurantId, isHoveringInnerMenu]);

  return (
    <div>
      {/* Hero Section with Meal Wheel */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 lg:py-20 mb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[500px]">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
              {/* Left Side - Selected Restaurant Info (Desktop) */}
              <div className="order-2 lg:order-1">
                {selectedRestaurant ? (
                  <div className="p-10 lg:p-14 animate-fade-in">
                    {/* Restaurant Header */}
                    <div className="mb-10">
                      <div className="mb-6">
                        <h2 className="text-5xl lg:text-6xl xl:text-7xl font-extrabold text-gray-900 leading-tight tracking-tight">
                          {selectedRestaurant.name.split(' ').map((word, index) => {
                            if (index === 0) {
                              return (
                                <span key={index} className="relative inline-block">
                                  <span 
                                    className={`relative z-10 italic ${
                                      selectedRestaurant.is_open
                                        ? 'text-primary-600'
                                        : 'text-red-500'
                                    }`}
                                    style={{
                                      fontFamily: "'Dancing Script', 'Brush Script MT', 'Lucida Handwriting', cursive",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {word}
                                  </span>
                                  <span
                                    className={`absolute bottom-0 left-0 right-0 h-1 ${
                                      selectedRestaurant.is_open
                                        ? 'bg-primary-500'
                                        : 'bg-red-400'
                                    }`}
                                    style={{
                                      opacity: 0.25,
                                    }}
                                  />
                                </span>
                              );
                            }
                            return <span key={index}> {word}</span>;
                          })}
                        </h2>
                      </div>
                      {selectedRestaurant.description && (
                        <p className="text-gray-600 text-xl lg:text-2xl mb-8 leading-relaxed max-w-2xl">
                          {selectedRestaurant.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-base text-gray-500 mb-10">
                        {selectedRestaurant.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary-600" />
                            <span className="font-semibold text-gray-700">{selectedRestaurant.location}</span>
                          </div>
                        )}
                        {selectedRestaurantMenuItems.length > 0 && (
                          <div className="flex items-center gap-2">
                            <UtensilsCrossed className="h-5 w-5 text-primary-600" />
                            <span className="font-semibold text-gray-700">{selectedRestaurantMenuItems.length} dishes</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Navigation and About Restaurant */}
                    <div className="flex items-center justify-between">
                      {/* About Restaurant Button */}
                      <Link
                        to={`/stores/${selectedRestaurant.id}/menu`}
                        className="group inline-flex items-center gap-2 text-xl text-gray-900 hover:text-primary-600 font-bold transition-colors"
                      >
                        <span>About Restaurant</span>
                        <ArrowRight className="h-6 w-6 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                      </Link>

                      {/* Navigation Buttons - Next to each other */}
                      <div className="flex items-center gap-2">
                        {/* Previous Restaurant Button */}
                        <button
                          onClick={() => {
                            if (!selectedRestaurantId || restaurants.length === 0) return;
                            const currentIndex = restaurants.findIndex(r => r.id === selectedRestaurantId);
                            let prevIndex;
                            if (currentIndex > 0) {
                              prevIndex = currentIndex - 1;
                            } else {
                              prevIndex = restaurants.length - 1;
                            }
                            const prevRestaurant = restaurants[prevIndex];
                            if (prevRestaurant) {
                              setSelectedRestaurantId(prevRestaurant.id);
                            }
                          }}
                          className="p-2 rounded-full border border-gray-300 hover:border-primary-500 hover:bg-gray-50 transition-all group"
                          aria-label="Previous restaurant"
                        >
                          <ChevronLeft className="h-5 w-5 text-gray-600 group-hover:text-primary-600 transition-colors" />
                        </button>

                        {/* Next Restaurant Button */}
                        <button
                          onClick={() => {
                            if (!selectedRestaurantId || restaurants.length === 0) return;
                            const currentIndex = restaurants.findIndex(r => r.id === selectedRestaurantId);
                            let nextIndex;
                            if (currentIndex < restaurants.length - 1) {
                              nextIndex = currentIndex + 1;
                            } else {
                              nextIndex = 0;
                            }
                            const nextRestaurant = restaurants[nextIndex];
                            if (nextRestaurant) {
                              setSelectedRestaurantId(nextRestaurant.id);
                            }
                          }}
                          className="p-2 rounded-full border border-gray-300 hover:border-primary-500 hover:bg-gray-50 transition-all group"
                          aria-label="Next restaurant"
                        >
                          <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-primary-600 transition-colors" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 lg:p-16 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <UtensilsCrossed className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-3">
                      Select a Restaurant
                    </h3>
                    <p className="text-gray-600 text-xl">
                      Spin the wheel to explore our restaurants
                    </p>
                  </div>
                )}
              </div>

              {/* Right Side - Meal Wheel */}
              <div className="order-1 lg:order-2">
                <div className="relative">
                  {/* Drag Hint */}
                  <div className="mb-6 text-center lg:hidden">
                    <div className="inline-flex items-center gap-2 text-gray-400 text-sm">
                      <div className="h-px w-8 bg-gray-200"></div>
                      <span>DRAG TO SPIN</span>
                      <div className="h-px w-8 bg-gray-200"></div>
                    </div>
                  </div>
                  <MealWheel
                    restaurants={restaurants}
                    menuItems={allMenuItems}
                    selectedRestaurantId={selectedRestaurantId}
                    onRestaurantChange={setSelectedRestaurantId}
                    onInnerMenuHoverChange={setIsHoveringInnerMenu}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
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
              <div key={item.id} id={`dish-${item.id}`}>
                <Card className="hover:shadow-lg transition-shadow">
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
              </div>
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
