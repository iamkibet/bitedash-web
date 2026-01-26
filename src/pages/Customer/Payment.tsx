import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { paymentsApi } from '../../api/payments';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { formatCurrency } from '../../utils/formatters';
import { formatPhoneNumber, validatePhoneNumber } from '../../utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { paymentSchema } from '../../utils/validators';
import { toast } from 'sonner';
import { isUnpaid } from '../../utils/orderLifecycle';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

type PaymentFormData = {
  phone_number: string;
};

interface ApiError {
  message: string;
  validationErrors?: Record<string, string[]>;
}

export const Payment = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrder, fetchOrder } = useOrderStore();
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'initiating' | 'pending' | 'success' | 'failed'>('idle');
  const [isPolling, setIsPolling] = useState(false);

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      phone_number: '',
    },
  });

  const phoneNumber = watch('phone_number');

  useEffect(() => {
    if (id) fetchOrder(Number(id));
  }, [id, fetchOrder]);

  // Redirect if order is already paid
  useEffect(() => {
    if (currentOrder && id && !isUnpaid(currentOrder)) {
      toast.info('This order is already paid.');
      navigate(`/orders/${id}`);
    }
  }, [currentOrder, id, navigate]);

  // Watch for order status changes to detect payment completion
  useEffect(() => {
    if (paymentStatus === 'pending' && currentOrder) {
      // If order status changed from 'pending', payment was successful
      if (currentOrder.status !== 'pending') {
        console.log('Order status changed to:', currentOrder.status, '- Payment successful!');
        setPaymentStatus('success');
        setIsPolling(false);
        toast.success('Payment confirmed!');
        setTimeout(() => {
          navigate('/orders');
        }, 2000);
      }
    }
  }, [currentOrder, paymentStatus, navigate]);

  useEffect(() => {
    if (paymentStatus === 'pending' && !isPolling) {
      const cleanup = startPolling();
      return cleanup;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentStatus]);

  const startPolling = (): (() => void) => {
    setIsPolling(true);
    let pollCount = 0;
    const maxPolls = 100; // 100 polls * 3 seconds = 5 minutes max
    
    const interval = setInterval(async () => {
      if (!id || paymentStatus !== 'pending') {
        clearInterval(interval);
        setIsPolling(false);
        return;
      }

      try {
        pollCount++;
        console.log(`Polling payment status (attempt ${pollCount})...`);
        
        // Fetch the latest order data - this updates the store
        // The useEffect watching currentOrder.status will detect the change
        await fetchOrder(Number(id));

        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          console.warn('Polling timeout reached');
          clearInterval(interval);
          setIsPolling(false);
          toast.warning('Payment verification timeout. Please check your order status manually.');
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Don't stop polling on error, just log it
      }
    }, 3000); // Poll every 3 seconds

    // Return cleanup function
    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  };

  const onSubmit = async (data: PaymentFormData) => {
    if (!id || !currentOrder) return;

    try {
      setPaymentStatus('initiating');
      const formattedPhone = formatPhoneNumber(data.phone_number);
      
      if (!validatePhoneNumber(formattedPhone)) {
        toast.error('Invalid phone number format');
        setPaymentStatus('idle');
        return;
      }

      // Extract the 9 digits (712345678) from +254712345678
      let phoneDigits = formattedPhone.replace(/^\+254/, '');
      
      // If it still has 254 prefix, remove it
      if (phoneDigits.startsWith('254')) {
        phoneDigits = phoneDigits.slice(3);
      }
      
      // Ensure we have exactly 9 digits starting with 7
      if (!phoneDigits.startsWith('7') || phoneDigits.length !== 9) {
        toast.error('Phone number must be 9 digits starting with 7 (e.g., 712345678)');
        setPaymentStatus('idle');
        return;
      }

      // M-Pesa APIs typically expect 254712345678 format (without +)
      const phoneForApi = `254${phoneDigits}`;

      console.log('Sending payment request:', {
        orderId: Number(id),
        phone_number: phoneForApi,
        phoneDigits,
        formattedPhone,
        originalPhone: data.phone_number,
        phoneLength: phoneForApi.length,
      });

      await paymentsApi.initiate(Number(id), { phone_number: phoneForApi });
      setPaymentStatus('pending');
      toast.success('Payment request sent! Please check your phone for the M-Pesa prompt.');
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setPaymentStatus('failed');
      
      // Handle validation errors from backend
      if (apiError.validationErrors) {
        console.error('Backend validation errors:', JSON.stringify(apiError.validationErrors, null, 2));
        console.error('Full error object:', JSON.stringify(error, null, 2));
        console.error('Error message:', apiError.message);
        
        // Show specific phone number format error if available
        if (apiError.validationErrors.phone_number) {
          const phoneErrors = Array.isArray(apiError.validationErrors.phone_number) 
            ? apiError.validationErrors.phone_number 
            : [apiError.validationErrors.phone_number];
          
          phoneErrors.forEach((msg: string) => {
            console.error('Phone error message:', msg);
            toast.error(`Phone Number: ${msg}`, {
              duration: 6000,
            });
          });
        } else {
          // Show other validation errors
          Object.entries(apiError.validationErrors).forEach(([field, messages]) => {
            const errorMessages = Array.isArray(messages) ? messages : [messages];
            errorMessages.forEach((msg: string) => {
              toast.error(`${field}: ${msg}`, { duration: 5000 });
            });
          });
        }
        
        // Also show the general error message if available (it often contains the full format requirement)
        if (apiError.message && apiError.message !== 'Validation failed.') {
          console.error('General error message:', apiError.message);
          toast.error(apiError.message, { 
            duration: 6000,
            description: 'Check console for full details',
          });
        }
      } else {
        console.error('Payment initiation error:', error);
        toast.error(apiError.message || 'Failed to initiate payment');
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-digits
    let value = e.target.value.replace(/\D/g, '');
    
    // If user starts typing, ensure it starts with 7
    if (value.length > 0 && !value.startsWith('7')) {
      // If they typed 0, replace with 7
      if (value.startsWith('0')) {
        value = '7' + value.slice(1);
      } else {
        // Otherwise prepend 7 if it doesn't start with it
        value = '7' + value;
      }
    }
    
    // Limit to 9 digits (7XXXXXXXX)
    if (value.length > 9) {
      value = value.slice(0, 9);
    }
    
    // Format as +254XXXXXXXXX for validation
    const fullPhone = value ? `+254${value}` : '';
    setValue('phone_number', fullPhone, { shouldValidate: true });
  };

  if (!currentOrder) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Ensure we have a valid total: use order.total, total_amount, or compute from items
  const displayTotal = (() => {
    const orderWithTotal = currentOrder as typeof currentOrder & { total_amount?: number };
    const raw = currentOrder.total ?? orderWithTotal.total_amount;
    const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
    if (n > 0 && !isNaN(n)) return n;
    const items = currentOrder.items ?? [];
    return items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
  })();

  return (
    <div className="max-w-2xl mx-auto">
      <Button
        variant="outline"
        onClick={() => navigate(`/orders/${id}`)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Order
      </Button>

      <Card>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Complete Payment</h1>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Order Total</span>
            <span className="text-2xl font-bold text-primary-600">
              {formatCurrency(displayTotal)}
            </span>
          </div>
          <p className="text-sm text-gray-500">Order #{currentOrder.id}</p>
        </div>

        {paymentStatus === 'idle' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                M-Pesa Phone Number
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-0 flex items-center h-full pl-4 pr-2 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg">
                  <span className="text-gray-700 font-semibold text-base">
                    +254
                  </span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="712345678"
                  maxLength={9}
                  value={phoneNumber ? phoneNumber.replace(/^\+254/, '') : ''}
                  className={`w-full pl-24 pr-4 py-2.5 border rounded-r-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.phone_number ? 'border-red-500' : 'border-gray-300'
                  }`}
                  onChange={handlePhoneChange}
                  onKeyDown={(e) => {
                    // Only allow numbers and backspace/delete
                    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
                    if (pasted.length > 0) {
                      let value = pasted;
                      // Remove leading 254 or 0 if present
                      if (value.startsWith('254')) {
                        value = value.slice(3);
                      } else if (value.startsWith('0')) {
                        value = value.slice(1);
                      }
                      // Ensure starts with 7
                      if (!value.startsWith('7') && value.length > 0) {
                        value = '7' + value;
                      }
                      // Limit to 9 digits
                      value = value.slice(0, 9);
                      const fullPhone = value ? `+254${value}` : '';
                      setValue('phone_number', fullPhone, { shouldValidate: true });
                    }
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Enter your 9-digit M-Pesa number starting with 7 (e.g., 712345678)
              </p>
              {errors.phone_number && (
                <p className="mt-1 text-sm text-red-600">{errors.phone_number.message}</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                You will receive an M-Pesa prompt on your phone. Please enter your M-Pesa PIN to complete the payment.
              </p>
            </div>

            <Button type="submit" className="w-full">
              Pay with M-Pesa
            </Button>
          </form>
        )}

        {paymentStatus === 'initiating' && (
          <div className="text-center py-8">
            <Spinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">Initiating payment...</p>
          </div>
        )}

        {paymentStatus === 'pending' && (
          <div className="text-center py-8">
            <div className="mb-4">
              <Spinner size="lg" className="mx-auto mb-4" />
              <Badge variant="warning" className="text-base">
                Payment Pending
              </Badge>
            </div>
            <p className="text-gray-600 mb-2">
              Please check your phone and enter your M-Pesa PIN.
            </p>
            <p className="text-sm text-gray-500">
              We're checking your payment status...
            </p>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600">Your order is being processed.</p>
          </div>
        )}

        {paymentStatus === 'failed' && (
          <div className="text-center py-8">
            <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-4">Please check your phone number format and try again.</p>
            <p className="text-sm text-gray-500 mb-4">
              Expected format: 254712345678 or 0712345678
            </p>
            <Button onClick={() => setPaymentStatus('idle')}>Try Again</Button>
          </div>
        )}
      </Card>
    </div>
  );
};
