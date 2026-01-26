import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { restaurantsApi } from '../../api/restaurants';
import { restaurantSchema } from '../../utils/validators';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { LocationMap } from '../../components/common/LocationMap';
import { ArrowLeft, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import type { CreateRestaurantData } from '../../types/restaurant.types';

export const CreateStore = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLat, setSelectedLat] = useState<number | undefined>();
  const [selectedLng, setSelectedLng] = useState<number | undefined>();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateRestaurantData>({
    resolver: zodResolver(restaurantSchema),
  });

  const latitude = watch('latitude');
  const longitude = watch('longitude');

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    setValue('latitude', lat);
    setValue('longitude', lng);
  };

  const onSubmit = async (data: CreateRestaurantData) => {
    try {
      setIsSubmitting(true);
      const store = await restaurantsApi.create({
        ...data,
        latitude: selectedLat,
        longitude: selectedLng,
      });
      toast.success('Store created successfully!');
      navigate('/store/dashboard');
    } catch (error: unknown) {
      const err = error as { 
        message?: string; 
        validationErrors?: Record<string, string[]>;
        response?: { status?: number; data?: any };
      };
      
      // Handle 404 - route doesn't exist
      if (err.response?.status === 404) {
        console.error('Store creation endpoint not found. Backend route missing:', {
          endpoint: 'POST /api/v1/stores',
          suggestion: 'Ensure the route exists in your Laravel routes file',
        });
        toast.error('Store creation endpoint not found. Please check backend routes.');
        return;
      }
      
      if (err.validationErrors) {
        Object.entries(err.validationErrors).forEach(([field, messages]) => {
          if (messages?.[0]) {
            toast.error(`${field}: ${messages[0]}`);
          }
        });
      } else {
        toast.error(err.message || 'Failed to create store. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <Link to="/store/dashboard">
        <Button variant="outline" className="mb-4 sm:mb-6" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Form Section */}
        <Card className="lg:col-span-1 order-2 lg:order-1">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              Create Your Store
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Set up your store profile to start receiving orders from customers.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Store Name"
              {...register('name')}
              error={errors.name?.message}
              placeholder="e.g., Mama's Kitchen, Tech Shop, etc."
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="Describe what your store offers..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <Input
              label="Location Address"
              {...register('location')}
              error={errors.location?.message}
              placeholder="e.g., Westlands, Nairobi"
            />

            {/* Hidden inputs for coordinates (set by map) */}
            <input type="hidden" {...register('latitude', { valueAsNumber: true })} />
            <input type="hidden" {...register('longitude', { valueAsNumber: true })} />

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/store/dashboard')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" isLoading={isSubmitting}>
                Create Store
              </Button>
            </div>
          </form>
        </Card>

        {/* Map Section */}
        <Card className="lg:col-span-1 order-1 lg:order-2">
          <div className="mb-3 sm:mb-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600 flex-shrink-0" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Select Store Location</h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">
              Click on the map to set your store's location. This helps customers find you easily.
            </p>
          </div>

          <LocationMap
            latitude={latitude}
            longitude={longitude}
            onLocationSelect={handleLocationSelect}
            className="w-full"
          />

          {(selectedLat && selectedLng) && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Location selected:</strong> {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
