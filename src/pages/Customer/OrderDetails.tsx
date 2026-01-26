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
import { ArrowLeft, CreditCard, Truck, CheckCircle } from 'lucide-react';
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

  return (
    <div className="max-w-3xl mx-auto">
      <Button
        variant="outline"
        onClick={() => navigate(isStoreView ? '/store/orders' : '/orders')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {isStoreView ? 'Back to Store Orders' : 'Back to Orders'}
      </Button>

      {/* Pay Now CTA - customer only, when unpaid */}
      {!isStoreView && unpaid && (
        <Card className="mb-6 border-2 border-primary-300 bg-gradient-to-br from-primary-50 to-white">
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

      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Order #{currentOrder.id}
            </h1>
            <Badge variant={statusConfig.color as any} className="text-base">
              {statusConfig.icon} {statusConfig.label}
            </Badge>
            {paymentConfig && (
              <Badge variant={paymentConfig.color as any}>
                {paymentConfig.label}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isStoreView && unpaid && (
              <Button
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Store</p>
            <p className="font-semibold">{currentOrder.restaurant?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Order Date</p>
            <p className="font-semibold">{formatDate(currentOrder.created_at)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Delivery Address</p>
            <p className="font-semibold">{currentOrder.delivery_address}</p>
          </div>
          {currentOrder.rider && (
            <div>
              <p className="text-sm text-gray-600">
                {isStoreView ? 'Picked up by' : 'Rider'}
              </p>
              <p className="font-semibold">{currentOrder.rider.name}</p>
              <p className="text-sm text-gray-500">{currentOrder.rider.phone}</p>
            </div>
          )}
        </div>

        {currentOrder.notes && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">Notes</p>
            <p className="font-semibold">{currentOrder.notes}</p>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Items</h2>
        <div className="space-y-3">
          {(currentOrder.items ?? []).length === 0 ? (
            <p className="text-center text-gray-500 py-4">No items found in this order.</p>
          ) : (
            (currentOrder.items ?? []).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-16 shrink-0">
                  <MenuItemImage
                    src={item.menu_item.image_url}
                    alt={item.menu_item.name}
                    aspectRatio={1}
                  />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{item.menu_item.name}</p>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(item.price)} × {item.quantity}
                  </p>
                </div>
              </div>
              <p className="font-semibold text-gray-900">
                {formatCurrency(item.price * item.quantity)}
              </p>
            </div>
            ))
          )}
        </div>
        <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex justify-between items-center">
            <span className="text-xl font-semibold text-gray-900">Total</span>
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
