import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizePhone, formatPhoneNumber, formatPhoneDisplay } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const event = (payload.event || payload.type || '').toUpperCase();
    const data = payload.data || payload;

    console.log(`[Webhook] 🔔 Received Evolution event: ${event}`);

    // 1. Handle Incoming Messages (MESSAGES_UPSERT)
    if (event === 'MESSAGES_UPSERT' || event === 'MESSAGES.UPSERT' || event === 'MESSAGE_UPSERT') {
      const messageData = data.message || data;
      const key = data.key || messageData.key || {};
      const fromMe = key.fromMe === true;

      const remoteJid = String(key.remoteJid || messageData.remoteJid || '').trim();
      if (!remoteJid || remoteJid.includes('@broadcast') || remoteJid.includes('@newsletter') || remoteJid.startsWith('status@')) {
        return NextResponse.json({ success: true, ignored: 'broadcast/status' });
      }

      const isGroup = remoteJid.includes('@g.us');
      let phone = '';
      let cleanDigits = '';

      if (isGroup) {
        phone = remoteJid;
      } else {
        cleanDigits = normalizePhone(remoteJid);
        if (!cleanDigits || cleanDigits.length < 10) {
          return NextResponse.json({ success: true, ignored: 'invalid-phone' });
        }
        phone = `+${cleanDigits}`;
      }

      // Extract text content
      const msgObj = messageData.message || messageData;
      let text =
        msgObj.conversation ||
        msgObj.extendedTextMessage?.text ||
        msgObj.imageMessage?.caption ||
        msgObj.videoMessage?.caption ||
        msgObj.documentMessage?.caption ||
        (msgObj.imageMessage ? '[Görsel]' : '') ||
        (msgObj.documentMessage ? '[Belge]' : '') ||
        (msgObj.audioMessage ? '[Ses Kaydı]' : '') ||
        '';

      const pushName = (data.pushName || payload.pushName || '').trim();

      // Anti-Ban & Compliance: Check for Opt-Out / Blacklist keywords
      const upperText = text.trim().toUpperCase();
      const optOutKeywords = ['IPTAL', 'STOP', 'CIK', 'RED', 'UNSUBSCRIBE', 'İPTAL', 'ÇIK'];
      const isOptOut = optOutKeywords.some((k) => upperText === k || upperText.startsWith(k + ' '));

      if (isOptOut && !fromMe && !isGroup) {
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
        }).catch(() => {});

        await prisma.contact.updateMany({
          where: { phone },
          data: { isBlacklisted: true },
        }).catch(() => {});
      }

      // Find contact if individual
      const contact = isGroup
        ? null
        : await prisma.contact.findFirst({
            where: {
              OR: [
                { phone },
                { phone: cleanDigits },
                { phone: `0${cleanDigits.slice(2)}` },
                { phone: cleanDigits.slice(2) },
              ],
            },
          });

      const contactName = isGroup ? 'WhatsApp Grubu' : (contact?.name || pushName || formatPhoneDisplay(phone));

      // Save/Update in Chat table
      let chat = await prisma.chat.findFirst({
        where: {
          OR: [
            { phone },
            { phone: cleanDigits },
          ],
        },
      });

      if (!chat) {
        chat = await prisma.chat.create({
          data: {
            phone,
            contactName,
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
            contactName: contact?.name || pushName || chat.contactName,
            lastMessage: text || chat.lastMessage,
            lastMessageTime: new Date(),
            unreadCount: fromMe ? chat.unreadCount : { increment: 1 },
          },
        });
      }

      // Record in ChatMessage table
      const evoMsgId = key.id || null;
      if (evoMsgId) {
        const existingMsg = await prisma.chatMessage.findFirst({
          where: { evolutionMessageId: evoMsgId },
        });

        if (!existingMsg) {
          await prisma.chatMessage.create({
            data: {
              chatId: chat.id,
              sender: fromMe ? 'OUTGOING' : 'INCOMING',
              content: text || '',
              evolutionMessageId: evoMsgId,
              status: fromMe ? 'SENT' : 'DELIVERED',
              timestamp: new Date(),
            },
          });
        }
      }

      // Also record in Message table
      if (!isGroup) {
        await prisma.message.create({
          data: {
            phone,
            contactId: contact?.id || null,
            content: text || '',
            status: fromMe ? 'SENT' : 'DELIVERED',
            evolutionMessageId: evoMsgId,
            sentAt: new Date(),
          },
        }).catch(() => {});
      }
    }

    // 2. Handle Message Status Updates (MESSAGES_UPDATE - Delivery / Read Receipts)
    if (event === 'MESSAGES_UPDATE' || event === 'MESSAGES.UPDATE') {
      const updates = Array.isArray(data) ? data : [data];

      for (const item of updates) {
        const key = item.key || {};
        const evolutionId = key.id;
        const status = item.update?.status || item.status;

        if (!evolutionId) continue;

        let mappedStatus: 'SENT' | 'DELIVERED' | 'READ' | null = null;
        let updateData: any = {};

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
          }).catch(() => {});

          await prisma.chatMessage.updateMany({
            where: { evolutionMessageId: evolutionId },
            data: { status: mappedStatus },
          }).catch(() => {});
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
