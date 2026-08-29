import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEvolutionConfig, EvolutionService } from '@/lib/evolution';
import { normalizePhone, formatPhoneNumber, formatPhoneDisplay } from '@/lib/utils';
import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

/**
 * Extracts and strictly normalizes phone number from an Evolution API contact/chat/participant object.
 * Discards WhatsApp Multi-Device LID identifiers (e.g. 524..., 549... with 11-16 digits).
 */
function extractValidPhoneNumber(item: any): string | null {
  if (!item) return null;
  const candidates = [
    item.phoneNumber,
    item.number,
    item.phone,
    item.user,
    item.jid,
    item.remoteJid,
    item.id,
  ];

  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    const str = raw.trim();
    if (
      str.includes('@g.us') ||
      str.includes('@broadcast') ||
      str.includes('@newsletter') ||
      str.includes('@lid') ||
      str.startsWith('status@')
    ) {
      continue;
    }

    const digits = str.split('@')[0].replace(/:.*$/, '').replace(/\D/g, '');
    if (!digits || digits.length < 10) continue;

    // 1. Standard Turkish mobile number: 905XXXXXXXXX (12 digits)
    if (digits.startsWith('905') && digits.length === 12) {
      return `+${digits}`;
    }

    // 2. 10-digit Turkish mobile number: 5XXXXXXXXX -> +905XXXXXXXXX
    if (digits.startsWith('5') && digits.length === 10) {
      return `+90${digits}`;
    }

    // 3. 11-digit Turkish mobile number: 05XXXXXXXXX -> +905XXXXXXXXX
    if (digits.startsWith('05') && digits.length === 11) {
      return `+90${digits.substring(1)}`;
    }

    // 4. Standard Turkish fixed / landline: 902XX / 903XX / 904XX / 908XX (12 digits)
    if (digits.startsWith('90') && digits.length === 12) {
      return `+${digits}`;
    }

    // 5. Detect WhatsApp LID identifiers (starts with 52, 54, 55 with length 11, 13, 14, 15, 16):
    if (
      (digits.startsWith('52') || digits.startsWith('54') || digits.startsWith('55')) &&
      digits.length !== 10 &&
      !digits.startsWith('90')
    ) {
      continue;
    }

    // 6. Valid international number (10 to 14 digits)
    if (digits.length >= 10 && digits.length <= 14) {
      return `+${digits}`;
    }
  }

  return null;
}

