import { useEffect, useState } from 'react';
import { useOrderStore } from '../../store/orderStore';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';
import { MapPin, Package, CheckCircle } from 'lucide-react';

export const RiderOrders = () => {
  const { orders, getAvailableOrders, acceptOrder, getRiderDeliveries, isLoading } = useOrderStore();
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  useEffect(() => {
    getAvailableOrders();
    const interval = setInterval(getAvailableOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (orderId: number) => {
    try {
      setAcceptingId(orderId);
      await acceptOrder(orderId);
      await getAvailableOrders();
      await getRiderDeliveries();
    } catch (error) {
      console.error('Failed to accept order:', error);
    } finally {
      setAcceptingId(null);
    }
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Orders</h1>
      <p className="text-gray-600 mb-6">
        Unassigned, paid orders. Self-accept to assign yourself — status moves to on the way.
      </p>

      {orders.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No available orders at the moment</p>
            <p className="text-sm text-gray-400 mt-1">New orders appear here after customers pay</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orders.map((order) => {
            const statusConfig = ORDER_STATUSES[order.status];
            const itemCount = (order.items ?? []).length;
            return (
              <Card key={order.id} className="flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold text-gray-900">Order #{order.id}</h3>
                    <Badge variant={statusConfig.color as any}>
                      {statusConfig.icon} {statusConfig.label}
                    </Badge>
                    <Badge variant="success">
                      <CheckCircle className="h-3.5 w-3 inline mr-1" />
                      Paid
                    </Badge>
                  </div>
                  <p className="text-xl font-bold text-primary-600">
                    {formatCurrency(order.total ?? 0)}
                  </p>
                </div>

                <div className="space-y-3 mb-5 flex-1">
                  <div className="flex items-start gap-2">
                    <Package className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.restaurant?.name}</p>
                      <p className="text-sm text-gray-600">{order.restaurant?.location}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Delivery address</p>
                      <p className="text-sm text-gray-600">{order.delivery_address}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {itemCount} item(s) • {formatDate(order.created_at)}
                  </p>
                </div>

                <Button
                  onClick={() => handleAccept(order.id)}
                  className="w-full gap-2"
                  isLoading={acceptingId === order.id}
                >
                  <CheckCircle className="h-4 w-4" />
                  Accept Order
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
