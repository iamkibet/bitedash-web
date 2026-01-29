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
import {
  Plus,
  Edit,
  Trash2,
  Power,
  Store,
  Upload,
  X,
  Star,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
} from 'lucide-react';
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
import { cn } from '../../utils/cn';

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
              ratingsMap[item.id] = { ratings: itemRatings, average, count };
            }
          } catch {
            // ignore per-item errors
          }
        }),
      );
      setRatings(ratingsMap);
    } catch {
      // ignore
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
    setExpandedRatings((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const openAddModal = () => {
    setEditingItem(null);
    reset();
    clearImage();
    setIsModalOpen(true);
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
      toast.error(err?.message ?? 'Failed to update availability.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[420px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] px-4 text-center">
        <div className="rounded-2xl bg-gray-100 p-8 mb-6">
          <Store className="h-16 w-16 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No store yet</h2>
        <p className="text-gray-600 text-sm max-w-sm mb-6">
          Create your store first to add and manage menu items.
        </p>
        <Link to="/store/create">
          <Button>Create Store</Button>
        </Link>
      </div>
    );
  }

  const availableCount = menuItems.filter((i) => i.is_available).length;

  return (
    <div className="space-y-6 pb-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
          <p className="text-gray-500 text-sm mt-0.5">{store.name}</p>
        </div>
        <Button onClick={openAddModal} className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2">
          <Plus className="h-4 w-4 shrink-0" aria-hidden />
          <span>Add item</span>
        </Button>
      </div>

      {/* Stats bar */}
      {menuItems.length > 0 && (
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-2">
            <UtensilsCrossed className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {menuItems.length} {menuItems.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2">
            <span className="text-sm font-medium text-emerald-700">
              {availableCount} available
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      {menuItems.length === 0 ? (
        <Card className="text-center py-16 px-6">
          <div className="rounded-2xl bg-gray-100 w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No menu items yet</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
            Add your first dish to start accepting orders from customers.
          </p>
          <Button onClick={openAddModal} className="gap-2">
            <Plus className="h-4 w-4" />
            Add menu item
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {menuItems.map((item) => (
            <Card
              key={item.id}
              padding="none"
              className="overflow-hidden flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-square max-h-32 sm:max-h-36 bg-gray-100 overflow-hidden">
                <MenuItemImage
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-1 right-1">
                  <Badge variant={item.is_available ? 'success' : 'error'} className="text-[10px] px-1.5 py-0 shadow-sm">
                    {item.is_available ? 'On' : 'Off'}
                  </Badge>
                </div>
              </div>
              <div className="p-2.5 sm:p-3 flex flex-col flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h3>
                <p className="text-gray-500 text-xs mb-1 line-clamp-2 flex-1">{item.description}</p>
                <p className="text-base font-bold text-primary-600 mb-2">{formatCurrency(item.price)}</p>

                {/* Ratings - compact */}
                {ratings[item.id] && ratings[item.id].count > 0 && (
                  <div className="mb-2 pt-2">
                    <button
                      type="button"
                      onClick={() => toggleRatingsExpanded(item.id)}
                      className="w-full flex items-center justify-between text-left text-xs text-gray-500 hover:text-gray-700 rounded py-0.5 -mx-0.5 px-0.5 transition-colors"
                    >
                      <span className="flex items-center gap-1">
                        <span className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                'h-3 w-3',
                                star <= Math.floor(ratings[item.id].average)
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-gray-300'
                              )}
                            />
                          ))}
                        </span>
                        <span className="text-gray-500">({ratings[item.id].count})</span>
                      </span>
                      {expandedRatings[item.id] ? (
                        <ChevronUp className="h-3 w-3 text-gray-400 shrink-0" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
                      )}
                    </button>
                    {expandedRatings[item.id] && (
                      <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                        {ratings[item.id].ratings.map((rating) => (
                          <div
                            key={rating.id}
                            className="p-2 rounded bg-gray-50 border border-gray-100 text-xs"
                          >
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={cn(
                                      'h-2.5 w-2.5',
                                      star <= rating.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'
                                    )}
                                  />
                                ))}
                              </span>
                              <span className="text-[10px] text-gray-500 shrink-0">
                                {rating.user?.name ?? 'Anon'} · {new Date(rating.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {rating.comment && (
                              <p className="text-gray-600 line-clamp-2">{rating.comment}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions - icon only */}
                <div className="flex items-center gap-1 mt-auto pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(item)}
                    title="Edit"
                    aria-label="Edit"
                    className="shrink-0 p-1.5 border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleAvailability(item.id)}
                    title={item.is_available ? 'Mark unavailable' : 'Mark available'}
                    aria-label={item.is_available ? 'Mark unavailable' : 'Mark available'}
                    className="shrink-0 p-1.5 border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    <Power className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    title="Delete"
                    aria-label="Delete"
                    className="shrink-0 p-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
          reset();
          clearImage();
        }}
        title={editingItem ? 'Edit menu item' : 'Add menu item'}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingItem(null);
                reset();
                clearImage();
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Item name"
            {...register('name')}
            error={errors.name?.message}
            placeholder="e.g. Grilled Chicken Bowl"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              {...register('description')}
              placeholder="Short description of the dish"
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
            <p className="text-xs text-gray-500 mb-3">Optional · JPEG, PNG or WebP · max 2MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept={MENU_ITEM_IMAGE_ACCEPT}
              onChange={handleImageChange}
              className="sr-only"
              aria-label="Choose menu item image"
            />
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 overflow-hidden transition-colors hover:border-gray-300 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 focus-within:border-primary-400">
              {imagePreview || editingItem?.image_url ? (
                <div className="relative group">
                  <div className="aspect-[4/3] max-h-56 w-full bg-gray-100">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                    ) : editingItem?.image_url ? (
                      <img
                        src={resolveImageUrl(editingItem.image_url) ?? editingItem.image_url}
                        alt={editingItem.name}
                        className="w-full h-full object-contain"
                      />
                    ) : null}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-1.5 bg-white/95 border-white/80 text-gray-800 hover:bg-white hover:border-white shrink-0"
                    >
                      <Upload className="h-4 w-4" />
                      Change
                    </Button>
                    {imagePreview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); clearImage(); }}
                        className="gap-1.5 bg-white/95 border-white/80 text-red-600 hover:bg-red-50 hover:border-red-200 shrink-0"
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
                  className="w-full flex flex-col items-center justify-center gap-3 py-10 px-6 text-left min-h-[140px]"
                >
                  <div className="rounded-full bg-gray-200/80 p-4">
                    <Upload className="h-8 w-8 text-gray-500" strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Click to upload image</span>
                  <span className="text-xs text-gray-400">or drag and drop</span>
                </button>
              )}
            </div>
          </div>

          <Input
            label="Price (KES)"
            type="number"
            step="0.01"
            min={0}
            {...register('price', { valueAsNumber: true })}
            error={errors.price?.message}
            placeholder="0"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="menu-item-available"
              {...register('is_available')}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="menu-item-available" className="text-sm text-gray-700">
              Available for ordering
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};
