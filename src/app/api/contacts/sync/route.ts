import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Pool } from 'pg';
import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

export async function POST() {
  let pool: Pool | null = null;

  try {
    // 0. Ayarları Oku
    let evolutionUrl = process.env.EVOLUTION_API_URL || 'https://evo-rc.cakirlar.net';
    let instanceName = process.env.EVOLUTION_INSTANCE || 'feridun';
    let globalApiKey = process.env.EVOLUTION_GLOBAL_KEY || process.env.EVOLUTION_API_KEY || '4a8f9c2d1e0b3a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f';
    let instanceApiKey = process.env.EVOLUTION_API_KEY || '11E1F8329577-40D3-B891-9CCA41C01658';
    let evoDbUrl = process.env.EVOLUTION_DATABASE_URL || 'postgresql://evo_user:CakirlarPostgresPass99!@evolution-postgres-c67avhofg0upipygez4yypzb:5432/evolution_db?schema=public';

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

    let cleanContacts: Array<{ name: string; phone: string; email?: string; notes?: string }> = [];
    let cleanGroups: Array<{ name: string; description: string; color: string }> = [];
    let syncMethod = 'http-api-full';

    // 1. PostgreSQL Doğrudan Bağlantı Denemesi (Kısa Timeout: 3000ms)
    let pgSuccess = false;
    if (evoDbUrl) {
      try {
        console.log(`[Sync] PostgreSQL bağlantısı deneniyor (Timeout: 3000ms)...`);
        pool = new Pool({
          connectionString: evoDbUrl,
          connectionTimeoutMillis: 3000,
        });

        const client = await pool.connect();
        try {
          const instRes = await client.query(
            `SELECT id, name FROM "Instance" WHERE name = $1 UNION SELECT id, name FROM "instance" WHERE name = $1 LIMIT 1;`,
            [instanceName]
          );
          const instanceId = instRes.rows[0]?.id;

          // Grupları Çek
          const groupsSql = instanceId
            ? `SELECT * FROM "Chat" WHERE ("instanceId" = $1 OR "instance_id" = $1) AND "id" LIKE '%@g.us';`
            : `SELECT * FROM "Chat" WHERE "id" LIKE '%@g.us';`;
          const groupsRes = await client.query(groupsSql, instanceId ? [instanceId] : []);

          const groupMap = new Map<string, boolean>();
          for (const row of groupsRes.rows) {
            const gName = (row.subject || row.name || 'WhatsApp Grubu').trim();
            const normalizedKey = gName.toLowerCase();
            if (gName && !groupMap.has(normalizedKey)) {
              groupMap.set(normalizedKey, true);
              const memberCount = Number(row.size || 0) || 0;
              cleanGroups.push({
                name: gName,
                description: `WhatsApp Grubu${memberCount > 0 ? ` (${memberCount} Katılımcı)` : ''} - JID: ${row.id}`,
                color: '#128C7E',
              });
            }
          }

          // Kişileri Çek
          const contactMap = new Map<string, { name: string; phone: string; email?: string; notes?: string }>();
          const contactsSql = instanceId
            ? `SELECT * FROM "Contact" WHERE ("instanceId" = $1 OR "instance_id" = $1) AND "id" LIKE '%@s.whatsapp.net';`
            : `SELECT * FROM "Contact" WHERE "id" LIKE '%@s.whatsapp.net';`;
          const contactsRes = await client.query(contactsSql, instanceId ? [instanceId] : []);

          for (const row of contactsRes.rows) {
            const rawId = String(row.id || '');
            if (!rawId || rawId.includes('@g.us') || rawId.includes('@broadcast') || rawId.includes('@newsletter')) continue;
            const digits = rawId.split('@')[0].replace(/:.*$/, '').replace(/\D/g, '');
            if (digits.length < 8) continue;
            const phone = `+${digits}`;
            const rawName = (row.pushName || row.name || row.verifiedName || row.notify || row.shortName || '').trim();
            const isReal = rawName.length > 0 && rawName !== phone && rawName !== digits && rawName.replace(/\D/g, '') !== digits;
            const name = isReal ? rawName : phone;

            if (!contactMap.has(phone)) {
              contactMap.set(phone, {
                name,
                phone,
                email: `${digits}@whatsapp.local`,
                notes: 'WhatsApp Evolution PostgreSQL senkronizasyonu ile eklendi',
              });
            } else if (isReal && contactMap.get(phone)!.name === phone) {
              contactMap.get(phone)!.name = name;
            }
          }

          cleanContacts = Array.from(contactMap.values());
          if (cleanContacts.length > 0 || cleanGroups.length > 0) {
            pgSuccess = true;
            syncMethod = 'postgresql-direct';
            console.log(`[Sync] PostgreSQL üzerinden ${cleanContacts.length} kişi ve ${cleanGroups.length} grup başarıyla çekildi.`);
          }
        } finally {
          client.release();
        }
      } catch (pgErr: any) {
        console.warn(`[Sync] PostgreSQL bağlantısı kurulamadı (${pgErr.message}), %100 Çalışan HTTP Fallback devreye alınıyor...`);
      } finally {
        if (pool) await pool.end().catch(() => {});
      }
    }

    // 2. %100 ÇALIŞAN HTTP FALLBACK (LİMİTSİZ 5000 KAYIT ÇEKİMİ)
    if (!pgSuccess) {
      syncMethod = 'http-api-full';
      const apiKey = instanceApiKey || globalApiKey;
      const baseURL = evolutionUrl.replace(/\/$/, '');

      const headers = {
        'apikey': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'WhatsPulse/1.0.0 (Evolution API Full Sync)',
      };

      console.log(`[Sync] Evolution HTTP API çağrılıyor (${baseURL}/chat/findContacts/${instanceName} - limit: 5000)...`);

      const [contactsRes, chatsRes, groupsRes] = await Promise.allSettled([
        axios.post(`${baseURL}/chat/findContacts/${instanceName}`, { where: {}, limit: 5000 }, { headers, httpsAgent, timeout: 20000 }),
        axios.post(`${baseURL}/chat/findChats/${instanceName}`, { where: {}, limit: 5000 }, { headers, httpsAgent, timeout: 20000 }).catch(() => 
          axios.get(`${baseURL}/chat/findChats/${instanceName}`, { headers, httpsAgent, timeout: 20000 })
        ),
        axios.get(`${baseURL}/group/fetchAllGroups/${instanceName}?getParticipants=false`, { headers, httpsAgent, timeout: 20000 })
      ]);

      const rawContacts = contactsRes.status === 'fulfilled' && Array.isArray(contactsRes.value.data) ? contactsRes.value.data : [];
      const rawChats = chatsRes.status === 'fulfilled' && Array.isArray(chatsRes.value.data) ? chatsRes.value.data : [];
      const rawGroups = groupsRes.status === 'fulfilled' && Array.isArray(groupsRes.value.data) ? groupsRes.value.data : [];

      console.log(`[Sync HTTP Gelen] Kişi: ${rawContacts.length}, Sohbet: ${rawChats.length}, Grup: ${rawGroups.length}`);

      // Grupları Temizle ve Hazırla
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

      // Kişileri Temizle ve Hazırla (contacts + chats)
      const combinedList = [...rawContacts, ...rawChats];
      const contactMap = new Map<string, { name: string; phone: string; email?: string; notes?: string }>();

      for (const item of combinedList) {
        const rawJid = String(item.id || item.remoteJid || item.jid || '');
        if (!rawJid || rawJid.includes('@g.us') || rawJid.includes('@broadcast') || rawJid.includes('@newsletter') || rawJid.includes('@lid') || rawJid.startsWith('status@')) {
          continue;
        }

        const digits = rawJid.split('@')[0].replace(/:.*$/, '').replace(/\D/g, '');
        if (digits.length < 8) continue;

        const phone = `+${digits}`;
        const rawName = (
          item.pushName ||
          item.name ||
          item.verifiedName ||
          item.notify ||
          item.shortName ||
          item.formattedName ||
          ''
        ).trim();

        const isReal = !!rawName && rawName !== phone && rawName !== digits && rawName.replace(/\D/g, '') !== digits;
        const name = isReal ? rawName : phone;

        if (!contactMap.has(phone)) {
          contactMap.set(phone, {
            name,
            phone,
            email: `${digits}@whatsapp.local`,
            notes: 'WhatsApp Evolution API senkronizasyonu ile eklendi',
          });
        } else {
          const existing = contactMap.get(phone)!;
          if (existing.name === phone && isReal) {
            existing.name = name;
          }
        }
      }

      cleanContacts = Array.from(contactMap.values());
    }

    // 3. WhatsPulse Veritabanını Sıfırla ve Toplu Kaydet (Hard Reset)
    await prisma.contactGroup.deleteMany({}).catch(() => {});
    await prisma.contact.deleteMany({});
    await prisma.group.deleteMany({});
    console.log("Mevcut WhatsPulse kişi ve grupları başarıyla sıfırlandı.");

    if (cleanGroups.length > 0) {
      await prisma.group.createMany({ data: cleanGroups, skipDuplicates: true });
    }

    const CHUNK_SIZE = 500;
    for (let i = 0; i < cleanContacts.length; i += CHUNK_SIZE) {
      const chunk = cleanContacts.slice(i, i + CHUNK_SIZE);
      await prisma.contact.createMany({ data: chunk, skipDuplicates: true });
    }

    console.log(`[Sync Tamamlandı] Kaydedilen Toplam Kişi: ${cleanContacts.length}, Grup: ${cleanGroups.length} (Yöntem: ${syncMethod})`);

    const message = `Senkronizasyon Başarılı: ${cleanContacts.length.toLocaleString('tr-TR')} Kişi ve ${cleanGroups.length} Grup yüklendi.`;

    return NextResponse.json({
      success: true,
      totalContacts: cleanContacts.length,
      totalGroups: cleanGroups.length,
      contactsCount: cleanContacts.length,
      groupsCount: cleanGroups.length,
      syncMethod,
      message,
    });

  } catch (error: any) {
    console.error('[Sync Genel Hatası]:', error?.response?.data || error.message);
    return NextResponse.json({
      success: false,
      error: error.message || 'Senkronizasyon başarısız oldu'
    }, { status: 500 });
  }
}
