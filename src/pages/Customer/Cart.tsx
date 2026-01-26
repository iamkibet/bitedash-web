import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { useOrderStore } from '../../store/orderStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { MenuItemImage } from '../../components/common/MenuItemImage';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const orderSchema = z.object({
  delivery_address: z.string().min(1, 'Delivery address is required').max(500),
  notes: z.string().max(1000).optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

export const Cart = () => {
  const navigate = useNavigate();
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
    if (!restaurantId || items.length === 0) {
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
    } catch (error) {
      // Error handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-600 mb-6">Add items from restaurants to get started</p>
        <Button onClick={() => navigate('/stores')}>Browse Stores</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.menu_item.id}>
              <div className="flex gap-4">
                <div className="w-24 shrink-0">
                  <MenuItemImage
                    src={item.menu_item.image_url}
                    alt={item.menu_item.name}
                    aspectRatio={1}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {item.menu_item.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">{item.menu_item.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 border rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.menu_item.id, item.quantity - 1)}
                        className="p-1 hover:bg-gray-100"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="px-3 py-1 min-w-[3rem] text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menu_item.id, item.quantity + 1)}
                        className="p-1 hover:bg-gray-100"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-semibold text-gray-900">
                        {formatCurrency(item.menu_item.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeItem(item.menu_item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-1">
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Delivery Address"
                {...register('delivery_address')}
                error={errors.delivery_address?.message}
                placeholder="Enter your delivery address"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  {...register('notes')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Any special instructions?"
                />
                {errors.notes && (
                  <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-primary-600">
                    {formatCurrency(getTotal())}
                  </span>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isSubmitting || isLoading}
                >
                  Place Order
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
