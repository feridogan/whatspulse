import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { EvolutionService } from "@/lib/evolution";
import { syncWhatsAppContactInfo } from "@/lib/contact-sync";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const authCheck = await requireAuth(req);
    if (authCheck.error) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    // 0. Clean up any existing invalid fake LIDs
    await prisma.$executeRawUnsafe(`
      DELETE FROM "Contact" WHERE LENGTH(REGEXP_REPLACE("phone", '[^\\d]', '', 'g')) > 13;
      DELETE FROM "Subscriber" WHERE LENGTH(REGEXP_REPLACE("phone", '[^\\d]', '', 'g')) > 13;
    `).catch(() => {});

    // 1. Fetch all contacts from Evolution API
    const waContacts = await EvolutionService.fetchAllContacts();

    let createdCount = 0;
    let updatedCount = 0;

    for (const c of waContacts) {
      let rawDigits = c.phone.replace(/\D/g, '');
      if (rawDigits.length < 10 || rawDigits.length > 13) continue;

      // Normalize Turkish numbers
      if (rawDigits.length === 10 && rawDigits.startsWith('5')) {
        rawDigits = '90' + rawDigits;
      } else if (rawDigits.length === 11 && rawDigits.startsWith('05')) {
        rawDigits = '90' + rawDigits.substring(1);
      }

      const formattedPhone = `+${rawDigits}`;

      // Check if contact already exists
      const existing = await prisma.contact.findFirst({
        where: {
          OR: [
            { phone: formattedPhone },
            { phone: rawDigits },
            { phone: rawDigits.startsWith('90') ? rawDigits.substring(2) : rawDigits },
          ]
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
        if (updated.length > 0) {
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
