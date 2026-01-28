import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';
import { isUnpaid, canCancelOrder } from '../../utils/orderLifecycle';
import { Button } from '../../components/common/Button';
import { Eye, CreditCard, Star } from 'lucide-react';
import { ratingsApi, type Rating } from '../../api/ratings';
import { useAuthStore } from '../../store/authStore';

export const Orders = () => {
  const navigate = useNavigate();
  const { orders, fetchOrders, isLoading, cancelOrder } = useOrderStore();
  const { user } = useAuthStore();
  const [ratingsByOrder, setRatingsByOrder] = useState<Record<number, Rating[]>>({});

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Fetch ratings for all orders
  useEffect(() => {
    if (!user?.id || orders.length === 0) return;

    const fetchAllRatings = async () => {
      const ratingsMap: Record<number, Rating[]> = {};

      for (const order of orders) {
        if (!order.items) continue;
        
        const orderRatings: Rating[] = [];
        for (const item of order.items) {
          const menuItemId = item.menu_item?.id || item.menu_item_id;
          if (!menuItemId) continue;

          try {
            const response = await ratingsApi.getByMenuItem(menuItemId);
            const userRating = response.data?.find((r) => r.user_id === user.id);
            if (userRating) {
              orderRatings.push(userRating);
            }
          } catch (error) {
            // Ignore errors
          }
        }
        
        if (orderRatings.length > 0) {
          ratingsMap[order.id] = orderRatings;
        }
      }

      setRatingsByOrder(ratingsMap);
    };

    void fetchAllRatings();
  }, [orders, user?.id]);

  const handleCancel = async (orderId: number) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || !canCancelOrder(order)) return;
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    await cancelOrder(orderId);
    fetchOrders();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Orders</h1>

      {orders.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500 py-8">You haven't placed any orders yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusConfig = ORDER_STATUSES[order.status];
            const unpaid = isUnpaid(order);
            const showCancel = canCancelOrder(order);
            return (
              <div key={order.id} className="space-y-0">
                {/* Pay Now CTA - separate block above order card when unpaid */}
                {unpaid && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-t-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 shrink-0" />
                      <span className="font-semibold">Payment required • Order #{order.id}</span>
                      <span className="text-primary-100 text-sm hidden sm:inline">({formatCurrency(order.total ?? 0)})</span>
                    </div>
                    <Button
                      onClick={() => navigate(`/orders/${order.id}/payment`)}
                      className="w-full sm:w-auto gap-2 bg-white text-primary-700 hover:bg-primary-50 font-semibold shrink-0"
                    >
                      <CreditCard className="h-4 w-4" />
                      Pay Now
                    </Button>
                  </div>
                )}
                <Card
                  className={unpaid ? 'rounded-t-none ring-2 ring-primary-400 ring-t-0 bg-primary-50/30 border-primary-200 border-t-0' : ''}
                >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.id}
                      </h3>
                      <Badge variant={statusConfig.color as 'success' | 'error' | 'warning' | 'info' | 'default'}>
                        {statusConfig.icon} {statusConfig.label}
                      </Badge>
                      {unpaid && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Unpaid
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {order.restaurant?.name || 'Restaurant'}
                    </p>
                    <p className="text-sm text-gray-500 mb-2">
                      {formatDate(order.created_at)}
                    </p>
                    {ratingsByOrder[order.id] && ratingsByOrder[order.id].length > 0 && (
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="h-3.5 w-3.5 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-600">
                          {ratingsByOrder[order.id].length} item{ratingsByOrder[order.id].length !== 1 ? 's' : ''} rated
                        </span>
                      </div>
                    )}
                    <p className="text-lg font-semibold text-gray-900">
                      Total: {formatCurrency(order.total ?? 0)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-shrink-0">
                    {unpaid && (
                      <Button
                        onClick={() => navigate(`/orders/${order.id}/payment`)}
                        size="sm"
                        className="w-full sm:w-auto gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold order-first sm:order-none"
                      >
                        <CreditCard className="h-4 w-4" />
                        Pay Now
                      </Button>
                    )}
                    <Link to={`/orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="w-full sm:w-auto gap-2">
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                    </Link>
                    {showCancel && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleCancel(order.id)}
                        className="w-full sm:w-auto"
                      >
                        Cancel Order
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
