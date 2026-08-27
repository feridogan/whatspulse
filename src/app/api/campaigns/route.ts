import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { messageQueue } from '@/lib/queue';
import { replacePlaceholders, normalizePhone } from '@/lib/utils';

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        template: true,
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(campaigns);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      templateId,
      customContent,
      mediaUrl,
      mediaType,
      targetGroupIds,
      contactIds,
      minDelay = 8,
      maxDelay = 20,
      batchSize = 25,
      batchPause = 60,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Kampanya başlığı zorunludur.' }, { status: 400 });
    }

    let template: any = null;
    let baseContent = customContent || '';
    let finalMediaType = mediaType || 'text';
    let finalMediaUrl = mediaUrl || null;

    if (templateId) {
      template = await prisma.template.findUnique({
        where: { id: templateId },
      });
      if (template) {
        baseContent = template.content;
        finalMediaType = template.mediaType || 'text';
        finalMediaUrl = template.mediaUrl || null;
      }
    }

    if (!baseContent) {
      return NextResponse.json({ error: 'Mesaj içeriği veya şablon seçilmelidir.' }, { status: 400 });
    }

    // 1. Fetch Target Contacts
    let targetContacts: any[] = [];

    if (Array.isArray(targetGroupIds) && targetGroupIds.length > 0) {
      const groupContacts = await prisma.contact.findMany({
        where: {
          groups: {
            some: {
              groupId: { in: targetGroupIds },
            },
          },
          isBlacklisted: false,
        },
      });
      targetContacts = [...targetContacts, ...groupContacts];
    }

    if (Array.isArray(contactIds) && contactIds.length > 0) {
      const individualContacts = await prisma.contact.findMany({
        where: {
          id: { in: contactIds },
          isBlacklisted: false,
        },
      });
      targetContacts = [...targetContacts, ...individualContacts];
    }

    // Deduplicate by phone
    const uniqueMap = new Map<string, any>();
    for (const c of targetContacts) {
      const phone = normalizePhone(c.phone);
      if (phone && !uniqueMap.has(phone)) {
        uniqueMap.set(phone, c);
      }
    }
    const finalContacts = Array.from(uniqueMap.values());

    if (finalContacts.length === 0) {
      return NextResponse.json({ error: 'Kampanya için geçerli hedef kişi bulunamadı (Tüm kişiler kara listede veya grup boş).' }, { status: 400 });
    }

    // 2. Create Campaign Record
    const campaign = await prisma.campaign.create({
      data: {
        title: title.trim(),
        templateId: templateId || null,
        status: 'PROCESSING',
        totalCount: finalContacts.length,
        sentCount: 0,
        failedCount: 0,
        minDelay: Number(minDelay) || 8,
        maxDelay: Number(maxDelay) || 20,
        batchSize: Number(batchSize) || 25,
        batchPause: Number(batchPause) || 60,
        startedAt: new Date(),
      },
    });

    // 3. Create Messages and Push to BullMQ Queue
    let index = 0;
    for (const contact of finalContacts) {
      index++;
      const contactData = {
        name: contact.name,
        isim: contact.name,
        phone: contact.phone,
        telefon: contact.phone,
        email: contact.email || '',
        ...(contact.customFields && typeof contact.customFields === 'object' ? contact.customFields : {}),
      };

      const personalizedContent = replacePlaceholders(baseContent, contactData);

      const messageRecord = await prisma.message.create({
        data: {
          campaignId: campaign.id,
          contactId: contact.id,
          phone: contact.phone,
          content: personalizedContent,
          mediaUrl: finalMediaUrl,
          mediaType: finalMediaType,
          status: 'QUEUED',
        },
      });

      // Dispatch BullMQ Job
      await messageQueue.add(
        `campaign-${campaign.id}-msg-${messageRecord.id}`,
        {
          campaignId: campaign.id,
          messageId: messageRecord.id,
          phone: contact.phone,
          content: personalizedContent,
          mediaUrl: finalMediaUrl || undefined,
          mediaType: finalMediaType as any,
          contactId: contact.id,
          minDelay: campaign.minDelay,
          maxDelay: campaign.maxDelay,
          batchSize: campaign.batchSize,
          batchPause: campaign.batchPause,
          indexInCampaign: index,
        },
        {
          jobId: messageRecord.id,
        }
      );
    }

    return NextResponse.json({
      success: true,
      campaign,
      message: `Kampanya başlatıldı! ${finalContacts.length} mesaj kuyruğa eklendi.`,
    });
  } catch (error: any) {
    console.error('Campaign creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
