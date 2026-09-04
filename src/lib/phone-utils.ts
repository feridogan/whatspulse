/**
 * Normalizes phone numbers to standard format: +905xxxxxxxxx (Turkish mobile) or valid international E.164.
 * Returns null if the number is invalid, non-human JID, or invalid length.
 */
export function normalizePhoneNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const str = String(raw).trim();

  // Discard non-human and group JIDs
  if (
    str.includes('@lid') || 
    str.includes('@g.us') || 
    str.includes('@broadcast') || 
    str.includes('@newsletter') || 
    str.includes('@hosted') ||
    str.includes('status')
  ) {
    return null;
  }

  // Remove JID domain (@s.whatsapp.net) and any device ID (:1, :2)
  let rawDigits = str.split('@')[0].replace(/:.*$/, '').replace(/\D/g, '');

  if (rawDigits.length < 9 || rawDigits.length > 15) {
    return null;
  }

  // Handle leading 00 (e.g. 00905... or 0049...)
  if (rawDigits.startsWith('00')) {
    rawDigits = rawDigits.substring(2);
  }

  // 1. Turkish Mobile numbers (5xx xxx xx xx):
  // 10 digits: 5xxxxxxxxx -> +905xxxxxxxxx
  if (rawDigits.length === 10 && rawDigits.startsWith('5')) {
    return `+90${rawDigits}`;
  }

  // 11 digits: 05xxxxxxxxx -> +905xxxxxxxxx
  if (rawDigits.length === 11 && rawDigits.startsWith('05')) {
    return `+90${rawDigits.substring(1)}`;
  }

  // 12 digits: 905xxxxxxxxx -> +905xxxxxxxxx
  if (rawDigits.length === 12 && rawDigits.startsWith('905')) {
    return `+${rawDigits}`;
  }

  // 13 digits: 0905xxxxxxxxx -> +905xxxxxxxxx
  if (rawDigits.length === 13 && rawDigits.startsWith('0905')) {
    return `+90${rawDigits.substring(3)}`;
  }

  // Turkish landlines (2xx, 3xx, 4xx, 8xx):
  if (rawDigits.length === 10 && (rawDigits.startsWith('2') || rawDigits.startsWith('3') || rawDigits.startsWith('4') || rawDigits.startsWith('8'))) {
    return `+90${rawDigits}`;
  }
  if (rawDigits.length === 11 && rawDigits.startsWith('0')) {
    return `+90${rawDigits.substring(1)}`;
  }
  if (rawDigits.length === 12 && rawDigits.startsWith('90')) {
    return `+${rawDigits}`;
  }

  // 2. Standard International format (+<country_code><digits>):
  return `+${rawDigits}`;
}

/**
 * Validates whether a name is a genuine human/business contact name.
 * Must start with a real letter and contain at least 2 letters.
 * Rejects empty names, symbols, leading dots/punctuation, and numbers.
 */
export function isValidContactName(name: string | null | undefined, phone?: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) return false;

  // Must strictly start with a letter (Latin, Turkish, or other alphabets)
  // Rejects anything starting with '.', ',', '-', '_', '+', numbers, emojis, etc.
  if (!/^\p{L}/u.test(trimmed)) {
    return false;
  }

  // Must contain at least two letters
  const letterCount = (trimmed.match(/\p{L}/gu) || []).length;
  if (letterCount < 2) {
    return false;
  }

  // Reject strings made up only of phone characters / digits / separators
  if (/^[\d\s+\-()./]+$/.test(trimmed)) {
    return false;
  }

  // If phone is provided, check if digits match the phone number
  if (phone) {
    const cleanName = trimmed.replace(/\D/g, '');
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanName && cleanPhone && (cleanName === cleanPhone || cleanPhone.endsWith(cleanName))) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if a name is just a phone number or placeholder
 */
export function isPlaceholderName(name: string | null | undefined, phone: string): boolean {
  return !isValidContactName(name, phone);
}

