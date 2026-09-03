import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { normalizePhoneNumber, isPlaceholderName } from "@/lib/phone-utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const authCheck = await requireAuth(req);
    if (authCheck.error) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    // 1. Process Contacts
    const allContacts = await prisma.contact.findMany({
      include: {
        groups: true,
      }
    });

    const invalidContactIds: string[] = [];
    const duplicateContactIds: string[] = [];
    const phoneToContactsMap = new Map<string, typeof allContacts>();

    for (const c of allContacts) {
      const norm = normalizePhoneNumber(c.phone);
      if (!norm) {
        invalidContactIds.push(c.id);
        continue;
      }
      if (!phoneToContactsMap.has(norm)) {
        phoneToContactsMap.set(norm, []);
      }
      phoneToContactsMap.get(norm)!.push(c);
    }

    let keptContactsCount = 0;

    for (const [normPhone, list] of phoneToContactsMap.entries()) {
      keptContactsCount++;

      // Sort to find the best contact to retain
      list.sort((a, b) => {
        // Priority 1: Custom name
        if (a.isCustomName && !b.isCustomName) return -1;
        if (!a.isCustomName && b.isCustomName) return 1;

        // Priority 2: Valid real name (not just phone placeholder)
        const aHasRealName = !isPlaceholderName(a.name, a.phone);
        const bHasRealName = !isPlaceholderName(b.name, b.phone);
        if (aHasRealName && !bHasRealName) return -1;
        if (!aHasRealName && bHasRealName) return 1;

        // Priority 3: Has avatar
        const aHasAvatar = Boolean(a.avatar && a.avatar.length > 5);
        const bHasAvatar = Boolean(b.avatar && b.avatar.length > 5);
        if (aHasAvatar && !bHasAvatar) return -1;
        if (!aHasAvatar && bHasAvatar) return 1;

        // Priority 4: Most recently updated
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      const winner = list[0];
      const duplicates = list.slice(1);

      // Reassign groups from duplicates to winner
      for (const dup of duplicates) {
        duplicateContactIds.push(dup.id);
        for (const g of dup.groups) {
          await prisma.contactGroup.upsert({
            where: {
              contactId_groupId: {
                contactId: winner.id,
                groupId: g.groupId,
              }
            },
            update: {},
            create: {
              contactId: winner.id,
              groupId: g.groupId,
            }
          }).catch(() => {});
        }
      }

      // Ensure winner has normalized phone format
      if (winner.phone !== normPhone) {
        await prisma.contact.update({
          where: { id: winner.id },
          data: {
            phone: normPhone,
            name: (!winner.name || isPlaceholderName(winner.name, winner.phone)) ? normPhone : winner.name,
          }
        }).catch(() => {});
      }
    }

    // Delete invalid & duplicate contacts
    const contactsToDelete = Array.from(new Set([...invalidContactIds, ...duplicateContactIds]));
    if (contactsToDelete.length > 0) {
      await prisma.contactGroup.deleteMany({
        where: { contactId: { in: contactsToDelete } }
      }).catch(() => {});
      await prisma.contact.deleteMany({
        where: { id: { in: contactsToDelete } }
      }).catch(() => {});
    }

    // 2. Process Subscribers (if applicable)
    const allSubs = await prisma.subscriber.findMany({
      include: {
        groups: true,
      }
    });

    const invalidSubIds: string[] = [];
    const duplicateSubIds: string[] = [];
    const phoneToSubsMap = new Map<string, typeof allSubs>();

    for (const s of allSubs) {
      const norm = normalizePhoneNumber(s.phone);
      if (!norm) {
        invalidSubIds.push(s.id);
        continue;
      }
      if (!phoneToSubsMap.has(norm)) {
        phoneToSubsMap.set(norm, []);
      }
      phoneToSubsMap.get(norm)!.push(s);
    }

    for (const [normPhone, list] of phoneToSubsMap.entries()) {
      list.sort((a, b) => {
        const aHasRealName = !isPlaceholderName(a.name, a.phone);
        const bHasRealName = !isPlaceholderName(b.name, b.phone);
        if (aHasRealName && !bHasRealName) return -1;
        if (!aHasRealName && bHasRealName) return 1;

        const aHasAvatar = Boolean(a.avatar && a.avatar.length > 5);
        const bHasAvatar = Boolean(b.avatar && b.avatar.length > 5);
        if (aHasAvatar && !bHasAvatar) return -1;
        if (!aHasAvatar && bHasAvatar) return 1;

        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      const winner = list[0];
      const duplicates = list.slice(1);

      for (const dup of duplicates) {
        duplicateSubIds.push(dup.id);
        for (const g of dup.groups) {
          await prisma.subscriberGroup.upsert({
            where: {
              subscriberId_groupId: {
                subscriberId: winner.id,
                groupId: g.groupId,
              }
            },
            update: {},
            create: {
              subscriberId: winner.id,
              groupId: g.groupId,
            }
          }).catch(() => {});
        }
      }

      if (winner.phone !== normPhone) {
        await prisma.subscriber.update({
          where: { id: winner.id },
          data: {
            phone: normPhone,
            name: (!winner.name || isPlaceholderName(winner.name, winner.phone)) ? normPhone : winner.name,
          }
        }).catch(() => {});
      }
    }

    const subsToDelete = Array.from(new Set([...invalidSubIds, ...duplicateSubIds]));
    if (subsToDelete.length > 0) {
      await prisma.subscriberGroup.deleteMany({
        where: { subscriberId: { in: subsToDelete } }
      }).catch(() => {});
      await prisma.subscriber.deleteMany({
        where: { id: { in: subsToDelete } }
      }).catch(() => {});
    }

    const totalSpamDeleted = invalidContactIds.length;
    const totalDuplicatesDeleted = duplicateContactIds.length;

    return NextResponse.json({
      success: true,
      message: `Temizlik başarıyla tamamlandı: ${totalSpamDeleted} geçersiz/yabancı spam numara silindi, ${totalDuplicatesDeleted} mükerrer kayıt birleştirildi. Toplam ${keptContactsCount} benzersiz geçerli kişi korundu.`,
      stats: {
        deletedSpam: totalSpamDeleted,
        deletedDuplicates: totalDuplicatesDeleted,
        remainingContacts: keptContactsCount,
      }
    });
  } catch (error: any) {
    console.error("[Cleanup Duplicates Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Rehber temizleme işlemi başarısız oldu." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
