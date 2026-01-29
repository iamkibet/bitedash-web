import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { restaurantsApi } from '../../api/restaurants';
import { restaurantSchema } from '../../utils/validators';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { Spinner } from '../../components/common/Spinner';
import { LocationMap } from '../../components/common/LocationMap';
import {
  ArrowLeft,
  Upload,
  X,
  MapPin,
  Store,
  Image as ImageIcon,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Restaurant, UpdateRestaurantData } from '../../types/restaurant.types';
import {
  MENU_ITEM_IMAGE_ACCEPT,
  MENU_ITEM_IMAGE_MAX_BYTES,
} from '../../utils/constants';
import { validateMenuItemImage } from '../../utils/validators';
import { resolveImageUrl } from '../../utils/formatters';
import { forwardGeocode, reverseGeocode } from '../../utils/geocoding';

type StoreSettingsFormData = {
  name: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
};

export const StoreSettings = () => {
  const navigate = useNavigate();
  const [store, setStore] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [addressSearch, setAddressSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<StoreSettingsFormData>({
    resolver: zodResolver(restaurantSchema),
  });

  const latitude = watch('latitude');
  const longitude = watch('longitude');
  const locationText = watch('location');

  useEffect(() => {
    fetchStore();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const fetchStore = async () => {
    try {
      setIsLoading(true);
      const myStore = await restaurantsApi.getMyStore();
      if (myStore) {
        setStore(myStore);
        reset({
          name: myStore.name,
          description: myStore.description,
          location: myStore.location,
          latitude: myStore.latitude,
          longitude: myStore.longitude,
        });
        setImagePreview(myStore.image_url ? resolveImageUrl(myStore.image_url) ?? myStore.image_url : null);
      } else {
        toast.error('No store found. Please create a store first.');
        navigate('/store/create');
      }
    } catch (error) {
      console.error('Failed to fetch store:', error);
      toast.error('Failed to load store settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = async (lat: number, lng: number) => {
    setValue('latitude', lat);
    setValue('longitude', lng);
    try {
      const address = await reverseGeocode(lat, lng);
      if (address) setValue('location', address);
    } catch {
      toast.error('Could not resolve address for this point. You can type the address manually.');
    }
  };

  const handleAddressSearch = async () => {
    const query = addressSearch.trim();
    if (!query) {
      toast.error('Enter an address or place name to search.');
      return;
    }
    try {
      setIsGeocoding(true);
      const result = await forwardGeocode(query);
      if (result) {
        setValue('latitude', result.lat);
        setValue('longitude', result.lng);
        setValue('location', result.displayName);
        toast.success('Location updated. Adjust the marker on the map if needed.');
      } else {
        toast.error('No results found. Try a different address or place name.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateMenuItemImage(file, MENU_ITEM_IMAGE_MAX_BYTES);
    if (err) {
      toast.error(err);
      return;
    }
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(store?.image_url ? resolveImageUrl(store.image_url) ?? store.image_url : null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (data: StoreSettingsFormData) => {
    if (!store) return;

    try {
      setIsSubmitting(true);

      const updateData: UpdateRestaurantData = {
        name: data.name,
        description: data.description,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
      };

      const updatedStore = await restaurantsApi.update(store.id, updateData, imageFile ?? undefined);

      setStore(updatedStore);
      if (updatedStore.image_url) {
        if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
        setImagePreview(resolveImageUrl(updatedStore.image_url) ?? updatedStore.image_url);
      }
      setImageFile(null);
      toast.success('Store settings saved.');
    } catch (error: unknown) {
      const err = error as {
        message?: string;
        validationErrors?: Record<string, string[]>;
      };

      if (err.validationErrors) {
        Object.entries(err.validationErrors).forEach(([field, messages]) => {
          if (messages?.[0]) toast.error(`${field}: ${messages[0]}`);
        });
      } else {
        toast.error(err.message ?? 'Failed to save. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] px-4 text-center">
        <div className="rounded-2xl bg-gray-100 p-8 mb-6">
          <Store className="h-16 w-16 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No store found</h2>
        <p className="text-gray-600 text-sm mb-6">Create your store first to manage settings.</p>
        <Link to="/store/create">
          <Button>Create Store</Button>
        </Link>
      </div>
    );
  }

  const hasCoordinates = latitude != null && longitude != null && !Number.isNaN(latitude) && !Number.isNaN(longitude);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/store/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Store settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Update your store info, logo, and location for customers.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Logo + Info */}
          <div className="space-y-6">
            {/* Logo */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Store logo</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Shown in the store list and on your menu. JPEG, PNG or WebP, max 2MB.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={MENU_ITEM_IMAGE_ACCEPT}
                onChange={handleImageChange}
                className="sr-only"
                aria-label="Upload logo"
              />
              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 overflow-hidden transition-colors hover:border-gray-300">
                {imagePreview ? (
                  <div className="relative group">
                    <div className="aspect-square max-h-48 w-full bg-gray-100 flex items-center justify-center">
                      <img
                        src={imagePreview}
                        alt="Store logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/50 to-transparent flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-1.5 bg-white/90 border-white text-gray-800 hover:bg-white"
                      >
                        <Upload className="h-4 w-4" />
                        Change
                      </Button>
                      {imageFile && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={clearImage}
                          className="gap-1.5 bg-white/90 border-white text-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 py-10"
                  >
                    <div className="rounded-full bg-gray-200 p-4">
                      <Store className="h-8 w-8 text-gray-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-600">Click to upload logo</span>
                  </button>
                )}
              </div>
            </Card>

            {/* Store info */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Store className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Store information</h2>
              </div>
              <div className="space-y-4">
                <Input
                  label="Store name"
                  {...register('name')}
                  error={errors.name?.message}
                  placeholder="e.g. Mama's Kitchen"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea
                    {...register('description')}
                    placeholder="What you offer, opening hours, etc."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>
                <Input
                  label="Address / location"
                  {...register('location')}
                  error={errors.location?.message}
                  placeholder="e.g. Westlands, Nairobi or full address"
                />
              </div>
            </Card>
          </div>

          {/* Right: Map + location */}
          <div className="space-y-6">
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Location on map</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Search for an address or click the map (or use “Use my location”) to set your store pin. The address above updates automatically when you move the marker.
              </p>

              {/* Address search */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={addressSearch}
                  onChange={(e) => setAddressSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddressSearch())}
                  placeholder="Search address or place..."
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddressSearch}
                  disabled={isGeocoding}
                  isLoading={isGeocoding}
                  className="shrink-0 gap-1.5"
                >
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>

              <LocationMap
                latitude={latitude}
                longitude={longitude}
                onLocationSelect={handleLocationSelect}
                className="w-full"
              />

              {hasCoordinates && (
                <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Coordinates</p>
                  <p className="text-sm font-mono text-gray-700">
                    {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
                  </p>
                  {locationText && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2" title={locationText}>
                      {locationText}
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/store/dashboard')}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
};
