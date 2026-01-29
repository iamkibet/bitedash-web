import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { favoritesApi, type Favorite } from '../../api/favorites';
import { ratingsApi, type Rating } from '../../api/ratings';
import { useOrderStore } from '../../store/orderStore';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/common/Card';
import { Spinner } from '../../components/common/Spinner';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { DishCard } from '../../components/common/DishCard';
import { formatCurrency, formatDateShort, formatTime } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';
import { toast } from 'sonner';
import {
  Heart,
  Star,
  Package,
  Eye,
  ArrowRight,
  Store,
  UtensilsCrossed,
} from 'lucide-react';
import type { MenuItem, OrderItem } from '../../types/order.types';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

export const CustomerDashboard = () => {
  const { user } = useAuthStore();
  const { orders, fetchOrders, isLoading: ordersLoading } = useOrderStore();
  const { addItem, restaurantId: cartRestaurantId } = useCartStore();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        await fetchOrders();
        if (!cancelled) await fetchFavorites();
      } catch (error) {
        if (!cancelled) console.error('Failed to fetch dashboard data:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [fetchOrders]);

  useEffect(() => {
    if (orders.length === 0) return;
    let cancelled = false;
    const loadRatings = async () => {
      if (!user?.id) return;
      const menuItemIds = new Set<number>();
      orders.forEach((order) => {
        order.items?.forEach((item) => {
          const id = item.menu_item?.id ?? item.menu_item_id;
          if (id) menuItemIds.add(id);
        });
      });
      try {
        const results = await Promise.all(
          Array.from(menuItemIds).map(async (menuItemId) => {
            try {
              const res = await ratingsApi.getByMenuItem(menuItemId);
              return res.data?.find((r) => r.user_id === user.id) ?? null;
            } catch {
              return null;
            }
          })
        );
        if (!cancelled) setRatings(results.filter((r): r is Rating => r != null));
      } catch (error) {
        if (!cancelled) console.error('Failed to fetch ratings:', error);
      }
    };
    loadRatings();
    return () => { cancelled = true; };
  }, [orders, user?.id]);

  const fetchFavorites = async () => {
    try {
      const data = await favoritesApi.getAll();
      setFavorites(data);
      const q: Record<number, number> = {};
      data.forEach((fav) => { q[fav.menu_item.id] = 1; });
      setQuantities((prev) => ({ ...q, ...prev }));
    } catch (error: unknown) {
      console.error('Failed to fetch favorites:', error);
      toast.error('Failed to load favorites.');
    }
  };

  const handleQuantityChange = (itemId: number, delta: number) => {
    setQuantities((prev) => {
      const cur = prev[itemId] ?? 1;
      const next = Math.max(1, Math.min(50, cur + delta));
      return { ...prev, [itemId]: next };
    });
  };

  const handleAddToCart = (menuItem: Favorite['menu_item']) => {
    const qty = quantities[menuItem.id] ?? 1;
    if (cartRestaurantId && cartRestaurantId !== menuItem.restaurant_id) {
      if (window.confirm('Your cart has items from another restaurant. Replace and add this item?')) {
        addItem(menuItem, qty);
        toast.success('Added to cart');
      }
    } else {
      addItem(menuItem, qty);
      toast.success('Added to cart');
    }
  };

  const handleToggleFavorite = async (menuItemId: number) => {
    const isFav = favorites.some((f) => f.menu_item_id === menuItemId);
    try {
      if (isFav) {
        await favoritesApi.remove(menuItemId);
        setFavorites((prev) => prev.filter((f) => f.menu_item_id !== menuItemId));
        toast.success('Removed from favorites');
      } else {
        await favoritesApi.add(menuItemId);
        await fetchFavorites();
        toast.success('Added to favorites');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message ?? (isFav ? 'Failed to remove' : 'Failed to add'));
    }
  };

  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
    [orders]
  );

  const ratingMap = useMemo(() => {
    const m = new Map<number, Rating>();
    ratings.forEach((r) => m.set(r.menu_item_id, r));
    return m;
  }, [ratings]);

  const ratedDishes = useMemo(() => {
    const list: { menuItem: MenuItem; rating: Rating }[] = [];
    const seen = new Set<number>();
    orders.forEach((order) => {
      order.items?.forEach((item) => {
        const menuItem = item.menu_item;
        const id = menuItem?.id ?? item.menu_item_id;
        const rating = id ? ratingMap.get(id) : undefined;
        if (rating && menuItem && id != null && !seen.has(id)) {
          seen.add(id);
          list.push({ menuItem, rating });
        }
      });
    });
    return list;
  }, [orders, ratingMap]);

  /** Menu items from delivered orders (unique by menu_item id), most recent first */
  const reorderItems = useMemo(() => {
    const statusDelivered = (s: string | undefined) => {
      const lower = String(s ?? '').toLowerCase();
      return lower === 'delivered' || lower === 'completed';
    };
    const ordersList = Array.isArray(orders) ? orders : [];
    const delivered = ordersList.filter((o) => statusDelivered(o.status));
    const byId = new Map<number, { menuItem: MenuItem; orderDate: string }>();
    delivered
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .forEach((order) => {
        const items = order.items ?? [];
        items.forEach((item: OrderItem) => {
          let menuItem = item.menu_item;
          const id = menuItem?.id ?? item.menu_item_id;
          if (id == null || id === 0) return;
          if (byId.has(id)) return;
          if (!menuItem && item.menu_item_id && order.restaurant_id) {
            menuItem = {
              id: item.menu_item_id,
              restaurant_id: order.restaurant_id,
              name: 'Item',
              description: '',
              price: Number(item.price) || 0,
              image_url: undefined,
              is_available: true,
              created_at: '',
              updated_at: '',
            };
          }
          if (menuItem) {
            byId.set(id, { menuItem, orderDate: order.created_at ?? '' });
          }
        });
      });
    return Array.from(byId.values());
  }, [orders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {user?.name ? `Hi, ${user.name}` : 'Dashboard'}
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Here’s an overview of your orders and favorites.
        </p>
      </div>

      {/* Stats pills */}
      <div className="flex flex-wrap gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
          <Package className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'}
          </span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
          <Heart className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {favorites.length} {favorites.length === 1 ? 'favorite' : 'favorites'}
          </span>
        </div>
      </div>

      {/* Recent orders - table */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent orders</h2>
          {!ordersLoading && orders.length > 0 && (
            <Link
              to="/orders"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              <span>View all</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          )}
        </div>

        {ordersLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : recentOrders.length === 0 ? (
          <Card className="text-center py-12">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No orders yet</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">Browse stores and place your first order.</p>
            <Link to="/stores">
              <Button className="inline-flex items-center justify-center gap-2">
                <Store className="h-4 w-4 shrink-0" aria-hidden />
                <span>Browse stores</span>
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            <Card padding="none" className="overflow-hidden">
              <div className="overflow-x-auto table-scroll">
                <table className="w-full min-w-[500px] text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Order
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Restaurant
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Date & time
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">
                        Amount
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Status
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentOrders.map((order) => {
                      const statusConfig = ORDER_STATUSES[order.status];
                      return (
                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <Link
                              to={`/orders/${order.id}`}
                              className="font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                            >
                              #{order.id}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700 truncate max-w-[140px]">
                            {order.restaurant?.name ?? '—'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{formatDateShort(order.created_at)}</div>
                            <div className="text-xs text-gray-500">{formatTime(order.created_at)}</div>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap font-medium text-gray-900">
                            {formatCurrency(order.total ?? 0)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={statusConfig.color as BadgeVariant} className="text-xs whitespace-nowrap">
                              {statusConfig.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link to={`/orders/${order.id}`} title="View order">
                              <Button
                                variant="outline"
                                size="sm"
                                className="p-2 border-gray-300 text-gray-600 hover:bg-gray-50"
                                aria-label="View order"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </section>

      {/* Favorites */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Favorites</h2>
          {favorites.length > 0 && (
            <Link to="/favorites" className="flex-shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700">
              View all →
            </Link>
          )}
        </div>

        {favorites.length === 0 ? (
          <Card className="text-center py-12">
            <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No favorites yet</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">Add dishes from the menu to see them here.</p>
            <Link to="/stores">
              <Button variant="outline" className="inline-flex items-center justify-center gap-2">
                <Store className="h-4 w-4 shrink-0" aria-hidden />
                <span>Browse stores</span>
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {favorites.slice(0, 8).map((fav) => {
              const item = fav.menu_item;
              const qty = quantities[item.id] ?? 1;
              const userRating = ratingMap.get(item.id);
              return (
                <DishCard
                  key={fav.id}
                  item={item}
                  quantity={qty}
                  isFavorite
                  rating={undefined}
                  userRating={userRating ? { rating: userRating.rating, id: userRating.id } : undefined}
                  onQuantityChange={handleQuantityChange}
                  onAddToCart={handleAddToCart}
                  onToggleFavorite={handleToggleFavorite}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Reorder - items from delivered orders */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Reorder</h2>
          {reorderItems.length > 0 && (
            <Link
              to="/orders"
              className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              View all
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>

        {reorderItems.length === 0 ? (
          <Card className="text-center py-12">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Nothing to reorder yet</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Items you’ve had delivered will show here so you can order them again quickly.
            </p>
            <Link to="/orders">
              <Button variant="outline" className="inline-flex items-center justify-center gap-2">
                <UtensilsCrossed className="h-4 w-4 shrink-0" aria-hidden />
                <span>My orders</span>
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {reorderItems.slice(0, 4).map(({ menuItem }) => {
              const qty = quantities[menuItem.id] ?? 1;
              const isFavorite = favorites.some((f) => f.menu_item_id === menuItem.id);
              const userRating = ratingMap.get(menuItem.id);
              return (
                <DishCard
                  key={menuItem.id}
                  item={menuItem}
                  quantity={qty}
                  isFavorite={isFavorite}
                  rating={undefined}
                  userRating={userRating ? { rating: userRating.rating, id: userRating.id } : undefined}
                  onQuantityChange={handleQuantityChange}
                  onAddToCart={handleAddToCart}
                  onToggleFavorite={handleToggleFavorite}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Rated dishes */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Rated dishes</h2>
          {ratedDishes.length > 0 && (
            <Link to="/orders" className="flex-shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700">
              From your orders →
            </Link>
          )}
        </div>

        {ratedDishes.length === 0 ? (
          <Card className="text-center py-12">
            <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No rated dishes yet</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">Rate items from your delivered orders to see them here.</p>
            <Link to="/orders">
              <Button variant="outline" className="inline-flex items-center justify-center gap-2">
                <UtensilsCrossed className="h-4 w-4 shrink-0" aria-hidden />
                <span>My orders</span>
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ratedDishes.slice(0, 8).map(({ menuItem, rating }) => {
              const qty = quantities[menuItem.id] ?? 1;
              const isFavorite = favorites.some((f) => f.menu_item_id === menuItem.id);
              return (
                <DishCard
                  key={rating.id}
                  item={menuItem}
                  quantity={qty}
                  isFavorite={isFavorite}
                  rating={undefined}
                  userRating={{ rating: rating.rating, id: rating.id }}
                  onQuantityChange={handleQuantityChange}
                  onAddToCart={handleAddToCart}
                  onToggleFavorite={handleToggleFavorite}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
