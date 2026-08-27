import { normalizePhone } from './utils';

export interface ParsedContact {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  customFields?: Record<string, any>;
}

/**
 * Parses vCard (.vcf) file content (supports 2.1, 3.0, 4.0)
 */
export function parseVCard(vcardText: string): ParsedContact[] {
  const contacts: ParsedContact[] = [];
  // Split into individual vCard blocks
  const cards = vcardText.split(/BEGIN:VCARD/i).filter((card) => card.trim().length > 0);

  for (const card of cards) {
    const lines = card.split(/\r\n|\r|\n/);
    let name = '';
    let phone = '';
    let email = '';
    let note = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      // Handle folded lines (lines starting with space or tab)
      while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
        i++;
        line += lines[i].trim();
      }

      if (!line) continue;

      if (line.match(/^FN([;:][\s\S]*)$/i)) {
        const parts = line.split(':');
        if (parts.length > 1) {
          name = parts.slice(1).join(':').trim();
        }
      } else if (!name && line.match(/^N([;:][\s\S]*)$/i)) {
        const parts = line.split(':');
        if (parts.length > 1) {
          const nameParts = parts.slice(1).join(':').split(';').map(p => p.trim()).filter(Boolean);
          name = nameParts.reverse().join(' ').trim();
        }
      } else if (line.match(/^TEL([;:][\s\S]*)$/i)) {
        const parts = line.split(':');
        if (parts.length > 1) {
          const rawTel = parts.slice(1).join(':').trim();
          const cleaned = normalizePhone(rawTel);
          if (cleaned && !phone) {
            phone = cleaned;
          }
        }
      } else if (line.match(/^EMAIL([;:][\s\S]*)$/i)) {
        const parts = line.split(':');
        if (parts.length > 1) {
          email = parts.slice(1).join(':').trim();
        }
      } else if (line.match(/^NOTE([;:][\s\S]*)$/i)) {
        const parts = line.split(':');
        if (parts.length > 1) {
          note = parts.slice(1).join(':').trim();
        }
      }
    }

    if (phone) {
      contacts.push({
        name: name || `Kişi ${phone.slice(-4)}`,
        phone: phone,
        email: email || undefined,
        notes: note || undefined,
      });
    }
  }

  return contacts;
}
