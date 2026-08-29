import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEvolutionConfig, EvolutionService } from '@/lib/evolution';
import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

export async function POST() {
  try {
    // 0. Güncel Evolution API Konfigürasyonunu Oku
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

    // 1. WhatsPulse Tablolarını Sıfırla (Hard Reset)
    await prisma.contactGroup.deleteMany({}).catch(() => {});
    await prisma.contact.deleteMany({});
    await prisma.group.deleteMany({});
    console.log("Mevcut WhatsPulse kişi ve grupları başarıyla sıfırlandı.");

    // 2. Kişileri ve Grupları Evolution API'den Çek (5000 Limit ile Tam Liste)
    const [contactsRes, chatsRes, groupsRes] = await Promise.allSettled([
      axios.post(`${baseURL}/chat/findContacts/${encodeURIComponent(instanceName)}`, { where: {}, limit: 5000 }, { headers, httpsAgent, timeout: 25000 }),
      axios.post(`${baseURL}/chat/findChats/${encodeURIComponent(instanceName)}`, { where: {}, limit: 5000 }, { headers, httpsAgent, timeout: 25000 }).catch(() => 
        axios.get(`${baseURL}/chat/findChats/${encodeURIComponent(instanceName)}`, { headers, httpsAgent, timeout: 25000 })
      ),
      axios.get(`${baseURL}/group/fetchAllGroups/${encodeURIComponent(instanceName)}?getParticipants=false`, { headers, httpsAgent, timeout: 25000 })
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

    // 3. Grupları Ayrıştır ve Kaydet
    const cleanGroups: Array<{ name: string; description: string; color: string }> = [];
    const groupMap = new Map<string, boolean>();

    for (const g of rawGroups) {
      const gName = (g.subject || g.name || 'WhatsApp Grubu').trim();
      const normalizedKey = gName.toLowerCase();
      if (gName && !groupMap.has(normalizedKey)) {
        groupMap.set(normalizedKey, true);
        const memberCount = Number(g.size || (g.participants ? g.participants.length : 0)) || 0;
        const sizeText = memberCount > 0 ? ` (${memberCount} Katılımcı)` : '';
        cleanGroups.push({
          name: gName,
          description: `WhatsApp Grubu${sizeText} - JID: ${g.id || g.jid || ''}`,
          color: '#128C7E',
        });
      }
    }

    // Ayrıca chats içindeki @g.us gruplarını topla
    for (const ch of rawChats) {
      const jid = String(ch.id || ch.remoteJid || ch.jid || '');
      if (jid.includes('@g.us')) {
        const gName = (ch.name || ch.subject || 'WhatsApp Grubu').trim();
        const normalizedKey = gName.toLowerCase();
        if (gName && !groupMap.has(normalizedKey)) {
          groupMap.set(normalizedKey, true);
          cleanGroups.push({
            name: gName,
            description: `WhatsApp Grubu - JID: ${jid}`,
            color: '#128C7E',
          });
        }
      }
    }

    if (cleanGroups.length > 0) {
      await prisma.group.createMany({ data: cleanGroups, skipDuplicates: true });
    }

    // 4. Kişileri Ayrıştır, Numaralandır ve Tekilleştir (rawContacts + rawChats)
    const combinedList = [...rawContacts, ...rawChats];
    const contactMap = new Map<string, { name: string; phone: string; email?: string; notes?: string }>();

    for (const item of combinedList) {
      const rawJid = String(item.id || item.remoteJid || item.jid || item.number || '');
      
      // @g.us, @broadcast, @newsletter olanları kişiye alma
      if (!rawJid || rawJid.includes('@g.us') || rawJid.includes('@broadcast') || rawJid.includes('@newsletter') || rawJid.includes('@lid') || rawJid.startsWith('status@')) {
        continue;
      }

      // Numaradan sadece rakamları al
      const digits = rawJid.split('@')[0].replace(/:.*$/, '').replace(/\D/g, '');
      if (digits.length < 8) continue;

      // Telefon Formatı: SADECE +${digits} (Kesinlikle '++' olmasın)
      const phone = `+${digits}`;

      // İsim kontrolü
      const rawName = (
        item.pushName ||
        item.name ||
        item.verifiedName ||
        item.notify ||
        item.shortName ||
        item.formattedName ||
        ''
      ).trim();

      const isRealName = !!rawName && rawName !== phone && rawName !== digits && rawName.replace(/\D/g, '') !== digits;
      const name = isRealName ? rawName : phone;

      if (!contactMap.has(phone)) {
        contactMap.set(phone, {
          name,
          phone,
          email: `${digits}@whatsapp.local`,
          notes: 'WhatsApp Evolution API senkronizasyonu ile eklendi',
        });
      } else {
        const existing = contactMap.get(phone)!;
        if (existing.name === phone && isRealName) {
          existing.name = name;
        }
      }
    }

    const cleanContacts = Array.from(contactMap.values());

    // 500'erli bloklar halinde toplu kaydet
    const CHUNK_SIZE = 500;
    for (let i = 0; i < cleanContacts.length; i += CHUNK_SIZE) {
      const chunk = cleanContacts.slice(i, i + CHUNK_SIZE);
      await prisma.contact.createMany({ data: chunk, skipDuplicates: true });
    }

    console.log(`[Sync Tamamlandı] Kaydedilen Toplam Kişi: ${cleanContacts.length}, Grup: ${cleanGroups.length}`);

    const message = `Senkronizasyon Başarılı: ${cleanContacts.length.toLocaleString('tr-TR')} Kişi ve ${cleanGroups.length} Grup yüklendi.`;

    return NextResponse.json({
      success: true,
      totalContacts: cleanContacts.length,
      totalGroups: cleanGroups.length,
      contactsCount: cleanContacts.length,
      groupsCount: cleanGroups.length,
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
