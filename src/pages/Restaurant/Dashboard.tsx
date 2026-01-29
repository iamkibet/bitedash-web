import { useCallback, useEffect, useMemo, useState } from 'react';
import { restaurantsApi } from '../../api/restaurants';
import { useOrderStore } from '../../store/orderStore';
import { useAuthStore } from '../../store/authStore';
import { menuItemsApi } from '../../api/menuItems';
import { ratingsApi } from '../../api/ratings';
import type { Restaurant } from '../../types/restaurant.types';
import type { Order, OrderStatus } from '../../types/order.types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
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
  Star,
  XCircle,
  MoreVertical,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ORDER_STATUSES, ORDER_STATUS_TRANSITIONS, PAYMENT_STATUSES } from '../../utils/constants';
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Bar,
  ComposedChart,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { cn } from '../../utils/cn';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

const CHART_COLORS = {
  pending: '#eab308',
  preparing: '#22c55e',
  on_the_way: '#3b82f6',
  delivered: '#10b981',
  cancelled: '#ef4444',
} as const;

const PIE_COLORS = ['#eab308', '#22c55e', '#3b82f6', '#10b981', '#ef4444'];

export const RestaurantDashboard = () => {
  const { user } = useAuthStore();
  const { orders, getRestaurantOrdersAll, updateOrderStatus, cancelOrder, isLoading: ordersLoading } = useOrderStore();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [statistics, setStatistics] = useState<{ total_revenue?: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [ratingsSummary, setRatingsSummary] = useState<{ average: number; total: number; itemsWithRatings: number } | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState<number | null>(null);

  const fetchRatingsSummary = useCallback(async (restaurantId: number) => {
    try {
      const menuItems = await menuItemsApi.getByRestaurant(restaurantId);
      let totalRatings = 0;
      let totalRatingSum = 0;
      let itemsWithRatings = 0;

      for (const item of menuItems) {
        try {
          const response = await ratingsApi.getByMenuItem(item.id);
          const itemRatings = response.data || [];
          if (itemRatings.length > 0) {
            itemsWithRatings++;
            const itemAverage =
              response.stats?.average_rating ||
              itemRatings.reduce((sum, r) => sum + r.rating, 0) / itemRatings.length;
            const itemCount = response.stats?.total_ratings || itemRatings.length;
            totalRatings += itemCount;
            totalRatingSum += itemAverage * itemCount;
          }
        } catch {
          // ignore
        }
      }

      if (totalRatings > 0) {
        setRatingsSummary({
          average: totalRatingSum / totalRatings,
          total: totalRatings,
          itemsWithRatings,
        });
      }
    } catch (error) {
      console.error('Failed to fetch ratings summary:', error);
    }
  }, []);

  const fetchStoreAndOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const { store, statistics: stats } = await restaurantsApi.getMyStoreWithStats();

      if (store) {
        setRestaurant(store);
        setStatistics(stats ?? null);
        await getRestaurantOrdersAll(store.id);
        await fetchRatingsSummary(store.id);
      } else {
        if (user?.id) {
          try {
            const allStores = await restaurantsApi.getAll();
            const userStore = allStores.data?.find((s) => s.user_id === user.id);
            if (userStore) {
              setRestaurant(userStore);
              setStatistics(null);
              await getRestaurantOrdersAll(userStore.id);
            } else {
              setRestaurant(null);
              setStatistics(null);
            }
          } catch {
            setRestaurant(null);
            setStatistics(null);
          }
        } else {
          setRestaurant(null);
          setStatistics(null);
        }
      }
    } catch (error: unknown) {
      console.error('Failed to fetch store:', error);
      const err = error as { response?: { data?: { message?: string }; status?: number }; message?: string };
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load your store.';
      const status = err?.response?.status;

      if (status === 404 && user?.id) {
        try {
          const allStores = await restaurantsApi.getAll();
          const userStore = allStores.data?.find((s) => s.user_id === user.id);
          if (userStore) {
            setRestaurant(userStore);
            setStatistics(null);
            await getRestaurantOrdersAll(userStore.id);
            return;
          }
        } catch {
          // ignore
        }
      }

      if (status === 404) toast.error('No store found. Please create a store first.');
      else if (status === 401 || status === 403) toast.error('Please log in again.');
      else toast.error(errorMessage);
      setRestaurant(null);
      setStatistics(null);
    } finally {
      setIsLoading(false);
    }
  }, [getRestaurantOrdersAll, user, fetchRatingsSummary]);

  useEffect(() => {
    fetchStoreAndOrders();
  }, [fetchStoreAndOrders]);

  const handleToggleStatus = async () => {
    if (!restaurant) return;
    try {
      setIsToggling(true);
      const updated = await restaurantsApi.toggleStatus(restaurant.id);
      setRestaurant(updated);
      toast.success(updated.is_open ? 'Store is now open' : 'Store is now closed');
    } catch {
      toast.error('Failed to update store status');
    } finally {
      setIsToggling(false);
    }
  };

  const handleUpdateStatus = async (orderId: number, status: OrderStatus) => {
    setStatusMenuOpen(null);
    if (status === 'cancelled') {
      try {
        setUpdatingOrderId(orderId);
        await cancelOrder(orderId);
      } catch {
        // toast from store
      } finally {
        setUpdatingOrderId(null);
      }
      return;
    }
    try {
      setUpdatingOrderId(orderId);
      await updateOrderStatus(orderId, status);
    } catch {
      // toast from store
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // All hooks must run before any conditional return (Rules of Hooks)
  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8),
    [orders]
  );

  const ordersByDay = useMemo(() => {
    const days = 7;
    const result: { date: string; short: string; orders: number; revenue: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayOrders = orders.filter((o) => format(new Date(o.created_at), 'yyyy-MM-dd') === dateStr);
      const revenue = dayOrders
        .filter((o) => (o.payment_status ?? '').toLowerCase() === 'paid')
        .reduce((s, o) => s + (Number(o.total) || 0), 0);
      result.push({
        date: dateStr,
        short: format(d, 'EEE d'),
        orders: dayOrders.length,
        revenue,
      });
    }
    return result;
  }, [orders]);

  const statusDistribution = useMemo(
    () =>
      (['pending', 'preparing', 'on_the_way', 'delivered', 'cancelled'] as const).map((status) => ({
        name: ORDER_STATUSES[status].label,
        value: orders.filter((o) => o.status === status).length,
        fill: CHART_COLORS[status],
      })),
    [orders]
  );

  const hasChartData = ordersByDay.some((d) => d.orders > 0) || statusDistribution.some((s) => s.value > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-12 px-4">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">No store found</h2>
        <p className="text-gray-600 mb-6">Create your store to get started</p>
        <Link to="/store/create">
          <Button>Create Store</Button>
        </Link>
      </div>
    );
  }

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
  const activeOrders = orderStats.pending + orderStats.preparing + orderStats.onTheWay;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          {restaurant.image_url && (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm flex-shrink-0">
              <img
                src={restaurant.image_url}
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">{restaurant.name}</h1>
            <p className="text-gray-600 text-sm sm:text-base mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{restaurant.location}</span>
              <Badge variant={restaurant.is_open ? 'success' : 'error'} className="text-xs">
                {restaurant.is_open ? 'Open' : 'Closed'}
              </Badge>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant={restaurant.is_open ? 'danger' : 'primary'}
            onClick={handleToggleStatus}
            isLoading={isToggling}
            className="gap-2"
          >
            <Power className="h-4 w-4" />
            <span className="hidden xs:inline">{restaurant.is_open ? 'Close' : 'Open'} Store</span>
          </Button>
          <Link to="/store/settings" title="Settings">
            <Button variant="outline" size="sm" className="p-2" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/80 to-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Pending</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-0.5">{orderStats.pending}</p>
            </div>
            <div className="p-2.5 sm:p-3 bg-amber-100 rounded-xl">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/80 to-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Preparing</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-0.5">{orderStats.preparing}</p>
            </div>
            <div className="p-2.5 sm:p-3 bg-emerald-100 rounded-xl">
              <ChefHat className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/80 to-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">On the way</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-0.5">{orderStats.onTheWay}</p>
            </div>
            <div className="p-2.5 sm:p-3 bg-blue-100 rounded-xl">
              <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-teal-500 bg-gradient-to-br from-teal-50/80 to-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Delivered</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-0.5">{orderStats.delivered}</p>
            </div>
            <div className="p-2.5 sm:p-3 bg-teal-100 rounded-xl">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue, total, active, rating */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-primary-50 to-primary-100/50 border border-primary-200/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-700">Total Revenue</p>
              <p className="text-xl sm:text-2xl font-bold text-primary-900 mt-0.5">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-primary-600 mt-1">{paidOrdersCount} paid orders</p>
            </div>
            <div className="p-3 bg-primary-200/60 rounded-xl">
              <DollarSign className="h-6 w-6 text-primary-700" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">{orderStats.total}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-xl">
              <Package className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50 border border-violet-200/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-violet-700">Active</p>
              <p className="text-xl sm:text-2xl font-bold text-violet-900 mt-0.5">{activeOrders}</p>
              <p className="text-xs text-violet-600 mt-1">Need attention</p>
            </div>
            <div className="p-3 bg-violet-200/60 rounded-xl">
              <TrendingUp className="h-6 w-6 text-violet-700" />
            </div>
          </div>
        </Card>
        {ratingsSummary && ratingsSummary.total > 0 ? (
          <Card className="bg-gradient-to-br from-yellow-50 to-amber-50/80 border border-amber-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-800">Rating</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          'h-4 w-4',
                          star <= Math.floor(ratingsSummary.average)
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-gray-300'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-bold text-amber-900">{ratingsSummary.average.toFixed(1)}</span>
                </div>
                <p className="text-xs text-amber-700 mt-1">
                  {ratingsSummary.total} ratings · {ratingsSummary.itemsWithRatings} items
                </p>
              </div>
              <div className="p-3 bg-amber-200/60 rounded-xl">
                <Star className="h-6 w-6 text-amber-700 fill-amber-500" />
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rating</p>
                <p className="text-lg font-semibold text-gray-500 mt-0.5">No ratings yet</p>
              </div>
              <Star className="h-6 w-6 text-gray-300" />
            </div>
          </Card>
        )}
      </div>

      {/* Charts */}
      {hasChartData && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2" padding="none">
            <div className="p-4 sm:p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Orders & revenue (last 7 days)</h3>
              <p className="text-sm text-gray-500 mt-0.5">Daily order count and revenue</p>
            </div>
            <div className="p-4 pt-2 h-[260px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={ordersByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="short" tick={{ fontSize: 11 }} stroke="#6b7280" />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#6b7280" allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#6b7280" tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    formatter={(value: number, name: string) => [name === 'revenue' ? formatCurrency(value) : value, name === 'revenue' ? 'Revenue' : 'Orders']}
                    labelFormatter={(label: string) => label}
                  />
                  <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card padding="none">
            <div className="p-4 sm:p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Order status</h3>
              <p className="text-sm text-gray-500 mt-0.5">Distribution</p>
            </div>
            <div className="p-4 h-[260px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution.filter((s) => s.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={(payload: { name?: string; value?: number }) => (payload?.value ? `${payload.name ?? ''}: ${payload.value}` : '')}
                  >
                    {statusDistribution.filter((s) => s.value > 0).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Orders'] as [string | number, string]} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Recent orders with status actions */}
      <Card className="overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recent orders</h2>
            <p className="text-sm text-gray-500 mt-0.5">Update status or view details</p>
          </div>
          <Link to="/store/orders" className="flex-shrink-0 ">
            <Button variant="outline" size="sm" className="w-full sm:w-auto border-none  inline-flex items-center justify-center gap-2">
              <span>View all</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Button>
          </Link>
        </div>

        {ordersLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No orders yet</p>
            <p className="text-sm text-gray-400 mt-1">Orders will appear here when customers place them</p>
          </div>
        ) : (
          <div className="overflow-x-auto table-scroll">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Order</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4 hidden sm:table-cell">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Amount</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4 hidden md:table-cell">Date</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.map((order) => (
                  <RecentOrderRow
                    key={order.id}
                    order={order}
                    updatingOrderId={updatingOrderId}
                    statusMenuOpen={statusMenuOpen}
                    setStatusMenuOpen={setStatusMenuOpen}
                    onUpdateStatus={handleUpdateStatus}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

interface RecentOrderRowProps {
  order: Order;
  updatingOrderId: number | null;
  statusMenuOpen: number | null;
  setStatusMenuOpen: (id: number | null) => void;
  onUpdateStatus: (orderId: number, status: OrderStatus) => void;
}

function RecentOrderRow({ order, updatingOrderId, statusMenuOpen, setStatusMenuOpen, onUpdateStatus }: RecentOrderRowProps) {
  const statusConfig = ORDER_STATUSES[order.status];
  const paymentKey = (order.payment_status ?? 'unpaid') as keyof typeof PAYMENT_STATUSES;
  const paymentConfig = PAYMENT_STATUSES[paymentKey] ?? PAYMENT_STATUSES.unpaid;
  const nextStatuses = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
  const customer = order.user ?? (order as { customer?: { name?: string; phone?: string } }).customer;
  const rawItems = order.items ?? [];
  const itemCount = rawItems.reduce((s, i) => s + Number(i.quantity ?? 0), 0) || rawItems.length;
  const isUpdating = updatingOrderId === order.id;
  const isMenuOpen = statusMenuOpen === order.id;

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="py-3 px-4">
        <div className="font-medium text-gray-900">#{order.id}</div>
        <div className="text-xs text-gray-500 sm:hidden">{customer?.name ?? '—'}</div>
        <div className="text-xs text-gray-500 mt-0.5">{itemCount} item(s)</div>
      </td>
      <td className="py-3 px-4 hidden sm:table-cell">
        <div className="text-sm text-gray-700">{customer?.name ?? '—'}</div>
        <div className="text-xs text-gray-500">{customer?.phone ?? '—'}</div>
      </td>
      <td className="py-3 px-4">
        <span className="font-medium text-gray-900">{formatCurrency(order.total ?? 0)}</span>
        <div className="flex sm:hidden mt-1">
          <Badge variant={paymentConfig.color as BadgeVariant} className="text-xs">{paymentConfig.label}</Badge>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={statusConfig.color as BadgeVariant} className="text-xs">
            {statusConfig.label}
          </Badge>
          <span className="hidden sm:inline">
            <Badge variant={paymentConfig.color as BadgeVariant} className="text-xs">{paymentConfig.label}</Badge>
          </span>
        </div>
      </td>
      <td className="py-3 px-4 hidden md:table-cell text-sm text-gray-500">
        {formatDateShort(order.created_at)}
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Link to={`/store/orders/${order.id}`} title="View">
            <Button variant="outline" size="sm" className="p-2 border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900" aria-label="View order">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {nextStatuses.length > 0 && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="p-2 border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                onClick={() => setStatusMenuOpen(isMenuOpen ? null : order.id)}
                disabled={isUpdating}
                aria-label="Change status"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setStatusMenuOpen(null)} />
                  <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {nextStatuses.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => onUpdateStatus(order.id, status as OrderStatus)}
                      >
                        {status === 'cancelled' ? (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            Cancel order
                          </>
                        ) : (
                          <>
                            <span>{ORDER_STATUSES[status as OrderStatus]?.icon ?? ''}</span>
                            Mark as {ORDER_STATUSES[status as OrderStatus]?.label ?? status}
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
