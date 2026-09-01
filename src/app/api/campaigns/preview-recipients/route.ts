import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { normalizePhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const body = await req.json();
    const { groupIds, targetGroupIds, contactIds, targetContactIds, sendToAll } = body;

    const resolvedGroupIds = (Array.isArray(targetGroupIds) && targetGroupIds.length > 0)
      ? targetGroupIds
      : (Array.isArray(groupIds) && groupIds.length > 0)
        ? groupIds
        : (body.groupId ? [body.groupId] : []);

    const resolvedContactIds = (Array.isArray(contactIds) && contactIds.length > 0)
      ? contactIds
      : (Array.isArray(targetContactIds) && targetContactIds.length > 0)
        ? targetContactIds
        : [];

    let groupNames: string[] = [];
    let rawRecipients: any[] = [];

    // Fetch group names
    if (resolvedGroupIds.length > 0) {
      const dbGroups = await prisma.group.findMany({
        where: { id: { in: resolvedGroupIds } },
        select: { id: true, name: true },
      });
      groupNames = dbGroups.map((g) => g.name);

      // 1. Fetch from Contact table
      const contacts = await prisma.contact.findMany({
        where: {
          groups: {
            some: {
              groupId: { in: resolvedGroupIds },
            },
          },
          isBlacklisted: false,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          customFields: true,
        },
      });

      // 2. Fetch from Subscriber table
      const subscribers = await prisma.subscriber.findMany({
        where: {
          groups: {
            some: {
              groupId: { in: resolvedGroupIds },
            },
          },
          isBlacklisted: false,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          customFields: true,
        },
      });

      rawRecipients = [
        ...contacts.map((c) => ({ ...c, source: "contact" })),
        ...subscribers.map((s) => ({ ...s, source: "subscriber" })),
      ];
    } else if (resolvedContactIds.length > 0) {
      const contacts = await prisma.contact.findMany({
        where: {
          id: { in: resolvedContactIds },
          isBlacklisted: false,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          customFields: true,
        },
      });

      const subscribers = await prisma.subscriber.findMany({
        where: {
          id: { in: resolvedContactIds },
          isBlacklisted: false,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          customFields: true,
        },
      });

      rawRecipients = [
        ...contacts.map((c) => ({ ...c, source: "contact" })),
        ...subscribers.map((s) => ({ ...s, source: "subscriber" })),
      ];
    } else if (sendToAll === true) {
      groupNames = ["Tüm Aktif Aboneler"];
      const contacts = await prisma.contact.findMany({
        where: { isBlacklisted: false },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          customFields: true,
        },
      });

      const subscribers = await prisma.subscriber.findMany({
        where: { isBlacklisted: false, isActive: true },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          customFields: true,
        },
      });

      rawRecipients = [
        ...contacts.map((c) => ({ ...c, source: "contact" })),
        ...subscribers.map((s) => ({ ...s, source: "subscriber" })),
      ];
    } else {
      return NextResponse.json({
        error: "Hedef grup seçilmedi. Lütfen en az bir grup seçiniz.",
      }, { status: 400 });
    }

    // Deduplicate and validate phone numbers
    const uniqueMap = new Map<string, any>();
    for (const r of rawRecipients) {
      const cleanPhone = normalizePhone(r.phone);
      if (cleanPhone && !uniqueMap.has(cleanPhone)) {
        const digitsOnly = cleanPhone.replace(/\D/g, "");
        const isValid = digitsOnly.length >= 10 && digitsOnly.length <= 15;

        uniqueMap.set(cleanPhone, {
          id: r.id,
          name: r.name || "İsimsiz Abone",
          phone: cleanPhone,
          rawPhone: r.phone,
          email: r.email || null,
          customFields: r.customFields || {},
          source: r.source,
          isValid,
        });
      }
    }

    const recipients = Array.from(uniqueMap.values());

    return NextResponse.json({
      success: true,
      total: recipients.length,
      groupNames: groupNames.length > 0 ? groupNames : ["Belirtilmemiş Grup"],
      recipients,
    });
  } catch (error: any) {
    console.error("Preview recipients error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
