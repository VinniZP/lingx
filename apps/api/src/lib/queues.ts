/**
 * BullMQ Queue Definitions for LocaleFlow
 *
 * Centralized queue creation with shared Redis connection.
 * Queues are used for async activity logging and scheduled jobs.
 */
import { Queue } from 'bullmq';
import { redis } from './redis.js';

/**
 * Activity Queue
 *
 * Handles async activity logging. Activities are queued from
 * API handlers and processed by the activity worker with
 * sequential session-based grouping.
 */
export const activityQueue = new Queue('activity', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs for debugging
    removeOnFail: 500, // Keep last 500 failed jobs for investigation
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

/**
 * Translation Memory Queue
 *
 * Handles async indexing of approved translations into TM.
 * Jobs are queued when translations are approved.
 */
export const translationMemoryQueue = new Queue('translation-memory', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

/**
 * Retention Queue
 *
 * Handles scheduled cleanup of old activities.
 * Uses BullMQ repeatable jobs (cron-based).
 */
export const retentionQueue = new Queue('retention', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

/**
 * Machine Translation Batch Queue
 *
 * Handles batch translation jobs and pre-translation.
 * Rate-limited to respect provider API limits.
 */
export const mtBatchQueue = new Queue('mt-batch', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2s for rate limiting
    },
  },
});

/**
 * Close all queue connections gracefully
 */
export async function closeQueues(): Promise<void> {
  await Promise.all([
    activityQueue.close(),
    translationMemoryQueue.close(),
    retentionQueue.close(),
    mtBatchQueue.close(),
  ]);
}
