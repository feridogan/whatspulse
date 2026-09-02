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

    if (!title || !title.trim()) {
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

    // 1. Fetch Target Contacts & Group Members strictly
    let targetContacts: any[] = [];

    if (Array.isArray(body.recipients) && body.recipients.length > 0) {
      // 1a. Direct confirmed recipient list from Pre-Dispatch Confirmation Modal
      targetContacts = body.recipients.map((r: any) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        customFields: r.customFields,
      }));
    } else {
      const resolvedGroupIds = (Array.isArray(targetGroupIds) && targetGroupIds.length > 0)
        ? targetGroupIds
        : (Array.isArray(body.groupIds) && body.groupIds.length > 0)
          ? body.groupIds
          : (body.groupId ? [body.groupId] : []);

      const resolvedContactIds = (Array.isArray(contactIds) && contactIds.length > 0)
        ? contactIds
        : (Array.isArray(body.targetContactIds) && body.targetContactIds.length > 0)
          ? body.targetContactIds
          : [];

      if (resolvedGroupIds.length > 0) {
        // 1b. Fetch from Contact table matching selected groups
        const groupContacts = await prisma.contact.findMany({
          where: {
            groups: {
              some: {
                groupId: { in: resolvedGroupIds },
              },
            },
            isBlacklisted: false,
          },
        });

        // 1c. Fetch from Subscriber table matching selected groups
        const groupSubscribers = await prisma.subscriber.findMany({
          where: {
            groups: {
              some: {
                groupId: { in: resolvedGroupIds },
              },
            },
            isBlacklisted: false,
            isActive: true,
          },
        });

        const subscriberAsContacts = groupSubscribers.map((s) => ({
          id: s.id,
          name: s.name,
          phone: s.phone,
          email: s.email,
          customFields: s.customFields,
        }));

        targetContacts = [...groupContacts, ...subscriberAsContacts];
      } else if (resolvedContactIds.length > 0) {
        const individualContacts = await prisma.contact.findMany({
          where: {
            id: { in: resolvedContactIds },
            isBlacklisted: false,
          },
        });
        const individualSubscribers = await prisma.subscriber.findMany({
          where: {
            id: { in: resolvedContactIds },
            isBlacklisted: false,
            isActive: true,
          },
        });
        const subAsContacts = individualSubscribers.map((s) => ({
          id: s.id,
          name: s.name,
          phone: s.phone,
          email: s.email,
          customFields: s.customFields,
        }));
        targetContacts = [...individualContacts, ...subAsContacts];
      } else if (body.sendToAll === true) {
        // Explicitly requested send to all active contacts
        const allContacts = await prisma.contact.findMany({
          where: { isBlacklisted: false },
        });
        const allSubscribers = await prisma.subscriber.findMany({
          where: { isBlacklisted: false, isActive: true },
        });
        const subAsContacts = allSubscribers.map((s) => ({
          id: s.id,
          name: s.name,
          phone: s.phone,
          email: s.email,
          customFields: s.customFields,
        }));
        targetContacts = [...allContacts, ...subAsContacts];
      } else {
        return NextResponse.json({
          error: 'Hedef grup seçilmedi. Lütfen mesaj göndermek istediğiniz grubu seçiniz.',
        }, { status: 400 });
      }
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
      return NextResponse.json({
        error: 'Seçilen grupta aktif abone bulunamadı veya tüm üyeler kara listede.',
      }, { status: 400 });
    }

    const scheduledDate = body.scheduledAt ? new Date(body.scheduledAt) : null;
    const isFutureScheduled = Boolean(scheduledDate && scheduledDate.getTime() > Date.now());
    const initialDelayMs = isFutureScheduled && scheduledDate ? Math.max(0, scheduledDate.getTime() - Date.now()) : 0;

    // 2. Create Campaign Record
    const campaign = await prisma.campaign.create({
      data: {
        title: title.trim(),
        templateId: templateId || null,
        status: isFutureScheduled ? 'SCHEDULED' : 'PROCESSING',
        totalCount: finalContacts.length,
        sentCount: 0,
        failedCount: 0,
        minDelay: Number(minDelay) || 8,
        maxDelay: Number(maxDelay) || 20,
        batchSize: Number(batchSize) || 25,
        batchPause: Number(batchPause) || 60,
        scheduledAt: scheduledDate,
        startedAt: isFutureScheduled ? null : new Date(),
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

      // Verify contactId existence in Contact table to prevent foreign key error
      let validContactId: string | null = null;
      if (contact.id) {
        const contactExists = await prisma.contact.findUnique({
          where: { id: contact.id },
          select: { id: true },
        });
        if (contactExists) {
          validContactId = contactExists.id;
        }
      }
      if (!validContactId && contact.phone) {
        const contactByPhone = await prisma.contact.findUnique({
          where: { phone: contact.phone },
          select: { id: true },
        });
        if (contactByPhone) {
          validContactId = contactByPhone.id;
        }
      }

      const messageRecord = await prisma.message.create({
        data: {
          campaignId: campaign.id,
          contactId: validContactId,
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
          contactId: validContactId || undefined,
          minDelay: campaign.minDelay,
          maxDelay: campaign.maxDelay,
          batchSize: campaign.batchSize,
          batchPause: campaign.batchPause,
          indexInCampaign: index,
        },
        {
          jobId: messageRecord.id,
          delay: initialDelayMs,
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
