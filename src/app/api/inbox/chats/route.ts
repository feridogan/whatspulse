import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizePhone, formatPhoneNumber, formatPhoneDisplay } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').toLowerCase().trim();

    // 1. Fetch contacts from local WhatsPulse database
    const contacts = await prisma.contact.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 300,
      include: {
        groups: {
          include: { group: true },
        },
      },
    });

    const contactByPhone = new Map<string, any>();
    contacts.forEach((c) => {
      const cleanDigits = normalizePhone(c.phone);
      if (cleanDigits && cleanDigits.length >= 10 && !cleanDigits.startsWith('52') && !cleanDigits.startsWith('54')) {
        contactByPhone.set(cleanDigits, c);
        contactByPhone.set(`+${cleanDigits}`, c);
      }
    });

    // 2. Fetch existing chats with recent activity
    const dbChats = await prisma.chat.findMany({
      orderBy: { lastMessageTime: 'desc' },
      take: 200,
    });

    const processedMap = new Map<string, any>();

    // Process local active chats first
    for (const dc of dbChats) {
      const rawTarget = (dc.phone || '').trim();
      if (!rawTarget || rawTarget.includes('@lid') || rawTarget.includes('@broadcast') || rawTarget.includes('@newsletter')) {
        continue;
      }

      const isGroup = rawTarget.includes('@g.us') || dc.isGroup;

      if (isGroup) {
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
          lastMessageTime: dc.lastMessageTime || new Date(),
          avatar: '👥',
          contact: null,
          groups: [],
        });
      } else {
        const cleanDigits = normalizePhone(rawTarget);
        // Exclude fake LID numbers (+52..., +54...)
        if (!cleanDigits || cleanDigits.length < 10 || cleanDigits.startsWith('52') || cleanDigits.startsWith('54')) {
          continue;
        }

        const phone = `+${cleanDigits}`;
        const matchedContact = contactByPhone.get(cleanDigits) || contactByPhone.get(phone);

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
          lastMessageTime: dc.lastMessageTime || new Date(),
          avatar: displayName.charAt(0).toUpperCase(),
          contact: matchedContact || null,
          groups: matchedContact?.groups?.map((g: any) => g.group) || [],
        });
      }
    }

    // Add remaining contacts from Contact table so all saved contacts are available to start a conversation
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
          lastMessageTime: c.updatedAt || c.createdAt || new Date(),
          avatar: displayName.charAt(0).toUpperCase(),
          contact: c,
          groups: c.groups?.map((g: any) => g.group) || [],
        });
      }
    }

    // Convert to sorted array
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
