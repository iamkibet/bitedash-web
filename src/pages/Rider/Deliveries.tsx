import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { formatCurrency, formatDateShort, formatTime } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';
import { Truck, CheckCircle } from 'lucide-react';
import type { OrderStatus } from '../../types/order.types';

export const RiderDeliveries = () => {
  const { riderDeliveries, getRiderDeliveries, updateOrderStatus, isLoading } = useOrderStore();
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    getRiderDeliveries();
    const interval = setInterval(getRiderDeliveries, 15000);
    return () => clearInterval(interval);
  }, [getRiderDeliveries]);

  const handleStatusUpdate = async (orderId: number, status: OrderStatus) => {
    try {
      setUpdatingId(orderId);
      await updateOrderStatus(orderId, status);
      await getRiderDeliveries();
    } catch (error) {
      console.error('Failed to update delivery status', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const sortedDeliveries = [...riderDeliveries].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (isLoading && riderDeliveries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">My Deliveries</h1>
      <p className="text-gray-600 text-sm mb-6">
        Orders assigned to you. Mark as delivered when you complete the drop-off.
      </p>

      {riderDeliveries.length === 0 ? (
        <Card className="text-center py-12">
          <Truck className="h-12 w-12 text-gray-300 mx-auto mb-3" aria-hidden />
          <p className="text-gray-600 font-medium">No deliveries yet</p>
          <p className="text-sm text-gray-500 mt-1">
            <Link to="/rider/orders" className="text-primary-600 hover:underline">
              Accept orders
            </Link>
            {' '}from Available Orders to start delivering.
          </p>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Order
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Restaurant
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Delivery address
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Customer / Phone
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Items
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">
                    Total
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Date & time
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
                {sortedDeliveries.map((order) => {
                  const statusConfig = ORDER_STATUSES[order.status];
                  const itemCount = (order.items ?? []).length;
                  const canMarkDelivered = order.status === 'on_the_way';

                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-900">#{order.id}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-700">
                          {order.restaurant?.name ?? '—'}
                        </div>
                        {order.restaurant?.location && (
                          <div className="text-xs text-gray-500 truncate max-w-[140px]">
                            {order.restaurant.location}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-[200px]">
                        <span className="text-sm text-gray-700 line-clamp-2" title={order.delivery_address}>
                          {order.delivery_address}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-700">{order.user?.name ?? '—'}</div>
                        <a
                          href={order.user?.phone ? `tel:${order.user.phone}` : undefined}
                          className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          {order.user?.phone ?? '—'}
                        </a>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                        {itemCount} item{itemCount === 1 ? '' : 's'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-medium text-gray-900">
                        {formatCurrency(order.total ?? 0)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{formatDateShort(order.created_at)}</div>
                        <div className="text-xs text-gray-500">{formatTime(order.created_at)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={statusConfig?.color as 'success' | 'warning' | 'error' | 'info' | 'default'}
                          className="text-xs whitespace-nowrap"
                        >
                          {statusConfig?.icon} {statusConfig?.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canMarkDelivered && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(order.id, 'delivered')}
                            className="inline-flex items-center gap-1.5"
                            isLoading={updatingId === order.id}
                          >
                            <CheckCircle className="h-4 w-4" aria-hidden />
                            Mark delivered
                          </Button>
                        )}
                        {!canMarkDelivered && (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
