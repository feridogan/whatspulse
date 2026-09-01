import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const authCheck = await requireAuth(req);
    if (authCheck.error) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    // Copy all Contacts to Subscribers
    const contacts = await prisma.contact.findMany({
      include: { groups: true }
    });

    let syncedCount = 0;
    for (const c of contacts) {
      const sub = await prisma.subscriber.upsert({
        where: { phone: c.phone },
        update: {
          name: c.name,
          email: c.email,
          notes: c.notes,
          isBlacklisted: c.isBlacklisted
        },
        create: {
          name: c.name,
          phone: c.phone,
          email: c.email,
          notes: c.notes,
          isBlacklisted: c.isBlacklisted,
          channels: ["WhatsApp"],
          preferredTime: "08:00",
          language: "TR"
        }
      });

      // Transfer group links
      for (const cg of c.groups) {
        await prisma.subscriberGroup.upsert({
          where: { subscriberId_groupId: { subscriberId: sub.id, groupId: cg.groupId } },
          update: {},
          create: { subscriberId: sub.id, groupId: cg.groupId }
        }).catch(() => {});
      }

      syncedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `${syncedCount} kişi abone rehberine başarıyla eşitlendi.`,
      syncedCount
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
