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
  try {
    // 0. Ayarları Oku
    let evolutionUrl = process.env.EVOLUTION_API_URL || 'https://evo-rc.cakirlar.net';
    let instanceName = process.env.EVOLUTION_INSTANCE || 'feridun';
    let globalApiKey = process.env.EVOLUTION_GLOBAL_KEY || process.env.EVOLUTION_API_KEY || '4a8f9c2d1e0b3a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f';
    let instanceApiKey = process.env.EVOLUTION_API_KEY || '11E1F8329577-40D3-B891-9CCA41C01658';
    let evoDbUrl = process.env.EVOLUTION_DATABASE_URL || 'postgresql://evo_user:CakirlarPostgresPass99!@evolution-postgres:5432/evolution_db?schema=public';

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

    // 1. Önce eski kayıtları temizle (Hard Reset)
    await prisma.contactGroup.deleteMany({}).catch(() => {});
    await prisma.contact.deleteMany({});
    await prisma.group.deleteMany({});
    console.log("Mevcut WhatsPulse kişi ve grupları başarıyla sıfırlandı.");

    let cleanContacts: Array<{ name: string; phone: string; email?: string; notes?: string }> = [];
    let cleanGroups: Array<{ name: string; description: string; color: string }> = [];
    let syncSource = 'direct-db';

    // 2. Doğrudan PostgreSQL (EVOLUTION_DATABASE_URL) Bağlantısını Dene
    let dbSuccess = false;
    if (evoDbUrl) {
      const pool = new Pool({
        connectionString: evoDbUrl,
        connectionTimeoutMillis: 6000,
      });

      try {
        console.log(`[Evolution DB Sync] Doğrudan PostgreSQL bağlantısı kuruluyor: ${evoDbUrl.replace(/:[^:@]+@/, ':***@')}...`);
        
        // Instance ID'yi bul
        const instRes = await pool.query('SELECT id, name FROM "Instance" WHERE name = $1 OR LOWER(name) = LOWER($1) LIMIT 1;', [instanceName]);
        let instanceId = instRes.rows[0]?.id;
        if (!instanceId) {
          const anyInst = await pool.query('SELECT id, name FROM "Instance" LIMIT 1;');
          instanceId = anyInst.rows[0]?.id;
        }

        console.log(`[Evolution DB Sync] Instance ID bulundu: ${instanceId || 'Tüm Instance’lar'}`);

        // GRUPLARI ÇEK
        const groupsRes = instanceId 
          ? await pool.query('SELECT * FROM "Chat" WHERE "instanceId" = $1 AND "id" LIKE \'%@g.us\';', [instanceId])
          : await pool.query('SELECT * FROM "Chat" WHERE "id" LIKE \'%@g.us\';');

        const groupMap = new Map<string, boolean>();
        for (const row of groupsRes.rows) {
          const gName = (row.subject || row.name || 'WhatsApp Grubu').trim();
          const normalizedKey = gName.toLowerCase();
          if (gName && !groupMap.has(normalizedKey)) {
            groupMap.set(normalizedKey, true);
            const memberCount = Number(row.size || 0) || 0;
            const sizeText = memberCount > 0 ? ` (${memberCount} Katılımcı)` : '';
            cleanGroups.push({
              name: gName,
              description: `WhatsApp Grubu${sizeText} - JID: ${row.id}`,
              color: '#128C7E',
            });
          }
        }

        // KİŞİLERİ ÇEK
        const contactsRes = instanceId
          ? await pool.query('SELECT * FROM "Contact" WHERE "instanceId" = $1 AND "id" LIKE \'%@s.whatsapp.net\';', [instanceId])
          : await pool.query('SELECT * FROM "Contact" WHERE "id" LIKE \'%@s.whatsapp.net\';');

        // Ayrıca Chat tablosundaki bireysel sohbetleri de tara
        const individualChatsRes = instanceId
          ? await pool.query('SELECT * FROM "Chat" WHERE "instanceId" = $1 AND "id" LIKE \'%@s.whatsapp.net\';', [instanceId])
          : await pool.query('SELECT * FROM "Chat" WHERE "id" LIKE \'%@s.whatsapp.net\';');

        const contactMap = new Map<string, { name: string; phone: string; email?: string; notes?: string }>();

        function processRow(row: any) {
          const rawId = String(row.id || '');
          if (!rawId || rawId.includes('@g.us') || rawId.includes('@broadcast') || rawId.includes('@newsletter')) return;

          const digits = rawId.split('@')[0].replace(/:.*$/, '').replace(/\D/g, '');
          if (digits.length < 8) return;

          const phone = `+${digits}`;
          const rawName = (row.pushName || row.name || row.verifiedName || row.notify || row.shortName || '').trim();
          const isRealName = rawName.length > 0 && rawName !== phone && rawName !== digits && rawName.replace(/\D/g, '') !== digits;
          const name = isRealName ? rawName : phone;

          if (!contactMap.has(phone)) {
            contactMap.set(phone, {
              name,
              phone,
              email: `${digits}@whatsapp.local`,
              notes: 'WhatsApp Evolution API veritabanı senkronizasyonu ile eklendi',
            });
          } else if (isRealName && contactMap.get(phone)!.name === phone) {
            contactMap.get(phone)!.name = name;
          }
        }

        for (const r of contactsRes.rows) processRow(r);
        for (const r of individualChatsRes.rows) processRow(r);

        cleanContacts = Array.from(contactMap.values());
        dbSuccess = true;
        console.log(`[Evolution DB Sync] Başarılı! Çekilen Kişi: ${cleanContacts.length}, Grup: ${cleanGroups.length}`);
      } catch (dbErr: any) {
        console.warn('[Evolution DB Sync] Doğrudan DB hatası, HTTP API fallback uygulanıyor:', dbErr.message);
      } finally {
        await pool.end().catch(() => {});
      }
    }

    // 3. Eğer Doğrudan DB Bağlantısı Sağlanamadıysa HTTP API Fallback Uygula
    if (!dbSuccess) {
      syncSource = 'http-api';
      console.log('[Evolution Sync] HTTP API üzerinden veri çekiliyor...');
      const apiKey = instanceApiKey || globalApiKey;
      const baseURL = evolutionUrl.replace(/\/$/, '');

      const headers = {
        'apikey': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'WhatsPulse/1.0.0 (Evolution API Sync)',
      };

      const [contactsRes, chatsRes, groupsRes] = await Promise.allSettled([
        axios.post(`${baseURL}/chat/findContacts/${instanceName}`, {}, { headers, httpsAgent, timeout: 15000 }),
        axios.get(`${baseURL}/chat/findChats/${instanceName}`, { headers, httpsAgent, timeout: 15000 }),
        axios.get(`${baseURL}/group/fetchAllGroups/${instanceName}?getParticipants=false`, { headers, httpsAgent, timeout: 15000 })
      ]);

      const rawContacts = contactsRes.status === 'fulfilled' && Array.isArray(contactsRes.value.data) ? contactsRes.value.data : [];
      const rawChats = chatsRes.status === 'fulfilled' && Array.isArray(chatsRes.value.data) ? chatsRes.value.data : [];
      const rawGroups = groupsRes.status === 'fulfilled' && Array.isArray(groupsRes.value.data) ? groupsRes.value.data : [];

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

      const combinedList = [...rawContacts, ...rawChats];
      const contactMap = new Map<string, { name: string; phone: string; email?: string; notes?: string }>();

      for (const item of combinedList) {
        const jid = String(item.id || item.remoteJid || item.jid || '');
        if (!jid || jid.includes('@g.us') || jid.includes('@broadcast') || jid.includes('@newsletter') || jid.includes('@lid') || jid.startsWith('status@')) {
          continue;
        }

        const digits = jid.split('@')[0].replace(/:.*$/, '').replace(/\D/g, '');
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

      cleanContacts = Array.from(contactMap.values());
    }

    // 4. Veritabanına Toplu Yazma (Prisma Bulk Insert)
    if (cleanGroups.length > 0) {
      await prisma.group.createMany({ data: cleanGroups, skipDuplicates: true });
    }

    const CHUNK_SIZE = 500;
    for (let i = 0; i < cleanContacts.length; i += CHUNK_SIZE) {
      const chunk = cleanContacts.slice(i, i + CHUNK_SIZE);
      await prisma.contact.createMany({ data: chunk, skipDuplicates: true });
    }

    console.log(`[Sync Completed] Kaydedilen Toplam Kişi: ${cleanContacts.length}, Grup: ${cleanGroups.length} (Kaynak: ${syncSource})`);

    return NextResponse.json({
      success: true,
      totalContacts: cleanContacts.length,
      totalGroups: cleanGroups.length,
      contactsCount: cleanContacts.length,
      groupsCount: cleanGroups.length,
      syncSource,
      message: `Senkronizasyon Başarılı: ${cleanContacts.length.toLocaleString('tr-TR')} Kişi ve ${cleanGroups.length} Grup yüklendi.`
    });

  } catch (error: any) {
    console.error('Senkronizasyon Hatası:', error?.response?.data || error.message);
    return NextResponse.json({ error: error.message || 'Senkronizasyon başarısız oldu' }, { status: 500 });
  }
}
