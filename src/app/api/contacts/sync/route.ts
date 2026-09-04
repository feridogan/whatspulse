import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { EvolutionService } from "@/lib/evolution";
import { syncWhatsAppContactInfo } from "@/lib/contact-sync";
import { requireAuth } from "@/lib/auth";
import { normalizePhoneNumber, isValidContactName } from "@/lib/phone-utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const authCheck = await requireAuth(req);
    if (authCheck.error) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    let isReset = false;
    try {
      const body = await req.json().catch(() => ({}));
      if (body?.reset === true || body?.clean === true) {
        isReset = true;
      }
    } catch (e) {}

    // 0. If reset requested or cleaning up invalid numbers
    if (isReset) {
      await prisma.contactGroup.deleteMany({}).catch(() => {});
      await prisma.contact.deleteMany({}).catch(() => {});
      await prisma.subscriberGroup.deleteMany({}).catch(() => {});
      await prisma.subscriber.deleteMany({}).catch(() => {});
    } else {
      const existingContacts = await prisma.contact.findMany({ select: { id: true, phone: true } });
      const invalidContactIds = existingContacts
        .filter(c => !normalizePhoneNumber(c.phone))
        .map(c => c.id);

      if (invalidContactIds.length > 0) {
        await prisma.contactGroup.deleteMany({ where: { contactId: { in: invalidContactIds } } }).catch(() => {});
        await prisma.contact.deleteMany({ where: { id: { in: invalidContactIds } } }).catch(() => {});
      }

      const existingSubs = await prisma.subscriber.findMany({ select: { id: true, phone: true } });
      const invalidSubIds = existingSubs
        .filter(s => !normalizePhoneNumber(s.phone))
        .map(s => s.id);

      if (invalidSubIds.length > 0) {
        await prisma.subscriberGroup.deleteMany({ where: { subscriberId: { in: invalidSubIds } } }).catch(() => {});
        await prisma.subscriber.deleteMany({ where: { id: { in: invalidSubIds } } }).catch(() => {});
      }
    }

    // 1. Fetch all contacts & chats from Evolution API
    const rawWaContacts = await EvolutionService.fetchAllContacts();
    // Yalnızca geçerli isimli kişileri filtrele
    const waContacts = rawWaContacts.filter(c => isValidContactName(c.name, c.cleanPhone || c.phone));

    // 2. Load existing contacts to protect isCustomName and count created vs updated
    const existingContacts = isReset 
      ? [] 
      : await prisma.contact.findMany({ select: { id: true, phone: true, name: true, isCustomName: true } });
    
    const existingMap = new Map(existingContacts.map(c => [c.phone, c]));

    let createdCount = 0;
    let updatedCount = 0;

    // 3. Toplu Veritabanı Kaydı (Bulk Upsert & Chunking in batches of 200)
    const CHUNK_SIZE = 200;
    for (let i = 0; i < waContacts.length; i += CHUNK_SIZE) {
      const batch = waContacts.slice(i, i + CHUNK_SIZE);

      const contactOps = batch.map((item) => {
        const cleanPhone = item.cleanPhone || item.phone;
        const existing = existingMap.get(cleanPhone);
        
        if (!existing) {
          createdCount++;
          existingMap.set(cleanPhone, { id: 'temp', phone: cleanPhone, name: item.name || cleanPhone, isCustomName: false });
        } else {
          updatedCount++;
        }

        const isCustomName = existing?.isCustomName === true;
        // Mevcut özel isim verilmiş kayıtları koru (isCustomName: true ise isme dokunma)
        const nameToUpdate = item.name && !isCustomName ? item.name : undefined;

        return prisma.contact.upsert({
          where: { phone: cleanPhone },
          update: {
            avatar: item.profilePictureUrl || item.profilePicUrl || undefined,
            ...(nameToUpdate ? { name: nameToUpdate } : {}),
          },
          create: {
            phone: cleanPhone,
            name: item.name || cleanPhone,
            avatar: item.profilePictureUrl || item.profilePicUrl || null,
            isCustomName: false,
          },
        });
      });

      await prisma.$transaction(contactOps);

      // Upsert subscriber table in same chunk
      const subOps = batch.map((item) => {
        const cleanPhone = item.cleanPhone || item.phone;
        return prisma.subscriber.upsert({
          where: { phone: cleanPhone },
          update: {
            ...(item.name ? { name: item.name } : {}),
          },
          create: {
            name: item.name || cleanPhone,
            phone: cleanPhone,
            channels: ["WhatsApp"],
            preferredTime: "08:00",
            language: "TR",
          },
        });
      });

      await prisma.$transaction(subOps).catch((err) => {
        console.warn(`[Bulk Sync Subscriber warning]: ${err.message}`);
      });
    }

    return NextResponse.json({
      success: true,
      message: `WhatsApp senkronizasyonu tamamlandı: ${createdCount} yeni kişi eklendi, ${updatedCount} kişi güncellendi. Toplam ${waContacts.length} benzersiz WhatsApp kaydı işlendi.`,
      stats: {
        totalFound: waContacts.length,
        created: createdCount,
        updated: updatedCount,
      }
    });
  } catch (error: any) {
    console.error("[POST /api/contacts/sync Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "WhatsApp rehber senkronizasyonu başarısız oldu." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
