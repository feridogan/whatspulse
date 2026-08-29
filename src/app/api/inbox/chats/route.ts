import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EvolutionService } from '@/lib/evolution';
import { normalizePhone, formatPhoneNumber, formatPhoneDisplay } from '@/lib/utils';

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
      const cleanDigits = normalizePhone(c.phone);
      if (cleanDigits) {
        contactByPhone.set(cleanDigits, c);
        contactByPhone.set(`+${cleanDigits}`, c);
        contactByPhone.set(`0${cleanDigits.slice(2)}`, c);
        contactByPhone.set(cleanDigits.slice(2), c);
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
        const rawDigits = jid.split('@')[0].replace(/:.*$/, '').replace(/\D/g, '');
        const isLid = jid.includes('@lid') || (rawDigits.startsWith('52') && rawDigits.length >= 13);

        // Try to match contact by phone first
        let matchedContact = null;
        if (!isLid && rawDigits.length >= 10 && rawDigits.length <= 13) {
          const normDigits = normalizePhone(rawDigits);
          matchedContact =
            contactByPhone.get(normDigits) ||
            contactByPhone.get(`+${normDigits}`) ||
            contactByPhone.get(rawDigits);
        }

        // Try to match contact by name (for LID or unnamed sessions)
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

        // If it is an internal LID without any matched contact in DB, SKIP IT to prevent fake +52... numbers
        if (isLid && !matchedContact) {
          continue;
        }

        // If raw digits is too long or fake without contact match, skip it
        if (!matchedContact && (rawDigits.length > 13 || (rawDigits.startsWith('52') && rawDigits.length >= 13))) {
          continue;
        }

        let phone = '';
        if (matchedContact) {
          phone = formatPhoneNumber(matchedContact.phone);
        } else {
          phone = formatPhoneNumber(rawDigits);
        }

        const cleanDigits = normalizePhone(phone);
        const candidateName = matchedContact?.name || ec.pushName || ec.name || ec.verifiedName || phone;
        const hasRealName = Boolean(
          candidateName &&
          candidateName !== phone &&
          candidateName !== `+${cleanDigits}` &&
          candidateName !== cleanDigits &&
          candidateName.replace(/\D/g, '') !== cleanDigits
        );

        const displayName = hasRealName ? candidateName : formatPhoneDisplay(phone);
        const lastMsg = typeof ec.lastMessage === 'string' ? ec.lastMessage : ec.lastMessage?.conversation || ec.lastMessage?.extendedTextMessage?.text || '';
        const ts = ec.conversationTimestamp || ec.lastMsgTimestamp || ec.updatedAt;
        const lastTime = ts ? new Date(Number(ts) * (String(ts).length <= 10 ? 1000 : 1)) : new Date();

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

      if (isGroup) {
        if (!processedMap.has(jid)) {
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
        }
      } else {
        const rawDigits = jid.replace(/^\++/, '').replace(/\D/g, '');
        const isLid = jid.includes('@lid') || (rawDigits.startsWith('52') && rawDigits.length >= 13);

        let matchedContact = null;
        if (!isLid && rawDigits.length >= 10 && rawDigits.length <= 13) {
          const normDigits = normalizePhone(rawDigits);
          matchedContact = contactByPhone.get(normDigits) || contactByPhone.get(`+${normDigits}`) || contactByPhone.get(rawDigits);
        }

        if (!matchedContact && dc.contactName) {
          const searchName = dc.contactName.toLowerCase().trim();
          matchedContact = contactByName.get(searchName);
        }

        if (isLid && !matchedContact) {
          continue;
        }

        const phone = matchedContact ? formatPhoneNumber(matchedContact.phone) : formatPhoneNumber(rawDigits);
        if (!phone || phone.length < 10) continue;

        if (!processedMap.has(phone)) {
          const cleanDigits = normalizePhone(phone);
          const candidateName = matchedContact?.name || dc.contactName || phone;
          const hasRealName = Boolean(
            candidateName &&
            candidateName !== phone &&
            candidateName !== `+${cleanDigits}` &&
            candidateName !== cleanDigits &&
            candidateName.replace(/\D/g, '') !== cleanDigits
          );
          const displayName = hasRealName ? candidateName : formatPhoneDisplay(phone);

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
