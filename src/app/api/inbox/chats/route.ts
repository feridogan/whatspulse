import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EvolutionService } from '@/lib/evolution';
import { normalizePhone, formatPhoneNumber, formatPhoneDisplay } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').toLowerCase().trim();

    // 1. Fetch all local contacts from DB
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
      const cleanDigits = normalizePhone(c.phone);
      if (cleanDigits && cleanDigits.length >= 10 && !cleanDigits.startsWith('52') && !cleanDigits.startsWith('54')) {
        contactByPhone.set(cleanDigits, c);
        contactByPhone.set(`+${cleanDigits}`, c);
      }
      if (c.name) {
        contactByName.set(c.name.toLowerCase().trim(), c);
      }
    });

    // 2. Fetch live active chats from Evolution API (WhatsApp live conversation ordering)
    let evoChats: any[] = [];
    try {
      evoChats = await EvolutionService.fetchChats();
    } catch (e) {
      console.warn('[Chats API] Evolution fetchChats warning:', e);
    }

    // 3. Fetch local active chats from database
    const dbChats = await prisma.chat.findMany({
      orderBy: { lastMessageTime: 'desc' },
      take: 300,
    });

    const processedMap = new Map<string, any>();

    // A. Process live Evolution chats (has real WhatsApp conversation timestamps)
    for (const ec of evoChats) {
      const rawJid = String(ec.id || ec.remoteJid || ec.jid || '').trim();
      if (!rawJid || rawJid.includes('@broadcast') || rawJid.includes('@newsletter') || rawJid.startsWith('status@')) {
        continue;
      }

      const isGroup = rawJid.includes('@g.us');

      // Accurate timestamp parsing
      const tsRaw =
        ec.conversationTimestamp ||
        ec.lastMsgTimestamp ||
        ec.lastMessage?.messageTimestamp ||
        ec.messages?.[0]?.messageTimestamp ||
        ec.updatedAt;

      let lastTime = new Date(0);
      if (tsRaw) {
        if (typeof tsRaw === 'number' || !isNaN(Number(tsRaw))) {
          const num = Number(tsRaw);
          lastTime = new Date(num * (String(num).length <= 10 ? 1000 : 1));
        } else {
          const parsed = new Date(tsRaw);
          if (!isNaN(parsed.getTime())) {
            lastTime = parsed;
          }
        }
      }

      const lastMsg =
        typeof ec.lastMessage === 'string'
          ? ec.lastMessage
          : ec.lastMessage?.conversation ||
            ec.lastMessage?.extendedTextMessage?.text ||
            ec.lastMessage?.imageMessage?.caption ||
            '';

      if (isGroup) {
        const groupName = (ec.name || ec.subject || ec.pushName || 'WhatsApp Grubu').trim();
        processedMap.set(rawJid, {
          id: rawJid,
          jid: rawJid,
          phone: rawJid,
          name: groupName,
          displayName: groupName,
          contactName: groupName,
          isGroup: true,
          unreadCount: ec.unreadCount || 0,
          lastMessage: lastMsg || 'Grup Sohbeti',
          lastMessageTime: lastTime,
          avatar: '👥',
          contact: null,
          groups: [],
        });
      } else {
        // Individual or LID
        const isLid = rawJid.includes('@lid');
        const digits = rawJid.split('@')[0].replace(/:.*$/, '').replace(/\D/g, '');

        let matchedContact = null;
        if (!isLid && digits.length >= 10 && digits.length <= 13) {
          const norm = normalizePhone(digits);
          matchedContact = contactByPhone.get(norm) || contactByPhone.get(`+${norm}`);
        }

        if (!matchedContact) {
          const searchName = (ec.name || ec.pushName || ec.verifiedName || '').toLowerCase().trim();
          if (searchName) {
            matchedContact = contactByName.get(searchName);
            if (!matchedContact) {
              matchedContact = contacts.find((c) => {
                const cName = (c.name || '').toLowerCase().trim();
                return cName && (cName === searchName || cName.includes(searchName) || searchName.includes(cName));
              });
            }
          }
        }

        // If it is a LID without any matched contact in DB, skip it
        if (isLid && !matchedContact) {
          continue;
        }

        const cleanDigits = matchedContact ? normalizePhone(matchedContact.phone) : normalizePhone(digits);
        if (!cleanDigits || cleanDigits.length < 10 || cleanDigits.startsWith('52') || cleanDigits.startsWith('54')) {
          continue;
        }

        const phone = `+${cleanDigits}`;
        const rawName = (matchedContact?.name || ec.pushName || ec.name || ec.verifiedName || '').trim();
        const isRealName = Boolean(
          rawName &&
          rawName !== phone &&
          rawName !== cleanDigits &&
          rawName.replace(/\D/g, '') !== cleanDigits &&
          !rawName.startsWith('+52') &&
          !rawName.startsWith('+54')
        );

        const displayName = isRealName ? rawName : formatPhoneDisplay(phone);

        processedMap.set(phone, {
          id: phone,
          jid: `${cleanDigits}@s.whatsapp.net`,
          phone,
          name: displayName,
          displayName,
          contactName: displayName,
          isGroup: false,
          unreadCount: ec.unreadCount || 0,
          lastMessage: lastMsg || 'Sohbet',
          lastMessageTime: lastTime,
          avatar: displayName.charAt(0).toUpperCase(),
          contact: matchedContact || null,
          groups: matchedContact?.groups?.map((g: any) => g.group) || [],
        });
      }
    }

    // B. Merge local DB chats
    for (const dc of dbChats) {
      const rawTarget = (dc.phone || '').trim();
      if (!rawTarget || rawTarget.includes('@lid') || rawTarget.includes('@broadcast') || rawTarget.includes('@newsletter')) {
        continue;
      }

      const isGroup = rawTarget.includes('@g.us') || dc.isGroup;

      if (isGroup) {
        if (!processedMap.has(rawTarget)) {
          processedMap.set(rawTarget, {
            id: rawTarget,
            jid: rawTarget,
            phone: rawTarget,
            name: dc.contactName || 'WhatsApp Grubu',
            displayName: dc.contactName || 'WhatsApp Grubu',
            contactName: dc.contactName || 'WhatsApp Grubu',
            isGroup: true,
            unreadCount: dc.unreadCount || 0,
            lastMessage: dc.lastMessage || 'Grup Sohbeti',
            lastMessageTime: dc.lastMessageTime || new Date(0),
            avatar: '👥',
            contact: null,
            groups: [],
          });
        }
      } else {
        const cleanDigits = normalizePhone(rawTarget);
        if (!cleanDigits || cleanDigits.length < 10 || cleanDigits.startsWith('52') || cleanDigits.startsWith('54')) {
          continue;
        }

        const phone = `+${cleanDigits}`;
        const matchedContact = contactByPhone.get(cleanDigits) || contactByPhone.get(phone);

        if (!processedMap.has(phone)) {
          const rawName = (matchedContact?.name || dc.contactName || '').trim();
          const isRealName = Boolean(
            rawName &&
            rawName !== phone &&
            rawName !== cleanDigits &&
            rawName.replace(/\D/g, '') !== cleanDigits &&
            !rawName.startsWith('+52') &&
            !rawName.startsWith('+54')
          );
          const displayName = isRealName ? rawName : formatPhoneDisplay(phone);

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
            lastMessageTime: dc.lastMessageTime || new Date(0),
            avatar: displayName.charAt(0).toUpperCase(),
            contact: matchedContact || null,
            groups: matchedContact?.groups?.map((g: any) => g.group) || [],
          });
        } else {
          // If already in map, update timestamp if DB has a newer message
          const existing = processedMap.get(phone);
          if (dc.lastMessageTime && new Date(dc.lastMessageTime).getTime() > new Date(existing.lastMessageTime).getTime()) {
            existing.lastMessage = dc.lastMessage || existing.lastMessage;
            existing.lastMessageTime = dc.lastMessageTime;
          }
        }
      }
    }

    // C. Add all remaining contacts from Contact table
    for (const c of contacts) {
      const cleanDigits = normalizePhone(c.phone);
      if (!cleanDigits || cleanDigits.length < 10 || cleanDigits.startsWith('52') || cleanDigits.startsWith('54')) {
        continue;
      }

      const phone = `+${cleanDigits}`;
      if (!processedMap.has(phone)) {
        const rawName = (c.name || '').trim();
        const isRealName = Boolean(
          rawName &&
          rawName !== phone &&
          rawName !== cleanDigits &&
          rawName.replace(/\D/g, '') !== cleanDigits &&
          !rawName.startsWith('+52') &&
          !rawName.startsWith('+54')
        );
        const displayName = isRealName ? rawName : formatPhoneDisplay(phone);

        processedMap.set(phone, {
          id: phone,
          jid: `${cleanDigits}@s.whatsapp.net`,
          phone,
          name: displayName,
          displayName,
          contactName: displayName,
          isGroup: false,
          unreadCount: 0,
          lastMessage: 'Sohbet başlat',
          lastMessageTime: new Date(0),
          avatar: displayName.charAt(0).toUpperCase(),
          contact: c,
          groups: c.groups?.map((g: any) => g.group) || [],
        });
      }
    }

    // Convert to array and sort strictly by lastMessageTime descending
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
