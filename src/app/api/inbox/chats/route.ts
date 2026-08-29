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

    // 2. Fetch all local contacts for accurate name & phone matching
    const contacts = await prisma.contact.findMany({
      include: {
        groups: {
          include: { group: true },
        },
      },
    });

    const contactByPhone = new Map<string, any>();
    const contactByName = new Map<string, any>();

    contacts.forEach((c) => {
      const cleanDigits = c.phone.replace(/^\++/, '').replace(/\D/g, '');
      if (cleanDigits) {
        contactByPhone.set(`+${cleanDigits}`, c);
        contactByPhone.set(cleanDigits, c);
        contactByPhone.set(`++${cleanDigits}`, c);
      }
      if (c.name) {
        contactByName.set(c.name.toLowerCase().trim(), c);
      }
    });

    // 3. Process Evolution chats and local DB chats
    const dbChats = await prisma.chat.findMany({
      orderBy: { lastMessageTime: 'desc' },
      take: 200,
    });

    const processedMap = new Map<string, any>();

    // Process Evolution API chats
    for (const ec of evoChats) {
      const jid = (ec.id || ec.remoteJid || ec.jid || '').trim();
      if (!jid || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) {
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
        // Individual or LID
        const isLid = jid.includes('@lid');
        const rawDigits = jid.split('@')[0].replace(/:.*$/, '').replace(/\D/g, '');

        // Try to match contact by phone first, then by name
        let matchedContact = null;
        if (!isLid && rawDigits.length >= 10 && rawDigits.length <= 13) {
          matchedContact = contactByPhone.get(`+${rawDigits}`) || contactByPhone.get(rawDigits);
        }

        if (!matchedContact) {
          const searchName = (ec.name || ec.pushName || ec.verifiedName || '').toLowerCase().trim();
          if (searchName) {
            matchedContact = contactByName.get(searchName);
          }
        }

        // If it is an internal LID (e.g. 52401...) without a matched contact, ignore it to prevent fake numbers
        if (isLid && !matchedContact) {
          continue;
        }

        // Also check if rawDigits looks like a fake 14-16 digit internal ID starting with 52
        if (!matchedContact && (rawDigits.length > 13 || (rawDigits.startsWith('52') && rawDigits.length >= 14))) {
          continue;
        }

        const realPhone = matchedContact
          ? (matchedContact.phone.startsWith('+') ? matchedContact.phone : `+${matchedContact.phone.replace(/\D/g, '')}`)
          : `+${rawDigits}`;

        const cleanDigits = realPhone.replace(/\D/g, '');
        const candidateName = matchedContact?.name || ec.pushName || ec.name || ec.verifiedName || realPhone;
        const hasRealName = Boolean(
          candidateName &&
          candidateName !== realPhone &&
          candidateName !== `+${cleanDigits}` &&
          candidateName !== cleanDigits &&
          candidateName.replace(/\D/g, '') !== cleanDigits
        );

        const displayName = hasRealName ? candidateName : realPhone;
        const lastMsg = typeof ec.lastMessage === 'string' ? ec.lastMessage : ec.lastMessage?.conversation || ec.lastMessage?.extendedTextMessage?.text || '';
        const ts = ec.conversationTimestamp || ec.lastMsgTimestamp || ec.updatedAt;
        const lastTime = ts ? new Date(Number(ts) * (String(ts).length <= 10 ? 1000 : 1)) : new Date();

        processedMap.set(realPhone, {
          id: realPhone,
          jid: `${cleanDigits}@s.whatsapp.net`,
          phone: realPhone,
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

    // Merge with DB chats
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
          if (!cleanDigits || cleanDigits.length < 10) continue;

          const phone = `+${cleanDigits}`;
          const matchedContact = contactByPhone.get(phone) || contactByPhone.get(cleanDigits);
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
