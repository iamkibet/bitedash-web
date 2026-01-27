import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../../utils/constants';
import { isUnpaid, canCancelOrder, getNextStatusTransitions } from '../../utils/orderLifecycle';
import { Button } from '../../components/common/Button';
import {
  ArrowLeft,
  CreditCard,
  Truck,
  CheckCircle,
  Store,
  MapPin,
  Clock,
  User,
  Package,
} from 'lucide-react';
import { MenuItemImage } from '../../components/common/MenuItemImage';
import type { OrderStatus } from '../../types/order.types';

export const OrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isStoreView = location.pathname.startsWith('/store/orders');
  const { currentOrder, fetchOrder, isLoading, cancelOrder, updateOrderStatus, getRestaurantOrdersAll } = useOrderStore();
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) fetchOrder(Number(id));
  }, [id]);

  const handleCancel = async () => {
    if (!currentOrder || !canCancelOrder(currentOrder)) return;
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    await cancelOrder(currentOrder.id);
    navigate(isStoreView ? '/store/orders' : '/orders');
  };

  const handleStatusUpdate = async (status: OrderStatus) => {
    if (!currentOrder || updating) return;
    try {
      setUpdating(true);
      await updateOrderStatus(currentOrder.id, status);
      await fetchOrder(Number(id));
      if (isStoreView && currentOrder.restaurant_id)
        await getRestaurantOrdersAll(currentOrder.restaurant_id);
    } finally {
      setUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentOrder) {
    return (
      <div>
        <p className="text-center text-gray-500 py-8">Order not found.</p>
      </div>
    );
  }

  const statusConfig = ORDER_STATUSES[currentOrder.status];
  const unpaid = isUnpaid(currentOrder);
  const canCancel = canCancelOrder(currentOrder);
  const nextTransitions = getNextStatusTransitions(currentOrder);
  const paymentConfig = currentOrder.payment_status
    ? PAYMENT_STATUSES[currentOrder.payment_status as keyof typeof PAYMENT_STATUSES]
    : null;

  const orderItems = currentOrder.items ?? [];
  const customer = currentOrder.user ?? (currentOrder as { customer?: { name?: string; phone?: string } }).customer;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back nav */}
      <Button
        variant="outline"
        onClick={() => navigate(isStoreView ? '/store/orders' : '/orders')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {isStoreView ? 'Back to Store Orders' : 'Back to Orders'}
      </Button>

      {/* Pay Now CTA - customer only, when unpaid */}
      {!isStoreView && unpaid && (
        <Card className="border-2 border-primary-300 bg-gradient-to-br from-primary-50 to-white" padding="lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Payment required</h2>
              <p className="text-gray-600 text-sm">
                Complete payment for Order #{currentOrder.id} ({formatCurrency(currentOrder.total ?? 0)}) to confirm your order.
              </p>
            </div>
            <Button
              onClick={() => navigate(`/orders/${currentOrder.id}/payment`)}
              className="gap-2 w-full sm:w-auto shrink-0 bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all py-3 px-6"
            >
              <CreditCard className="h-5 w-5" />
              Pay Now
            </Button>
          </div>
        </Card>
      )}

      {/* Order header */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Order #{currentOrder.id}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusConfig.color as 'success' | 'warning' | 'error' | 'info' | 'default'}>
                {statusConfig.icon} {statusConfig.label}
              </Badge>
              {paymentConfig && (
                <Badge variant={paymentConfig.color as 'success' | 'warning' | 'error' | 'info' | 'default'}>
                  {paymentConfig.label}
                </Badge>
              )}
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                {formatDate(currentOrder.created_at)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {!isStoreView && unpaid && (
              <Button
                size="sm"
                onClick={() => navigate(`/orders/${currentOrder.id}/payment`)}
                className="gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Pay Now
              </Button>
            )}
            {isStoreView && nextTransitions.map((next) => (
              <Button
                key={next}
                size="sm"
                isLoading={updating}
                onClick={() => handleStatusUpdate(next)}
                className="gap-1.5"
              >
                {next === 'on_the_way' && <Truck className="h-4 w-4" />}
                {next === 'delivered' && <CheckCircle className="h-4 w-4" />}
                {next === 'on_the_way' ? 'Mark On the Way' : 'Mark Delivered'}
              </Button>
            ))}
            {canCancel && (
              <Button variant="danger" size="sm" onClick={handleCancel}>
                Cancel Order
              </Button>
            )}
          </div>
        </div>

        {/* Summary grid: Store, Delivery, Rider, Customer (store view) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div className="flex gap-3">
            <div className="p-2 h-fit rounded-lg bg-gray-100">
              <Store className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Store</p>
              <p className="font-semibold text-gray-900">{currentOrder.restaurant?.name ?? '—'}</p>
              {currentOrder.restaurant?.location && (
                <p className="text-sm text-gray-500">{currentOrder.restaurant.location}</p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="p-2 h-fit rounded-lg bg-gray-100">
              <MapPin className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Delivery address</p>
              <p className="font-semibold text-gray-900">{currentOrder.delivery_address}</p>
            </div>
          </div>
          {currentOrder.rider && (
            <div className="flex gap-3 sm:col-span-2">
              <div className="p-2 h-fit rounded-lg bg-blue-50">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {isStoreView ? 'Picked up by' : 'Rider'}
                </p>
                <p className="font-semibold text-gray-900">{currentOrder.rider.name}</p>
                <p className="text-sm text-gray-500">{currentOrder.rider.phone}</p>
              </div>
            </div>
          )}
          {isStoreView && customer && (
            <div className="flex gap-3 sm:col-span-2">
              <div className="p-2 h-fit rounded-lg bg-gray-100">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</p>
                <p className="font-semibold text-gray-900">{customer.name}</p>
                <p className="text-sm text-gray-500">{customer.phone}</p>
              </div>
            </div>
          )}
        </div>

        {currentOrder.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-gray-700">{currentOrder.notes}</p>
          </div>
        )}
      </Card>

      {/* What's ordered – prominent section */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">What&apos;s ordered</h2>
        </div>
        {orderItems.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No items in this order.</p>
        ) : (
          <div className="space-y-4">
            {orderItems.map((item) => {
              const menuItem = item.menu_item;
              const name = menuItem?.name ?? 'Unknown item';
              const price = Number(item.price ?? 0);
              const qty = Number(item.quantity ?? 0);
              const lineTotal = Number((item as { subtotal?: number }).subtotal ?? price * qty);
              return (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="w-20 sm:w-24 shrink-0 rounded-lg overflow-hidden bg-white border border-gray-200">
                    <MenuItemImage src={menuItem?.image_url} alt={name} aspectRatio={1} />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{name}</p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(price)} × {qty}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900 sm:text-right">
                      {formatCurrency(lineTotal)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-baseline justify-between sm:justify-start gap-4">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-primary-600">
              {formatCurrency(currentOrder.total ?? 0)}
            </span>
          </div>
          {!isStoreView && unpaid && (
            <Button
              onClick={() => navigate(`/orders/${currentOrder.id}/payment`)}
              className="w-full sm:w-auto gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Pay Now
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
