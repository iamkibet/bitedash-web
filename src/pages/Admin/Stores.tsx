import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import type { Restaurant } from '../../types/restaurant.types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { resolveImageUrl } from '../../utils/formatters';
import { Store as StoreIcon, Search, MapPin, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export const AdminStores = () => {
  const [list, setList] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openFilter, setOpenFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ total: number; last_page: number; per_page: number } | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getStores({
        page,
        search: search.trim() || undefined,
        is_open: openFilter === '' ? undefined : openFilter === 'open',
      });
      setList(res.data ?? []);
      setMeta(res.meta ? { total: res.meta.total, last_page: res.meta.last_page, per_page: res.meta.per_page } : null);
    } catch {
      setList([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [page, search, openFilter]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleToggleOpen = async (store: Restaurant) => {
    setTogglingId(store.id);
    try {
      await adminApi.updateStore(store.id, { is_open: !store.is_open });
      setList((prev) => prev.map((s) => (s.id === store.id ? { ...s, is_open: !s.is_open } : s)));
      toast.success(store.is_open ? 'Store marked as closed.' : 'Store marked as open.');
    } catch {
      toast.error('Could not update store. The backend may not support admin store updates yet.');
    } finally {
      setTogglingId(null);
    }
  };

  const totalPages = meta?.last_page ?? 1;
  const from = meta ? (page - 1) * meta.per_page + 1 : 0;
  const to = meta ? Math.min(page * meta.per_page, meta.total) : list.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Stores</h1>
          <p className="mt-1 text-sm text-gray-500">Manage restaurants and their visibility.</p>
        </div>
      </div>

      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden />
            <Input
              type="search"
              placeholder="Search by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
              className="pl-9"
              aria-label="Search stores"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={openFilter}
              onChange={(e) => { setOpenFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              aria-label="Filter by status"
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto -mx-1">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <StoreIcon className="h-12 w-12 text-gray-300 mb-3" aria-hidden />
              <p className="text-sm font-medium text-gray-900">No stores found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting search or filters.</p>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Store</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Location</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Status</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map((store) => (
                    <tr key={store.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                            {store.image_url ? (
                              <img
                                src={resolveImageUrl(store.image_url) ?? ''}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <StoreIcon className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{store.name}</p>
                            {store.description && (
                              <p className="text-xs text-gray-500 truncate max-w-[200px]">{store.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">{store.location || '—'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={store.is_open ? 'success' : 'default'}>
                          {store.is_open ? 'Open' : 'Closed'}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleOpen(store)}
                            disabled={togglingId === store.id}
                          >
                            {togglingId === store.id ? <Spinner className="h-4 w-4" /> : (store.is_open ? 'Close' : 'Open')}
                          </Button>
                          <Link
                            to={`/stores/${store.id}/menu`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                          >
                            View
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {meta && meta.total > meta.per_page && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-500">
                    Showing <span className="font-medium text-gray-700">{from}</span> to{' '}
                    <span className="font-medium text-gray-700">{to}</span> of{' '}
                    <span className="font-medium text-gray-700">{meta.total}</span> stores
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
