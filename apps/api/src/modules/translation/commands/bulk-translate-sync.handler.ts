import type { FastifyBaseLogger } from 'fastify';
import type { AITranslationService } from '../../../services/ai-translation.service.js';
import type { MTService } from '../../../services/mt.service.js';
import type { QualityEstimationService } from '../../../services/quality-estimation.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { KeyTranslationsUpdatedEvent } from '../events/translation-updated.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type {
  BulkTranslateProgress,
  BulkTranslateSyncCommand,
  BulkTranslateSyncResult,
} from './bulk-translate-sync.command.js';

/**
 * Handler for BulkTranslateSyncCommand.
 *
 * Performs synchronous bulk translation for a set of keys to target languages.
 * This is the internal implementation used by both:
 * - BulkTranslateHandler (for small batches)
 * - MT batch worker (for large batches queued as jobs)
 *
 * Features:
 * - Progress reporting via optional ProgressReporter
 * - Quality evaluation after AI translations (if configured)
 * - Event emission for activity logging
 */
export class BulkTranslateSyncHandler implements ICommandHandler<BulkTranslateSyncCommand> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly eventBus: IEventBus,
    private readonly mtService: MTService,
    private readonly aiService: AITranslationService,
    private readonly qualityEstimationService: QualityEstimationService | undefined,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(
    command: BulkTranslateSyncCommand
  ): Promise<InferCommandResult<BulkTranslateSyncCommand>> {
    const {
      projectId,
      branchId,
      keyIds,
      targetLanguages,
      sourceLanguage,
      provider,
      userId,
      progressReporter,
    } = command;

    // Fetch keys with their translations
    const keys = await this.translationRepository.getKeysWithTranslations(branchId, keyIds);

    let translated = 0;
    let skipped = 0;
    const errors: BulkTranslateSyncResult['errors'] = [];
    const translatedKeys: Array<{ keyId: string; keyName: string; languages: string[] }> = [];

    const totalOperations = keys.length * targetLanguages.length;
    let processed = 0;

    // Process each key
    for (const key of keys) {
      const sourceTranslation = key.translations.find((t) => t.language === sourceLanguage);
      const sourceText = sourceTranslation?.value;

      if (!sourceText || sourceText.trim() === '') {
        // No source text to translate from
        skipped += targetLanguages.length;
        processed += targetLanguages.length;
        await this.reportProgress(progressReporter, {
          total: totalOperations,
          processed,
          translated,
          skipped,
          failed: errors.length,
          currentKey: key.name,
        });
        continue;
      }

      const keyTranslatedLanguages: string[] = [];

      // Translate to each target language
      for (const targetLang of targetLanguages) {
        processed++;

        const existingTranslation = key.translations.find((t) => t.language === targetLang);
        if (existingTranslation?.value && existingTranslation.value.trim() !== '') {
          // Already has a translation
          skipped++;
          await this.reportProgress(progressReporter, {
            total: totalOperations,
            processed,
            translated,
            skipped,
            failed: errors.length,
            currentKey: key.name,
            currentLang: targetLang,
          });
          continue;
        }

        try {
          let translatedText: string;

          if (provider === 'AI') {
            const result = await this.aiService.translate(projectId, {
              text: sourceText,
              sourceLanguage,
              targetLanguage: targetLang,
              keyId: key.id,
              branchId,
            });
            translatedText = result.text;
          } else {
            const result = await this.mtService.translateWithContext(
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
          const savedTranslation = await this.translationRepository.setTranslation(
            key.id,
            targetLang,
            translatedText
          );
          translated++;
          keyTranslatedLanguages.push(targetLang);

          // Auto-score after AI translation if enabled
          if (provider === 'AI' && this.qualityEstimationService && savedTranslation) {
            await this.maybeEvaluateQuality(projectId, savedTranslation.id, key.name);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            { keyId: key.id, language: targetLang, error: errorMessage, provider },
            'Bulk translate failed for key'
          );
          errors.push({
            keyId: key.id,
            keyName: key.name,
            language: targetLang,
            error: errorMessage,
          });
        }

        await this.reportProgress(progressReporter, {
          total: totalOperations,
          processed,
          translated,
          skipped,
          failed: errors.length,
          currentKey: key.name,
          currentLang: targetLang,
          errors: errors.length > 0 ? errors : undefined,
        });
      }

      if (keyTranslatedLanguages.length > 0) {
        translatedKeys.push({
          keyId: key.id,
          keyName: key.name,
          languages: keyTranslatedLanguages,
        });
      }
    }

    // Emit events for translated keys
    for (const { keyId, keyName, languages } of translatedKeys) {
      await this.eventBus.publish(
        new KeyTranslationsUpdatedEvent(keyId, keyName, languages, userId, projectId, branchId)
      );
    }

    // Log summary if there were errors
    if (errors.length > 0) {
      this.logger.warn(
        { errorCount: errors.length, translated, skipped, branchId },
        'Bulk translate completed with errors'
      );
    }

    this.logger.info(
      { translated, skipped, failed: errors.length, branchId },
      'Bulk translate sync complete'
    );

    return {
      translated,
      skipped,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async reportProgress(
    reporter: BulkTranslateSyncCommand['progressReporter'],
    data: BulkTranslateProgress
  ): Promise<void> {
    if (reporter) {
      await reporter.updateProgress(data);
    }
  }

  private async maybeEvaluateQuality(
    projectId: string,
    translationId: string,
    keyName: string
  ): Promise<void> {
    if (!this.qualityEstimationService) return;

    try {
      const qualityConfig = await this.qualityEstimationService.getConfig(projectId);
      if (qualityConfig.scoreAfterAITranslation) {
        // Queue quality evaluation (non-blocking)
        this.qualityEstimationService.evaluate(translationId).catch((err: unknown) => {
          this.logger.error(
            {
              translationId,
              keyName,
              error: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack : undefined,
            },
            'Quality evaluation failed for translation'
          );
        });
      }
    } catch (err) {
      // Don't fail the translation if quality scoring fails
      this.logger.error(
        {
          keyName,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        },
        'Failed to queue quality evaluation'
      );
    }
  }
}