export async function POST() {
  try {
    const config = await getEvolutionConfig();
    const baseURL = config.apiUrl.replace(/\/$/, '');
    const instanceName = config.instanceName || 'ff';
    const apiKey = config.globalApiKey || config.instanceKey || '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a';

    const headers = {
      'apikey': apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'WhatsPulse/1.0.0 (Evolution API Sync)',
    };

    console.log(`[Sync] Evolution API bağlantısı başlatılıyor: ${baseURL}/chat/findContacts/${instanceName}`);

    // Auto-configure Webhook on Evolution API
    EvolutionService.configureWebhook('https://mesaj.cakirlar.net/api/webhook', instanceName).catch((e) => {
      console.warn('[Sync Auto-Webhook Warning]:', e.message);
    });

    // 1. Reset old data
    await prisma.contactGroup.deleteMany({}).catch(() => {});
    await prisma.contact.deleteMany({});
    await prisma.group.deleteMany({});
    console.log("Mevcut WhatsPulse kişi ve grupları başarıyla sıfırlandı.");

    // 2. Fetch contacts, chats, and groups WITH participants (getParticipants=true)
    const [contactsRes, chatsRes, groupsRes] = await Promise.allSettled([
      axios.post(`${baseURL}/chat/findContacts/${encodeURIComponent(instanceName)}`, { where: {}, limit: 5000 }, { headers, httpsAgent, timeout: 25000 }),
      axios.post(`${baseURL}/chat/findChats/${encodeURIComponent(instanceName)}`, { where: {}, limit: 5000 }, { headers, httpsAgent, timeout: 25000 }).catch(() => 
        axios.get(`${baseURL}/chat/findChats/${encodeURIComponent(instanceName)}`, { headers, httpsAgent, timeout: 25000 })
      ),
      axios.get(`${baseURL}/group/fetchAllGroups/${encodeURIComponent(instanceName)}?getParticipants=true`, { headers, httpsAgent, timeout: 25000 }).catch(() =>
        axios.get(`${baseURL}/group/fetchAllGroups/${encodeURIComponent(instanceName)}`, { headers, httpsAgent, timeout: 25000 })
      )
    ]);

    let rawContacts = contactsRes.status === 'fulfilled' ? contactsRes.value.data : [];
    if (rawContacts && typeof rawContacts === 'object' && !Array.isArray(rawContacts)) {
      rawContacts = rawContacts.contacts || rawContacts.data || rawContacts.items || [];
    }
    if (!Array.isArray(rawContacts)) rawContacts = [];

    let rawChats = chatsRes.status === 'fulfilled' ? chatsRes.value.data : [];
    if (rawChats && typeof rawChats === 'object' && !Array.isArray(rawChats)) {
      rawChats = rawChats.chats || rawChats.data || rawChats.items || [];
    }
    if (!Array.isArray(rawChats)) rawChats = [];

    let rawGroups = groupsRes.status === 'fulfilled' ? groupsRes.value.data : [];
    if (rawGroups && typeof rawGroups === 'object' && !Array.isArray(rawGroups)) {
      rawGroups = rawGroups.groups || rawGroups.data || rawGroups.items || [];
    }
    if (!Array.isArray(rawGroups)) rawGroups = [];

    console.log(`[Sync Gelen] Ham Kişi: ${rawContacts.length}, Sohbet: ${rawChats.length}, Grup: ${rawGroups.length}`);

    // 3. Process and save Contacts first (from rawContacts & rawChats)
    const combinedList = [...rawContacts, ...rawChats];
    const contactMap = new Map<string, { name: string; phone: string; email?: string; notes?: string }>();

    for (const item of combinedList) {
      const validPhone = extractValidPhoneNumber(item);
      if (!validPhone) continue;

      const cleanDigits = normalizePhone(validPhone);
      const phone = `+${cleanDigits}`;

      const rawName = (
        item.pushName ||
        item.name ||
        item.verifiedName ||
        item.notify ||
        item.shortName ||
        item.formattedName ||
        ''
      ).trim();

      const isRealName =
        !!rawName &&
        rawName !== phone &&
        rawName !== cleanDigits &&
        rawName.replace(/\D/g, '') !== cleanDigits &&
        !rawName.startsWith('+52') &&
        !rawName.startsWith('+54');

      const name = isRealName ? rawName : formatPhoneDisplay(phone);

      if (!contactMap.has(phone)) {
        contactMap.set(phone, {
          name,
          phone,
          email: `${cleanDigits}@whatsapp.local`,
          notes: 'WhatsApp Evolution API senkronizasyonu ile eklendi',
        });
      } else {
        const existing = contactMap.get(phone)!;
        if ((existing.name === phone || existing.name === formatPhoneDisplay(phone)) && isRealName) {
          existing.name = name;
        }
      }
    }

    const cleanContacts = Array.from(contactMap.values());
    const CHUNK_SIZE = 500;
    for (let i = 0; i < cleanContacts.length; i += CHUNK_SIZE) {
      const chunk = cleanContacts.slice(i, i + CHUNK_SIZE);
      await prisma.contact.createMany({ data: chunk, skipDuplicates: true });
    }

    // Index created contacts by phone for quick lookup
    const allSavedContacts = await prisma.contact.findMany();
    const contactByPhoneMap = new Map<string, string>();
    allSavedContacts.forEach((c) => {
      contactByPhoneMap.set(c.phone, c.id);
      contactByPhoneMap.set(normalizePhone(c.phone), c.id);
    });

    // 4. Process and save Groups and link Group Participants
    const allGroupCandidates = [...rawGroups];
    for (const ch of rawChats) {
      const jid = String(ch.id || ch.remoteJid || ch.jid || '');
      if (jid.includes('@g.us')) {
        allGroupCandidates.push(ch);
      }
    }

    const usedGroupNames = new Map<string, boolean>();
    const seenGroupJids = new Map<string, boolean>();
    let totalGroupsSaved = 0;

    for (const g of allGroupCandidates) {
      const jid = String(g.id || g.remoteJid || g.jid || '').trim();
      if (!jid || !jid.includes('@g.us')) continue;
      if (seenGroupJids.has(jid)) continue;
      seenGroupJids.set(jid, true);

      let gName = (g.subject || g.name || '').trim();
      if (!gName) {
        gName = `WhatsApp Grubu (${jid.slice(0, 8)})`;
      }

      if (usedGroupNames.has(gName.toLowerCase())) {
        gName = `${gName} (${jid.slice(-4)})`;
      }
      usedGroupNames.set(gName.toLowerCase(), true);

      const participants = Array.isArray(g.participants) ? g.participants : [];
      const memberCount = Number(g.size || participants.length) || 0;
      const sizeText = memberCount > 0 ? ` (${memberCount} Katılımcı)` : '';

      const createdGroup = await prisma.group.create({
        data: {
          name: gName,
          description: `WhatsApp Grubu${sizeText} - JID: ${jid}`,
          color: '#128C7E',
        },
      });
      totalGroupsSaved++;

      // Link group participants in ContactGroup
      const contactGroupEntries: Array<{ contactId: string; groupId: string }> = [];

      for (const p of participants) {
        const validPPhone = extractValidPhoneNumber(p);
        if (!validPPhone) continue;

        const pCleanDigits = normalizePhone(validPPhone);
        const pPhone = `+${pCleanDigits}`;

        let contactId = contactByPhoneMap.get(pPhone) || contactByPhoneMap.get(pCleanDigits);
        if (!contactId) {
          // Create new contact for participant if not exists
          const newContact = await prisma.contact.create({
            data: {
              phone: pPhone,
              name: formatPhoneDisplay(pPhone),
              email: `${pCleanDigits}@whatsapp.local`,
              notes: `${gName} grubu katılımcısı`,
            },
          });
          contactId = newContact.id;
          contactByPhoneMap.set(pPhone, contactId);
          contactByPhoneMap.set(pCleanDigits, contactId);
        }

        contactGroupEntries.push({
          contactId,
          groupId: createdGroup.id,
        });
      }

      if (contactGroupEntries.length > 0) {
        await prisma.contactGroup.createMany({
          data: contactGroupEntries,
          skipDuplicates: true,
        }).catch(() => {});
      }

      // Also ensure Group Chat exists in Chat table
      await prisma.chat.upsert({
        where: { phone: jid },
        update: {
          contactName: gName,
          isGroup: true,
        },
        create: {
          phone: jid,
          contactName: gName,
          lastMessage: 'Grup Sohbeti',
          lastMessageTime: new Date(),
          unreadCount: 0,
          isGroup: true,
        },
      }).catch(() => {});
    }

    console.log(`[Sync Tamamlandı] Kaydedilen Toplam Kişi: ${cleanContacts.length}, Grup: ${totalGroupsSaved}`);

    const message = `Senkronizasyon Başarılı: ${cleanContacts.length.toLocaleString('tr-TR')} Kişi ve ${totalGroupsSaved} Grup katılımcılarıyla birlikte yüklendi.`;

    return NextResponse.json({
      success: true,
      totalContacts: cleanContacts.length,
      totalGroups: totalGroupsSaved,
      contactsCount: cleanContacts.length,
      groupsCount: totalGroupsSaved,
      message,
    });

  } catch (error: any) {
    console.error('[Sync API Hatası]:', error?.response?.data || error.message);
    return NextResponse.json({
      success: false,
      error: error?.response?.data?.message || error.message || 'Senkronizasyon başarısız oldu'
    }, { status: 500 });
  }
}
