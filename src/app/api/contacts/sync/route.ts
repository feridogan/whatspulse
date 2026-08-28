import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

export async function POST() {
  try {
    // 0. Evolution API Ayarlarını Oku
    let evolutionUrl = process.env.EVOLUTION_API_URL || 'https://evo-rc.cakirlar.net';
    let instanceName = process.env.EVOLUTION_INSTANCE || 'feridun';
    let globalApiKey = process.env.EVOLUTION_GLOBAL_KEY || process.env.EVOLUTION_API_KEY || '4a8f9c2d1e0b3a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f';
    let instanceApiKey = process.env.EVOLUTION_API_KEY || '11E1F8329577-40D3-B891-9CCA41C01658';

    const setting = await prisma.setting.findFirst({
      where: {
        OR: [
          { key: 'evolution_api' },
          { key: 'evolution' },
        ]
      }
    }) || await prisma.setting.findFirst();

    if (setting) {
      if (typeof (setting as any).evolutionUrl === 'string') {
        evolutionUrl = (setting as any).evolutionUrl;
        instanceName = (setting as any).instanceName;
        globalApiKey = (setting as any).globalApiKey;
        instanceApiKey = (setting as any).instanceApiKey || instanceApiKey;
      } else if (setting.value && typeof setting.value === 'object') {
        const val = setting.value as any;
        if (val.apiUrl) evolutionUrl = val.apiUrl;
        if (val.evolutionUrl) evolutionUrl = val.evolutionUrl;
        if (val.instanceName) instanceName = val.instanceName;
        if (val.globalApiKey) globalApiKey = val.globalApiKey;
        if (val.instanceKey) instanceApiKey = val.instanceKey;
        if (val.instanceApiKey) instanceApiKey = val.instanceApiKey;
      }
    }

    if (!evolutionUrl || !instanceName || !globalApiKey) {
      return NextResponse.json({ error: 'Evolution API ayarları eksik' }, { status: 400 });
    }

    const apiKey = instanceApiKey || globalApiKey;
    const baseURL = evolutionUrl.replace(/\/$/, '');

    const headers = {
      'apikey': apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'WhatsPulse/1.0.0 (Evolution API Sync)',
    };

    // 1. Önce eski kayıtları temizle
    await prisma.contactGroup.deleteMany({}).catch(() => {});
    await prisma.contact.deleteMany({});
    await prisma.group.deleteMany({});

    // 2. Evolution API'den hem rehberi hem sohbetleri hem grupları çek
    const [contactsRes, chatsRes, groupsRes] = await Promise.allSettled([
      axios.post(`${baseURL}/chat/findContacts/${instanceName}`, {}, { headers, httpsAgent, timeout: 15000 }),
      axios.get(`${baseURL}/chat/findChats/${instanceName}`, { headers, httpsAgent, timeout: 15000 }),
      axios.get(`${baseURL}/group/fetchAllGroups/${instanceName}?getParticipants=false`, { headers, httpsAgent, timeout: 15000 })
    ]);

    const rawContacts = contactsRes.status === 'fulfilled' && Array.isArray(contactsRes.value.data) ? contactsRes.value.data : [];
    const rawChats = chatsRes.status === 'fulfilled' && Array.isArray(chatsRes.value.data) ? chatsRes.value.data : [];
    const rawGroups = groupsRes.status === 'fulfilled' && Array.isArray(groupsRes.value.data) ? groupsRes.value.data : [];

    // DEBUG LOGLARI
    console.log("=== EVOLUTION API DEBUG LOGS ===");
    console.log("Contacts Request Status:", contactsRes.status, contactsRes.status === 'rejected' ? (contactsRes as any).reason?.message : 'OK');
    console.log("Chats Request Status:", chatsRes.status, chatsRes.status === 'rejected' ? (chatsRes as any).reason?.message : 'OK');
    console.log("Groups Request Status:", groupsRes.status, groupsRes.status === 'rejected' ? (groupsRes as any).reason?.message : 'OK');

    console.log("Gelen Toplam Kişi Array Uzunluğu:", rawContacts.length);
    console.log("Gelen Toplam Sohbet Array Uzunluğu:", rawChats.length);
    console.log("Gelen Toplam Grup Array Uzunluğu:", rawGroups.length);

    console.log("DEBUG CONTACTS SAMPLE:", JSON.stringify(rawContacts.slice(0, 3), null, 2));
    console.log("DEBUG CHATS SAMPLE:", JSON.stringify(rawChats.slice(0, 3), null, 2));
    console.log("DEBUG GROUPS SAMPLE:", JSON.stringify(rawGroups.slice(0, 3), null, 2));
    console.log("================================");

    // 3. Grupları Kaydet
    const cleanGroups: { name: string; description: string; color: string }[] = [];
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

    if (cleanGroups.length > 0) {
      await prisma.group.createMany({ data: cleanGroups, skipDuplicates: true });
    }

    // 4. Kişileri Birleştir ve Numaraları Düzelt
    const combinedList = [...rawContacts, ...rawChats];
    const contactMap = new Map<string, { name: string; phone: string; email?: string; notes?: string }>();

    for (const item of combinedList) {
      const jid = String(item.id || item.remoteJid || item.jid || '');
      
      // Grup ve duyuru kanallarını kişilere alma
      if (!jid || jid.includes('@g.us') || jid.includes('@broadcast') || jid.includes('@newsletter') || jid.includes('@lid') || jid.startsWith('status@')) {
        continue;
      }

      // Sadece rakamları ayıkla
      const digits = jid.split('@')[0].replace(/:.*$/, '').replace(/\D/g, '');
      if (digits.length < 8) continue;

      const phone = `+${digits}`;

      // Gerçek isim bulma mantığı
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
        // Eğer kayıtlı olanda isim yoksa ve yenisinde varsa güncelle
        const existing = contactMap.get(phone)!;
        if (existing.name === phone && isRealName) {
          existing.name = name;
        }
      }
    }

    const cleanContacts = Array.from(contactMap.values());

    // 500'erli bloklar halinde toplu kayıt
    const CHUNK_SIZE = 500;
    for (let i = 0; i < cleanContacts.length; i += CHUNK_SIZE) {
      const chunk = cleanContacts.slice(i, i + CHUNK_SIZE);
      await prisma.contact.createMany({ data: chunk, skipDuplicates: true });
    }

    console.log("Kaydedilen net kişi sayısı:", cleanContacts.length);
    console.log("Kaydedilen net grup sayısı:", cleanGroups.length);

    return NextResponse.json({
      success: true,
      totalContacts: cleanContacts.length,
      totalGroups: cleanGroups.length,
      contactsCount: cleanContacts.length,
      groupsCount: cleanGroups.length,
      debug: {
        rawContactsCount: rawContacts.length,
        rawChatsCount: rawChats.length,
        rawGroupsCount: rawGroups.length,
        sampleContacts: rawContacts.slice(0, 3),
        sampleGroups: rawGroups.slice(0, 3),
      },
      message: `Senkronizasyon Başarılı: ${cleanContacts.length.toLocaleString('tr-TR')} Kişi ve ${cleanGroups.length} Grup yüklendi.`
    });

  } catch (error: any) {
    console.error('Senkronizasyon Hatası:', error?.response?.data || error.message);
    return NextResponse.json({ error: error.message || 'Senkronizasyon başarısız oldu' }, { status: 500 });
  }
}
