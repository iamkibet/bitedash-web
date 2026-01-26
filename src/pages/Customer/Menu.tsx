import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { restaurantsApi } from '../../api/restaurants';
import { menuItemsApi } from '../../api/menuItems';
import type { Restaurant } from '../../types/restaurant.types';
import type { MenuItem } from '../../types/order.types';
import { useCartStore } from '../../store/cartStore';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Minus, ShoppingCart, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { MenuItemImage } from '../../components/common/MenuItemImage';

export const Menu = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const { addItem, restaurantId: cartRestaurantId } = useCartStore();

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      navigate('/stores');
      return;
    }
    fetchRestaurant();
    fetchMenuItems();
  }, [id, navigate]);

  const fetchRestaurant = async () => {
    try {
      const data = await restaurantsApi.getById(Number(id));
      setRestaurant(data);
    } catch (error) {
      toast.error('Failed to load restaurant');
      navigate('/stores');
    }
  };

  const fetchMenuItems = async () => {
    try {
      setIsLoading(true);
      const items = await menuItemsApi.getByRestaurant(Number(id), { is_available: true });
      setMenuItems(items);
      const initialQuantities: Record<number, number> = {};
      items.forEach((item) => {
        initialQuantities[item.id] = 1;
      });
      setQuantities(initialQuantities);
    } catch (error) {
      toast.error('Failed to load menu');
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

  const handleAddToCart = (item: MenuItem) => {
    if (cartRestaurantId && cartRestaurantId !== item.restaurant_id) {
      if (window.confirm('Your cart contains items from another restaurant. Clear cart and add this item?')) {
        addItem(item, quantities[item.id] || 1);
        toast.success('Item added to cart');
      }
    } else {
      addItem(item, quantities[item.id] || 1);
      toast.success('Item added to cart');
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

  return (
    <div>
      <Button
        variant="outline"
        onClick={() => navigate('/stores')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Restaurants
      </Button>

      <Card className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{restaurant.name}</h1>
            <p className="text-gray-600 mb-2">{restaurant.description}</p>
            <p className="text-sm text-gray-500">{restaurant.location}</p>
          </div>
          <Badge variant={restaurant.is_open ? 'success' : 'error'}>
            {restaurant.is_open ? 'Open' : 'Closed'}
          </Badge>
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Menu</h2>
        <Button onClick={() => navigate('/cart')}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          View Cart
        </Button>
      </div>

      {menuItems.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500 py-8">No menu items available.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Card key={item.id}>
              <div className="mb-4">
                <MenuItemImage src={item.image_url} alt={item.name} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.name}</h3>
              <p className="text-gray-600 text-sm mb-3">{item.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary-600">
                  {formatCurrency(item.price)}
                </span>
                {!item.is_available && (
                  <Badge variant="error">Out of Stock</Badge>
                )}
              </div>

              {item.is_available && (
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex items-center gap-2 border rounded-lg">
                    <button
                      onClick={() => handleQuantityChange(item.id, -1)}
                      className="p-2 hover:bg-gray-100"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-3 py-1 min-w-[3rem] text-center">
                      {quantities[item.id] || 1}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.id, 1)}
                      className="p-2 hover:bg-gray-100"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <Button
                    onClick={() => handleAddToCart(item)}
                    className="flex-1"
                  >
                    Add to Cart
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
