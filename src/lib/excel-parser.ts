import * as XLSX from 'xlsx';
import { normalizePhone } from './utils';
import { ParsedContact } from './vcard-parser';

export function parseExcelBuffer(buffer: Buffer): ParsedContact[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const contacts: ParsedContact[] = [];

  for (const row of rows) {
    // Find keys for name, phone, email, notes
    const keys = Object.keys(row);
    let name = '';
    let rawPhone = '';
    let email = '';
    let notes = '';
    const customFields: Record<string, any> = {};

    for (const key of keys) {
      const lowerKey = key.toLowerCase().trim();
      const val = String(row[key] || '').trim();
      if (!val) continue;

      if (['ad', 'isim', 'ad soyad', 'name', 'full name', 'fullname', 'müşteri'].includes(lowerKey)) {
        name = val;
      } else if (['tel', 'telefon', 'phone', 'gsm', 'mobile', 'cep', 'numara', 'number'].includes(lowerKey)) {
        rawPhone = val;
      } else if (['email', 'e-posta', 'eposta', 'mail'].includes(lowerKey)) {
        email = val;
      } else if (['not', 'note', 'notes', 'açıklama'].includes(lowerKey)) {
        notes = val;
      } else {
        customFields[key] = val;
      }
    }

    // If no explicit phone column found, scan values for something that looks like a phone
    if (!rawPhone) {
      for (const key of keys) {
        const val = String(row[key] || '').trim();
        const cleaned = val.replace(/\D/g, '');
        if (cleaned.length >= 10 && cleaned.length <= 13) {
          rawPhone = val;
          break;
        }
      }
    }

    const phone = normalizePhone(rawPhone);
    if (phone) {
      contacts.push({
        name: name || `Kişi ${phone.slice(-4)}`,
        phone: phone,
        email: email || undefined,
        notes: notes || undefined,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      });
    }
  }

  return contacts;
}
