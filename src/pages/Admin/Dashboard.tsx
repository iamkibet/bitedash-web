import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import type { AdminStats } from '../../api/admin';
import type { Order } from '../../types/order.types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
import {
  Users,
  Store,
  FileText,
  DollarSign,
  ArrowRight,
  LayoutDashboard,
  Shield,
  Package,
} from 'lucide-react';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../../utils/constants';
import { cn } from '../../utils/cn';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

const statCards: { key: keyof AdminStats; label: string; icon: React.ElementType; gradient: string; href: string }[] = [
  { key: 'total_users', label: 'Total Users', icon: Users, gradient: 'from-violet-500/10 to-violet-600/5', href: '/admin/users' },
  { key: 'total_stores', label: 'Stores', icon: Store, gradient: 'from-emerald-500/10 to-emerald-600/5', href: '/admin/stores' },
  { key: 'total_orders', label: 'Orders', icon: FileText, gradient: 'from-amber-500/10 to-amber-600/5', href: '/admin/orders' },
  { key: 'total_revenue', label: 'Revenue', icon: DollarSign, gradient: 'from-primary-500/10 to-primary-600/5', href: '/admin/orders' },
];

export const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await adminApi.getStats();
        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled) setStats({ total_users: 0, total_stores: 0, total_orders: 0, total_revenue: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setOrdersLoading(true);
        const res = await adminApi.getOrders({ page: 1, per_page: 5 });
        if (!cancelled) setRecentOrders(res.data?.slice(0, 5) ?? []);
      } catch {
        if (!cancelled) setRecentOrders([]);
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Overview of your platform and recent activity.</p>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Shield className="h-5 w-5 text-primary-600" aria-hidden />
          <span className="text-sm font-medium">Administrator</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ key, label, icon: Icon, gradient, href }) => (
          <Link
            key={key}
            to={href}
            className={cn(
              'group block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-2'
            )}
          >
            <div className={cn('inline-flex rounded-lg bg-gradient-to-br p-2.5', gradient)}>
              <Icon className="h-6 w-6 text-gray-700" aria-hidden />
            </div>
            <p className="mt-3 text-sm font-medium text-gray-500">{label}</p>
            {loading ? (
              <Spinner className="mt-1 h-8 w-12" />
            ) : (
              <p className={cn(
                'mt-1 text-2xl font-bold text-gray-900',
                key === 'total_revenue' && 'text-primary-600'
              )}>
                {key === 'total_revenue'
                  ? formatCurrency(stats?.[key] ?? 0)
                  : (stats?.[key] ?? 0).toLocaleString()}
              </p>
            )}
            <span className="mt-2 inline-flex items-center text-sm font-medium text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
              View
              <ArrowRight className="ml-1 h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>

      {/* Quick actions + Recent orders */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Quick actions */}
        <Card className="xl:col-span-1" padding="md">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-primary-600" />
            Quick actions
          </h2>
          <ul className="mt-4 space-y-2">
            <li>
              <Link
                to="/admin/users"
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  Manage users
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
            </li>
            <li>
              <Link
                to="/admin/stores"
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                <span className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-gray-400" />
                  Manage stores
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
            </li>
            <li>
              <Link
                to="/admin/orders"
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  View all orders
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
            </li>
          </ul>
        </Card>

        {/* Recent orders */}
        <Card className="xl:col-span-2" padding="md">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary-600" />
              Recent orders
            </h2>
            <Link
              to="/admin/orders"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto -mx-1">
            {ordersLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No orders yet.</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2 px-2">Order</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2 px-2">Store</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2 px-2">Total</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2 px-2">Status</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2 px-2">Payment</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2 px-2">Date</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2 px-2 w-0" aria-hidden />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-2 text-sm font-medium text-gray-900">#{order.id}</td>
                      <td className="py-2.5 px-2 text-sm text-gray-600 truncate max-w-[120px]">
                        {order.restaurant?.name ?? '—'}
                      </td>
                      <td className="py-2.5 px-2 text-sm text-gray-600">{formatCurrency(order.total)}</td>
                      <td className="py-2.5 px-2">
                        <Badge variant={statusVariant(order.status)}>
                          {ORDER_STATUSES[order.status]?.label ?? order.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2">
                        <Badge variant={paymentVariant(order.payment_status ?? '')}>
                          {PAYMENT_STATUSES[order.payment_status as keyof typeof PAYMENT_STATUSES]?.label ?? (order.payment_status ?? '—')}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2 text-sm text-gray-500">{formatDateShort(order.created_at)}</td>
                      <td className="py-2.5 px-2">
                        <Link
                          to={`/admin/orders?highlight=${order.id}`}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
