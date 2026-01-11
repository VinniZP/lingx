/**
 * Translation Memory Worker
 *
 * Processes translation memory indexing jobs from BullMQ queue.
 * Jobs are created when translations are approved, triggering
 * their addition to the translation memory for future suggestions.
 */
import { PrismaClient } from '@prisma/client';
import { Job, Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { TranslationMemoryService } from '../services/translation-memory.service.js';

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
 */
export function createTranslationMemoryWorker(prisma: PrismaClient): Worker {
  const tmService = new TranslationMemoryService(prisma);

  const worker = new Worker<TMJobData>(
    'translation-memory',
    async (job: Job<TMJobData>) => {
      const { type, projectId, translationId, keyId, entryId } = job.data;

      switch (type) {
        case 'index-approved':
          await handleIndexApproved(prisma, tmService, projectId, translationId);
          break;

        case 'bulk-index':
          await handleBulkIndex(tmService, projectId);
          break;

        case 'update-usage':
          if (!entryId) {
            console.warn('[TMWorker] update-usage job missing entryId');
            return;
          }
          await tmService.recordUsage(entryId);
          break;

        case 'remove-entry':
          if (!keyId) {
            console.warn('[TMWorker] remove-entry job missing keyId');
            return;
          }
          await tmService.removeBySourceKey(keyId);
          break;

        default:
          console.warn(`[TMWorker] Unknown job type: ${type}`);
      }
    },
    {
      connection: redis,
      concurrency: 3, // Process 3 jobs concurrently
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[TMWorker] Job ${job?.id} failed:`, err);
  });

  worker.on('error', (err) => {
    console.error('[TMWorker] Worker error:', err);
  });

  return worker;
}

/**
 * Handle indexing a single approved translation
 */
async function handleIndexApproved(
  prisma: PrismaClient,
  tmService: TranslationMemoryService,
  projectId: string,
  translationId?: string
): Promise<void> {
  if (!translationId) {
    console.warn('[TMWorker] index-approved job missing translationId');
    return;
  }

  // Get the translation with its key and default language translation
  const translation = await prisma.translation.findUnique({
    where: { id: translationId },
    include: {
      key: {
        include: {
          translations: true,
          branch: {
            include: {
              space: {
                include: {
                  project: {
                    include: {
                      languages: {
                        where: { isDefault: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!translation) {
    console.warn(`[TMWorker] Translation ${translationId} not found`);
    return;
  }

  // Skip if not approved
  if (translation.status !== 'APPROVED') {
    return;
  }

  // Get the default language code
  const defaultLang = translation.key.branch.space.project.languages[0];
  if (!defaultLang) {
    console.warn(`[TMWorker] No default language for project ${projectId}`);
    return;
  }

  // Skip if this is the default language (we don't index source->source)
  if (translation.language === defaultLang.code) {
    return;
  }

  // Find the default language translation (source text)
  const sourceTranslation = translation.key.translations.find(
    (t) => t.language === defaultLang.code
  );

  if (!sourceTranslation || !sourceTranslation.value?.trim()) {
    // No source text available, skip indexing
    return;
  }

  // Index into translation memory
  try {
    await tmService.indexTranslation({
      projectId,
      sourceLanguage: defaultLang.code,
      targetLanguage: translation.language,
      sourceText: sourceTranslation.value,
      targetText: translation.value,
      sourceKeyId: translation.keyId,
      sourceBranchId: translation.key.branchId,
    });

    console.log(
      `[TMWorker] Indexed translation ${translationId} (${defaultLang.code} -> ${translation.language})`
    );
  } catch (err) {
    console.error(`[TMWorker] Failed to index translation ${translationId}:`, err);
    throw err; // Re-throw to trigger retry
  }
}

/**
 * Handle bulk indexing all approved translations for a project
 */
async function handleBulkIndex(
  tmService: TranslationMemoryService,
  projectId: string
): Promise<void> {
  console.log(`[TMWorker] Starting bulk index for project ${projectId}`);

  try {
    const result = await tmService.bulkIndex(projectId);
    console.log(`[TMWorker] Bulk indexed ${result.indexed} translations for project ${projectId}`);
  } catch (err) {
    console.error(`[TMWorker] Bulk index failed for project ${projectId}:`, err);
    throw err;
  }
}
