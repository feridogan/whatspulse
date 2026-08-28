import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EvolutionService } from '@/lib/evolution';
import { normalizePhone } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireAuth(req);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    // 1. Concurrently fetch all Contacts, Chats and Groups from Evolution API
    const [contactsResult, chatsResult, groupsResult] = await Promise.allSettled([
      EvolutionService.fetchContacts(),
      EvolutionService.fetchChats(),
      EvolutionService.fetchGroups(),
    ]);

    const evoContacts = contactsResult.status === 'fulfilled' && Array.isArray(contactsResult.value) 
      ? contactsResult.value 
      : [];
    const evoChats = chatsResult.status === 'fulfilled' && Array.isArray(chatsResult.value) 
      ? chatsResult.value 
      : [];
    const evoGroups = groupsResult.status === 'fulfilled' && Array.isArray(groupsResult.value) 
      ? groupsResult.value 
      : [];

    // 2. Extract and sanitize ALL unique contacts across contacts & chats
    const contactMap = new Map<string, { phone: string; name: string; isRealName: boolean }>();

    function addCandidate(rawId: any, rawName: any, rawPushName: any, rawVerifiedName?: any) {
      const idStr = String(rawId || '');
      if (!idStr || 
          idStr.includes('@g.us') || 
          idStr.includes('@broadcast') || 
          idStr.includes('@newsletter') || 
          idStr.includes('@lid') ||
          idStr.startsWith('status@')
      ) {
        return;
      }

      const rawDigits = idStr.replace(/@.*$/, '').replace(/\D/g, '');
      const phone = normalizePhone(rawDigits);
      if (!phone || phone.length < 9) return;

      const realName = (rawName || rawPushName || rawVerifiedName || '').trim();
      const hasRealName = !!realName && realName !== phone && realName !== rawDigits;
      const name = hasRealName ? realName : `Kişi ${phone.slice(-4)}`;

      const existing = contactMap.get(phone);
      if (!existing) {
        contactMap.set(phone, { phone, name, isRealName: hasRealName });
      } else if (!existing.isRealName && hasRealName) {
        contactMap.set(phone, { phone, name, isRealName: true });
      }
    }

    // Process Evolution contacts list
    for (const c of evoContacts) {
      const id = c.id || c.remoteJid || c.number || c.jid;
      const name = c.name || c.formattedName || c.shortName;
      const pushName = c.pushName;
      const verifiedName = c.verifiedName;
      addCandidate(id, name, pushName, verifiedName);
    }

    // Process Evolution recent chats list for additional contacts
    for (const ch of evoChats) {
      const id = ch.id || ch.remoteJid || ch.jid;
      const name = ch.name || ch.formattedName;
      const pushName = ch.pushName;
      addCandidate(id, name, pushName);
    }

    // 3. Batch Process Contacts against database in single queries
    const existingContacts = await prisma.contact.findMany({
      select: { id: true, phone: true, name: true },
    });
    const existingContactMap = new Map(existingContacts.map((c) => [c.phone, c]));

    const contactsToCreate: Array<{ phone: string; name: string; notes: string }> = [];
    const contactsToUpdate: Array<{ id: string; name: string }> = [];

    for (const candidate of contactMap.values()) {
      const existing = existingContactMap.get(candidate.phone);
      if (!existing) {
        contactsToCreate.push({
          phone: candidate.phone,
          name: candidate.name,
          notes: 'WhatsApp Evolution API senkronizasyonu ile eklendi',
        });
      } else if (
        candidate.isRealName &&
        existing.name !== candidate.name &&
        (!existing.name || existing.name.startsWith('Kişi '))
      ) {
        contactsToUpdate.push({
          id: existing.id,
          name: candidate.name,
        });
      }
    }

    // Fast Batch Insert in Chunks of 500
    const CHUNK_SIZE = 500;
    for (let i = 0; i < contactsToCreate.length; i += CHUNK_SIZE) {
      const chunk = contactsToCreate.slice(i, i + CHUNK_SIZE);
      await prisma.contact.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }

    // Fast Batch Update in Transactions of 50
    const UPDATE_CHUNK = 50;
    for (let i = 0; i < contactsToUpdate.length; i += UPDATE_CHUNK) {
      const chunk = contactsToUpdate.slice(i, i + UPDATE_CHUNK);
      await prisma.$transaction(
        chunk.map((u) =>
          prisma.contact.update({
            where: { id: u.id },
            data: { name: u.name },
          })
        )
      );
    }

    // 4. Batch Process Groups
    const groupMap = new Map<string, { name: string; description: string }>();

    for (const g of evoGroups) {
      const groupName = (g.subject || g.name || g.id || '').trim();
      if (!groupName || groupName === 'status@broadcast') continue;
      groupMap.set(groupName.toLowerCase(), {
        name: groupName,
        description: `WhatsApp Grubu (JID: ${g.id || ''})`,
      });
    }

    // Also check group chats in evoChats
    for (const ch of evoChats) {
      const id = String(ch.id || ch.remoteJid || '');
      if (id.includes('@g.us')) {
        const groupName = (ch.name || ch.subject || id).trim();
        if (groupName && !groupMap.has(groupName.toLowerCase())) {
          groupMap.set(groupName.toLowerCase(), {
            name: groupName,
            description: `WhatsApp Grubu (JID: ${id})`,
          });
        }
      }
    }

    const existingGroups = await prisma.group.findMany({
      select: { id: true, name: true },
    });
    const existingGroupNames = new Set(existingGroups.map((g) => g.name.toLowerCase()));

    const groupsToCreate = Array.from(groupMap.values())
      .filter((g) => !existingGroupNames.has(g.name.toLowerCase()))
      .map((g) => ({
        name: g.name,
        description: g.description,
        color: '#128C7E',
      }));

    if (groupsToCreate.length > 0) {
      await prisma.group.createMany({
        data: groupsToCreate,
        skipDuplicates: true,
      });
    }

    // 5. Total count in DB
    const finalContactsCount = await prisma.contact.count();
    const finalGroupsCount = await prisma.group.count();

    const formattedMessage = `Senkronizasyon Başarılı: ${contactMap.size.toLocaleString('tr-TR')} Kişi (Yeni: ${contactsToCreate.length.toLocaleString('tr-TR')}) ve ${groupMap.size} Grup güncellendi.`;

    return NextResponse.json({
      success: true,
      message: formattedMessage,
      synced: {
        totalContacts: finalContactsCount,
        newContacts: contactsToCreate.length,
        updatedContacts: contactsToUpdate.length,
        totalGroups: finalGroupsCount,
        newGroups: groupsToCreate.length,
        chats: evoChats.length,
      },
    });
  } catch (error: any) {
    console.error('[Sync API Error]:', error);
    return NextResponse.json(
      { error: 'Senkronizasyon hatası: ' + error.message },
      { status: 500 }
    );
  }
}
