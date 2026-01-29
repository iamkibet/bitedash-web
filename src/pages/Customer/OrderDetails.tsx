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
  User,
  Star,
} from 'lucide-react';
import { MenuItemImage } from '../../components/common/MenuItemImage';
import { RatingForm } from '../../components/common/RatingForm';
import { ratingsApi, type Rating } from '../../api/ratings';
import { favoritesApi } from '../../api/favorites';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import { Heart } from 'lucide-react';
import type { OrderStatus } from '../../types/order.types';

export const OrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isStoreView = location.pathname.startsWith('/store/orders');
  const { currentOrder, fetchOrder, isLoading, cancelOrder, updateOrderStatus, getRestaurantOrdersAll } = useOrderStore();
  const { isAuthenticated, user } = useAuthStore();
  const [updating, setUpdating] = useState(false);
  const [ratings, setRatings] = useState<Record<number, Rating>>({});
  const [showRatingForm, setShowRatingForm] = useState<Record<number, boolean>>({});
  const [loadingRatings, setLoadingRatings] = useState<boolean>(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (id) {
      fetchOrder(Number(id));
    }
  }, [id]);

  useEffect(() => {
    if (currentOrder && !isStoreView) {
      fetchRatings();
      if (isAuthenticated) {
        fetchFavorites();
      }
    }
  }, [currentOrder, isStoreView, isAuthenticated, user?.id]);

  const fetchFavorites = async () => {
    try {
      const favorites = await favoritesApi.getAll();
      setFavoriteIds(new Set(favorites.map((f) => f.menu_item_id)));
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    }
  };

  const handleToggleFavorite = async (menuItemId: number) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to add favorites');
      return;
    }

    try {
      const isFavorite = favoriteIds.has(menuItemId);
      if (isFavorite) {
        await favoritesApi.remove(menuItemId);
        setFavoriteIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(menuItemId);
          return newSet;
        });
        toast.success('Removed from favorites');
      } else {
        await favoritesApi.add(menuItemId);
        setFavoriteIds((prev) => new Set(prev).add(menuItemId));
        toast.success('Added to favorites');
      }
    } catch (error: unknown) {
      console.error('Failed to toggle favorite:', error);
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || 'Failed to update favorite');
    }
  };

  const fetchRatings = async () => {
    if (!currentOrder?.items) return;
    try {
      setLoadingRatings(true);
      const ratingsMap: Record<number, Rating> = {};
      
      // Fetch ratings for each menu item in the order
      for (const item of currentOrder.items) {
        // Use menu_item.id if available, otherwise fall back to menu_item_id
        const menuItemId = item.menu_item?.id || item.menu_item_id;
        if (!menuItemId) {
          console.warn('Skipping rating fetch - no menu item ID found for order item:', item);
          continue;
        }
        
        try {
          const response = await ratingsApi.getByMenuItem(menuItemId);
          // Find user's rating if exists - use logged-in user's ID
          const userRating = response.data?.find((r) => r.user_id === user?.id);
          if (userRating) {
            ratingsMap[menuItemId] = userRating;
          }
        } catch (error) {
          // Ignore errors for individual items
          console.error(`Failed to fetch rating for item ${menuItemId}:`, error);
        }
      }
      
      setRatings(ratingsMap);
    } catch (error) {
      console.error('Failed to fetch ratings:', error);
    } finally {
      setLoadingRatings(false);
    }
  };

  const canRateItem = () => {
    if (isStoreView) return false;
    if (!currentOrder) return false;
    // Can rate if order is delivered and paid
    return (
      currentOrder.status === 'delivered' &&
      currentOrder.payment_status === 'paid'
    );
  };

  const handleRatingSubmitted = async () => {
    await fetchRatings();
    setShowRatingForm({});
  };

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

  type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

  return (
    <div className="space-y-6 pb-8">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(isStoreView ? '/store/orders' : '/orders')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {isStoreView ? 'Store orders' : 'My orders'}
      </button>

      {/* Order overview */}
      <Card className="border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Order #{currentOrder.id}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant={statusConfig.color as BadgeVariant} className="text-xs">
                {statusConfig.label}
              </Badge>
              {paymentConfig && (
                <Badge variant={paymentConfig.color as BadgeVariant} className="text-xs">
                  {paymentConfig.label}
                </Badge>
              )}
              <span className="text-sm text-gray-500">
                {formatDate(currentOrder.created_at)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isStoreView && nextTransitions.map((next) => (
              <Button
                key={next}
                size="sm"
                isLoading={updating}
                onClick={() => handleStatusUpdate(next)}
                className="inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                {next === 'on_the_way' && <Truck className="h-4 w-4 shrink-0" />}
                {next === 'delivered' && <CheckCircle className="h-4 w-4 shrink-0" />}
                <span>{next === 'on_the_way' ? 'On the way' : 'Delivered'}</span>
              </Button>
            ))}
            {canCancel && (
              <Button variant="danger" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Store, delivery, rider, customer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 mt-4 border-t border-gray-100">
          <div className="flex gap-3">
            <div className="p-2 rounded-lg bg-gray-50 shrink-0">
              <Store className="h-4 w-4 text-gray-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Store</p>
              <p className="font-medium text-gray-900 truncate">{currentOrder.restaurant?.name ?? '—'}</p>
              {currentOrder.restaurant?.location && (
                <p className="text-sm text-gray-500 truncate">{currentOrder.restaurant.location}</p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="p-2 rounded-lg bg-gray-50 shrink-0">
              <MapPin className="h-4 w-4 text-gray-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery</p>
              <p className="font-medium text-gray-900 break-words">{currentOrder.delivery_address}</p>
            </div>
          </div>
          {currentOrder.rider && (
            <div className="flex gap-3 sm:col-span-2">
              <div className="p-2 rounded-lg bg-primary-50 shrink-0">
                <Truck className="h-4 w-4 text-primary-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isStoreView ? 'Rider' : 'Delivery by'}
                </p>
                <p className="font-medium text-gray-900">{currentOrder.rider.name}</p>
                <p className="text-sm text-gray-500">{currentOrder.rider.phone}</p>
              </div>
            </div>
          )}
          {isStoreView && customer && (
            <div className="flex gap-3 sm:col-span-2">
              <div className="p-2 rounded-lg bg-gray-50 shrink-0">
                <User className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</p>
                <p className="font-medium text-gray-900">{customer.name}</p>
                <p className="text-sm text-gray-500">{customer.phone}</p>
              </div>
            </div>
          )}
        </div>

        {currentOrder.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-gray-700">{currentOrder.notes}</p>
          </div>
        )}
      </Card>

      {/* What's ordered */}
      <Card className="border border-gray-100">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-base font-semibold text-gray-900">Order items</h2>
          {!isStoreView && loadingRatings && (
            <span className="text-sm text-gray-500 inline-flex items-center gap-1.5">
              <Spinner size="sm" />
              Loading ratings…
            </span>
          )}
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
              // Use menu_item.id if available, otherwise fall back to menu_item_id
              const menuItemId = menuItem?.id || item.menu_item_id;
              const existingRating = menuItemId ? ratings[menuItemId] : undefined;
              const canRate = menuItemId ? canRateItem() : false;
              const showForm = menuItemId ? showRatingForm[menuItemId] : false;

              return (
                <div key={item.id} className="space-y-3">
                  <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-gray-50/80 border border-gray-100">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-lg overflow-hidden bg-white border border-gray-100">
                      <MenuItemImage src={menuItem?.image_url} alt={name} aspectRatio={1} />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 truncate">{name}</p>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(price)} × {qty}
                        </p>
                        {existingRating && (
                          <div className="flex items-center gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= existingRating.rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="text-xs text-gray-500 ml-1">Your rating</span>
                          </div>
                        )}
                        {!existingRating && canRate && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-primary-600 font-medium">Rate this item</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 sm:text-right">
                            {formatCurrency(lineTotal)}
                          </p>
                          {isAuthenticated && !isStoreView && menuItemId && (
                            <button
                              type="button"
                              onClick={() => handleToggleFavorite(menuItemId)}
                              className={`shrink-0 p-1.5 rounded-full transition-colors flex items-center justify-center ${
                                favoriteIds.has(menuItemId)
                                  ? 'text-red-500 hover:text-red-600'
                                  : 'text-gray-400 hover:text-red-500'
                              }`}
                              aria-label={
                                favoriteIds.has(menuItemId)
                                  ? 'Remove from favorites'
                                  : 'Add to favorites'
                              }
                            >
                              <Heart
                                className={`h-4 w-4 shrink-0 ${
                                  favoriteIds.has(menuItemId) ? 'fill-current' : ''
                                }`}
                              />
                            </button>
                          )}
                        </div>
                        {canRate && !showForm && menuItemId && (
                          <button
                            onClick={() =>
                              setShowRatingForm((prev) => ({
                                ...prev,
                                [menuItemId]: true,
                              }))
                            }
                            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                          >
                            <Star className="h-4 w-4" />
                            {existingRating ? 'Update Rating' : 'Rate Item'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rating Form */}
                  {canRate && showForm && menuItemId && (
                    <RatingForm
                      menuItemId={menuItemId}
                      menuItemName={name}
                      existingRating={existingRating}
                      onRatingSubmitted={handleRatingSubmitted}
                      onCancel={() =>
                        setShowRatingForm((prev) => ({
                          ...prev,
                          [menuItemId]: false,
                        }))
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-baseline justify-between sm:justify-start gap-3">
              <span className="text-base font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-primary-600">
                {formatCurrency(currentOrder.total ?? 0)}
              </span>
            </div>
            {!isStoreView && unpaid && (
              <Button
                onClick={() => navigate(`/orders/${currentOrder.id}/payment`)}
                className="w-full sm:w-auto inline-flex items-center gap-2 shrink-0 whitespace-nowrap"
              >
                <CreditCard className="h-4 w-4 shrink-0" />
                <span>Pay now</span>
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
