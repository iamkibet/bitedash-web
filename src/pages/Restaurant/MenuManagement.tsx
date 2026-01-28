import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { menuItemsApi } from '../../api/menuItems';
import type { MenuItem } from '../../types/order.types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Spinner } from '../../components/common/Spinner';
import { formatCurrency, resolveImageUrl } from '../../utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { menuItemSchema } from '../../utils/validators';
import { Plus, Edit, Trash2, Power, Store, Upload, X, Star, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { restaurantsApi } from '../../api/restaurants';
import { ratingsApi, type Rating } from '../../api/ratings';
import { toast } from 'sonner';
import {
  MENU_ITEM_IMAGE_ACCEPT,
  MENU_ITEM_IMAGE_MAX_BYTES,
} from '../../utils/constants';
import { validateMenuItemImage } from '../../utils/validators';
import { MenuItemImage } from '../../components/common/MenuItemImage';
import type { Restaurant } from '../../types/restaurant.types';

type MenuItemFormData = {
  name: string;
  description: string;
  price: number;
  is_available: boolean;
};

export const MenuManagement = () => {
  const [store, setStore] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ratings, setRatings] = useState<Record<number, { ratings: Rating[]; average: number; count: number }>>({});
  const [expandedRatings, setExpandedRatings] = useState<Record<number, boolean>>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      is_available: true,
    },
  });

  useEffect(() => {
    fetchStoreAndMenu();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const fetchStoreAndMenu = async () => {
    try {
      setIsLoading(true);
      const myStore = await restaurantsApi.getMyStore();
      setStore(myStore);
      if (myStore) {
        const items = await menuItemsApi.getByRestaurant(myStore.id);
        setMenuItems(items);
        // Fetch ratings for all menu items
        await fetchRatingsForItems(items);
      }
    } catch (error) {
      console.error('Failed to fetch store or menu:', error);
      toast.error('Failed to load menu. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRatingsForItems = async (items: MenuItem[]) => {
    try {
      const ratingsMap: Record<number, { ratings: Rating[]; average: number; count: number }> = {};

      await Promise.all(
        items.map(async (item) => {
          try {
            const response = await ratingsApi.getByMenuItem(item.id);
            const itemRatings = response.data || [];
            
            // Calculate average if not provided
            let average = 0;
            let count = itemRatings.length;
            
            if (response.stats) {
              average = response.stats.average_rating;
              count = response.stats.total_ratings;
            } else if (itemRatings.length > 0) {
              const sum = itemRatings.reduce((acc, r) => acc + r.rating, 0);
              average = sum / itemRatings.length;
            }
            
            if (count > 0) {
              ratingsMap[item.id] = {
                ratings: itemRatings,
                average,
                count,
              };
            }
          } catch (error) {
            // Ignore errors for individual items
            console.error(`Failed to fetch ratings for item ${item.id}:`, error);
          }
        }),
      );

      setRatings(ratingsMap);
    } catch (error) {
      console.error('Failed to fetch ratings:', error);
    }
  };

  const fetchMenuItems = async () => {
    if (!store) return;
    try {
      const items = await menuItemsApi.getByRestaurant(store.id);
      setMenuItems(items);
      await fetchRatingsForItems(items);
    } catch (error) {
      console.error('Failed to fetch menu items:', error);
      toast.error('Failed to load menu items.');
    }
  };

  const toggleRatingsExpanded = (itemId: number) => {
    setExpandedRatings((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const onSubmit = async (data: MenuItemFormData) => {
    if (!store) return;

    try {
      if (editingItem) {
        await menuItemsApi.update(
          editingItem.id,
          {
            name: data.name,
            description: data.description,
            price: data.price,
            is_available: data.is_available,
          },
          imageFile ?? undefined
        );
        toast.success('Menu item updated.');
      } else {
        await menuItemsApi.create(
          { ...data, restaurant_id: store.id },
          imageFile ?? undefined
        );
        toast.success('Menu item added.');
      }
      setIsModalOpen(false);
      reset();
      setEditingItem(null);
      clearImage();
      fetchMenuItems();
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Failed to save menu item:', error);
      toast.error(err?.message ?? 'Failed to save menu item.');
    }
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateMenuItemImage(file, MENU_ITEM_IMAGE_MAX_BYTES);
    if (err) {
      toast.error(err);
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    clearImage();
    reset({
      name: item.name,
      description: item.description,
      price: item.price,
      is_available: item.is_available,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await menuItemsApi.delete(id);
      toast.success('Menu item removed.');
      fetchMenuItems();
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Failed to delete menu item:', error);
      toast.error(err?.message ?? 'Failed to delete menu item.');
    }
  };

  const handleToggleAvailability = async (id: number) => {
    try {
      await menuItemsApi.toggleAvailability(id);
      toast.success('Availability updated.');
      fetchMenuItems();
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Failed to toggle availability:', error);
      toast.error(err?.message ?? 'Failed to update availability.');
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
        <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">No store yet</h2>
        <p className="text-gray-600 mb-6">Create your store first to manage menu items.</p>
        <Link to="/store/create">
          <Button>Create Store</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-gray-600 text-sm mt-1">{store.name}</p>
        </div>
        <Button
          onClick={() => {
            setEditingItem(null);
            reset();
            clearImage();
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Menu Item
        </Button>
      </div>

      {menuItems.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500 py-8">No menu items yet. Add your first item!</p>
          <div className="flex justify-center">
            <Button
              onClick={() => {
                setEditingItem(null);
                reset();
                clearImage();
                setIsModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Menu Item
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Card key={item.id}>
              <div className="mb-4">
                <MenuItemImage src={item.image_url} alt={item.name} />
              </div>
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-semibold text-gray-900">{item.name}</h3>
                <Badge variant={item.is_available ? 'success' : 'error'}>
                  {item.is_available ? 'Available' : 'Unavailable'}
                </Badge>
              </div>
              <p className="text-gray-600 text-sm mb-3">{item.description}</p>
              <p className="text-2xl font-bold text-primary-600 mb-3">
                {formatCurrency(item.price)}
              </p>
              
              {/* Ratings Section */}
              {ratings[item.id] && ratings[item.id].count > 0 && (
                <div className="mb-4 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => toggleRatingsExpanded(item.id)}
                    className="w-full flex items-center justify-between text-left hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${
                              star <= Math.floor(ratings[item.id].average)
                                ? 'text-yellow-400 fill-current'
                                : star === Math.ceil(ratings[item.id].average) && ratings[item.id].average % 1 >= 0.5
                                ? 'text-yellow-400 fill-current opacity-50'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {ratings[item.id].average.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({ratings[item.id].count} {ratings[item.id].count === 1 ? 'rating' : 'ratings'})
                      </span>
                    </div>
                    {expandedRatings[item.id] ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                  
                  {expandedRatings[item.id] && (
                    <div className="mt-3 space-y-3 max-h-64 overflow-y-auto">
                      {ratings[item.id].ratings.map((rating) => (
                        <div key={rating.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-3 w-3 ${
                                      star <= rating.rating
                                        ? 'text-yellow-400 fill-current'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-gray-500">
                                {rating.user?.name || 'Anonymous'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(rating.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {rating.comment && (
                            <div className="mt-2 flex items-start gap-2">
                              <MessageSquare className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                              <p className="text-sm text-gray-700 flex-1">{rating.comment}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(item)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleAvailability(item.id)}
                >
                  <Power className="h-4 w-4" />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
          reset();
          clearImage();
        }}
        title={editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingItem(null);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)}>
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Item Name"
            {...register('name')}
            error={errors.name?.message}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image <span className="text-gray-400 font-normal">(optional, JPEG/PNG/WebP, max 2MB)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={MENU_ITEM_IMAGE_ACCEPT}
              onChange={handleImageChange}
              className="sr-only"
              aria-label="Choose menu item image"
            />
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-full sm:w-48 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full aspect-[4/3] object-cover"
                  />
                ) : editingItem?.image_url ? (
                  <img
                    src={resolveImageUrl(editingItem.image_url) || editingItem.image_url}
                    alt={editingItem.name}
                    className="w-full aspect-[4/3] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-1 text-gray-400">
                    <Upload className="h-8 w-8" strokeWidth={1.5} />
                    <span className="text-xs">No image</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {imagePreview || editingItem?.image_url ? 'Change' : 'Choose'}
                </Button>
                {imagePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearImage}
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Input
            label="Price (KES)"
            type="number"
            step="0.01"
            {...register('price', { valueAsNumber: true })}
            error={errors.price?.message}
          />
          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('is_available')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">Available</label>
          </div>
        </form>
      </Modal>
    </div>
  );
};
