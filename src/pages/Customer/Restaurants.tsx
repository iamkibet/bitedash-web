import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { restaurantsApi } from '../../api/restaurants';
import type { Restaurant } from '../../types/restaurant.types';
import { Card } from '../../components/common/Card';
import { Spinner } from '../../components/common/Spinner';
import { Search, MapPin, Clock, Store, ChevronRight } from 'lucide-react';
import { resolveImageUrl } from '../../utils/formatters';
import { cn } from '../../utils/cn';

type FilterOption = 'all' | 'open' | 'closed';

export const Restaurants = () => {
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilterState] = useState<FilterOption>('all');

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setIsLoading(true);
      const response = await restaurantsApi.getAll({
        search: searchTerm || undefined,
      });
      setAllRestaurants(response.data);
    } catch (error) {
      console.error('Failed to fetch restaurants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRestaurants();
  };

  const setActiveFilter = (opt: FilterOption) => {
    setActiveFilterState(opt);
  };

  // Client-side filter by open/closed so it always works
  const restaurants =
    activeFilter === 'all'
      ? allRestaurants
      : activeFilter === 'open'
        ? allRestaurants.filter((r) => r.is_open)
        : allRestaurants.filter((r) => !r.is_open);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Stores</h1>
        <p className="text-sm text-gray-500">
          Browse restaurants and order from your favorites.
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onBlur={() => searchTerm && fetchRestaurants()}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
            />
          </div>
        </form>

        {/* Open / Closed filter - segmented control */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 border border-gray-200/80">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-all',
              activeFilter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('open')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-all inline-flex items-center gap-1.5',
              activeFilter === 'open'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden />
            Open
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('closed')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-all inline-flex items-center gap-1.5',
              activeFilter === 'closed'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-red-400" aria-hidden />
            Closed
          </button>
        </div>
      </div>

      {/* Results */}
      {restaurants.length === 0 ? (
        <Card className="text-center py-16">
          <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No restaurants found</p>
          <p className="text-sm text-gray-500 mt-1">
            Try a different search or filter.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurants.map((restaurant) => (
            <Link
              key={restaurant.id}
              to={`/stores/${restaurant.id}/menu`}
              className="group block"
            >
              <Card
                padding="none"
                className="overflow-hidden h-full flex flex-col transition-all duration-200 hover:shadow-lg hover:border-gray-200 border border-gray-100"
              >
                {/* Image */}
                <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                  {restaurant.image_url ? (
                    <img
                      src={resolveImageUrl(restaurant.image_url) || restaurant.image_url}
                      alt={restaurant.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <Store className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                  {/* Status badge on image */}
                  <div
                    className={cn(
                      'absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm inline-flex items-center gap-1.5',
                      restaurant.is_open
                        ? 'bg-green-500/95 text-white'
                        : 'bg-gray-700/90 text-white'
                    )}
                  >
                    {restaurant.is_open ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        Open
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" />
                        Closed
                      </>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                    {restaurant.name}
                  </h3>
                  {restaurant.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1 flex-1">
                      {restaurant.description}
                    </p>
                  )}
                  {restaurant.location && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                      <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="truncate">{restaurant.location}</span>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-primary-600">
                      View menu
                    </span>
                    <ChevronRight className="h-4 w-4 text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
