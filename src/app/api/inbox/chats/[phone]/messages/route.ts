import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EvolutionService } from '@/lib/evolution';
import { normalizePhone } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: { phone: string } }) {
  try {
    const rawPhone = decodeURIComponent(params.phone);
    const phone = normalizePhone(rawPhone) || rawPhone;

    const chat = await prisma.chat.findUnique({
      where: { phone },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 150,
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ chat: null, messages: [] });
    }

    // Reset unread count when opened
    if (chat.unreadCount > 0) {
      await prisma.chat.update({
        where: { id: chat.id },
        data: { unreadCount: 0 },
      });
    }

    // Find contact info if any
    const contact = await prisma.contact.findUnique({
      where: { phone },
      include: {
        groups: { include: { group: true } },
      },
    });

    return NextResponse.json({
      chat,
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
    const phone = normalizePhone(rawPhone) || rawPhone;
    const { content, mediaUrl, mediaType = 'text' } = await req.json();

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Mesaj içeriği veya medya zorunludur.' }, { status: 400 });
    }

    // Send via Evolution API
    let result: any;
    if (mediaUrl) {
      result = await EvolutionService.sendMedia(phone, mediaUrl, mediaType, content || '');
    } else {
      result = await EvolutionService.sendText(phone, content);
    }

    const evoMsgId = result?.key?.id || result?.messageId || null;

    // Find or create chat
    let chat = await prisma.chat.findUnique({
      where: { phone },
    });

    if (!chat) {
      const contact = await prisma.contact.findUnique({ where: { phone } });
      chat = await prisma.chat.create({
        data: {
          phone,
          contactName: contact?.name || `+${phone}`,
          lastMessage: content || '[Medya]',
          lastMessageTime: new Date(),
          unreadCount: 0,
        },
      });
    } else {
      await prisma.chat.update({
        where: { id: chat.id },
        data: {
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
