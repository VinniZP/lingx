/**
 * Machine Translation Batch Worker
 *
 * Thin dispatcher that routes jobs to CQRS command handlers.
 * All business logic lives in the command handlers, not here.
 *
 * Job types:
 * - translate-batch: Batch translate specific keys to one target language
 * - pre-translate: Pre-translate missing translations for a branch
 * - cleanup-cache: Clean up expired MT cache entries
 * - bulk-translate-ui: Bulk translate from UI (supports MT + AI)
 * - quality-batch: Batch quality evaluation
 */
import type { AwilixContainer } from 'awilix';
import { Job, Worker } from 'bullmq';
import type { FastifyBaseLogger } from 'fastify';
import { redis } from '../lib/redis.js';
import {
  BatchTranslateKeysCommand,
  BulkTranslateSyncCommand,
  CleanupMTCacheCommand,
  PreTranslateCommand,
  QualityBatchCommand,
} from '../modules/translation/index.js';
import type { MTProviderType } from '../services/providers/index.js';
import type { Cradle } from '../shared/container/index.js';
import type { CommandBus } from '../shared/cqrs/index.js';

/**
 * Job types for MT batch processing
 */
export type MTJobType =
  | 'translate-batch'
  | 'pre-translate'
  | 'cleanup-cache'
  | 'bulk-translate-ui'
  | 'quality-batch';

/**
 * Job data for MT batch worker
 */
export interface MTJobData {
  type: MTJobType;
  projectId: string;
  userId: string;
  // For translate-batch
  keyIds?: string[];
  targetLanguage?: string;
  provider?: MTProviderType;
  overwriteExisting?: boolean;
  // For pre-translate and bulk-translate-ui
  branchId?: string;
  targetLanguages?: string[];
  // For bulk-translate-ui (supports both MT and AI)
  translationProvider?: 'MT' | 'AI';
  // For quality-batch
  translationIds?: string[];
  forceAI?: boolean;
}

/**
 * Progress data for bulk translate jobs
 */
export interface BulkTranslateProgress {
  total: number;
  processed: number;
  translated: number;
  skipped: number;
  failed: number;
  currentKey?: string;
  currentLang?: string;
  errors?: Array<{ keyId: string; keyName: string; language: string; error: string }>;
}

/**
 * Create the MT batch worker
 *
 * This worker is a thin dispatcher that routes job types to their
 * corresponding CQRS command handlers. All business logic is in the handlers.
 */
export function createMTBatchWorker(container: AwilixContainer<Cradle>): Worker {
  const commandBus = container.resolve<CommandBus>('commandBus');
  const accessService = container.resolve('accessService');
  const logger = container.resolve<FastifyBaseLogger>('logger').child({ worker: 'mt-batch' });

  const worker = new Worker<MTJobData>(
    'mt-batch',
    async (job: Job<MTJobData>) => {
      const { type, projectId, userId } = job.data;
      const progressReporter = {
        updateProgress: (data: unknown) => job.updateProgress(data as object),
      };

      switch (type) {
        case 'translate-batch': {
          const { keyIds, targetLanguage, provider, overwriteExisting } = job.data;
          if (!keyIds || !targetLanguage) {
            throw new Error('translate-batch job missing keyIds or targetLanguage');
          }
          return commandBus.execute(
            new BatchTranslateKeysCommand(
              projectId,
              keyIds,
              targetLanguage,
              userId,
              provider,
              overwriteExisting,
              progressReporter
            )
          );
        }

        case 'pre-translate': {
          const { branchId, targetLanguages, provider } = job.data;
          if (!branchId || !targetLanguages || targetLanguages.length === 0) {
            throw new Error('pre-translate job missing branchId or targetLanguages');
          }
          return commandBus.execute(
            new PreTranslateCommand(
              projectId,
              branchId,
              targetLanguages,
              userId,
              provider,
              progressReporter
            )
          );
        }

        case 'cleanup-cache': {
          return commandBus.execute(new CleanupMTCacheCommand(projectId));
        }

        case 'bulk-translate-ui': {
          const { branchId, keyIds, targetLanguages, translationProvider } = job.data;
          if (!branchId || !keyIds?.length || !targetLanguages?.length) {
            throw new Error('bulk-translate-ui job missing branchId, keyIds, or targetLanguages');
          }

          // Get project info for source language
          let projectInfo;
          try {
            projectInfo = await accessService.verifyBranchAccess(userId, branchId);
          } catch (error) {
            throw new Error(
              `Authorization failed for branch ${branchId}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
          const sourceLanguage = projectInfo.defaultLanguage;

          return commandBus.execute(
            new BulkTranslateSyncCommand(
              projectId,
              branchId,
              keyIds,
              targetLanguages,
              sourceLanguage,
              translationProvider || 'MT',
              userId,
              progressReporter
            )
          );
        }

        case 'quality-batch': {
          const { translationIds, branchId, forceAI } = job.data;
          if (!translationIds || translationIds.length === 0) {
            throw new Error('quality-batch job missing translationIds');
          }
          return commandBus.execute(
            new QualityBatchCommand(
              translationIds,
              projectId,
              branchId || '',
              forceAI,
              progressReporter
            )
          );
        }

        default:
          logger.error({ jobId: job.id, type }, 'Unknown MT job type received');
          throw new Error(`Unknown MT job type: ${type}`);
      }
    },
    {
      connection: redis,
      concurrency: 2, // Limit concurrency for rate limiting
      limiter: {
        max: 10, // Max 10 jobs per minute
        duration: 60000,
      },
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message, stack: err.stack }, 'Job failed');
  });

  worker.on('error', (err) => {
    logger.error({ error: err.message, stack: err.stack }, 'Worker error');
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job?.id }, 'Job completed');
  });

  return worker;
}
