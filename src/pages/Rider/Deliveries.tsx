import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';
import { getNextStatusTransitions } from '../../utils/orderLifecycle';
import { MapPin, Package, Truck, CheckCircle } from 'lucide-react';
import type { OrderStatus } from '../../types/order.types';

export const RiderDeliveries = () => {
  const { riderDeliveries, getRiderDeliveries, updateOrderStatus, isLoading } = useOrderStore();
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    getRiderDeliveries();
    const interval = setInterval(getRiderDeliveries, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusUpdate = async (orderId: number, status: OrderStatus) => {
    try {
      setUpdatingId(orderId);
      await updateOrderStatus(orderId, status);
      await getRiderDeliveries();
    } catch (error) {
      console.error('Failed to update delivery status:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading && riderDeliveries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">My Deliveries</h1>
      <p className="text-gray-600 mb-6">
        Orders assigned to you (on the way). Mark delivered when you complete the drop-off.
      </p>

      {riderDeliveries.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Truck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No deliveries yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Accept orders from <Link to="/rider/orders" className="text-primary-600 hover:underline">Available Orders</Link> to start delivering
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {riderDeliveries.map((order) => {
            const statusConfig = ORDER_STATUSES[order.status];
            const nextTransitions = getNextStatusTransitions(order);
            const itemCount = (order.items ?? []).length;

            return (
              <Card key={order.id} className="overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">Order #{order.id}</h3>
                      <Badge variant={statusConfig.color as any}>
                        {statusConfig.icon} {statusConfig.label}
                      </Badge>
                    </div>
                    <div className="flex items-start gap-2 mb-1">
                      <Package className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-gray-600">
                        {order.restaurant?.name} • {order.restaurant?.location}
                      </p>
                    </div>
                    <div className="flex items-start gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-gray-600">{order.delivery_address}</p>
                    </div>
                    <p className="text-sm text-gray-500">
                      {itemCount} item(s) • {formatCurrency(order.total ?? 0)} • {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
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
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
