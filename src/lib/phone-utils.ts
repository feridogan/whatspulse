/**
 * Normalizes phone numbers to standard format: +905xxxxxxxxx (Turkish mobile) or valid Turkish landlines.
 * Returns null if the number is invalid, non-human JID, or foreign bot/spam number.
 */
export function normalizePhoneNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const str = String(raw).trim();

  // Discard non-human JIDs
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

  // Remove JID domain and all non-digit characters
  const rawDigits = str.split('@')[0].replace(/:.*$/, '').replace(/\D/g, '');

  if (rawDigits.length < 10 || rawDigits.length > 13) {
    return null;
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

  // 13 digits: 00905xxxxxxxxx -> +905xxxxxxxxx
  if (rawDigits.length === 13 && rawDigits.startsWith('0905')) {
    return `+90${rawDigits.substring(3)}`;
  }

  // Reject all others: foreign bot/spam numbers (+238, +409, +447, etc.) and non-mobile
  return null;
}

/**
 * Checks if a name is just a phone number or placeholder
 */
export function isPlaceholderName(name: string | null | undefined, phone: string): boolean {
  if (!name || !name.trim()) return true;
  const cleanName = name.trim().replace(/[^\w]/g, '');
  const cleanPhone = phone.replace(/[^\d]/g, '');
  return cleanName === cleanPhone || cleanName === `+${cleanPhone}` || name.startsWith('+');
}
