import { z } from 'zod';
import { KENYAN_PHONE_REGEX, MIN_PASSWORD_LENGTH } from './constants';

export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .refine(
    (phone) => {
      const formatted = phone.startsWith('0') 
        ? '+254' + phone.slice(1)
        : phone.startsWith('254')
        ? '+' + phone
        : phone;
      return KENYAN_PHONE_REGEX.test(formatted);
    },
    { message: 'Phone number must be in format: +254XXXXXXXXX' }
  );

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one symbol');

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: phoneSchema,
    password: passwordSchema,
    password_confirmation: z.string(),
    role: z.enum(['customer', 'restaurant', 'rider'], {
      errorMap: () => ({ message: 'Invalid role selected' }),
    }),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  });

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const orderSchema = z.object({
  restaurant_id: z.number().min(1, 'Restaurant is required'),
  items: z
    .array(
      z.object({
        menu_item_id: z.number().min(1),
        quantity: z.number().min(1).max(50),
      })
    )
    .min(1, 'At least one item is required'),
  delivery_address: z.string().min(1, 'Delivery address is required').max(500),
  notes: z.string().max(1000).optional(),
});

export const paymentSchema = z.object({
  phone_number: phoneSchema,
});

export const restaurantSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  description: z.string().min(1, 'Description is required'),
  location: z.string().min(1, 'Location is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const menuItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.number().min(0.01, 'Price must be greater than 0'),
  is_available: z.boolean().default(true),
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateMenuItemImage(file: File, maxBytes: number): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Image must be JPEG, PNG, or WebP.';
  }
  if (file.size > maxBytes) {
    return `Image must be under ${Math.round(maxBytes / 1024 / 1024)}MB.`;
  }
  return null;
}
