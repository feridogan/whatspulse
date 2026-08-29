import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EvolutionService } from '@/lib/evolution';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').toLowerCase().trim();

    // 1. Fetch live chats from Evolution API v2
    let evoChats: any[] = [];
    try {
      evoChats = await EvolutionService.fetchChats();
    } catch (e) {
      console.warn('[Chats API] Evolution fetchChats warning:', e);
    }

    // 2. Fetch local contacts for name matching
    const contacts = await prisma.contact.findMany({
      include: {
        groups: {
          include: { group: true },
        },
      },
    });

    const contactMap = new Map<string, any>();
    contacts.forEach((c) => {
      const cleanDigits = c.phone.replace(/^\++/, '').replace(/\D/g, '');
      if (cleanDigits) {
        contactMap.set(`+${cleanDigits}`, c);
        contactMap.set(cleanDigits, c);
        contactMap.set(`++${cleanDigits}`, c);
      }
    });

    // 3. Process Evolution chats and local DB chats
    const dbChats = await prisma.chat.findMany({
      orderBy: { lastMessageTime: 'desc' },
      take: 200,
    });

    const dbChatMap = new Map<string, any>();
    dbChats.forEach((c) => {
      dbChatMap.set(c.phone, c);
    });

    const processedMap = new Map<string, any>();

    // Process Evolution API chats first
    for (const ec of evoChats) {
      const jid = (ec.id || ec.remoteJid || ec.jid || '').trim();
      if (!jid || jid.endsWith('@broadcast') || jid.endsWith('@newsletter') || jid.endsWith('@lid')) {
        continue;
      }

      const isGroup = jid.includes('@g.us');

      if (isGroup) {
        const groupName = ec.name || ec.subject || ec.pushName || 'WhatsApp Grubu';
        const lastMsg = typeof ec.lastMessage === 'string' ? ec.lastMessage : ec.lastMessage?.conversation || ec.lastMessage?.extendedTextMessage?.text || 'Grup Sohbeti';
        const ts = ec.conversationTimestamp || ec.lastMsgTimestamp || ec.updatedAt;
        const lastTime = ts ? new Date(Number(ts) * (String(ts).length <= 10 ? 1000 : 1)) : new Date();

        processedMap.set(jid, {
          id: jid,
          jid,
          phone: jid,
          name: groupName,
          displayName: groupName,
          contactName: groupName,
          isGroup: true,
          unreadCount: ec.unreadCount || 0,
          lastMessage: lastMsg || 'Grup Sohbeti',
          lastMessageTime: isNaN(lastTime.getTime()) ? new Date() : lastTime,
          avatar: '👥',
          contact: null,
          groups: [],
        });
      } else {
        // Individual contact
        const rawDigits = jid.split('@')[0].replace(/:.*$/, '').replace(/\D/g, '');
        if (!rawDigits) continue;
        const phone = `+${rawDigits}`;
        const matchedContact = contactMap.get(phone) || contactMap.get(rawDigits) || contactMap.get(`++${rawDigits}`);

        const candidateName = matchedContact?.name || ec.pushName || ec.name || ec.verifiedName || phone;
        const hasRealName = Boolean(
          candidateName &&
          candidateName !== phone &&
          candidateName !== `+${rawDigits}` &&
          candidateName !== rawDigits &&
          candidateName.replace(/\D/g, '') !== rawDigits
        );

        const displayName = hasRealName ? candidateName : phone;
        const lastMsg = typeof ec.lastMessage === 'string' ? ec.lastMessage : ec.lastMessage?.conversation || ec.lastMessage?.extendedTextMessage?.text || '';
        const ts = ec.conversationTimestamp || ec.lastMsgTimestamp || ec.updatedAt;
        const lastTime = ts ? new Date(Number(ts) * (String(ts).length <= 10 ? 1000 : 1)) : new Date();

        processedMap.set(phone, {
          id: phone,
          jid,
          phone,
          name: displayName,
          displayName,
          contactName: displayName,
          isGroup: false,
          unreadCount: ec.unreadCount || 0,
          lastMessage: lastMsg || 'Sohbet',
          lastMessageTime: isNaN(lastTime.getTime()) ? new Date() : lastTime,
          avatar: displayName.charAt(0).toUpperCase(),
          contact: matchedContact || null,
          groups: matchedContact?.groups?.map((g: any) => g.group) || [],
        });
      }
    }

    // Merge with DB chats that might not be in the recent Evolution buffer
    for (const dc of dbChats) {
      const jid = dc.phone;
      const isGroup = jid.includes('@g.us') || dc.isGroup;

      if (!processedMap.has(jid)) {
        if (isGroup) {
          processedMap.set(jid, {
            id: jid,
            jid,
            phone: jid,
            name: dc.contactName || 'WhatsApp Grubu',
            displayName: dc.contactName || 'WhatsApp Grubu',
            contactName: dc.contactName || 'WhatsApp Grubu',
            isGroup: true,
            unreadCount: dc.unreadCount || 0,
            lastMessage: dc.lastMessage || 'Grup Sohbeti',
            lastMessageTime: dc.lastMessageTime || new Date(),
            avatar: '👥',
            contact: null,
            groups: [],
          });
        } else {
          const cleanDigits = jid.replace(/^\++/, '').replace(/\D/g, '');
          const phone = `+${cleanDigits}`;
          const matchedContact = contactMap.get(phone) || contactMap.get(cleanDigits);
          const candidateName = matchedContact?.name || dc.contactName || phone;
          const hasRealName = Boolean(
            candidateName &&
            candidateName !== phone &&
            candidateName !== `+${cleanDigits}` &&
            candidateName !== cleanDigits &&
            candidateName.replace(/\D/g, '') !== cleanDigits
          );
          const displayName = hasRealName ? candidateName : phone;

          processedMap.set(phone, {
            id: phone,
            jid: `${cleanDigits}@s.whatsapp.net`,
            phone,
            name: displayName,
            displayName,
            contactName: displayName,
            isGroup: false,
            unreadCount: dc.unreadCount || 0,
            lastMessage: dc.lastMessage || 'Sohbet',
            lastMessageTime: dc.lastMessageTime || new Date(),
            avatar: displayName.charAt(0).toUpperCase(),
            contact: matchedContact || null,
            groups: matchedContact?.groups?.map((g: any) => g.group) || [],
          });
        }
      }
    }

    // Convert map to array and sort by lastMessageTime descending
    let allChats = Array.from(processedMap.values()).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    // Apply search filter if provided
    if (search) {
      allChats = allChats.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.displayName.toLowerCase().includes(search) ||
          c.phone.toLowerCase().includes(search) ||
          c.lastMessage.toLowerCase().includes(search)
      );
    }

    return NextResponse.json(allChats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
