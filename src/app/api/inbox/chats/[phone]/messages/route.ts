import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EvolutionService } from '@/lib/evolution';

export async function GET(req: NextRequest, { params }: { params: { phone: string } }) {
  try {
    const rawPhone = decodeURIComponent(params.phone);
    const digits = rawPhone.replace(/^\++/, '').replace(/\D/g, '');
    const phone = `+${digits}`;
    const isGroup = rawPhone.includes('@g.us');
    const remoteJid = isGroup ? rawPhone : `${digits}@s.whatsapp.net`;

    // 1. Find contact info from database
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

    // 2. Find or create local Chat record
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

    const realName = contact?.name || chat?.contactName || phone;
    const isReal = realName && realName !== phone && realName !== digits && realName.replace(/\D/g, '') !== digits;
    const finalName = isReal ? realName : phone;

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          phone,
          contactName: finalName,
          lastMessage: '',
          lastMessageTime: new Date(),
          unreadCount: 0,
          isGroup,
        },
        include: {
          messages: true,
        },
      });
    } else if (chat.unreadCount > 0) {
      await prisma.chat.update({
        where: { id: chat.id },
        data: { unreadCount: 0 },
      });
    }

    // 3. Fetch recent messages from Evolution API v2 to ensure message history is 100% complete
    try {
      const evoMessages = await EvolutionService.findMessages(remoteJid, 50);
      if (Array.isArray(evoMessages) && evoMessages.length > 0) {
        for (const item of evoMessages) {
          const key = item.key || {};
          const evoId = key.id;
          if (!evoId) continue;

          // Check if already in local DB
          const exists = chat.messages.some((m) => m.evolutionMessageId === evoId);
          if (!exists) {
            const msgObj = item.message || {};
            const text =
              msgObj.conversation ||
              msgObj.extendedTextMessage?.text ||
              msgObj.imageMessage?.caption ||
              msgObj.videoMessage?.caption ||
              msgObj.documentMessage?.caption ||
              (msgObj.imageMessage ? '[Görsel]' : '') ||
              (msgObj.audioMessage ? '[Ses Kaydı]' : '') ||
              (msgObj.documentMessage ? '[Belge]' : '') ||
              '';

            const fromMe = key.fromMe === true;
            const ts = item.messageTimestamp ? new Date(Number(item.messageTimestamp) * 1000) : new Date();

            const savedMsg = await prisma.chatMessage.create({
              data: {
                chatId: chat.id,
                sender: fromMe ? 'OUTGOING' : 'INCOMING',
                content: text || '',
                status: fromMe ? 'SENT' : 'DELIVERED',
                evolutionMessageId: evoId,
                timestamp: isNaN(ts.getTime()) ? new Date() : ts,
              },
            });
            chat.messages.push(savedMsg);
          }
        }
      }
    } catch (evoErr) {
      // Non-blocking fallback to local messages
    }

    // Sort all messages ascending
    const sortedMessages = chat.messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return NextResponse.json({
      chat: {
        ...chat,
        phone,
        contactName: finalName,
        displayName: finalName,
      },
      contact: contact || null,
      messages: sortedMessages,
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
