import { useEffect, useState } from 'react';
import { restaurantsApi } from '../../api/restaurants';
import { useOrderStore } from '../../store/orderStore';
import type { Restaurant } from '../../types/restaurant.types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { formatCurrency } from '../../utils/formatters';
import { Power, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export const RestaurantDashboard = () => {
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
      setRestaurant(store ?? null);
      setStatistics(stats ?? null);
      if (store) {
        await getRestaurantOrdersAll(store.id);
      }
    } catch (error) {
      console.error('Failed to fetch store:', error);
      toast.error('Failed to load your store. Please try again.');
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

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const totalRevenue =
    statistics?.total_revenue != null && !isNaN(Number(statistics.total_revenue))
      ? Number(statistics.total_revenue)
      : orders
          .filter((o) => (o as any).payment_status === 'paid')
          .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{restaurant.name}</h1>
          <p className="text-gray-600 mt-1">{restaurant.location}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={restaurant.is_open ? 'success' : 'error'}>
            {restaurant.is_open ? 'Open' : 'Closed'}
          </Badge>
          <Button
            variant={restaurant.is_open ? 'danger' : 'primary'}
            onClick={handleToggleStatus}
            isLoading={isToggling}
          >
            <Power className="h-4 w-4 mr-2" />
            {restaurant.is_open ? 'Close' : 'Open'} Store
          </Button>
          <Link to="/store/settings">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <p className="text-sm text-gray-600 mb-1">Pending Orders</p>
          <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-primary-600">{formatCurrency(totalRevenue)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 mb-1">Status</p>
          <Badge variant={restaurant.is_open ? 'success' : 'error'} className="mt-2">
            {restaurant.is_open ? 'Open' : 'Closed'}
          </Badge>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
          <Link to="/store/orders">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </div>

        {ordersLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No orders yet</p>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-semibold text-gray-900">Order #{order.id}</p>
                  <p className="text-sm text-gray-600">
                    {(order.items ?? []).length} item(s) • {formatCurrency(order.total ?? 0)}
                  </p>
                </div>
                <Link to={`/store/orders/${order.id}`}>
                  <Button size="sm">View Details</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
