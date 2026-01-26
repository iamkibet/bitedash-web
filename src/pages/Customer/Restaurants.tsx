import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { restaurantsApi } from '../../api/restaurants';
import type { Restaurant } from '../../types/restaurant.types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { Search, MapPin, Clock } from 'lucide-react';
import { Input } from '../../components/common/Input';
import { resolveImageUrl } from '../../utils/formatters';

export const Restaurants = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    fetchRestaurants();
  }, [filterOpen]);

  const fetchRestaurants = async () => {
    try {
      setIsLoading(true);
      const response = await restaurantsApi.getAll({
        is_open: filterOpen,
        search: searchTerm || undefined,
      });
      setRestaurants(response.data);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Restaurants</h1>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search restaurants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilterOpen(undefined)}
              className={`px-4 py-2 rounded-lg border ${
                filterOpen === undefined
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterOpen(true)}
              className={`px-4 py-2 rounded-lg border ${
                filterOpen === true
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setFilterOpen(false)}
              className={`px-4 py-2 rounded-lg border ${
                filterOpen === false
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Closed
            </button>
          </div>
        </div>
      </div>

      {restaurants.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500 py-8">No restaurants found.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => (
            <Link key={restaurant.id} to={`/stores/${restaurant.id}/menu`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                {restaurant.image_url && (
                  <img
                    src={resolveImageUrl(restaurant.image_url) || restaurant.image_url}
                    alt={restaurant.name}
                    className="w-full h-48 object-cover rounded-t-lg mb-4"
                  />
                )}
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">{restaurant.name}</h3>
                  <Badge variant={restaurant.is_open ? 'success' : 'error'}>
                    {restaurant.is_open ? 'Open' : 'Closed'}
                  </Badge>
                </div>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{restaurant.description}</p>
                <div className="flex items-center text-gray-500 text-sm">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{restaurant.location}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
