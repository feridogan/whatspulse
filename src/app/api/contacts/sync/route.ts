import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { EvolutionService } from "@/lib/evolution";
import { syncWhatsAppContactInfo } from "@/lib/contact-sync";
import { requireAuth } from "@/lib/auth";
import { normalizePhoneNumber } from "@/lib/phone-utils";

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

    // 1. Fetch all contacts from Evolution API
    const waContacts = await EvolutionService.fetchAllContacts();

    let createdCount = 0;
    let updatedCount = 0;

    for (const c of waContacts) {
      const formattedPhone = normalizePhoneNumber(c.phone);
      if (!formattedPhone) continue;

      // Check if contact already exists
      const existing = await prisma.contact.findFirst({
        where: {
          phone: formattedPhone,
        }
      });

      if (!existing) {
        // Create new contact
        const displayName = c.name || c.pushName || formattedPhone;
        await prisma.contact.create({
          data: {
            name: displayName,
            phone: formattedPhone,
            avatar: c.profilePicUrl || null,
            isCustomName: Boolean(c.name && c.name !== formattedPhone),
          }
        });
        createdCount++;
      } else {
        // Update existing contact non-destructively
        const updated = await syncWhatsAppContactInfo(existing, {
          waName: c.name || c.pushName || null,
          profilePicUrl: c.profilePicUrl || null,
        });
        if (updated && Object.keys(updated).length > 0) {
          updatedCount++;
        }
      }

      // Also upsert subscriber for compatibility
      await prisma.subscriber.upsert({
        where: { phone: formattedPhone },
        update: {
          name: c.name || c.pushName || undefined,
        },
        create: {
          name: c.name || c.pushName || formattedPhone,
          phone: formattedPhone,
          channels: ["WhatsApp"],
          preferredTime: "08:00",
          language: "TR",
        }
      }).catch(() => {});
    }

    // Also sync all existing Contacts into Subscriber table
    const allContacts = await prisma.contact.findMany();
    for (const ac of allContacts) {
      await prisma.subscriber.upsert({
        where: { phone: ac.phone },
        update: {
          name: ac.name,
          email: ac.email || undefined,
          notes: ac.notes || undefined,
          isBlacklisted: ac.isBlacklisted,
        },
        create: {
          name: ac.name,
          phone: ac.phone,
          email: ac.email || undefined,
          notes: ac.notes || undefined,
          isBlacklisted: ac.isBlacklisted,
          channels: ["WhatsApp"],
          preferredTime: "08:00",
          language: "TR",
        }
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: `WhatsApp senkronizasyonu tamamlandı: ${createdCount} yeni kişi eklendi, ${updatedCount} kişi güncellendi. Toplam ${waContacts.length} geçerli WhatsApp kaydı tarandı.`,
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
