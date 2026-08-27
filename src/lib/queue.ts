import { Queue } from 'bullmq';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    return Math.min(times * 100, 3000);
  },
});

export const MESSAGE_QUEUE_NAME = 'whatspulse_messages';

export interface CampaignMessageJobData {
  campaignId: string;
  messageId: string;
  phone: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'text' | 'image' | 'document' | 'audio' | 'video';
  contactId?: string;
  minDelay?: number;
  maxDelay?: number;
  batchSize?: number;
  batchPause?: number;
  indexInCampaign?: number;
}

export const messageQueue = new Queue<CampaignMessageJobData>(MESSAGE_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 3600 * 24, // keep completed jobs for 24h
      count: 1000,
    },
    removeOnFail: {
      age: 3600 * 72, // keep failed jobs for 72h
    },
  },
});
