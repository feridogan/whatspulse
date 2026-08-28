import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Pool } from 'pg';

export async function POST() {
  let pool: Pool | null = null;

  try {
    // 0. Ayarları Oku
    let instanceName = process.env.EVOLUTION_INSTANCE || 'feridun';
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
      if (typeof (setting as any).instanceName === 'string') {
        instanceName = (setting as any).instanceName;
      } else if (setting.value && typeof setting.value === 'object') {
        const val = setting.value as any;
        if (val.instanceName) instanceName = val.instanceName;
      }
    }

    if (!evoDbUrl) {
      return NextResponse.json({
        success: false,
        step: "DB_CONNECTION_FAILED",
        error: "EVOLUTION_DATABASE_URL ortam değişkeni tanımlı değil."
      }, { status: 400 });
    }

    const maskedUrl = evoDbUrl.replace(/:[^:@]+@/, ':***@');
    console.log(`[Diagnostic Run] PostgreSQL bağlanılıyor: ${maskedUrl}`);

    // 1. PostgreSQL Bağlantısını Sına
    pool = new Pool({
      connectionString: evoDbUrl,
      connectionTimeoutMillis: 8000,
    });

    let client;
    try {
      client = await pool.connect();
    } catch (connErr: any) {
      console.error("[Diagnostic Run] PostgreSQL Bağlantı Hatası:", connErr.message);
      return NextResponse.json({
        success: false,
        step: "DB_CONNECTION_FAILED",
        dbUrl: maskedUrl,
        error: connErr.message || 'PostgreSQL sunucusuna bağlanılamadı (Ağ/Port/Şifre hatası).'
      }, { status: 500 });
    }

    // 2. Tablo Şeması Teşhisi (information_schema)
    const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
    const tableNames = tablesRes.rows.map((r: any) => r.table_name);
    console.log("[Diagnostic Run] Veritabanındaki Tablolar:", tableNames);

    // Tablo isimlerini büyük/küçük harf toleranslı belirle
    const instanceTable = tableNames.find((t: string) => t.toLowerCase() === 'instance') || 'Instance';
    const contactTable = tableNames.find((t: string) => t.toLowerCase() === 'contact') || 'Contact';
    const chatTable = tableNames.find((t: string) => t.toLowerCase() === 'chat') || 'Chat';

    // 3. Instance ID'yi Bul
    let instanceId: string | null = null;
    try {
      const instRes = await client.query(
        `SELECT id, name FROM "${instanceTable}" WHERE name = $1 OR LOWER(name) = LOWER($1) LIMIT 1;`,
        [instanceName]
      );
      if (instRes.rows.length > 0) {
        instanceId = instRes.rows[0].id;
        console.log(`[Diagnostic Run] Instance '${instanceName}' bulundu (ID: ${instanceId})`);
      } else {
        const anyInstRes = await client.query(`SELECT id, name FROM "${instanceTable}" LIMIT 5;`);
        console.log("[Diagnostic Run] Hedef instance bulunamadı. Mevcut Instance'lar:", anyInstRes.rows);
        if (anyInstRes.rows.length > 0) {
          instanceId = anyInstRes.rows[0].id;
          console.log(`[Diagnostic Run] İlk bulunan instance kullanılıyor (ID: ${instanceId}, İsim: ${anyInstRes.rows[0].name})`);
        }
      }
    } catch (instErr: any) {
      console.warn("[Diagnostic Run] Instance tablosu sorgulanamadı:", instErr.message);
    }

    // 4. GRUPLARI ÇEK
    const cleanGroups: Array<{ name: string; description: string; color: string }> = [];
    const groupMap = new Map<string, boolean>();

    try {
      const groupsSql = instanceId
        ? `SELECT * FROM "${chatTable}" WHERE "instanceId" = $1 AND "id" LIKE '%@g.us';`
        : `SELECT * FROM "${chatTable}" WHERE "id" LIKE '%@g.us';`;
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
      console.warn("[Diagnostic Run] Grup çekme sorgusu hatası:", groupErr.message);
    }

    // 5. KİŞİLERİ ÇEK
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

    let totalRawContacts = 0;
    try {
      const contactsSql = instanceId
        ? `SELECT * FROM "${contactTable}" WHERE "instanceId" = $1 AND "id" LIKE '%@s.whatsapp.net';`
        : `SELECT * FROM "${contactTable}" WHERE "id" LIKE '%@s.whatsapp.net';`;
      const contactsRes = await client.query(contactsSql, instanceId ? [instanceId] : []);
      totalRawContacts += contactsRes.rowCount || 0;
      for (const r of contactsRes.rows) processRow(r);
    } catch (cErr: any) {
      console.warn("[Diagnostic Run] Contact tablosu sorgulanamadı:", cErr.message);
    }

    try {
      const chatsSql = instanceId
        ? `SELECT * FROM "${chatTable}" WHERE "instanceId" = $1 AND "id" LIKE '%@s.whatsapp.net';`
        : `SELECT * FROM "${chatTable}" WHERE "id" LIKE '%@s.whatsapp.net';`;
      const chatsRes = await client.query(chatsSql, instanceId ? [instanceId] : []);
      totalRawContacts += chatsRes.rowCount || 0;
      for (const r of chatsRes.rows) processRow(r);
    } catch (chErr: any) {
      console.warn("[Diagnostic Run] Chat tablosu sorgulanamadı:", chErr.message);
    }

    client.release();

    const cleanContacts = Array.from(contactMap.values());

    // Eğer veritabanında hiçbir kişi ve grup bulunamadıysa detaylı teşhis yanıtı dön
    if (cleanContacts.length === 0 && cleanGroups.length === 0) {
      console.warn("[Diagnostic Run] Hiçbir kayıt bulunamadı!", { tables: tableNames, totalRaw: totalRawContacts });
      return NextResponse.json({
        success: false,
        step: "NO_INSTANCE_OR_EMPTY",
        error: `Evolution veritabanında '${instanceName}' instance'ına ait kayıt bulunamadı. Tablolar: ${tableNames.join(', ')}`,
        instanceNameFound: instanceName,
        tablesFound: tableNames,
        totalRawContacts: totalRawContacts
      }, { status: 400 });
    }

    // 6. WhatsPulse Kendi Tablolarını Sıfırla ve Yeni Verileri Kaydet
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

    console.log(`[Diagnostic Run Başarılı] Kaydedilen Toplam Kişi: ${cleanContacts.length}, Grup: ${cleanGroups.length}`);

    return NextResponse.json({
      success: true,
      totalContacts: cleanContacts.length,
      totalGroups: cleanGroups.length,
      contactsCount: cleanContacts.length,
      groupsCount: cleanGroups.length,
      tablesInEvolutionDb: tableNames,
      message: `Senkronizasyon Başarılı: ${cleanContacts.length.toLocaleString('tr-TR')} Kişi ve ${cleanGroups.length} Grup yüklendi.`
    });

  } catch (error: any) {
    console.error('[Diagnostic Run Hata]:', error.message);
    return NextResponse.json({
      success: false,
      step: "UNEXPECTED_ERROR",
      error: error.message || 'Beklenmeyen senkronizasyon hatası'
    }, { status: 500 });
  } finally {
    if (pool) {
      await pool.end().catch(() => {});
    }
  }
}
