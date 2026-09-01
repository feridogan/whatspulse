import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { requireAuth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureDbSchemaSync();
    const groupId = params.id;

    // Fetch subscribers inside this group
    const inGroupLinks = await prisma.subscriberGroup.findMany({
      where: { groupId },
      include: { subscriber: true }
    });
    const inGroupSubscribers = inGroupLinks.map(l => l.subscriber).filter(Boolean);
    const inGroupIds = inGroupSubscribers.map(s => s.id);

    // Fetch all other subscribers without limit
    let otherSubscribers = await prisma.subscriber.findMany({
      where: inGroupIds.length > 0 ? { id: { notIn: inGroupIds } } : {},
      orderBy: { name: "asc" }
    });

    // If Subscriber table is empty or has fewer records than Contact, also check Contact table
    if (otherSubscribers.length === 0 && inGroupSubscribers.length === 0) {
      const allContacts = await prisma.contact.findMany({
        orderBy: { name: "asc" }
      });
      otherSubscribers = allContacts as any;
    }

    return NextResponse.json({
      success: true,
      inGroupSubscribers,
      otherSubscribers,
      totalCount: inGroupSubscribers.length + otherSubscribers.length
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Save Dual-Window changes (assign / remove subscribers for group)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureDbSchemaSync();
    const authCheck = await requireAuth(req);
    if (authCheck.error) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const groupId = params.id;
    const body = await req.json();
    const { subscriberIds, name, description } = body;

    // Update group details if provided
    if (name) {
      await prisma.group.update({
        where: { id: groupId },
        data: { name: name.trim(), description: description ? description.trim() : null }
      });
    }

    if (Array.isArray(subscriberIds)) {
      // 1. Delete previous group mappings
      await prisma.subscriberGroup.deleteMany({ where: { groupId } });
      await prisma.contactGroup.deleteMany({ where: { groupId } }).catch(() => {});

      // 2. Insert new mappings
      for (const sId of subscriberIds) {
        await prisma.subscriberGroup.create({
          data: { subscriberId: sId, groupId }
        }).catch(async () => {
          // If subscriberId belongs to Contact table
          await prisma.contactGroup.create({
            data: { contactId: sId, groupId }
          }).catch(() => {});
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Grup üyeleri başarıyla güncellendi."
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
