import prisma from '@/lib/prisma';
import { EvolutionService } from '@/lib/evolution';
import { normalizePhone } from '@/lib/utils';

export interface SyncResult {
  success: boolean;
  message: string;
  synced: {
    totalContacts: number;
    newContacts: number;
    updatedContacts: number;
    totalGroups: number;
    newGroups: number;
    chats: number;
  };
}

function extractPhone(rawId: any): string | null {
  if (!rawId) return null;
  const str = String(rawId).trim();

  // Filter out groups, newsletters, broadcast, lid, status
  if (
    str.includes('@g.us') ||
    str.includes('@broadcast') ||
    str.includes('@newsletter') ||
    str.includes('@lid') ||
    str.startsWith('status@')
  ) {
    return null;
  }

  const rawDigits = str
    .replace(/@.*$/, '')
    .replace(/:.*$/, '')
    .replace(/\D/g, '');

  if (!rawDigits || rawDigits.length < 8) return null;

  return normalizePhone(rawDigits);
}

function extractName(item: any, fallbackPhone: string): { name: string; isRealName: boolean } {
  const candidates = [
    item.pushName,
    item.name,
    item.verifiedName,
    item.notify,
    item.shortName,
    item.formattedName,
    item.vcard?.formattedName,
    item.businessProfile?.name,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) {
      const trimmed = c.trim();
      const digitsOnly = trimmed.replace(/\D/g, '');
      const phoneDigits = fallbackPhone.replace(/\D/g, '');
      
      // Ensure candidate is not just the phone number
      if (digitsOnly !== phoneDigits && trimmed !== fallbackPhone && trimmed !== `+${phoneDigits}`) {
        return { name: trimmed, isRealName: true };
      }
    }
  }

  return { name: fallbackPhone, isRealName: false };
}

export async function executeWhatsAppSync(): Promise<SyncResult> {
  try {
    // 1. Kesin Sıfırlama (Hard Reset & Transaction)
    await prisma.contactGroup.deleteMany({});
    await prisma.contact.deleteMany({});
    await prisma.group.deleteMany({});
    console.log("Mevcut kişi ve gruplar başarıyla sıfırlandı.");

    // 2. Evolution API v2'den Tam Liste ve Gerçek İsimleri Çekme (Paralel İstekler)
    const [contactsResult, chatsResult, groupsResult] = await Promise.allSettled([
      EvolutionService.fetchContacts(),
      EvolutionService.fetchChats(),
      EvolutionService.fetchGroups(),
    ]);

    const evoContacts = contactsResult.status === 'fulfilled' && Array.isArray(contactsResult.value) 
      ? contactsResult.value 
      : [];
    const evoChats = chatsResult.status === 'fulfilled' && Array.isArray(chatsResult.value) 
      ? chatsResult.value 
      : [];
    const evoGroups = groupsResult.status === 'fulfilled' && Array.isArray(groupsResult.value) 
      ? groupsResult.value 
      : [];

    console.log("Evolution'dan gelen ham kişi sayısı:", evoContacts.length);
    console.log("Evolution'dan gelen sohbet sayısı:", evoChats.length);
    console.log("Evolution'dan gelen grup sayısı:", evoGroups.length);

    // 3. Tekilleştirme ve Doğru İsim Eşleştirme (Map)
    const contactMap = new Map<string, { phone: string; name: string; isRealName: boolean }>();

    // Process Contacts
    for (const c of evoContacts) {
      const rawId = c.id || c.remoteJid || c.number || c.jid;
      const phone = extractPhone(rawId);
      if (!phone) continue;

      const { name, isRealName } = extractName(c, phone);
      const existing = contactMap.get(phone);
      if (!existing) {
        contactMap.set(phone, { phone, name, isRealName });
      } else if (!existing.isRealName && isRealName) {
        contactMap.set(phone, { phone, name, isRealName: true });
      }
    }

    // Process Chats
    for (const ch of evoChats) {
      const rawId = ch.id || ch.remoteJid || ch.jid;
      const phone = extractPhone(rawId);
      if (!phone) continue;

      const { name, isRealName } = extractName(ch, phone);
      const existing = contactMap.get(phone);
      if (!existing) {
        contactMap.set(phone, { phone, name, isRealName });
      } else if (!existing.isRealName && isRealName) {
        contactMap.set(phone, { phone, name, isRealName: true });
      }
    }

    const finalContacts = Array.from(contactMap.values()).map((c) => ({
      phone: c.phone,
      name: c.name,
      notes: 'WhatsApp Evolution API senkronizasyonu ile eklendi',
    }));

    // 4. Batch Insert Contacts (500'erli bloklar)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < finalContacts.length; i += CHUNK_SIZE) {
      const chunk = finalContacts.slice(i, i + CHUNK_SIZE);
      await prisma.contact.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }

    // 5. Grup Verilerini Alma & Kaydetme
    const groupMap = new Map<string, { name: string; description: string }>();

    for (const g of evoGroups) {
      const groupName = (g.subject || g.name || g.id || '').trim();
      if (!groupName || groupName === 'status@broadcast') continue;
      const sizeInfo = g.size ? ` (${g.size} Katılımcı)` : '';
      groupMap.set(groupName.toLowerCase(), {
        name: groupName,
        description: `WhatsApp Grubu${sizeInfo} - JID: ${g.id || ''}`,
      });
    }

    for (const ch of evoChats) {
      const id = String(ch.id || ch.remoteJid || '');
      if (id.includes('@g.us')) {
        const groupName = (ch.name || ch.subject || id).trim();
        if (groupName && !groupMap.has(groupName.toLowerCase())) {
          groupMap.set(groupName.toLowerCase(), {
            name: groupName,
            description: `WhatsApp Grubu - JID: ${id}`,
          });
        }
      }
    }

    const finalGroups = Array.from(groupMap.values()).map((g) => ({
      name: g.name,
      description: g.description,
      color: '#128C7E',
    }));

    if (finalGroups.length > 0) {
      await prisma.group.createMany({
        data: finalGroups,
        skipDuplicates: true,
      });
    }

    console.log("İşlenen ve kaydedilen net kişi sayısı:", finalContacts.length);
    console.log("İşlenen ve kaydedilen net grup sayısı:", finalGroups.length);

    const formattedMessage = `Senkronizasyon Başarılı: ${finalContacts.length.toLocaleString('tr-TR')} Kişi ve ${finalGroups.length} Grup yüklendi.`;

    return {
      success: true,
      message: formattedMessage,
      synced: {
        totalContacts: finalContacts.length,
        newContacts: finalContacts.length,
        updatedContacts: 0,
        totalGroups: finalGroups.length,
        newGroups: finalGroups.length,
        chats: evoChats.length,
      },
    };
  } catch (error: any) {
    console.error("SYNC HATASI:", error.response?.data || error.message);
    throw error;
  }
}
