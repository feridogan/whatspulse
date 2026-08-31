import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EvolutionService } from '@/lib/evolution';
import { normalizePhone, formatPhoneNumber } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { phone: rawPhone, content, mediaUrl, mediaType = 'text', templateId } = await req.json();

    if (!rawPhone || (!content && !mediaUrl)) {
      return NextResponse.json({ error: 'Telefon numarası ve mesaj içeriği zorunludur.' }, { status: 400 });
    }

    const cleanDigits = normalizePhone(rawPhone);
    const phone = formatPhoneNumber(rawPhone);

    // Check Blacklist
    const blacklisted = await prisma.blacklist.findFirst({
      where: {
        OR: [{ phone }, { phone: cleanDigits }],
      },
    });

    if (blacklisted) {
      return NextResponse.json({
        error: 'Bu numara kara listede (Opt-Out) olduğu için mesaj gönderilemez.',
      }, { status: 403 });
    }

    // Find contact
    const contact = await prisma.contact.findFirst({
      where: {
        OR: [{ phone }, { phone: cleanDigits }],
      },
    });

    // Send via Evolution API
    let result: any;
    if (mediaUrl) {
      result = await EvolutionService.sendMedia(
        cleanDigits,
        mediaUrl,
        mediaType as any,
        content || ''
      );
    } else {
      result = await EvolutionService.sendText(cleanDigits, content);
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
