import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EvolutionService } from '@/lib/evolution';

export async function GET(req: NextRequest, { params }: { params: { phone: string } }) {
  try {
    const rawTarget = decodeURIComponent(params.phone).trim();
    const isGroup = rawTarget.includes('@g.us');

    let digits = '';
    let phone = rawTarget;
    let remoteJid = rawTarget;

    if (isGroup) {
      remoteJid = rawTarget;
      phone = rawTarget;
    } else {
      digits = rawTarget.split('@')[0].replace(/:.*$/, '').replace(/\D/g, '');
      phone = `+${digits}`;
      remoteJid = `${digits}@s.whatsapp.net`;
    }

    // 1. Find contact info from database (by phone or name)
    const contact = isGroup
      ? null
      : await prisma.contact.findFirst({
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
          { phone: isGroup ? rawTarget : phone },
          { phone: isGroup ? rawTarget : digits },
          { phone: isGroup ? rawTarget : `++${digits}` },
        ],
      },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 250,
        },
      },
    });

    const groupFallbackName = isGroup ? 'WhatsApp Grubu' : phone;
    const realName = isGroup ? (chat?.contactName || groupFallbackName) : (contact?.name || chat?.contactName || phone);
    const hasRealName = !isGroup && Boolean(
      realName &&
      realName !== phone &&
      realName !== digits &&
      realName.replace(/\D/g, '') !== digits
    );
    const finalName = hasRealName ? realName : isGroup ? realName : phone;

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          phone: isGroup ? rawTarget : phone,
          contactName: finalName,
          lastMessage: isGroup ? 'Grup Sohbeti' : '',
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

    // 3. Fetch recent messages directly from Evolution API v2 (POST /chat/findMessages/ff)
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
            const tsRaw = item.messageTimestamp;
            const ts = tsRaw ? new Date(Number(tsRaw) * (String(tsRaw).length <= 10 ? 1000 : 1)) : new Date();

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
      console.warn('[Messages API] Evolution findMessages error (fallback to local):', evoErr);
    }

    // Sort all messages ascending
    const sortedMessages = chat.messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return NextResponse.json({
      chat: {
        ...chat,
        phone: isGroup ? rawTarget : phone,
        jid: remoteJid,
        isGroup,
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
    const rawTarget = decodeURIComponent(params.phone).trim();
    const isGroup = rawTarget.includes('@g.us');
    const { content, mediaUrl, mediaType = 'text' } = await req.json();

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Mesaj içeriği veya medya zorunludur.' }, { status: 400 });
    }

    let digits = '';
    let phone = rawTarget;
    let targetNumber = rawTarget;

    if (isGroup) {
      targetNumber = rawTarget;
      phone = rawTarget;
    } else {
      digits = rawTarget.split('@')[0].replace(/:.*$/, '').replace(/\D/g, '');
      phone = `+${digits}`;
      targetNumber = digits; // Pure digits without + for Evolution API
    }

    // Send via Evolution API v2
    let result: any;
    if (mediaUrl) {
      result = await EvolutionService.sendMessage(targetNumber, content || '', mediaUrl, mediaType);
    } else {
      result = await EvolutionService.sendMessage(targetNumber, content);
    }

    const evoMsgId = result?.key?.id || result?.messageId || null;

    // Find contact info if any
    const contact = isGroup
      ? null
      : await prisma.contact.findFirst({
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
          { phone: isGroup ? rawTarget : phone },
          { phone: isGroup ? rawTarget : digits },
          { phone: isGroup ? rawTarget : `++${digits}` },
        ],
      },
    });

    const contactName = isGroup ? (chat?.contactName || 'WhatsApp Grubu') : (contact?.name || `+${digits}`);

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          phone: isGroup ? rawTarget : phone,
          contactName,
          lastMessage: content || '[Medya]',
          lastMessageTime: new Date(),
          unreadCount: 0,
          isGroup,
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
