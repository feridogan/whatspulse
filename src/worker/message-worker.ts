import { Worker, Job } from 'bullmq';
import { redisConnection, MESSAGE_QUEUE_NAME, CampaignMessageJobData } from '../lib/queue';
import prisma from '../lib/prisma';
import { EvolutionService } from '../lib/evolution';
import { getDeliverySettings, isDeliveryWindowOpen } from '../lib/delivery-window';

console.log('🚀 Starting WhatsPulse Anti-Ban Message Worker...');

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomDelay(minSec: number, maxSec: number) {
  const min = Math.max(1, minSec);
  const max = Math.max(min, maxSec);
  const randomSeconds = Math.floor(Math.random() * (max - min + 1)) + min;
  return randomSeconds * 1000;
}

export const messageWorker = new Worker<CampaignMessageJobData>(
  MESSAGE_QUEUE_NAME,
  async (job: Job<CampaignMessageJobData>) => {
    const data = job.data;
    console.log(`[Worker] 📨 Processing message ${data.messageId} for ${data.phone} in campaign ${data.campaignId}`);

    // 1. Check campaign status & scheduled time
    if (data.campaignId) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: data.campaignId },
      });

      if (!campaign) {
        console.log(`[Worker] ⚠️ Campaign ${data.campaignId} not found, skipping.`);
        return { skipped: true, reason: 'Campaign not found' };
      }

      if (campaign.status === 'CANCELLED') {
        console.log(`[Worker] 🛑 Campaign ${data.campaignId} is cancelled.`);
        await prisma.message.update({
          where: { id: data.messageId },
          data: { status: 'FAILED', errorMessage: 'Kampanya iptal edildi' },
        });
        return { skipped: true, reason: 'Campaign cancelled' };
      }

      // Check Scheduled Time
      if (campaign.scheduledAt && new Date(campaign.scheduledAt).getTime() > Date.now()) {
        const msToWait = new Date(campaign.scheduledAt).getTime() - Date.now();
        console.log(`[Worker] ⏰ Campaign ${data.campaignId} is scheduled for ${campaign.scheduledAt}. Waiting ${(msToWait / 1000).toFixed(0)}s...`);
        while (new Date(campaign.scheduledAt).getTime() > Date.now()) {
          const waitChunk = Math.min(30000, new Date(campaign.scheduledAt).getTime() - Date.now());
          if (waitChunk <= 0) break;
          await sleep(waitChunk);
          const chk = await prisma.campaign.findUnique({ where: { id: data.campaignId } });
          if (chk?.status === 'CANCELLED') return { skipped: true, reason: 'Cancelled while waiting for schedule' };
        }

        if (campaign.status === 'SCHEDULED') {
          await prisma.campaign.update({
            where: { id: data.campaignId },
            data: { status: 'PROCESSING', startedAt: new Date() },
          });
        }
      }

      if (campaign.status === 'PAUSED') {
        console.log(`[Worker] ⏸️ Campaign ${data.campaignId} is paused. Re-queueing job.`);
        throw new Error('Campaign is paused');
      }
    }

    // 2. Delivery Window & Quiet Hours Guard
    let windowSettings = await getDeliverySettings();
    let windowCheck = isDeliveryWindowOpen(windowSettings);

    if (!windowCheck.isOpen) {
      console.log(`[Worker] 🌙 Quiet hours / delivery window closed: ${windowCheck.reason}`);
      if (data.campaignId) {
        await prisma.campaign.update({
          where: { id: data.campaignId },
          data: { status: 'PAUSED' },
        });
      }

      // Sleep loop until delivery window is open
      while (!windowCheck.isOpen) {
        console.log(`[Worker] ⏳ Waiting for delivery window (${windowCheck.start} - ${windowCheck.end}). Current time (TR): ${windowCheck.currentHourMinute}. Checking in 30s...`);
        await sleep(30000);

        if (data.campaignId) {
          const currentCamp = await prisma.campaign.findUnique({ where: { id: data.campaignId } });
          if (currentCamp?.status === 'CANCELLED') {
            return { skipped: true, reason: 'Campaign cancelled during quiet hours' };
          }
        }

        windowSettings = await getDeliverySettings();
        windowCheck = isDeliveryWindowOpen(windowSettings);
      }

      console.log(`[Worker] ☀️ Delivery window is now OPEN (${windowCheck.start} - ${windowCheck.end})! Resuming dispatch...`);
      if (data.campaignId) {
        await prisma.campaign.update({
          where: { id: data.campaignId },
          data: { status: 'PROCESSING' },
        });
      }
    }

    // 2. Check Blacklist (Opt-Out Protection)
    const isBlacklisted = await prisma.blacklist.findUnique({
      where: { phone: data.phone },
    });

    if (isBlacklisted) {
      console.log(`[Worker] 🛡️ Phone ${data.phone} is blacklisted (Opt-Out). Skipping to prevent ban.`);
      await prisma.message.update({
        where: { id: data.messageId },
        data: {
          status: 'FAILED',
          errorMessage: 'Kara Liste / İptal Talebi (Opt-Out Koruması)',
        },
      });

      if (data.campaignId) {
        await prisma.campaign.update({
          where: { id: data.campaignId },
          data: { failedCount: { increment: 1 } },
        });
      }
      return { skipped: true, reason: 'Blacklisted' };
    }

    // 3. Mark message as SENDING
    await prisma.message.update({
      where: { id: data.messageId },
      data: { status: 'SENDING' },
    });

    // 4. Send Message via Evolution API
    try {
      let result: any;
      if (data.mediaUrl) {
        result = await EvolutionService.sendMedia(
          data.phone,
          data.mediaUrl,
          data.mediaType || 'image',
          data.content
        );
      } else {
        result = await EvolutionService.sendText(data.phone, data.content);
      }

      const evolutionMsgId = result?.key?.id || result?.messageId || result?.id || null;

      // Update message as SENT
      await prisma.message.update({
        where: { id: data.messageId },
        data: {
          status: 'SENT',
          evolutionMessageId: evolutionMsgId,
          sentAt: new Date(),
          errorMessage: null,
        },
      });

      // Update Campaign progress
      if (data.campaignId) {
        const updatedCampaign = await prisma.campaign.update({
          where: { id: data.campaignId },
          data: { sentCount: { increment: 1 } },
          include: { messages: true },
        });

        // Check if finished
        if (updatedCampaign.sentCount + updatedCampaign.failedCount >= updatedCampaign.totalCount) {
          await prisma.campaign.update({
            where: { id: data.campaignId },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          });
          console.log(`[Worker] 🎉 Campaign ${data.campaignId} successfully completed!`);
        }
      }

      console.log(`[Worker] ✅ Message ${data.messageId} sent successfully to ${data.phone}`);

      // 5. Anti-Ban Humanized Delay
      const minDelay = data.minDelay || 8;
      const maxDelay = data.maxDelay || 20;
      const delayMs = getRandomDelay(minDelay, maxDelay);

      // Check batch pause
      const batchSize = data.batchSize || 25;
      const batchPause = (data.batchPause || 60) * 1000;
      const index = data.indexInCampaign || 0;

      if (batchSize > 0 && index > 0 && index % batchSize === 0) {
        console.log(`[Worker] ⏳ Batch limit reached (${batchSize} msgs). Pausing for ${data.batchPause || 60}s for Anti-Ban cool down...`);
        await sleep(batchPause);
      } else {
        console.log(`[Worker] ⏳ Anti-Ban humanized delay: waiting ${(delayMs / 1000).toFixed(1)}s before next message...`);
        await sleep(delayMs);
      }

      return { success: true, messageId: data.messageId, evolutionMsgId };
    } catch (error: any) {
      console.error(`[Worker] ❌ Failed to send message ${data.messageId} to ${data.phone}:`, error?.message);

      const errorMessage = error?.response?.data?.message || error?.message || 'Mesaj gönderilemedi';

      await prisma.message.update({
        where: { id: data.messageId },
        data: {
          status: 'FAILED',
          errorMessage: String(errorMessage).substring(0, 255),
        },
      });

      if (data.campaignId) {
        const updatedCampaign = await prisma.campaign.update({
          where: { id: data.campaignId },
          data: { failedCount: { increment: 1 } },
        });

        if (updatedCampaign.sentCount + updatedCampaign.failedCount >= updatedCampaign.totalCount) {
          await prisma.campaign.update({
            where: { id: data.campaignId },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          });
        }
      }

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // Strict sequential sending to prevent WhatsApp spam flags
  }
);

messageWorker.on('completed', (job) => {
  console.log(`[Worker] 🏁 Job ${job.id} completed.`);
});

messageWorker.on('failed', (job, err) => {
  console.error(`[Worker] 💥 Job ${job?.id} failed with error: ${err.message}`);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down worker...');
  await messageWorker.close();
  await redisConnection.quit();
  await prisma.$disconnect();
  process.exit(0);
});
