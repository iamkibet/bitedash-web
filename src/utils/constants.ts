export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://bitedash-api.test/api/v1';
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'BiteDash';

export const ORDER_STATUSES = {
  pending: { label: 'Pending', color: 'warning', icon: '🟡' },
  preparing: { label: 'Preparing', color: 'success', icon: '🟢' },
  on_the_way: { label: 'On the Way', color: 'info', icon: '🔵' },
  delivered: { label: 'Delivered', color: 'success', icon: '✅' },
  cancelled: { label: 'Cancelled', color: 'error', icon: '❌' },
} as const;

export const PAYMENT_STATUSES = {
  unpaid: { label: 'Unpaid', color: 'warning' },
  pending: { label: 'Payment Pending', color: 'warning' },
  paid: { label: 'Paid', color: 'success' },
  failed: { label: 'Failed', color: 'error' },
} as const;

/** Valid status transitions: preparing → on_the_way, on_the_way → delivered. pending → preparing is automatic (payment). */
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  preparing: ['on_the_way'],
  on_the_way: ['delivered'],
  pending: [],
  delivered: [],
  cancelled: [],
};

export const MAX_CART_ITEM_QUANTITY = 50;
export const MIN_PASSWORD_LENGTH = 8;

export const KENYAN_PHONE_REGEX = /^\+254\d{9}$/;

/** Menu item image upload */
export const MENU_ITEM_IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2MB
export const MENU_ITEM_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
