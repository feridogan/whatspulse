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
    // 1. Sıfırlama (Tam Temizleme)
    await prisma.contactGroup.deleteMany({});
    await prisma.contact.deleteMany({});
    await prisma.group.deleteMany({});
    console.log("Mevcut kişi ve gruplar başarıyla sıfırlandı.");

    // 2. Evolution API'den Veri Toplama (Paralel İstekler)
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

    // 3. GRUPLARI ÇEKME VE KAYDETME
    const groupMap = new Map<string, { name: string; description: string; color: string }>();

    for (const group of evoGroups) {
      const groupName = (group.subject || group.name || 'WhatsApp Grubu').trim();
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

    // Ayrıca sohbetler içindeki @g.us gruplarını topla
    for (const ch of evoChats) {
      const rawJid = String(ch.id || ch.remoteJid || '');
      if (rawJid.includes('@g.us')) {
        const groupName = (ch.name || ch.subject || 'WhatsApp Grubu').trim();
        const normalizedKey = groupName.toLowerCase();
        if (groupName && !groupMap.has(normalizedKey)) {
          groupMap.set(normalizedKey, {
            name: groupName,
            description: `WhatsApp Grubu - JID: ${rawJid}`,
            color: '#128C7E',
          });
        }
      }
    }

    const cleanGroups = Array.from(groupMap.values());

    if (cleanGroups.length > 0) {
      await prisma.group.createMany({
        data: cleanGroups,
        skipDuplicates: true,
      });
    }

    // 4. KİŞİLERİ ÇEKME VE İSMİ/NUMARAYI DOĞRU FORMATLAMA
    const contactMap = new Map<string, { phone: string; name: string }>();

    function processContact(item: any) {
      if (!item) return;
      const rawJid = String(item.id || item.remoteJid || item.jid || item.number || '').trim();

      // @g.us, @broadcast, @newsletter içerenleri KİŞİ LİSTESİNE ALMA
      if (
        !rawJid ||
        rawJid.includes('@g.us') ||
        rawJid.includes('@broadcast') ||
        rawJid.includes('@newsletter') ||
        rawJid.includes('@lid') ||
        rawJid.startsWith('status@')
      ) {
        return;
      }

      // Numara Ayıklama
      const cleanNumber = rawJid.split('@')[0].replace(/\D/g, '');
      if (cleanNumber.length < 8) {
        return;
      }

      const phone = `+${cleanNumber}`;

      // İsim Ayıklama
      const rawName = item.pushName || item.name || item.verifiedName || item.notify || item.shortName || '';
      const cleanName = typeof rawName === 'string' ? rawName.trim() : '';
      const isRealName = cleanName.length > 0 && cleanName !== cleanNumber && cleanName !== phone && cleanName.replace(/\D/g, '') !== cleanNumber;
      const contactName = isRealName ? cleanName : phone;

      const existing = contactMap.get(phone);
      if (!existing) {
        contactMap.set(phone, { phone, name: contactName });
      } else if (existing.name === phone && isRealName) {
        contactMap.set(phone, { phone, name: contactName });
      }
    }

    // Hem contacts hem chats listesini işle
    for (const c of evoContacts) {
      processContact(c);
    }
    for (const ch of evoChats) {
      processContact(ch);
    }

    const cleanContacts = Array.from(contactMap.values()).map((c) => ({
      phone: c.phone,
      name: c.name,
      notes: 'WhatsApp Evolution API senkronizasyonu ile eklendi',
    }));

    // Toplu Kayıt (Prisma Bulk Insert)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < cleanContacts.length; i += CHUNK_SIZE) {
      const chunk = cleanContacts.slice(i, i + CHUNK_SIZE);
      await prisma.contact.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }

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
