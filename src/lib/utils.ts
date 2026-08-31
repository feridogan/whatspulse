import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes phone numbers to standard format (digits only, prepending country code if missing)
 * E.g. '0535 123 45 67' -> '905351234567'
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

export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const digits = normalizePhone(phone);
  return `+${digits}`;
}

export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';
  const digits = normalizePhone(phone);
  if (digits.startsWith('90') && digits.length === 12) {
    return `+90 ${digits.substring(2, 5)} ${digits.substring(5, 8)} ${digits.substring(8, 10)} ${digits.substring(10, 12)}`;
  }
  return `+${digits}`;
}

/**
 * Replaces placeholders in template string with contact data.
 * Supports: {ad}, {soyad}, {isim}, {name}, {telefon}, {phone}, {email}, {tarih}, {saat},
 * plus any custom field key (case-insensitive).
 */
export function replacePlaceholders(template: string, data: Record<string, any>): string {
  if (!template) return '';

  const fullName = String(data.name || data.isim || data.fullname || '').trim();
  let firstName = '';
  let lastName = '';
  if (fullName) {
    const parts = fullName.split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }

  const normalizedLookup: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    normalizedLookup[k.toLowerCase().trim()] = v;
    if (k.toLowerCase() === 'customfields' && v && typeof v === 'object') {
      for (const [ck, cv] of Object.entries(v as Record<string, any>)) {
        normalizedLookup[ck.toLowerCase().trim()] = cv;
      }
    }
  }

  return template.replace(/\{([^}]+)\}/g, (match, rawKey) => {
    const key = rawKey.trim();
    const lowerKey = key.toLowerCase();

    // Standard replacements
    if (lowerKey === 'ad' || lowerKey === 'first_name' || lowerKey === 'firstname') {
      return firstName || fullName || match;
    }
    if (lowerKey === 'soyad' || lowerKey === 'last_name' || lowerKey === 'lastname') {
      return lastName || match;
    }
    if (lowerKey === 'isim' || lowerKey === 'name' || lowerKey === 'ad_soyad' || lowerKey === 'adsoyad' || lowerKey === 'fullname') {
      return fullName || match;
    }
    if (lowerKey === 'telefon' || lowerKey === 'phone' || lowerKey === 'gsm' || lowerKey === 'tel') {
      return String(data.phone || data.telefon || '');
    }
    if (lowerKey === 'email' || lowerKey === 'eposta' || lowerKey === 'e-posta') {
      return String(data.email || data.eposta || '');
    }
    if (lowerKey === 'tarih') {
      return new Date().toLocaleDateString('tr-TR');
    }
    if (lowerKey === 'saat') {
      return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }

    // Direct lookup in custom fields / data
    if (normalizedLookup[lowerKey] !== undefined && normalizedLookup[lowerKey] !== null) {
      return String(normalizedLookup[lowerKey]);
    }

    return match;
  });
}
