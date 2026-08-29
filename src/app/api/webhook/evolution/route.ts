import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizePhone, formatPhoneNumber, formatPhoneDisplay } from '@/lib/utils';

function extractMessageItems(payload: any): any[] {
  if (!payload || typeof payload !== 'object') return [];

  const data = payload.data !== undefined ? payload.data : payload;

  if (Array.isArray(data)) {
    return data;
  }
  if (data && Array.isArray(data.messages)) {
    return data.messages;
  }
  if (data && Array.isArray(data.records)) {
    return data.records;
  }
  if (data && (data.key || data.message)) {
    return [data];
  }
  if (payload.key || payload.message) {
    return [payload];
  }

  return [];
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));
    const event = (payload.event || payload.type || '').toUpperCase();

    console.log(`[Webhook] 🔔 Received Evolution event: ${event}`);

    const messageItems = extractMessageItems(payload);

    // 1. Process Messages (Upsert / Incoming / Outgoing)
    for (const item of messageItems) {
      const key = item.key || {};
      const remoteJid = String(key.remoteJid || item.remoteJid || '').trim();
      if (!remoteJid || remoteJid.includes('@broadcast') || remoteJid.includes('@newsletter') || remoteJid.startsWith('status@')) {
        continue;
      }

      const fromMe = Boolean(key.fromMe ?? item.fromMe ?? false);
      const isGroup = remoteJid.includes('@g.us');
      let phone = '';
      let cleanDigits = '';

      if (isGroup) {
        phone = remoteJid;
      } else {
        cleanDigits = normalizePhone(remoteJid.split('@')[0].replace(/:.*$/, '').replace(/\D/g, ''));
        if (cleanDigits.startsWith('52') && cleanDigits.length >= 13) {
          // Skip raw internal LID without phone
          continue;
        }
        if (!cleanDigits || cleanDigits.length < 10) {
          continue;
        }
        phone = `+${cleanDigits}`;
      }

      // Extract message text
      const msgObj = item.message || item;
      const text =
        msgObj.conversation ||
        msgObj.extendedTextMessage?.text ||
        msgObj.imageMessage?.caption ||
        msgObj.videoMessage?.caption ||
        msgObj.documentMessage?.caption ||
        (msgObj.imageMessage ? '[Görsel]' : '') ||
        (msgObj.documentMessage ? '[Belge]' : '') ||
        (msgObj.audioMessage ? '[Ses Kaydı]' : '') ||
        '';

      const pushName = (item.pushName || payload.pushName || '').trim();

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
            { phone: `+${cleanDigits}` },
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
      } else {
        await prisma.chatMessage.create({
          data: {
            chatId: chat.id,
            sender: fromMe ? 'OUTGOING' : 'INCOMING',
            content: text || '',
            status: fromMe ? 'SENT' : 'DELIVERED',
            timestamp: new Date(),
          },
        });
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
    if (event.includes('UPDATE')) {
      const data = payload.data || payload;
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
