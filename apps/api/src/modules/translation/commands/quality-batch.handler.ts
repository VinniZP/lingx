import { calculateScore, runQualityChecks, type QualityIssue } from '@lingx/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { QualityEstimationService } from '../../../services/quality-estimation.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { QualityScoresUpdatedEvent } from '../events/quality-scores-updated.event.js';
import type {
  QualityBatchTranslation,
  TranslationRepository,
} from '../repositories/translation.repository.js';
import type { QualityBatchCommand } from './quality-batch.command.js';

/** Concurrency for parallel key processing */
const CONCURRENCY = 3;

/**
 * Handler for QualityBatchCommand.
 *
 * Performs batch quality evaluation using multi-language batch evaluation
 * for consistent scoring across languages.
 *
 * Benefits:
 * - Consistent scoring (same issue = same severity across languages)
 * - 5x fewer API calls (for 5 languages)
 * - Better AI context with related keys in all languages
 *
 * Used by:
 * - MT batch worker for `quality-batch` job type
 */
export class QualityBatchHandler implements ICommandHandler<QualityBatchCommand> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly qualityEstimationService: QualityEstimationService,
    private readonly eventBus: IEventBus,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(command: QualityBatchCommand): Promise<InferCommandResult<QualityBatchCommand>> {
    const { translationIds, projectId, branchId, forceAI, progressReporter } = command;

    if (translationIds.length === 0) {
      this.logger.info({ branchId }, 'Quality batch: no translation IDs provided');
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.logger.info(
      { jobId: branchId, translationCount: translationIds.length, forceAI },
      'Starting quality batch evaluation (multi-lang)'
    );

    // 1. Fetch all translations with their key info
    const { translations, sourceLanguage } =
      await this.translationRepository.findTranslationsForQualityBatch(translationIds);

    if (translations.length === 0) {
      this.logger.info({ branchId }, 'No translations found for quality batch');
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    // 2. Group translations by key
    const byKey = this.groupByKey(translations);
    this.logger.info({ keyCount: byKey.size }, 'Grouped translations by key');

    // 3. Fetch source translations for all keys
    const keyIds = [...byKey.keys()];
    const sourceMap = await this.translationRepository.findSourceTranslations(
      keyIds,
      sourceLanguage
    );

    // 4. Process keys in parallel with concurrency limit
    let processedTranslations = 0;
    const totalTranslations = translationIds.length;

    const failureTracking = {
      perTranslation: 0,
      perKey: 0,
      errors: [] as { keyName: string; error: string }[],
    };

    // Track successfully evaluated keys for event emission
    const evaluatedKeys: Array<{ keyId: string; keyName: string; languages: string[] }> = [];

    const keyEntries = [...byKey.entries()];

    for (let i = 0; i < keyEntries.length; i += CONCURRENCY) {
      const batch = keyEntries.slice(i, i + CONCURRENCY);

      const results = await Promise.allSettled(
        batch.map(([keyId, keyTranslations]) =>
          this.processKey(
            keyId,
            keyTranslations,
            sourceMap.get(keyId),
            sourceLanguage,
            projectId,
            forceAI,
            failureTracking
          )
        )
      );

      // Track successful key evaluations and key-level failures
      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const [keyId, batchKeyTranslations] = batch[j];

        if (result.status === 'fulfilled') {
          evaluatedKeys.push({
            keyId,
            keyName: result.value.keyName,
            languages: batchKeyTranslations.map((t) => t.language),
          });
        } else {
          const failedKeyName = batchKeyTranslations[0].key.name;
          const errorMessage =
            result.reason instanceof Error ? result.reason.message : String(result.reason);

          failureTracking.perKey++;
          failureTracking.errors.push({ keyName: failedKeyName, error: errorMessage });
          this.logger.error(
            {
              keyName: failedKeyName,
              languageCount: batchKeyTranslations.length,
              error: errorMessage,
              stack: result.reason instanceof Error ? result.reason.stack : undefined,
            },
            'Quality evaluation failed for key'
          );
        }
      }

      // Update progress
      processedTranslations += batch.reduce((sum, [, trans]) => sum + trans.length, 0);
      if (progressReporter) {
        await progressReporter.updateProgress({
          processed: processedTranslations,
          total: totalTranslations,
        });
      }
    }

    // Emit events for successfully evaluated keys
    for (const { keyId, keyName, languages } of evaluatedKeys) {
      await this.eventBus.publish(
        new QualityScoresUpdatedEvent(keyId, keyName, languages, projectId, branchId)
      );
    }

    this.logger.info(
      { keyCount: keyEntries.length, translationCount: processedTranslations },
      'Quality batch evaluation complete'
    );

    // Report failures summary
    const totalFailures = failureTracking.perTranslation + failureTracking.perKey;
    if (totalFailures > 0) {
      this.logger.warn(
        {
          perTranslationFailures: failureTracking.perTranslation,
          perKeyFailures: failureTracking.perKey,
          errorSample: failureTracking.errors.slice(0, 5),
        },
        'Quality evaluation failures summary'
      );
    }

    return {
      processed: processedTranslations,
      succeeded: processedTranslations - failureTracking.perTranslation - failureTracking.perKey,
      failed: failureTracking.perTranslation + failureTracking.perKey,
      errors: failureTracking.errors.length > 0 ? failureTracking.errors : undefined,
    };
  }

  /**
   * Group translations by their key ID
   */
  private groupByKey(
    translations: QualityBatchTranslation[]
  ): Map<string, QualityBatchTranslation[]> {
    const byKey = new Map<string, QualityBatchTranslation[]>();
    for (const t of translations) {
      if (!byKey.has(t.keyId)) {
        byKey.set(t.keyId, []);
      }
      byKey.get(t.keyId)!.push(t);
    }
    return byKey;
  }

  /**
   * Process a single key's translations
   */
  private async processKey(
    keyId: string,
    keyTranslations: QualityBatchTranslation[],
    sourceText: string | undefined,
    sourceLanguage: string,
    projectId: string,
    forceAI: boolean | undefined,
    failureTracking: { perTranslation: number; errors: { keyName: string; error: string }[] }
  ): Promise<{ keyName: string; status: string }> {
    const keyName = keyTranslations[0].key.name;

    // No source - use per-translation format-only evaluation
    if (!sourceText) {
      this.logger.debug({ keyName }, 'No source, using format-only evaluation');
      await this.evaluateTranslationsPerTranslation(keyTranslations, failureTracking, keyName);
      return { keyName, status: 'format-only' };
    }

    // Run heuristics for all languages
    const heuristicResults = this.runHeuristics(keyTranslations, sourceText, sourceLanguage);

    // Determine if AI is needed
    const needsAI = this.needsAIEvaluation(forceAI, heuristicResults);

    if (needsAI) {
      this.logger.debug({ keyName, languageCount: keyTranslations.length }, 'Evaluating with AI');
      await this.qualityEstimationService.evaluateKeyAllLanguages(
        keyId,
        keyName,
        keyTranslations.map((t) => ({ id: t.id, language: t.language, value: t.value })),
        sourceText,
        sourceLanguage,
        projectId,
        heuristicResults
      );
      return { keyName, status: 'ai-evaluated' };
    }

    // All heuristics passed - save heuristic scores directly
    this.logger.debug({ keyName }, 'All heuristics passed, skipping AI');
    await this.evaluateTranslationsPerTranslation(keyTranslations, failureTracking, keyName);
    return { keyName, status: 'heuristic-only' };
  }

  /**
   * Evaluate translations per-translation (format-only or heuristic-only mode)
   */
  private async evaluateTranslationsPerTranslation(
    translations: QualityBatchTranslation[],
    failureTracking: { perTranslation: number; errors: { keyName: string; error: string }[] },
    keyName: string
  ): Promise<void> {
    for (const t of translations) {
      try {
        await this.qualityEstimationService.evaluate(t.id, { forceAI: false });
      } catch (err) {
        failureTracking.perTranslation++;
        failureTracking.errors.push({
          keyName,
          error: err instanceof Error ? err.message : String(err),
        });
        this.logger.error(
          {
            translationId: t.id,
            keyName,
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          },
          'Quality evaluation failed'
        );
      }
    }
  }

  /**
   * Run heuristic quality checks for all translations
   */
  private runHeuristics(
    translations: QualityBatchTranslation[],
    sourceText: string,
    sourceLanguage: string
  ): Map<string, { score: number; issues: QualityIssue[] }> {
    const results = new Map<string, { score: number; issues: QualityIssue[] }>();

    for (const t of translations) {
      const checkResult = runQualityChecks({
        source: sourceText,
        target: t.value,
        sourceLanguage,
        targetLanguage: t.language,
      });
      const scoreResult = calculateScore(checkResult);
      results.set(t.language, {
        score: scoreResult.score,
        issues: scoreResult.issues,
      });
    }

    return results;
  }

  /**
   * Determine if AI evaluation is needed based on heuristic results
   */
  private needsAIEvaluation(
    forceAI: boolean | undefined,
    heuristicResults: Map<string, { score: number; issues: QualityIssue[] }>
  ): boolean {
    if (forceAI) return true;

    return [...heuristicResults.values()].some(
      (h) => h.score < 80 || h.issues.some((issue) => issue.severity === 'error')
    );
  }
}
