import prisma from '@/lib/prisma';
import { EvolutionService } from '@/lib/evolution';

export interface SyncResult {
  success: boolean;
  contactsCount: number;
  groupsCount: number;
  message: string;
}

export async function executeWhatsAppSync(): Promise<SyncResult> {
  try {
    // 1. Sıfırlama (Reset)
    await prisma.contactGroup.deleteMany({});
    await prisma.contact.deleteMany({});
    await prisma.group.deleteMany({});
    console.log("Mevcut kişi ve gruplar başarıyla sıfırlandı.");

    // 2. Evolution API'den Veri Toplama (Kişi ve Grup Ayrımı)
    const [groupsResult, contactsResult, chatsResult] = await Promise.allSettled([
      EvolutionService.fetchGroups(),
      EvolutionService.fetchContacts(),
      EvolutionService.fetchChats(),
    ]);

    const evoGroups = groupsResult.status === 'fulfilled' && Array.isArray(groupsResult.value) 
      ? groupsResult.value 
      : [];
    const evoContacts = contactsResult.status === 'fulfilled' && Array.isArray(contactsResult.value) 
      ? contactsResult.value 
      : [];
    const evoChats = chatsResult.status === 'fulfilled' && Array.isArray(chatsResult.value) 
      ? chatsResult.value 
      : [];

    // GRUPLAR İÇİN:
    const groupMap = new Map<string, { name: string; description: string; color: string }>();

    for (const group of evoGroups) {
      const groupName = (group.subject || group.name || 'İsimsiz Grup').trim();
      if (!groupName || groupName === 'status@broadcast') continue;

      const size = group.size || (Array.isArray(group.participants) ? group.participants.length : 0);
      const sizeText = size > 0 ? ` (${size} Katılımcı)` : '';
      const jid = group.id || '';

      const normalizedKey = groupName.toLowerCase();
      if (!groupMap.has(normalizedKey)) {
        groupMap.set(normalizedKey, {
          name: groupName,
          description: `WhatsApp Grubu${sizeText} - JID: ${jid}`,
          color: '#128C7E',
        });
      }
    }

    const cleanGroups = Array.from(groupMap.values());

    if (cleanGroups.length > 0) {
      await prisma.group.createMany({
        data: cleanGroups,
        skipDuplicates: true,
      });
    }

    // KİŞİLER İÇİN:
    const contactMap = new Map<string, { phone: string; name: string; isRealName: boolean }>();

    function processContactItem(item: any) {
      if (!item) return;
      const rawId = String(item.id || item.remoteJid || item.jid || item.number || '').trim();

      // SADECE @s.whatsapp.net ile biten veya grup olmayan kayıtları işle
      // (@g.us, @broadcast, status@broadcast, @newsletter içerenleri kesinlikle KİŞİ OLARAK EKLEME)
      if (
        !rawId ||
        rawId.includes('@g.us') ||
        rawId.includes('@broadcast') ||
        rawId.includes('@newsletter') ||
        rawId.includes('@lid') ||
        rawId.startsWith('status@')
      ) {
        return;
      }

      // Telefon Numarası Temizleme:
      const phoneOnly = rawId
        .replace(/@.*$/, '')
        .replace(/:.*$/, '')
        .replace(/\D/g, '');

      // Eğer phoneOnly 10 haneden kısaysa veya geçersizse bu kaydı atla
      if (phoneOnly.length < 10) {
        return;
      }

      // Numarayı + ile başlat
      const phone = `+${phoneOnly}`;

      // İsim Ayrıştırma:
      const fullName = String(
        item.pushName || 
        item.name || 
        item.verifiedName || 
        item.notify || 
        item.shortName || 
        item.formattedName || 
        ''
      ).trim();

      const hasRealName = !!fullName && fullName !== phone && fullName !== phoneOnly && fullName !== `+${phoneOnly}`;
      const name = hasRealName ? fullName : phone;

      const existing = contactMap.get(phone);
      if (!existing) {
        contactMap.set(phone, { phone, name, isRealName: hasRealName });
      } else if (!existing.isRealName && hasRealName) {
        contactMap.set(phone, { phone, name, isRealName: true });
      }
    }

    // Hem contacts hem chats listesini birleştir
    for (const c of evoContacts) {
      processContactItem(c);
    }
    for (const ch of evoChats) {
      processContactItem(ch);
    }

    const cleanContacts = Array.from(contactMap.values()).map((c) => ({
      phone: c.phone,
      name: c.name,
      notes: 'WhatsApp Evolution API senkronizasyonu ile eklendi',
    }));

    // 3. Mükerrer Kontrolü ve Toplu Kayıt (Bulk Insert - 500'erli bloklar)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < cleanContacts.length; i += CHUNK_SIZE) {
      const chunk = cleanContacts.slice(i, i + CHUNK_SIZE);
      await prisma.contact.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }

    // 4. Loglama ve Geri Bildirim
    console.log("Çekilen Grup Sayısı:", cleanGroups.length);
    console.log("Çekilen Kişi Sayısı:", cleanContacts.length);

    const message = `Senkronizasyon Başarılı: ${cleanContacts.length.toLocaleString('tr-TR')} Kişi ve ${cleanGroups.length} Grup yüklendi.`;

    return {
      success: true,
      contactsCount: cleanContacts.length,
      groupsCount: cleanGroups.length,
      message,
    };
  } catch (error: any) {
    console.error("SYNC HATASI:", error.response?.data || error.message);
    throw error;
  }
}
