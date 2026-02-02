import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../api/admin';
import type { User } from '../../types/auth.types';
import type { UserRole } from '../../types/auth.types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { formatDateShort } from '../../utils/formatters';
import { Users as UsersIcon, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const ROLES: UserRole[] = ['customer', 'restaurant', 'rider', 'admin'];

const roleLabel: Record<UserRole, string> = {
  customer: 'Customer',
  restaurant: 'Restaurant',
  rider: 'Rider',
  admin: 'Admin',
};

const roleVariant: Record<UserRole, 'success' | 'warning' | 'info' | 'default'> = {
  customer: 'default',
  restaurant: 'info',
  rider: 'warning',
  admin: 'success',
};

export const AdminUsers = () => {
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ total: number; last_page: number; per_page: number } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({
        page,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
      });
      setList(res.data ?? []);
      setMeta(res.meta ? { total: res.meta.total, last_page: res.meta.last_page, per_page: res.meta.per_page } : null);
    } catch {
      setList([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = meta?.last_page ?? 1;
  const from = meta ? (page - 1) * meta.per_page + 1 : 0;
  const to = meta ? Math.min(page * meta.per_page, meta.total) : list.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-gray-500">Manage platform users and roles.</p>
        </div>
      </div>

      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden />
            <Input
              type="search"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
              className="pl-9"
              aria-label="Search users"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" aria-hidden />
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              aria-label="Filter by role"
            >
              <option value="">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleLabel[r]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto -mx-1">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center max-w-md mx-auto">
              <UsersIcon className="h-12 w-12 text-gray-300 mb-3" aria-hidden />
              <p className="text-sm font-medium text-gray-900">No users found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting search or filters.</p>
              <p className="text-xs text-gray-400 mt-3">
                If your API does not expose user listing yet, add <code className="bg-gray-100 px-1 rounded">GET /api/v1/admin/users</code> or <code className="bg-gray-100 px-1 rounded">GET /api/v1/users</code> (admin-only) to load users here.
              </p>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Name</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Email</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Phone</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Role</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-2 text-sm font-medium text-gray-900">{user.name}</td>
                      <td className="py-3 px-2 text-sm text-gray-600">{user.email}</td>
                      <td className="py-3 px-2 text-sm text-gray-600">{user.phone || '—'}</td>
                      <td className="py-3 px-2">
                        <Badge variant={roleVariant[user.role]}>{roleLabel[user.role]}</Badge>
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-500">{formatDateShort(user.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {meta && meta.total > meta.per_page && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-500">
                    Showing <span className="font-medium text-gray-700">{from}</span> to{' '}
                    <span className="font-medium text-gray-700">{to}</span> of{' '}
                    <span className="font-medium text-gray-700">{meta.total}</span> users
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
