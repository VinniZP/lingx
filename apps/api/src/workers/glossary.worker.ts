/**
 * Glossary Worker
 *
 * Processes async glossary operations:
 * - Usage tracking (record when terms are applied)
 * - Import processing (CSV/TBX)
 */
import { PrismaClient } from '@prisma/client';
import { Job, Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { GlossaryRepository } from '../modules/glossary/repositories/glossary.repository.js';

export type GlossaryJobType = 'record-usage' | 'import';

export interface GlossaryJobData {
  type: GlossaryJobType;
  projectId: string;

  // Usage tracking
  entryId?: string;

  // Import specific
  format?: 'csv' | 'tbx';
  content?: string;
  overwrite?: boolean;
  userId?: string;
}

export function createGlossaryWorker(prisma: PrismaClient): Worker {
  const glossaryRepository = new GlossaryRepository(prisma);

  const worker = new Worker<GlossaryJobData>(
    'glossary',
    async (job: Job<GlossaryJobData>) => {
      const { type } = job.data;

      console.log(`[GlossaryWorker] Processing job ${job.id}: ${type}`);

      switch (type) {
        case 'record-usage':
          return handleRecordUsage(glossaryRepository, job.data);

        case 'import':
          return handleImport(glossaryRepository, job.data);

        default:
          throw new Error(`[GlossaryWorker] Unknown job type: ${type}`);
      }
    },
    {
      connection: redis,
      concurrency: 2,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[GlossaryWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[GlossaryWorker] Job ${job?.id} failed:`, err);
  });

  return worker;
}

/**
 * Record usage when a glossary term is applied
 */
async function handleRecordUsage(
  repository: GlossaryRepository,
  data: GlossaryJobData
): Promise<void> {
  const { entryId } = data;

  if (!entryId) {
    console.warn('[GlossaryWorker] record-usage: Missing entryId');
    return;
  }

  try {
    await repository.recordUsage(entryId);
  } catch (error) {
    console.error('[GlossaryWorker] record-usage failed:', error);
    // Don't throw - usage tracking is non-critical
  }
}

/**
 * Process bulk import from CSV or TBX
 */
async function handleImport(
  repository: GlossaryRepository,
  data: GlossaryJobData
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const { projectId, format, content, overwrite, userId } = data;

  if (!format || !content) {
    return { imported: 0, skipped: 0, errors: ['Missing format or content'] };
  }

  if (format === 'csv') {
    return repository.importFromCSV(projectId, content, overwrite ?? false, userId);
  } else {
    return repository.importFromTBX(projectId, content, overwrite ?? false, userId);
  }
}
