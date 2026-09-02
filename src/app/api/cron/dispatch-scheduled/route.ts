import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { getDeliverySettings, isDeliveryWindowOpen } from "@/lib/delivery-window";
import { messageQueue } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleDispatchScheduled(req);
}

export async function POST(req: NextRequest) {
  return handleDispatchScheduled(req);
}

async function handleDispatchScheduled(req: NextRequest) {
  try {
    await ensureDbSchemaSync();

    const now = new Date();

    // 1. Find all SCHEDULED campaigns whose scheduled time has arrived
    const dueCampaigns = await prisma.campaign.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: {
          lte: now,
        },
      },
      include: {
        messages: {
          where: {
            status: "QUEUED",
          },
        },
      },
    });

    if (dueCampaigns.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Zamanı gelmiş bekleyen zamanlanmış kampanya bulunamadı.",
        processed: 0,
      });
    }

    // 2. Check delivery window
    const settings = await getDeliverySettings();
    const windowCheck = isDeliveryWindowOpen(settings);

    const processedList: any[] = [];

    for (const campaign of dueCampaigns) {
      if (!windowCheck.isOpen) {
        // Outside delivery window -> PAUSED until morning window opens
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: "PAUSED" },
        });
        processedList.push({
          id: campaign.id,
          title: campaign.title,
          status: "PAUSED",
          reason: `Sessiz Saatler Koruması (${windowCheck.reason})`,
        });
        continue;
      }

      // Transition to PROCESSING
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          status: "PROCESSING",
          startedAt: new Date(),
        },
      });

      // Ensure BullMQ has jobs for all queued messages
      let index = 0;
      for (const msg of campaign.messages) {
        index++;
        try {
          await messageQueue.add(
            `campaign-${campaign.id}-msg-${msg.id}`,
            {
              campaignId: campaign.id,
              messageId: msg.id,
              phone: msg.phone,
              content: msg.content,
              mediaUrl: msg.mediaUrl || undefined,
              mediaType: msg.mediaType as any,
              contactId: msg.contactId || undefined,
              minDelay: campaign.minDelay,
              maxDelay: campaign.maxDelay,
              batchSize: campaign.batchSize,
              batchPause: campaign.batchPause,
              indexInCampaign: index,
            },
            {
              jobId: msg.id,
            }
          );
        } catch (e: any) {
          // Job already queued in BullMQ
        }
      }

      processedList.push({
        id: campaign.id,
        title: campaign.title,
        status: "PROCESSING",
        messagesQueued: campaign.messages.length,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${processedList.length} zamanlanmış kampanya kontrol edildi ve işlendi.`,
      processed: processedList.length,
      campaigns: processedList,
    });
  } catch (error: any) {
    console.error("[Cron Dispatch Scheduled Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
