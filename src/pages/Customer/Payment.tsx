import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { paymentsApi } from '../../api/payments';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { formatCurrency } from '../../utils/formatters';
import { formatPhoneNumber, validatePhoneNumber } from '../../utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { paymentSchema } from '../../utils/validators';
import { toast } from 'sonner';
import { isUnpaid } from '../../utils/orderLifecycle';
import { ArrowLeft, CheckCircle, XCircle, CreditCard, Smartphone } from 'lucide-react';
import { cn } from '../../utils/cn';

type PaymentFormData = { phone_number: string };

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
    defaultValues: { phone_number: '' },
  });

  const phoneNumber = watch('phone_number');

  useEffect(() => {
    if (id) fetchOrder(Number(id));
  }, [id, fetchOrder]);

  useEffect(() => {
    if (currentOrder && id && !isUnpaid(currentOrder)) {
      toast.info('This order is already paid.');
      navigate(`/orders/${id}`);
    }
  }, [currentOrder, id, navigate]);

  useEffect(() => {
    if (paymentStatus === 'pending' && currentOrder && currentOrder.status !== 'pending') {
      setPaymentStatus('success');
      setIsPolling(false);
      toast.success('Payment confirmed!');
      setTimeout(() => navigate('/orders'), 2000);
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
    const maxPolls = 100;
    const interval = setInterval(async () => {
      if (!id || paymentStatus !== 'pending') {
        clearInterval(interval);
        setIsPolling(false);
        return;
      }
      try {
        pollCount++;
        await fetchOrder(Number(id));
        if (pollCount >= maxPolls) {
          clearInterval(interval);
          setIsPolling(false);
          toast.warning('Verification timeout. Check your order status.');
        }
      } catch {
        // keep polling
      }
    }, 3000);
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
      let phoneDigits = formattedPhone.replace(/^\+254/, '');
      if (phoneDigits.startsWith('254')) phoneDigits = phoneDigits.slice(3);
      if (!phoneDigits.startsWith('7') || phoneDigits.length !== 9) {
        toast.error('Phone must be 9 digits starting with 7 (e.g. 712345678)');
        setPaymentStatus('idle');
        return;
      }
      const phoneForApi = `254${phoneDigits}`;
      await paymentsApi.initiate(Number(id), { phone_number: phoneForApi });
      setPaymentStatus('pending');
      toast.success('Check your phone for the M-Pesa prompt.');
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setPaymentStatus('failed');
      if (apiError.validationErrors?.phone_number) {
        const msgs = Array.isArray(apiError.validationErrors.phone_number)
          ? apiError.validationErrors.phone_number
          : [apiError.validationErrors.phone_number];
        msgs.forEach((msg: string) => toast.error(`Phone: ${msg}`, { duration: 6000 }));
      } else if (apiError.validationErrors) {
        Object.entries(apiError.validationErrors).forEach(([, messages]) => {
          (Array.isArray(messages) ? messages : [messages]).forEach((msg: string) =>
            toast.error(String(msg), { duration: 5000 })
          );
        });
      }
      if (apiError.message && apiError.message !== 'Validation failed.') {
        toast.error(apiError.message, { duration: 6000 });
      } else {
        toast.error(apiError.message || 'Failed to initiate payment');
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 0 && !value.startsWith('7')) {
      value = value.startsWith('0') ? '7' + value.slice(1) : '7' + value;
    }
    if (value.length > 9) value = value.slice(0, 9);
    setValue('phone_number', value ? `+254${value}` : '', { shouldValidate: true });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    let value = e.clipboardData.getData('text').replace(/\D/g, '');
    if (value.startsWith('254')) value = value.slice(3);
    if (value.startsWith('0')) value = value.slice(1);
    if (value.length > 0 && !value.startsWith('7')) value = '7' + value;
    value = value.slice(0, 9);
    setValue('phone_number', value ? `+254${value}` : '', { shouldValidate: true });
  };

  if (!currentOrder) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const displayTotal = (() => {
    const orderWithTotal = currentOrder as typeof currentOrder & { total_amount?: number };
    const raw = currentOrder.total ?? orderWithTotal.total_amount;
    const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
    if (n > 0 && !isNaN(n)) return n;
    const items = currentOrder.items ?? [];
    return items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
  })();

  return (
    <div className="space-y-6 pb-8">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(`/orders/${id}`)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to order
      </button>

      {/* Order summary */}
      <Card className="border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <CreditCard className="h-5 w-5 text-primary-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Amount due</p>
            <p className="text-xl font-bold text-primary-600">{formatCurrency(displayTotal)}</p>
            <p className="text-sm text-gray-500">Order #{currentOrder.id}</p>
          </div>
        </div>
      </Card>

      {/* Content by status */}
      {paymentStatus === 'idle' && (
        <Card className="border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Pay with M-Pesa</h2>
          <p className="text-sm text-gray-500 mb-4">Enter the number linked to your M-Pesa account.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="mpesa-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone number
              </label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500">
                <span className="flex items-center px-4 bg-gray-50 text-gray-600 font-medium border-r border-gray-200 text-base">
                  +254
                </span>
                <input
                  id="mpesa-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="712345678"
                  maxLength={9}
                  value={phoneNumber ? phoneNumber.replace(/^\+254/, '') : ''}
                  onChange={handlePhoneChange}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className={cn(
                    'flex-1 min-w-0 px-4 py-3 text-base border-0 focus:ring-0 focus:outline-none',
                    errors.phone_number && 'placeholder-red-300'
                  )}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">9 digits starting with 7</p>
              {errors.phone_number && (
                <p className="mt-1 text-sm text-red-600">{errors.phone_number.message}</p>
              )}
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary-50 border border-primary-100">
              <Smartphone className="h-5 w-5 text-primary-600 shrink-0 mt-0.5" />
              <p className="text-sm text-primary-800">
                You’ll get an M-Pesa prompt on this number. Enter your PIN to complete payment.
              </p>
            </div>

            <Button type="submit">
              Pay now
            </Button>
          </form>
        </Card>
      )}

      {paymentStatus === 'initiating' && (
        <Card className="border border-gray-100 text-center py-10">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Starting payment…</p>
          <p className="text-sm text-gray-500 mt-1">Please wait.</p>
        </Card>
      )}

      {paymentStatus === 'pending' && (
        <Card className="border border-gray-100 text-center py-10">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="font-semibold text-gray-900">Waiting for payment</p>
          <p className="text-sm text-gray-600 mt-2">Check your phone and enter your M-Pesa PIN.</p>
          <p className="text-xs text-gray-500 mt-2">We’ll update this page when payment is confirmed.</p>
        </Card>
      )}

      {paymentStatus === 'success' && (
        <Card className="border border-gray-100 text-center py-10">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Payment successful</h2>
          <p className="text-sm text-gray-500 mt-1">Redirecting to your orders…</p>
        </Card>
      )}

      {paymentStatus === 'failed' && (
        <Card className="border border-gray-100 text-center py-10">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Payment failed</h2>
          <p className="text-sm text-gray-500 mt-2">Check your number (e.g. 712345678) and try again.</p>
          <Button onClick={() => setPaymentStatus('idle')} className="mt-4">
            Try again
          </Button>
        </Card>
      )}
    </div>
  );
};
