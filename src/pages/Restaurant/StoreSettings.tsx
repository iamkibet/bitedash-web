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
import { ArrowLeft, Upload, X, MapPin, Store, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Restaurant, UpdateRestaurantData } from '../../types/restaurant.types';
import {
  MENU_ITEM_IMAGE_ACCEPT,
  MENU_ITEM_IMAGE_MAX_BYTES,
} from '../../utils/constants';
import { validateMenuItemImage } from '../../utils/validators';

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
  const [selectedLat, setSelectedLat] = useState<number | undefined>();
  const [selectedLng, setSelectedLng] = useState<number | undefined>();
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

  useEffect(() => {
    fetchStore();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
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
        setSelectedLat(myStore.latitude ?? undefined);
        setSelectedLng(myStore.longitude ?? undefined);
        if (myStore.image_url) {
          setImagePreview(myStore.image_url);
        }
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

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    setValue('latitude', lat);
    setValue('longitude', lng);
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
    setImagePreview(store?.image_url || null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (data: StoreSettingsFormData) => {
    if (!store) return;

    try {
      setIsSubmitting(true);
      
      // Prepare update data
      const updateData: UpdateRestaurantData = {
        name: data.name,
        description: data.description,
        location: data.location,
        latitude: selectedLat,
        longitude: selectedLng,
      };

      // Update store with optional image upload
      const updatedStore = await restaurantsApi.update(store.id, updateData, imageFile || undefined);
      
      setStore(updatedStore);
      // Reset image preview to use the new URL if available
      if (updatedStore.image_url && !imageFile) {
        setImagePreview(updatedStore.image_url);
      } else if (updatedStore.image_url && imageFile) {
        // If we uploaded a new image, the preview is already set from the file
        // But we should update it to the server URL
        if (imagePreview && imagePreview.startsWith('blob:')) {
          URL.revokeObjectURL(imagePreview);
        }
        setImagePreview(updatedStore.image_url);
      }
      setImageFile(null);
      toast.success('Store settings updated successfully!');
    } catch (error: unknown) {
      const err = error as {
        message?: string;
        validationErrors?: Record<string, string[]>;
        response?: { status?: number; data?: any };
      };

      if (err.validationErrors) {
        Object.entries(err.validationErrors).forEach(([field, messages]) => {
          if (messages?.[0]) {
            toast.error(`${field}: ${messages[0]}`);
          }
        });
      } else {
        toast.error(err.message || 'Failed to update store settings. Please try again.');
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
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">No store found</h2>
        <p className="text-gray-600 mb-6">Please create a store first</p>
        <Link to="/store/create">
          <Button>Create Store</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <Link to="/store/dashboard">
        <Button variant="outline" className="mb-4 sm:mb-6" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </Button>
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Store Settings</h1>
        <p className="text-gray-600">Manage your store information, logo, and location</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Store Information */}
          <div className="space-y-6">
            {/* Store Logo */}
            <Card>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary-600" />
                  Store Logo
                </h2>
                <p className="text-sm text-gray-600">
                  Upload your store logo. This will be displayed in the wheel and everywhere your store is shown.
                </p>
              </div>

              <div className="space-y-4">
                {/* Logo Preview */}
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Store logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Store className="h-10 w-10 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={MENU_ITEM_IMAGE_ACCEPT}
                      onChange={handleImageChange}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="text-sm font-medium">Upload Logo</span>
                    </label>
                    {imageFile && (
                      <button
                        type="button"
                        onClick={clearImage}
                        className="ml-2 inline-flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </button>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      JPEG, PNG, or WebP. Max 2MB.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Store Information */}
            <Card>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary-600" />
                  Store Information
                </h2>
                <p className="text-sm text-gray-600">
                  Update your store name, description, and location.
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  label="Store Name"
                  {...register('name')}
                  error={errors.name?.message}
                  placeholder="e.g., Mama's Kitchen"
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

                {/* Hidden inputs for coordinates */}
                <input type="hidden" {...register('latitude', { valueAsNumber: true })} />
                <input type="hidden" {...register('longitude', { valueAsNumber: true })} />
              </div>
            </Card>
          </div>

          {/* Right Column - Location Map */}
          <div>
            <Card>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-5 w-5 text-primary-600 flex-shrink-0" />
                  <h2 className="text-lg font-semibold text-gray-900">Store Location</h2>
                </div>
                <p className="text-sm text-gray-600">
                  Click on the map to set your store's location. This helps customers find you easily.
                </p>
              </div>

              <LocationMap
                latitude={latitude}
                longitude={longitude}
                onLocationSelect={handleLocationSelect}
                className="w-full"
              />

              {selectedLat != null && selectedLng != null && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Location selected:</strong> {Number(selectedLat).toFixed(6)}, {Number(selectedLng).toFixed(6)}
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Submit Buttons */}
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
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};
