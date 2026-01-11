/**
 * Translation Memory Worker
 *
 * Thin dispatcher that routes TM jobs to CQRS command handlers.
 * All business logic lives in the command handlers, not here.
 *
 * Job types:
 * - index-approved: Index a single approved translation
 * - bulk-index: Bulk index all approved translations for a project
 * - update-usage: Update usage count for a TM entry
 * - remove-entry: Remove TM entries by source key (on key deletion)
 */
import type { AwilixContainer } from 'awilix';
import { Job, Worker } from 'bullmq';
import type { FastifyBaseLogger } from 'fastify';
import { redis } from '../lib/redis.js';
import {
  BulkIndexTMCommand,
  IndexApprovedTranslationCommand,
  RemoveBySourceKeyCommand,
  UpdateTMUsageCommand,
} from '../modules/translation-memory/index.js';
import type { Cradle } from '../shared/container/index.js';
import type { CommandBus } from '../shared/cqrs/index.js';

/**
 * Job types for translation memory processing
 */
export type TMJobType = 'index-approved' | 'bulk-index' | 'update-usage' | 'remove-entry';

/**
 * Job data for translation memory worker
 */
export interface TMJobData {
  type: TMJobType;
  projectId: string;
  translationId?: string;
  keyId?: string;
  entryId?: string;
}

/**
 * Create the translation memory worker
 *
 * This worker is a thin dispatcher that routes job types to their
 * corresponding CQRS command handlers. All business logic is in the handlers.
 */
export function createTranslationMemoryWorker(container: AwilixContainer<Cradle>): Worker {
  const commandBus = container.resolve<CommandBus>('commandBus');
  const logger = container
    .resolve<FastifyBaseLogger>('logger')
    .child({ worker: 'translation-memory' });

  const worker = new Worker<TMJobData>(
    'translation-memory',
    async (job: Job<TMJobData>) => {
      const { type, projectId, translationId, keyId, entryId } = job.data;

      switch (type) {
        case 'index-approved': {
          if (!translationId) {
            throw new Error('index-approved job missing translationId');
          }
          return commandBus.execute(new IndexApprovedTranslationCommand(projectId, translationId));
        }

        case 'bulk-index': {
          return commandBus.execute(new BulkIndexTMCommand(projectId));
        }

        case 'update-usage': {
          if (!entryId) {
            throw new Error('update-usage job missing entryId');
          }
          return commandBus.execute(new UpdateTMUsageCommand(entryId));
        }

        case 'remove-entry': {
          if (!keyId) {
            throw new Error('remove-entry job missing keyId');
          }
          return commandBus.execute(new RemoveBySourceKeyCommand(keyId));
        }

        default:
          throw new Error(`Unknown TM job type: ${type}`);
      }
    },
    {
      connection: redis,
      concurrency: 3, // Process 3 jobs concurrently
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        jobType: job?.data?.type,
        projectId: job?.data?.projectId,
        translationId: job?.data?.translationId,
        keyId: job?.data?.keyId,
        entryId: job?.data?.entryId,
        error: err.message,
        stack: err.stack,
      },
      'Job failed'
    );
  });

  worker.on('error', (err) => {
    logger.error({ error: err.message, stack: err.stack }, 'Worker error');
  });

  worker.on('completed', (job) => {
    logger.debug({ jobId: job?.id, type: job?.data.type }, 'Job completed');
  });

  return worker;
}
