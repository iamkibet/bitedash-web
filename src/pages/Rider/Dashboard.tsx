import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useOrderStore } from '../../store/orderStore';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';
import { getNextStatusTransitions } from '../../utils/orderLifecycle';
import {
  Truck,
  Package,
  MapPin,
  ArrowRight,
  CheckCircle,
  Zap,
  Clock,
} from 'lucide-react';
import type { OrderStatus } from '../../types/order.types';

export const RiderDashboard = () => {
  const { user } = useAuthStore();
  const {
    riderDeliveries,
    orders: availableOrders,
    getRiderDeliveries,
    getAvailableOrders,
    updateOrderStatus,
    acceptOrder,
    isLoading: storeLoading,
  } = useOrderStore();
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingDeliveries(true);
      try {
        await Promise.all([getRiderDeliveries(), getAvailableOrders()]);
      } catch (error) {
        if (!cancelled) console.error('Failed to load rider dashboard', error);
      } finally {
        if (!cancelled) setLoadingDeliveries(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [getRiderDeliveries, getAvailableOrders]);

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

  const handleAccept = async (orderId: number) => {
    try {
      setAcceptingId(orderId);
      await acceptOrder(orderId);
      await getAvailableOrders();
      await getRiderDeliveries();
    } catch (error) {
      console.error('Failed to accept order', error);
    } finally {
      setAcceptingId(null);
    }
  };

  const deliveriesCount = riderDeliveries.length;
  const availableCount = availableOrders.length;
  const previewAvailable = availableOrders.slice(0, 3);
  const allDeliveries = riderDeliveries;
  const displayedDeliveries = riderDeliveries.slice(0, 5);
  const showAllDeliveriesLink = riderDeliveries.length > 5;

  if (storeLoading && deliveriesCount === 0 && availableCount === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            {user?.name ? `Hi, ${user.name}` : 'Rider Dashboard'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Pick up available deliveries, then mark them delivered when done.
          </p>
        </div>
      </div>

      {/* Stats — Available first, then Your deliveries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <Card
          className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-5 sm:p-6"
          padding="none"
        >
          <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full bg-white/10 translate-y-1/2 translate-x-1/2" aria-hidden />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Package className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-emerald-100 text-sm font-medium">Available deliveries</p>
              <p className="text-2xl sm:text-3xl font-bold mt-0.5">{availableCount}</p>
              <Link
                to="/rider/orders"
                className="inline-flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white mt-2"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </Card>
        <Card
          className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-primary-500 to-primary-600 text-white p-5 sm:p-6"
          padding="none"
        >
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" aria-hidden />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Truck className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-primary-100 text-sm font-medium">Your deliveries</p>
              <p className="text-2xl sm:text-3xl font-bold mt-0.5">{deliveriesCount}</p>
              <Link
                to="/rider/deliveries"
                className="inline-flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white mt-2"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </Card>
        <Card
          className="border border-gray-200/80 rounded-xl shadow-sm bg-white p-5 sm:p-6 flex items-center gap-4"
          padding="none"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Zap className="h-6 w-6 text-amber-600" aria-hidden />
          </div>
          <div>
            <p className="text-gray-600 text-sm font-medium">Ready to earn</p>
            <p className="text-gray-900 font-semibold mt-0.5">
              {availableCount > 0 ? `${availableCount} waiting` : 'No new orders yet'}
            </p>
            <Link
              to="/rider/orders"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 mt-2"
            >
              Refresh
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </Card>
      </div>

      {/* 1. Available deliveries — on top */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-600" aria-hidden />
            Available deliveries
          </h2>
          {availableCount > 0 && (
            <Link
              to="/rider/orders"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              View all ({availableCount})
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          )}
        </div>

        {loadingDeliveries ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : previewAvailable.length === 0 ? (
          <Card className="border border-gray-200/80 rounded-xl overflow-hidden">
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Package className="h-7 w-7 text-gray-400" aria-hidden />
              </div>
              <p className="text-gray-700 font-medium">No available deliveries right now</p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                New paid orders will appear here. Check back soon or refresh the page.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {previewAvailable.map((order) => {
              const itemCount = (order.items ?? []).length;
              return (
                <Card
                  key={order.id}
                  className="p-4 sm:p-5 border border-gray-200/80 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col"
                  padding="none"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="font-semibold text-gray-900">Order #{order.id}</span>
                    <span className="text-lg font-bold text-primary-600 shrink-0">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 flex-1">
                    <div className="flex items-start gap-2">
                      <Package className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" aria-hidden />
                      <span>{order.restaurant?.name} • {itemCount} item(s)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" aria-hidden />
                      <span className="line-clamp-2">{order.delivery_address}</span>
                    </div>
                    <p className="text-gray-500">{formatDate(order.created_at)}</p>
                  </div>
                  <Button
                    className="w-auto min-w-[140px] mt-4 inline-flex items-center justify-center gap-2"
                    onClick={() => handleAccept(order.id)}
                    isLoading={acceptingId === order.id}
                  >
                    <CheckCircle className="h-4 w-4" aria-hidden />
                    Accept delivery
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. All deliveries — below available */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary-600" aria-hidden />
            All deliveries
          </h2>
          {showAllDeliveriesLink && (
            <Link
              to="/rider/deliveries"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              View all
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          )}
        </div>

        {loadingDeliveries ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : allDeliveries.length === 0 ? (
          <Card className="border border-gray-200/80 rounded-xl overflow-hidden">
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Truck className="h-7 w-7 text-gray-400" aria-hidden />
              </div>
              <p className="text-gray-700 font-medium">No deliveries yet</p>
              <p className="text-sm text-gray-500 mt-1 mb-5 max-w-sm mx-auto">
                Accept a delivery from Available deliveries above. It will show here once assigned to you.
              </p>
              <Link to="/rider/orders">
                <Button variant="primary" className="inline-flex items-center gap-2">
                  <Package className="h-4 w-4" aria-hidden />
                  Find deliveries
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <ul className="space-y-4 list-none p-0 m-0">
            {displayedDeliveries.map((order) => {
              const statusConfig = ORDER_STATUSES[order.status];
              const nextTransitions = getNextStatusTransitions(order);
              const itemCount = (order.items ?? []).length;
              return (
                <li key={order.id}>
                  <Card className="p-4 sm:p-5 border border-gray-200/80 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-900">Order #{order.id}</span>
                          <Badge variant={statusConfig?.color as 'success' | 'warning' | 'error' | 'info' | 'default'}>
                            {statusConfig?.icon} {statusConfig?.label}
                          </Badge>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-600 mb-1">
                          <Package className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" aria-hidden />
                          <span>{order.restaurant?.name} • {itemCount} item(s)</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-600 mb-1">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" aria-hidden />
                          <span>{order.delivery_address}</span>
                        </div>
                        <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                          <Clock className="h-3.5 w-3.5" aria-hidden />
                          {formatCurrency(order.total)} • {formatDate(order.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                        {nextTransitions.map((next) => (
                          <Button
                            key={next}
                            size="sm"
                            isLoading={updatingId === order.id}
                            onClick={() => handleStatusUpdate(order.id, next)}
                            className="inline-flex items-center gap-1.5"
                          >
                            {next === 'on_the_way' && <Truck className="h-4 w-4" aria-hidden />}
                            {next === 'delivered' && <CheckCircle className="h-4 w-4" aria-hidden />}
                            {next === 'on_the_way' ? 'On the way' : 'Mark delivered'}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
