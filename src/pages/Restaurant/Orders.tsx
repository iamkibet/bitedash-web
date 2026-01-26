import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { Modal } from '../../components/common/Modal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../../utils/constants';
import { canCancelOrder, getNextStatusTransitions } from '../../utils/orderLifecycle';
import { Eye, Truck, CheckCircle, UserPlus } from 'lucide-react';
import { restaurantsApi } from '../../api/restaurants';
import { ridersApi, type Rider } from '../../api/riders';
import type { Restaurant } from '../../types/restaurant.types';
import type { OrderStatus } from '../../types/order.types';

export const RestaurantOrders = () => {
  const { orders, getRestaurantOrdersAll, updateOrderStatus, assignRider, cancelOrder, isLoading } = useOrderStore();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [isLoadingRiders, setIsLoadingRiders] = useState(false);
  const [assigningOrderId, setAssigningOrderId] = useState<number | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetchStoreAndOrders();
    fetchRiders();
  }, []);

  useEffect(() => {
    if (!restaurant) return;
    const interval = setInterval(() => getRestaurantOrdersAll(restaurant.id), 15000);
    return () => clearInterval(interval);
  }, [restaurant?.id, getRestaurantOrdersAll]);

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
    if (!window.confirm('Cancel this order?')) return;
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
      // Still close modal and refetch so UI reflects reality (assign may have succeeded despite 422)
      setShowAssignModal(false);
      setAssigningOrderId(null);
      await getRestaurantOrdersAll(restaurant.id);
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoadingStore || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">No store found</h2>
        <p className="text-gray-600 mb-6">Create your store first to view orders.</p>
        <Link to="/store/create">
          <Button>Create Store</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Store Orders</h1>
      <p className="text-gray-600 mb-6">
        Assign riders to preparing orders; status moves to on the way. Mark delivered when done.
      </p>

      {orders.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500 py-12">No orders yet</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusConfig = ORDER_STATUSES[order.status];
            const nextTransitions = getNextStatusTransitions(order);
            const canCancel = canCancelOrder(order);
            const hasRider = !!(order.rider_id ?? order.rider);
            const canAssignRider =
              order.status === 'preparing' &&
              !hasRider &&
              (order.payment_status ?? '').toLowerCase() === 'paid';
            const paymentKey = (order.payment_status ?? 'unpaid') as keyof typeof PAYMENT_STATUSES;
            const paymentConfig = PAYMENT_STATUSES[paymentKey] ?? PAYMENT_STATUSES.unpaid;

            return (
              <Card key={order.id} className="overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">Order #{order.id}</h3>
                      <Badge variant={statusConfig.color as any}>
                        {statusConfig.icon} {statusConfig.label}
                      </Badge>
                      <Badge variant={paymentConfig.color as any}>{paymentConfig.label}</Badge>
                      {hasRider && (
                        <Badge variant="info">
                          {order.rider ? `Picked up by ${order.rider.name}` : 'Rider assigned'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      Customer: {order.user?.name ?? '—'} • {order.user?.phone ?? '—'}
                    </p>
                    <p className="text-sm text-gray-500 mb-1">
                      {formatDate(order.created_at)} • {formatCurrency(order.total ?? 0)}
                    </p>
                    <p className="text-sm text-gray-600">Delivery: {order.delivery_address}</p>
                    {hasRider && order.rider && (
                      <p className="text-sm text-primary-600 font-medium mt-1">
                        Rider: {order.rider.name} • {order.rider.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
                    <Link to={`/store/orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                    </Link>
                    {canAssignRider && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssignRider(order.id)}
                        className="gap-1.5"
                      >
                        <UserPlus className="h-4 w-4" />
                        Assign Rider
                      </Button>
                    )}
                    {nextTransitions.map((next) => (
                      <Button
                        key={next}
                        size="sm"
                        isLoading={updatingId === order.id}
                        onClick={() => handleStatusUpdate(order.id, next)}
                        className="gap-1.5"
                      >
                        {next === 'on_the_way' && <Truck className="h-4 w-4" />}
                        {next === 'delivered' && <CheckCircle className="h-4 w-4" />}
                        {next === 'on_the_way' ? 'Mark On the Way' : 'Mark Delivered'}
                      </Button>
                    ))}
                    {canCancel && (
                      <Button
                        variant="danger"
                        size="sm"
                        isLoading={updatingId === order.id}
                        onClick={() => handleCancel(order.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assign Rider Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setAssigningOrderId(null);
        }}
        title="Assign Rider to Order"
        size="md"
      >
        {isLoadingRiders ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : riders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">No riders available</p>
            <p className="text-sm text-gray-400">
              Riders need to be registered in the system first.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {riders.map((rider) => (
              <button
                key={rider.id}
                onClick={() => handleRiderSelect(rider.id)}
                disabled={updatingId !== null}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{rider.name}</p>
                    <p className="text-sm text-gray-600">{rider.phone}</p>
                    {rider.email && (
                      <p className="text-xs text-gray-500">{rider.email}</p>
                    )}
                  </div>
                  {rider.is_available === false && (
                    <Badge variant="warning">Unavailable</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowAssignModal(false);
              setAssigningOrderId(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
};
