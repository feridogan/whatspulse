import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EvolutionService } from '@/lib/evolution';
import { normalizePhone } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    let contactsCount = 0;
    let groupsCount = 0;
    let chatsCount = 0;

    // 1. Sync WhatsApp Groups
    try {
      const evoGroups = await EvolutionService.fetchGroups();
      if (Array.isArray(evoGroups)) {
        for (const g of evoGroups) {
          const groupName = g.subject || g.name || g.id || 'WhatsApp Grubu';
          await prisma.group.upsert({
            where: { name: groupName },
            update: { description: `WhatsApp Grubu (JID: ${g.id || ''})` },
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
      console.warn('Group sync warning:', err);
    }

    // 2. Sync Contacts
    try {
      const evoContacts = await EvolutionService.fetchContacts();
      if (Array.isArray(evoContacts)) {
        for (const c of evoContacts) {
          const rawPhone = c.id || c.remoteJid || c.number || '';
          const phone = normalizePhone(rawPhone);
          if (!phone || phone.length < 9) continue;

          const name = c.pushName || c.name || c.verifiedName || `Kişi ${phone.slice(-4)}`;

          await prisma.contact.upsert({
            where: { phone },
            update: {
              name: name || undefined,
            },
            create: {
              phone,
              name,
              notes: 'Evolution API senkronizasyonu ile eklendi',
            },
          });
          contactsCount++;
        }
      }
    } catch (err) {
      console.warn('Contacts sync warning:', err);
    }

    // 3. Sync Chats
    try {
      const evoChats = await EvolutionService.fetchChats();
      if (Array.isArray(evoChats)) {
        for (const ch of evoChats) {
          const rawPhone = ch.id || ch.remoteJid || '';
          const phone = normalizePhone(rawPhone) || rawPhone;
          if (!phone) continue;

          const contactName = ch.name || ch.pushName || null;
          const isGroup = String(rawPhone).includes('@g.us');

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
      console.warn('Chats sync warning:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp verileri başarıyla senkronize edildi!',
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
