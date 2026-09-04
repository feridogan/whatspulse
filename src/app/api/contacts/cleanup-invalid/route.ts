import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ensureDbSchemaSync } from "@/lib/db-sync";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const authCheck = await requireAuth(req);
    if (authCheck.error) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const invalidCondition = {
      OR: [
        { name: null },
        { name: "" },
        { name: { startsWith: "." } },
        { name: { startsWith: "," } },
        { name: { startsWith: "-" } },
        { name: { startsWith: "_" } },
        { name: { startsWith: "+" } },
        { name: { startsWith: "05" } },
        { name: { startsWith: "90" } },
      ],
    };

    // Find IDs to clean up relations
    const invalidContacts = await prisma.contact.findMany({
      where: invalidCondition,
      select: { id: true },
    });
    const invalidContactIds = invalidContacts.map((c) => c.id);

    if (invalidContactIds.length > 0) {
      await prisma.contactGroup.deleteMany({
        where: { contactId: { in: invalidContactIds } },
      }).catch(() => {});
      await prisma.contact.deleteMany({
        where: { id: { in: invalidContactIds } },
      }).catch(() => {});
    }

    // Clean from subscribers as well
    const invalidSubs = await prisma.subscriber.findMany({
      where: invalidCondition,
      select: { id: true },
    });
    const invalidSubIds = invalidSubs.map((s) => s.id);

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
