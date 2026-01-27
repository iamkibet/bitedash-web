import { useEffect, useState } from 'react';
import { restaurantsApi } from '../../api/restaurants';
import { useOrderStore } from '../../store/orderStore';
import { useAuthStore } from '../../store/authStore';
import type { Restaurant } from '../../types/restaurant.types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Power,
  Settings,
  Clock,
  ChefHat,
  Truck,
  CheckCircle,
  DollarSign,
  Package,
  TrendingUp,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../../utils/constants';

export const RestaurantDashboard = () => {
  const { user } = useAuthStore();
  const { orders, getRestaurantOrdersAll, isLoading: ordersLoading } = useOrderStore();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [statistics, setStatistics] = useState<{ total_revenue?: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    fetchStoreAndOrders();
  }, []);

  const fetchStoreAndOrders = async () => {
    try {
      setIsLoading(true);
      const { store, statistics: stats } = await restaurantsApi.getMyStoreWithStats();
      
      if (store) {
        setRestaurant(store);
        setStatistics(stats ?? null);
        await getRestaurantOrdersAll(store.id);
      } else {
        // Fallback: Try to find store by user_id if my-store endpoint doesn't work
        console.warn('No store found via my-store endpoint, trying fallback...');
        if (user?.id) {
          try {
            const allStores = await restaurantsApi.getAll();
            const userStore = allStores.data?.find((s) => s.user_id === user.id);
            if (userStore) {
              console.log('Found store via fallback method:', userStore);
              setRestaurant(userStore);
              setStatistics(null);
              await getRestaurantOrdersAll(userStore.id);
            } else {
              console.warn('No store found for user_id:', user.id);
              setRestaurant(null);
              setStatistics(null);
            }
          } catch (fallbackError) {
            console.error('Fallback store fetch failed:', fallbackError);
            setRestaurant(null);
            setStatistics(null);
          }
        } else {
          setRestaurant(null);
          setStatistics(null);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch store:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load your store. Please try again.';
      const status = error?.response?.status;
      
      // Try fallback if 404
      if (status === 404 && user?.id) {
        console.log('404 error, trying fallback method...');
        try {
          const allStores = await restaurantsApi.getAll();
          const userStore = allStores.data?.find((s) => s.user_id === user.id);
          if (userStore) {
            console.log('Found store via fallback method:', userStore);
            setRestaurant(userStore);
            setStatistics(null);
            await getRestaurantOrdersAll(userStore.id);
            return;
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
      
      if (status === 404) {
        toast.error('No store found. Please create a store first.');
      } else if (status === 401 || status === 403) {
        toast.error('Authentication error. Please try logging in again.');
      } else {
        toast.error(errorMessage);
      }
      setRestaurant(null);
      setStatistics(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!restaurant) return;
    try {
      setIsToggling(true);
      const updated = await restaurantsApi.toggleStatus(restaurant.id);
      setRestaurant(updated);
    } catch (error) {
      console.error('Failed to toggle status:', error);
    } finally {
      setIsToggling(false);
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
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          No store found
        </h2>
        <p className="text-gray-600 mb-6">Create your store to get started</p>
        <Link to="/store/create">
          <Button>Create Store</Button>
        </Link>
      </div>
    );
  }

  // Calculate statistics
  const orderStats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    onTheWay: orders.filter((o) => o.status === 'on_the_way').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  const totalRevenue =
    statistics?.total_revenue != null && !isNaN(Number(statistics.total_revenue))
      ? Number(statistics.total_revenue)
      : orders
          .filter((o) => (o.payment_status ?? '').toLowerCase() === 'paid')
          .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const paidOrdersCount = orders.filter((o) => (o.payment_status ?? '').toLowerCase() === 'paid').length;

  // Get recent orders sorted by created_at (newest first)
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{restaurant.name}</h1>
          <p className="text-gray-600 mt-1 flex items-center gap-2">
            <span>{restaurant.location}</span>
            <Badge variant={restaurant.is_open ? 'success' : 'error'} className="text-xs">
              {restaurant.is_open ? 'Open' : 'Closed'}
            </Badge>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={restaurant.is_open ? 'danger' : 'primary'}
            onClick={handleToggleStatus}
            isLoading={isToggling}
            className="gap-2"
          >
            <Power className="h-4 w-4" />
            {restaurant.is_open ? 'Close' : 'Open'} Store
          </Button>
          <Link to="/store/settings">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards - Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Pending Orders</p>
              <p className="text-3xl font-bold text-gray-900">{orderStats.pending}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Preparing</p>
              <p className="text-3xl font-bold text-gray-900">{orderStats.preparing}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <ChefHat className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">On the Way</p>
              <p className="text-3xl font-bold text-gray-900">{orderStats.onTheWay}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Delivered</p>
              <p className="text-3xl font-bold text-gray-900">{orderStats.delivered}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue and Total Orders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-700 mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-primary-900">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-primary-600 mt-1">{paidOrdersCount} paid orders</p>
            </div>
            <div className="p-3 bg-primary-200 rounded-full">
              <DollarSign className="h-6 w-6 text-primary-700" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{orderStats.total}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <Package className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 mb-1">Active Orders</p>
              <p className="text-3xl font-bold text-purple-900">
                {orderStats.pending + orderStats.preparing + orderStats.onTheWay}
              </p>
              <p className="text-xs text-purple-600 mt-1">Require attention</p>
            </div>
            <div className="p-3 bg-purple-200 rounded-full">
              <TrendingUp className="h-6 w-6 text-purple-700" />
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Orders Section */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
            <p className="text-sm text-gray-500 mt-1">Latest order activity</p>
          </div>
          <Link to="/store/orders">
            <Button variant="outline" size="sm" className="gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {ordersLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No orders yet</p>
            <p className="text-sm text-gray-400 mt-1">Orders will appear here once customers place them</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => {
              const statusConfig = ORDER_STATUSES[order.status];
              const paymentKey = (order.payment_status ?? 'unpaid') as keyof typeof PAYMENT_STATUSES;
              const paymentConfig = PAYMENT_STATUSES[paymentKey] ?? PAYMENT_STATUSES.unpaid;
              const hasRider = !!(order.rider_id ?? order.rider);
              const customer = order.user ?? (order as { customer?: { name?: string; phone?: string } }).customer;
              const rawItems = order.items ?? [];
              const itemCount = rawItems.reduce((s, i) => s + (Number(i.quantity) ?? 0), 0) || rawItems.length;

              return (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">Order #{order.id}</h3>
                      <Badge variant={statusConfig.color as any} className="gap-1">
                        <span>{statusConfig.icon}</span>
                        {statusConfig.label}
                      </Badge>
                      <Badge variant={paymentConfig.color as any}>{paymentConfig.label}</Badge>
                      {hasRider && (
                        <Badge variant="info" className="gap-1">
                          <Truck className="h-3 w-3" />
                          {order.rider?.name ? `Rider: ${order.rider.name}` : 'Rider assigned'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        {itemCount} item(s)
                      </span>
                      <span>{formatCurrency(order.total ?? 0)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(order.created_at)}
                      </span>
                    </div>
                    {customer && (
                      <p className="text-sm text-gray-500 mt-1">
                        Customer: {customer.name} • {customer.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:flex-shrink-0">
                    <Link to={`/store/orders/${order.id}`} title="View details">
                      <Button variant="outline" size="sm" className="p-2" aria-label="View details">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
