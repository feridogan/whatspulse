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

    const body = await req.json();
    const contactId = body.contactId || body.id;
    const phone = body.phone;

    if (!contactId && !phone) {
      return NextResponse.json(
        { success: false, error: "contactId veya phone parametresi zorunludur." },
        { status: 400 }
      );
    }

    let contact = null;
    if (contactId) {
      contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });
    }

    if (!contact && phone) {
      const cleanP = phone.replace(/[^\d+]/g, "");
      contact = await prisma.contact.findFirst({
        where: {
          OR: [
            { phone: phone },
            { phone: cleanP },
            { phone: { contains: cleanP.replace("+", "") } },
          ],
        },
      });
    }

    if (!contact) {
      return NextResponse.json({ success: false, error: "Kişi bulunamadı." }, { status: 404 });
    }

    // 1. Fetch info from Evolution API
    const waInfo = await EvolutionService.fetchContactInfo(contact.phone);

    // 2. Also try fetching profile picture specifically if not present
    let profilePicUrl = waInfo.profilePicUrl;
    if (!profilePicUrl) {
      profilePicUrl = await EvolutionService.fetchProfilePictureUrl(contact.phone);
    }

    // 3. Apply exact user WhatsApp sync logic
    const updatedFields = await syncWhatsAppContactInfo(contact, {
      waName: waInfo.pushName,
      profilePicUrl: profilePicUrl,
    });

    const refreshed = await prisma.contact.findUnique({
      where: { id: contact.id },
      include: {
        groups: {
          include: {
            group: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Kişi bilgileri WhatsApp ile başarıyla senkronize edildi.",
      contact: refreshed,
      updatedFields,
    });
  } catch (error: any) {
    console.error("[Sync Single Contact Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
