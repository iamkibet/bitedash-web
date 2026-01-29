import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { formatCurrency, formatDateShort, formatTime } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';
import { isUnpaid, canCancelOrder } from '../../utils/orderLifecycle';
import { Button } from '../../components/common/Button';
import { Eye, CreditCard, MoreVertical, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

export const Orders = () => {
  const navigate = useNavigate();
  const { orders, fetchOrders, isLoading, cancelOrder } = useOrderStore();
  const [openActionId, setOpenActionId] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCancel = async (orderId: number) => {
    setOpenActionId(null);
    const order = orders.find((o) => o.id === orderId);
    if (!order || !canCancelOrder(order)) return;
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    await cancelOrder(orderId);
    fetchOrders();
  };

  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">My Orders</h1>

      {orders.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-600 font-medium">You haven&apos;t placed any orders yet.</p>
          <p className="text-sm text-gray-500 mt-1 mb-4">Browse stores and place your first order.</p>
          <Link to="/stores">
            <Button variant="outline" className="inline-flex items-center justify-center gap-2">
              Browse stores
            </Button>
          </Link>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto table-scroll">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Order
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Restaurant
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
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedOrders.map((order) => {
                  const statusConfig = ORDER_STATUSES[order.status];
                  const unpaid = isUnpaid(order);
                  const showCancel = canCancelOrder(order);

                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          to={`/orders/${order.id}`}
                          className="font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          #{order.id}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 truncate max-w-[160px]">
                        {order.restaurant?.name ?? '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{formatDateShort(order.created_at)}</div>
                        <div className="text-xs text-gray-500">{formatTime(order.created_at)}</div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-medium text-gray-900">
                        {formatCurrency(order.total ?? 0)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={statusConfig.color as BadgeVariant} className="text-xs whitespace-nowrap">
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {unpaid ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Unpaid
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Paid
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {unpaid && (
                            <Button
                              size="sm"
                              className="inline-flex items-center gap-1.5 shrink-0 bg-primary-600 hover:bg-primary-700 text-white whitespace-nowrap"
                              onClick={() => navigate(`/orders/${order.id}/payment`)}
                            >
                              <CreditCard className="h-4 w-4 shrink-0" />
                              <span>Pay</span>
                            </Button>
                          )}
                          <Link to={`/orders/${order.id}`} title="View order">
                            <Button
                              variant="outline"
                              size="sm"
                              className="p-2 border-gray-300 text-gray-600 hover:bg-gray-50"
                              aria-label="View order"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {showCancel && (
                            <div className="relative inline-block">
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "p-2 border-gray-300 text-gray-600 hover:bg-gray-50",
                                  openActionId === order.id && "bg-gray-100"
                                )}
                                aria-label="More actions"
                                onClick={() => setOpenActionId(openActionId === order.id ? null : order.id)}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                              {openActionId === order.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    aria-hidden
                                    onClick={() => setOpenActionId(null)}
                                  />
                                  <div className="absolute right-0 mt-1 py-1 bg-white rounded-lg border border-gray-200 shadow-lg z-20 min-w-[140px]">
                                    <button
                                      type="button"
                                      onClick={() => handleCancel(order.id)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                      <XCircle className="h-4 w-4" />
                                      Cancel order
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
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
