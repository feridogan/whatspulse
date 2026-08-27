import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizePhone } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const event = payload.event || payload.type || '';
    const data = payload.data || payload;

    console.log(`[Webhook] 🔔 Received Evolution event: ${event}`);

    // 1. Handle Incoming Messages (MESSAGES_UPSERT)
    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      const messageData = data.message || data;
      const key = data.key || messageData.key || {};
      const fromMe = key.fromMe === true;

      // Ignore our own outgoing messages in upsert if already saved
      const remoteJid = key.remoteJid || '';
      const isGroup = remoteJid.includes('@g.us');
      const phone = normalizePhone(remoteJid.replace(/@s\.whatsapp\.net|@g\.us/g, ''));

      if (!phone) {
        return NextResponse.json({ success: true, ignored: 'no-phone' });
      }

      // Extract text content
      let text =
        messageData.conversation ||
        messageData.extendedTextMessage?.text ||
        messageData.imageMessage?.caption ||
        messageData.videoMessage?.caption ||
        messageData.documentMessage?.caption ||
        (messageData.imageMessage ? '[Görsel]' : '') ||
        (messageData.documentMessage ? '[Belge]' : '') ||
        (messageData.audioMessage ? '[Ses Kaydı]' : '') ||
        '';

      const pushName = data.pushName || null;

      // Anti-Ban & Compliance: Check for Opt-Out / Blacklist keywords
      const upperText = text.trim().toUpperCase();
      const optOutKeywords = ['IPTAL', 'STOP', 'CIK', 'RED', 'UNSUBSCRIBE', 'İPTAL', 'ÇIK'];
      const isOptOut = optOutKeywords.some((k) => upperText === k || upperText.startsWith(k + ' '));

      if (isOptOut && !fromMe) {
        console.log(`[Webhook] 🛑 Opt-out keyword detected from ${phone}: "${text}". Adding to Blacklist.`);
        await prisma.blacklist.upsert({
          where: { phone },
          update: {
            reason: `Gelen mesaj ile iptal talebi: "${text}"`,
            addedBy: 'Auto-Keyword-Webhook',
          },
          create: {
            phone,
            reason: `Gelen mesaj ile iptal talebi: "${text}"`,
            addedBy: 'Auto-Keyword-Webhook',
          },
        });

        await prisma.contact.updateMany({
          where: { phone },
          data: { isBlacklisted: true },
        });
      }

      // Save/Update in Chat
      let chat = await prisma.chat.findUnique({
        where: { phone },
      });

      if (!chat) {
        chat = await prisma.chat.create({
          data: {
            phone,
            contactName: pushName || `+${phone}`,
            lastMessage: text || (fromMe ? 'Giden Mesaj' : 'Gelen Mesaj'),
            lastMessageTime: new Date(),
            unreadCount: fromMe ? 0 : 1,
            isGroup,
          },
        });
      } else {
        await prisma.chat.update({
          where: { id: chat.id },
          data: {
            contactName: pushName || chat.contactName,
            lastMessage: text || chat.lastMessage,
            lastMessageTime: new Date(),
            unreadCount: fromMe ? chat.unreadCount : { increment: 1 },
          },
        });
      }

      // Record in ChatMessage
      await prisma.chatMessage.create({
        data: {
          chatId: chat.id,
          sender: fromMe ? 'OUTGOING' : 'INCOMING',
          content: text,
          evolutionMessageId: key.id || null,
          status: 'DELIVERED',
          timestamp: new Date(),
        },
      });

      // Update Contact name if available and new
      if (pushName) {
        await prisma.contact.upsert({
          where: { phone },
          update: { name: pushName },
          create: {
            phone,
            name: pushName,
            notes: 'Gelen WhatsApp mesajından otomatik oluşturuldu',
          },
        });
      }
    }

    // 2. Handle Message Status Updates (MESSAGES_UPDATE - Delivery / Read Receipts)
    if (event === 'messages.update' || event === 'MESSAGES_UPDATE') {
      const updates = Array.isArray(data) ? data : [data];

      for (const item of updates) {
        const key = item.key || {};
        const evolutionId = key.id;
        const status = item.update?.status || item.status;

        if (!evolutionId) continue;

        let mappedStatus: 'SENT' | 'DELIVERED' | 'READ' | null = null;
        let updateData: any = {};

        // Evolution/Baileys status mapping: 2 = SERVER_ACK (SENT), 3 = DELIVERY_ACK (DELIVERED), 4 = READ, 5 = PLAYED
        if (status === 3 || status === 'DELIVERY_ACK' || status === 'DELIVERED') {
          mappedStatus = 'DELIVERED';
          updateData.status = 'DELIVERED';
          updateData.deliveredAt = new Date();
        } else if (status === 4 || status === 5 || status === 'READ' || status === 'PLAYED') {
          mappedStatus = 'READ';
          updateData.status = 'READ';
          updateData.readAt = new Date();
        }

        if (mappedStatus) {
          await prisma.message.updateMany({
            where: { evolutionMessageId: evolutionId },
            data: updateData,
          });

          await prisma.chatMessage.updateMany({
            where: { evolutionMessageId: evolutionId },
            data: { status: mappedStatus },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
