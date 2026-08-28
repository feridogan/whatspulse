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

    let contactsCount = 0;
    let groupsCount = 0;
    let chatsCount = 0;

    // 1. Sync WhatsApp Groups
    try {
      const evoGroups = await EvolutionService.fetchGroups();
      if (Array.isArray(evoGroups)) {
        for (const g of evoGroups) {
          const groupName = g.subject || g.name || g.id || 'WhatsApp Grubu';
          if (!groupName || groupName === 'status@broadcast') continue;

          await prisma.group.upsert({
            where: { name: groupName },
            update: { 
              description: `WhatsApp Grubu (JID: ${g.id || ''})`,
            },
            create: {
              name: groupName,
              description: `WhatsApp Grubu (JID: ${g.id || ''})`,
              color: '#128C7E',
            },
          });
          groupsCount++;
        }
      }
    } catch (err) {
      console.warn('[Sync Groups Warning]:', err);
    }

    // 2. Sync Contacts
    try {
      const evoContacts = await EvolutionService.fetchContacts();
      if (Array.isArray(evoContacts)) {
        for (const c of evoContacts) {
          const rawId = c.id || c.remoteJid || c.number || '';
          const rawIdStr = String(rawId);

          // Skip groups, status broadcast, newsletter
          if (rawIdStr.includes('@g.us') || rawIdStr.includes('@broadcast') || rawIdStr.includes('@newsletter')) {
            continue;
          }

          const rawPhone = rawIdStr.replace(/@.*$/, '').replace(/\D/g, '');
          const phone = normalizePhone(rawPhone);
          if (!phone || phone.length < 9) continue;

          const name = c.pushName || c.name || c.verifiedName || c.shortName || `Kişi ${phone.slice(-4)}`;

          await prisma.contact.upsert({
            where: { phone },
            update: {
              name: name || undefined,
            },
            create: {
              phone,
              name,
              notes: 'WhatsApp Evolution API senkronizasyonu ile eklendi',
            },
          });
          contactsCount++;
        }
      }
    } catch (err) {
      console.warn('[Sync Contacts Warning]:', err);
    }

    // 3. Sync Chats
    try {
      const evoChats = await EvolutionService.fetchChats();
      if (Array.isArray(evoChats)) {
        for (const ch of evoChats) {
          const rawId = String(ch.id || ch.remoteJid || '');
          if (rawId.includes('@broadcast') || rawId.includes('@newsletter')) continue;

          const isGroup = rawId.includes('@g.us');
          const rawPhone = isGroup ? rawId : rawId.replace(/@.*$/, '').replace(/\D/g, '');
          const phone = isGroup ? rawId : (normalizePhone(rawPhone) || rawPhone);
          if (!phone) continue;

          const contactName = ch.name || ch.pushName || (isGroup ? 'WhatsApp Grubu' : null);

          await prisma.chat.upsert({
            where: { phone },
            update: {
              contactName: contactName || undefined,
              unreadCount: ch.unreadCount || 0,
              isGroup,
            },
            create: {
              phone,
              contactName,
              unreadCount: ch.unreadCount || 0,
              isGroup,
            },
          });
          chatsCount++;
        }
      }
    } catch (err) {
      console.warn('[Sync Chats Warning]:', err);
    }

    return NextResponse.json({
      success: true,
      message: `${contactsCount} kişi ve ${groupsCount} grup başarıyla güncellendi.`,
      synced: {
        contacts: contactsCount,
        groups: groupsCount,
        chats: chatsCount,
      },
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Senkronizasyon hatası: ' + error.message }, { status: 500 });
  }
}
