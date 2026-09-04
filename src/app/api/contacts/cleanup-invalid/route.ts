import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { isValidContactName } from "@/lib/phone-utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const authCheck = await requireAuth(req);
    if (authCheck.error) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const allContacts = await prisma.contact.findMany({
      select: { id: true, name: true, phone: true },
    });
    const invalidContactIds = allContacts
      .filter((c) => !isValidContactName(c.name, c.phone))
      .map((c) => c.id);

    if (invalidContactIds.length > 0) {
      await prisma.contactGroup.deleteMany({
        where: { contactId: { in: invalidContactIds } },
      }).catch(() => {});
      await prisma.contact.deleteMany({
        where: { id: { in: invalidContactIds } },
      }).catch(() => {});
    }

    // Clean from subscribers as well
    const allSubs = await prisma.subscriber.findMany({
      select: { id: true, name: true, phone: true },
    });
    const invalidSubIds = allSubs
      .filter((s) => !isValidContactName(s.name, s.phone))
      .map((s) => s.id);

    if (invalidSubIds.length > 0) {
      await prisma.subscriberGroup.deleteMany({
        where: { subscriberId: { in: invalidSubIds } },
      }).catch(() => {});
      await prisma.subscriber.deleteMany({
        where: { id: { in: invalidSubIds } },
      }).catch(() => {});
    }

    // Total remaining valid contacts
    const remainingCount = await prisma.contact.count();

    return NextResponse.json({
      success: true,
      message: `Temizlik başarıyla tamamlandı: ${invalidContactIds.length} adet isimsiz veya geçersiz karakterli kayıt rehberden silindi. Toplam ${remainingCount} geçerli kişi korundu.`,
      stats: {
        deletedContacts: invalidContactIds.length,
        deletedSubscribers: invalidSubIds.length,
        remainingContacts: remainingCount,
      },
    });
  } catch (error: any) {
    console.error("[Cleanup Invalid Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Geçersiz kayıtları temizleme işlemi başarısız oldu." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
