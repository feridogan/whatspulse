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

    // 1. Fetch all contacts from Evolution API
    const waContacts = await EvolutionService.fetchAllContacts();

    let createdCount = 0;
    let updatedCount = 0;

    for (const c of waContacts) {
      const cleanPhone = c.phone.replace(/[^\d+]/g, '');
      if (!cleanPhone || cleanPhone.length < 7) continue;

      // Check if contact already exists
      const existing = await prisma.contact.findFirst({
        where: {
          OR: [
            { phone: cleanPhone },
            { phone: `+${cleanPhone}` },
            { phone: cleanPhone.startsWith('90') ? cleanPhone.substring(2) : cleanPhone },
          ]
        }
      });

      if (!existing) {
        // Create new contact
        const displayName = c.name || c.pushName || `+${cleanPhone}`;
        await prisma.contact.create({
          data: {
            name: displayName,
            phone: cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`,
            avatar: c.profilePicUrl || null,
            isCustomName: false,
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
        where: { phone: cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}` },
        update: {
          name: c.name || c.pushName || undefined,
        },
        create: {
          name: c.name || c.pushName || `+${cleanPhone}`,
          phone: cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`,
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
      message: `WhatsApp senkronizasyonu tamamlandı: ${createdCount} yeni kişi eklendi, ${updatedCount} kişi güncellendi. Toplam ${waContacts.length} WhatsApp kaydı tarandı.`,
      stats: {
        totalFound: waContacts.length,
        created: createdCount,
        updated: updatedCount,
      }
    });
  } catch (error: any) {
    console.error("[Bulk Sync Contacts Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
