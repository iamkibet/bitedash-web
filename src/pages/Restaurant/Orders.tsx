import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { Modal } from '../../components/common/Modal';
import { formatCurrency, formatDateShort, formatTime } from '../../utils/formatters';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../../utils/constants';
import { canCancelOrder, getNextStatusTransitions } from '../../utils/orderLifecycle';
import {
  Eye,
  Truck,
  CheckCircle,
  UserPlus,
  XCircle,
  MoreVertical,
  Package,
  Store,
} from 'lucide-react';
import { restaurantsApi } from '../../api/restaurants';
import { ridersApi, type Rider } from '../../api/riders';
import type { Restaurant } from '../../types/restaurant.types';
import type { Order, OrderStatus } from '../../types/order.types';
import { cn } from '../../utils/cn';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

const STATUS_FILTER_OPTIONS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'on_the_way', label: 'On the way' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const RestaurantOrders = () => {
  const { orders, getRestaurantOrdersAll, updateOrderStatus, assignRider, cancelOrder, isLoading } = useOrderStore();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [isLoadingRiders, setIsLoadingRiders] = useState(false);
  const [assigningOrderId, setAssigningOrderId] = useState<number | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);

  useEffect(() => {
    fetchStoreAndOrders();
    fetchRiders();
  }, []);

  useEffect(() => {
    if (!restaurant) return;
    const interval = setInterval(() => getRestaurantOrdersAll(restaurant.id), 15000);
    return () => clearInterval(interval);
  }, [restaurant, getRestaurantOrdersAll]);

  const fetchRiders = async () => {
    try {
      setIsLoadingRiders(true);
      const ridersList = await ridersApi.getAll();
      setRiders(ridersList);
    } catch (error) {
      console.error('Failed to fetch riders:', error);
      setRiders([]);
    } finally {
      setIsLoadingRiders(false);
    }
  };

  const fetchStoreAndOrders = async () => {
    try {
      setIsLoadingStore(true);
      const store = await restaurantsApi.getMyStore();
      setRestaurant(store);
      if (store) await getRestaurantOrdersAll(store.id);
    } catch (error) {
      console.error('Failed to fetch store:', error);
    } finally {
      setIsLoadingStore(false);
    }
  };

  const handleStatusUpdate = async (orderId: number, status: OrderStatus) => {
    setActionMenuOpen(null);
    if (!restaurant) return;
    try {
      setUpdatingId(orderId);
      await updateOrderStatus(orderId, status);
      await getRestaurantOrdersAll(restaurant.id);
    } catch (error) {
      console.error('Failed to update order status:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancel = async (orderId: number) => {
    setActionMenuOpen(null);
    if (!window.confirm('Cancel this order? This cannot be undone.')) return;
    try {
      setUpdatingId(orderId);
      await cancelOrder(orderId);
      if (restaurant) await getRestaurantOrdersAll(restaurant.id);
    } catch (error) {
      console.error('Failed to cancel order:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssignRider = (orderId: number) => {
    setAssigningOrderId(orderId);
    setActionMenuOpen(null);
    setShowAssignModal(true);
  };

  const handleRiderSelect = async (riderId: number) => {
    if (!assigningOrderId || !restaurant) return;
    try {
      setUpdatingId(assigningOrderId);
      await assignRider(assigningOrderId, riderId);
      await getRestaurantOrdersAll(restaurant.id);
      setShowAssignModal(false);
      setAssigningOrderId(null);
    } catch (error) {
      console.error('Failed to assign rider:', error);
      setShowAssignModal(false);
      setAssigningOrderId(null);
      await getRestaurantOrdersAll(restaurant.id);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    const list = statusFilter === 'all'
      ? orders
      : orders.filter((o) => o.status === statusFilter);
    return [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [orders, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<OrderStatus | 'all', number> = {
      all: orders.length,
      pending: 0,
      preparing: 0,
      on_the_way: 0,
      delivered: 0,
      cancelled: 0,
    };
    orders.forEach((o) => {
      counts[o.status]++;
    });
    return counts;
  }, [orders]);

  if (isLoadingStore || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] px-4 text-center">
        <div className="rounded-2xl bg-gray-100 p-8 mb-6">
          <Store className="h-16 w-16 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No store found</h2>
        <p className="text-gray-600 text-sm mb-6">Create your store first to view orders.</p>
        <Link to="/store/create">
          <Button>Create Store</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-0.5">{restaurant.name}</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1 sm:gap-2">
        {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              statusFilter === value
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-xs',
                statusFilter === value ? 'bg-white/20' : 'bg-gray-200 text-gray-600'
              )}
            >
              {statusCounts[value]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {filteredOrders.length === 0 ? (
        <Card className="text-center py-16">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {statusFilter === 'all' ? 'No orders yet' : `No ${statusFilter.replace('_', ' ')} orders`}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {statusFilter === 'all'
              ? 'Orders will appear here when customers place them.'
              : 'Try another filter.'}
          </p>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto table-scroll">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Order
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Customer
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
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Payment
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Rider
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    updatingId={updatingId}
                    actionMenuOpen={actionMenuOpen}
                    setActionMenuOpen={setActionMenuOpen}
                    onStatusUpdate={handleStatusUpdate}
                    onCancel={handleCancel}
                    onAssignRider={handleAssignRider}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Assign Rider Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setAssigningOrderId(null);
        }}
        title={assigningOrderId ? `Assign rider · Order #${assigningOrderId}` : 'Assign rider'}
        size="md"
        footer={
          <Button
            variant="outline"
            onClick={() => {
              setShowAssignModal(false);
              setAssigningOrderId(null);
            }}
          >
            Cancel
          </Button>
        }
      >
        {isLoadingRiders ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : riders.length === 0 ? (
          <div className="text-center py-8">
            <UserPlus className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No riders available</p>
            <p className="text-sm text-gray-500 mt-1">
              Riders must be registered in the system before you can assign them.
            </p>
          </div>
        ) : (
          <ul className="space-y-2 max-h-[320px] overflow-y-auto">
            {riders.map((rider) => (
              <li key={rider.id}>
                <button
                  type="button"
                  onClick={() => handleRiderSelect(rider.id)}
                  disabled={updatingId !== null}
                  className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{rider.name}</p>
                    <p className="text-sm text-gray-600">{rider.phone}</p>
                    {rider.email && (
                      <p className="text-xs text-gray-500 truncate">{rider.email}</p>
                    )}
                  </div>
                  {rider.is_available === false && (
                    <Badge variant="warning" className="shrink-0">Unavailable</Badge>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
};

interface OrderRowProps {
  order: Order;
  updatingId: number | null;
  actionMenuOpen: number | null;
  setActionMenuOpen: (id: number | null) => void;
  onStatusUpdate: (orderId: number, status: OrderStatus) => void;
  onCancel: (orderId: number) => void;
  onAssignRider: (orderId: number) => void;
}

function OrderRow({
  order,
  updatingId,
  actionMenuOpen,
  setActionMenuOpen,
  onStatusUpdate,
  onCancel,
  onAssignRider,
}: OrderRowProps) {
  const statusConfig = ORDER_STATUSES[order.status];
  const nextTransitions = getNextStatusTransitions(order);
  const orderCanCancel = canCancelOrder(order);
  const hasRider = !!(order.rider_id ?? order.rider);
  const canAssignRider =
    order.status === 'preparing' &&
    !hasRider &&
    (order.payment_status ?? '').toLowerCase() === 'paid';
  const paymentKey = (order.payment_status ?? 'unpaid') as keyof typeof PAYMENT_STATUSES;
  const paymentConfig = PAYMENT_STATUSES[paymentKey] ?? PAYMENT_STATUSES.unpaid;
  const customer = order.user ?? (order as { customer?: { name?: string; phone?: string } }).customer;
  const rawItems = order.items ?? [];
  const itemCount = rawItems.reduce((s, i) => s + Number(i.quantity ?? 0), 0) || rawItems.length;
  const isUpdating = updatingId === order.id;
  const isMenuOpen = actionMenuOpen === order.id;
  const hasActions = nextTransitions.length > 0 || canAssignRider || orderCanCancel;

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="py-3 px-4">
        <Link
          to={`/store/orders/${order.id}`}
          className="font-semibold text-primary-600 hover:text-primary-700 hover:underline"
        >
          #{order.id}
        </Link>
        <div className="text-xs text-gray-500 mt-0.5">{itemCount} item(s)</div>
      </td>
      <td className="py-3 px-4">
        <div className="text-sm font-medium text-gray-900 truncate max-w-[140px]" title={customer?.name ?? undefined}>
          {customer?.name ?? '—'}
        </div>
        <div className="text-xs text-gray-500 truncate max-w-[140px]" title={customer?.phone ?? undefined}>
          {customer?.phone ?? '—'}
        </div>
      </td>
      <td className="py-3 px-4 whitespace-nowrap">
        <div className="text-sm text-gray-700">{formatDateShort(order.created_at)}</div>
        <div className="text-xs text-gray-500">{formatTime(order.created_at)}</div>
      </td>
      <td className="py-3 px-4 text-right whitespace-nowrap">
        <span className="font-medium text-gray-900">{formatCurrency(order.total ?? 0)}</span>
      </td>
      <td className="py-3 px-4">
        <Badge variant={statusConfig.color as BadgeVariant} className="text-xs whitespace-nowrap">
          {statusConfig.label}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <Badge variant={paymentConfig.color as BadgeVariant} className="text-xs whitespace-nowrap">
          {paymentConfig.label}
        </Badge>
      </td>
      <td className="py-3 px-4">
        {hasRider && order.rider ? (
          <div className="text-sm text-gray-700 truncate max-w-[120px]" title={order.rider.name}>
            {order.rider.name}
          </div>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        )}
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Link to={`/store/orders/${order.id}`} title="View details">
            <Button
              variant="outline"
              size="sm"
              className="p-2 border-gray-300 text-gray-600 hover:bg-gray-50"
              aria-label="View order"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {hasActions && (
            <div className="relative inline-block">
              <Button
                variant="outline"
                size="sm"
                className="p-2 border-gray-300 text-gray-600 hover:bg-gray-50"
                onClick={() => setActionMenuOpen(isMenuOpen ? null : order.id)}
                disabled={isUpdating}
                aria-label="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden
                    onClick={() => setActionMenuOpen(null)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {canAssignRider && (
                      <button
                        type="button"
                        onClick={() => onAssignRider(order.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <UserPlus className="h-4 w-4 text-gray-500" />
                        Assign rider
                      </button>
                    )}
                    {nextTransitions.map((next) => (
                      <button
                        key={next}
                        type="button"
                        onClick={() => onStatusUpdate(order.id, next)}
                        disabled={isUpdating}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        {next === 'on_the_way' && <Truck className="h-4 w-4 text-gray-500" />}
                        {next === 'delivered' && <CheckCircle className="h-4 w-4 text-gray-500" />}
                        {next === 'on_the_way' ? 'Mark on the way' : 'Mark delivered'}
                      </button>
                    ))}
                    {orderCanCancel && (
                      <button
                        type="button"
                        onClick={() => onCancel(order.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Cancel order
                      </button>
                    )}
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
