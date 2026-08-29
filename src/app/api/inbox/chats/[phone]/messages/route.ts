import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EvolutionService } from '@/lib/evolution';

export async function GET(req: NextRequest, { params }: { params: { phone: string } }) {
  try {
    const rawPhone = decodeURIComponent(params.phone);
    const digits = rawPhone.replace(/^\++/, '').replace(/\D/g, '');
    const phone = `+${digits}`;

    // Find contact info if any
    const contact = await prisma.contact.findFirst({
      where: {
        OR: [
          { phone: `+${digits}` },
          { phone: digits },
          { phone: `++${digits}` },
        ],
      },
      include: {
        groups: { include: { group: true } },
      },
    });

    let chat = await prisma.chat.findFirst({
      where: {
        OR: [
          { phone: `+${digits}` },
          { phone: digits },
          { phone: `++${digits}` },
        ],
      },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 250,
        },
      },
    });

    if (!chat) {
      return NextResponse.json({
        chat: {
          phone,
          contactName: contact?.name || phone,
        },
        contact,
        messages: [],
      });
    }

    // Reset unread count when opened
    if (chat.unreadCount > 0) {
      await prisma.chat.update({
        where: { id: chat.id },
        data: { unreadCount: 0 },
      });
    }

    const realName = contact?.name || chat.contactName;
    const isReal = realName && realName !== phone && realName !== digits;

    return NextResponse.json({
      chat: {
        ...chat,
        phone,
        contactName: isReal ? realName : phone,
      },
      contact,
      messages: chat.messages,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { phone: string } }) {
  try {
    const rawPhone = decodeURIComponent(params.phone);
    const digits = rawPhone.replace(/^\++/, '').replace(/\D/g, '');
    const phone = `+${digits}`;
    const { content, mediaUrl, mediaType = 'text' } = await req.json();

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Mesaj içeriği veya medya zorunludur.' }, { status: 400 });
    }

    // Send via Evolution API
    let result: any;
    if (mediaUrl) {
      result = await EvolutionService.sendMessage(phone, content || '', mediaUrl, mediaType);
    } else {
      result = await EvolutionService.sendMessage(phone, content);
    }

    const evoMsgId = result?.key?.id || result?.messageId || null;

    // Find contact info if any
    const contact = await prisma.contact.findFirst({
      where: {
        OR: [
          { phone: `+${digits}` },
          { phone: digits },
          { phone: `++${digits}` },
        ],
      },
    });

    // Find or create chat
    let chat = await prisma.chat.findFirst({
      where: {
        OR: [
          { phone: `+${digits}` },
          { phone: digits },
          { phone: `++${digits}` },
        ],
      },
    });

    const contactName = contact?.name || `+${digits}`;

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          phone,
          contactName,
          lastMessage: content || '[Medya]',
          lastMessageTime: new Date(),
          unreadCount: 0,
        },
      });
    } else {
      await prisma.chat.update({
        where: { id: chat.id },
        data: {
          phone,
          contactName: contact?.name || chat.contactName,
          lastMessage: content || '[Medya]',
          lastMessageTime: new Date(),
        },
      });
    }

    const newMsg = await prisma.chatMessage.create({
      data: {
        chatId: chat.id,
        sender: 'OUTGOING',
        content: content || '',
        mediaUrl: mediaUrl || null,
        mediaType,
        status: 'SENT',
        evolutionMessageId: evoMsgId,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: newMsg,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
