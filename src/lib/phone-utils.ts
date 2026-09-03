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

  // 2. Turkish Landlines & Toll-free numbers (02xx, 03xx, 04xx, 0850):
  if (rawDigits.length === 10 && (rawDigits.startsWith('2') || rawDigits.startsWith('3') || rawDigits.startsWith('4') || rawDigits.startsWith('850'))) {
    return `+90${rawDigits}`;
  }
  if (rawDigits.length === 11 && (rawDigits.startsWith('02') || rawDigits.startsWith('03') || rawDigits.startsWith('04') || rawDigits.startsWith('0850'))) {
    return `+90${rawDigits.substring(1)}`;
  }
  if (rawDigits.length === 12 && (rawDigits.startsWith('902') || rawDigits.startsWith('903') || rawDigits.startsWith('904') || rawDigits.startsWith('90850'))) {
    return `+${rawDigits}`;
  }

  // Corrupted Turkish mobile with 10 digits starting with 5 at the end
  if (rawDigits.length >= 10) {
    const last10 = rawDigits.slice(-10);
    if (last10.startsWith('5')) {
      return `+90${last10}`;
    }
  }

  // Foreign bot / spam numbers (+238, +409, +447, +463, +874, +945 etc.)
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
