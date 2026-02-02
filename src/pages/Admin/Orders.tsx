import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../api/admin';
import type { Order } from '../../types/order.types';
import type { OrderStatus } from '../../types/order.types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
import { FileText, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../../utils/constants';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

const statusVariant = (status: string): BadgeVariant => {
  const map: Record<string, BadgeVariant> = {
    pending: 'warning',
    preparing: 'info',
    on_the_way: 'info',
    delivered: 'success',
    cancelled: 'error',
  };
  return map[status] ?? 'default';
};

const paymentVariant = (payment: string): BadgeVariant => {
  const map: Record<string, BadgeVariant> = {
    unpaid: 'warning',
    pending: 'warning',
    paid: 'success',
    failed: 'error',
  };
  return map[payment] ?? 'default';
};

const STATUS_OPTIONS: Array<OrderStatus | ''> = ['', 'pending', 'preparing', 'on_the_way', 'delivered', 'cancelled'];
const PAYMENT_OPTIONS = ['', 'unpaid', 'pending', 'paid', 'failed'];

export const AdminOrders = () => {
  const [list, setList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ total: number; last_page: number; per_page: number } | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getOrders({
        page,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        payment_status: paymentFilter || undefined,
      });
      setList(res.data ?? []);
      setMeta(res.meta ? { total: res.meta.total, last_page: res.meta.last_page, per_page: res.meta.per_page } : null);
    } catch {
      setList([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, paymentFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const totalPages = meta?.last_page ?? 1;
  const from = meta ? (page - 1) * meta.per_page + 1 : 0;
  const to = meta ? Math.min(page * meta.per_page, meta.total) : list.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Orders</h1>
          <p className="mt-1 text-sm text-gray-500">View and monitor all platform orders.</p>
        </div>
      </div>

      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden />
            <Input
              type="search"
              placeholder="Search by order # or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
              className="pl-9"
              aria-label="Search orders"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            aria-label="Filter by order status"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map((s) => (
              <option key={s} value={s}>{ORDER_STATUSES[s as OrderStatus]?.label ?? s}</option>
            ))}
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            aria-label="Filter by payment status"
          >
            <option value="">All payments</option>
            {PAYMENT_OPTIONS.filter(Boolean).map((p) => (
              <option key={p} value={p}>{PAYMENT_STATUSES[p as keyof typeof PAYMENT_STATUSES]?.label ?? p}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto -mx-1">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mb-3" aria-hidden />
              <p className="text-sm font-medium text-gray-900">No orders found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting search or filters.</p>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Order</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Customer</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Store</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Total</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Status</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Payment</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-2 text-sm font-medium text-gray-900">#{order.id}</td>
                      <td className="py-3 px-2 text-sm text-gray-600">
                        {order.user?.name ?? '—'}
                        {order.user?.phone && (
                          <span className="block text-xs text-gray-500">{order.user.phone}</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-600 truncate max-w-[140px]">
                        {order.restaurant?.name ?? '—'}
                      </td>
                      <td className="py-3 px-2 text-sm font-medium text-gray-900">{formatCurrency(order.total)}</td>
                      <td className="py-3 px-2">
                        <Badge variant={statusVariant(order.status)}>
                          {ORDER_STATUSES[order.status]?.label ?? order.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={paymentVariant(order.payment_status ?? '')}>
                          {PAYMENT_STATUSES[order.payment_status as keyof typeof PAYMENT_STATUSES]?.label ?? (order.payment_status ?? '—')}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-500">{formatDateShort(order.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {meta && meta.total > meta.per_page && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-500">
                    Showing <span className="font-medium text-gray-700">{from}</span> to{' '}
                    <span className="font-medium text-gray-700">{to}</span> of{' '}
                    <span className="font-medium text-gray-700">{meta.total}</span> orders
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600 px-2">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
};
