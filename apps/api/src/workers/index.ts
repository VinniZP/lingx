/**
 * Workers Index
 *
 * Registers all BullMQ workers for the LocaleFlow API.
 * Workers handle background processing for activity tracking,
 * retention cleanup, and other async tasks.
 */
import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { createActivityWorker } from './activity.worker.js';
import {
  createRetentionWorker,
  registerRetentionJob,
} from './retention.worker.js';
import { createTranslationMemoryWorker } from './translation-memory.worker.js';
import { createMTBatchWorker } from './mt-batch.worker.js';
import { createGlossaryWorker } from './glossary.worker.js';

/**
 * Active workers registry
 */
const workers: Worker[] = [];

/**
 * Initialize and start all workers
 *
 * @param prisma - Prisma client instance
 */
export async function startWorkers(prisma: PrismaClient): Promise<void> {
  console.log('[Workers] Starting background workers...');

  // Create activity worker
  const activityWorker = createActivityWorker(prisma);
  workers.push(activityWorker);
  console.log('[Workers] Activity worker started');

  // Create retention worker
  const retentionWorker = createRetentionWorker(prisma);
  workers.push(retentionWorker);
  console.log('[Workers] Retention worker started');

  // Create translation memory worker
  const tmWorker = createTranslationMemoryWorker(prisma);
  workers.push(tmWorker);
  console.log('[Workers] Translation memory worker started');

  // Create MT batch worker
  const mtBatchWorker = createMTBatchWorker(prisma);
  workers.push(mtBatchWorker);
  console.log('[Workers] MT batch worker started');

  // Create glossary worker
  const glossaryWorker = createGlossaryWorker(prisma);
  workers.push(glossaryWorker);
  console.log('[Workers] Glossary worker started');

  // Register scheduled jobs
  await registerRetentionJob();
}

/**
 * Gracefully stop all workers
 */
export async function stopWorkers(): Promise<void> {
  console.log('[Workers] Stopping background workers...');

  await Promise.all(
    workers.map((worker) => worker.close())
  );

  workers.length = 0;
  console.log('[Workers] All workers stopped');
}

/**
 * Get the count of active workers
 */
export function getWorkerCount(): number {
  return workers.length;
}
