/**
 * BullMQ QueueEvents for Lingx
 *
 * QueueEvents allows listening to job progress/completion events
 * for real-time updates via SSE.
 */
import { QueueEvents } from 'bullmq';
import { redis } from './redis.js';

/**
 * MT Batch Queue Events
 *
 * Used for subscribing to bulk translate job progress.
 */
export const mtBatchQueueEvents = new QueueEvents('mt-batch', {
  connection: redis,
});

/**
 * Close all QueueEvents connections gracefully
 */
export async function closeQueueEvents(): Promise<void> {
  await mtBatchQueueEvents.close();
}
