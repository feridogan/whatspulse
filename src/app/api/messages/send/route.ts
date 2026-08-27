import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EvolutionService } from '@/lib/evolution';
import { normalizePhone } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { phone: rawPhone, content, mediaUrl, mediaType = 'text', templateId } = await req.json();

    if (!rawPhone || (!content && !mediaUrl)) {
      return NextResponse.json({ error: 'Telefon numarası ve mesaj içeriği zorunludur.' }, { status: 400 });
    }

    const phone = normalizePhone(rawPhone);

    // Check Blacklist
    const blacklisted = await prisma.blacklist.findUnique({
      where: { phone },
    });

    if (blacklisted) {
      return NextResponse.json({
        error: 'Bu numara kara listede (Opt-Out) olduğu için mesaj gönderilemez.',
      }, { status: 403 });
    }

    // Find or create Contact
    let contact = await prisma.contact.findUnique({
      where: { phone },
    });

    // Send via Evolution API
    let result: any;
    if (mediaUrl) {
      result = await EvolutionService.sendMedia(
        phone,
        mediaUrl,
        mediaType as any,
        content || ''
      );
    } else {
      result = await EvolutionService.sendText(phone, content);
    }

    const evoMsgId = result?.key?.id || result?.messageId || result?.id || null;

    // Save to Message table
    const message = await prisma.message.create({
      data: {
        phone,
        contactId: contact?.id || null,
        content: content || (mediaUrl ? `[Medya Gönderildi]` : ''),
        mediaUrl: mediaUrl || null,
        mediaType,
        status: 'SENT',
        evolutionMessageId: evoMsgId,
        sentAt: new Date(),
      },
    });

    // Save/Update in Chat & ChatMessage table for Team Inbox
    let chat = await prisma.chat.findUnique({
      where: { phone },
    });

    if (!chat) {
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

    await prisma.chatMessage.create({
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
      message,
      evolutionResult: result,
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: error.message || 'Mesaj gönderilemedi' }, { status: 500 });
  }
}
