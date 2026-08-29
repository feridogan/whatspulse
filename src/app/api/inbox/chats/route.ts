import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizePhone } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { contactName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { lastMessage: { contains: search, mode: 'insensitive' } },
      ];
    }

    const chats = await prisma.chat.findMany({
      where,
      orderBy: { lastMessageTime: 'desc' },
      take: 150,
    });

    // Build unique phone lookups to match Contact table
    const phoneCandidates = new Set<string>();
    chats.forEach((c) => {
      const digits = c.phone.replace(/^\++/, '').replace(/\D/g, '');
      if (digits) {
        phoneCandidates.add(`+${digits}`);
        phoneCandidates.add(digits);
        phoneCandidates.add(`++${digits}`);
      }
    });

    const contacts = await prisma.contact.findMany({
      where: {
        phone: { in: Array.from(phoneCandidates) },
      },
      include: {
        groups: {
          include: { group: true },
        },
      },
    });

    const contactMap = new Map<string, any>();
    contacts.forEach((c) => {
      const cleanDigits = c.phone.replace(/^\++/, '').replace(/\D/g, '');
      contactMap.set(`+${cleanDigits}`, c);
      contactMap.set(cleanDigits, c);
      contactMap.set(`++${cleanDigits}`, c);
    });

    const enrichedChats = chats.map((chat) => {
      const cleanDigits = chat.phone.replace(/^\++/, '').replace(/\D/g, '');
      const matched = contactMap.get(`+${cleanDigits}`) || contactMap.get(cleanDigits) || contactMap.get(`++${cleanDigits}`);
      
      const realName = matched?.name || chat.contactName;
      const isReal = realName && realName !== chat.phone && realName !== `+${cleanDigits}` && realName !== cleanDigits;
      const finalName = isReal ? realName : `+${cleanDigits}`;

      return {
        ...chat,
        phone: `+${cleanDigits}`,
        contactName: finalName,
        displayName: finalName,
        realContactName: isReal ? realName : null,
        contact: matched || null,
        groups: matched?.groups?.map((g: any) => g.group) || [],
      };
    });

    return NextResponse.json(enrichedChats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
