import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes phone numbers to standard format (digits only, prepending country code if missing)
 * E.g. '0555 123 45 67' -> '905551234567'
 */
export function normalizePhone(rawPhone: string, defaultCountryCode = '90'): string {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).replace(/^\++/, '').replace(/\D/g, '');

  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0')) {
    cleaned = defaultCountryCode + cleaned.substring(1);
  } else if (cleaned.length === 10 && !cleaned.startsWith(defaultCountryCode)) {
    cleaned = defaultCountryCode + cleaned;
  }

  return cleaned;
}

export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';
  const digits = normalizePhone(phone);
  if (digits.startsWith('90') && digits.length === 12) {
    return `+90 (${digits.substring(2, 5)}) ${digits.substring(5, 8)} ${digits.substring(8, 10)} ${digits.substring(10, 12)}`;
  }
  return `+${digits}`;
}

export function replacePlaceholders(template: string, data: Record<string, any>): string {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (data[key] !== undefined && data[key] !== null) {
      return String(data[key]);
    }
    // Check common fallbacks
    if (key.toLowerCase() === 'isim' && data['name']) return String(data['name']);
    if (key.toLowerCase() === 'name' && data['isim']) return String(data['isim']);
    if (key.toLowerCase() === 'telefon' && data['phone']) return String(data['phone']);
    if (key.toLowerCase() === 'phone' && data['telefon']) return String(data['telefon']);
    if (key.toLowerCase() === 'tarih') return new Date().toLocaleDateString('tr-TR');
    if (key.toLowerCase() === 'saat') return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return match;
  });
}
