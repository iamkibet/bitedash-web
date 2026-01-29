import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { useOrderStore } from '../../store/orderStore';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Minus, Trash2, ShoppingBag, ChevronRight, MapPin } from 'lucide-react';
import { MenuItemImage } from '../../components/common/MenuItemImage';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';

const orderSchema = z.object({
  delivery_address: z.string().min(1, 'Delivery address is required').max(500),
  notes: z.string().max(1000).optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

export const Cart = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const {
    items,
    restaurantId,
    removeItem,
    updateQuantity,
    clearCart,
    getTotal,
  } = useCartStore();
  const { createOrder, isLoading } = useOrderStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
  });

  const onSubmit = async (data: OrderFormData) => {
    if (!restaurantId || items.length === 0) return;
    if (!isAuthenticated) {
      toast.error('Please sign in to place an order');
      navigate('/login', { state: { returnTo: '/cart' } });
      return;
    }
    try {
      setIsSubmitting(true);
      const order = await createOrder({
        restaurant_id: restaurantId,
        items: items.map((item) => ({
          menu_item_id: item.menu_item.id,
          quantity: item.quantity,
        })),
        delivery_address: data.delivery_address,
        notes: data.notes,
      });
      clearCart();
      navigate(`/orders/${order.id}/payment`);
    } catch {
      // Error handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = getTotal();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <Card className="text-center py-12 max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-sm text-gray-500 mb-6">Add items from a store to get started.</p>
          <Button onClick={() => navigate('/stores')} className="inline-flex items-center gap-2">
            Browse stores
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Cart</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
            {restaurantId && (
              <>
                {' · '}
                <Link
                  to={`/stores/${restaurantId}/menu`}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  View menu
                </Link>
              </>
            )}
          </p>
        </div>
        {restaurantId && (
          <Link to={`/stores/${restaurantId}/menu`} className="shrink-0">
            <Button variant="outline" size="sm" className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add more items
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          {items.map((item) => {
            const unitPrice = item.menu_item.price;
            const lineTotal = unitPrice * item.quantity;
            return (
              <Card
                key={item.menu_item.id}
                padding="none"
                className="overflow-hidden border border-gray-100"
              >
                <div className="flex gap-3 sm:gap-4 p-3 sm:p-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    <MenuItemImage
                      src={item.menu_item.image_url}
                      alt={item.menu_item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {item.menu_item.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {formatCurrency(unitPrice)} each
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      {/* Quantity */}
                      <div className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.menu_item.id, item.quantity - 1)}
                          className="p-2 sm:p-2.5 hover:bg-gray-100 rounded-l-lg transition-colors touch-manipulation"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4 text-gray-600" />
                        </button>
                        <span className="min-w-[2rem] sm:min-w-[2.5rem] text-center text-sm font-medium text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.menu_item.id, item.quantity + 1)}
                          className="p-2 sm:p-2.5 hover:bg-gray-100 rounded-r-lg transition-colors touch-manipulation"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 whitespace-nowrap">
                          {formatCurrency(lineTotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.menu_item.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-manipulation"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Order summary & checkout */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4">
            <Card className="border border-gray-100">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Order summary</h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="delivery_address" className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      id="delivery_address"
                      {...register('delivery_address')}
                      placeholder="Street, area, landmark"
                      className={cn(
                        'w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors',
                        errors.delivery_address ? 'border-red-500' : 'border-gray-200'
                      )}
                    />
                  </div>
                  {errors.delivery_address && (
                    <p className="mt-1 text-sm text-red-600">{errors.delivery_address.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="notes"
                    {...register('notes')}
                    placeholder="Dietary requests, delivery instructions…"
                    rows={2}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors resize-none"
                  />
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-base font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-primary-600">
                      {formatCurrency(total)}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    className="w-full mt-2"
                    isLoading={isSubmitting || isLoading}
                  >
                    Checkout
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
