import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Pool } from 'pg';

export async function POST() {
  let pool: Pool | null = null;

  try {
    // 0. Instance Adı ve Veritabanı URL'si
    let instanceName = process.env.EVOLUTION_INSTANCE || 'ff';
    let evoDbUrl = process.env.EVOLUTION_DATABASE_URL || 'postgresql://evo_user:CakirlarPostgresPass99!@172.17.0.1:5432/evolution_db?schema=public';

    const setting = await prisma.setting.findFirst({
      where: {
        OR: [
          { key: 'evolution_api' },
          { key: 'evolution' },
        ]
      }
    }) || await prisma.setting.findFirst();

    if (setting) {
      if (typeof (setting as any).instanceName === 'string') {
        instanceName = (setting as any).instanceName;
      } else if (setting.value && typeof setting.value === 'object') {
        const val = setting.value as any;
        if (val.instanceName) instanceName = val.instanceName;
      }
    }

    console.log(`[Evolution DB Sync] Bağlanılıyor: ${evoDbUrl.replace(/:[^:@]+@/, ':***@')} (Hedef Instance: ${instanceName})`);

    // 1. PostgreSQL Bağlantısı Kur (timeout: 10000ms)
    pool = new Pool({
      connectionString: evoDbUrl,
      connectionTimeoutMillis: 10000,
    });

    const client = await pool.connect();

    try {
      // 2. WhatsPulse Kendi Tablolarını Sıfırla (Hard Reset)
      await prisma.contactGroup.deleteMany({}).catch(() => {});
      await prisma.contact.deleteMany({});
      await prisma.group.deleteMany({});
      console.log("Mevcut WhatsPulse kişi ve grupları başarıyla sıfırlandı.");

      // 3. Instance ID Bulma
      let instanceId: string | null = null;
      try {
        const instRes = await client.query(
          `SELECT id, name FROM "Instance" WHERE name = $1 UNION SELECT id, name FROM "instance" WHERE name = $1 LIMIT 1;`,
          [instanceName]
        );
        if (instRes.rows.length > 0) {
          instanceId = instRes.rows[0].id;
          console.log(`[Evolution DB Sync] Instance '${instanceName}' ID: ${instanceId}`);
        } else {
          // Eğer 'ff' bulunamazsa ilk instance'ı al
          const anyInst = await client.query(`SELECT id, name FROM "Instance" UNION SELECT id, name FROM "instance" LIMIT 1;`);
          if (anyInst.rows.length > 0) {
            instanceId = anyInst.rows[0].id;
            console.log(`[Evolution DB Sync] '${instanceName}' bulunamadı, mevcut instance kullanılıyor: ${anyInst.rows[0].name} (ID: ${instanceId})`);
          }
        }
      } catch (instErr: any) {
        console.warn("[Evolution DB Sync] Instance tablosu hatası:", instErr.message);
      }

      // 4. GRUPLARI ÇEK
      const cleanGroups: Array<{ name: string; description: string; color: string }> = [];
      const groupMap = new Map<string, boolean>();

      try {
        const groupsSql = instanceId
          ? `SELECT * FROM "Chat" WHERE ("instanceId" = $1 OR "instance_id" = $1) AND "id" LIKE '%@g.us';`
          : `SELECT * FROM "Chat" WHERE "id" LIKE '%@g.us';`;
        const groupsRes = await client.query(groupsSql, instanceId ? [instanceId] : []);

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
      } catch (groupErr: any) {
        console.warn("[Evolution DB Sync] Gruplar sorgu hatası:", groupErr.message);
      }

      if (cleanGroups.length > 0) {
        await prisma.group.createMany({ data: cleanGroups, skipDuplicates: true });
      }

      // 5. KİŞİLERİ ÇEK (1.055 Kaydın Tamamı)
      const contactMap = new Map<string, { name: string; phone: string; email?: string; notes?: string }>();

      function processRow(row: any) {
        const rawId = String(row.id || '');
        if (!rawId || rawId.includes('@g.us') || rawId.includes('@broadcast') || rawId.includes('@newsletter')) return;

        // Numara Temizleme: Sadece rakamları al
        const digits = rawId.split('@')[0].replace(/:.*$/, '').replace(/\D/g, '');
        if (digits.length < 8) return;

        // Telefon Formatı: +${digits} (Kesinlikle '++' olmasın)
        const phone = `+${digits}`;

        // İsim Ayrıştırma
        const rawName = (row.pushName || row.name || row.verifiedName || row.notify || row.shortName || '').trim();
        const isRealName = rawName.length > 0 && rawName !== phone && rawName !== digits && rawName.replace(/\D/g, '') !== digits;
        const name = isRealName ? rawName : phone;

        if (!contactMap.has(phone)) {
          contactMap.set(phone, {
            name,
            phone,
            email: `${digits}@whatsapp.local`,
            notes: 'WhatsApp Evolution PostgreSQL veritabanı senkronizasyonu ile eklendi',
          });
        } else if (isRealName && contactMap.get(phone)!.name === phone) {
          contactMap.get(phone)!.name = name;
        }
      }

      // Contact tablosundan çek
      try {
        const contactsSql = instanceId
          ? `SELECT * FROM "Contact" WHERE ("instanceId" = $1 OR "instance_id" = $1) AND "id" LIKE '%@s.whatsapp.net';`
          : `SELECT * FROM "Contact" WHERE "id" LIKE '%@s.whatsapp.net';`;
        const contactsRes = await client.query(contactsSql, instanceId ? [instanceId] : []);
        for (const r of contactsRes.rows) processRow(r);
      } catch (cErr: any) {
        console.warn("[Evolution DB Sync] Contact tablosu hatası:", cErr.message);
      }

      // Chat tablosundan bireysel sohbetleri çek
      try {
        const chatsSql = instanceId
          ? `SELECT * FROM "Chat" WHERE ("instanceId" = $1 OR "instance_id" = $1) AND "id" LIKE '%@s.whatsapp.net';`
          : `SELECT * FROM "Chat" WHERE "id" LIKE '%@s.whatsapp.net';`;
        const chatsRes = await client.query(chatsSql, instanceId ? [instanceId] : []);
        for (const r of chatsRes.rows) processRow(r);
      } catch (chErr: any) {
        console.warn("[Evolution DB Sync] Chat tablosu hatası:", chErr.message);
      }

      const cleanContacts = Array.from(contactMap.values());

      // 500'erli bloklar halinde WhatsPulse'a kaydet
      const CHUNK_SIZE = 500;
      for (let i = 0; i < cleanContacts.length; i += CHUNK_SIZE) {
        const chunk = cleanContacts.slice(i, i + CHUNK_SIZE);
        await prisma.contact.createMany({ data: chunk, skipDuplicates: true });
      }

      console.log(`[Evolution DB Sync Başarılı] Çekilen Kişi: ${cleanContacts.length}, Grup: ${cleanGroups.length}`);

      return NextResponse.json({
        success: true,
        totalContacts: cleanContacts.length,
        totalGroups: cleanGroups.length,
        contactsCount: cleanContacts.length,
        groupsCount: cleanGroups.length,
        message: `Senkronizasyon Başarılı: ${cleanContacts.length.toLocaleString('tr-TR')} Kişi ve ${cleanGroups.length} Grup yüklendi.`
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('[Evolution DB Sync Hatası]:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message || 'Evolution PostgreSQL veritabanı bağlantı hatası'
    }, { status: 500 });
  } finally {
    if (pool) {
      await pool.end().catch(() => {});
    }
  }
}
