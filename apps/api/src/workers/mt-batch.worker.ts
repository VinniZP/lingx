/**
 * Machine Translation Batch Worker
 *
 * Processes batch translation jobs and pre-translation requests.
 * Rate-limited to respect provider API limits.
 */
import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redis } from '../lib/redis.js';
import { MTService } from '../services/mt.service.js';
import { AITranslationService } from '../services/ai-translation.service.js';
import { TranslationService } from '../services/translation.service.js';
import { QualityEstimationService } from '../services/quality-estimation.service.js';
import type { MTProviderType } from '../services/providers/index.js';
import { runQualityChecks, calculateScore, type QualityIssue } from '@lingx/shared';

/**
 * Job types for MT batch processing
 */
export type MTJobType = 'translate-batch' | 'pre-translate' | 'cleanup-cache' | 'bulk-translate-ui' | 'quality-batch';

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

/** Batch size for processing translations */
const BATCH_SIZE = 10;

/** Delay between batches (ms) to avoid rate limiting */
const BATCH_DELAY = 500;

/**
 * Create the MT batch worker
 */
export function createMTBatchWorker(prisma: PrismaClient): Worker {
  const mtService = new MTService(prisma);
  const aiService = new AITranslationService(prisma);
  const translationService = new TranslationService(prisma);
  const qualityService = new QualityEstimationService(prisma);

  const worker = new Worker<MTJobData>(
    'mt-batch',
    async (job: Job<MTJobData>) => {
      const { type, projectId } = job.data;

      switch (type) {
        case 'translate-batch':
          await handleBatchTranslate(prisma, mtService, translationService, job);
          break;

        case 'pre-translate':
          await handlePreTranslate(prisma, mtService, translationService, job);
          break;

        case 'cleanup-cache':
          await handleCacheCleanup(prisma, projectId);
          break;

        case 'bulk-translate-ui':
          await handleBulkTranslateUI(prisma, mtService, aiService, translationService, job, qualityService);
          break;

        case 'quality-batch':
          await handleQualityBatch(prisma, qualityService, job);
          break;

        default:
          console.warn(`[MTWorker] Unknown job type: ${type}`);
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
    console.error(`[MTWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[MTWorker] Worker error:', err.message);
  });

  worker.on('completed', (job) => {
    console.log(`[MTWorker] Job ${job?.id} completed`);
  });

  return worker;
}

/**
 * Handle batch translation of specific keys
 */
async function handleBatchTranslate(
  prisma: PrismaClient,
  mtService: MTService,
  translationService: TranslationService,
  job: Job<MTJobData>
): Promise<void> {
  const { projectId, keyIds, targetLanguage, provider, overwriteExisting } = job.data;

  if (!keyIds || !targetLanguage) {
    console.warn('[MTWorker] translate-batch job missing keyIds or targetLanguage');
    return;
  }

  // Get project default language
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  const sourceLanguage = project.defaultLanguage;

  // Get keys with their source translations
  const keys = await prisma.translationKey.findMany({
    where: { id: { in: keyIds } },
    include: {
      translations: true,
    },
  });

  let translated = 0;
  let skipped = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);

    for (const key of batch) {
      try {
        // Get source translation
        const sourceTranslation = key.translations.find(
          (t) => t.language === sourceLanguage
        );

        if (!sourceTranslation?.value) {
          skipped++;
          continue;
        }

        // Check if target translation exists
        const existingTranslation = key.translations.find(
          (t) => t.language === targetLanguage
        );

        if (existingTranslation?.value && !overwriteExisting) {
          skipped++;
          continue;
        }

        // Translate
        const result = await mtService.translate(
          projectId,
          sourceTranslation.value,
          sourceLanguage,
          targetLanguage,
          provider
        );

        // Save translation
        await translationService.setTranslation(
          key.id,
          targetLanguage,
          result.translatedText
        );

        translated++;
      } catch (error) {
        console.error(
          `[MTWorker] Failed to translate key ${key.id}:`,
          error instanceof Error ? error.message : error
        );
        failed++;
      }
    }

    // Update progress
    await job.updateProgress({
      processed: i + batch.length,
      total: keys.length,
      translated,
      skipped,
      failed,
    });

    // Delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < keys.length) {
      await delay(BATCH_DELAY);
    }
  }

  console.log(
    `[MTWorker] Batch translate complete: ${translated} translated, ${skipped} skipped, ${failed} failed`
  );
}

/**
 * Handle pre-translation of missing translations for a branch
 */
async function handlePreTranslate(
  prisma: PrismaClient,
  mtService: MTService,
  translationService: TranslationService,
  job: Job<MTJobData>
): Promise<void> {
  const { projectId, branchId, targetLanguages, provider } = job.data;

  if (!branchId || !targetLanguages || targetLanguages.length === 0) {
    console.warn('[MTWorker] pre-translate job missing branchId or targetLanguages');
    return;
  }

  // Get project default language
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  const sourceLanguage = project.defaultLanguage;

  // Get all keys for the branch with translations
  const keys = await prisma.translationKey.findMany({
    where: { branchId },
    include: {
      translations: true,
    },
  });

  let translated = 0;
  let skipped = 0;
  let failed = 0;
  const totalOperations = keys.length * targetLanguages.length;
  let processed = 0;

  // Process each target language
  for (const targetLang of targetLanguages) {
    // Process keys in batches
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const batch = keys.slice(i, i + BATCH_SIZE);

      for (const key of batch) {
        try {
          processed++;

          // Get source translation
          const sourceTranslation = key.translations.find(
            (t) => t.language === sourceLanguage
          );

          if (!sourceTranslation?.value) {
            skipped++;
            continue;
          }

          // Check if target translation exists
          const existingTranslation = key.translations.find(
            (t) => t.language === targetLang
          );

          if (existingTranslation?.value) {
            skipped++;
            continue;
          }

          // Translate
          const result = await mtService.translate(
            projectId,
            sourceTranslation.value,
            sourceLanguage,
            targetLang,
            provider
          );

          // Save translation
          await translationService.setTranslation(
            key.id,
            targetLang,
            result.translatedText
          );

          translated++;
        } catch (error) {
          console.error(
            `[MTWorker] Failed to translate key ${key.id} to ${targetLang}:`,
            error instanceof Error ? error.message : error
          );
          failed++;
        }
      }

      // Update progress
      await job.updateProgress({
        processed,
        total: totalOperations,
        translated,
        skipped,
        failed,
      });

      // Delay between batches
      if (i + BATCH_SIZE < keys.length) {
        await delay(BATCH_DELAY);
      }
    }
  }

  console.log(
    `[MTWorker] Pre-translate complete: ${translated} translated, ${skipped} skipped, ${failed} failed`
  );
}

/**
 * Handle cache cleanup for expired entries
 */
async function handleCacheCleanup(
  prisma: PrismaClient,
  projectId: string
): Promise<void> {
  const result = await prisma.machineTranslationCache.deleteMany({
    where: {
      projectId,
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  console.log(`[MTWorker] Cleaned up ${result.count} expired cache entries`);
}

/**
 * Handle bulk translate from UI (supports both MT and AI)
 */
async function handleBulkTranslateUI(
  prisma: PrismaClient,
  mtService: MTService,
  aiService: AITranslationService,
  translationService: TranslationService,
  job: Job<MTJobData>,
  qualityService?: QualityEstimationService
): Promise<{ translated: number; skipped: number; failed: number; errors: Array<{ keyId: string; keyName: string; language: string; error: string }> }> {
  const { projectId, branchId, keyIds, targetLanguages, translationProvider } = job.data;

  if (!branchId || !keyIds || keyIds.length === 0 || !targetLanguages || targetLanguages.length === 0) {
    console.warn('[MTWorker] bulk-translate-ui job missing required data');
    return { translated: 0, skipped: 0, failed: 0, errors: [] };
  }

  const provider = translationProvider || 'MT';

  // Get project default language
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  const sourceLanguage = project.defaultLanguage;

  // Get keys with their translations
  const keys = await prisma.translationKey.findMany({
    where: {
      id: { in: keyIds },
      branchId,
    },
    include: {
      translations: true,
    },
  });

  let translated = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ keyId: string; keyName: string; language: string; error: string }> = [];
  const totalOperations = keys.length * targetLanguages.length;
  let processed = 0;

  // Process each key
  for (const key of keys) {
    // Get source translation
    const sourceTranslation = key.translations.find(
      (t) => t.language === sourceLanguage
    );
    const sourceText = sourceTranslation?.value;

    if (!sourceText || sourceText.trim() === '') {
      // No source text to translate from
      skipped += targetLanguages.length;
      processed += targetLanguages.length;
      await job.updateProgress({
        total: totalOperations,
        processed,
        translated,
        skipped,
        failed,
        currentKey: key.name,
      } as BulkTranslateProgress);
      continue;
    }

    // Translate to each target language
    for (const targetLang of targetLanguages) {
      processed++;

      // Check if translation already exists
      const existingTranslation = key.translations.find(
        (t) => t.language === targetLang
      );
      if (existingTranslation?.value && existingTranslation.value.trim() !== '') {
        // Already has a translation
        skipped++;
        await job.updateProgress({
          total: totalOperations,
          processed,
          translated,
          skipped,
          failed,
          currentKey: key.name,
          currentLang: targetLang,
        } as BulkTranslateProgress);
        continue;
      }

      try {
        let translatedText: string;

        if (provider === 'AI') {
          const result = await aiService.translate(projectId, {
            text: sourceText,
            sourceLanguage,
            targetLanguage: targetLang,
            keyId: key.id,
            branchId,
          });
          translatedText = result.text;
        } else {
          const result = await mtService.translateWithContext(
            projectId,
            branchId,
            key.id,
            sourceText,
            sourceLanguage,
            targetLang
          );
          translatedText = result.translatedText;
        }

        // Save the translation
        const savedTranslation = await translationService.setTranslation(key.id, targetLang, translatedText);
        translated++;

        // Auto-score after AI translation if enabled
        if (provider === 'AI' && qualityService && savedTranslation) {
          try {
            // Check if quality scoring is enabled for this project
            const qualityConfig = await qualityService.getConfig(projectId);

            if (qualityConfig.scoreAfterAITranslation) {
              // Queue quality evaluation (non-blocking)
              qualityService.evaluate(savedTranslation.id).catch(err => {
                console.error(`[MTWorker] Quality evaluation failed for translation ${savedTranslation.id}:`, err.message);
              });
            }
          } catch (err) {
            // Don't fail the translation if quality scoring fails
            console.error(`[MTWorker] Failed to queue quality evaluation:`, err instanceof Error ? err.message : 'Unknown error');
          }
        }
      } catch (error) {
        failed++;
        errors.push({
          keyId: key.id,
          keyName: key.name,
          language: targetLang,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Update progress
      await job.updateProgress({
        total: totalOperations,
        processed,
        translated,
        skipped,
        failed,
        currentKey: key.name,
        currentLang: targetLang,
        errors: errors.length > 0 ? errors : undefined,
      } as BulkTranslateProgress);

      // Small delay between translations to avoid rate limiting
      await delay(100);
    }
  }

  console.log(
    `[MTWorker] Bulk translate UI complete: ${translated} translated, ${skipped} skipped, ${failed} failed`
  );

  return { translated, skipped, failed, errors };
}

/**
 * Handle quality batch evaluation job
 *
 * NEW: Uses multi-language batch evaluation for consistent scoring across languages.
 * Groups translations by key and evaluates ALL languages for each key in ONE AI call.
 *
 * Benefits:
 * - Consistent scoring (same issue = same severity across languages)
 * - 5x fewer API calls (for 5 languages)
 * - Better AI context with related keys in all languages
 */
async function handleQualityBatch(
  prisma: PrismaClient,
  qualityService: QualityEstimationService,
  job: Job<MTJobData>
): Promise<void> {
  const { translationIds, forceAI, branchId, projectId } = job.data;

  if (!translationIds || translationIds.length === 0) {
    console.log('[MTWorker] Quality batch: no translation IDs provided');
    return;
  }

  console.log(`[MTWorker] ====== STARTING QUALITY BATCH JOB (MULTI-LANG) ======`);
  console.log(`[MTWorker] Job ID: ${job.id}, Branch: ${branchId}`);
  console.log(`[MTWorker] Translations to evaluate: ${translationIds.length}, Force AI: ${forceAI ?? false}`);

  // 1. Fetch all translations with their key info
  const translations = await prisma.translation.findMany({
    where: { id: { in: translationIds } },
    include: {
      key: {
        include: {
          branch: {
            include: {
              space: {
                include: { project: true },
              },
            },
          },
        },
      },
    },
  });

  if (translations.length === 0) {
    console.log('[MTWorker] No translations found');
    return;
  }

  const project = translations[0].key.branch.space.project;
  const sourceLanguage = project.defaultLanguage;

  // 2. Group translations by key
  const byKey = new Map<string, typeof translations>();
  for (const t of translations) {
    const keyId = t.keyId;
    if (!byKey.has(keyId)) {
      byKey.set(keyId, []);
    }
    byKey.get(keyId)!.push(t);
  }

  console.log(`[MTWorker] Grouped into ${byKey.size} keys`);

  // 3. Fetch source translations for all keys
  const keyIds = [...byKey.keys()];
  const sourceTranslations = await prisma.translation.findMany({
    where: {
      keyId: { in: keyIds },
      language: sourceLanguage,
    },
    select: { keyId: true, value: true },
  });
  const sourceMap = new Map(sourceTranslations.map((s) => [s.keyId, s.value]));

  // 4. Process keys in parallel with concurrency limit
  let processedTranslations = 0;
  const totalTranslations = translationIds.length;
  const CONCURRENCY = 3; // Process 3 keys in parallel

  // Track failures for reporting
  const failureTracking = {
    perTranslation: 0, // Per-translation evaluation failures
    perKey: 0, // Multi-language key evaluation failures
    errors: [] as { keyName: string; error: string }[],
  };

  const keyEntries = [...byKey.entries()];

  // Process in batches of CONCURRENCY
  for (let i = 0; i < keyEntries.length; i += CONCURRENCY) {
    const batch = keyEntries.slice(i, i + CONCURRENCY);

    await Promise.all(
      batch.map(async ([keyId, keyTranslations]) => {
        const keyName = keyTranslations[0].key.name;
        const sourceText = sourceMap.get(keyId);

        if (!sourceText) {
          // No source - use per-translation format-only evaluation
          console.log(`[MTWorker] Key ${keyName}: no source, using format-only evaluation`);
          for (const t of keyTranslations) {
            await qualityService.evaluate(t.id, { forceAI }).catch((err) => {
              failureTracking.perTranslation++;
              console.error(`[MTWorker] Quality evaluation failed: translationId=${t.id}, key=${keyName}, error=${err.message}`);
            });
          }
          return;
        }

        // 5. Run heuristics for all languages (free, fast)
        const heuristicResults = new Map<string, { score: number; issues: QualityIssue[] }>();

        for (const t of keyTranslations) {
          const checkResult = runQualityChecks({
            source: sourceText,
            target: t.value,
            sourceLanguage,
            targetLanguage: t.language,
          });
          const scoreResult = calculateScore(checkResult);
          heuristicResults.set(t.language, {
            score: scoreResult.score,
            issues: scoreResult.issues,
          });
        }

        // 6. Call multi-language AI evaluation (if applicable)
        try {
          const needsAI = forceAI || [...heuristicResults.values()].some(
            (h) => h.score < 80 || h.issues.some((i) => i.severity === 'error')
          );

          if (needsAI) {
            console.log(`[MTWorker] Key ${keyName}: evaluating ${keyTranslations.length} languages with AI`);

            await qualityService.evaluateKeyAllLanguages(
              keyId,
              keyName,
              keyTranslations.map((t) => ({ id: t.id, language: t.language, value: t.value })),
              sourceText,
              sourceLanguage,
              projectId,
              heuristicResults
            );
          } else {
            // All heuristics passed, save heuristic scores directly
            console.log(`[MTWorker] Key ${keyName}: all heuristics passed, skipping AI`);
            for (const t of keyTranslations) {
              await qualityService.evaluate(t.id, { forceAI: false }).catch((err) => {
                failureTracking.perTranslation++;
                console.error(`[MTWorker] Quality evaluation failed: translationId=${t.id}, key=${keyName}, error=${err.message}`);
              });
            }
          }
        } catch (error) {
          failureTracking.perKey++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          failureTracking.errors.push({ keyName, error: errorMessage });
          console.error(`[MTWorker] Quality evaluation failed for key: key=${keyName}, languages=${keyTranslations.length}, error=${errorMessage}`);
        }
      })
    );

    // Update progress after each parallel batch
    processedTranslations += batch.reduce((sum, [, trans]) => sum + trans.length, 0);
    await job.updateProgress({ processed: processedTranslations, total: totalTranslations });
  }

  console.log(`[MTWorker] ====== QUALITY BATCH JOB COMPLETE ======`);
  console.log(`[MTWorker] Evaluated: ${keyEntries.length} keys, ${processedTranslations} translations`);

  // Report failures summary if any occurred
  const totalFailures = failureTracking.perTranslation + failureTracking.perKey;
  if (totalFailures > 0) {
    console.warn(`[MTWorker] Quality evaluation failures summary:`);
    console.warn(`[MTWorker]   - Per-translation failures: ${failureTracking.perTranslation}`);
    console.warn(`[MTWorker]   - Per-key failures: ${failureTracking.perKey}`);
    if (failureTracking.errors.length > 0 && failureTracking.errors.length <= 10) {
      console.warn(`[MTWorker]   - Errors: ${failureTracking.errors.map(e => `${e.keyName}: ${e.error}`).join(', ')}`);
    } else if (failureTracking.errors.length > 10) {
      console.warn(`[MTWorker]   - First 10 errors: ${failureTracking.errors.slice(0, 10).map(e => `${e.keyName}: ${e.error}`).join(', ')}`);
    }
  }
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
