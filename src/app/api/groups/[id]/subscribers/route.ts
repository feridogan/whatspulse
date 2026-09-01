import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { requireAuth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureDbSchemaSync();
    const groupId = params.id;

    // Fetch members from both SubscriberGroup and ContactGroup
    const [subLinks, contactLinks] = await Promise.all([
      prisma.subscriberGroup.findMany({
        where: { groupId },
        include: { subscriber: true }
      }).catch(() => []),
      prisma.contactGroup.findMany({
        where: { groupId },
        include: { contact: true }
      }).catch(() => [])
    ]);

    const inGroupMap = new Map<string, any>();

    for (const l of subLinks) {
      if (l.subscriber) {
        inGroupMap.set(l.subscriber.id, {
          id: l.subscriber.id,
          name: l.subscriber.name,
          phone: l.subscriber.phone,
          company: l.subscriber.company,
          source: 'subscriber'
        });
      }
    }

    for (const l of contactLinks) {
      if (l.contact && !inGroupMap.has(l.contact.id)) {
        inGroupMap.set(l.contact.id, {
          id: l.contact.id,
          name: l.contact.name,
          phone: l.contact.phone,
          company: (l.contact as any).company || null,
          source: 'contact'
        });
      }
    }

    const inGroupSubscribers = Array.from(inGroupMap.values());
    const inGroupIds = inGroupSubscribers.map(s => s.id);
    const inGroupPhones = new Set(inGroupSubscribers.map(s => s.phone.replace(/[^\d]/g, "")));

    // Fetch all other available contacts / subscribers
    const [allSubscribers, allContacts] = await Promise.all([
      prisma.subscriber.findMany({
        where: inGroupIds.length > 0 ? { id: { notIn: inGroupIds } } : {},
        orderBy: { name: "asc" }
      }).catch(() => []),
      prisma.contact.findMany({
        where: inGroupIds.length > 0 ? { id: { notIn: inGroupIds } } : {},
        orderBy: { name: "asc" }
      }).catch(() => [])
    ]);

    const otherMap = new Map<string, any>();

    for (const s of allSubscribers) {
      const cleanPhone = s.phone.replace(/[^\d]/g, "");
      if (!inGroupPhones.has(cleanPhone) && !otherMap.has(cleanPhone)) {
        otherMap.set(cleanPhone, {
          id: s.id,
          name: s.name,
          phone: s.phone,
          company: s.company,
          source: 'subscriber'
        });
      }
    }

    for (const c of allContacts) {
      const cleanPhone = c.phone.replace(/[^\d]/g, "");
      if (!inGroupPhones.has(cleanPhone) && !otherMap.has(cleanPhone)) {
        otherMap.set(cleanPhone, {
          id: c.id,
          name: c.name,
          phone: c.phone,
          company: (c as any).company || null,
          source: 'contact'
        });
      }
    }

    const otherSubscribers = Array.from(otherMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'tr'));

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
      await prisma.subscriberGroup.deleteMany({ where: { groupId } }).catch(() => {});
      await prisma.contactGroup.deleteMany({ where: { groupId } }).catch(() => {});

      // 2. Fetch records to know whether each id belongs to Subscriber or Contact
      const [existingSubs, existingContacts] = await Promise.all([
        prisma.subscriber.findMany({
          where: { id: { in: subscriberIds } },
          select: { id: true }
        }).catch(() => []),
        prisma.contact.findMany({
          where: { id: { in: subscriberIds } },
          select: { id: true }
        }).catch(() => [])
      ]);

      const subIdSet = new Set(existingSubs.map(s => s.id));
      const contactIdSet = new Set(existingContacts.map(c => c.id));

      for (const id of subscriberIds) {
        if (subIdSet.has(id)) {
          await prisma.subscriberGroup.create({
            data: { subscriberId: id, groupId }
          }).catch(() => {});
        }
        if (contactIdSet.has(id)) {
          await prisma.contactGroup.create({
            data: { contactId: id, groupId }
          }).catch(() => {});
        }
        // If id is in neither, create contact record or attach
        if (!subIdSet.has(id) && !contactIdSet.has(id)) {
          await prisma.contactGroup.create({
            data: { contactId: id, groupId }
          }).catch(() => {});
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Grup üyeleri başarıyla kaydedildi ve sayıldı."
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
