import { format } from 'date-fns';
import { API_BASE_URL } from './constants';

/**
 * Resolve image URL for display. Laravel often returns relative paths (e.g. /storage/...).
 * Those must be requested from the API origin, not the frontend origin.
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  try {
    const origin = new URL(API_BASE_URL).origin;
    return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
  } catch {
    return trimmed;
  }
}

export const formatCurrency = (amount: number | null | undefined): string => {
  const numAmount = amount ?? 0;
  if (isNaN(numAmount) || !isFinite(numAmount)) {
    return 'KES 0';
  }
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(numAmount);
};

export const formatDate = (date: string | Date): string => {
  return format(new Date(date), 'PPp');
};

export const formatDateShort = (date: string | Date): string => {
  return format(new Date(date), 'PP');
};

export const formatTime = (date: string | Date): string => {
  return format(new Date(date), 'p');
};

export const formatPhoneNumber = (phone: string): string => {
  // Ensure phone number is in +254XXXXXXXXX format
  if (phone.startsWith('0')) {
    return '+254' + phone.slice(1);
  }
  if (phone.startsWith('254')) {
    return '+' + phone;
  }
  return phone;
};

export const validatePhoneNumber = (phone: string): boolean => {
  const formatted = formatPhoneNumber(phone);
  return /^\+254\d{9}$/.test(formatted);
};
